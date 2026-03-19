import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ShippingTaxService } from '../../shipping-tax/shipping-tax.service';
import {
  ReplaceShippingRuleDto,
  UpsertShippingZoneDto,
  UpsertTaxZoneDto,
} from './dto/shipping-tax-admin.dto';

@Injectable()
export class ShippingTaxAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shippingTaxService: ShippingTaxService,
  ) {}

  async getShippingZones() {
    await this.shippingTaxService.ensureDefaults();
    return this.prisma.shippingZone.findMany({ orderBy: { code: 'asc' } });
  }

  async upsertShippingZones(zones: UpsertShippingZoneDto[]) {
    await this.prisma.$transaction(
      zones.map((zone) =>
        this.prisma.shippingZone.upsert({
          where: { code: zone.code },
          update: {
            enabled: zone.enabled,
            description: zone.description,
            country_codes: zone.country_codes || [],
            region_matchers: zone.region_matchers || [],
          },
          create: {
            code: zone.code,
            enabled: zone.enabled,
            description: zone.description,
            country_codes: zone.country_codes || [],
            region_matchers: zone.region_matchers || [],
          },
        }),
      ),
    );

    return this.getShippingZones();
  }

  async getShippingRules() {
    await this.shippingTaxService.ensureDefaults();
    return this.prisma.shippingRule.findMany({
      orderBy: [{ zone_code: 'asc' }, { priority: 'asc' }],
    });
  }

  async replaceShippingRules(rules: ReplaceShippingRuleDto[]) {
    const zoneCodes = Array.from(new Set(rules.map((r) => r.zone_code)));

    await this.prisma.$transaction(async (tx) => {
      if (zoneCodes.length > 0) {
        await tx.shippingRule.deleteMany({
          where: { zone_code: { in: zoneCodes } },
        });
      }

      if (rules.length > 0) {
        await tx.shippingRule.createMany({
          data: rules.map((rule) => ({
            zone_code: rule.zone_code,
            min_base_excl_tax: rule.min_base_excl_tax,
            max_base_excl_tax: rule.max_base_excl_tax ?? null,
            shipping_base_excl_tax: rule.shipping_base_excl_tax,
            currency: rule.currency || 'EUR',
            priority: rule.priority ?? 0,
          })),
        });
      }
    });

    return this.getShippingRules();
  }

  async getTaxZones() {
    await this.shippingTaxService.ensureDefaults();
    return this.prisma.taxZone.findMany({ orderBy: { code: 'asc' } });
  }

  async upsertTaxZones(zones: UpsertTaxZoneDto[]) {
    await this.prisma.$transaction(
      zones.map((zone) =>
        this.prisma.taxZone.upsert({
          where: { code: zone.code },
          update: {
            enabled: zone.enabled,
            mode: zone.mode,
            standard_rate: zone.standard_rate,
            customs_duty_rate: zone.customs_duty_rate ?? 0,
            notes: zone.notes,
          },
          create: {
            code: zone.code,
            enabled: zone.enabled,
            mode: zone.mode,
            standard_rate: zone.standard_rate,
            customs_duty_rate: zone.customs_duty_rate ?? 0,
            notes: zone.notes,
          },
        }),
      ),
    );

    return this.getTaxZones();
  }
}
