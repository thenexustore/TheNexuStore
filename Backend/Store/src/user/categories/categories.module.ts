import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { CategoriesController } from './categories.controller';

@Module({
  imports: [ProductsModule],
  controllers: [CategoriesController],
})
export class CategoriesModule {}
