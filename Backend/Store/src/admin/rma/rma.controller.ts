import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RmaStatus } from '@prisma/client';
import { Request } from 'express';
import { AdminGuard } from '../admin.guard';
import { AuditLogService } from '../audit-log.service';
import { RmaService } from './rma.service';

@Controller('admin/rmas')
@UseGuards(AdminGuard)
export class RmaController {
  constructor(
    private readonly rmaService: RmaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  async list(@Query('status') status?: string) {
    const data = await this.rmaService.list(status);
    return { success: true, data };
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const data = await this.rmaService.getById(id);
    return { success: true, data };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: RmaStatus },
    @Req() req: Request,
  ) {
    const data = await this.rmaService.updateStatus(id, body.status);

    await this.auditLogService.logAction({
      actor: req.user as any,
      action: 'RMA_STATUS_UPDATED',
      resource: 'RMA',
      resourceId: id,
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      metadata: { status: body.status },
    });

    return { success: true, data };
  }
}
