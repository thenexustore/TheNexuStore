import { Module } from '@nestjs/common';
import { HomeLayoutController } from './home-layout.controller';
import { HomeLayoutService } from './home-layout.service';
import { PrismaService } from '../common/prisma.service';
import { ProductsService } from '../user/products/products.service';
import { PricingService } from '../pricing/pricing.service';

@Module({
  controllers: [HomeLayoutController],
  providers: [HomeLayoutService, PrismaService, ProductsService, PricingService],
})
export class HomeLayoutModule {}
