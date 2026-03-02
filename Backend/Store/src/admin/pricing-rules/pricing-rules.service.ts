import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { PricingService } from '../../pricing/pricing.service';
import { CreatePricingRuleDto, UpdatePricingRuleDto } from './dto/pricing-rules.dto';

@Injectable()
export class PricingRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  async list() {
    return this.prisma.pricingRule.findMany({
      orderBy: [{ priority: 'desc' }, { updated_at: 'desc' }],
    });
  }

  private async resolveSkuId(input: { sku_id?: string | null; sku_code?: string | null }) {
    if (input.sku_id) return input.sku_id;
    const code = (input.sku_code ?? '').trim();
    if (!code) return null;

    const sku = await this.prisma.sku.findFirst({
      where: {
        OR: [
          { sku_code: code },
          { sku_code: code.toUpperCase() },
          { sku_code: code.toLowerCase() },
        ],
      },
    });

    if (!sku) throw new BadRequestException('sku_code not found');
    return sku.id;
  }

  private validateFinal(scope: string, category_id: string | null, brand_id: string | null, sku_id: string | null) {
    if (scope === 'CATEGORY' && !category_id) throw new BadRequestException('CATEGORY scope requires category_id');
    if (scope === 'BRAND' && !brand_id) throw new BadRequestException('BRAND scope requires brand_id');
    if (scope === 'SKU' && !sku_id) throw new BadRequestException('SKU scope requires sku_id or sku_code');
  }

  async create(dto: CreatePricingRuleDto) {
    const sku_id = await this.resolveSkuId(dto);

    this.validateFinal(
      dto.scope,
      dto.category_id ?? null,
      dto.brand_id ?? null,
      sku_id,
    );

    return this.prisma.pricingRule.create({
      data: {
        scope: dto.scope as any,
        category_id: dto.category_id ?? null,
        brand_id: dto.brand_id ?? null,
        sku_id,
        margin_pct: dto.margin_pct as any,
        min_margin_amount: (dto.min_margin_amount ?? 0) as any,
        rounding_mode: (dto.rounding_mode ?? 'NONE') as any,
        priority: dto.priority,
        is_active: dto.is_active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdatePricingRuleDto) {
    const exists = await this.prisma.pricingRule.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('rule not found');

    const resolvedSkuId =
      dto.sku_id || dto.sku_code ? await this.resolveSkuId(dto) : (exists as any).sku_id ?? null;

    const finalScope = (dto.scope ?? (exists as any).scope) as string;
    const finalCategoryId = (dto.category_id ?? (exists as any).category_id) as string | null;
    const finalBrandId = (dto.brand_id ?? (exists as any).brand_id) as string | null;

    this.validateFinal(finalScope, finalCategoryId, finalBrandId, resolvedSkuId);

    return this.prisma.pricingRule.update({
      where: { id },
      data: {
        scope: dto.scope as any,
        category_id: dto.category_id,
        brand_id: dto.brand_id,
        sku_id: (dto.sku_id || dto.sku_code) ? resolvedSkuId : undefined,
        margin_pct: dto.margin_pct as any,
        min_margin_amount: dto.min_margin_amount as any,
        rounding_mode: dto.rounding_mode as any,
        priority: dto.priority,
        is_active: dto.is_active,
      },
    });
  }

  async toggle(id: string, is_active: boolean) {
    const exists = await this.prisma.pricingRule.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('rule not found');
    return this.prisma.pricingRule.update({ where: { id }, data: { is_active } });
  }

  async preview(sku_code: string) {
    const code = sku_code.trim();
    const sku = await this.prisma.sku.findFirst({
      where: {
        OR: [
          { sku_code: code },
          { sku_code: code.toUpperCase() },
          { sku_code: code.toLowerCase() },
        ],
      },
    });
    if (!sku) throw new NotFoundException('sku not found');

    // Prefer supplier cost (if supplier product+price exists), else fallback to current SkuPrice
    let cost = 0;

    const supplierProduct = await this.prisma.supplierProduct.findFirst({
      where: { sku_id: sku.id },
      include: { price: true },
      orderBy: { last_seen_at: 'desc' },
    });

    if (supplierProduct?.price?.cost_price != null) {
      cost = Number(supplierProduct.price.cost_price);
    } else {
      const skuPrice = await this.prisma.skuPrice.findUnique({ where: { sku_id: sku.id } });
      cost = Number(skuPrice?.sale_price ?? 0);
    }

    const computed = await this.pricing.computeForSkuId({ skuId: sku.id, costPrice: cost });

    // current sale price (what store shows)
    const current = await this.prisma.skuPrice.findUnique({ where: { sku_id: sku.id } });

    return {
      sku_code: sku.sku_code,
      cost_price: cost,
      current_sale_price: Number(current?.sale_price ?? 0),
      computed_sale_price: computed.sale_price,
      winning_rule_id: computed.rule_id,
      price_source: computed.price_source,
    };
  }
}
