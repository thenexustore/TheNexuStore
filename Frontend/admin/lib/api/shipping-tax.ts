import { fetchWithAuth } from '../utils';

export interface ShippingZone {
  code: string;
  enabled: boolean;
  description: string;
  country_codes: string[];
  region_matchers: string[];
}

export interface ShippingRule {
  zone_code: string;
  min_base_excl_tax: number;
  max_base_excl_tax?: number | null;
  shipping_base_excl_tax: number;
  currency: string;
  priority: number;
}

export interface TaxZone {
  code: string;
  enabled: boolean;
  mode: 'VAT' | 'OUTSIDE_VAT';
  standard_rate: number;
  customs_duty_rate: number;
  notes?: string | null;
}

export async function fetchShippingZones(): Promise<ShippingZone[]> {
  return fetchWithAuth('/admin/shipping/zones');
}

export async function updateShippingZones(zones: ShippingZone[]): Promise<ShippingZone[]> {
  return fetchWithAuth('/admin/shipping/zones', {
    method: 'PUT',
    body: JSON.stringify(
      zones.map((z) => ({
        code: z.code,
        enabled: z.enabled,
        description: z.description,
        country_codes: z.country_codes || [],
        region_matchers: z.region_matchers || [],
      })),
    ),
  });
}

export async function fetchShippingRules(): Promise<ShippingRule[]> {
  return fetchWithAuth('/admin/shipping/rules');
}

export async function updateShippingRules(rules: ShippingRule[]): Promise<ShippingRule[]> {
  return fetchWithAuth('/admin/shipping/rules', {
    method: 'PUT',
    body: JSON.stringify(
      rules.map((r) => ({
        zone_code: r.zone_code,
        min_base_excl_tax: Number(r.min_base_excl_tax),
        max_base_excl_tax:
          r.max_base_excl_tax === null || r.max_base_excl_tax === undefined
            ? null
            : Number(r.max_base_excl_tax),
        shipping_base_excl_tax: Number(r.shipping_base_excl_tax),
        currency: r.currency || 'EUR',
        priority: Number(r.priority),
      })),
    ),
  });
}

export async function fetchTaxZones(): Promise<TaxZone[]> {
  return fetchWithAuth('/admin/tax/zones');
}

export async function updateTaxZones(zones: TaxZone[]): Promise<TaxZone[]> {
  return fetchWithAuth('/admin/tax/zones', {
    method: 'PUT',
    body: JSON.stringify(
      zones.map((z) => ({
        code: z.code,
        enabled: z.enabled,
        mode: z.mode,
        standard_rate: Number(z.standard_rate),
        customs_duty_rate: Number(z.customs_duty_rate || 0),
        notes: z.notes || '',
      })),
    ),
  });
}
