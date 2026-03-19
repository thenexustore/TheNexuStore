import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminCategoriesService } from './admin-categories.service';
import { AdminGuard } from '../admin.guard';

@Controller('admin/categories')
@UseGuards(AdminGuard)
export class AdminCategoriesController {
  constructor(
    private readonly adminCategoriesService: AdminCategoriesService,
  ) {}

  @Get('taxonomy-status')
  async getTaxonomyStatus() {
    const data = await this.adminCategoriesService.getTaxonomyStatus();
    return { success: true, data };
  }
}
