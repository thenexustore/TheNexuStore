import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import {
  RuleCandidate,
  computePricing,
  pickWinningRule,
} from './pricing.engine';

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveCostForSku(skuId: string): Promise<{ cost: number; source: string }> {
    const directSupplier = await this.prisma.supplierProduct.findFirst({
      where: { sku_id: skuId, price: { isNot: null } },
      include: { price: true, supplier: true },
      orderBy: { last_seen_at: 'desc' },
    });

    if (directSupplier?.price?.cost_price != null) {
      return { cost: Number(directSupplier.price.cost_price), source: 'SUPPLIER_PRICE' };
    }

    const existing = await this.prisma.skuPrice.findUnique({ where: { sku_id: skuId } });
    if (existing?.cost_price != null) {
      return { cost: Number(existing.cost_price), source: 'SKU_CACHE_COST' };
    }

    return { cost: Number(existing?.sale_price ?? 0), source: 'SKU_SALE_FALLBACK' };
  }

  async findCandidateRules(ctx: {
    skuId: string;
    brandId: string | null;
    categoryIds: string[];
  }): Promise<RuleCandidate[]> {
    const where: any = {
      is_active: true,
      OR: [
        { scope: 'GLOBAL' },
        { scope: 'SKU', sku_id: ctx.skuId },
      ],
    };

    if (ctx.brandId) where.OR.push({ scope: 'BRAND', brand_id: ctx.brandId });
    if (ctx.categoryIds.length) {
      where.OR.push({ scope: 'CATEGORY', category_id: { in: ctx.categoryIds } });
    }

    const rules = await this.prisma.pricingRule.findMany({ where });
    return rules.map((rule: any) => ({
      id: rule.id,
      scope: rule.scope,
      priority: rule.priority,
      margin_pct: Number(rule.margin_pct ?? 0),
      discount_pct: Number(rule.discount_pct ?? 0),
      min_margin_pct: rule.min_margin_pct != null ? Number(rule.min_margin_pct) : null,
      min_margin_amount: rule.min_margin_amount != null ? Number(rule.min_margin_amount) : null,
      rounding_mode: rule.rounding_mode,
      starts_at: rule.starts_at,
      ends_at: rule.ends_at,
      updated_at: rule.updated_at,
    }));
  }

  async computeForSkuId(params: { skuId: string; costPrice?: number }) {
    const sku = await this.prisma.sku.findUnique({
      where: { id: params.skuId },
      include: {
        product: {
          include: {
            categories: true,
          },
        },
      },
    });

    if (!sku) {
      return {
        cost: 0,
        compare_at_price: null,
        sale_price: 0,
        discount_pct: null,
        floor: 0,
        needs_review: true,
        warnings: ['sku_not_found'],
        rule_id: null,
        price_source: 'FALLBACK',
      };
    }

    const categoryIds = [
      ...(sku.product.main_category_id ? [sku.product.main_category_id] : []),
      ...sku.product.categories.map((c) => c.category_id),
    ];

    const costResolved = params.costPrice != null
      ? { cost: params.costPrice, source: 'OVERRIDE' }
      : await this.resolveCostForSku(sku.id);

    const rules = await this.findCandidateRules({
      skuId: sku.id,
      brandId: sku.product.brand_id,
      categoryIds: Array.from(new Set(categoryIds)),
    });

    const winner = pickWinningRule(rules);
    const computed = computePricing({ cost: costResolved.cost, rule: winner });

    return {
      cost: computed.cost,
      compare_at_price: computed.compareAtPrice,
      sale_price: computed.salePrice,
      discount_pct: computed.discountPct,
      floor: computed.floor,
      needs_review: computed.needsReview,
      warnings: computed.warnings,
      rule_id: winner?.id ?? null,
      price_source: winner ? `RULE:${winner.id}` : costResolved.source,
    };
  }

  async applyAndUpsertSkuPriceBySkuId(params: { skuId: string; costPrice?: number; fallbackSource?: string }) {
    const computed = await this.computeForSkuId({ skuId: params.skuId, costPrice: params.costPrice });

    await this.prisma.skuPrice.upsert({
      where: { sku_id: params.skuId },
      create: {
        sku_id: params.skuId,
        cost_price: computed.cost,
        sale_price: computed.sale_price,
        compare_at_price: computed.compare_at_price,
        discount_pct: computed.discount_pct,
        rule_id: computed.rule_id,
        needs_review: computed.needs_review,
        currency: 'EUR',
        price_source: computed.rule_id ? computed.price_source : (params.fallbackSource ?? computed.price_source),
        updated_at: new Date(),
      },
      update: {
        cost_price: computed.cost,
        sale_price: computed.sale_price,
        compare_at_price: computed.compare_at_price,
        discount_pct: computed.discount_pct,
        rule_id: computed.rule_id,
        needs_review: computed.needs_review,
        price_source: computed.rule_id ? computed.price_source : (params.fallbackSource ?? computed.price_source),
        updated_at: new Date(),
      },
    });

    return computed;
  }
}
