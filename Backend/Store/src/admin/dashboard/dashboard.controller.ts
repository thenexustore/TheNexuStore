import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AdminGuard } from '../admin.guard';

@Controller('admin/dashboard')
@UseGuards(AdminGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getDashboardStats() {
    const stats = await this.dashboardService.getDashboardStats();
    return {
      success: true,
      data: stats,
    };
  }
}
