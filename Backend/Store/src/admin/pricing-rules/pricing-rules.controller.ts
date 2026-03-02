import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { PricingRulesService } from './pricing-rules.service';
import { AdminGuard } from '../admin.guard';
import { CreatePricingRuleDto, PreviewPricingDto, TogglePricingRuleDto, UpdatePricingRuleDto } from './dto/pricing-rules.dto';

@Controller('admin/pricing-rules')
@UseGuards(AdminGuard)
export class PricingRulesController {
  constructor(private readonly service: PricingRulesService) {}

  @Get()
  async list() {
    return { success: true, data: await this.service.list() };
  }

  @Post()
  async create(@Body() dto: CreatePricingRuleDto) {
    return { success: true, data: await this.service.create(dto) };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePricingRuleDto) {
    return { success: true, data: await this.service.update(id, dto) };
  }

  @Patch(':id/toggle-status')
  async toggle(@Param('id') id: string, @Body() dto: TogglePricingRuleDto) {
    return { success: true, data: await this.service.toggle(id, dto.is_active) };
  }

  @Post('preview')
  async preview(@Body() dto: PreviewPricingDto) {
    return { success: true, data: await this.service.preview(dto.sku_code) };
  }
}
