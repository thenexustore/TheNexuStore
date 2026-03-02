import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

type Scope = 'GLOBAL' | 'CATEGORY' | 'BRAND' | 'SKU';
type RoundingMode = 'NONE' | 'X_99' | 'X_95';

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  private round2(n: number): number {
    if (!isFinite(n)) return 0;
    return Math.round(n * 100) / 100;
  }

  private applyRounding(value: number, mode: RoundingMode): number {
    const v = this.round2(value);
    if (mode === 'NONE') return Math.max(0, v);

    const base = Math.floor(v);
    if (mode === 'X_99') {
      const target = base + 0.99;
      if (v <= target) return this.round2(target);
      return this.round2(base + 1 + 0.99);
    }
    if (mode === 'X_95') {
      const target = base + 0.95;
      if (v <= target) return this.round2(target);
      return this.round2(base + 1 + 0.95);
    }
    return Math.max(0, v);
  }

  private computeSalePrice(cost: number, marginPct: number, minMargin: number, rounding: RoundingMode): number {
    const c = isFinite(cost) ? cost : 0;
    const pct = isFinite(marginPct) ? marginPct : 0;
    const min = isFinite(minMargin) ? minMargin : 0;

    const marginByPct = c * (pct / 100);
    const margin = Math.max(marginByPct, min);
    const raw = c + margin;
    return this.applyRounding(raw, rounding);
  }

  private scopeRank(scope: Scope): number {
    if (scope === 'SKU') return 4;
    if (scope === 'BRAND') return 3;
    if (scope === 'CATEGORY') return 2;
    return 1;
  }

  async findWinningRule(ctx: { skuId: string; brandId: string | null; categoryId: string | null }) {
    const or: any[] = [{ scope: 'GLOBAL' }];
    if (ctx.categoryId) or.push({ scope: 'CATEGORY', category_id: ctx.categoryId });
    if (ctx.brandId) or.push({ scope: 'BRAND', brand_id: ctx.brandId });
    or.push({ scope: 'SKU', sku_id: ctx.skuId });

    const rules = await this.prisma.pricingRule.findMany({
      where: { is_active: true, OR: or },
    });

    if (!rules.length) return null;

    rules.sort((a: any, b: any) => {
      const p = (b.priority ?? 0) - (a.priority ?? 0);
      if (p !== 0) return p;
      return this.scopeRank(b.scope as Scope) - this.scopeRank(a.scope as Scope);
    });

    return rules[0];
  }

  async computeForSkuId(params: { skuId: string; costPrice: number }) {
    const sku = await this.prisma.sku.findUnique({
      where: { id: params.skuId },
      include: { product: true },
    });
    if (!sku) {
      return { sale_price: this.round2(params.costPrice), rule_id: null, price_source: 'FALLBACK' };
    }

    const brandId = (sku as any)?.product?.brand_id ?? null;
    const categoryId = (sku as any)?.product?.category_id ?? (sku as any)?.product?.main_category_id ?? null;

    const rule = await this.findWinningRule({ skuId: sku.id, brandId, categoryId });

    if (!rule) {
      return { sale_price: this.round2(params.costPrice), rule_id: null, price_source: 'FALLBACK' };
    }

    const marginPct = Number((rule as any).margin_pct ?? 0);
    const minMargin = Number((rule as any).min_margin_amount ?? 0);
    const rounding = ((rule as any).rounding_mode ?? 'NONE') as RoundingMode;

    const sale = this.computeSalePrice(params.costPrice, marginPct, minMargin, rounding);
    return { sale_price: sale, rule_id: (rule as any).id, price_source: `RULE:${(rule as any).id}` };
  }

  async applyAndUpsertSkuPriceBySkuId(params: { skuId: string; costPrice: number; fallbackSource?: string }) {
    const computed = await this.computeForSkuId({ skuId: params.skuId, costPrice: params.costPrice });

    const price_source =
      computed.rule_id ? computed.price_source : (params.fallbackSource ?? 'INFORTISA');

    await this.prisma.skuPrice.upsert({
      where: { sku_id: params.skuId },
      create: {
        sku_id: params.skuId,
        sale_price: computed.sale_price,
        compare_at_price: null,
        currency: 'EUR',
        price_source,
        updated_at: new Date(),
      },
      update: {
        sale_price: computed.sale_price,
        price_source,
        updated_at: new Date(),
      },
    });

    return computed;
  }
}
