import { fetchWithAuth } from '../utils';

export type PricingRuleScope = 'GLOBAL' | 'CATEGORY' | 'BRAND' | 'SKU';
export type RoundingMode = 'NONE' | 'X_99' | 'X_95' | 'NEAREST_0_05' | 'CEIL_1';

export interface PricingRule {
  id: string;
  scope: PricingRuleScope;
  category_id?: string | null;
  brand_id?: string | null;
  sku_id?: string | null;
  margin_pct: number;
  discount_pct: number;
  min_margin_pct?: number | null;
  min_margin_amount?: number | null;
  rounding_mode: RoundingMode;
  priority: number;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  updated_at: string;
}

export async function fetchPricingRules(query?: {
  scope?: PricingRuleScope | 'ALL';
  active?: 'all' | 'true' | 'false';
}): Promise<PricingRule[]> {
  const params = new URLSearchParams();
  if (query?.scope && query.scope !== 'ALL') params.set('scope', query.scope);
  if (query?.active && query.active !== 'all') params.set('active', query.active);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return fetchWithAuth(`/admin/pricing/rules${suffix}`);
}

export async function createPricingRule(payload: Partial<PricingRule>): Promise<PricingRule> {
  return fetchWithAuth('/admin/pricing/rules', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updatePricingRule(id: string, payload: Partial<PricingRule>): Promise<PricingRule> {
  return fetchWithAuth(`/admin/pricing/rules/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deletePricingRule(id: string): Promise<void> {
  await fetchWithAuth(`/admin/pricing/rules/${id}`, { method: 'DELETE' });
}

export async function previewPricing(payload: { skuCode?: string; skuId?: string; costOverride?: number }) {
  return fetchWithAuth('/admin/pricing/preview', { method: 'POST', body: JSON.stringify(payload) });
}

export async function recalculatePricing(payload: any): Promise<{ jobId: string }> {
  return fetchWithAuth('/admin/pricing/recalculate', { method: 'POST', body: JSON.stringify(payload) });
}

export async function getRecalculateJob(jobId: string): Promise<any> {
  return fetchWithAuth(`/admin/pricing/recalculate/${jobId}`);
}
