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
  getShippingZones() {
    return this.service.getShippingZones();
  }

  @Put('shipping/zones')
  putShippingZones(
    @Body(new ParseArrayPipe({ items: UpsertShippingZoneDto }))
    zones: UpsertShippingZoneDto[],
  ) {
    return this.service.upsertShippingZones(zones);
  }

  @Get('shipping/rules')
  getShippingRules() {
    return this.service.getShippingRules();
  }

  @Put('shipping/rules')
  putShippingRules(
    @Body(new ParseArrayPipe({ items: ReplaceShippingRuleDto }))
    rules: ReplaceShippingRuleDto[],
  ) {
    return this.service.replaceShippingRules(rules);
  }

  @Get('tax/zones')
  getTaxZones() {
    return this.service.getTaxZones();
  }

  @Put('tax/zones')
  putTaxZones(
    @Body(new ParseArrayPipe({ items: UpsertTaxZoneDto }))
    zones: UpsertTaxZoneDto[],
  ) {
    return this.service.upsertTaxZones(zones);
  }
}
