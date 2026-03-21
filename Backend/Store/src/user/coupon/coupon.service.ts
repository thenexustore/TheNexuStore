import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { Coupon, CouponType } from '@prisma/client';

export interface CouponValidationResult {
  isValid: boolean;
  coupon?: Coupon;
  error?: string;
}

export interface DiscountCalculation {
  discountAmount: number;
  couponId: string;
  couponCode: string;
  couponType: CouponType;
}

@Injectable()
export class CouponService {
  constructor(private prisma: PrismaService) {}

  async validateCoupon(
    code: string,
    subtotal: number,
  ): Promise<CouponValidationResult> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase().trim() },
      include: {
        order_discounts: true,
      },
    });

    if (!coupon) {
      return { isValid: false, error: 'Coupon not found' };
    }

    if (!coupon.is_active) {
      return { isValid: false, error: 'Coupon is not active' };
    }

    const now = new Date();
    if (coupon.starts_at && now < coupon.starts_at) {
      return { isValid: false, error: 'Coupon is not yet valid' };
    }

    if (coupon.ends_at && now > coupon.ends_at) {
      return { isValid: false, error: 'Coupon has expired' };
    }

    if (
      coupon.usage_limit !== null &&
      coupon.usage_count >= coupon.usage_limit
    ) {
      return { isValid: false, error: 'Coupon usage limit reached' };
    }

    if (
      coupon.min_order_amount !== null &&
      subtotal < Number(coupon.min_order_amount)
    ) {
      return {
        isValid: false,
        error: `Minimum order amount is ${Number(coupon.min_order_amount).toFixed(2)} €`,
      };
    }

    return { isValid: true, coupon };
  }

  calculateDiscount(coupon: Coupon, subtotal: number): number {
    const value = Number(coupon.value);

    if (coupon.type === 'PERCENT') {
      const discount = (subtotal * value) / 100;
      return Math.round(discount * 100) / 100;
    } else {
      return Math.min(value, subtotal);
    }
  }

  async applyCouponToCart(
    cartId: string,
    couponCode: string,
    subtotal: number,
  ): Promise<DiscountCalculation> {
    const validation = await this.validateCoupon(couponCode, subtotal);

    if (!validation.isValid || !validation.coupon) {
      throw new BadRequestException(validation.error || 'Invalid coupon');
    }

    const discountAmount = this.calculateDiscount(validation.coupon, subtotal);

    await this.prisma.cart.update({
      where: { id: cartId },
      data: { coupon_id: validation.coupon.id },
    });

    return {
      discountAmount,
      couponId: validation.coupon.id,
      couponCode: validation.coupon.code,
      couponType: validation.coupon.type,
    };
  }

  async removeCouponFromCart(cartId: string): Promise<void> {
    await this.prisma.cart.update({
      where: { id: cartId },
      data: { coupon_id: null },
    });
  }

  async getCartCoupon(cartId: string): Promise<Coupon | null> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { coupon: true },
    });

    return cart?.coupon || null;
  }

  async incrementUsage(couponId: string): Promise<void> {
    await this.prisma.coupon.update({
      where: { id: couponId },
      data: { usage_count: { increment: 1 } },
    });
  }

  async getCouponByCode(code: string): Promise<Coupon | null> {
    return this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase().trim() },
    });
  }
}
