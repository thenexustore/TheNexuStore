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
    const n = Number(value || fallback);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(1, Math.min(24, Math.floor(n)));
  }

  private clampRange(value: unknown, min: number, max: number, fallback: number) {
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

  private normalizeSectionConfig(
    type: HomeSectionType,
    config: Record<string, any>,
  ) {
    const next = { ...(config || {}) };

    if (type === HomeSectionType.HERO_CAROUSEL) {
      next.autoplay = this.asBoolean(next.autoplay, true);
      next.interval_ms = this.clampRange(next.interval_ms, 2500, 15000, 5000);
    }

    if (type === HomeSectionType.PRODUCT_CAROUSEL) {
      next.source = next.source || 'NEW_ARRIVALS';
      next.limit = this.clampLimit(next.limit, 12);
      next.inStockOnly = this.asBoolean(next.inStockOnly, true);
      next.mode = next.mode || 'rule';
      next.autoplay = this.asBoolean(next.autoplay, true);
      next.interval_ms = this.clampRange(next.interval_ms, 2000, 15000, 4500);
      next.items_mobile = this.clampRange(next.items_mobile, 1, 3, 2);
      next.items_desktop = this.clampRange(next.items_desktop, 2, 6, 4);
    }

    if (type === HomeSectionType.CATEGORY_STRIP) {
      next.limit = this.clampLimit(next.limit, 12);
      next.mode = next.mode || 'auto';
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

  async listSections(layoutId: string) {
    return this.prisma.homePageSection.findMany({
      where: { layout_id: layoutId },
      orderBy: { position: 'asc' },
    });
  }

  async createSection(layoutId: string, dto: CreateSectionDto) {
    const config = this.normalizeSectionConfig(dto.type, dto.config || {});
    const section = await this.prisma.homePageSection.create({
      data: { layout_id: layoutId, ...dto, config },
    });
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

    await this.prisma.$transaction(
      reordered.map((x, idx) =>
        this.prisma.homePageSection.update({
          where: { id: x.id },
          data: { position: idx + 1 },
        }),
      ),
    );
    this.invalidateCache();
    return this.listSections(section.layout_id);
  }

  async removeSection(id: string) {
    await this.prisma.homePageSection.delete({ where: { id } });
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
    const categoryId = String(config.categoryId || config.query?.categoryId || '').trim();
    const brandId = String(config.brandId || config.query?.brandId || '').trim();
    const sortBy = (config.sortBy || config.query?.sortBy || 'newest') as any;

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
      return products
        .sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999))
        .map((product) => this.toProductCard(product));
    }

    if (source === 'FEATURED') {
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
        take: limit,
      });

      const featuredCards = featured
        .map((entry) => entry.product)
        .filter((p) => p?.status === 'ACTIVE')
        .filter((p) =>
          inStockOnly
            ? (p.skus?.[0]?.inventory?.[0]?.qty_on_hand || 0) > 0
            : true,
        )
        .map((product) => this.toProductCard(product));

      if (featuredCards.length) return featuredCards;
    }

    if (source === 'CATEGORY' && categoryId) {
      const result = await this.productsService.getProducts({
        page: 1,
        limit,
        category: categoryId,
        in_stock_only: inStockOnly,
        sort_by: sortBy,
      });
      return result.products;
    }

    if (source === 'CATEGORY' && !categoryId) {
      this.logger.warn(
        `PRODUCT_CAROUSEL section ${section.id} uses CATEGORY source without categoryId; falling back to generic catalog query.`,
      );
    }

    if (source === 'BRAND' && brandId) {
      const result = await this.productsService.getProducts({
        page: 1,
        limit,
        brand: brandId,
        in_stock_only: inStockOnly,
        sort_by: sortBy,
      });
      return result.products;
    }

    if (source === 'BRAND' && !brandId) {
      this.logger.warn(
        `PRODUCT_CAROUSEL section ${section.id} uses BRAND source without brandId; falling back to generic catalog query.`,
      );
    }

    if (source === 'BEST_DEALS') {
      const deals = await this.productsService.getDealsProducts(limit, inStockOnly);
      if (deals.length) return deals;

      // If there are no active discounted products, keep the section useful by
      // falling back to featured products and, as last resort, newest products.
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
        take: limit,
      });

      const featuredCards = featured
        .map((entry) => entry.product)
        .filter((p) => p?.status === 'ACTIVE')
        .filter((p) => (inStockOnly ? (p.skus?.[0]?.inventory?.[0]?.qty_on_hand || 0) > 0 : true))
        .map((product) => this.toProductCard(product));
      if (featuredCards.length) return featuredCards;
    }

    const result = await this.productsService.getProducts({
      page: 1,
      limit,
      in_stock_only: inStockOnly,
      sort_by: sortBy,
    });
    return result.products;
  }

  private async resolveSection(section: any) {
    const config = (section.config || {}) as Record<string, any>;
    if (section.type === HomeSectionType.HERO_CAROUSEL) {
      const items = await this.prisma.homePageSectionItem.findMany({
        where: { section_id: section.id },
        orderBy: { position: 'asc' },
        include: { banner: true },
      });

      if (items.length) {
        return items.map((x) => ({ ...x, banner: x.banner }));
      }

      // Fallback bridge: if no curated hero items were linked yet,
      // use active banners from legacy Banner admin so homepage is never blank.
      this.logger.warn(
        `HERO_CAROUSEL section ${section.id} has no curated items; using active banner fallback.`,
      );
      const activeBanners = await this.prisma.banner.findMany({
        where: { is_active: true },
        orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }],
        take: 6,
      });

      return activeBanners.map((banner) => ({ banner_id: banner.id, banner }));
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
              image_url: x.image_url || (x.category as any).image_url || (x.category as any).image,
              href: x.href || null,
              item_label: x.label || null,
            };
          })
          .filter(Boolean);
      }
      return this.prisma.category.findMany({
        where: { is_active: true, parent_id: null },
        take: this.clampLimit(config.limit, 10),
        orderBy: [{ sort_order: 'asc' }],
      });
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
              image_url: x.image_url || (x.brand as any).logo_url || (x.brand as any).image,
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
    const cacheEnabled = Boolean(previewLayoutId);
    const key = `${locale || 'default'}:${previewLayoutId || 'active'}`;

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
}
