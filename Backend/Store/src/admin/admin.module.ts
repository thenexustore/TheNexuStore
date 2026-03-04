import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { DashboardController } from './dashboard/dashboard.controller';
import { ProductsController } from './products/products.controller';
import { AdminService } from './admin.service';
import { DashboardService } from './dashboard/dashboard.service';
import { ProductsService } from './products/products.service';
import { AdminGuard } from './admin.guard';
import { PrismaService } from '../common/prisma.service';
import { BannersModule } from './banners/banners.module';
import { FeaturedProductsModule } from './featured-products/featured-products.module';
import { AuthModule } from '../auth/auth.module';
import { CouponsModule } from './coupons/coupons.module';
import { ShippingTaxAdminModule } from './shipping-tax/shipping-tax-admin.module';
import { JwtAuthModule } from '../auth/jwt-auth.module';
import { PricingAdminModule } from './pricing/pricing.module';
import { CategoriesModule } from '../user/categories/categories.module';

@Module({
  imports: [
    AuthModule,
    JwtAuthModule,
    BannersModule,
    FeaturedProductsModule,
    CouponsModule,
    ShippingTaxAdminModule,
    PricingAdminModule,
    CategoriesModule,
  ],
  controllers: [AdminController, DashboardController, ProductsController],
  providers: [
    AdminService,
    DashboardService,
    ProductsService,
    AdminGuard,
    PrismaService,
  ],
  exports: [AdminGuard],
})
export class AdminModule {}
