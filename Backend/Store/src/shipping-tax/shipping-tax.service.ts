import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TaxMode } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

export type DestinationZoneCode =
  | 'ES_PENINSULA_BALEARES'
  | 'PT'
  | 'AD'
  | 'CANARY_ISLANDS'
  | 'CEUTA'
  | 'MELILLA'
  | 'OTHER';

export interface AddressLike {
  country?: string;
  region?: string;
  postal_code?: string;
}

export interface CartTotalsInput {
  subtotalExclTax: number;
  discountExclTax: number;
  currency?: string;
  destination: AddressLike;
}

export interface CartTotalsResult {
  status: 'OK' | 'UNAVAILABLE';
  zone_code: DestinationZoneCode;
  subtotal_excl_tax: number;
  discount_excl_tax: number;
  shipping_excl_tax: number;
  tax_rate: number;
  tax_amount: number;
  customs_duty_rate: number;
  customs_duty_amount: number;
  total: number;
  tax_mode: TaxMode;
  tax_label: 'IVA' | 'VAT' | 'Taxes';
  message?: string;
}

@Injectable()
export class ShippingTaxService {
  private defaultsSeedPromise: Promise<void> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async ensureDefaults(): Promise<void> {
    if (!this.defaultsSeedPromise) {
      this.defaultsSeedPromise = this.seedDefaultsIfNeeded().catch((error) => {
        this.defaultsSeedPromise = null;
        throw error;
      });
    }

    await this.defaultsSeedPromise;
  }

  private async seedDefaultsIfNeeded(): Promise<void> {
    const [zonesCount, rulesCount, taxZonesCount] = await Promise.all([
      this.prisma.shippingZone.count(),
      this.prisma.shippingRule.count(),
      this.prisma.taxZone.count(),
    ]);

    const ptShippingEnabled =
      this.configService.get<string>('PT_SHIPPING_ENABLED') !== 'false';
    const adShippingEnabled =
      this.configService.get<string>('AD_SHIPPING_ENABLED') === 'true';
    const ossEnabled = this.configService.get<string>('OSS_ENABLED') === 'true';

    if (zonesCount === 0) {
      await this.prisma.shippingZone.createMany({
        data: [
          {
            code: 'ES_PENINSULA_BALEARES',
            enabled: true,
            description: 'Spain Peninsula and Baleares',
            country_codes: ['ES'],
            region_matchers: ['PENINSULA', 'BALEARES', 'ILLES BALEARS'],
          },
          {
            code: 'PT',
            enabled: ptShippingEnabled,
            description: 'Portugal mainland',
            country_codes: ['PT'],
            region_matchers: ['PORTUGAL', 'MAINLAND', 'MADEIRA', 'AZORES'],
          },
          {
            code: 'AD',
            enabled: adShippingEnabled,
            description: 'Andorra',
            country_codes: ['AD'],
            region_matchers: ['ANDORRA'],
          },
          {
            code: 'CANARY_ISLANDS',
            enabled: false,
            description: 'Canary Islands',
            country_codes: ['ES'],
            region_matchers: ['CANARY', 'CANARIAS', 'TENERIFE', 'LAS PALMAS'],
          },
          {
            code: 'CEUTA',
            enabled: false,
            description: 'Ceuta',
            country_codes: ['ES'],
            region_matchers: ['CEUTA'],
          },
          {
            code: 'MELILLA',
            enabled: false,
            description: 'Melilla',
            country_codes: ['ES'],
            region_matchers: ['MELILLA'],
          },
          {
            code: 'OTHER',
            enabled: false,
            description: 'Other countries',
            country_codes: [],
            region_matchers: [],
          },
        ],
      });
    }

    if (rulesCount === 0) {
      await this.prisma.shippingRule.createMany({
        data: [
          { zone_code: 'ES_PENINSULA_BALEARES', min_base_excl_tax: 0, max_base_excl_tax: 50, shipping_base_excl_tax: 5, currency: 'EUR', priority: 1 },
          { zone_code: 'ES_PENINSULA_BALEARES', min_base_excl_tax: 50, max_base_excl_tax: 199, shipping_base_excl_tax: 3, currency: 'EUR', priority: 2 },
          { zone_code: 'ES_PENINSULA_BALEARES', min_base_excl_tax: 199, max_base_excl_tax: null, shipping_base_excl_tax: 0, currency: 'EUR', priority: 3 },
          { zone_code: 'PT', min_base_excl_tax: 0, max_base_excl_tax: 199, shipping_base_excl_tax: 6, currency: 'EUR', priority: 1 },
          { zone_code: 'PT', min_base_excl_tax: 199, max_base_excl_tax: null, shipping_base_excl_tax: 0, currency: 'EUR', priority: 2 },
          { zone_code: 'AD', min_base_excl_tax: 0, max_base_excl_tax: 800, shipping_base_excl_tax: 50, currency: 'EUR', priority: 1 },
          { zone_code: 'AD', min_base_excl_tax: 800, max_base_excl_tax: 1500, shipping_base_excl_tax: 30, currency: 'EUR', priority: 2 },
          { zone_code: 'AD', min_base_excl_tax: 1500, max_base_excl_tax: null, shipping_base_excl_tax: 0, currency: 'EUR', priority: 3 },
        ],
      });
    }

    if (taxZonesCount === 0) {
      await this.prisma.taxZone.createMany({
        data: [
          {
            code: 'ES_PENINSULA_BALEARES',
            enabled: true,
            mode: TaxMode.VAT,
            standard_rate: 0.21,
            customs_duty_rate: 0,
            notes: 'IVA standard 21%',
          },
          {
            code: 'PT',
            enabled: ossEnabled,
            mode: ossEnabled ? TaxMode.VAT : TaxMode.OUTSIDE_VAT,
            standard_rate: ossEnabled ? 0.23 : 0,
            customs_duty_rate: 0,
            notes: ossEnabled ? 'Portugal VAT 23%' : 'OSS disabled. treated as outside VAT',
          },
          {
            code: 'CANARY_ISLANDS',
            enabled: false,
            mode: TaxMode.OUTSIDE_VAT,
            standard_rate: 0,
            customs_duty_rate: 0,
            notes: 'MVP default: outside VAT; import taxes due',
          },
          {
            code: 'CEUTA',
            enabled: false,
            mode: TaxMode.OUTSIDE_VAT,
            standard_rate: 0,
            customs_duty_rate: 0,
            notes: 'MVP default: outside VAT; import taxes due',
          },
          {
            code: 'MELILLA',
            enabled: false,
            mode: TaxMode.OUTSIDE_VAT,
            standard_rate: 0,
            customs_duty_rate: 0,
            notes: 'MVP default: outside VAT; import taxes due',
          },
          {
            code: 'AD',
            enabled: false,
            mode: TaxMode.OUTSIDE_VAT,
            standard_rate: 0,
            customs_duty_rate: 0,
            notes: 'MVP default: outside VAT; import taxes due',
          },
          {
            code: 'OTHER',
            enabled: false,
            mode: TaxMode.OUTSIDE_VAT,
            standard_rate: 0,
            customs_duty_rate: 0,
            notes: 'Not available / consult',
          },
        ],
      });
    }
  }

  determineDestinationZone(address: AddressLike): DestinationZoneCode {
    const country = (address.country || '').trim().toUpperCase();
    const region = (address.region || '').trim().toUpperCase();
    const postal = (address.postal_code || '').trim();

    const isSpain = ['ES', 'SPAIN', 'ESPAÑA'].includes(country);
    if (isSpain) {
      if (region.includes('CANAR') || /^(35|38)/.test(postal)) {
        return 'CANARY_ISLANDS';
      }
      if (region.includes('CEUTA') || postal.startsWith('51')) {
        return 'CEUTA';
      }
      if (region.includes('MELILLA') || postal.startsWith('52')) {
        return 'MELILLA';
      }
      return 'ES_PENINSULA_BALEARES';
    }

    if (['PT', 'PORTUGAL'].includes(country)) {
      return 'PT';
    }

    if (['AD', 'ANDORRA'].includes(country)) {
      return 'AD';
    }

    return 'OTHER';
  }

  async calculateTotals(input: CartTotalsInput): Promise<CartTotalsResult> {
    await this.ensureDefaults();
    const zoneCode = this.determineDestinationZone(input.destination);

    const subtotal = this.round2(input.subtotalExclTax);
    const discount = this.round2(Math.min(input.discountExclTax, subtotal));

    const zone = await this.prisma.shippingZone.findUnique({ where: { code: zoneCode } });
    if (!zone || !zone.enabled || zoneCode === 'OTHER') {
      return {
        status: 'UNAVAILABLE',
        zone_code: zoneCode,
        subtotal_excl_tax: subtotal,
        discount_excl_tax: discount,
        shipping_excl_tax: 0,
        tax_rate: 0,
        tax_amount: 0,
        customs_duty_rate: 0,
        customs_duty_amount: 0,
        total: this.round2(subtotal - discount),
        tax_mode: TaxMode.OUTSIDE_VAT,
        tax_label: 'Taxes',
        message: 'Shipping not available for this destination. Contact support.',
      };
    }

    const shippingRule = await this.prisma.shippingRule.findFirst({
      where: {
        zone_code: zoneCode,
        min_base_excl_tax: { lte: subtotal },
        OR: [{ max_base_excl_tax: null }, { max_base_excl_tax: { gt: subtotal } }],
      },
      orderBy: { priority: 'asc' },
    });

    const shipping = this.round2(Number(shippingRule?.shipping_base_excl_tax ?? 0));

    const taxZone = await this.prisma.taxZone.findUnique({ where: { code: zoneCode } });
    const taxRate =
      taxZone && taxZone.enabled && taxZone.mode === TaxMode.VAT
        ? Number(taxZone.standard_rate)
        : 0;
    const customsDutyRate = Number(taxZone?.customs_duty_rate ?? 0);

    const taxableBase = subtotal - discount + shipping;
    const taxAmount = this.round2(taxableBase * taxRate);
    const customsDutyAmount = this.round2(taxableBase * customsDutyRate);
    const total = this.round2(taxableBase + taxAmount + customsDutyAmount);

    const outsideVat =
      !taxZone || !taxZone.enabled || taxZone.mode === TaxMode.OUTSIDE_VAT;

    return {
      status: 'OK',
      zone_code: zoneCode,
      subtotal_excl_tax: subtotal,
      discount_excl_tax: discount,
      shipping_excl_tax: shipping,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      customs_duty_rate: customsDutyRate,
      customs_duty_amount: customsDutyAmount,
      total,
      tax_mode: outsideVat ? TaxMode.OUTSIDE_VAT : TaxMode.VAT,
      tax_label:
        zoneCode === 'ES_PENINSULA_BALEARES'
          ? 'IVA'
          : zoneCode === 'PT'
            ? 'VAT'
            : 'Taxes',
      message: outsideVat ? 'Local import taxes/duties may apply' : undefined,
    };
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
