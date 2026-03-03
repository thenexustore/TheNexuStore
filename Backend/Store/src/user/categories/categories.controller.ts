import { Controller, Get } from '@nestjs/common';
import { ProductsService } from '../products/products.service';

@Controller('user/categories')
export class CategoriesController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('menu-tree')
  async getMenuTree() {
    return this.productsService.getMenuTree();
  }
}
