import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RedsysService, RedsysFormData, RedsysNotification } from './redsys.service';
import { PaymentProvider, PaymentStatus, OrderStatus, Prisma } from '@prisma/client';
import { AppLogger } from '../../common/app-logger.service';
import { RetryService } from '../../common/retry.service';

export interface CreatePaymentDto {
  orderId: string;
  provider: PaymentProvider;
  returnUrl?: string;
}

export interface PaymentResult {
  success: boolean;
  provider: PaymentProvider;
  paymentId: string;
  orderId: string;
  redirectUrl?: string;
  formData?: RedsysFormData;
  message?: string;
}

@Injectable()
export class PaymentService {
  private readonly BASE_URL = process.env.BASE_URL || 'http://localhost:4000';
  private readonly FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

  constructor(
    private prisma: PrismaService,
    private redsysService: RedsysService,
    private readonly logger: AppLogger,
    private readonly retryService: RetryService,
  ) {}

  async createPayment(dto: CreatePaymentDto): Promise<PaymentResult> {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException('Order is not awaiting payment');
    }

    const amount = Number(order.total_amount);

    switch (dto.provider) {
      case 'COD':
        return this.processCOD(order.id, amount);
      case 'REDSYS':
        return this.processRedsys(order.id, order.tracking_token, amount, dto.returnUrl);
      default:
        throw new BadRequestException(`Payment provider ${dto.provider} not supported`);
    }
  }

  private async processCOD(orderId: string, amount: number): Promise<PaymentResult> {
    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          order_id: orderId,
          provider: 'COD',
          status: 'AUTHORIZED',
          amount,
          currency: 'EUR',
          provider_payment_id: `COD_${Date.now()}`,
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'PROCESSING',
        },
      });

      const discounts = await tx.orderDiscount.findMany({ where: { order_id: orderId } });
      for (const discount of discounts) {
        await tx.coupon.update({
          where: { id: discount.coupon_id },
          data: { usage_count: { increment: 1 } },
        });
      }

      return created;
    });

    this.logger.log('COD payment transaction completed', 'PaymentService', { orderId, paymentId: payment.id });

    return {
      success: true,
      provider: 'COD',
      paymentId: payment.id,
      orderId,
      message: 'Order confirmed. Payment will be collected on delivery.',
    };
  }

  private async processRedsys(
    orderId: string,
    trackingToken: string,
    amount: number,
    returnUrl?: string,
  ): Promise<PaymentResult> {
    const merchantUrl = `${this.BASE_URL}/payment/redsys/notification`;
    const fallbackReturnUrl = `${this.FRONTEND_URL}/order/track/${trackingToken}`;
    const baseReturnUrl = returnUrl || fallbackReturnUrl;
    const urlOk = this.withPaymentStatus(baseReturnUrl, 'success');
    const urlKo = this.withPaymentStatus(baseReturnUrl, 'failed');

    let payment = await this.prisma.payment.findFirst({
      where: {
        order_id: orderId,
        provider: 'REDSYS',
        status: 'INITIATED',
      },
      orderBy: { created_at: 'desc' },
    });

    if (!payment) {
      payment = await this.prisma.payment.create({
        data: {
          order_id: orderId,
          provider: 'REDSYS',
          status: 'INITIATED',
          amount,
          currency: 'EUR',
          provider_payment_id: null,
        },
      });
    }

    const merchantOrderReference =
      payment.provider_payment_id || this.redsysService.createMerchantOrderReference(payment.id);
    if (!payment.provider_payment_id) {
      payment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: { provider_payment_id: merchantOrderReference },
      });
    }

    const formData = this.redsysService.createPaymentForm(
      merchantOrderReference,
      amount,
      merchantUrl,
      urlOk,
      urlKo,
    );

    return {
      success: true,
      provider: 'REDSYS',
      paymentId: payment.id,
      orderId,
      formData,
      redirectUrl: formData.formUrl,
    };
  }

  async handleRedsysNotification(notification: RedsysNotification): Promise<void> {
    const result = await this.retryService.execute(
      () => this.redsysService.processNotification(notification),
      3,
      300,
    );

    const payment = await this.prisma.payment.findFirst({
      where: {
        provider_payment_id: result.merchantOrderReference,
        provider: 'REDSYS',
      },
      include: { order: true },
    });

    if (!payment) {
      this.logger.warn('Payment not found for REDSYS notification', 'PaymentService', {
        merchantOrderReference: result.merchantOrderReference,
      });
      return;
    }

    if (payment.status !== 'INITIATED') {
      this.logger.log('Ignoring already-processed REDSYS notification', 'PaymentService', {
        paymentId: payment.id,
        status: payment.status,
      });
      return;
    }

    if (result.success) {
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'CAPTURED',
            raw_response: {
              notification,
              redsys: {
                responseCode: result.responseCode,
                authCode: result.authCode ?? null,
                merchantOrderReference: result.merchantOrderReference,
              },
            } as any,
          },
        });

        await tx.order.update({
          where: { id: payment.order_id },
          data: {
            status: 'PAID',
            paid_at: new Date(),
          },
        });

        const discounts = await tx.orderDiscount.findMany({
          where: { order_id: payment.order_id },
        });

        for (const discount of discounts) {
          await tx.coupon.update({
            where: { id: discount.coupon_id },
            data: { usage_count: { increment: 1 } },
          });
        }
      });

      this.logger.log(
        'REDSYS notification success processed',
        'PaymentService',
        { orderId: payment.order_id, authCode: result.authCode },
      );
    } else {
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'FAILED',
            raw_response: {
              notification,
              redsys: {
                responseCode: result.responseCode,
                authCode: result.authCode ?? null,
                merchantOrderReference: result.merchantOrderReference,
              },
            } as any,
          },
        });

        await this.releaseReservedStockForOrder(payment.order_id, tx);

        await tx.order.update({
          where: { id: payment.order_id },
          data: {
            status: 'FAILED',
          },
        });
      });

      this.logger.warn('REDSYS notification failed', 'PaymentService', {
        orderId: payment.order_id,
      });
    }
  }

  async confirmCODDelivery(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const codPayment = order.payments.find((p) => p.provider === 'COD');
    if (!codPayment) {
      throw new BadRequestException('No COD payment found for this order');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: codPayment.id },
        data: { status: 'CAPTURED' },
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'PAID',
          paid_at: new Date(),
        },
      });
    });
  }

  async getPaymentStatus(orderId: string): Promise<{
    order_status: OrderStatus;
    payments: Array<{
      provider: PaymentProvider;
      status: PaymentStatus;
      amount: number;
    }>;
  }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      order_status: order.status,
      payments: order.payments.map((p) => ({
        provider: p.provider,
        status: p.status,
        amount: Number(p.amount),
      })),
    };
  }

  private withPaymentStatus(baseUrl: string, status: 'success' | 'failed'): string {
    try {
      const parsed = new URL(baseUrl);
      parsed.searchParams.set('payment', status);
      return parsed.toString();
    } catch {
      const separator = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${separator}payment=${status}`;
    }
  }

  private async releaseReservedStockForOrder(
    orderId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const orderItems = await tx.orderItem.findMany({
      where: { order_id: orderId },
      select: { sku_id: true, qty: true },
    });

    for (const item of orderItems) {
      let remainingToRelease = item.qty;

      const inventoryLevels = await tx.inventoryLevel.findMany({
        where: {
          sku_id: item.sku_id,
          qty_reserved: { gt: 0 },
        },
        orderBy: { qty_reserved: 'desc' },
      });

      for (const level of inventoryLevels) {
        if (remainingToRelease <= 0) {
          break;
        }

        const releaseQty = Math.min(level.qty_reserved, remainingToRelease);
        if (releaseQty <= 0) {
          continue;
        }

        await tx.inventoryLevel.update({
          where: {
            warehouse_id_sku_id: {
              warehouse_id: level.warehouse_id,
              sku_id: level.sku_id,
            },
          },
          data: {
            qty_reserved: { decrement: releaseQty },
          },
        });

        remainingToRelease -= releaseQty;
      }

      if (remainingToRelease > 0) {
        this.logger.warn(
          'Unable to fully release reserved stock for failed order item',
          'PaymentService',
          {
            orderId,
            skuId: item.sku_id,
            unreleasedQty: remainingToRelease,
          },
        );
      }
    }
  }
}
