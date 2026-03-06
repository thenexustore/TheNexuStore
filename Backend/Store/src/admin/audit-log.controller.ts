import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { StaffRole } from '@prisma/client';
import { Roles } from '../auth/staff-auth/roles.decorator';
import { AdminGuard } from './admin.guard';
import { AuditLogsQueryDto } from './audit-log.dto';
import { AuditLogService } from './audit-log.service';

@Controller('admin/audit-logs')
@UseGuards(AdminGuard)
@Roles(StaffRole.ADMIN)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  async getAuditLogs(
    @Req() req: Request,
    @Query() query: AuditLogsQueryDto,
  ) {
    const pageNum = query.page;
    const limitNum = query.limit;

    const data = await this.auditLogService.list({
      page: pageNum,
      limit: limitNum,
      actorEmail: query.actorEmail,
      action: query.action,
      resource: query.resource,
      requestId: query.requestId,
      from: query.from,
      to: query.to,
    });

    await this.auditLogService.logAction({
      actor: req.user as any,
      action: 'AUDIT_LOGS_VIEWED',
      resource: 'ADMIN_AUDIT_LOG',
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      requestId: (req.requestId ?? req.get('x-request-id')) || undefined,
      metadata: {
        page: pageNum,
        limit: limitNum,
        requestId: query.requestId,
      },
    });

    return {
      success: true,
      data,
    };
  }
}
