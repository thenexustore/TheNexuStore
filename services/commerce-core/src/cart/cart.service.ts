import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  createCart() {
    return this.prisma.cart.create({
      data: {
        status: 'ACTIVE',
        currency: 'EUR',
      },
    });
  }

  getCart(id: string) {
    return this.prisma.cart.findUnique({
      where: { id },
      include: { items: true },
    });
  }

  addItem(cartId: string, skuId: string, qty: number) {
    return this.prisma.cartItem.upsert({
      where: {
        cart_id_sku_id: {
          cart_id: cartId,
          sku_id: skuId,
        },
      },
      update: {
        qty: { increment: qty },
      },
      create: {
        cart_id: cartId,
        sku_id: skuId,
        qty: 1,
      },
    });
  }
}
