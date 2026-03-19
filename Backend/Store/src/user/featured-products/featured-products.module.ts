import { Module } from '@nestjs/common';
import { UserFeaturedProductsController } from './featured-products.controller';
import { FeaturedProductsService } from '../../admin/featured-products/featured-products.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [UserFeaturedProductsController],
  providers: [FeaturedProductsService, PrismaService],
})
export class UserFeaturedProductsModule {}
