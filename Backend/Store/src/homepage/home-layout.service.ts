import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ProductsService } from '../user/products/products.service';
import { saveBase64Image } from '../common/image.util';
import {
  CreateItemDto,
  CreateLayoutDto,
  CreateSectionDto,
  MoveSectionDto,
  ReorderItemsDto,
  UpdateItemDto,
  UpdateLayoutDto,
  UpdateSectionDto,
} from './dto/home-layout.dto';
import { HomeSectionType } from './home-layout.types';

@Injectable()
export class HomeLayoutService {
  private readonly logger = new Logger(HomeLayoutService.name);
  private readonly ttlMs = 5 * 60 * 1000;
  private readonly homeCache = new Map<
    string,
    { expiresAt: number; value: any }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
  ) {}

  private invalidateCache() {
    this.homeCache.clear();
  }

  private clampLimit(value: unknown, fallback: number) {
    const n = Number(value ?? fallback);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(1, Math.min(24, Math.floor(n)));
  }

  private clampRange(
    value: unknown,
    min: number,
    max: number,
    fallback: number,
  ) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, Math.floor(numeric)));
  }

  private asBoolean(value: unknown, fallback: boolean) {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return fallback;
  }

  private categoryDemandKeywordScore(name: string, slug: string) {
    const text = `${name || ''} ${slug || ''}`.toLowerCase();
    const buckets: Array<{ terms: string[]; score: number }> = [
      { terms: ['portatil', 'portátil', 'laptop', 'notebook'], score: 70 },
      {
        terms: ['impresora', 'printer', 'multifuncion', 'multifunción'],
        score: 55,
      },
      { terms: ['monitor', 'pantalla'], score: 50 },
      { terms: ['tablet', 'ipad'], score: 45 },
      { terms: ['teclado', 'keyboard'], score: 35 },
      { terms: ['raton', 'ratón', 'mouse'], score: 35 },
      { terms: ['cartucho', 'toner', 'tóner', 'tinta'], score: 30 },
      { terms: ['disco', 'ssd', 'almacenamiento', 'memoria'], score: 28 },
      { terms: ['router', 'wifi', 'red'], score: 25 },
    ];

    return buckets.reduce((acc, bucket) => {
      return bucket.terms.some((term) => text.includes(term))
        ? acc + bucket.score
        : acc;
    }, 0);
  }

  private tokenizeCategoryText(...parts: Array<string | null | undefined>) {
    return parts
      .join(' ')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3);
  }

  private pickBestCategoryMedia(
    category: { id: string; name: string; slug: string },
    products: Array<{
      id: string;
      title: string | null;
      slug: string | null;
      media: Array<{ url: string }>;
    }>,
  ) {
    if (!products.length) return null;

    const categoryTokens = this.tokenizeCategoryText(
      category.name,
      category.slug,
    );
    const categoryTokenSet = new Set(categoryTokens);

    const ranked = products
      .map((product) => {
        const firstMedia = product.media?.[0]?.url || null;
        if (!firstMedia) return null;

        const productTokens = this.tokenizeCategoryText(
          product.title,
          product.slug,
        );
        const overlapCount = productTokens.reduce(
          (acc, token) => acc + (categoryTokenSet.has(token) ? 1 : 0),
          0,
        );

        return {
          url: firstMedia,
          overlapCount,
        };
      })
      .filter((entry): entry is { url: string; overlapCount: number } =>
        Boolean(entry),
      );

    if (!ranked.length) return null;

    ranked.sort((a, b) => b.overlapCount - a.overlapCount);

    return ranked[0]?.url || null;
  }

  private normalizeSectionConfig(
    type: HomeSectionType,
    config: Record<string, any>,
  ) {
    const next = { ...(config || {}) };

    if (type === HomeSectionType.HERO_CAROUSEL) {
      next.autoplay = this.asBoolean(next.autoplay, true);
      next.pause_on_hover = this.asBoolean(next.pause_on_hover, true);
      next.show_arrows = this.asBoolean(next.show_arrows, true);
      next.show_dots = this.asBoolean(next.show_dots, true);
      next.interval_ms = this.clampRange(next.interval_ms, 2500, 15000, 5000);
    }

    if (type === HomeSectionType.PRODUCT_CAROUSEL) {
      next.source = [
        'NEW_ARRIVALS',
        'BEST_DEALS',
        'FEATURED',
        'CATEGORY',
        'BRAND',
        'BEST_SELLERS',
      ].includes(String(next.source))
        ? String(next.source)
        : 'NEW_ARRIVALS';
      next.limit = this.clampLimit(next.limit, 12);
      next.inStockOnly = this.asBoolean(next.inStockOnly, true);
      next.mode = next.mode || 'rule';
      next.discount_only = this.asBoolean(next.discount_only, false);
      next.featured_only = this.asBoolean(next.featured_only, false);
      next.category_scope = [
        'parent_only',
        'children_only',
        'parent_and_descendants',
      ].includes(String(next.category_scope))
        ? String(next.category_scope)
        : 'parent_and_descendants';
      next.categoryId =
        String(next.categoryId || next.query?.categoryId || '').trim() || null;
      next.categoryIds = Array.isArray(next.categoryIds)
        ? next.categoryIds
            .map((x: any) => String(x || '').trim())
            .filter(Boolean)
        : String(next.categoryIds || '')
            .split(',')
            .map((x: string) => x.trim())
            .filter(Boolean);
      next.brandId =
        String(next.brandId || next.query?.brandId || '').trim() || null;
      next.brandIds = Array.isArray(next.brandIds)
        ? next.brandIds.map((x: any) => String(x || '').trim()).filter(Boolean)
        : String(next.brandIds || '')
            .split(',')
            .map((x: string) => x.trim())
            .filter(Boolean);
      next.sortBy = String(next.sortBy || next.query?.sortBy || 'newest');
      next.autoplay = this.asBoolean(next.autoplay, true);
      next.show_arrows = this.asBoolean(next.show_arrows, true);
      next.show_dots = this.asBoolean(next.show_dots, false);
      next.interval_ms = this.clampRange(next.interval_ms, 2000, 15000, 4500);
      next.items_mobile = this.clampRange(next.items_mobile, 1, 3, 2);
      next.items_desktop = this.clampRange(next.items_desktop, 2, 6, 4);
      next.view_all_href = String(next.view_all_href || '').trim() || null;
      next.view_all_label = String(next.view_all_label || '').trim() || null;
    }

    if (type === HomeSectionType.CATEGORY_STRIP) {
      next.limit = this.clampLimit(next.limit, 12);
      next.mode = next.mode || 'auto';
      next.items_mobile = this.clampRange(next.items_mobile, 2, 4, 2);
      next.items_desktop = this.clampRange(next.items_desktop, 2, 8, 6);
      next.show_names = this.asBoolean(next.show_names, true);
      next.show_top_badges = this.asBoolean(next.show_top_badges, false);
      next.image_fit = next.image_fit === 'cover' ? 'cover' : 'contain';
      next.card_style = next.card_style === 'elevated' ? 'elevated' : 'minimal';
      next.auto_strategy = ['demand', 'alphabetical', 'manual_sort'].includes(
        String(next.auto_strategy),
      )
        ? String(next.auto_strategy)
        : 'demand';
      next.cta_text = String(next.cta_text || 'Explorar').trim() || 'Explorar';
    }

    if (type === HomeSectionType.BRAND_STRIP) {
      next.limit = this.clampLimit(next.limit, 12);
      next.mode = next.mode || 'auto';
      next.autoplay = this.asBoolean(next.autoplay, true);
      next.interval_ms = this.clampRange(next.interval_ms, 2000, 15000, 4500);
      next.items_mobile = this.clampRange(next.items_mobile, 2, 4, 2);
      next.items_desktop = this.clampRange(next.items_desktop, 2, 8, 6);
    }

    if (
      type === HomeSectionType.VALUE_PROPS ||
      type === HomeSectionType.TRENDING_CHIPS
    ) {
      next.items = Array.isArray(next.items) ? next.items : [];
    }

    return next;
  }

  private toProductCard(p: any) {
    const sku = p.skus?.[0];
    const price = sku?.prices?.[0];
    const compare = price?.compare_at_price
      ? Number(price.compare_at_price)
      : undefined;
    const sale = Number(price?.sale_price || 0);

    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      brand_name: p.brand?.name || '',
      price: sale,
      compare_at_price: compare,
      discount_percentage:
        compare && compare > sale
          ? Math.round(((compare - sale) / compare) * 100)
          : 0,
      stock_quantity: sku?.inventory?.[0]?.qty_on_hand || 0,
      thumbnail: p.media?.[0]?.url || '/No_Image_Available.png',
    };
  }

  private async getActiveLayout(locale?: string) {
    const layout = await this.prisma.homePageLayout.findFirst({
      where: { is_active: true, locale: locale || null },
      orderBy: { updated_at: 'desc' },
    });

    if (layout) return layout;

    return this.prisma.homePageLayout.findFirst({
      where: { is_active: true },
      orderBy: { updated_at: 'desc' },
    });
  }

  async listLayouts() {
    return this.prisma.homePageLayout.findMany({
      orderBy: [{ is_active: 'desc' }, { updated_at: 'desc' }],
    });
  }

  async createLayout(dto: CreateLayoutDto) {
    return this.prisma.homePageLayout.create({
      data: { name: dto.name, locale: dto.locale || null, is_active: false },
    });
  }

  async updateLayout(id: string, dto: UpdateLayoutDto) {
    const existing = await this.prisma.homePageLayout.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Layout not found');

    if (dto.is_active) {
      await this.prisma.$transaction([
        this.prisma.homePageLayout.updateMany({
          where: { locale: dto.locale ?? existing.locale, is_active: true },
          data: { is_active: false },
        }),
        this.prisma.homePageLayout.update({
          where: { id },
          data: {
            ...dto,
            locale: dto.locale ?? existing.locale,
            is_active: true,
          },
        }),
      ]);
      this.invalidateCache();
      return this.prisma.homePageLayout.findUnique({ where: { id } });
    }

    const updated = await this.prisma.homePageLayout.update({
      where: { id },
      data: dto,
    });
    this.invalidateCache();
    return updated;
  }

  async cloneLayout(id: string) {
    const existing = await this.prisma.homePageLayout.findUnique({
      where: { id },
      include: {
        sections: { include: { items: true }, orderBy: { position: 'asc' } },
      },
    });
    if (!existing) throw new NotFoundException('Layout not found');

    const clone = await this.prisma.homePageLayout.create({
      data: {
        name: `${existing.name} (copy)`,
        locale: existing.locale,
        is_active: false,
      },
    });

    for (const section of existing.sections) {
      const newSection = await this.prisma.homePageSection.create({
        data: {
          layout_id: clone.id,
          type: section.type,
          title: section.title,
          subtitle: section.subtitle,
          position: section.position,
          is_enabled: section.is_enabled,
          variant: section.variant || undefined,
          config: (section.config ?? {}) as any,
        },
      });

      if (section.items.length) {
        await this.prisma.homePageSectionItem.createMany({
          data: section.items.map((item) => ({
            section_id: newSection.id,
            position: item.position,
            type: item.type,
            banner_id: item.banner_id,
            category_id: item.category_id,
            brand_id: item.brand_id,
            product_id: item.product_id,
            label: item.label,
            image_url: item.image_url,
            href: item.href,
            config: (item.config ?? undefined) as any,
          })),
        });
      }
    }

    this.invalidateCache();
    return clone;
  }

  async deleteLayout(id: string, force = false) {
    const layout = await this.prisma.homePageLayout.findUnique({
      where: { id },
    });
    if (!layout) throw new NotFoundException('Layout not found');
    if (layout.is_active && !force) {
      throw new BadRequestException(
        'Cannot delete active layout without force',
      );
    }
    await this.prisma.homePageLayout.delete({ where: { id } });
    this.invalidateCache();
    return { success: true };
  }

  private async reindexLayoutSections(layoutId: string) {
    const sections = await this.prisma.homePageSection.findMany({
      where: { layout_id: layoutId },
      orderBy: [{ position: 'asc' }, { created_at: 'asc' }],
      select: { id: true },
    });

    // Two-pass update to avoid unique-constraint (layout_id, position) conflicts:
    // Pass 1 — shift all positions to a safe range above any realistic value.
    const OFFSET = 1_000_000;
    await this.prisma.$transaction(
      sections.map((section, index) =>
        this.prisma.homePageSection.update({
          where: { id: section.id },
          data: { position: OFFSET + index + 1 },
        }),
      ),
    );
    // Pass 2 — assign the final sequential positions.
    await this.prisma.$transaction(
      sections.map((section, index) =>
        this.prisma.homePageSection.update({
          where: { id: section.id },
          data: { position: index + 1 },
        }),
      ),
    );
  }

  async listSections(layoutId: string) {
    return this.prisma.homePageSection.findMany({
      where: { layout_id: layoutId },
      orderBy: { position: 'asc' },
    });
  }

  async createSection(layoutId: string, dto: CreateSectionDto) {
    const config = this.normalizeSectionConfig(dto.type, dto.config || {});
    const maxPosition = await this.prisma.homePageSection.aggregate({
      where: { layout_id: layoutId },
      _max: { position: true },
    });

    const section = await this.prisma.homePageSection.create({
      data: {
        layout_id: layoutId,
        ...dto,
        config,
        position: (maxPosition._max.position || 0) + 1,
      },
    });
    await this.reindexLayoutSections(layoutId);
    this.invalidateCache();
    return section;
  }

  async updateSection(id: string, dto: UpdateSectionDto) {
    const existing = await this.prisma.homePageSection.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Section not found');

    const section = await this.prisma.homePageSection.update({
      where: { id },
      data: {
        ...dto,
        config: dto.config
          ? this.normalizeSectionConfig(
              existing.type as unknown as HomeSectionType,
              dto.config,
            )
          : undefined,
      },
    });
    this.invalidateCache();
    return section;
  }

  async moveSection(id: string, dto: MoveSectionDto) {
    const section = await this.prisma.homePageSection.findUnique({
      where: { id },
    });
    if (!section) throw new NotFoundException('Section not found');
    const sections = await this.listSections(section.layout_id);
    const reordered = sections.filter((x) => x.id !== id);
    reordered.splice(
      Math.max(0, Math.min(dto.position - 1, reordered.length)),
      0,
      section,
    );

    // Two-pass update to avoid unique-constraint (layout_id, position) conflicts.
    const OFFSET = 1_000_000;
    await this.prisma.$transaction(
      reordered.map((x, idx) =>
        this.prisma.homePageSection.update({
          where: { id: x.id },
          data: { position: OFFSET + idx + 1 },
        }),
      ),
    );
    await this.prisma.$transaction(
      reordered.map((x, idx) =>
        this.prisma.homePageSection.update({
          where: { id: x.id },
          data: { position: idx + 1 },
        }),
      ),
    );
    await this.reindexLayoutSections(section.layout_id);
    this.invalidateCache();
    return this.listSections(section.layout_id);
  }

  async reorderSections(dto: {
    items: Array<{ id: string; position: number }>;
  }) {
    const items = Array.isArray(dto?.items)
      ? dto.items.map((item) => ({
          id: String(item?.id || '').trim(),
          position: Number(item?.position),
        }))
      : [];

    if (!items.length) throw new BadRequestException('items is required');

    const hasInvalidPosition = items.some(
      (item) => !Number.isFinite(item.position) || item.position < 1,
    );
    if (hasInvalidPosition) {
      throw new BadRequestException('positions must be positive integers');
    }

    const uniqueIds = Array.from(
      new Set(items.map((item) => item.id).filter(Boolean)),
    );
    if (uniqueIds.length !== items.length) {
      throw new BadRequestException('Section ids must be unique');
    }

    const uniquePositions = new Set(
      items.map((item) => Math.floor(item.position)),
    );
    if (uniquePositions.size !== items.length) {
      throw new BadRequestException('Section positions must be unique');
    }

    const sections = await this.prisma.homePageSection.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, layout_id: true },
    });

    if (sections.length !== uniqueIds.length) {
      throw new NotFoundException('One or more sections were not found');
    }

    const layoutIds = new Set(sections.map((section) => section.layout_id));
    if (layoutIds.size !== 1) {
      throw new BadRequestException(
        'All sections must belong to the same layout',
      );
    }

    const normalizedItems = [...items]
      .map((item) => ({ ...item, position: Math.floor(item.position) }))
      .sort((a, b) => a.position - b.position);

    // Two-pass update to avoid unique-constraint (layout_id, position) conflicts.
    const OFFSET = 1_000_000;
    await this.prisma.$transaction(
      normalizedItems.map((item) =>
        this.prisma.homePageSection.update({
          where: { id: item.id },
          data: { position: item.position + OFFSET },
        }),
      ),
    );
    await this.prisma.$transaction(
      normalizedItems.map((item) =>
        this.prisma.homePageSection.update({
          where: { id: item.id },
          data: { position: item.position },
        }),
      ),
    );

    const layoutId = sections[0].layout_id;
    await this.reindexLayoutSections(layoutId);
    this.invalidateCache();
    return this.listSections(layoutId);
  }

  async removeSection(id: string) {
    const section = await this.prisma.homePageSection.findUnique({
      where: { id },
    });
    if (!section) throw new NotFoundException('Section not found');

    await this.prisma.homePageSection.delete({ where: { id } });
    await this.reindexLayoutSections(section.layout_id);
    this.invalidateCache();
    return { success: true };
  }

  async listItems(sectionId: string) {
    return this.prisma.homePageSectionItem.findMany({
      where: { section_id: sectionId },
      orderBy: { position: 'asc' },
    });
  }

  async createItem(sectionId: string, dto: CreateItemDto) {
    const item = await this.prisma.homePageSectionItem.create({
      data: { ...dto, section_id: sectionId },
    });
    this.invalidateCache();
    return item;
  }

  async updateItem(id: string, dto: UpdateItemDto) {
    const item = await this.prisma.homePageSectionItem.update({
      where: { id },
      data: dto,
    });
    this.invalidateCache();
    return item;
  }

  async removeItem(id: string) {
    await this.prisma.homePageSectionItem.delete({ where: { id } });
    this.invalidateCache();
    return { success: true };
  }

  async reorderItems(dto: ReorderItemsDto) {
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.homePageSectionItem.update({
          where: { id: item.id },
          data: { position: item.position },
        }),
      ),
    );
    this.invalidateCache();
    return { success: true };
  }

  async uploadItemImage(dataUrl: string) {
    if (!dataUrl?.startsWith('data:image/')) {
      throw new BadRequestException('Invalid image payload');
    }

    const matches = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) {
      throw new BadRequestException('Invalid image payload');
    }

    const buffer = Buffer.from(matches[2], 'base64');
    const maxBytes = 3 * 1024 * 1024;
    if (buffer.length > maxBytes) {
      throw new BadRequestException('Image must not exceed 3MB');
    }

    const url = await saveBase64Image(dataUrl);
    return { url };
  }

  async searchOptions(
    target: 'products' | 'categories' | 'brands' | 'banners',
    q = '',
    limit = 12,
  ) {
    const take = this.clampLimit(limit, 12);
    if (target === 'products') {
      const data = await this.prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          title: { contains: q, mode: 'insensitive' },
        },
        select: { id: true, title: true, slug: true },
        take,
        orderBy: { created_at: 'desc' },
      });
      return data.map((x) => ({ id: x.id, label: x.title, subtitle: x.slug }));
    }

    if (target === 'categories') {
      const data = await this.prisma.category.findMany({
        where: { is_active: true, name: { contains: q, mode: 'insensitive' } },
        select: { id: true, name: true, slug: true },
        take,
        orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
      });
      return data.map((x) => ({ id: x.id, label: x.name, subtitle: x.slug }));
    }

    if (target === 'brands') {
      const data = await this.prisma.brand.findMany({
        where: { is_active: true, name: { contains: q, mode: 'insensitive' } },
        select: { id: true, name: true, slug: true },
        take,
        orderBy: { name: 'asc' },
      });
      return data.map((x) => ({ id: x.id, label: x.name, subtitle: x.slug }));
    }

    const data = await this.prisma.banner.findMany({
      where: { title_text: { contains: q, mode: 'insensitive' } },
      select: { id: true, title_text: true, button_text: true },
      take,
      orderBy: { sort_order: 'asc' },
    });
    return data.map((x) => ({
      id: x.id,
      label: x.title_text,
      subtitle: x.button_text || '',
    }));
  }

  private async resolveProductSection(section: any) {
    const config = this.normalizeSectionConfig(
      HomeSectionType.PRODUCT_CAROUSEL,
      (section.config || {}) as Record<string, any>,
    );
    const source = config.source || 'NEW_ARRIVALS';
    const limit = this.clampLimit(config.limit, 12);
    const inStockOnly = config.inStockOnly ?? true;
    const sortBy = config.sortBy || config.query?.sortBy || 'newest';
    const featuredOnly = Boolean(config.featured_only);
    const discountOnly = Boolean(config.discount_only);

    const singleCategoryId = String(
      config.categoryId || config.query?.categoryId || '',
    ).trim();
    const singleBrandId = String(
      config.brandId || config.query?.brandId || '',
    ).trim();
    const categoryIds = [
      ...new Set(
        [
          singleCategoryId,
          ...(Array.isArray(config.categoryIds)
            ? config.categoryIds
            : String(config.categoryIds || '').split(',')
          )
            .map((x: any) => String(x || '').trim())
            .filter(Boolean),
        ].filter(Boolean),
      ),
    ];
    const brandIds = [
      ...new Set(
        [
          singleBrandId,
          ...(Array.isArray(config.brandIds)
            ? config.brandIds
            : String(config.brandIds || '').split(',')
          )
            .map((x: any) => String(x || '').trim())
            .filter(Boolean),
        ].filter(Boolean),
      ),
    ];

    const applyPostFilters = (products: any[]) => {
      const filtered = products
        .filter((p) => p?.status === 'ACTIVE')
        .filter((p) =>
          inStockOnly
            ? (p.skus?.[0]?.inventory?.[0]?.qty_on_hand || 0) > 0
            : true,
        )
        .map((product) => this.toProductCard(product));

      const postFiltered = filtered.filter((card) =>
        discountOnly ? Number(card.discount_percentage || 0) > 0 : true,
      );

      // Apply price / discount sorting after mapping to product cards (Prisma
      // cannot reliably sort on nested price fields across SKU relations).
      if (sortBy === 'price_asc') {
        postFiltered.sort((a, b) => (a.price || 0) - (b.price || 0));
      } else if (sortBy === 'price_desc') {
        postFiltered.sort((a, b) => (b.price || 0) - (a.price || 0));
      } else if (sortBy === 'discount_desc') {
        postFiltered.sort(
          (a, b) =>
            Number(b.discount_percentage || 0) -
            Number(a.discount_percentage || 0),
        );
      }

      return postFiltered.slice(0, limit);
    };

    const loadProductsByWhere = async (where: Record<string, any>) => {
      const products = await this.prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          ...where,
        },
        include: {
          brand: true,
          media: { where: { sku_id: null }, take: 1 },
          skus: {
            where: { name: null },
            include: { prices: true, inventory: true },
            take: 1,
          },
        },
        // Always fetch newest first; price/discount sorting is applied post-query
        // in applyPostFilters because Prisma cannot sort on nested relation fields.
        orderBy: [{ created_at: 'desc' }],
        take: Math.max(limit * 3, 24),
      });
      return applyPostFilters(products);
    };

    if (config.mode === 'curated') {
      const items = await this.listItems(section.id);
      const ids = items.map((x) => x.product_id).filter(Boolean) as string[];
      if (!ids.length) return [];
      const products = await this.prisma.product.findMany({
        where: { id: { in: ids }, status: 'ACTIVE' },
        include: {
          brand: true,
          media: { where: { sku_id: null }, take: 1 },
          skus: {
            where: { name: null },
            include: { prices: true, inventory: true },
            take: 1,
          },
        },
      });
      const order = new Map(ids.map((id, idx) => [id, idx]));
      return applyPostFilters(
        products.sort(
          (a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999),
        ),
      );
    }

    if (source === 'FEATURED' || featuredOnly) {
      const featured = await this.prisma.featuredProduct.findMany({
        where: { is_active: true },
        include: {
          product: {
            include: {
              brand: true,
              media: { where: { sku_id: null }, take: 1 },
              skus: {
                where: { name: null },
                include: { prices: true, inventory: true },
                take: 1,
              },
            },
          },
        },
        orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }],
        take: Math.max(limit * 2, 24),
      });

      const featuredCards = applyPostFilters(
        featured.map((entry) => entry.product),
      );
      if (featuredCards.length && source === 'FEATURED') return featuredCards;
      if (featuredOnly) return featuredCards;
    }

    if (source === 'CATEGORY' && categoryIds.length) {
      const categoryScope = String(
        config.category_scope || 'parent_and_descendants',
      );

      if (
        categoryIds.length === 1 &&
        categoryScope === 'parent_and_descendants' &&
        (!config.categoryIds ||
          (Array.isArray(config.categoryIds) &&
            config.categoryIds.length === 0))
      ) {
        const result = await this.productsService.getProducts({
          page: 1,
          limit,
          category: categoryIds[0],
          in_stock_only: inStockOnly,
          sort_by: sortBy,
        });
        const cards = (result.products || []).filter((p: any) =>
          discountOnly
            ? Number(p.discount_percentage || p.discount_pct || 0) > 0
            : true,
        );
        if (cards.length) return cards.slice(0, limit);
      }

      const childRows =
        (await this.prisma.category?.findMany?.({
          where: { is_active: true, parent_id: { in: categoryIds } },
          select: { id: true, parent_id: true },
        })) || [];
      const childIds = childRows.map((row) => row.id);

      const targetCategoryIds =
        categoryScope === 'children_only'
          ? childIds
          : categoryScope === 'parent_only'
            ? categoryIds
            : [...new Set([...categoryIds, ...childIds])];

      if (!targetCategoryIds.length) return [];

      const cards = await loadProductsByWhere({
        OR: [
          { main_category_id: { in: targetCategoryIds } },
          { categories: { some: { category_id: { in: targetCategoryIds } } } },
        ],
      });
      if (cards.length) return cards;
    }

    if (source === 'CATEGORY' && !categoryIds.length) {
      this.logger.warn(
        `PRODUCT_CAROUSEL section ${section.id} uses CATEGORY source without categoryId; falling back to generic catalog query.`,
      );
    }

    if (source === 'BRAND' && brandIds.length) {
      const cards = await loadProductsByWhere({
        brand_id: { in: brandIds },
      });
      if (cards.length) return cards;
    }

    if (source === 'BRAND' && !brandIds.length) {
      this.logger.warn(
        `PRODUCT_CAROUSEL section ${section.id} uses BRAND source without brandId; falling back to generic catalog query.`,
      );
    }

    if (source === 'BEST_DEALS') {
      const deals = await this.productsService.getDealsProducts(
        limit,
        inStockOnly,
      );
      const dealCards = deals.filter((p: any) =>
        discountOnly
          ? Number(p.discount_percentage || p.discount_pct || 0) > 0
          : true,
      );
      if (dealCards.length) return dealCards;

      const featured = await this.prisma.featuredProduct.findMany({
        where: { is_active: true },
        include: {
          product: {
            include: {
              brand: true,
              media: { where: { sku_id: null }, take: 1 },
              skus: {
                where: { name: null },
                include: { prices: true, inventory: true },
                take: 1,
              },
            },
          },
        },
        orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }],
        take: Math.max(limit * 2, 24),
      });
      const featuredCards = applyPostFilters(
        featured.map((entry) => entry.product),
      );
      if (featuredCards.length) return featuredCards;
    }

    if (source === 'BEST_SELLERS') {
      const bestSellerCards = await loadProductsByWhere({
        order_items: { some: {} },
      });
      if (bestSellerCards.length) return bestSellerCards;
    }

    const result = await this.productsService.getProducts({
      page: 1,
      limit,
      in_stock_only: inStockOnly,
      sort_by: sortBy,
    });

    return (result.products || [])
      .filter((p: any) =>
        discountOnly
          ? Number(p.discount_percentage || p.discount_pct || 0) > 0
          : true,
      )
      .slice(0, limit);
  }

  private async resolveSection(section: any) {
    const config = (section.config || {}) as Record<string, any>;
    if (section.type === HomeSectionType.HERO_CAROUSEL) {
      const heroLimit = 6;
      const [items, activeBanners] = await Promise.all([
        this.prisma.homePageSectionItem.findMany({
          where: { section_id: section.id },
          orderBy: { position: 'asc' },
          include: { banner: true },
        }),
        this.prisma.banner.findMany({
          where: { is_active: true },
          orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }],
        }),
      ]);

      if (!activeBanners.length) {
        return [];
      }

      const activeBannerById = new Map(
        activeBanners.map((banner) => [banner.id, banner]),
      );
      const seen = new Set<string>();
      const curatedOrderedBanners = items
        .map((item) => {
          const bannerId = item.banner_id || item.banner?.id || null;
          if (!bannerId) return null;
          return activeBannerById.get(bannerId) || null;
        })
        .filter((banner): banner is (typeof activeBanners)[number] => {
          if (!banner) return false;
          if (seen.has(banner.id)) return false;
          seen.add(banner.id);
          return true;
        });

      if (!curatedOrderedBanners.length) {
        const fallbackReason = items.length
          ? 'curated items without active linked banners'
          : 'no curated items';

        this.logger.warn(
          `HERO_CAROUSEL section ${section.id} has ${fallbackReason}; using active banner fallback.`,
        );
      }

      const remainingActiveBanners = activeBanners.filter(
        (banner) => !seen.has(banner.id),
      );

      return [...curatedOrderedBanners, ...remainingActiveBanners]
        .slice(0, heroLimit)
        .map((banner) => ({
          banner_id: banner.id,
          banner,
        }));
    }

    if (section.type === HomeSectionType.CATEGORY_STRIP) {
      if (config.mode === 'curated') {
        const items = await this.prisma.homePageSectionItem.findMany({
          where: { section_id: section.id },
          orderBy: { position: 'asc' },
          include: { category: true },
        });
        return items
          .map((x) => {
            if (!x.category) return null;
            return {
              ...x.category,
              image_url:
                x.image_url ||
                (x.category as any).image_url ||
                (x.category as any).image,
              href: x.href || null,
              item_label: x.label || null,
            };
          })
          .filter(Boolean);
      }
      const requestedLimit = this.clampLimit(config.limit, 10);
      const parentPool = await this.prisma.category.findMany({
        where: {
          is_active: true,
          parent_id: null,
          children: { some: { is_active: true } },
        },
        take: 64,
        orderBy: [{ sort_order: 'asc' }],
      });

      const pool = parentPool.length
        ? parentPool
        : await this.prisma.category.findMany({
            where: { is_active: true, parent_id: null },
            take: 64,
            orderBy: [{ sort_order: 'asc' }],
          });

      const scoredCategories = await Promise.all(
        pool.map(async (category) => {
          const activeProducts = await this.prisma.product.count({
            where: {
              status: 'ACTIVE',
              OR: [
                { main_category_id: category.id },
                { categories: { some: { category_id: category.id } } },
              ],
            },
          });

          return {
            category,
            score:
              this.categoryDemandKeywordScore(category.name, category.slug) *
                5 +
              activeProducts * 4 -
              category.sort_order,
          };
        }),
      );

      const autoStrategy = String(config.auto_strategy || 'demand');
      const ranked = [...scoredCategories];

      if (autoStrategy === 'alphabetical') {
        ranked.sort((a, b) =>
          a.category.name.localeCompare(b.category.name, 'es'),
        );
      } else if (autoStrategy === 'manual_sort') {
        ranked.sort((a, b) => a.category.sort_order - b.category.sort_order);
      } else {
        ranked.sort((a, b) => b.score - a.score);
      }

      const categories = ranked
        .slice(0, requestedLimit)
        .map((entry) => entry.category);

      if (categories.length < requestedLimit) {
        const existingSemanticKeys = new Set(
          categories.map(
            (category) =>
              `${String(category.slug || '').toLowerCase()}|${String(category.name || '').toLowerCase()}`,
          ),
        );
        const existingIds = new Set(categories.map((category) => category.id));

        const childFallback = await this.prisma.category.findMany({
          where: {
            is_active: true,
            parent_id: { not: null },
          },
          orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
          take: 96,
        });

        for (const childCategory of childFallback) {
          if (categories.length >= requestedLimit) break;
          if (existingIds.has(childCategory.id)) continue;

          const semanticKey = `${String(childCategory.slug || '').toLowerCase()}|${String(childCategory.name || '').toLowerCase()}`;
          if (!semanticKey.replace('|', '').trim()) continue;
          if (existingSemanticKeys.has(semanticKey)) continue;

          existingIds.add(childCategory.id);
          existingSemanticKeys.add(semanticKey);
          categories.push(childCategory as any);
        }
      }

      const parentIds = categories.map((category) => category.id);
      const childRows = parentIds.length
        ? (await this.prisma.category.findMany({
            where: {
              is_active: true,
              parent_id: { in: parentIds },
            },
            select: {
              id: true,
              parent_id: true,
            },
          })) || []
        : [];

      const childIdsByParent = new Map<string, string[]>();
      for (const row of childRows) {
        if (!row.parent_id) continue;
        const current = childIdsByParent.get(row.parent_id) || [];
        current.push(row.id);
        childIdsByParent.set(row.parent_id, current);
      }

      const categoriesWithImage = await Promise.all(
        categories.map(async (category) => {
          const existingImage =
            (category as any).image_url || (category as any).image || null;
          if (existingImage) {
            return { ...category, image_url: existingImage };
          }

          const relatedCategoryIds = [
            category.id,
            ...(childIdsByParent.get(category.id) || []),
          ];

          const candidateProducts = await this.prisma.product.findMany({
            where: {
              status: 'ACTIVE',
              OR: [
                { main_category_id: { in: relatedCategoryIds } },
                {
                  categories: {
                    some: { category_id: { in: relatedCategoryIds } },
                  },
                },
              ],
              media: { some: {} },
            },
            select: {
              id: true,
              title: true,
              slug: true,
              media: {
                orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
                select: { url: true },
                take: 1,
              },
            },
            orderBy: { created_at: 'desc' },
            take: 12,
          });

          const derivedImage = this.pickBestCategoryMedia(
            category,
            candidateProducts,
          );
          if (!derivedImage) {
            this.logger.warn(
              `CATEGORY_STRIP category ${category.id} (${category.slug}) has no image_url and no product media fallback.`,
            );
          }

          return {
            ...category,
            image_url: derivedImage,
          };
        }),
      );

      return categoriesWithImage;
    }

    if (section.type === HomeSectionType.BRAND_STRIP) {
      if (config.mode === 'curated') {
        const items = await this.prisma.homePageSectionItem.findMany({
          where: { section_id: section.id },
          orderBy: { position: 'asc' },
          include: { brand: true },
        });
        return items
          .map((x) => {
            if (!x.brand) return null;
            return {
              ...x.brand,
              image_url:
                x.image_url ||
                (x.brand as any).logo_url ||
                (x.brand as any).image,
              href: x.href || null,
              item_label: x.label || null,
            };
          })
          .filter(Boolean);
      }
      return this.prisma.brand.findMany({
        where: { is_active: true },
        take: this.clampLimit(config.limit, 12),
        orderBy: { name: 'asc' },
      });
    }

    if (section.type === HomeSectionType.PRODUCT_CAROUSEL) {
      return this.resolveProductSection(section);
    }

    if (
      section.type === HomeSectionType.VALUE_PROPS ||
      section.type === HomeSectionType.TRENDING_CHIPS
    ) {
      return Array.isArray(config.items) ? config.items : [];
    }

    if (section.type === HomeSectionType.CUSTOM_HTML) {
      return { html: String(config.html || '').trim() };
    }

    return [];
  }

  async resolveHome(locale?: string, previewLayoutId?: string) {
    // Only cache the active layout (served to all storefront users); skip cache for
    // preview requests so that admin users always see the latest unsaved state.
    const cacheEnabled = !previewLayoutId;
    const key = previewLayoutId
      ? `${locale || 'default'}:preview:${previewLayoutId}`
      : `${locale || 'default'}:active`;

    if (cacheEnabled) {
      const hit = this.homeCache.get(key);
      if (hit && hit.expiresAt > Date.now()) return hit.value;
    }

    const layout = previewLayoutId
      ? await this.prisma.homePageLayout.findUnique({
          where: { id: previewLayoutId },
        })
      : await this.getActiveLayout(locale);

    if (!layout) {
      return { layout: null, sections: [] };
    }

    const sections = await this.prisma.homePageSection.findMany({
      where: { layout_id: layout.id, is_enabled: true },
      orderBy: { position: 'asc' },
    });

    const resolvedSections = await Promise.all(
      sections.map(async (section) => ({
        id: section.id,
        type: section.type,
        title: section.title,
        subtitle: section.subtitle,
        variant: section.variant,
        config: section.config,
        resolved: await this.resolveSection(section),
      })),
    );

    const value = {
      layout: { id: layout.id, locale: layout.locale, name: layout.name },
      sections: resolvedSections,
    };

    if (cacheEnabled) {
      this.homeCache.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    }

    return value;
  }

  async getActiveLayoutDiagnostics(locale?: string) {
    const layout = await this.getActiveLayout(locale);
    if (!layout) {
      return {
        locale: locale || null,
        activeLayout: null,
        sections: [],
      };
    }

    const sections = await this.prisma.homePageSection.findMany({
      where: { layout_id: layout.id },
      orderBy: { position: 'asc' },
    });

    const sectionDiagnostics = await Promise.all(
      sections.map(async (section) => {
        const config = ((section.config || {}) as Record<string, any>) || {};
        const normalizedConfig = this.normalizeSectionConfig(
          section.type as unknown as HomeSectionType,
          config,
        );
        const resolved = section.is_enabled
          ? await this.resolveSection({ ...section, config: normalizedConfig })
          : [];

        const warnings: string[] = [];
        let fallbackReason: string | null = null;

        if (section.type === HomeSectionType.HERO_CAROUSEL) {
          const linkedItems = await this.prisma.homePageSectionItem.count({
            where: { section_id: section.id },
          });
          if (!linkedItems) {
            fallbackReason = 'legacy_active_banners_fallback';
            warnings.push(
              'Sin items curados: se están usando banners activos como fallback.',
            );
          }
        }

        if (section.type === HomeSectionType.PRODUCT_CAROUSEL) {
          const source = String(normalizedConfig.source || 'NEW_ARRIVALS');
          const mode = String(normalizedConfig.mode || 'rule');

          if (mode === 'curated') {
            const linkedProducts = await this.prisma.homePageSectionItem.count({
              where: { section_id: section.id, product_id: { not: null } },
            });
            if (!linkedProducts) {
              warnings.push(
                'Modo curado sin productos vinculados: la sección puede quedar vacía.',
              );
            }
          }

          const categoryIdsConfigured = [
            String(normalizedConfig.categoryId || '').trim(),
            ...(Array.isArray(normalizedConfig.categoryIds)
              ? normalizedConfig.categoryIds
              : String(normalizedConfig.categoryIds || '').split(',')
            )
              .map((x: any) => String(x || '').trim())
              .filter(Boolean),
          ].filter(Boolean);

          const brandIdsConfigured = [
            String(normalizedConfig.brandId || '').trim(),
            ...(Array.isArray(normalizedConfig.brandIds)
              ? normalizedConfig.brandIds
              : String(normalizedConfig.brandIds || '').split(',')
            )
              .map((x: any) => String(x || '').trim())
              .filter(Boolean),
          ].filter(Boolean);

          if (source === 'CATEGORY' && !categoryIdsConfigured.length) {
            fallbackReason = 'category_source_without_category_id';
            warnings.push(
              'Fuente CATEGORY sin categoryId/categoryIds: se aplica fallback a catálogo general.',
            );
          }

          if (source === 'BRAND' && !brandIdsConfigured.length) {
            fallbackReason = 'brand_source_without_brand_id';
            warnings.push(
              'Fuente BRAND sin brandId/brandIds: se aplica fallback a catálogo general.',
            );
          }

          if (normalizedConfig.discount_only) {
            warnings.push(
              'Filtro discount_only activo: puede reducir resultados si no hay ofertas vigentes.',
            );
          }
        }

        if (section.type === HomeSectionType.CATEGORY_STRIP) {
          warnings.push(
            'Storefront renderiza CATEGORY_STRIP como grid fijo (no carrusel/autoplay).',
          );
        }

        if (section.type === HomeSectionType.CUSTOM_HTML) {
          warnings.push(
            'CUSTOM_HTML no renderiza HTML libre en Store por seguridad.',
          );
        }

        const resolvedCount = Array.isArray(resolved)
          ? resolved.length
          : resolved && typeof resolved === 'object'
            ? 1
            : 0;

        return {
          id: section.id,
          type: section.type,
          title: section.title,
          position: section.position,
          is_enabled: section.is_enabled,
          raw_config: config,
          effective_config: normalizedConfig,
          resolved_count: resolvedCount,
          fallback_reason: fallbackReason,
          warnings,
        };
      }),
    );

    return {
      locale: locale || null,
      activeLayout: {
        id: layout.id,
        name: layout.name,
        locale: layout.locale,
        is_active: layout.is_active,
        updated_at: layout.updated_at,
      },
      sections: sectionDiagnostics,
    };
  }

  async getIntegratedModulesSummary(limit = 8) {
    const take = this.clampLimit(limit, 8);

    const [banners, featured] = await Promise.all([
      this.prisma.banner.findMany({
        orderBy: [{ is_active: 'desc' }, { sort_order: 'asc' }],
        take,
        select: {
          id: true,
          title_text: true,
          sort_order: true,
          is_active: true,
        },
      }),
      this.prisma.featuredProduct.findMany({
        orderBy: [{ is_active: 'desc' }, { sort_order: 'asc' }],
        take,
        select: {
          id: true,
          title: true,
          sort_order: true,
          is_active: true,
          product: { select: { title: true } },
        },
      }),
    ]);

    return { banners, featured };
  }
}
