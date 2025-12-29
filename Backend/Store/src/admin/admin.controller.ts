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
import { AdminService } from './admin.service';
import { StaffGuard } from '../auth/staff-auth/staff.guard';
import { StaffRoleGuard } from '../auth/staff-auth/staff-role.guard';
import { Roles } from '../auth/staff-auth/roles.decorator';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateBrandDto,
  CreateCategoryDto,
  UpdateProductStatusDto,
} from './admin.dto';

@Controller('admin')
@UseGuards(StaffGuard, StaffRoleGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard/stats')
  async getDashboardStats() {
    const stats = await this.adminService.getDashboardStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Get('orders')
  async getOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    const data = await this.adminService.getOrders(
      pageNum,
      limitNum,
      status,
      search,
    );

    return {
      success: true,
      data,
    };
  }

  @Get('products')
  async getProducts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const data = await this.adminService.getProducts(
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

  @Get('products/:id')
  async getProductById(@Param('id') id: string) {
    const product = await this.adminService.getProductById(id);
    return {
      success: true,
      data: product,
    };
  }

  @Post('products')
  async createProduct(@Body() body: CreateProductDto) {
    const product = await this.adminService.createProduct(body);
    return {
      success: true,
      data: product,
      message: 'Product created successfully',
    };
  }

  @Put('products/:id')
  async updateProduct(@Param('id') id: string, @Body() body: UpdateProductDto) {
    const product = await this.adminService.updateProduct(id, body);
    return {
      success: true,
      data: product,
      message: 'Product updated successfully',
    };
  }

  @Delete('products/:id')
  async deleteProduct(@Param('id') id: string) {
    await this.adminService.deleteProduct(id);
    return {
      success: true,
      message: 'Product deleted successfully',
    };
  }

  @Put('products/:id/status')
  async updateProductStatus(
    @Param('id') id: string,
    @Body() body: UpdateProductStatusDto,
  ) {
    const product = await this.adminService.updateProductStatus(
      id,
      body.status,
    );

    return {
      success: true,
      data: product,
      message: 'Product status updated',
    };
  }

  @Get('brands')
  async getBrands() {
    const brands = await this.adminService.getBrands();
    return {
      success: true,
      data: brands,
    };
  }

  @Post('brands')
  async createBrand(@Body() body: CreateBrandDto) {
    const brand = await this.adminService.createBrand(body);
    return {
      success: true,
      data: brand,
      message: 'Brand created successfully',
    };
  }

  @Get('categories')
  async getCategories() {
    const categories = await this.adminService.getCategories();
    return {
      success: true,
      data: categories,
    };
  }

  @Post('categories')
  async createCategory(@Body() body: CreateCategoryDto) {
    const category = await this.adminService.createCategory(body);
    return {
      success: true,
      data: category,
      message: 'Category created successfully',
    };
  }

  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      service: 'admin-api',
      timestamp: new Date().toISOString(),
    };
  }
}
