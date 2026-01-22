import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateFeaturedProductDto } from './dto/create-featured-product.dto';
import { UpdateFeaturedProductDto } from './dto/update-featured-product.dto';
import { UpdateFeaturedProductOrderDto } from './dto/update-featured-product-order.dto';
import { AdminGuard } from '../admin.guard';
import { Roles } from '../../auth/staff-auth/roles.decorator';
import { StaffRole } from '@prisma/client';
import { FeaturedProductsService } from './featured-products.service';

@Controller('admin/featured-products')
@UseGuards(AdminGuard)
export class FeaturedProductsController {
  constructor(
    private readonly featuredProductsService: FeaturedProductsService,
  ) {}

  @Post()
  @Roles(StaffRole.ADMIN)
  create(@Body() createFeaturedProductDto: CreateFeaturedProductDto) {
    return this.featuredProductsService.create(createFeaturedProductDto);
  }

  @Get()
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('is_active') is_active?: string,
    @Query('category_id') category_id?: string,
    @Query('search') search?: string,
  ) {
    return this.featuredProductsService.findAll({
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
      is_active: is_active ? is_active === 'true' : undefined,
      category_id,
      search,
    });
  }

  @Get('product-options')
  getProductOptions(@Query('search') search?: string) {
    return this.featuredProductsService.getProductOptions(search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.featuredProductsService.findOne(id);
  }

  @Patch(':id')
  @Roles(StaffRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateFeaturedProductDto: UpdateFeaturedProductDto,
  ) {
    return this.featuredProductsService.update(id, updateFeaturedProductDto);
  }

  @Patch(':id/toggle-status')
  @Roles(StaffRole.ADMIN)
  toggleStatus(@Param('id') id: string) {
    return this.featuredProductsService.toggleStatus(id);
  }

  @Post('update-order')
  @Roles(StaffRole.ADMIN)
  updateOrder(@Body() updateOrderDto: UpdateFeaturedProductOrderDto) {
    return this.featuredProductsService.updateOrder(updateOrderDto);
  }

  @Delete(':id')
  @Roles(StaffRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.featuredProductsService.remove(id);
  }
}
