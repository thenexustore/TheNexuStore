import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import { Request } from 'express';
import { Roles } from '../../auth/staff-auth/roles.decorator';
import { Permissions } from '../../auth/staff-auth/permissions.decorator';
import { InfortisaSyncService } from '../../infortisa/infortisa.sync';
import { PrismaService } from '../../common/prisma.service';
import { AdminGuard } from '../admin.guard';
import { AuditLogService } from '../audit-log.service';
import {
  ImportHistoryQueryDto,
  RetryImportDto,
  TriggerImportDto,
} from './dto/imports.dto';

@Controller('admin/imports')
@UseGuards(AdminGuard)
@Roles(StaffRole.ADMIN)
export class ImportsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly infortisaSync: InfortisaSyncService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private async executeImport(
    body: { mode: TriggerImportDto['mode']; reason?: string },
    req: Request,
    options?: { isRetry?: boolean },
  ) {
    const startedAt = Date.now();

    const modeHandlers: Record<
      TriggerImportDto['mode'],
      () => Promise<unknown>
    > = {
      full: () => this.infortisaSync.fullSync(),
      stock: () => this.infortisaSync.syncStockRealTime(),
      images: () => this.infortisaSync.syncImages(),
    };

    const runResult = await modeHandlers[body.mode]();

    const durationMs = Date.now() - startedAt;
    const detailsParts = [
      `mode=${body.mode}`,
      `durationMs=${durationMs}`,
      options?.isRetry ? 'retry=true' : 'retry=false',
    ];

    if (body.reason) {
      detailsParts.push(`reason=${body.reason}`);
    }

    await this.prisma.syncLog.upsert({
      where: { type: `manual_${body.mode}` },
      update: {
        last_sync: new Date(),
        details: detailsParts.join('; '),
      },
      create: {
        type: `manual_${body.mode}`,
        last_sync: new Date(),
        details: detailsParts.join('; '),
      },
    });

    await this.auditLogService.logAction({
      actor: req.user as any,
      action: options?.isRetry ? 'IMPORT_RETRY_TRIGGERED' : 'IMPORT_TRIGGERED',
      resource: 'IMPORT_JOB',
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      requestId: (req.requestId ?? req.get('x-request-id')) || undefined,
      metadata: {
        mode: body.mode,
        durationMs,
        ...(body.reason ? { reason: body.reason } : {}),
        ...(runResult && typeof runResult === 'object' ? { run: runResult } : {}),
      },
    });

    return {
      mode: body.mode,
      durationMs,
      run: runResult,
      ...(body.reason ? { reason: body.reason } : {}),
    };
  }

  @Get('history')
  async history(@Query() query: ImportHistoryQueryDto) {
    const pageNum = query.page;
    const limitNum = query.limit;
    const skip = (pageNum - 1) * limitNum;

    const where = query.type ? { type: query.type } : undefined;

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

  @Get('runs')
  async runs() {
    const items = await this.infortisaSync.listImportRuns();
    return { success: true, data: items };
  }

  @Get('runs/:id')
  async runDetail(@Param('id') id: string) {
    const item = await this.infortisaSync.getImportRunById(id);
    if (!item) {
      throw new NotFoundException('Import run not found');
    }
    return { success: true, data: item };
  }

  @Get('runs/:id/errors')
  async runErrors(@Param('id') id: string) {
    const errors = await this.infortisaSync.getImportRunErrors(id);
    return { success: true, data: errors };
  }

  @Get('provider-stats')
  async providerStats() {
    const stats = await this.infortisaSync.getProviderStats();
    return { success: true, data: stats };
  }

  @Post('run')
  @Permissions('imports:run')
  async run(@Body() body: TriggerImportDto, @Req() req: Request) {
    const data = await this.executeImport(body, req);

    return {
      success: true,
      message: `Import ${body.mode} executed successfully`,
      data,
    };
  }

  @Post('retry')
  @Permissions('imports:retry')
  async retry(@Body() body: RetryImportDto, @Req() req: Request) {
    const data = await this.executeImport(body, req, { isRetry: true });

    return {
      success: true,
      message: `Retry ${body.mode} executed successfully`,
      data,
    };
  }
}
