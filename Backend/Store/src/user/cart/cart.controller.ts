import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  Optional,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto, CartQueryDto } from './dto/cart.dto';
import { AuthGuard } from '../../auth/auth.guard';
import { PrismaService } from 'src/common/prisma.service';

@Controller('cart')
export class CartController {
  constructor(
    private readonly cartService: CartService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getCart(@Request() req, @Query() query: CartQueryDto) {
    const customerId = req.user?.id;
    const sessionId = query.session_id || req.headers['x-session-id'];

    console.log('Get cart called:', {
      customerId,
      sessionId,
      headers: req.headers,
    });

    return this.cartService.getCart(customerId, sessionId);
  }

  @Post('add')
  async addToCart(
    @Request() req,
    @Body() dto: AddToCartDto,
    @Query() query: CartQueryDto,
  ) {
    const customerId = req.user?.id;
    const sessionId = query.session_id || req.headers['x-session-id'];

    console.log('Add to cart called:', {
      dto,
      customerId,
      sessionId,
      user: req.user,
      headers: req.headers,
    });

    return this.cartService.addToCart(dto, customerId, sessionId);
  }

  @Put('item/:id')
  async updateCartItem(
    @Request() req,
    @Param('id') itemId: string,
    @Body() dto: UpdateCartItemDto,
    @Query() query: CartQueryDto,
  ) {
    const customerId = req.user?.id;
    const sessionId = query.session_id || req.headers['x-session-id'];

    return this.cartService.updateCartItem(itemId, dto, customerId, sessionId);
  }

  @Delete('item/:id')
  async removeCartItem(
    @Request() req,
    @Param('id') itemId: string,
    @Query() query: CartQueryDto,
  ) {
    const customerId = req.user?.id;
    const sessionId = query.session_id || req.headers['x-session-id'];

    return this.cartService.removeCartItem(itemId, customerId, sessionId);
  }

  @Delete('clear')
  async clearCart(@Request() req, @Query() query: CartQueryDto) {
    const customerId = req.user?.id;
    const sessionId = query.session_id || req.headers['x-session-id'];

    return this.cartService.clearCart(customerId, sessionId);
  }

  @Post('merge')
  @UseGuards(AuthGuard)
  async mergeCarts(@Request() req, @Body() body: { session_cart_id: string }) {
    return this.cartService.mergeCarts(body.session_cart_id, req.user.id);
  }

  @Get('debug/skus/:skuCode')
  async debugSku(@Param('skuCode') skuCode: string) {
    console.log('Debug SKU lookup for:', skuCode);

    const exactMatch = await this.prisma.sku.findUnique({
      where: { sku_code: skuCode },
      include: { product: true, prices: true, inventory: true },
    });

    const similarSkus = await this.prisma.sku.findMany({
      where: {
        sku_code: {
          contains: skuCode,
          mode: 'insensitive',
        },
      },
      take: 10,
      include: { product: true },
    });

    const allSkus = await this.prisma.sku.findMany({
      take: 20,
      select: { sku_code: true, product: { select: { title: true } } },
    });

    return {
      searchedFor: skuCode,
      exactMatch: exactMatch
        ? {
            id: exactMatch.id,
            sku_code: exactMatch.sku_code,
            product_title: exactMatch.product?.title,
            price: exactMatch.prices[0]?.sale_price,
            stock: exactMatch.inventory?.reduce(
              (sum, inv) => sum + inv.qty_on_hand - inv.qty_reserved,
              0,
            ),
          }
        : null,
      similarSkus: similarSkus.map((s) => ({
        id: s.id,
        sku_code: s.sku_code,
        product_title: s.product?.title,
      })),
      allSkusSample: allSkus.map((s) => ({
        sku_code: s.sku_code,
        product_title: s.product?.title,
      })),
    };
  }

  @Get('debug/products')
  async debugProducts() {
    const products = await this.prisma.product.findMany({
      take: 10,
      select: {
        id: true,
        title: true,
        status: true,
        skus: {
          select: {
            id: true,
            sku_code: true,
            status: true,
          },
        },
      },
    });

    return products;
  }
}
