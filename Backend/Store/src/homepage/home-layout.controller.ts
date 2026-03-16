import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { HomeLayoutService } from './home-layout.service';
import {
  CreateItemDto,
  CreateLayoutDto,
  CreateSectionDto,
  MoveSectionDto,
  ReorderItemsDto,
  ReorderSectionsDto,
  UpdateItemDto,
  UpdateLayoutDto,
  UpdateSectionDto,
} from './dto/home-layout.dto';
import { AdminGuard } from '../admin/admin.guard';

@Controller()
export class HomeLayoutController {
  constructor(private readonly service: HomeLayoutService) {}

  @Get('home')
  async getHome(
    @Query('locale') locale?: string,
    @Query('previewLayoutId') previewLayoutId?: string,
  ) {
    const data = await this.service.resolveHome(locale, previewLayoutId);
    return { success: true, data };
  }

  @UseGuards(AdminGuard)
  @Get('/admin/home/preview')
  async preview(@Query('layoutId') layoutId: string, @Query('locale') locale?: string) {
    const data = await this.service.resolveHome(locale, layoutId);
    return { success: true, data };
  }


  @UseGuards(AdminGuard)
  @Get('/admin/home/options')
  async options(
    @Query('target') target: 'products' | 'categories' | 'brands' | 'banners',
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.service.searchOptions(target, q, Number(limit || 12));
    return { success: true, data };
  }

  @UseGuards(AdminGuard)
  @Get('/admin/home/diagnostics/active')
  async activeDiagnostics(@Query('locale') locale?: string) {
    return {
      success: true,
      data: await this.service.getActiveLayoutDiagnostics(locale),
    };
  }

  @UseGuards(AdminGuard)
  @Get('/admin/home/integrated-summary')
  async integratedSummary(@Query('limit') limit?: string) {
    return {
      success: true,
      data: await this.service.getIntegratedModulesSummary(
        Number(limit || 8),
      ),
    };
  }

  @UseGuards(AdminGuard)
  @Get('/admin/home/layouts')
  async layouts() {
    return { success: true, data: await this.service.listLayouts() };
  }

  @UseGuards(AdminGuard)
  @Post('/admin/home/layouts')
  async createLayout(@Body() body: CreateLayoutDto) {
    return { success: true, data: await this.service.createLayout(body) };
  }

  @UseGuards(AdminGuard)
  @Put('/admin/home/layouts/:id')
  async updateLayout(@Param('id') id: string, @Body() body: UpdateLayoutDto) {
    return { success: true, data: await this.service.updateLayout(id, body) };
  }

  @UseGuards(AdminGuard)
  @Post('/admin/home/layouts/:id/clone')
  async cloneLayout(@Param('id') id: string) {
    return { success: true, data: await this.service.cloneLayout(id) };
  }

  @UseGuards(AdminGuard)
  @Delete('/admin/home/layouts/:id')
  async deleteLayout(@Param('id') id: string, @Query('force') force?: string) {
    return this.service.deleteLayout(id, force === 'true');
  }

  @UseGuards(AdminGuard)
  @Get('/admin/home/layouts/:id/sections')
  async sections(@Param('id') id: string) {
    return { success: true, data: await this.service.listSections(id) };
  }

  @UseGuards(AdminGuard)
  @Post('/admin/home/layouts/:id/sections')
  async createSection(@Param('id') id: string, @Body() body: CreateSectionDto) {
    return { success: true, data: await this.service.createSection(id, body) };
  }

  @UseGuards(AdminGuard)
  @Put('/admin/home/sections/:sectionId')
  async updateSection(@Param('sectionId') sectionId: string, @Body() body: UpdateSectionDto) {
    return { success: true, data: await this.service.updateSection(sectionId, body) };
  }

  @UseGuards(AdminGuard)
  @Delete('/admin/home/sections/:sectionId')
  async removeSection(@Param('sectionId') sectionId: string) {
    return this.service.removeSection(sectionId);
  }

  @UseGuards(AdminGuard)
  @Post('/admin/home/sections/:sectionId/move')
  async moveSection(@Param('sectionId') sectionId: string, @Body() body: MoveSectionDto) {
    return { success: true, data: await this.service.moveSection(sectionId, body) };
  }

  @Post('/admin/home/sections/reorder')
  async reorderSections(@Body() body: ReorderSectionsDto) {
    return { success: true, data: await this.service.reorderSections(body) };
  }

  @UseGuards(AdminGuard)
  @Get('/admin/home/sections/:sectionId/items')
  async listItems(@Param('sectionId') sectionId: string) {
    return { success: true, data: await this.service.listItems(sectionId) };
  }

  @UseGuards(AdminGuard)
  @Post('/admin/home/sections/:sectionId/items')
  async createItem(@Param('sectionId') sectionId: string, @Body() body: CreateItemDto) {
    return { success: true, data: await this.service.createItem(sectionId, body) };
  }

  @UseGuards(AdminGuard)
  @Put('/admin/home/items/:itemId')
  async updateItem(@Param('itemId') itemId: string, @Body() body: UpdateItemDto) {
    return { success: true, data: await this.service.updateItem(itemId, body) };
  }

  @UseGuards(AdminGuard)
  @Delete('/admin/home/items/:itemId')
  async removeItem(@Param('itemId') itemId: string) {
    return this.service.removeItem(itemId);
  }

  @UseGuards(AdminGuard)
  @Post('/admin/home/items/reorder')
  async reorderItems(@Body() body: ReorderItemsDto) {
    return { success: true, data: await this.service.reorderItems(body) };
  }

  @UseGuards(AdminGuard)
  @Post('/admin/home/items/upload-image')
  async uploadItemImage(@Body() body: { dataUrl?: string }) {
    return { success: true, data: await this.service.uploadItemImage(String(body?.dataUrl || '')) };
  }
}
