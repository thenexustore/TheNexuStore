import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { PricingService } from '../../pricing/pricing.service';
import {
  CreatePricingRuleDto,
  PricingApprovalStatus,
  UpdatePricingRuleDto,
} from './dto/pricing-rules.dto';

@Injectable()
export class PricingRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  async list() {
    return (this.prisma.pricingRule as any).findMany({
      orderBy: [
        { approval_status: 'asc' },
        { priority: 'desc' },
        { updated_at: 'desc' },
      ],
    });
  }

  async getById(id: string) {
    const rule = await (this.prisma.pricingRule as any).findUnique({
      where: { id },
    });
    if (!rule) {
      throw new NotFoundException('rule not found');
    }
    return rule;
  }

  private async resolveSkuId(input: {
    sku_id?: string | null;
    sku_code?: string | null;
  }) {
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

  private validateFinal(
    scope: string,
    category_id: string | null,
    brand_id: string | null,
    sku_id: string | null,
  ) {
    if (scope === 'CATEGORY' && !category_id)
      throw new BadRequestException('CATEGORY scope requires category_id');
    if (scope === 'BRAND' && !brand_id)
      throw new BadRequestException('BRAND scope requires brand_id');
    if (scope === 'SKU' && !sku_id)
      throw new BadRequestException('SKU scope requires sku_id or sku_code');
  }

  async create(dto: CreatePricingRuleDto, actorId?: string) {
    const sku_id = await this.resolveSkuId(dto);

    this.validateFinal(
      dto.scope,
      dto.category_id ?? null,
      dto.brand_id ?? null,
      sku_id,
    );

    return (this.prisma.pricingRule as any).create({
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
        approval_status: PricingApprovalStatus.DRAFT,
        created_by_actor_id: actorId,
      },
    });
  }

  async update(id: string, dto: UpdatePricingRuleDto) {
    const exists = await (this.prisma.pricingRule as any).findUnique({
      where: { id },
    });
    if (!exists) throw new NotFoundException('rule not found');

    if (exists.approval_status === PricingApprovalStatus.PUBLISHED) {
      throw new BadRequestException(
        'Published rules cannot be edited directly',
      );
    }

    const resolvedSkuId =
      dto.sku_id || dto.sku_code
        ? await this.resolveSkuId(dto)
        : (exists.sku_id ?? null);

    const finalScope = (dto.scope ?? exists.scope) as string;
    const finalCategoryId = (dto.category_id ?? exists.category_id) as
      | string
      | null;
    const finalBrandId = (dto.brand_id ?? exists.brand_id) as string | null;

    this.validateFinal(
      finalScope,
      finalCategoryId,
      finalBrandId,
      resolvedSkuId,
    );

    return (this.prisma.pricingRule as any).update({
      where: { id },
      data: {
        scope: dto.scope as any,
        category_id: dto.category_id,
        brand_id: dto.brand_id,
        sku_id: dto.sku_id || dto.sku_code ? resolvedSkuId : undefined,
        margin_pct: dto.margin_pct as any,
        min_margin_amount: dto.min_margin_amount as any,
        rounding_mode: dto.rounding_mode as any,
        priority: dto.priority,
        is_active: dto.is_active,
      },
    });
  }

  async transitionStatus(
    id: string,
    status: PricingApprovalStatus,
    actorId?: string,
  ) {
    const exists = await (this.prisma.pricingRule as any).findUnique({
      where: { id },
    });
    if (!exists) throw new NotFoundException('rule not found');

    const current = exists.approval_status as unknown as PricingApprovalStatus;

    if (status === PricingApprovalStatus.PENDING) {
      if (current !== PricingApprovalStatus.DRAFT) {
        throw new BadRequestException('Only DRAFT rules can be submitted');
      }

      return (this.prisma.pricingRule as any).update({
        where: { id },
        data: {
          approval_status: PricingApprovalStatus.PENDING,
          submitted_by_actor_id: actorId,
          submitted_at: new Date(),
        },
      });
    }

    if (status === PricingApprovalStatus.APPROVED) {
      if (current !== PricingApprovalStatus.PENDING) {
        throw new BadRequestException('Only PENDING rules can be approved');
      }

      if (
        exists.created_by_actor_id &&
        actorId &&
        exists.created_by_actor_id === actorId
      ) {
        throw new BadRequestException('4-eyes rule: creator cannot approve');
      }

      return (this.prisma.pricingRule as any).update({
        where: { id },
        data: {
          approval_status: PricingApprovalStatus.APPROVED,
          approved_by_actor_id: actorId,
          approved_at: new Date(),
        },
      });
    }

    if (status === PricingApprovalStatus.PUBLISHED) {
      if (current !== PricingApprovalStatus.APPROVED) {
        throw new BadRequestException('Only APPROVED rules can be published');
      }

      return (this.prisma.pricingRule as any).update({
        where: { id },
        data: {
          approval_status: PricingApprovalStatus.PUBLISHED,
          published_by_actor_id: actorId,
          published_at: new Date(),
          is_active: true,
        },
      });
    }

    if (status === PricingApprovalStatus.DRAFT) {
      if (current === PricingApprovalStatus.PUBLISHED) {
        throw new BadRequestException(
          'Published rules cannot be moved back to draft',
        );
      }

      return (this.prisma.pricingRule as any).update({
        where: { id },
        data: {
          approval_status: PricingApprovalStatus.DRAFT,
        },
      });
    }

    throw new BadRequestException('Unsupported transition');
  }

  async toggle(id: string, is_active: boolean) {
    const exists = await (this.prisma.pricingRule as any).findUnique({
      where: { id },
    });
    if (!exists) throw new NotFoundException('rule not found');
    return (this.prisma.pricingRule as any).update({
      where: { id },
      data: { is_active },
    });
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

    let cost = 0;

    const supplierProduct = await this.prisma.supplierProduct.findFirst({
      where: { sku_id: sku.id },
      include: { price: true },
      orderBy: { last_seen_at: 'desc' },
    });

    if (supplierProduct?.price?.cost_price != null) {
      cost = Number(supplierProduct.price.cost_price);
    } else {
      const skuPrice = await this.prisma.skuPrice.findUnique({
        where: { sku_id: sku.id },
      });
      cost = Number(skuPrice?.sale_price ?? 0);
    }

    const computed = await this.pricing.computeForSkuId({
      skuId: sku.id,
      costPrice: cost,
    });
    const current = await this.prisma.skuPrice.findUnique({
      where: { sku_id: sku.id },
    });

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
