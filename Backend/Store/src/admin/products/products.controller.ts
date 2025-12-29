import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Query,
  Put,
  Delete,
  Param,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { AdminGuard } from '../admin.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';

@Controller('admin/products')
@UseGuards(AdminGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async getProducts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const data = await this.productsService.getProducts(
      pageNum,
      limitNum,
      search,
      status,
    );

    return {
      success: true,
      data,
    };
  }

  @Get(':id')
  async getProductById(@Param('id') id: string) {
    const product = await this.productsService.getProductById(id);
    return {
      success: true,
      data: product,
    };
  }

  @Post()
  async createProduct(@Body() body: CreateProductDto) {
    const product = await this.productsService.createProduct(body);
    return {
      success: true,
      data: product,
      message: 'Product created successfully',
    };
  }

  @Put(':id')
  async updateProduct(@Param('id') id: string, @Body() body: UpdateProductDto) {
    const product = await this.productsService.updateProduct(id, body);
    return {
      success: true,
      data: product,
      message: 'Product updated successfully',
    };
  }

  @Delete(':id')
  async deleteProduct(@Param('id') id: string) {
    await this.productsService.deleteProduct(id);
    return {
      success: true,
      message: 'Product deleted successfully',
    };
  }

  @Put(':id/status')
  async updateProductStatus(
    @Param('id') id: string,
    @Body() body: UpdateProductStatusDto,
  ) {
    const product = await this.productsService.updateProductStatus(
      id,
      body.status,
    );

    return {
      success: true,
      data: product,
      message: 'Product status updated',
    };
  }
}
