import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Put,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BrandingService, BrandingSettingsPayload } from './branding.service';
import { AdminGuard } from '../admin/admin.guard';

@Controller()
export class BrandingController {
  constructor(private readonly brandingService: BrandingService) {}

  @Get('branding/settings')
  async getBrandingSettings() {
    const data = await this.brandingService.getSettings();
    return {
      success: true,
      data,
    };
  }

  @UseGuards(AdminGuard)
  @Put('admin/branding/settings')
  async updateBrandingSettings(@Body() body: BrandingSettingsPayload) {
    const data = await this.brandingService.saveSettings(body || {});
    return {
      success: true,
      data,
      message: 'Branding settings saved',
    };
  }

  @UseGuards(AdminGuard)
  @Post('admin/branding/upload-logo')
  async uploadBrandingLogo(
    @Body()
    body: {
      variant?: 'light' | 'dark';
      dataUrl?: string;
      apiBaseUrl?: string;
    },
  ) {
    const variant = body?.variant === 'dark' ? 'dark' : 'light';
    const dataUrl = String(body?.dataUrl || '');
    const apiBaseUrl = String(body?.apiBaseUrl || '').trim();

    if (!dataUrl.startsWith('data:image/')) {
      throw new BadRequestException('Invalid image payload');
    }

    if (!apiBaseUrl) {
      throw new BadRequestException('apiBaseUrl is required');
    }

    try {
      const url = await this.brandingService.saveLogoDataUrl(
        variant,
        dataUrl,
        apiBaseUrl,
      );
      return {
        success: true,
        data: { url },
      };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Could not store logo image',
      );
    }
  }
}
