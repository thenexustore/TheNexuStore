import {
  Body,
  Controller,
  Delete,
  Get,
  MessageEvent,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { HomepageSectionsService } from './homepage-sections.service';
import {
  CreateHomepageSectionDto,
  HomepageSectionOptionsQueryDto,
  ReorderHomepageSectionsDto,
  UpdateHomepageSectionDto,
} from './dto/homepage-sections.dto';
import { AdminGuard } from '../admin/admin.guard';
import { HomepagePreviewEventsService } from './homepage-preview-events.service';

@Controller()
export class HomepageSectionsController {
  constructor(
    private readonly homepageSectionsService: HomepageSectionsService,
    private readonly homepagePreviewEventsService: HomepagePreviewEventsService,
  ) {}

  @Get(['homepage/sections', 'homepage-sections'])
  async getHomepageSections() {
    const data = await this.homepageSectionsService.getPublicSections();
    return { success: true, data };
  }

  @Sse('homepage/sections/stream')
  streamHomepageSections(): Observable<MessageEvent> {
    return this.homepagePreviewEventsService.stream().pipe(
      map((event) => ({
        type: event.type,
        data: event,
      })),
    );
  }

  @UseGuards(AdminGuard)
  @Get(['admin/homepage/sections', 'admin/homepage-sections'])
  async getAdminSections() {
    const data = await this.homepageSectionsService.getAdminSections();
    return { success: true, data };
  }

  @UseGuards(AdminGuard)
  @Get(['admin/homepage/sections/diagnostics', 'admin/homepage-sections/diagnostics'])
  async getAdminDiagnostics() {
    const data = await this.homepageSectionsService.getAdminDiagnostics();
    return { success: true, data };
  }

  @UseGuards(AdminGuard)
  @Get('admin/homepage/sections/:id/preview')
  async getSectionPreview(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const data = await this.homepageSectionsService.getSectionPreview(id);
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
    this.homepagePreviewEventsService.notifyHomepageSectionsUpdated();
    return { success: true, data };
  }

  @UseGuards(AdminGuard)
  @Put(['admin/homepage/sections/reorder', 'admin/homepage-sections/reorder'])
  async reorder(@Body() body: ReorderHomepageSectionsDto) {
    const data = await this.homepageSectionsService.reorder(body);
    this.homepagePreviewEventsService.notifyHomepageSectionsUpdated();
    return { success: true, data };
  }

  @UseGuards(AdminGuard)
  @Put('admin/homepage/sections/:id')
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateHomepageSectionDto,
  ) {
    const data = await this.homepageSectionsService.update(id, body);
    this.homepagePreviewEventsService.notifyHomepageSectionsUpdated();
    return { success: true, data };
  }

  @UseGuards(AdminGuard)
  @Delete('admin/homepage/sections/:id')
  async remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    const data = await this.homepageSectionsService.remove(id);
    this.homepagePreviewEventsService.notifyHomepageSectionsUpdated();
    return data;
  }
}
