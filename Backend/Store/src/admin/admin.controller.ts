import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { CreateBrandDto, CreateCategoryDto } from './admin.dto';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
