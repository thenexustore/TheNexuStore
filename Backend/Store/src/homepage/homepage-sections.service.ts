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

  private validateConfig(
    type: HomepageSectionType,
    config: Record<string, any>,
  ) {
    if (!config || typeof config !== 'object') {
      throw new BadRequestException('config_json must be an object');
    }

    if (type === HomepageSectionType.NEWSLETTER) {
      if (!String(config.title || '').trim()) {
        throw new BadRequestException(
          'NEWSLETTER config_json.title must be a non-empty string',
        );
      }
      return;
    }

    const source = config.source || 'query';
    if (!['manual', 'query'].includes(source)) {
      throw new BadRequestException(
        'config_json.source must be manual or query',
      );
    }

    const limit = config.limit ?? config?.query?.limit;
    if (
      limit !== undefined &&
      (typeof limit !== 'number' || limit < 1 || limit > 24)
    ) {
      throw new BadRequestException('limit must be a number between 1 and 24');
    }

    if (source === 'manual' && !Array.isArray(config.ids)) {
      throw new BadRequestException(
        'manual source requires config_json.ids array',
      );
    }

    if (source === 'query') {
      const query = config.query;
      if (query && typeof query === 'object') {
        if (
          ![
            HomepageQueryType.PRODUCTS,
            HomepageQueryType.CATEGORIES,
            HomepageQueryType.BRANDS,
          ].includes(query.type)
        ) {
          throw new BadRequestException(
            'query.type must be products, categories or brands',
          );
        }

        if (
          query.type !== HomepageQueryType.PRODUCTS &&
          (query.categoryId ||
            query.brandId ||
            query.priceMin !== undefined ||
            query.priceMax !== undefined)
        ) {
          throw new BadRequestException(
            'category/brand/price filters are valid only for products query',
          );
        }

        if (
          query.sortBy &&
          ![
            HomepageQuerySortBy.NEWEST,
            HomepageQuerySortBy.PRICE_ASC,
            HomepageQuerySortBy.PRICE_DESC,
            HomepageQuerySortBy.DISCOUNT_DESC,
          ].includes(query.sortBy)
        ) {
          throw new BadRequestException('Invalid query.sortBy');
        }

        if (
          query.priceMin !== undefined &&
          query.priceMax !== undefined &&
          Number(query.priceMin) > Number(query.priceMax)
        ) {
          throw new BadRequestException(
            'query.priceMin cannot be greater than query.priceMax',
          );
        }
      }
    }

    if (type === HomepageSectionType.TRUST_BAR) {
      if (!Array.isArray(config.items)) {
        throw new BadRequestException(
          'TRUST_BAR config_json.items must be an array',
        );
      }

      const hasInvalidItems = config.items.some((item: unknown) => {
        if (!item || typeof item !== 'object') return true;
        return !String((item as any).text || '').trim();
      });

      if (hasInvalidItems) {
        throw new BadRequestException(
          'TRUST_BAR items must include non-empty text',
        );
      }

      if (config.items.length > 6) {
        throw new BadRequestException('TRUST_BAR supports up to 6 items');
      }
    }
  }

  private normalizeConfigBySectionType(
    type: HomepageSectionType,
    config: Record<string, any>,
  ): Record<string, any> {
    const next = { ...config };

    if (type === HomepageSectionType.TRUST_BAR) {
      return {
        ...next,
        items: this.normalizeTrustBarItems(next.items),
      };
    }

    if (type === HomepageSectionType.NEWSLETTER) {
      return {
        title: String(next.title || 'Suscríbete a nuestra newsletter').trim(),
        subtitle: String(
          next.subtitle ||
            'Recibe ofertas, novedades y lanzamientos antes que nadie.',
        ).trim(),
        placeholder: String(next.placeholder || 'Tu email').trim(),
        button_text: String(next.button_text || 'Suscribirme').trim(),
        button_link: String(next.button_link || '/register').trim(),
      };
    }

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

  private normalizeTrustBarItems(items: unknown) {
    const raw = Array.isArray(items) ? items : [];
    return raw
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const icon = String(item.icon || 'shield').trim();
        const text = String(item.text || '').trim();
        if (!text) return null;
        return { icon: icon || 'shield', text };
      })
      .filter((item): item is { icon: string; text: string } => Boolean(item))
      .slice(0, 6);
  }

  private clampNumber(
    value: unknown,
    min: number,
    max: number,
    fallback: number,
  ) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(max, Math.max(min, Math.round(numeric)));
  }

  private getSectionConfigIssues(section: {
    id: string;
    type: string;
    enabled: boolean;
    title: string | null;
    config_json: unknown;
  }) {
    const config = ((section.config_json || {}) as Record<string, any>) || {};
    const issues: string[] = [];

    if (section.enabled && !String(section.title || '').trim()) {
      issues.push('La sección está visible pero no tiene título.');
    }

    if (section.type === HomepageSectionType.TRUST_BAR) {
      const items = Array.isArray(config.items) ? config.items : [];
      if (!items.length) {
        issues.push('TRUST_BAR debe incluir al menos 1 item.');
      }
      if (items.length > 6) {
        issues.push('TRUST_BAR admite un máximo de 6 items.');
      }
      const invalidItem = items.find(
        (item) =>
          !item || typeof item !== 'object' || !String(item.text || '').trim(),
      );
      if (invalidItem) {
        issues.push('Todos los items de TRUST_BAR deben tener texto.');
      }
    }

    if (section.type === HomepageSectionType.NEWSLETTER) {
      if (!String(config.title || '').trim()) {
        issues.push('NEWSLETTER debe incluir título.');
      }
      if (!String(config.button_text || '').trim()) {
        issues.push('NEWSLETTER debe incluir texto de CTA.');
      }
      return issues;
    }

    const source = config.source || 'query';
    if (!['query', 'manual'].includes(source)) {
      issues.push('config_json.source debe ser "query" o "manual".');
    }

    if (source === 'manual' && !Array.isArray(config.ids)) {
      issues.push('Modo manual requiere config_json.ids como array.');
    }

    if (source === 'query') {
      const query = (config.query || {}) as Record<string, any>;
      const limit = query.limit ?? config.limit;
      if (
        limit !== undefined &&
        (typeof limit !== 'number' || limit < 1 || limit > 24)
      ) {
        issues.push('query.limit debe estar entre 1 y 24.');
      }

      if (
        [
          HomepageSectionType.PRODUCT_CAROUSEL,
          HomepageSectionType.BEST_DEALS,
          HomepageSectionType.NEW_ARRIVALS,
          HomepageSectionType.FEATURED_PICKS,
        ].includes(section.type as HomepageSectionType)
      ) {
        if (query.type && query.type !== HomepageQueryType.PRODUCTS) {
          issues.push(
            'Las secciones de productos deben usar query.type="products".',
          );
        }

        if (
          config.carousel_interval_ms !== undefined &&
          (typeof config.carousel_interval_ms !== 'number' ||
            config.carousel_interval_ms < 2000)
        ) {
          issues.push('carousel_interval_ms debe ser >= 2000 ms.');
        }

        if (
          config.carousel_items_desktop !== undefined &&
          (typeof config.carousel_items_desktop !== 'number' ||
            config.carousel_items_desktop < 2 ||
            config.carousel_items_desktop > 6)
        ) {
          issues.push('carousel_items_desktop debe estar entre 2 y 6.');
        }

        if (
          config.carousel_items_mobile !== undefined &&
          (typeof config.carousel_items_mobile !== 'number' ||
            config.carousel_items_mobile < 1 ||
            config.carousel_items_mobile > 3)
        ) {
          issues.push('carousel_items_mobile debe estar entre 1 y 3.');
        }
      }
    }

    return issues;
  }

  private normalizeProductCarouselConfig(
    type: HomepageSectionType,
    config: Record<string, any>,
  ) {
    if (
      ![
        HomepageSectionType.PRODUCT_CAROUSEL,
        HomepageSectionType.BEST_DEALS,
        HomepageSectionType.NEW_ARRIVALS,
        HomepageSectionType.FEATURED_PICKS,
      ].includes(type)
    ) {
      return config;
    }

    const next: Record<string, any> = {
      ...config,
      carousel_enabled: Boolean(config.carousel_enabled ?? true),
      carousel_autoplay: Boolean(config.carousel_autoplay ?? true),
      carousel_interval_ms: this.clampNumber(
        config.carousel_interval_ms,
        2000,
        15000,
        4500,
      ),
      carousel_items_desktop: this.clampNumber(
        config.carousel_items_desktop,
        2,
        6,
        4,
      ),
      carousel_items_mobile: this.clampNumber(
        config.carousel_items_mobile,
        1,
        3,
        2,
      ),
    };

    if (
      type === HomepageSectionType.FEATURED_PICKS &&
      (next.source || 'query') === 'query'
    ) {
      next.query = {
        ...(next.query || {}),
        featuredOnly: next.query?.featuredOnly ?? next.featured_only ?? true,
      };
      next.featured_only = next.query.featuredOnly;
    }

    return next;
  }

  private shouldBackfillLegacyConfig(
    type: HomepageSectionType,
    config: Record<string, any>,
  ) {
    if (type === HomepageSectionType.FEATURED_PICKS) {
      return (
        (config.source || 'query') === 'manual' &&
        Array.isArray(config.ids) &&
        config.ids.length === 0
      );
    }

    if (
      type === HomepageSectionType.TOP_CATEGORIES_GRID ||
      type === HomepageSectionType.BRANDS_STRIP
    ) {
      return !config.source || !config.query;
    }

    if (
      type === HomepageSectionType.PRODUCT_CAROUSEL ||
      type === HomepageSectionType.BEST_DEALS ||
      type === HomepageSectionType.NEW_ARRIVALS
    ) {
      return !config.query;
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

    const sectionByType = new Map(
      existingSections.map((section) => [section.type, section]),
    );

    let nextPosition = existingSections.length
      ? Math.max(...existingSections.map((item) => item.position || 0))
      : 0;

    for (const section of DEFAULT_HOMEPAGE_SECTIONS) {
      const existing = sectionByType.get(section.type as any);

      if (!existing) {
        nextPosition += 1;
        const created = await this.prisma.homepageSection.create({
          data: {
            type: section.type as any,
            enabled: true,
            position: nextPosition,
            title: section.title,
            config_json: section.config_json,
          },
        });
        sectionByType.set(section.type as any, created);
        continue;
      }

      const existingConfig = (existing.config_json || {}) as Record<
        string,
        any
      >;
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
    return this.prisma.homepageSection.findMany({
      orderBy: { position: 'asc' },
    });
  }

  private isProductSectionType(type: string) {
    return [
      HomepageSectionType.PRODUCT_CAROUSEL,
      HomepageSectionType.BEST_DEALS,
      HomepageSectionType.NEW_ARRIVALS,
      HomepageSectionType.FEATURED_PICKS,
    ].includes(type as HomepageSectionType);
  }

  async getAdminDiagnostics() {
    await this.ensureDefaultSections();

    const sections = await this.prisma.homepageSection.findMany({
      orderBy: { position: 'asc' },
    });

    const total = sections.length;
    const enabled = sections.filter((section) => section.enabled).length;
    const disabled = total - enabled;

    const byType = new Map<string, number>();
    for (const section of sections) {
      byType.set(section.type, (byType.get(section.type) || 0) + 1);
    }

    const duplicatedTypes = Array.from(byType.entries())
      .filter(([, count]) => count > 1)
      .map(([type, count]) => ({ type, count }));

    const publicSections = await this.getPublicSections();
    const failedPublicSections = publicSections.filter(
      (section) => (section as any).failed === true,
    ).length;
    const emptyPublicSections = publicSections.filter((section) => {
      const data = (section as any).data;
      return Array.isArray(data) ? data.length === 0 : !data;
    }).length;

    const activeBanners = await this.prisma.banner.count({
      where: { is_active: true },
    });
    const activeFeaturedProducts = await this.prisma.featuredProduct.count({
      where: { is_active: true },
    });
    const [totalBrands, brandsWithLogo] = await Promise.all([
      this.prisma.brand.count({ where: { is_active: true } }),
      this.prisma.brand.count({
        where: { is_active: true, NOT: [{ logo_url: null }, { logo_url: '' }] },
      }),
    ]);
    const brandsMissingLogo = totalBrands - brandsWithLogo;

    const heroSections = sections.filter(
      (section) => section.type === HomepageSectionType.HERO_BANNER_SLIDER,
    );
    const heroEnabledSections = heroSections.filter(
      (section) => section.enabled,
    ).length;

    const featuredPicksSections = sections.filter((section) =>
      [
        HomepageSectionType.PRODUCT_CAROUSEL,
        HomepageSectionType.FEATURED_PICKS,
      ].includes(section.type as HomepageSectionType),
    );
    const featuredManualLinked = featuredPicksSections.some((section) => {
      const config = (section.config_json || {}) as Record<string, any>;
      const query = (config.query || {}) as Record<string, any>;
      return (
        section.enabled &&
        (config.source === 'manual' ||
          Array.isArray(config.ids) ||
          query.featuredOnly === true ||
          config.featured_only === true)
      );
    });

    const invalidConfigSections = sections
      .map((section) => ({
        id: section.id,
        type: section.type,
        title: section.title,
        issues: this.getSectionConfigIssues(section),
      }))
      .filter((section) => section.issues.length > 0);

    const productSectionTypes = new Set([
      HomepageSectionType.PRODUCT_CAROUSEL,
      HomepageSectionType.BEST_DEALS,
      HomepageSectionType.NEW_ARRIVALS,
      HomepageSectionType.FEATURED_PICKS,
    ]);

    const emptyEnabledProductSections = publicSections
      .filter((section) => productSectionTypes.has((section as any).type))
      .filter(
        (section) =>
          Array.isArray((section as any).data) &&
          (section as any).data.length === 0,
      )
      .map((section) => ({
        id: (section as any).id,
        type: (section as any).type,
        title: (section as any).title,
      }));

    const productSectionsPublic = publicSections.filter((section: any) =>
      this.isProductSectionType(section.type),
    );
    const sectionSkus = productSectionsPublic.map((section: any) => ({
      id: section.id,
      title: section.title,
      type: section.type,
      skus: new Set(
        (Array.isArray(section.data) ? section.data : []).map((p: any) =>
          String(p.id),
        ),
      ),
    }));

    const overlaps: Array<{
      aId: string;
      aTitle?: string;
      bId: string;
      bTitle?: string;
      overlapPct: number;
      shared: number;
    }> = [];
    for (let i = 0; i < sectionSkus.length; i++) {
      for (let j = i + 1; j < sectionSkus.length; j++) {
        const a = sectionSkus[i];
        const b = sectionSkus[j];
        if (!a.skus.size || !b.skus.size) continue;
        let shared = 0;
        for (const id of a.skus) if (b.skus.has(id)) shared++;
        const overlapPct = Math.round(
          (shared / Math.max(1, Math.min(a.skus.size, b.skus.size))) * 100,
        );
        if (overlapPct >= 70) {
          overlaps.push({
            aId: a.id,
            aTitle: a.title || a.type,
            bId: b.id,
            bTitle: b.title || b.type,
            overlapPct,
            shared,
          });
        }
      }
    }

    const hasEnabledProductCarousel = sections.some(
      (section) => section.enabled && this.isProductSectionType(section.type),
    );

    const missingVisibleTypes: HomepageSectionType[] = [];
    if (!heroEnabledSections) {
      missingVisibleTypes.push(HomepageSectionType.HERO_BANNER_SLIDER);
    }
    if (!hasEnabledProductCarousel) {
      missingVisibleTypes.push(HomepageSectionType.PRODUCT_CAROUSEL);
    }
    if (
      !sections.some(
        (section) =>
          section.type === HomepageSectionType.BRANDS_STRIP && section.enabled,
      )
    ) {
      missingVisibleTypes.push(HomepageSectionType.BRANDS_STRIP);
    }
    if (
      !sections.some(
        (section) =>
          section.type === HomepageSectionType.TRUST_BAR && section.enabled,
      )
    ) {
      missingVisibleTypes.push(HomepageSectionType.TRUST_BAR);
    }

    const healthDeductions = [
      Math.min(30, emptyEnabledProductSections.length * 12),
      Math.min(20, invalidConfigSections.length * 8),
      Math.min(15, overlaps.length * 8),
      Math.min(
        15,
        Math.round((brandsMissingLogo / Math.max(1, totalBrands)) * 15),
      ),
      Math.min(20, missingVisibleTypes.length * 7),
    ].reduce((a, b) => a + b, 0);
    const healthScore = Math.max(0, 100 - healthDeductions);

    return {
      totals: {
        total,
        enabled,
        disabled,
        duplicatedTypes: duplicatedTypes.length,
        failedPublicSections,
        emptyPublicSections,
        activeBanners,
        heroSections: heroSections.length,
        heroEnabledSections,
        activeFeaturedProducts,
        featuredPicksSections: featuredPicksSections.length,
        invalidConfigSections: invalidConfigSections.length,
        totalBrands,
        brandsWithLogo,
        brandsMissingLogo,
        emptyEnabledProductSections: emptyEnabledProductSections.length,
      },
      duplicatedTypes,
      invalidConfigSections,
      emptyEnabledProductSections,
      checks: {
        hasVisibleSections: enabled > 0,
        storePayloadOk: failedPublicSections === 0,
        bannersLinkedToHome: activeBanners === 0 || heroEnabledSections > 0,
        featuredLinkedToHome:
          activeFeaturedProducts === 0 || featuredManualLinked,
        configsValid: invalidConfigSections.length === 0,
        brandLogosHealthy: totalBrands === 0 || brandsMissingLogo === 0,
        productSectionsHaveData: emptyEnabledProductSections.length === 0,
      },
      overlapWarnings: overlaps,
      missingVisibleTypes,
      healthScore,
      publishReadiness:
        healthScore >= 75 &&
        failedPublicSections === 0 &&
        invalidConfigSections.length === 0,
    };
  }

  async getSectionPreview(sectionId: string) {
    const section = await this.prisma.homepageSection.findUnique({
      where: { id: sectionId },
    });
    if (!section) throw new BadRequestException('Section not found');

    const config = (section.config_json || {}) as Record<string, any>;
    const data = await this.resolveSectionData(
      section.type as HomepageSectionType,
      config,
    );

    if (!this.isProductSectionType(section.type)) {
      return {
        sectionId: section.id,
        type: section.type,
        title: section.title,
        previewCount: Array.isArray(data) ? data.length : 0,
        sampleItems: Array.isArray(data) ? data.slice(0, 5) : [],
      };
    }

    const products = Array.isArray(data) ? data : [];
    const inStockCount = products.filter(
      (p: any) =>
        Number(p.stock_quantity || 0) > 0 || p.stock_status === 'IN_STOCK',
    ).length;
    const withDiscountCount = products.filter(
      (p: any) => Number(p.discount_percentage || p.discount_pct || 0) > 0,
    ).length;

    const brandsMap = new Map<string, number>();
    for (const p of products) {
      const key = String(p.brand_name || '').trim();
      if (!key) continue;
      brandsMap.set(key, (brandsMap.get(key) || 0) + 1);
    }
    const topBrands = Array.from(brandsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return {
      sectionId: section.id,
      type: section.type,
      title: section.title,
      previewCount: products.length,
      inStockCount,
      withDiscountCount,
      topBrands,
      sampleProducts: products.slice(0, 4),
    };
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
        media: {
          where: { sku_id: null },
          orderBy: { sort_order: 'asc' },
          take: 1,
        },
        skus: {
          include: { prices: true, inventory: true },
          orderBy: { created_at: 'asc' },
          take: 3,
        },
      },
    });

    const order = new Map(ids.map((id, index) => [id, index]));

    return products
      .sort(
        (a, b) =>
          Number(order.get(a.id) ?? 10_000) - Number(order.get(b.id) ?? 10_000),
      )
      .map((p) => {
        const sku =
          p.skus.find((candidate) => (candidate.prices || []).length > 0) ||
          p.skus[0];
        const price = sku?.prices?.[0];
        const priceValue = Number(price?.sale_price || 0);
        const compareAt = price?.compare_at_price
          ? Number(price.compare_at_price)
          : undefined;
        const stockQty = Number(sku?.inventory?.[0]?.qty_on_hand || 0);
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
          stock_quantity: stockQty,
          stock_status: stockQty > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
          thumbnail: p.media[0]?.url || '/No_Image_Available.png',
          rating_count: p.rating_count,
          is_featured: false,
        };
      })
      .filter(Boolean);
  }

  private async executeProductsQuery(
    config: Record<string, any>,
    sectionType: HomepageSectionType,
  ) {
    const query = config.query || {};
    const categoryId = query.categoryId;
    const brandId = query.brandId;

    const [category, brand] = await Promise.all([
      categoryId
        ? this.prisma.category.findUnique({
            where: { id: categoryId },
            select: { slug: true },
          })
        : Promise.resolve(null),
      brandId
        ? this.prisma.brand.findUnique({
            where: { id: brandId },
            select: { slug: true },
          })
        : Promise.resolve(null),
    ]);

    const sortByMap: Record<string, ProductSortBy> = {
      [HomepageQuerySortBy.NEWEST]: ProductSortBy.NEWEST,
      [HomepageQuerySortBy.PRICE_ASC]: ProductSortBy.PRICE_LOW_TO_HIGH,
      [HomepageQuerySortBy.PRICE_DESC]: ProductSortBy.PRICE_HIGH_TO_LOW,
    };

    const featuredOnly =
      sectionType === HomepageSectionType.FEATURED_PICKS
        ? Boolean(query.featuredOnly ?? config.featured_only ?? true)
        : Boolean(query.featuredOnly ?? config.featured_only ?? false);
    const selectedSort = query.sortBy || config.sort_by || ProductSortBy.NEWEST;

    if (
      selectedSort === HomepageQuerySortBy.DISCOUNT_DESC &&
      !category?.slug &&
      !brand?.slug &&
      query.priceMin === undefined &&
      query.priceMax === undefined
    ) {
      const deals = await this.productsService.getDealsProducts(
        query.limit || config.limit || 12,
        query.inStockOnly ?? true,
      );
      if (deals.length || !(query.inStockOnly ?? true)) return deals;
      return this.productsService.getDealsProducts(
        query.limit || config.limit || 12,
        false,
      );
    }

    const baseRequest = {
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
      featured_only: featuredOnly,
    };

    const result = await this.productsService.getProducts(baseRequest);

    if (!result.products.length && (query.inStockOnly ?? true)) {
      const relaxed = await this.productsService.getProducts({
        ...baseRequest,
        in_stock_only: false,
      });

      if (relaxed.products.length) {
        if (selectedSort === HomepageQuerySortBy.DISCOUNT_DESC) {
          return [...relaxed.products].sort(
            (a: any, b: any) =>
              Number(b.discount_percentage || b.discount_pct || 0) -
              Number(a.discount_percentage || a.discount_pct || 0),
          );
        }
        return relaxed.products;
      }
    }

    if (!result.products.length && featuredOnly) {
      const withoutFeaturedConstraint = await this.productsService.getProducts({
        ...baseRequest,
        in_stock_only: false,
        featured_only: false,
      });

      if (withoutFeaturedConstraint.products.length) {
        if (selectedSort === HomepageQuerySortBy.DISCOUNT_DESC) {
          return [...withoutFeaturedConstraint.products].sort(
            (a: any, b: any) =>
              Number(b.discount_percentage || b.discount_pct || 0) -
              Number(a.discount_percentage || a.discount_pct || 0),
          );
        }
        return withoutFeaturedConstraint.products;
      }
    }

    if (
      !result.products.length &&
      (category?.slug ||
        brand?.slug ||
        query.priceMin !== undefined ||
        query.priceMax !== undefined)
    ) {
      const broadFallback = await this.productsService.getProducts({
        ...baseRequest,
        categories: undefined,
        brand: undefined,
        min_price: undefined,
        max_price: undefined,
        in_stock_only: false,
        featured_only: false,
      });

      if (broadFallback.products.length) {
        if (selectedSort === HomepageQuerySortBy.DISCOUNT_DESC) {
          return [...broadFallback.products].sort(
            (a: any, b: any) =>
              Number(b.discount_percentage || b.discount_pct || 0) -
              Number(a.discount_percentage || a.discount_pct || 0),
          );
        }
        return broadFallback.products;
      }
    }

    if (selectedSort === HomepageQuerySortBy.DISCOUNT_DESC) {
      return [...result.products].sort(
        (a: any, b: any) =>
          Number(b.discount_percentage || b.discount_pct || 0) -
          Number(a.discount_percentage || a.discount_pct || 0),
      );
    }

    return result.products;
  }

  private async resolveSectionData(
    type: HomepageSectionType,
    config: Record<string, any>,
  ) {
    const source = config.source || 'query';

    switch (type) {
      case HomepageSectionType.HERO_BANNER_SLIDER:
        return this.bannersService.findAll();
      case HomepageSectionType.BEST_DEALS:
        if (
          source === 'query' &&
          config.query?.type === HomepageQueryType.PRODUCTS
        ) {
          return this.executeProductsQuery(config, type);
        }
        {
          const deals = await this.productsService.getDealsProducts(
            config.limit || 12,
            true,
          );
          if (deals.length) return deals;
          return this.productsService.getDealsProducts(
            config.limit || 12,
            false,
          );
        }
      case HomepageSectionType.PRODUCT_CAROUSEL:
      case HomepageSectionType.NEW_ARRIVALS:
      case HomepageSectionType.FEATURED_PICKS:
        if (source === 'manual') {
          return this.getManualProducts(config.ids || []);
        }
        return this.executeProductsQuery(config, type);
      case HomepageSectionType.TOP_CATEGORIES_GRID:
        if (source === 'manual') {
          const ids = config.ids || [];
          const order = new Map(
            ids.map((id: string, index: number) => [id, index]),
          );
          const categories = await this.prisma.category.findMany({
            where: { id: { in: ids }, is_active: true },
            orderBy: { sort_order: 'asc' },
          });
          return categories.sort(
            (a, b) =>
              Number(order.get(a.id) ?? 10_000) -
              Number(order.get(b.id) ?? 10_000),
          );
        }
        return this.prisma.category.findMany({
          where: { is_active: true },
          orderBy: { sort_order: 'asc' },
          take: config.query?.limit || config.limit || 10,
        });
      case HomepageSectionType.BRANDS_STRIP:
        if (source === 'manual') {
          const ids = config.ids || [];
          const order = new Map(
            ids.map((id: string, index: number) => [id, index]),
          );
          const brands = await this.prisma.brand.findMany({
            where: { id: { in: ids }, is_active: true },
            orderBy: { name: 'asc' },
          });
          return brands.sort(
            (a, b) =>
              Number(order.get(a.id) ?? 10_000) -
              Number(order.get(b.id) ?? 10_000),
          );
        }
        return this.prisma.brand.findMany({
          where: { is_active: true },
          orderBy: { name: 'asc' },
          take: config.query?.limit || config.limit || 12,
        });
      case HomepageSectionType.TRUST_BAR:
        return config.items || [];
      case HomepageSectionType.NEWSLETTER:
        return {
          title: String(config.title || 'Suscríbete a nuestra newsletter'),
          subtitle: String(
            config.subtitle ||
              'Recibe ofertas, novedades y lanzamientos antes que nadie.',
          ),
          placeholder: String(config.placeholder || 'Tu email'),
          button_text: String(config.button_text || 'Suscribirme'),
          button_link: String(config.button_link || '/register'),
        };
      default:
        return [];
    }
  }

  async getOptions(query: HomepageSectionOptionsQueryDto) {
    const limit = query.limit || 10;
    const q = query.q || '';
    const target =
      query.target ||
      (query.type === HomepageSectionType.BRANDS_STRIP
        ? 'brands'
        : query.type === HomepageSectionType.TOP_CATEGORIES_GRID
          ? 'categories'
          : 'products');

    if (target === 'products') {
      const [category, brand] = await Promise.all([
        query.categoryId
          ? this.prisma.category.findUnique({
              where: { id: query.categoryId },
              select: { slug: true },
            })
          : Promise.resolve(null),
        query.brandId
          ? this.prisma.brand.findUnique({
              where: { id: query.brandId },
              select: { slug: true },
            })
          : Promise.resolve(null),
      ]);

      const sortByMap: Record<string, ProductSortBy> = {
        [HomepageQuerySortBy.NEWEST]: ProductSortBy.NEWEST,
        [HomepageQuerySortBy.PRICE_ASC]: ProductSortBy.PRICE_LOW_TO_HIGH,
        [HomepageQuerySortBy.PRICE_DESC]: ProductSortBy.PRICE_HIGH_TO_LOW,
      };

      const fallbackSort =
        query.type === HomepageSectionType.BEST_DEALS
          ? HomepageQuerySortBy.DISCOUNT_DESC
          : HomepageQuerySortBy.NEWEST;
      const selectedSort = query.sortBy || fallbackSort;
      const inStockOnly = query.inStockOnly !== 'false';
      const featuredOnly = query.featuredOnly === 'true';

      const result = await this.productsService.getProducts({
        page: 1,
        limit: Math.max(limit * 2, 24),
        search: q || undefined,
        categories: category?.slug ? [category.slug] : undefined,
        brand: brand?.slug || undefined,
        min_price: query.priceMin,
        max_price: query.priceMax,
        in_stock_only: inStockOnly,
        sort_by: sortByMap[selectedSort] || ProductSortBy.NEWEST,
        featured_only: featuredOnly,
      });

      let products = result.products || [];
      if (!products.length && inStockOnly) {
        const relaxed = await this.productsService.getProducts({
          page: 1,
          limit: Math.max(limit * 2, 24),
          search: q || undefined,
          categories: category?.slug ? [category.slug] : undefined,
          brand: brand?.slug || undefined,
          min_price: query.priceMin,
          max_price: query.priceMax,
          in_stock_only: false,
          sort_by: sortByMap[selectedSort] || ProductSortBy.NEWEST,
          featured_only: featuredOnly,
        });
        products = relaxed.products || [];
      }
      if (selectedSort === HomepageQuerySortBy.DISCOUNT_DESC) {
        products = [...products].sort(
          (a: any, b: any) =>
            Number(b.discount_percentage || b.discount_pct || 0) -
            Number(a.discount_percentage || a.discount_pct || 0),
        );
      }

      if (q) {
        const nq = q.toLowerCase();
        products = products.filter((item: any) =>
          String(item.title || '')
            .toLowerCase()
            .includes(nq),
        );
      }

      return products
        .slice(0, limit)
        .map((x: any) => ({ id: x.id, label: x.title, subtitle: x.slug }));
    }

    if (target === 'categories') {
      const res = await this.prisma.category.findMany({
        where: { is_active: true, name: { contains: q, mode: 'insensitive' } },
        select: { id: true, name: true, slug: true },
        take: Math.max(limit * 3, 30),
        orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
      });

      const seen = new Set<string>();
      const deduped = res.filter((item) => {
        const slug = String(item.slug || '')
          .trim()
          .toLowerCase();
        if (!slug) return true;
        if (seen.has(slug)) return false;
        seen.add(slug);
        return true;
      });

      return deduped.slice(0, limit).map((x) => ({
        id: x.id,
        label: x.name,
        subtitle: x.slug,
      }));
    }

    if (target === 'brands') {
      const res = await this.prisma.brand.findMany({
        where: { is_active: true, name: { contains: q, mode: 'insensitive' } },
        select: { id: true, name: true, slug: true, logo_url: true },
        take: Math.max(limit * 3, 30),
        orderBy: { name: 'asc' },
      });

      const seen = new Set<string>();
      const deduped = res.filter((item) => {
        const slug = String(item.slug || '')
          .trim()
          .toLowerCase();
        if (!slug) return true;
        if (seen.has(slug)) return false;
        seen.add(slug);
        return true;
      });

      return deduped.slice(0, limit).map((x) => ({
        id: x.id,
        label: x.name,
        subtitle: x.slug,
        image: x.logo_url || undefined,
      }));
    }

    return [];
  }

  async create(dto: CreateHomepageSectionDto) {
    const normalizedConfig = this.normalizeProductCarouselConfig(
      dto.type,
      this.normalizeConfigBySectionType(
        dto.type,
        dto.config_json as Record<string, any>,
      ),
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
    const existing = await this.prisma.homepageSection.findUnique({
      where: { id },
    });
    if (!existing) throw new BadRequestException('Section not found');

    const mergedConfig = this.normalizeProductCarouselConfig(
      existing.type as HomepageSectionType,
      this.normalizeConfigBySectionType(existing.type as HomepageSectionType, {
        ...(existing.config_json as Record<string, any>),
        ...(dto.config_json || {}),
      }),
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
