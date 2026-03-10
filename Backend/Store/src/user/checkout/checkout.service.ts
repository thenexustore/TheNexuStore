import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CartService } from '../cart/cart.service';
import { CouponService } from '../coupon/coupon.service';
import { BillingAddressDto, CreateOrderDto, ShippingAddressDto } from './dto/checkout.dto';
import { OrderResponseDto, PaymentIntentDto } from './dto/checkout-response.dto';
import { PaymentProvider, Prisma } from '@prisma/client';
import { AppLogger } from '../../common/app-logger.service';
import { MailService } from '../../auth/mail/mail.service';
import { ShippingTaxService } from '../../shipping-tax/shipping-tax.service';
import { RedsysService } from '../payment/redsys.service';

@Injectable()
export class CheckoutService {
  constructor(
    private prisma: PrismaService,
    private cartService: CartService,
    private couponService: CouponService,
    private mailService: MailService,
    private shippingTaxService: ShippingTaxService,
    private redsysService: RedsysService,
    private readonly logger: AppLogger,
  ) {}

  private readonly FRONTEND_URL =
    process.env.FRONTEND_URL || 'http://localhost:3000';
  private readonly BASE_URL = process.env.BASE_URL || 'http://localhost:4000';

  private generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `ORD-${timestamp}-${random.toString().padStart(3, '0')}`;
  }

  private async validateCartStock(cartItems: any[], tx: Prisma.TransactionClient = this.prisma): Promise<boolean> {
    for (const item of cartItems) {
      const inventory = await tx.inventoryLevel.aggregate({
        where: { sku_id: item.sku_id },
        _sum: {
          qty_on_hand: true,
          qty_reserved: true,
        },
      });

      const availableQty =
        (inventory._sum.qty_on_hand || 0) - (inventory._sum.qty_reserved || 0);

      if (availableQty < item.qty) {
        throw new BadRequestException(
          `Insufficient stock for ${item.sku.product.title}. Available: ${availableQty}, Requested: ${item.qty}`,
        );
      }
    }
    return true;
  }

  private async reserveStock(orderId: string, cartItems: any[], tx: Prisma.TransactionClient = this.prisma) {
    for (const item of cartItems) {
      const warehouses = await tx.inventoryLevel.findMany({
        where: { sku_id: item.sku_id, qty_on_hand: { gt: 0 } },
        orderBy: { qty_on_hand: 'desc' },
      });

      let remainingQty = item.qty;

      for (const warehouse of warehouses) {
        if (remainingQty <= 0) break;

        const reserveQty = Math.min(
          warehouse.qty_on_hand - warehouse.qty_reserved,
          remainingQty,
        );

        if (reserveQty > 0) {
          await tx.inventoryLevel.update({
            where: {
              warehouse_id_sku_id: {
                warehouse_id: warehouse.warehouse_id,
                sku_id: item.sku_id,
              },
            },
            data: {
              qty_reserved: warehouse.qty_reserved + reserveQty,
            },
          });

          remainingQty -= reserveQty;
        }
      }

      if (remainingQty > 0) {
        throw new BadRequestException(
          `Could not reserve all stock for ${item.sku.product.title}`,
        );
      }
    }
  }

  async createOrder(
    customerId: string | undefined,
    sessionId: string | undefined,
    dto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    const cart = await this.cartService.getCart(customerId, sessionId);

    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const subtotal = cart.summary.subtotal;
    const discountAmount = cart.summary.discount || 0;

    const totals = await this.shippingTaxService.calculateTotals({
      subtotalExclTax: subtotal,
      discountExclTax: discountAmount,
      destination: dto.shipping_address,
      currency: 'EUR',
    });

    if (totals.status !== 'OK') {
      throw new BadRequestException(
        totals.message ||
          'Shipping not available for this destination. Contact support.',
      );
    }

    const shippingAmount = totals.shipping_excl_tax;
    const tax = totals.tax_amount + totals.customs_duty_amount;
    const total = totals.total;

    const billingAddressJson = JSON.parse(JSON.stringify(dto.billing_address));
    const shippingAddressJson = JSON.parse(JSON.stringify(dto.shipping_address));
    const paymentMethod = dto.payment_method || 'REDSYS';
    const trackingToken = await this.generateTrackingToken();

    const result = await this.prisma.$transaction(async (tx) => {
      const cartItemsForStock = await tx.cartItem.findMany({
        where: { cart_id: cart.id },
        include: { sku: { include: { product: true, prices: true } } },
      });

      await this.validateCartStock(cartItemsForStock, tx);

      const order = await tx.order.create({
        data: {
          order_number: this.generateOrderNumber(),
          tracking_token: trackingToken,
          customer_id: customerId,
          email: dto.email,
          status: 'PENDING_PAYMENT',
          currency: 'EUR',
          subtotal_amount: subtotal,
          shipping_amount: shippingAmount,
          discount_amount: discountAmount,
          tax_amount: tax,
          total_amount: total,
          billing_address_json: billingAddressJson,
          shipping_address_json: shippingAddressJson,
        },
      });

      if (cart.applied_coupon && discountAmount > 0) {
        const coupon = await this.couponService.getCouponByCode(cart.applied_coupon.code);
        if (coupon) {
          await tx.orderDiscount.create({
            data: {
              order_id: order.id,
              coupon_id: coupon.id,
              amount: discountAmount,
            },
          });
        }
      }

      for (const cartItem of cartItemsForStock) {
        const price = cartItem.sku.prices[0];

        await tx.orderItem.create({
          data: {
            order_id: order.id,
            sku_id: cartItem.sku_id,
            title_snapshot: cartItem.sku.product.title,
            unit_price: Number(price.sale_price),
            qty: cartItem.qty,
            line_subtotal: Number(price.sale_price) * cartItem.qty,
            tax_amount: Number(price.sale_price) * cartItem.qty * totals.tax_rate,
            line_total: Number(price.sale_price) * cartItem.qty * (1 + totals.tax_rate),
            fulfillment_type: 'INTERNAL',
          },
        });
      }

      await this.reserveStock(order.id, cartItemsForStock, tx);

      await tx.cart.update({
        where: { id: cart.id },
        data: { status: 'CONVERTED', coupon_id: null },
      });

      const paymentIntent = await this.createPaymentIntent(
        order.id,
        total,
        paymentMethod as PaymentProvider,
        trackingToken,
        tx,
      );

      return { order, paymentIntent };
    });

    const trackingUrl = `${this.FRONTEND_URL}/order/track/${result.order.tracking_token}`;
    await this.mailService.sendOrderConfirmation(dto.email, result.order.order_number, trackingUrl);

    this.logger.log('Checkout transaction completed', 'CheckoutService', {
      orderId: result.order.id,
      paymentProvider: paymentMethod,
      total,
    });

    return {
      order: {
        id: result.order.id,
        order_number: result.order.order_number,
        tracking_token: result.order.tracking_token,
        status: result.order.status,
        total_amount: Number(result.order.total_amount),
        currency: result.order.currency,
        created_at: result.order.created_at,
      },
      payment_intent: result.paymentIntent,
    };
  }

  private async createPaymentIntent(
    orderId: string,
    amount: number,
    provider: PaymentProvider = 'REDSYS',
    trackingToken?: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<PaymentIntentDto> {
    if (provider === 'COD') {
      const paymentIntent = {
        id: `pi_cod_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        client_secret: '',
        amount,
        currency: 'EUR',
        status: 'cod_pending',
        provider,
      };

      await tx.payment.create({
        data: {
          order_id: orderId,
          provider,
          status: 'AUTHORIZED',
          amount,
          currency: 'EUR',
          provider_payment_id: paymentIntent.id,
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: 'PROCESSING' },
      });

      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { discounts: true },
      });

      if (order && order.discounts.length > 0) {
        for (const discount of order.discounts) {
          await tx.coupon.update({ where: { id: discount.coupon_id }, data: { usage_count: { increment: 1 } } });
        }
      }

      return paymentIntent;
    }

    if (provider === 'REDSYS') {
      const payment = await tx.payment.create({
        data: {
          order_id: orderId,
          provider: 'REDSYS',
          status: 'INITIATED',
          amount,
          currency: 'EUR',
          provider_payment_id: null,
        },
      });

      const merchantOrderReference =
        this.redsysService.createMerchantOrderReference(payment.id);
      const merchantUrl = `${this.BASE_URL}/payment/redsys/notification`;
      const trackingUrl = `${this.FRONTEND_URL}/order/track/${trackingToken ?? orderId}`;
      const urlOk = `${trackingUrl}?payment=success`;
      const urlKo = `${trackingUrl}?payment=failed`;

      const formData = this.redsysService.createPaymentForm(
        merchantOrderReference,
        amount,
        merchantUrl,
        urlOk,
        urlKo,
      );

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          provider_payment_id: merchantOrderReference,
          raw_response: {
            redsysMerchantOrder: merchantOrderReference,
          } as Prisma.InputJsonValue,
        },
      });

      return {
        id: payment.id,
        client_secret: '',
        provider,
        amount,
        currency: 'EUR',
        status: 'requires_action',
        redirect_url: formData.formUrl,
        form_data: formData,
      } as PaymentIntentDto;
    }

    throw new BadRequestException(`Payment provider ${provider} not supported`);
  }

  private async generateTrackingToken(): Promise<string> {
    // Simple random token; uniqueness enforced at DB level
    return `trk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  private serializeOrder(order: any) {
    return {
      id: order.id,
      order_number: order.order_number,
      tracking_token: order.tracking_token,
      status: order.status,
      subtotal_amount: Number(order.subtotal_amount),
      shipping_amount: Number(order.shipping_amount),
      discount_amount: Number(order.discount_amount),
      tax_amount: Number(order.tax_amount),
      total_amount: Number(order.total_amount),
      currency: order.currency,
      created_at: order.created_at,
      shipping_address: order.shipping_address_json,
      billing_address: order.billing_address_json,
      items: order.items?.map((item: any) => ({
        id: item.id,
        title_snapshot: item.title_snapshot,
        unit_price: Number(item.unit_price),
        qty: item.qty,
        line_total: Number(item.line_total),
        sku_code: item.sku?.sku_code,
      })),
      payments: order.payments?.map((p: any) => ({
        id: p.id,
        provider: p.provider,
        status: p.status,
        amount: Number(p.amount),
        currency: p.currency,
        created_at: p.created_at,
      })),
      shipments: order.shipments?.map((s: any) => ({
        id: s.id,
        carrier: s.carrier,
        tracking_number: s.tracking_number,
        tracking_url: s.tracking_url,
        status: s.status,
        shipped_at: s.shipped_at,
        delivered_at: s.delivered_at,
      })),
    };
  }

  async getOrder(orderId: string, customerId: string): Promise<any> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            sku: {
              include: {
                product: true,
              },
            },
          },
        },
        payments: true,
        shipments: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.customer_id !== customerId) {
      throw new ForbiddenException('You are not authorized to view this order');
    }

    return this.serializeOrder(order);
  }

  async getCustomerOrders(customerId: string): Promise<any[]> {
    const orders = await this.prisma.order.findMany({
      where: { customer_id: customerId },
      orderBy: { created_at: 'desc' },
      include: {
        items: {
          include: {
            sku: {
              include: {
                product: true,
              },
            },
          },
        },
        payments: true,
        shipments: true,
      },
    });

    return orders.map((order) => this.serializeOrder(order));
  }

  async getOrderByTrackingToken(trackingToken: string): Promise<any> {
    const order = await this.prisma.order.findUnique({
      where: { tracking_token: trackingToken },
      include: {
        items: {
          include: {
            sku: {
              include: {
                product: true,
              },
            },
          },
        },
        payments: true,
        shipments: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.serializeOrder(order);
  }
}
