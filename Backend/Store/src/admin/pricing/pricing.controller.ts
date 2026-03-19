import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../admin.guard';
import { PricingAdminService } from './pricing.service';
import {
  PreviewDto,
  RecalculateDto,
  RulePayloadDto,
  RulesQueryDto,
} from './dto/pricing.dto';

@Controller('admin/pricing')
@UseGuards(AdminGuard)
export class PricingAdminController {
  constructor(private readonly service: PricingAdminService) {}

  @Get('rules')
  async listRules(@Query() query: RulesQueryDto) {
    return { success: true, data: await this.service.listRules(query) };
  }

  @Post('rules')
  async createRule(@Body() dto: RulePayloadDto) {
    return { success: true, data: await this.service.createRule(dto) };
  }

  @Put('rules/:id')
  async updateRule(
    @Param('id') id: string,
    @Body() dto: Partial<RulePayloadDto>,
  ) {
    return { success: true, data: await this.service.updateRule(id, dto) };
  }

  @Delete('rules/:id')
  async deleteRule(@Param('id') id: string) {
    return { success: true, data: await this.service.deleteRule(id) };
  }

  @Post('preview')
  async preview(@Body() dto: PreviewDto) {
    return { success: true, data: await this.service.preview(dto) };
  }

  @Post('recalculate')
  async recalculate(@Body() dto: RecalculateDto) {
    return { success: true, data: await this.service.enqueueRecalculate(dto) };
  }

  @Get('recalculate/:jobId')
  async recalculateJob(@Param('jobId') jobId: string) {
    return { success: true, data: await this.service.recalcJob(jobId) };
  }

  @Get('sku/:skuId')
  async skuDetails(@Param('skuId') skuId: string) {
    return { success: true, data: await this.service.getSkuDetail(skuId) };
  }
}
