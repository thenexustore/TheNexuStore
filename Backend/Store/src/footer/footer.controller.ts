import { Body, Controller, Delete, Get, Post, Put, UseGuards } from '@nestjs/common';
import { FooterService, FooterSettingsPayload } from './footer.service';
import { AdminGuard } from '../admin/admin.guard';

@Controller()
export class FooterController {
  constructor(private readonly footerService: FooterService) {}

  @Get('footer/settings')
  async getFooterSettings() {
    const data = await this.footerService.getSettings();
    return { success: true, data };
  }

  @UseGuards(AdminGuard)
  @Put('admin/footer/settings')
  async updateFooterSettings(@Body() body: FooterSettingsPayload) {
    const data = await this.footerService.saveSettings(body || {});
    return { success: true, data, message: 'Footer settings saved' };
  }

  @UseGuards(AdminGuard)
  @Delete('admin/footer/settings')
  async resetFooterSettings() {
    const data = await this.footerService.resetToDefaults();
    return { success: true, data, message: 'Footer settings reset to defaults' };
  }
}
