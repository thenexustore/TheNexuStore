import { Module } from '@nestjs/common';
import { ProductsModule } from './products/products.module';
import { UserFeaturedProductsModule } from './featured-products/featured-products.module';

@Module({
  imports: [ProductsModule, UserFeaturedProductsModule],
  exports: [ProductsModule],
})
export class UserModule {}
