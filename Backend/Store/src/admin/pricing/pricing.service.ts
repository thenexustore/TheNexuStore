import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { PricingService as PricingCoreService } from '../../pricing/pricing.service';
import { RecalculateDto, RulePayloadDto, RulesQueryDto } from './dto/pricing.dto';

@Injectable()
export class PricingAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingCore: PricingCoreService,
  ) {}

  private async resolveSkuId(input: { sku_id?: string | null; sku_code?: string | null }) {
    if (input.sku_id) return input.sku_id;
    const code = input.sku_code?.trim();
    if (!code) return null;
    const sku = await this.prisma.sku.findUnique({ where: { sku_code: code } });
    if (!sku) throw new BadRequestException('sku_code not found');
    return sku.id;
  }

  private validateScope(scope: string, category_id: string | null, brand_id: string | null, sku_id: string | null) {
    if (scope === 'CATEGORY' && !category_id) throw new BadRequestException('CATEGORY scope requires category_id');
    if (scope === 'BRAND' && !brand_id) throw new BadRequestException('BRAND scope requires brand_id');
    if (scope === 'SKU' && !sku_id) throw new BadRequestException('SKU scope requires sku_id or sku_code');
  }



  private validateDateWindow(startsAt?: string | null, endsAt?: string | null) {
    if (!startsAt || !endsAt) return;
    const s = new Date(startsAt).getTime();
    const e = new Date(endsAt).getTime();
    if (isNaN(s) || isNaN(e)) return;
    if (s > e) throw new BadRequestException('starts_at must be before ends_at');
  }
  async listRules(query: RulesQueryDto) {
    return this.prisma.pricingRule.findMany({
      where: {
        scope: query.scope,
        is_active: query.active,
        category_id: query.categoryId,
        brand_id: query.brandId,
        sku_id: query.skuId,
      },
      orderBy: [{ priority: 'desc' }, { updated_at: 'desc' }],
    });
  }

  async createRule(dto: RulePayloadDto) {
    const sku_id = await this.resolveSkuId(dto);
    this.validateScope(dto.scope, dto.category_id ?? null, dto.brand_id ?? null, sku_id);
    this.validateDateWindow(dto.starts_at ?? null, dto.ends_at ?? null);

    const created = await this.prisma.pricingRule.create({
      data: {
        ...dto,
        sku_id,
        discount_pct: dto.discount_pct ?? 0,
        rounding_mode: dto.rounding_mode ?? 'NONE',
        starts_at: dto.starts_at ? new Date(dto.starts_at) : null,
        ends_at: dto.ends_at ? new Date(dto.ends_at) : null,
        is_active: dto.is_active ?? true,
      } as any,
    });

    void this.enqueueRecalculate({
      scope: dto.scope === 'GLOBAL' ? 'all' : dto.scope.toLowerCase() as any,
      skuIds: sku_id ? [sku_id] : undefined,
      brandId: dto.brand_id ?? undefined,
      categoryId: dto.category_id ?? undefined,
    });

    return created;
  }

  async updateRule(id: string, dto: Partial<RulePayloadDto>) {
    const exists = await this.prisma.pricingRule.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('rule not found');

    const sku_id = dto.sku_id || dto.sku_code ? await this.resolveSkuId(dto) : exists.sku_id;
    const scope = dto.scope ?? exists.scope;
    const category_id = dto.category_id ?? exists.category_id;
    const brand_id = dto.brand_id ?? exists.brand_id;

    this.validateScope(scope, category_id, brand_id, sku_id);
    this.validateDateWindow(dto.starts_at ?? null, dto.ends_at ?? null);

    const updated = await this.prisma.pricingRule.update({
      where: { id },
      data: {
        ...dto,
        sku_id,
        starts_at: dto.starts_at ? new Date(dto.starts_at) : dto.starts_at === null ? null : undefined,
        ends_at: dto.ends_at ? new Date(dto.ends_at) : dto.ends_at === null ? null : undefined,
      } as any,
    });

    void this.enqueueRecalculate({
      scope: scope === 'GLOBAL' ? 'all' : scope.toLowerCase() as any,
      skuIds: sku_id ? [sku_id] : undefined,
      brandId: brand_id ?? undefined,
      categoryId: category_id ?? undefined,
    });

    return updated;
  }

  async deleteRule(id: string) {
    const exists = await this.prisma.pricingRule.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('rule not found');
    await this.prisma.pricingRule.delete({ where: { id } });

    void this.enqueueRecalculate({
      scope: exists.scope === 'GLOBAL' ? 'all' : exists.scope.toLowerCase() as any,
      skuIds: exists.sku_id ? [exists.sku_id] : undefined,
      brandId: exists.brand_id ?? undefined,
      categoryId: exists.category_id ?? undefined,
    });

    return { ok: true };
  }

  async preview(input: { skuId?: string; skuCode?: string; costOverride?: number }) {
    const sku = input.skuId
      ? await this.prisma.sku.findUnique({ where: { id: input.skuId } })
      : await this.prisma.sku.findUnique({ where: { sku_code: input.skuCode } });

    if (!sku) throw new NotFoundException('sku not found');

    const result = await this.pricingCore.computeForSkuId({ skuId: sku.id, costPrice: input.costOverride });

    return {
      skuId: sku.id,
      skuCode: sku.sku_code,
      cost: result.cost,
      appliedRule: result.rule_id,
      compareAtPrice: result.compare_at_price,
      salePrice: result.sale_price,
      discountPct: result.discount_pct,
      floor: result.floor,
      warnings: result.warnings,
    };
  }



  private validateRecalcFilter(dto: RecalculateDto) {
    if (dto.scope === 'brand' && !dto.brandId) {
      throw new BadRequestException('brandId is required when scope=brand');
    }
    if (dto.scope === 'category' && !dto.categoryId) {
      throw new BadRequestException('categoryId is required when scope=category');
    }
    if (dto.scope === 'sku' && (!dto.skuIds || !dto.skuIds.length)) {
      throw new BadRequestException('skuIds is required when scope=sku');
    }
  }

  private async listSkuIdsByFilter(dto: RecalculateDto): Promise<string[]> {
    if (dto.scope === 'sku' && dto.skuIds?.length) return dto.skuIds;
    if (dto.scope === 'brand' && dto.brandId) {
      const skus = await this.prisma.sku.findMany({ where: { product: { brand_id: dto.brandId } }, select: { id: true } });
      return skus.map((s) => s.id);
    }
    if (dto.scope === 'category' && dto.categoryId) {
      const skus = await this.prisma.sku.findMany({
        where: {
          OR: [
            { product: { main_category_id: dto.categoryId } },
            { product: { categories: { some: { category_id: dto.categoryId } } } },
          ],
        },
        select: { id: true },
      });
      return skus.map((s) => s.id);
    }

    const all = await this.prisma.sku.findMany({ select: { id: true } });
    return all.map((s) => s.id);
  }

  async enqueueRecalculate(dto: RecalculateDto) {
    this.validateRecalcFilter(dto);
    const skuIds = await this.listSkuIdsByFilter(dto);
    const job = await this.prisma.pricingRecalculationJob.create({
      data: {
        scope: dto.scope ?? 'all',
        total: skuIds.length,
        dry_run: dto.dryRun ?? false,
        filters_json: dto as any,
      },
    });

    setTimeout(() => {
      void this.runRecalculationJob(job.id, skuIds);
    }, 10);

    return { jobId: job.id };
  }

  async runRecalculationJob(jobId: string, skuIds: string[]) {
    const chunkSize = 200;
    const errors: Array<{ skuId: string; error: string }> = [];
    let processed = 0;
    let updated = 0;
    let warnings = 0;

    const existingJob = await this.prisma.pricingRecalculationJob.findUnique({ where: { id: jobId } });
    const dryRun = existingJob?.dry_run ?? false;

    await this.prisma.pricingRecalculationJob.update({
      where: { id: jobId },
      data: { status: 'RUNNING', started_at: new Date() },
    });

    try {
      for (let i = 0; i < skuIds.length; i += chunkSize) {
        const batch = skuIds.slice(i, i + chunkSize);
        for (const skuId of batch) {
          try {
            const computed = dryRun
              ? await this.pricingCore.computeForSkuId({ skuId })
              : await this.pricingCore.applyAndUpsertSkuPriceBySkuId({ skuId });

            processed += 1;
            if (!dryRun) updated += 1;
            if (computed.warnings?.length) warnings += 1;
          } catch (error: any) {
            processed += 1;
            errors.push({ skuId, error: error.message ?? 'unknown_error' });
          }
        }

        await this.prisma.pricingRecalculationJob.update({
          where: { id: jobId },
          data: {
            processed,
            updated_count: updated,
            warning_count: warnings,
            failed_count: errors.length,
            errors_json: errors as any,
          },
        });
      }

      await this.prisma.pricingRecalculationJob.update({
        where: { id: jobId },
        data: {
          status: errors.length ? 'DONE_WITH_ERRORS' : 'SUCCEEDED',
          processed,
          updated_count: updated,
          warning_count: warnings,
          failed_count: errors.length,
          errors_json: errors as any,
          finished_at: new Date(),
        },
      });
    } catch (error: any) {
      await this.prisma.pricingRecalculationJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          last_error: error?.message ?? 'job_failed',
          processed,
          updated_count: updated,
          warning_count: warnings,
          failed_count: errors.length,
          errors_json: errors as any,
          finished_at: new Date(),
        },
      });
      throw error;
    }
  }

  async recalcJob(jobId: string) {
    const job = await this.prisma.pricingRecalculationJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('job not found');
    return job;
  }

  async getSkuDetail(skuId: string) {
    const sku = await this.prisma.sku.findUnique({
      where: { id: skuId },
      include: { product: true, prices: true, supplier_products: { include: { price: true } } },
    });
    if (!sku) throw new NotFoundException('sku not found');

    const costCandidates = sku.supplier_products
      .map((sp) => (sp.price?.cost_price != null ? Number(sp.price.cost_price) : null))
      .filter((n): n is number => n !== null);

    const computed = await this.pricingCore.computeForSkuId({ skuId });

    return {
      skuId: sku.id,
      skuCode: sku.sku_code,
      cached: sku.prices[0] ?? null,
      costSources: {
        supplierCosts: costCandidates,
      },
      computed,
    };
  }
}
