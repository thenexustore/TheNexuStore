import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import {
  DEFAULT_HOMEPAGE_SECTIONS,
  HomepageSectionType,
} from './homepage-section.types';
import {
  CreateHomepageSectionDto,
  HomepageSectionOptionsQueryDto,
  ReorderHomepageSectionsDto,
  UpdateHomepageSectionDto,
} from './dto/homepage-sections.dto';
import { ProductsService } from '../user/products/products.service';
import { BannersService } from '../admin/banners/banners.service';
import { ProductSortBy } from '../user/products/dto/get-products.dto';

@Injectable()
export class HomepageSectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
    private readonly bannersService: BannersService,
  ) {}

  private validateConfig(type: HomepageSectionType, config: Record<string, any>) {
    if (!config || typeof config !== 'object') {
      throw new BadRequestException('config_json must be an object');
    }

    const limit = config.limit;
    if (
      [
        HomepageSectionType.TOP_CATEGORIES_GRID,
        HomepageSectionType.BEST_DEALS,
        HomepageSectionType.NEW_ARRIVALS,
        HomepageSectionType.BRANDS_STRIP,
        HomepageSectionType.FEATURED_PICKS,
      ].includes(type) &&
      limit !== undefined &&
      (typeof limit !== 'number' || limit < 1 || limit > 24)
    ) {
      throw new BadRequestException('config_json.limit must be a number between 1 and 24');
    }

    if (
      [HomepageSectionType.TOP_CATEGORIES_GRID, HomepageSectionType.BRANDS_STRIP, HomepageSectionType.FEATURED_PICKS].includes(type)
    ) {
      if (!['manual', 'query'].includes(config.source || 'query')) {
        throw new BadRequestException('config_json.source must be manual or query');
      }
      if ((config.source || 'query') === 'manual' && !Array.isArray(config.ids)) {
        throw new BadRequestException('manual source requires config_json.ids array');
      }
    }

    if (type === HomepageSectionType.TRUST_BAR && !Array.isArray(config.items)) {
      throw new BadRequestException('TRUST_BAR config_json.items must be an array');
    }
  }

  private shouldBackfillLegacyConfig(
    type: HomepageSectionType,
    config: Record<string, any>,
  ) {
    if (type === HomepageSectionType.FEATURED_PICKS) {
      return (config.source || 'query') === 'manual' && Array.isArray(config.ids) && config.ids.length === 0;
    }

    if (type === HomepageSectionType.TOP_CATEGORIES_GRID || type === HomepageSectionType.BRANDS_STRIP) {
      return !config.source;
    }

    return false;
  }

  async ensureDefaultSections() {
    const existingSections = await this.prisma.homepageSection.findMany();

    if (existingSections.length === 0) {
      for (const section of DEFAULT_HOMEPAGE_SECTIONS) {
        await this.prisma.homepageSection.create({
          data: {
            type: section.type as any,
            enabled: true,
            position: section.position,
            title: section.title,
            config_json: section.config_json,
          },
        });
      }
      return;
    }

    const sectionByType = new Map(existingSections.map((section) => [section.type, section]));

    for (const section of DEFAULT_HOMEPAGE_SECTIONS) {
      const existing = sectionByType.get(section.type as any);

      if (!existing) {
        continue;
      }

      const existingConfig = (existing.config_json || {}) as Record<string, any>;
      if (this.shouldBackfillLegacyConfig(section.type, existingConfig)) {
        await this.prisma.homepageSection.update({
          where: { id: existing.id },
          data: { config_json: section.config_json },
        });
      }
    }
  }

  async getAdminSections() {
    await this.ensureDefaultSections();
    return this.prisma.homepageSection.findMany({ orderBy: { position: 'asc' } });
  }

  async getPublicSections() {
    await this.ensureDefaultSections();
    const sections = await this.prisma.homepageSection.findMany({
      where: { enabled: true },
      orderBy: { position: 'asc' },
    });

    return Promise.all(
      sections.map(async (section) => {
        try {
          return {
            ...section,
            data: await this.resolveSectionData(
              section.type as HomepageSectionType,
              section.config_json as Record<string, any>,
            ),
          };
        } catch {
          return { ...section, data: [], failed: true };
        }
      }),
    );
  }

  private async getManualProducts(ids: string[]) {
    if (!ids.length) return [];
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids }, status: 'ACTIVE' },
      include: {
        brand: true,
        main_category: true,
        media: { where: { sku_id: null }, orderBy: { sort_order: 'asc' }, take: 1 },
        skus: {
          where: { name: null },
          include: { prices: true, inventory: true },
          take: 1,
        },
      },
    });

    const order = new Map(ids.map((id, index) => [id, index]));

    return products
      .sort((a, b) => Number(order.get(a.id) ?? 10_000) - Number(order.get(b.id) ?? 10_000))
      .map((p) => {
        const sku = p.skus[0];
        const price = sku?.prices?.[0];
        if (!price) return null;
        const priceValue = Number(price.sale_price);
        const compareAt = price.compare_at_price
          ? Number(price.compare_at_price)
          : undefined;
        return {
          id: p.id,
          title: p.title,
          slug: p.slug,
          brand_name: p.brand.name,
          brand_slug: p.brand.slug,
          category_name: p.main_category?.name || 'Uncategorized',
          category_slug: p.main_category?.slug || 'uncategorized',
          sku_code: sku?.sku_code || 'N/A',
          price: priceValue,
          compare_at_price: compareAt,
          discount_percentage:
            compareAt && compareAt > priceValue
              ? Math.round(((compareAt - priceValue) / compareAt) * 100)
              : undefined,
          stock_quantity: sku?.inventory?.[0]?.qty_on_hand || 0,
          stock_status: 'IN_STOCK',
          thumbnail: p.media[0]?.url || '/No_Image_Available.png',
          rating_count: p.rating_count,
          is_featured: false,
        };
      })
      .filter(Boolean);
  }

  private async resolveSectionData(type: HomepageSectionType, config: Record<string, any>) {
    switch (type) {
      case HomepageSectionType.HERO_BANNER_SLIDER:
        return this.bannersService.findAll();
      case HomepageSectionType.BEST_DEALS:
        return this.productsService.getDealsProducts(config.limit || 12, true);
      case HomepageSectionType.NEW_ARRIVALS:
        return (
          await this.productsService.getProducts({
            page: 1,
            limit: config.limit || 12,
            sort_by: ProductSortBy.NEWEST,
            in_stock_only: true,
          })
        ).products;
      case HomepageSectionType.FEATURED_PICKS:
        return (config.source || 'query') === 'manual'
          ? this.getManualProducts(config.ids || [])
          : (
              await this.productsService.getProducts({
                page: 1,
                limit: config.limit || 12,
                featured_only: true,
                in_stock_only: true,
              })
            ).products;
      case HomepageSectionType.TOP_CATEGORIES_GRID:
        if ((config.source || 'query') === 'manual') {
          const ids = config.ids || [];
          const order = new Map(ids.map((id: string, index: number) => [id, index]));
          const categories = await this.prisma.category.findMany({
            where: { id: { in: ids }, is_active: true },
            orderBy: { sort_order: 'asc' },
          });
          return categories.sort((a, b) => Number(order.get(a.id) ?? 10_000) - Number(order.get(b.id) ?? 10_000));
        }
        return this.prisma.category.findMany({
          where: { is_active: true },
          orderBy: { sort_order: 'asc' },
          take: config.limit || 10,
        });
      case HomepageSectionType.BRANDS_STRIP:
        if ((config.source || 'query') === 'manual') {
          const ids = config.ids || [];
          const order = new Map(ids.map((id: string, index: number) => [id, index]));
          const brands = await this.prisma.brand.findMany({
            where: { id: { in: ids }, is_active: true },
            orderBy: { name: 'asc' },
          });
          return brands.sort((a, b) => Number(order.get(a.id) ?? 10_000) - Number(order.get(b.id) ?? 10_000));
        }
        return this.prisma.brand.findMany({
          where: { is_active: true },
          orderBy: { name: 'asc' },
          take: config.limit || 12,
        });
      case HomepageSectionType.TRUST_BAR:
        return config.items || [];
      default:
        return [];
    }
  }

  async getOptions(query: HomepageSectionOptionsQueryDto) {
    const limit = query.limit || 10;
    const q = query.q || '';

    if (query.type === HomepageSectionType.FEATURED_PICKS) {
      const res = await this.prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          title: { contains: q, mode: 'insensitive' },
        },
        select: { id: true, title: true, slug: true },
        take: limit,
        orderBy: { created_at: 'desc' },
      });
      return res.map((x) => ({ id: x.id, label: x.title, subtitle: x.slug }));
    }

    if (query.type === HomepageSectionType.TOP_CATEGORIES_GRID) {
      const res = await this.prisma.category.findMany({
        where: { is_active: true, name: { contains: q, mode: 'insensitive' } },
        select: { id: true, name: true, slug: true },
        take: limit,
        orderBy: { sort_order: 'asc' },
      });
      return res.map((x) => ({ id: x.id, label: x.name, subtitle: x.slug }));
    }

    if (query.type === HomepageSectionType.BRANDS_STRIP) {
      const res = await this.prisma.brand.findMany({
        where: { is_active: true, name: { contains: q, mode: 'insensitive' } },
        select: { id: true, name: true, slug: true },
        take: limit,
        orderBy: { name: 'asc' },
      });
      return res.map((x) => ({ id: x.id, label: x.name, subtitle: x.slug }));
    }

    return [];
  }

  async create(dto: CreateHomepageSectionDto) {
    this.validateConfig(dto.type, dto.config_json);
    return this.prisma.homepageSection.create({
      data: {
        type: dto.type as any,
        enabled: dto.enabled ?? true,
        position: dto.position,
        title: dto.title,
        config_json: dto.config_json,
      },
    });
  }

  async update(id: string, dto: UpdateHomepageSectionDto) {
    const existing = await this.prisma.homepageSection.findUnique({ where: { id } });
    if (!existing) throw new BadRequestException('Section not found');

    const mergedConfig = {
      ...(existing.config_json as Record<string, any>),
      ...(dto.config_json || {}),
    };
    this.validateConfig(existing.type as HomepageSectionType, mergedConfig);

    return this.prisma.homepageSection.update({
      where: { id },
      data: {
        enabled: dto.enabled,
        position: dto.position,
        title: dto.title,
        config_json: dto.config_json ? mergedConfig : undefined,
      },
    });
  }

  async reorder(dto: ReorderHomepageSectionsDto) {
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.homepageSection.update({
          where: { id: item.id },
          data: { position: item.position },
        }),
      ),
    );

    return this.getAdminSections();
  }

  async remove(id: string) {
    await this.prisma.homepageSection.delete({ where: { id } });
    return { success: true };
  }
}
