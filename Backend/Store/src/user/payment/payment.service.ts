import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RedsysService, RedsysFormData, RedsysNotification } from './redsys.service';
import { CouponService } from '../coupon/coupon.service';
import { PaymentProvider, PaymentStatus, OrderStatus } from '@prisma/client';

export interface CreatePaymentDto {
  orderId: string;
  provider: PaymentProvider;
  successUrl?: string;
  failureUrl?: string;
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
    private couponService: CouponService,
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
        return this.processRedsys(order.id, amount, dto.successUrl, dto.failureUrl);
      default:
        throw new BadRequestException(`Payment provider ${dto.provider} not supported`);
    }
  }

  private async processCOD(orderId: string, amount: number): Promise<PaymentResult> {
    const payment = await this.prisma.payment.create({
      data: {
        order_id: orderId,
        provider: 'COD',
        status: 'AUTHORIZED',
        amount,
        currency: 'EUR',
        provider_payment_id: `COD_${Date.now()}`,
      },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'PROCESSING',
      },
    });

    await this.finalizeOrderCoupon(orderId);

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
    successUrl?: string,
    failureUrl?: string,
  ): Promise<PaymentResult> {
    const merchantUrl = `${this.BASE_URL}/api/payment/redsys/notification`;
    const urlOk =
      successUrl || `${this.FRONTEND_URL}/checkout/success?orderId=${orderId}`;
    const urlKo =
      failureUrl || `${this.FRONTEND_URL}/checkout/failed?orderId=${orderId}`;

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
    const result = await this.redsysService.processNotification(notification);

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
      console.error(`Payment not found for REDSYS order: ${result.orderId}`);
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
      });

      await this.finalizeOrderCoupon(payment.order_id);
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

  private async finalizeOrderCoupon(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { discounts: true },
    });

    if (order && order.discounts.length > 0) {
      for (const discount of order.discounts) {
        await this.couponService.incrementUsage(discount.coupon_id);
      }
    }
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
