import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { BannersService } from './banners.service';
import {
  CreateBannerDto,
  UpdateBannerDto,
  ReorderBannersDto,
} from './dto/create-banner.dto';
import { AdminGuard } from '../admin.guard';

@Controller('admin/banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Post()
  @UseGuards(AdminGuard)
  async createBanner(@Body() body: CreateBannerDto) {
    const banner = await this.bannersService.create(body);
    return {
      success: true,
      data: banner,
      message: 'Banner created successfully',
    };
  }

  @Get()
  @UseGuards(AdminGuard)
  async getBanners() {
    const banners = await this.bannersService.findAllAdmin();
    return {
      success: true,
      data: banners,
    };
  }

  // REMOVE @UseGuards(AdminGuard) from this endpoint - it should be public!
  @Get('active')
  async getActiveBanners() {
    const banners = await this.bannersService.findAll();
    return {
      success: true,
      data: banners,
    };
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  async getBannerById(@Param('id') id: string) {
    const banner = await this.bannersService.findOne(id);
    return {
      success: true,
      data: banner,
    };
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  async updateBanner(@Param('id') id: string, @Body() body: UpdateBannerDto) {
    const banner = await this.bannersService.update(id, body);
    return {
      success: true,
      data: banner,
      message: 'Banner updated successfully',
    };
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async deleteBanner(@Param('id') id: string) {
    await this.bannersService.remove(id);
    return {
      success: true,
      message: 'Banner deleted successfully',
    };
  }

  @Patch(':id/toggle-status')
  @UseGuards(AdminGuard)
  async toggleBannerStatus(@Param('id') id: string) {
    const banner = await this.bannersService.findOne(id);
    const updatedBanner = await this.bannersService.update(id, {
      is_active: !banner.is_active,
    });
    return {
      success: true,
      data: updatedBanner,
      message: 'Banner status toggled',
    };
  }

  @Post('reorder')
  @UseGuards(AdminGuard)
  async reorderBanners(@Body() body: ReorderBannersDto) {
    await this.bannersService.reorder(body);
    return {
      success: true,
      message: 'Banners reordered successfully',
    };
  }
}
