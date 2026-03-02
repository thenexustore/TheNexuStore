import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { UpdateCartItemDto, AddToCartDto } from './dto/cart.dto';
import { CartItemDto, CartResponseDto, AppliedCouponDto } from './dto/cart-response.dto';
import { CouponService, DiscountCalculation } from '../coupon/coupon.service';

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private couponService: CouponService,
  ) {}

  private async getOrCreateCart(
    customerId?: string,
    sessionId?: string,
  ): Promise<any> {
    let cart;

    const includeRelations = {
      items: {
        include: {
          sku: {
            include: {
              product: {
                include: {
                  media: true,
                },
              },
              prices: true,
              inventory: {
                include: {
                  warehouse: true,
                },
              },
            },
          },
        },
      },
    };

    if (customerId) {
      cart = await this.prisma.cart.findFirst({
        where: {
          customer_id: customerId,
          status: 'ACTIVE',
        },
        include: includeRelations,
      });
    } else if (sessionId) {
      cart = await this.prisma.cart.findFirst({
        where: {
          session_id: sessionId,
          status: 'ACTIVE',
        },
        include: includeRelations,
      });
    }

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: {
          customer_id: customerId,
          session_id: sessionId,
          status: 'ACTIVE',
          currency: 'EUR',
        },
        include: {
          items: {
            include: {
              sku: {
                include: {
                  product: {
                    include: {
                      media: true,
                    },
                  },
                  prices: true,
                  inventory: true,
                },
              },
            },
          },
        },
      });
    }

    return cart;
  }

  private async getCurrentPrice(skuCode: string): Promise<number> {
    const sku = await this.prisma.sku.findUnique({
      where: { sku_code: skuCode },
      include: { prices: true },
    });

    if (!sku || !sku.prices || sku.prices.length === 0) {
      throw new NotFoundException('Price not found for SKU');
    }

    return Number(sku.prices[0].sale_price);
  }

  private async validateStock(
    skuCode: string,
    requestedQty: number,
  ): Promise<boolean> {
    const sku = await this.prisma.sku.findUnique({
      where: { sku_code: skuCode },
    });

    if (!sku) {
      throw new NotFoundException('SKU not found');
    }

    const inventory = await this.prisma.inventoryLevel.aggregate({
      where: { sku_id: sku.id },
      _sum: {
        qty_on_hand: true,
        qty_reserved: true,
      },
    });

    const availableQty =
      (inventory._sum.qty_on_hand || 0) - (inventory._sum.qty_reserved || 0);
    return availableQty >= requestedQty;
  }

  private async getAvailableStock(skuCode: string): Promise<number> {
    const sku = await this.prisma.sku.findUnique({
      where: { sku_code: skuCode },
    });

    if (!sku) {
      return 0;
    }

    const inventory = await this.prisma.inventoryLevel.aggregate({
      where: { sku_id: sku.id },
      _sum: {
        qty_on_hand: true,
        qty_reserved: true,
      },
    });

    return (
      (inventory._sum.qty_on_hand || 0) - (inventory._sum.qty_reserved || 0)
    );
  }

  async getCart(
    customerId?: string,
    sessionId?: string,
  ): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(customerId, sessionId);

    let subtotal = 0;
    const items: CartItemDto[] = [];

    for (const item of cart.items) {
      const price = await this.getCurrentPrice(item.sku.sku_code);
      const lineTotal = price * item.qty;
      subtotal += lineTotal;

      const thumbnail = item.sku.product.media?.[0]?.url || '';

      items.push({
        id: item.id,
        sku_id: item.sku_id,
        product_title: item.sku.product.title,
        sku_code: item.sku.sku_code,
        variant_name: item.sku.name,
        price,
        quantity: item.qty,
        line_total: lineTotal,
        thumbnail,
        max_quantity: await this.getAvailableStock(item.sku.sku_code),
        in_stock: await this.validateStock(item.sku.sku_code, item.qty),
      });
    }

    let discount = 0;
    let appliedCoupon: AppliedCouponDto | undefined;

    const coupon = await this.couponService.getCartCoupon(cart.id);
    if (coupon) {
      const validation = await this.couponService.validateCoupon(coupon.code, subtotal);
      if (validation.isValid && validation.coupon) {
        discount = this.couponService.calculateDiscount(validation.coupon, subtotal);
        appliedCoupon = {
          code: coupon.code,
          type: coupon.type,
          value: Number(coupon.value),
          discount_amount: discount,
        };
      } else {
        await this.couponService.removeCouponFromCart(cart.id);
      }
    }

    const shipping = subtotal > 100 ? 0 : 9.99;
    const tax = (subtotal - discount) * 0.21;
    const total = subtotal - discount + shipping + tax;

    return {
      id: cart.id,
      items,
      summary: {
        subtotal,
        discount,
        shipping,
        tax,
        total,
        item_count: items.reduce((sum, item) => sum + item.quantity, 0),
        currency: cart.currency,
      },
      applied_coupon: appliedCoupon,
    };
  }

  async applyCoupon(
    couponCode: string,
    customerId?: string,
    sessionId?: string,
  ): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(customerId, sessionId);
    
    let subtotal = 0;
    for (const item of cart.items) {
      const price = await this.getCurrentPrice(item.sku.sku_code);
      subtotal += price * item.qty;
    }

    await this.couponService.applyCouponToCart(cart.id, couponCode, subtotal);
    return this.getCart(customerId, sessionId);
  }

  async removeCoupon(
    customerId?: string,
    sessionId?: string,
  ): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(customerId, sessionId);
    await this.couponService.removeCouponFromCart(cart.id);
    return this.getCart(customerId, sessionId);
  }

  async addToCart(dto: AddToCartDto, customerId?: string, sessionId?: string) {
    const { sku_code, quantity } = dto;

    const sku = await this.prisma.sku.findFirst({
      where: {
        OR: [
          { sku_code: sku_code },
          { sku_code: sku_code.toUpperCase() },
          { sku_code: sku_code.toLowerCase() },
          { id: sku_code },
        ],
        status: 'ACTIVE',
      },
      include: {
        product: {
          include: {
            media: true,
          },
        },
      },
    });

    if (!sku || !sku.product || sku.product.status !== 'ACTIVE') {
      const availableSkus = await this.prisma.sku.findMany({
        take: 10,
        select: {
          id: true,
          sku_code: true,
          product: { select: { title: true, status: true } },
        },
      });

      throw new NotFoundException(`Product with SKU '${sku_code}' not found`);
    }

    const isAvailable = await this.validateStock(sku.sku_code, quantity);
    if (!isAvailable) {
      const available = await this.getAvailableStock(sku.sku_code);
      throw new BadRequestException(`Only ${available} items available`);
    }

    const cart = await this.getOrCreateCart(customerId, sessionId);
    const currentPrice = await this.getCurrentPrice(sku.sku_code);

    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cart_id: cart.id,
        sku_id: sku.id,
      },
    });

    if (existingItem) {
      const newQty = existingItem.qty + quantity;
      const isStockAvailable = await this.validateStock(sku.sku_code, newQty);

      if (!isStockAvailable) {
        const available = await this.getAvailableStock(sku.sku_code);
        throw new BadRequestException(
          `Only ${available} additional items available`,
        );
      }

      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          qty: newQty,
          unit_price_snapshot: currentPrice,
          updated_at: new Date(),
        },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cart_id: cart.id,
          sku_id: sku.id,
          qty: quantity,
          unit_price_snapshot: currentPrice,
        },
      });
    }

    return this.getCart(customerId, sessionId);
  }

  async updateCartItem(
    itemId: string,
    dto: UpdateCartItemDto,
    customerId?: string,
    sessionId?: string,
  ) {
    const { quantity } = dto;

    const cart = await this.getOrCreateCart(customerId, sessionId);
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true, sku: true },
    });

    if (!cartItem || cartItem.cart_id !== cart.id || !cartItem.sku) {
      throw new NotFoundException('Cart item not found');
    }

    if (quantity <= 0) {
      await this.prisma.cartItem.delete({
        where: { id: itemId },
      });
    } else {
      const isAvailable = await this.validateStock(
        cartItem.sku.sku_code,
        quantity,
      );
      if (!isAvailable) {
        const available = await this.getAvailableStock(cartItem.sku.sku_code);
        throw new BadRequestException(`Only ${available} items available`);
      }

      await this.prisma.cartItem.update({
        where: { id: itemId },
        data: {
          qty: quantity,
          updated_at: new Date(),
        },
      });
    }

    return this.getCart(customerId, sessionId);
  }

  async removeCartItem(
    itemId: string,
    customerId?: string,
    sessionId?: string,
  ) {
    const cart = await this.getOrCreateCart(customerId, sessionId);
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!cartItem || cartItem.cart_id !== cart.id) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    return this.getCart(customerId, sessionId);
  }

  async clearCart(customerId?: string, sessionId?: string) {
    const cart = await this.getOrCreateCart(customerId, sessionId);

    await this.prisma.cartItem.deleteMany({
      where: { cart_id: cart.id },
    });

    return this.getCart(customerId, sessionId);
  }

  async mergeCarts(sessionCartId: string, customerId: string) {
    const sessionCart = await this.prisma.cart.findUnique({
      where: { id: sessionCartId },
      include: { items: { include: { sku: true } } },
    });

    if (!sessionCart) {
      return;
    }

    const customerCart = await this.getOrCreateCart(customerId, undefined);

    for (const sessionItem of sessionCart.items) {
      const existingItem = await this.prisma.cartItem.findFirst({
        where: {
          cart_id: customerCart.id,
          sku_id: sessionItem.sku_id,
        },
      });

      if (existingItem) {
        const newQty = existingItem.qty + sessionItem.qty;
        const isStockAvailable = await this.validateStock(
          sessionItem.sku.sku_code,
          newQty,
        );

        if (!isStockAvailable) {
          const available = await this.getAvailableStock(
            sessionItem.sku.sku_code,
          );
          const canAdd = Math.max(0, available - existingItem.qty);

          if (canAdd > 0) {
            await this.prisma.cartItem.update({
              where: { id: existingItem.id },
              data: {
                qty: existingItem.qty + canAdd,
                updated_at: new Date(),
              },
            });
          }
          continue;
        }

        await this.prisma.cartItem.update({
          where: { id: existingItem.id },
          data: {
            qty: newQty,
            updated_at: new Date(),
          },
        });
      } else {
        await this.prisma.cartItem.create({
          data: {
            cart_id: customerCart.id,
            sku_id: sessionItem.sku_id,
            qty: sessionItem.qty,
            unit_price_snapshot: sessionItem.unit_price_snapshot,
          },
        });
      }
    }

    await this.prisma.cart.update({
      where: { id: sessionCartId },
      data: { status: 'ABANDONED' },
    });

    return this.getCart(customerId, undefined);
  }
}
