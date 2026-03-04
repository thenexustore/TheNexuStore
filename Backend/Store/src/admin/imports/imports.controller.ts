import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import { Request } from 'express';
import { Roles } from '../../auth/staff-auth/roles.decorator';
import { InfortisaSyncService } from '../../infortisa/infortisa.sync';
import { PrismaService } from '../../common/prisma.service';
import { AdminGuard } from '../admin.guard';
import { AuditLogService } from '../audit-log.service';

@Controller('admin/imports')
@UseGuards(AdminGuard)
@Roles(StaffRole.ADMIN)
export class ImportsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly infortisaSync: InfortisaSyncService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get('history')
  async history(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
  ) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const where = type ? { type } : undefined;

    const [items, total] = await Promise.all([
      this.prisma.syncLog.findMany({
        where,
        orderBy: { last_sync: 'desc' },
        skip,
        take: limitNum,
      }),
      this.prisma.syncLog.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  @Post('run')
  async run(
    @Body() body: { mode: 'full' | 'stock' | 'images' },
    @Req() req: Request,
  ) {
    if (!body?.mode) {
      throw new BadRequestException('mode is required');
    }

    const startedAt = Date.now();

    if (body.mode === 'full') {
      await this.infortisaSync.fullSync();
    } else if (body.mode === 'stock') {
      await this.infortisaSync.syncStockRealTime();
    } else if (body.mode === 'images') {
      await this.infortisaSync.syncImages();
    } else {
      throw new BadRequestException('Invalid mode');
    }

    const durationMs = Date.now() - startedAt;

    await this.prisma.syncLog.upsert({
      where: { type: `manual_${body.mode}` },
      update: {
        last_sync: new Date(),
        details: `mode=${body.mode}; durationMs=${durationMs}`,
      },
      create: {
        type: `manual_${body.mode}`,
        last_sync: new Date(),
        details: `mode=${body.mode}; durationMs=${durationMs}`,
      },
    });

    await this.auditLogService.logAction({
      actor: req.user as any,
      action: 'IMPORT_TRIGGERED',
      resource: 'IMPORT_JOB',
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      metadata: {
        mode: body.mode,
        durationMs,
      },
    });

    return {
      success: true,
      message: `Import ${body.mode} executed successfully`,
      data: {
        mode: body.mode,
        durationMs,
      },
    };
  }
}
