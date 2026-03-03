import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { DashboardController } from './dashboard/dashboard.controller';
import { ProductsController } from './products/products.controller';
import { AdminService } from './admin.service';
import { DashboardService } from './dashboard/dashboard.service';
import { ProductsService } from './products/products.service';
import { PrismaService } from '../common/prisma.service';
import { BannersModule } from './banners/banners.module';
import { FeaturedProductsModule } from './featured-products/featured-products.module';
import { CouponsModule } from './coupons/coupons.module';
import { ShippingTaxAdminModule } from './shipping-tax/shipping-tax-admin.module';
import { JwtAuthModule } from '../auth/jwt-auth.module';

@Module({
  imports: [
    JwtAuthModule,
    BannersModule,
    FeaturedProductsModule,
    CouponsModule,
    ShippingTaxAdminModule,
  ],
  controllers: [AdminController, DashboardController, ProductsController],
  providers: [
    AdminService,
    DashboardService,
    ProductsService,
    PrismaService,
  ],
})
export class AdminModule {}
