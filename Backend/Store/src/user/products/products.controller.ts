import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { GetProductsDto } from './dto/get-products.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { AuthGuard } from '../../auth/auth.guard';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user?: any;
}

@Controller('user/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async getProducts(@Query() query: GetProductsDto) {
    return this.productsService.getProducts(query);
  }

  @Get('search')
  async searchProducts(
    @Query('q') query: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.productsService.searchProducts(query, limit);
  }

  @Get('featured')
  async getFeaturedProducts(
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number,
  ) {
    return this.productsService.getFeaturedProducts(limit);
  }

  @Get(':id')
  async getProductById(@Param('id') id: string) {
    return this.productsService.getProductById(id);
  }

  @Get('slug/:slug')
  async getProductBySlug(@Param('slug') slug: string) {
    return this.productsService.getProductBySlug(slug);
  }

  @Get(':id/related')
  async getRelatedProducts(
    @Param('id') id: string,
    @Query('limit', new DefaultValuePipe(4), ParseIntPipe) limit: number,
  ) {
    return this.productsService.getRelatedProducts(id, limit);
  }

  @Post(':id/reviews')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createReview(
    @Param('id') productId: string,
    @Body() dto: CreateReviewDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const customerId = req.user.userId;
    return this.productsService.createReview(productId, customerId, dto);
  }

  @Get('categories/:slug/products')
  async getProductsByCategory(
    @Param('slug') slug: string,
    @Query() query: GetProductsDto,
  ) {
    const modifiedQuery = { ...query, category: slug };
    return this.productsService.getProducts(modifiedQuery);
  }

  @Get('brands/:slug/products')
  async getProductsByBrand(
    @Param('slug') slug: string,
    @Query() query: GetProductsDto,
  ) {
    const modifiedQuery = { ...query, brand: slug };
    return this.productsService.getProducts(modifiedQuery);
  }

  @Get('sku/:skuCode')
  async getProductBySku(@Param('skuCode') skuCode: string) {
    return this.productsService.getBySku(skuCode);
  }
}
