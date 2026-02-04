import { Module } from '@nestjs/common';
import { ProductsModule } from './products/products.module';
import { UserFeaturedProductsModule } from './featured-products/featured-products.module';
import { CartModule } from './cart/cart.module';
import { CheckoutModule } from './checkout/checkout.module';

@Module({
  imports: [ProductsModule, UserFeaturedProductsModule,CartModule,CheckoutModule],
  exports: [ProductsModule],
})
export class UserModule {}
