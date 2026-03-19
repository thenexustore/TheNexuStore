import {
  applyRounding,
  computePricing,
  pickWinningRule,
} from './pricing.engine';

describe('pricing.engine', () => {
  it('applies rounding modes', () => {
    expect(applyRounding(10.11, 'NONE')).toBe(10.11);
    expect(applyRounding(10.11, 'X_99')).toBe(10.99);
    expect(applyRounding(10.96, 'X_95')).toBe(11.95);
    expect(applyRounding(10.12, 'NEAREST_0_05')).toBe(10.1);
    expect(applyRounding(10.01, 'CEIL_1')).toBe(11);
  });

  it('resolves precedence by priority and scope', () => {
    const winner = pickWinningRule([
      {
        id: '1',
        scope: 'GLOBAL',
        priority: 10,
        margin_pct: 10,
        discount_pct: 0,
        rounding_mode: 'NONE',
        updated_at: new Date('2026-01-01'),
      },
      {
        id: '2',
        scope: 'SKU',
        priority: 10,
        margin_pct: 11,
        discount_pct: 0,
        rounding_mode: 'NONE',
        updated_at: new Date('2026-01-01'),
      },
      {
        id: '3',
        scope: 'BRAND',
        priority: 11,
        margin_pct: 12,
        discount_pct: 0,
        rounding_mode: 'NONE',
        updated_at: new Date('2026-01-01'),
      },
    ] as any);
    expect(winner?.id).toBe('3');
  });

  it('clamps below floor and emits warning', () => {
    const out = computePricing({
      cost: 100,
      rule: {
        id: 'r1',
        scope: 'GLOBAL',
        priority: 0,
        margin_pct: 10,
        discount_pct: 50,
        rounding_mode: 'NONE',
        min_margin_pct: 15,
        updated_at: new Date(),
      },
    });

    expect(out.salePrice).toBeGreaterThanOrEqual(115);
    expect(out.warnings).toContain('below_floor_clamped');
    expect(out.needsReview).toBe(true);
  });
});
