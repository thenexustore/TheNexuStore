import { Controller, Get, Query } from '@nestjs/common';
import { FeaturedProductsService } from '../../admin/featured-products/featured-products.service';

@Controller('featured-products')
export class UserFeaturedProductsController {
  constructor(
    private readonly featuredProductsService: FeaturedProductsService,
  ) {}

  @Get()
  async getFeaturedProducts(
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    try {
     
      const response = await this.featuredProductsService.findAll({
        take: limit ? parseInt(limit) : 20,
        is_active: true,
        search, 
      });

      return {
        success: true,
        data: response.data,
        meta: response.meta,
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to fetch featured products',
        error: error.message,
      };
    }
  }
}
