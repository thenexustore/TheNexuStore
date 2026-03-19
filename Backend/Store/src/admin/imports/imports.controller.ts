import {
  Body,
  Controller,
  Get,
  Patch,
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
import { UpdateImportIntegrationConfigDto } from './dto/imports-config.dto';
import { ImportsConfigService } from './imports-config.service';

@Controller('admin/imports')
@UseGuards(AdminGuard)
@Roles(StaffRole.ADMIN)
export class ImportsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly infortisaSync: InfortisaSyncService,
    private readonly auditLogService: AuditLogService,
    private readonly importsConfigService: ImportsConfigService,
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

    const result = await modeHandlers[body.mode]();

    const durationMs = Date.now() - startedAt;
    const detailsParts = [
      `mode=${body.mode}`,
      `durationMs=${durationMs}`,
      options?.isRetry ? 'retry=true' : 'retry=false',
    ];

    if (body.reason) {
      detailsParts.push(`reason=${body.reason}`);
    }

    if (result && typeof result === 'object') {
      const summary = result as Record<string, unknown>;
      if (typeof summary.sourceItemsReceived === 'number') {
        detailsParts.push(
          `source_items_received=${summary.sourceItemsReceived}`,
        );
      }
      if (typeof summary.sourceTotalExpected === 'number') {
        detailsParts.push(
          `source_total_expected=${summary.sourceTotalExpected}`,
        );
      }
      if (typeof summary.sourcePageSize === 'number') {
        detailsParts.push(`source_page_size=${summary.sourcePageSize}`);
      }
      if (typeof summary.sourcePages === 'number') {
        detailsParts.push(`source_pages=${summary.sourcePages}`);
      }
      if (typeof summary.created === 'number') {
        detailsParts.push(`created=${summary.created}`);
      }
      if (typeof summary.updated === 'number') {
        detailsParts.push(`updated=${summary.updated}`);
      }
      if (typeof summary.skipped === 'number') {
        detailsParts.push(`skipped=${summary.skipped}`);
      }
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
      },
    });

    return {
      mode: body.mode,
      durationMs,
      ...(body.reason ? { reason: body.reason } : {}),
      ...(result && typeof result === 'object'
        ? (result as Record<string, unknown>)
        : {}),
    };
  }

  @Get('config')
  @Permissions('imports:config:read')
  async config(
    @Req() req: Request,
    @Query('includeSecret') includeSecret?: string,
  ) {
    const permissions = Array.isArray((req.user as any)?.permissions)
      ? ((req.user as any).permissions as string[])
      : [];
    const canReadSecret =
      permissions.includes('full_access') ||
      permissions.includes('imports:secret:read');

    return {
      success: true,
      data: await this.importsConfigService.getConfig({
        includeSecret: includeSecret === 'true' && canReadSecret,
        enforceSecretRead: includeSecret === 'true',
      }),
    };
  }

  @Patch('config')
  @Permissions('imports:config:update')
  async updateConfig(@Body() body: UpdateImportIntegrationConfigDto) {
    return {
      success: true,
      data: await this.importsConfigService.updateConfig(body),
    };
  }

  @Post('config/test-connection')
  @Permissions('imports:config:read')
  async testConnection() {
    return {
      success: true,
      data: await this.importsConfigService.testConnection(),
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
