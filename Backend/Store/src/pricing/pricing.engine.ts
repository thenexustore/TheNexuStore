export type PricingScope = 'GLOBAL' | 'CATEGORY' | 'BRAND' | 'SKU';
export type RoundingMode = 'NONE' | 'X_99' | 'X_95' | 'NEAREST_0_05' | 'CEIL_1';

export interface RuleCandidate {
  id: string;
  scope: PricingScope;
  priority: number;
  margin_pct: number;
  discount_pct: number;
  min_margin_pct?: number | null;
  min_margin_amount?: number | null;
  rounding_mode: RoundingMode;
  starts_at?: Date | null;
  ends_at?: Date | null;
  updated_at: Date;
}

export interface ComputeInput {
  cost: number;
  rule: RuleCandidate | null;
}

export interface ComputeResult {
  cost: number;
  compareAtPrice: number | null;
  salePrice: number;
  discountPct: number | null;
  floor: number;
  needsReview: boolean;
  warnings: string[];
}

const scopeScore: Record<PricingScope, number> = {
  SKU: 4,
  BRAND: 3,
  CATEGORY: 2,
  GLOBAL: 1,
};

const round2 = (value: number): number => Math.round(Math.max(0, value) * 100) / 100;

export function applyRounding(value: number, mode: RoundingMode): number {
  const v = Math.max(0, value);
  switch (mode) {
    case 'NONE':
      return round2(v);
    case 'X_99': {
      const base = Math.floor(v);
      const target = base + 0.99;
      return round2(v <= target ? target : base + 1.99);
    }
    case 'X_95': {
      const base = Math.floor(v);
      const target = base + 0.95;
      return round2(v <= target ? target : base + 1.95);
    }
    case 'NEAREST_0_05':
      return round2(Math.round(v / 0.05) * 0.05);
    case 'CEIL_1':
      return round2(Math.ceil(v));
    default:
      return round2(v);
  }
}

export function pickWinningRule(rules: RuleCandidate[], now = new Date()): RuleCandidate | null {
  const active = rules.filter((rule) => {
    if (rule.starts_at && now < rule.starts_at) return false;
    if (rule.ends_at && now > rule.ends_at) return false;
    return true;
  });

  if (!active.length) return null;

  active.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    const scoreDiff = scopeScore[b.scope] - scopeScore[a.scope];
    if (scoreDiff !== 0) return scoreDiff;
    return b.updated_at.getTime() - a.updated_at.getTime();
  });

  return active[0];
}

export function computePricing(input: ComputeInput): ComputeResult {
  const cost = round2(input.cost || 0);
  const warnings: string[] = [];

  if (!cost) {
    warnings.push('missing_cost');
    return {
      cost,
      compareAtPrice: null,
      salePrice: 0,
      discountPct: null,
      floor: 0,
      needsReview: true,
      warnings,
    };
  }

  if (!input.rule) {
    warnings.push('rule_not_found');
    return {
      cost,
      compareAtPrice: round2(cost),
      salePrice: round2(cost),
      discountPct: null,
      floor: round2(cost),
      needsReview: true,
      warnings,
    };
  }

  const marginPct = input.rule.margin_pct || 0;
  const discountPctInput = Math.min(Math.max(input.rule.discount_pct || 0, 0), 90);
  const baseRaw = cost * (1 + marginPct / 100);
  const compareAtPrice = applyRounding(baseRaw, input.rule.rounding_mode);

  const saleRaw = compareAtPrice * (1 - discountPctInput / 100);
  let salePrice = applyRounding(saleRaw, input.rule.rounding_mode);

  const floorPct = input.rule.min_margin_pct ? cost * (1 + input.rule.min_margin_pct / 100) : 0;
  const floorAmount = input.rule.min_margin_amount ? cost + input.rule.min_margin_amount : 0;
  const floor = round2(Math.max(cost, floorPct, floorAmount));

  let needsReview = false;
  if (salePrice < floor) {
    salePrice = floor;
    warnings.push('below_floor_clamped');
    needsReview = true;
  }

  const discountPct = compareAtPrice > salePrice
    ? Math.round((1 - salePrice / compareAtPrice) * 100)
    : null;

  return {
    cost,
    compareAtPrice,
    salePrice,
    discountPct,
    floor,
    needsReview,
    warnings,
  };
}
