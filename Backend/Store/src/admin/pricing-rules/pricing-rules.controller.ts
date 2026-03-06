import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import { Request } from 'express';
import { Roles } from '../../auth/staff-auth/roles.decorator';
import { AuditLogService } from '../audit-log.service';
import { AdminGuard } from '../admin.guard';
import { PricingRulesService } from './pricing-rules.service';
import {
  CreatePricingRuleDto,
  PreviewPricingDto,
  TogglePricingRuleDto,
  TransitionPricingRuleStatusDto,
  UpdatePricingRuleDto,
} from './dto/pricing-rules.dto';

@Controller('admin/pricing-rules')
@UseGuards(AdminGuard)
export class PricingRulesController {
  constructor(
    private readonly service: PricingRulesService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  async list() {
    return { success: true, data: await this.service.list() };
  }

  @Post()
  async create(@Body() dto: CreatePricingRuleDto, @Req() req: Request) {
    const data = await this.service.create(dto, (req.user as any)?.sub);

    await this.auditLogService.logAction({
      actor: req.user as any,
      action: 'PRICING_RULE_CREATED',
      resource: 'PRICING_RULE',
      resourceId: data.id,
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      requestId: (req.requestId ?? req.get('x-request-id')) || undefined,
      metadata: { scope: data.scope, approval_status: data.approval_status },
    });

    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePricingRuleDto,
    @Req() req: Request,
  ) {
    const data = await this.service.update(id, dto);

    await this.auditLogService.logAction({
      actor: req.user as any,
      action: 'PRICING_RULE_UPDATED',
      resource: 'PRICING_RULE',
      resourceId: data.id,
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      requestId: (req.requestId ?? req.get('x-request-id')) || undefined,
    });

    return { success: true, data };
  }

  @Patch(':id/toggle-status')
  async toggle(@Param('id') id: string, @Body() dto: TogglePricingRuleDto) {
    return { success: true, data: await this.service.toggle(id, dto.is_active) };
  }

  @Patch(':id/workflow')
  @Roles(StaffRole.ADMIN)
  async workflow(
    @Param('id') id: string,
    @Body() dto: TransitionPricingRuleStatusDto,
    @Req() req: Request,
  ) {
    const previous = await this.service.getById(id);

    const data = await this.service.transitionStatus(
      id,
      dto.status,
      (req.user as any)?.sub,
    );

    await this.auditLogService.logAction({
      actor: req.user as any,
      action: 'PRICING_RULE_STATUS_CHANGED',
      resource: 'PRICING_RULE',
      resourceId: data.id,
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      requestId: (req.requestId ?? req.get('x-request-id')) || undefined,
      metadata: {
        from_status: previous.approval_status,
        to_status: data.approval_status,
      },
      before: {
        approval_status: previous.approval_status,
      },
      after: {
        approval_status: data.approval_status,
      },
    });

    return { success: true, data };
  }

  @Post('preview')
  async preview(@Body() dto: PreviewPricingDto) {
    return { success: true, data: await this.service.preview(dto.sku_code) };
  }
}
