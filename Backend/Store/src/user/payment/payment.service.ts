import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RedsysService, RedsysFormData, RedsysNotification } from './redsys.service';
import { PaymentProvider, PaymentStatus, OrderStatus } from '@prisma/client';
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
  private readonly BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
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
        return this.processRedsys(order.id, amount, dto.returnUrl);
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
    amount: number,
    returnUrl?: string,
  ): Promise<PaymentResult> {
    const merchantUrl = `${this.BASE_URL}/api/payment/redsys/notification`;
    const urlOk = returnUrl || `${this.FRONTEND_URL}/checkout/success?orderId=${orderId}`;
    const urlKo = returnUrl || `${this.FRONTEND_URL}/checkout/failed?orderId=${orderId}`;

    const formData = this.redsysService.createPaymentForm(
      orderId,
      amount,
      merchantUrl,
      urlOk,
      urlKo,
    );

    const payment = await this.prisma.payment.create({
      data: {
        order_id: orderId,
        provider: 'REDSYS',
        status: 'INITIATED',
        amount,
        currency: 'EUR',
        provider_payment_id: null,
      },
    });

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
        order: {
          order_number: { contains: result.orderId },
        },
        provider: 'REDSYS',
        status: 'INITIATED',
      },
      include: { order: true },
    });

    if (!payment) {
      this.logger.warn('Payment not found for REDSYS order', 'PaymentService', { orderId: result.orderId });
      return;
    }

    if (result.success) {
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'CAPTURED',
            provider_payment_id: result.authCode,
            raw_response: notification as any,
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
            raw_response: notification as any,
          },
        });

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
}
