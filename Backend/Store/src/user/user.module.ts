import { Module } from '@nestjs/common';
import { ProductsModule } from './products/products.module';
import { UserFeaturedProductsModule } from './featured-products/featured-products.module';
import { CartModule } from './cart/cart.module';
import { CheckoutModule } from './checkout/checkout.module';
import { PaymentModule } from './payment/payment.module';
import { CouponModule } from './coupon/coupon.module';
import { CategoriesModule } from './categories/categories.module';

@Module({
  imports: [
    ProductsModule,
    UserFeaturedProductsModule,
    CartModule,
    CheckoutModule,
    PaymentModule,
    CouponModule,
    CategoriesModule,
  ],
  exports: [ProductsModule],
})
export class UserModule {}
