import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CartService } from '../cart/cart.service';
import { BillingAddressDto, CreateOrderDto, ShippingAddressDto } from './dto/checkout.dto';
import { OrderResponseDto, PaymentIntentDto } from './dto/checkout-response.dto';

@Injectable()
export class CheckoutService {
  constructor(
    private prisma: PrismaService,
    private cartService: CartService,
  ) {}

  private generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `ORD-${timestamp}-${random.toString().padStart(3, '0')}`;
  }

  private async validateCartStock(cartItems: any[]): Promise<boolean> {
    for (const item of cartItems) {
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
        throw new BadRequestException(
          `Insufficient stock for ${item.sku.product.title}. Available: ${availableQty}, Requested: ${item.qty}`,
        );
      }
    }
    return true;
  }

  private async reserveStock(orderId: string, cartItems: any[]) {
    for (const item of cartItems) {
      const warehouses = await this.prisma.inventoryLevel.findMany({
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
          await this.prisma.inventoryLevel.update({
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
    customerId: string,
    dto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    const cart = await this.cartService.getCart(customerId, undefined);

    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    await this.validateCartStock(
      await this.prisma.cartItem.findMany({
        where: { cart_id: cart.id },
        include: { sku: { include: { product: true } } },
      }),
    );

    const subtotal = cart.summary.subtotal;
    const shippingAmount = 5.99;
    const tax = (subtotal + shippingAmount) * 0.21;
    const total = subtotal + shippingAmount + tax;

    const billingAddressJson = JSON.parse(JSON.stringify(dto.billing_address));
    const shippingAddressJson = JSON.parse(
      JSON.stringify(dto.shipping_address),
    );

    const order = await this.prisma.order.create({
      data: {
        order_number: this.generateOrderNumber(),
        customer_id: customerId,
        email: dto.email,
        status: 'PENDING_PAYMENT',
        currency: 'EUR',
        subtotal_amount: subtotal,
        shipping_amount: shippingAmount,
        discount_amount: 0,
        tax_amount: tax,
        total_amount: total,
        billing_address_json: billingAddressJson,
        shipping_address_json: shippingAddressJson,
      },
    });

    const cartItems = await this.prisma.cartItem.findMany({
      where: { cart_id: cart.id },
      include: {
        sku: {
          include: {
            product: true,
            prices: true,
          },
        },
      },
    });

    for (const cartItem of cartItems) {
      const price = cartItem.sku.prices[0];

      await this.prisma.orderItem.create({
        data: {
          order_id: order.id,
          sku_id: cartItem.sku_id,
          title_snapshot: cartItem.sku.product.title,
          unit_price: Number(price.sale_price),
          qty: cartItem.qty,
          line_subtotal: Number(price.sale_price) * cartItem.qty,
          tax_amount: Number(price.sale_price) * cartItem.qty * 0.21,
          line_total: Number(price.sale_price) * cartItem.qty * 1.21,
          fulfillment_type: 'INTERNAL',
        },
      });
    }

    await this.reserveStock(order.id, cartItems);

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { status: 'CONVERTED' },
    });

    const paymentIntent = await this.createPaymentIntent(order.id, total);

    return {
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        total_amount: Number(order.total_amount),
        currency: order.currency,
        created_at: order.created_at,
      },
      payment_intent: paymentIntent,
    };
  }

  private async createPaymentIntent(
    orderId: string,
    amount: number,
  ): Promise<PaymentIntentDto> {
    const paymentIntent = {
      id: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      client_secret: `secret_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`,
      amount,
      currency: 'EUR',
      status: 'requires_payment_method',
    };

    await this.prisma.payment.create({
      data: {
        order_id: orderId,
        provider: 'STRIPE',
        status: 'INITIATED',
        amount,
        currency: 'EUR',
        provider_payment_id: paymentIntent.id,
      },
    });

    return paymentIntent;
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

    return order;
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

    return orders;
  }
}
