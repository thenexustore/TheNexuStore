import { Controller, Get, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('user/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get('menu-tree')
  async getMenuTree(): Promise<any> {
    return this.categoriesService.getLegacyMenuTree();
  }

  @Get('tree')
  async getTree(
    @Query('locale') locale?: string,
    @Query('maxDepth') maxDepth?: string,
    @Query('includeEmpty') includeEmpty?: string,
    @Query('includeCounts') includeCounts?: string,
  ): Promise<any> {
    return this.categoriesService.getCategoryTree({
      locale,
      maxDepth,
      includeEmpty,
      includeCounts,
    });
  }

  @Get('search')
  async searchCategories(
    @Query('q') query?: string,
    @Query('locale') locale?: string,
    @Query('maxDepth') maxDepth?: string,
  ): Promise<any> {
    return this.categoriesService.searchCategories({
      query,
      locale,
      maxDepth,
    });
  }
}
