import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../admin.guard';
import { DeployService, type DeploySettings } from './deploy.service';

@Controller('admin/deploy')
@UseGuards(AdminGuard)
export class DeployController {
  constructor(private readonly deployService: DeployService) {}

  @Get('settings')
  async getSettings() {
    const data = await this.deployService.getPublicSettings();
    return { success: true, data };
  }

  @Put('settings')
  async saveSettings(@Body() body: DeploySettings) {
    const data = await this.deployService.saveSettings(body ?? {});
    return { success: true, data, message: 'Deploy settings saved' };
  }

  @Delete('settings/:field')
  @HttpCode(200)
  async clearSecret(@Param('field') field: string) {
    if (field !== 'gitToken' && field !== 'sshPrivateKey') {
      throw new BadRequestException(`Invalid field: ${field}`);
    }
    await this.deployService.clearSecret(field);
    return { success: true, message: `${field} cleared` };
  }

  @Post('trigger')
  @HttpCode(202)
  async triggerDeploy() {
    const data = await this.deployService.triggerDeploy();
    return { success: true, data };
  }

  @Get('status')
  getStatus() {
    const data = this.deployService.getStatus();
    return { success: true, data };
  }
}
