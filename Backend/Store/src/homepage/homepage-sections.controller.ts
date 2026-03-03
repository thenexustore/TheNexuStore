import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HomepageSectionsService } from './homepage-sections.service';
import {
  CreateHomepageSectionDto,
  HomepageSectionOptionsQueryDto,
  ReorderHomepageSectionsDto,
  UpdateHomepageSectionDto,
} from './dto/homepage-sections.dto';
import { AdminGuard } from '../admin/admin.guard';

@Controller()
export class HomepageSectionsController {
  constructor(private readonly homepageSectionsService: HomepageSectionsService) {}

  @Get(['homepage/sections', 'homepage-sections'])
  async getHomepageSections() {
    const data = await this.homepageSectionsService.getPublicSections();
    return { success: true, data };
  }

  @UseGuards(AdminGuard)
  @Get(['admin/homepage/sections', 'admin/homepage-sections'])
  async getAdminSections() {
    const data = await this.homepageSectionsService.getAdminSections();
    return { success: true, data };
  }

  @UseGuards(AdminGuard)
  @Get([
    'admin/homepage/sections/options',
    'admin/homepage-sections/options',
  ])
  async getOptions(@Query() query: HomepageSectionOptionsQueryDto) {
    const data = await this.homepageSectionsService.getOptions(query);
    return { success: true, data };
  }

  @UseGuards(AdminGuard)
  @Post(['admin/homepage/sections', 'admin/homepage-sections'])
  async create(@Body() body: CreateHomepageSectionDto) {
    const data = await this.homepageSectionsService.create(body);
    return { success: true, data };
  }

  @UseGuards(AdminGuard)
  @Put(['admin/homepage/sections/reorder', 'admin/homepage-sections/reorder'])
  async reorder(@Body() body: ReorderHomepageSectionsDto) {
    const data = await this.homepageSectionsService.reorder(body);
    return { success: true, data };
  }

  @UseGuards(AdminGuard)
  @Put('admin/homepage/sections/:id')
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateHomepageSectionDto,
  ) {
    const data = await this.homepageSectionsService.update(id, body);
    return { success: true, data };
  }

  @UseGuards(AdminGuard)
  @Delete('admin/homepage/sections/:id')
  async remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.homepageSectionsService.remove(id);
  }
}
