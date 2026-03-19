import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { PrismaService } from '../../common/prisma.service';
import { AuthModule } from 'src/auth/auth.module';
import { PricingService } from '../../pricing/pricing.service';

@Module({
  imports: [AuthModule],
  controllers: [ProductsController],
  providers: [ProductsService, PrismaService, PricingService],
  exports: [ProductsService],
})
export class ProductsModule {}
