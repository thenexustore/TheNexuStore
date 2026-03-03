import { Module } from '@nestjs/common';
import { FeaturedProductsService } from './featured-products.service';
import { FeaturedProductsController } from './featured-products.controller';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [FeaturedProductsController],
  providers: [FeaturedProductsService, PrismaService],
})
export class FeaturedProductsModule {}
