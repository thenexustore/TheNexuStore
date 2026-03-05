import {
  Body,
  Controller,
  Get,
  ParseArrayPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../auth/staff-auth/roles.decorator';
import { StaffRole } from '@prisma/client';
import { AdminGuard } from '../admin.guard';
import { ShippingTaxAdminService } from './shipping-tax-admin.service';
import {
  ReplaceShippingRuleDto,
  UpsertShippingZoneDto,
  UpsertTaxZoneDto,
} from './dto/shipping-tax-admin.dto';

@Controller('admin')
@UseGuards(AdminGuard)
@Roles(StaffRole.ADMIN)
export class ShippingTaxAdminController {
  constructor(private readonly service: ShippingTaxAdminService) {}

  @Get('shipping/zones')
  async getShippingZones() {
    const zones = await this.service.getShippingZones();
    return {
      success: true,
      data: zones,
    };
  }

  @Put('shipping/zones')
  async putShippingZones(
    @Body(new ParseArrayPipe({ items: UpsertShippingZoneDto }))
    zones: UpsertShippingZoneDto[],
  ) {
    const updated = await this.service.upsertShippingZones(zones);
    return {
      success: true,
      data: updated,
      message: 'Shipping zones updated successfully',
    };
  }

  @Get('shipping/rules')
  async getShippingRules() {
    const rules = await this.service.getShippingRules();
    return {
      success: true,
      data: rules,
    };
  }

  @Put('shipping/rules')
  async putShippingRules(
    @Body(new ParseArrayPipe({ items: ReplaceShippingRuleDto }))
    rules: ReplaceShippingRuleDto[],
  ) {
    const updated = await this.service.replaceShippingRules(rules);
    return {
      success: true,
      data: updated,
      message: 'Shipping rules updated successfully',
    };
  }

  @Get('tax/zones')
  async getTaxZones() {
    const zones = await this.service.getTaxZones();
    return {
      success: true,
      data: zones,
    };
  }

  @Put('tax/zones')
  async putTaxZones(
    @Body(new ParseArrayPipe({ items: UpsertTaxZoneDto }))
    zones: UpsertTaxZoneDto[],
  ) {
    const updated = await this.service.upsertTaxZones(zones);
    return {
      success: true,
      data: updated,
      message: 'Tax zones updated successfully',
    };
  }
}
