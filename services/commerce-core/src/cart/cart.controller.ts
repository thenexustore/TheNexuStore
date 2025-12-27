import { Controller, Get, Post, Param, Body } from '@nestjs/common';

import { CartService } from './cart.service';

@Controller('carts')
export class CartController {
  constructor(private readonly service: CartService) {}

  @Post()
  create() {
    return this.service.createCart();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.getCart(id);
  }

  @Post(':id/items')
  addItem(
    @Param('id') cartId: string,
    @Body() body: { skuId: string; qty: number },
  ) {
    return this.service.addItem(cartId, body.skuId, body.qty);
  }
}
