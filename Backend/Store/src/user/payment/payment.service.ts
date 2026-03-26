import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import {
  RedsysService,
  RedsysFormData,
  RedsysNotification,
  RedsysPaymentMethod,
} from './redsys.service';
import {
  PaymentProvider,
  PaymentStatus,
  OrderStatus,
  Prisma,
} from '@prisma/client';
import { AppLogger } from '../../common/app-logger.service';
import { RetryService } from '../../common/retry.service';
import { OrderTrackingEventsService } from '../../order-tracking/order-tracking-events.service';
import { BillingService } from '../../admin/billing/billing.service';

export interface CreatePaymentDto {
  orderId: string;
  provider: PaymentProvider | 'BIZUM';
  returnUrl?: string;
  trackingToken?: string;
  customerId?: string;
  customerPhone?: string;
}

export interface PaymentResult {
  success: boolean;
  provider: PaymentProvider | 'BIZUM';
  paymentId: string;
  orderId: string;
  redirectUrl?: string;
  formData?: RedsysFormData;
  message?: string;
}

@Injectable()
export class PaymentService {
  private readonly BASE_URL = process.env.BASE_URL || 'http://localhost:4000';
  private readonly FRONTEND_URL =
    process.env.FRONTEND_URL || 'http://localhost:3000';
  private readonly REDSYS_NOTIFY_URL =
    process.env.REDSYS_NOTIFY_URL || `${this.BASE_URL}/payments/redsys/notify`;
  private readonly REDSYS_OK_URL =
    process.env.REDSYS_OK_URL || `${this.BASE_URL}/payments/redsys/ok`;
  private readonly REDSYS_KO_URL =
    process.env.REDSYS_KO_URL || `${this.BASE_URL}/payments/redsys/ko`;

  constructor(
    private prisma: PrismaService,
    private redsysService: RedsysService,
    private readonly logger: AppLogger,
    private readonly retryService: RetryService,
    private readonly orderTrackingEvents: OrderTrackingEventsService,
    private readonly billingService: BillingService,
  ) {}

  private static readonly BLOCKING_SUPPLIER_AVAILABILITY_CODES = new Set([
    'OUT_OF_STOCK',
    'NO_STOCK',
    'UNAVAILABLE',
    'NOT_AVAILABLE',
    'SIN_STOCK',
  ]);

  async createPayment(dto: CreatePaymentDto): Promise<PaymentResult> {
    switch (dto.provider) {
      case 'COD':
        return this.processCOD(dto.orderId);
      case 'REDSYS':
        return this.createRedsysPaymentForOrder({
          orderId: dto.orderId,
          returnUrl: dto.returnUrl,
          trackingToken: dto.trackingToken,
          customerId: dto.customerId,
          customerPhone: dto.customerPhone,
          paymentMethod: 'CARD',
        });
      case 'BIZUM':
        return this.createRedsysPaymentForOrder({
          orderId: dto.orderId,
          returnUrl: dto.returnUrl,
          trackingToken: dto.trackingToken,
          customerId: dto.customerId,
          customerPhone: dto.customerPhone,
          paymentMethod: 'BIZUM',
        });
      default:
        throw new BadRequestException(
          `Payment provider ${dto.provider} not supported`,
        );
    }
  }

  async createRedsysPaymentForOrder(input: {
    orderId: string;
    returnUrl?: string;
    paymentMethod?: RedsysPaymentMethod;
    trackingToken?: string;
    customerId?: string;
    customerPhone?: string;
  }): Promise<PaymentResult> {
    const order = await this.prisma.order.findUnique({
      where: { id: input.orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException('Order is not awaiting payment');
    }

    if (order.customer_id) {
      if (!input.customerId || input.customerId !== order.customer_id) {
        throw new ForbiddenException(
          'You are not allowed to initiate this payment',
        );
      }
    }

    if (
      !order.customer_id &&
      (!input.trackingToken || input.trackingToken !== order.tracking_token)
    ) {
      throw new ForbiddenException(
        'Tracking token is required for guest payment',
      );
    }

    return this.processRedsys(
      order,
      input.paymentMethod ?? 'CARD',
      input.customerPhone,
    );
  }

  private async processCOD(orderId: string): Promise<PaymentResult> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException('Order is not awaiting payment');
    }

    const amount = Number(order.total_amount);
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

      const discounts = await tx.orderDiscount.findMany({
        where: { order_id: orderId },
      });
      for (const discount of discounts) {
        await tx.coupon.update({
          where: { id: discount.coupon_id },
          data: { usage_count: { increment: 1 } },
        });
      }

      return created;
    });

    this.logger.log('COD payment transaction completed', 'PaymentService', {
      orderId,
      paymentId: payment.id,
    });

    // Auto-create a draft billing document for the newly confirmed COD order.
    // Fire-and-forget — billing errors must not break the payment confirmation.
    this.billingService.createDocumentFromOrder(orderId).catch((err: unknown) => {
      this.logger.warn(
        'Failed to auto-create billing document for COD order',
        'PaymentService',
        { orderId, error: err instanceof Error ? err.message : String(err) },
      );
    });

    return {
      success: true,
      provider: 'COD',
      paymentId: payment.id,
      orderId,
      message: 'Order confirmed. Payment will be collected on delivery.',
    };
  }

  private async processRedsys(
    order: {
      id: string;
      order_number: string;
      tracking_token: string;
      total_amount: Prisma.Decimal;
      currency: string;
      subtotal_amount: Prisma.Decimal;
      shipping_amount: Prisma.Decimal;
      tax_amount: Prisma.Decimal;
      discount_amount: Prisma.Decimal;
      payments: Array<{
        id: string;
        status: PaymentStatus;
        provider: PaymentProvider;
        provider_payment_id: string | null;
      }>;
    },
    paymentMethod: RedsysPaymentMethod = 'CARD',
    customerPhone?: string,
  ): Promise<PaymentResult> {
    const amount = Number(order.total_amount);
    let payment = await this.prisma.payment.findFirst({
      where: {
        order_id: order.id,
        provider: 'REDSYS',
        status: 'INITIATED',
      },
      orderBy: { created_at: 'desc' },
    });

    if (!payment) {
      payment = await this.prisma.payment.create({
        data: {
          order_id: order.id,
          provider: 'REDSYS',
          status: 'INITIATED',
          amount,
          currency: order.currency,
          provider_payment_id: null,
          raw_response: {
            snapshot: {
              subtotal: Number(order.subtotal_amount),
              shipping: Number(order.shipping_amount),
              tax: Number(order.tax_amount),
              discount: Number(order.discount_amount),
              total: Number(order.total_amount),
              currency: order.currency,
            },
          } as Prisma.InputJsonValue,
        },
      });
    }

    const merchantOrderReference =
      payment.provider_payment_id ||
      this.redsysService.createMerchantOrderReference(payment.id);
    if (!payment.provider_payment_id) {
      payment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: { provider_payment_id: merchantOrderReference },
      });
    }

    const urlOk = this.appendQueryParam(
      this.REDSYS_OK_URL,
      'orderRef',
      merchantOrderReference,
    );
    const urlKo = this.appendQueryParam(
      this.REDSYS_KO_URL,
      'orderRef',
      merchantOrderReference,
    );

    const formData = this.redsysService.createPaymentForm({
      merchantOrderReference,
      amount,
      merchantUrl: this.REDSYS_NOTIFY_URL,
      urlOk,
      urlKo,
      merchantData: payment.id,
      productDescription: `Order ${order.order_number}`,
      merchantName: 'The Nexus Store',
      paymentMethod,
      bizumMobileNumber: paymentMethod === 'BIZUM' ? customerPhone : undefined,
    });

    const rawResponse =
      payment.raw_response && typeof payment.raw_response === 'object'
        ? (payment.raw_response as Record<string, unknown>)
        : {};
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        raw_response: this.mergeRawResponse(rawResponse, {
          redsysRequest: {
            merchantOrderReference,
            paymentMethod,
            amountInCents: Math.round(amount * 100),
            merchantUrl: this.REDSYS_NOTIFY_URL,
            urlOk,
            urlKo,
          },
        }),
      },
    });

    return {
      success: true,
      provider: paymentMethod === 'BIZUM' ? 'BIZUM' : 'REDSYS',
      paymentId: payment.id,
      orderId: order.id,
      formData,
      redirectUrl: formData.formUrl,
    };
  }

  async handleRedsysNotification(
    notification: RedsysNotification,
  ): Promise<void> {
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
      this.logger.warn(
        'Payment not found for REDSYS notification',
        'PaymentService',
        {
          merchantOrderReference: result.merchantOrderReference,
        },
      );
      return;
    }

    const expectedAmountInCents = Math.round(Number(payment.amount) * 100);
    const expectedCurrency = this.redsysService.getCurrencyNumericCode(
      payment.currency,
    );
    const expectedMerchantCode = this.redsysService.getConfiguredMerchantCode();
    const expectedTerminal = this.redsysService.getConfiguredTerminal();

    this.redsysService.assertNotificationMatchesExpected(result, {
      merchantOrderReference:
        payment.provider_payment_id || result.merchantOrderReference,
      amountInCents: expectedAmountInCents,
      currency: expectedCurrency,
      merchantCode: expectedMerchantCode,
      terminal: expectedTerminal,
    });

    if (payment.status !== 'INITIATED') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          raw_response: this.buildRedsysRawResponse(
            payment.raw_response,
            notification,
            result,
          ),
        },
      });
      this.logger.log(
        'Ignoring already-processed REDSYS notification',
        'PaymentService',
        {
          paymentId: payment.id,
          status: payment.status,
        },
      );
      return;
    }

    if (result.success) {
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'CAPTURED',
            raw_response: this.buildRedsysRawResponse(
              payment.raw_response,
              notification,
              result,
            ),
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
      await this.orderTrackingEvents.notifyByOrderId(
        payment.order_id,
        'payment_captured',
      );

      // Auto-create a draft billing document for the paid order.
      // Billing errors must not block the Redsys webhook response.
      await this.billingService
        .createDocumentFromOrder(payment.order_id)
        .catch((err: unknown) => {
          this.logger.warn(
            'Failed to auto-create billing document for Redsys-paid order',
            'PaymentService',
            {
              orderId: payment.order_id,
              error: err instanceof Error ? err.message : String(err),
            },
          );
        });

      await this.runPostPaymentOperationalValidation(payment.order_id);
    } else {
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'FAILED',
            raw_response: this.buildRedsysRawResponse(
              payment.raw_response,
              notification,
              result,
            ),
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
      await this.orderTrackingEvents.notifyByOrderId(
        payment.order_id,
        'payment_failed',
      );
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

    await this.billingService.createDocumentFromOrder(orderId).catch((err: unknown) => {
      this.logger.warn(
        'Failed to auto-create billing document for COD-paid order',
        'PaymentService',
        { orderId, error: err instanceof Error ? err.message : String(err) },
      );
    });

    await this.runPostPaymentOperationalValidation(orderId);

    await this.orderTrackingEvents.notifyByOrderId(orderId, 'payment_captured');
  }

  private async runPostPaymentOperationalValidation(orderId: string): Promise<void> {
    const issues = await this.collectPostPaymentValidationIssues(orderId);
    const targetStatus = issues.length > 0 ? OrderStatus.ON_HOLD : OrderStatus.PROCESSING;
    const note = issues.length > 0
      ? `[AUTO_VALIDATION][ON_HOLD] ${issues.join(' | ')}`
      : '[AUTO_VALIDATION][PROCESSING] Validation passed (stock and pricing checks).';

    const transitionApplied = await this.prisma.$transaction(async (tx) => {
      const statusUpdate = await tx.order.updateMany({
        where: {
          id: orderId,
          status: OrderStatus.PAID,
        },
        data: {
          status: targetStatus,
        },
      });

      if (statusUpdate.count === 0) {
        return false;
      }

      await tx.orderAdminNote.create({
        data: {
          order_id: orderId,
          note,
        },
      });

      return true;
    });

    if (!transitionApplied) {
      this.logger.warn(
        'Skipped post-payment operational validation transition because order is no longer PAID',
        'PaymentService',
        { orderId, targetStatus },
      );
      return;
    }

    await this.orderTrackingEvents.notifyByOrderId(
      orderId,
      targetStatus === OrderStatus.ON_HOLD
        ? 'post_payment_validation_failed'
        : 'post_payment_validation_passed',
    );
  }

  private async collectPostPaymentValidationIssues(orderId: string): Promise<string[]> {
    const issues: string[] = [];
    const orderItems = await this.prisma.orderItem.findMany({
      where: { order_id: orderId },
      include: {
        sku: {
          include: {
            prices: {
              select: {
                sale_price: true,
              },
            },
          },
        },
        supplier_product: {
          include: {
            stock: {
              select: {
                qty_available: true,
                availability_code: true,
              },
            },
          },
        },
      },
    });

    for (const item of orderItems) {
      const currentSalePrice = item.sku?.prices?.[0]?.sale_price;
      if (currentSalePrice != null) {
        const expected = Number(item.unit_price);
        const current = Number(currentSalePrice);
        if (Math.abs(current - expected) > 0.009) {
          issues.push(
            `Price mismatch for SKU ${item.sku_id}: expected ${expected.toFixed(2)} but current is ${current.toFixed(2)}`,
          );
        }
      }

      if (item.fulfillment_type === 'INTERNAL') {
        const inventory = await this.prisma.inventoryLevel.aggregate({
          where: { sku_id: item.sku_id },
          _sum: {
            qty_on_hand: true,
            qty_reserved: true,
          },
        });

        const availableQty =
          (inventory._sum.qty_on_hand || 0) - (inventory._sum.qty_reserved || 0);

        if (availableQty < item.qty) {
          issues.push(
            `Insufficient internal stock for SKU ${item.sku_id}: available ${availableQty}, required ${item.qty}`,
          );
        }
        continue;
      }

      if (item.fulfillment_type === 'SUPPLIER') {
        const supplierQty = item.supplier_product?.stock?.qty_available;
        if (supplierQty == null || supplierQty < item.qty) {
          issues.push(
            `Insufficient supplier stock for SKU ${item.sku_id}: available ${supplierQty ?? 0}, required ${item.qty}`,
          );
        }

        const availabilityCode =
          item.supplier_product?.stock?.availability_code?.trim().toUpperCase();
        if (
          availabilityCode &&
          PaymentService.BLOCKING_SUPPLIER_AVAILABILITY_CODES.has(
            availabilityCode,
          )
        ) {
          issues.push(
            `Supplier availability code ${availabilityCode} blocks fulfillment for SKU ${item.sku_id}`,
          );
        }
      }
    }

    return issues;
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

  async resolveRedsysReturn(
    status: 'success' | 'failed',
    merchantOrderReference?: string,
  ): Promise<string> {
    if (!merchantOrderReference) {
      return this.withPaymentStatus(this.FRONTEND_URL, status);
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        provider: 'REDSYS',
        provider_payment_id: merchantOrderReference,
      },
      include: {
        order: {
          select: {
            tracking_token: true,
          },
        },
      },
    });

    if (!payment?.order?.tracking_token) {
      return this.withPaymentStatus(this.FRONTEND_URL, status);
    }

    const resolvedStatus = this.resolveRedsysReturnStatus(
      payment.status,
      status,
    );
    return this.withPaymentStatus(
      `${this.FRONTEND_URL}/order/track/${payment.order.tracking_token}`,
      resolvedStatus,
    );
  }

  private resolveRedsysReturnStatus(
    paymentStatus: PaymentStatus,
    fallbackStatus: 'success' | 'failed',
  ): 'success' | 'failed' | 'pending' {
    switch (paymentStatus) {
      case 'CAPTURED':
      case 'AUTHORIZED':
      case 'REFUNDED':
      case 'PARTIAL_REFUND':
        return 'success';
      case 'FAILED':
        return 'failed';
      case 'INITIATED':
      default:
        return fallbackStatus === 'failed' ? 'failed' : 'pending';
    }
  }

  private withPaymentStatus(
    baseUrl: string,
    status: 'success' | 'failed' | 'pending',
  ): string {
    try {
      const parsed = new URL(baseUrl);
      parsed.searchParams.set('payment', status);
      return parsed.toString();
    } catch {
      const separator = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${separator}payment=${status}`;
    }
  }

  private appendQueryParam(
    baseUrl: string,
    key: string,
    value: string,
  ): string {
    try {
      const parsed = new URL(baseUrl);
      parsed.searchParams.set(key, value);
      return parsed.toString();
    } catch {
      const separator = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    }
  }

  private buildRedsysRawResponse(
    existing: Prisma.JsonValue | null,
    notification: RedsysNotification,
    result: {
      signatureVersion: string;
      merchantOrderReference: string;
      responseCode: string;
      authCode?: string;
      payMethod?: string;
      processedPayMethod?: string;
      merchantCode: string;
      terminal: string;
      amountInCents: number;
      currency: string;
      merchantData?: string;
      rawParams: Record<string, unknown>;
    },
  ): Prisma.InputJsonValue {
    const existingObject = this.asRecord(existing);
    const existingRedsys = this.asRecord(existingObject.redsys);

    return this.mergeRawResponse(existingObject, {
      notification,
      redsys: {
        ...existingRedsys,
        responseCode: result.responseCode,
        responseMessage: this.redsysService.getResponseMessage(
          result.responseCode,
        ),
        authCode: result.authCode ?? null,
        merchantOrderReference: result.merchantOrderReference,
        payMethod: result.payMethod ?? existingRedsys.payMethod ?? null,
        processedPayMethod:
          result.processedPayMethod ??
          existingRedsys.processedPayMethod ??
          null,
        merchantCode: result.merchantCode,
        terminal: result.terminal,
        amountInCents: result.amountInCents,
        currency: result.currency,
        merchantData:
          result.merchantData ?? existingRedsys.merchantData ?? null,
        signatureVersion: result.signatureVersion,
        gatewayParams: result.rawParams,
        lastNotificationAt: new Date().toISOString(),
      },
    });
  }

  private mergeRawResponse(
    existing: Prisma.JsonValue | Record<string, unknown> | null,
    patch: Record<string, unknown>,
  ): Prisma.InputJsonValue {
    return {
      ...this.asRecord(existing),
      ...patch,
    } as Prisma.InputJsonValue;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
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
