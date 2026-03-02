import { fetchWithAuth } from "../utils";

export type PricingRuleScope = "GLOBAL" | "CATEGORY" | "BRAND" | "SKU";
export type RoundingMode = "NONE" | "X_99" | "X_95";

export interface PricingRule {
  id: string;
  scope: PricingRuleScope;
  category_id?: string | null;
  brand_id?: string | null;
  sku_id?: string | null;
  margin_pct: number;
  min_margin_amount?: number | null;
  rounding_mode: RoundingMode;
  is_active: boolean;
  priority: number;
  created_at?: string;
  updated_at?: string;
}

export async function fetchPricingRules(): Promise<PricingRule[]> {
  return fetchWithAuth("/admin/pricing-rules");
}

export async function createPricingRule(payload: any): Promise<PricingRule> {
  return fetchWithAuth("/admin/pricing-rules", { method: "POST", body: JSON.stringify(payload) });
}

export async function updatePricingRule(id: string, payload: any): Promise<PricingRule> {
  return fetchWithAuth(`/admin/pricing-rules/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export async function togglePricingRuleStatus(id: string, is_active: boolean): Promise<PricingRule> {
  return fetchWithAuth(`/admin/pricing-rules/${id}/toggle-status`, { method: "PATCH", body: JSON.stringify({ is_active }) });
}

export async function previewPricingRule(sku_code: string): Promise<any> {
  return fetchWithAuth(`/admin/pricing-rules/preview`, { method: "POST", body: JSON.stringify({ sku_code }) });
}
