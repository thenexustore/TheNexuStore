import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { StaffRole } from '@prisma/client';
import { Roles } from '../auth/staff-auth/roles.decorator';
import { AdminGuard } from './admin.guard';
import { AuditLogService } from './audit-log.service';

@Controller('admin/audit-logs')
@UseGuards(AdminGuard)
@Roles(StaffRole.ADMIN)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  async getAuditLogs(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('actorEmail') actorEmail?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const data = await this.auditLogService.list({
      page: pageNum,
      limit: limitNum,
      actorEmail,
      action,
      resource,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });

    await this.auditLogService.logAction({
      actor: req.user as any,
      action: 'AUDIT_LOGS_VIEWED',
      resource: 'ADMIN_AUDIT_LOG',
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      metadata: {
        page: pageNum,
        limit: limitNum,
      },
    });

    return {
      success: true,
      data,
    };
  }
}
