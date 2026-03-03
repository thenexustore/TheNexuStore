import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import {
  DEFAULT_HOMEPAGE_SECTIONS,
  HomepageSectionType,
} from './homepage-section.types';
import {
  CreateHomepageSectionDto,
  HomepageQuerySortBy,
  HomepageQueryType,
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

    const source = config.source || 'query';
    if (!['manual', 'query'].includes(source)) {
      throw new BadRequestException('config_json.source must be manual or query');
    }

    const limit = config.limit ?? config?.query?.limit;
    if (limit !== undefined && (typeof limit !== 'number' || limit < 1 || limit > 24)) {
      throw new BadRequestException('limit must be a number between 1 and 24');
    }

    if (source === 'manual' && !Array.isArray(config.ids)) {
      throw new BadRequestException('manual source requires config_json.ids array');
    }

    if (source === 'query') {
      const query = config.query;
      if (query && typeof query === 'object') {
        if (![HomepageQueryType.PRODUCTS, HomepageQueryType.CATEGORIES, HomepageQueryType.BRANDS].includes(query.type)) {
          throw new BadRequestException('query.type must be products, categories or brands');
        }

        if (query.type !== HomepageQueryType.PRODUCTS && (query.categoryId || query.brandId || query.priceMin !== undefined || query.priceMax !== undefined)) {
          throw new BadRequestException('category/brand/price filters are valid only for products query');
        }

        if (query.sortBy && ![HomepageQuerySortBy.NEWEST, HomepageQuerySortBy.PRICE_ASC, HomepageQuerySortBy.PRICE_DESC, HomepageQuerySortBy.DISCOUNT_DESC].includes(query.sortBy)) {
          throw new BadRequestException('Invalid query.sortBy');
        }

        if (
          query.priceMin !== undefined &&
          query.priceMax !== undefined &&
          Number(query.priceMin) > Number(query.priceMax)
        ) {
          throw new BadRequestException('query.priceMin cannot be greater than query.priceMax');
        }
      }
    }

    if (type === HomepageSectionType.TRUST_BAR && !Array.isArray(config.items)) {
      throw new BadRequestException('TRUST_BAR config_json.items must be an array');
    }
  }


  private normalizeConfigBySectionType(
    type: HomepageSectionType,
    config: Record<string, any>,
  ): Record<string, any> {
    const next = { ...config };
    if ((next.source || 'query') !== 'query') return next;

    const query = { ...(next.query || {}) };

    if (!query.type) {
      if (type === HomepageSectionType.TOP_CATEGORIES_GRID) {
        query.type = HomepageQueryType.CATEGORIES;
      } else if (type === HomepageSectionType.BRANDS_STRIP) {
        query.type = HomepageQueryType.BRANDS;
      } else {
        query.type = HomepageQueryType.PRODUCTS;
      }
    }

    if (!query.limit && next.limit) {
      query.limit = next.limit;
    }

    next.query = query;
    next.source = 'query';
    return next;
  }

  private shouldBackfillLegacyConfig(
    type: HomepageSectionType,
    config: Record<string, any>,
  ) {
    if (type === HomepageSectionType.FEATURED_PICKS) {
      return (config.source || 'query') === 'manual' && Array.isArray(config.ids) && config.ids.length === 0;
    }

    if (type === HomepageSectionType.TOP_CATEGORIES_GRID || type === HomepageSectionType.BRANDS_STRIP) {
      return !config.source || !config.query;
    }

    if (
      type === HomepageSectionType.BEST_DEALS ||
      type === HomepageSectionType.NEW_ARRIVALS
    ) {
      return !config.query;
    }

    return false;
  }

  async ensureDefaultSections() {
    for (const section of DEFAULT_HOMEPAGE_SECTIONS) {
      const existing = await this.prisma.homepageSection.findUnique({
        where: { type: section.type as any },
      });

      if (!existing) {
        await this.prisma.homepageSection.create({
          data: {
            type: section.type as any,
            enabled: true,
            position: section.position,
            title: section.title,
            config_json: section.config_json,
          },
        });
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

  private async executeProductsQuery(config: Record<string, any>, sectionType: HomepageSectionType) {
    const query = config.query || {};
    const categoryId = query.categoryId;
    const brandId = query.brandId;

    const [category, brand] = await Promise.all([
      categoryId
        ? this.prisma.category.findUnique({ where: { id: categoryId }, select: { slug: true } })
        : Promise.resolve(null),
      brandId
        ? this.prisma.brand.findUnique({ where: { id: brandId }, select: { slug: true } })
        : Promise.resolve(null),
    ]);

    const sortByMap: Record<string, ProductSortBy> = {
      [HomepageQuerySortBy.NEWEST]: ProductSortBy.NEWEST,
      [HomepageQuerySortBy.PRICE_ASC]: ProductSortBy.PRICE_LOW_TO_HIGH,
      [HomepageQuerySortBy.PRICE_DESC]: ProductSortBy.PRICE_HIGH_TO_LOW,
    };

    const selectedSort = query.sortBy || config.sort_by || ProductSortBy.NEWEST;

    if (
      selectedSort === HomepageQuerySortBy.DISCOUNT_DESC &&
      !category?.slug &&
      !brand?.slug &&
      query.priceMin === undefined &&
      query.priceMax === undefined
    ) {
      return this.productsService.getDealsProducts(query.limit || config.limit || 12, query.inStockOnly ?? true);
    }

    const result = await this.productsService.getProducts({
      page: 1,
      limit: query.limit || config.limit || 12,
      categories: category?.slug ? [category.slug] : undefined,
      brand: brand?.slug || undefined,
      min_price: query.priceMin,
      max_price: query.priceMax,
      in_stock_only: query.inStockOnly ?? true,
      sort_by:
        sectionType === HomepageSectionType.NEW_ARRIVALS
          ? ProductSortBy.NEWEST
          : sortByMap[selectedSort] || ProductSortBy.NEWEST,
      featured_only: sectionType === HomepageSectionType.FEATURED_PICKS,
    });

    if (selectedSort === HomepageQuerySortBy.DISCOUNT_DESC) {
      return [...result.products].sort(
        (a: any, b: any) =>
          Number(b.discount_percentage || b.discount_pct || 0) - Number(a.discount_percentage || a.discount_pct || 0),
      );
    }

    return result.products;
  }

  private async resolveSectionData(type: HomepageSectionType, config: Record<string, any>) {
    const source = config.source || 'query';

    switch (type) {
      case HomepageSectionType.HERO_BANNER_SLIDER:
        return this.bannersService.findAll();
      case HomepageSectionType.BEST_DEALS:
        if (source === 'query' && config.query?.type === HomepageQueryType.PRODUCTS) {
          return this.executeProductsQuery(config, type);
        }
        return this.productsService.getDealsProducts(config.limit || 12, true);
      case HomepageSectionType.NEW_ARRIVALS:
      case HomepageSectionType.FEATURED_PICKS:
        if (source === 'manual') {
          return this.getManualProducts(config.ids || []);
        }
        return this.executeProductsQuery(config, type);
      case HomepageSectionType.TOP_CATEGORIES_GRID:
        if (source === 'manual') {
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
          take: config.query?.limit || config.limit || 10,
        });
      case HomepageSectionType.BRANDS_STRIP:
        if (source === 'manual') {
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
          take: config.query?.limit || config.limit || 12,
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
    const target = query.target ||
      (query.type === HomepageSectionType.BRANDS_STRIP
        ? 'brands'
        : query.type === HomepageSectionType.TOP_CATEGORIES_GRID
          ? 'categories'
          : 'products');

    if (target === 'products') {
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

    if (target === 'categories') {
      const res = await this.prisma.category.findMany({
        where: { is_active: true, name: { contains: q, mode: 'insensitive' } },
        select: { id: true, name: true, slug: true },
        take: limit,
        orderBy: { sort_order: 'asc' },
      });
      return res.map((x) => ({ id: x.id, label: x.name, subtitle: x.slug }));
    }

    if (target === 'brands') {
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
    const normalizedConfig = this.normalizeConfigBySectionType(
      dto.type,
      dto.config_json as Record<string, any>,
    );
    this.validateConfig(dto.type, normalizedConfig);
    return this.prisma.homepageSection.create({
      data: {
        type: dto.type as any,
        enabled: dto.enabled ?? true,
        position: dto.position,
        title: dto.title,
        config_json: normalizedConfig as any,
      },
    });
  }

  async update(id: string, dto: UpdateHomepageSectionDto) {
    const existing = await this.prisma.homepageSection.findUnique({ where: { id } });
    if (!existing) throw new BadRequestException('Section not found');

    const mergedConfig = this.normalizeConfigBySectionType(
      existing.type as HomepageSectionType,
      {
        ...(existing.config_json as Record<string, any>),
        ...(dto.config_json || {}),
      },
    );
    this.validateConfig(existing.type as HomepageSectionType, mergedConfig);

    return this.prisma.homepageSection.update({
      where: { id },
      data: {
        enabled: dto.enabled,
        position: dto.position,
        title: dto.title,
        config_json: dto.config_json ? (mergedConfig as any) : undefined,
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
