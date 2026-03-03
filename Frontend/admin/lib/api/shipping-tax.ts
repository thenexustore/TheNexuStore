import { fetchWithAuth } from '../utils';

export interface ShippingZone {
  code: string;
  enabled: boolean;
  description: string;
  country_codes: string[];
  region_matchers: string[];
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
    body: JSON.stringify(zones),
  });
}

export async function fetchTaxZones(): Promise<TaxZone[]> {
  return fetchWithAuth('/admin/tax/zones');
}

export async function updateTaxZones(zones: TaxZone[]): Promise<TaxZone[]> {
  return fetchWithAuth('/admin/tax/zones', {
    method: 'PUT',
    body: JSON.stringify(zones),
  });
}
