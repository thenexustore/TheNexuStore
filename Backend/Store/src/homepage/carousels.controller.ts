import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseBoolPipe,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { HomepageSectionsService } from './homepage-sections.service';
import { ProductsService } from '../user/products/products.service';
import { PrismaService } from '../common/prisma.service';
import { ProductSortBy } from '../user/products/dto/get-products.dto';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const HOMEPAGE_DYNAMIC_SECTION_TYPES = new Set([
  'PRODUCT_CAROUSEL',
  'BEST_DEALS',
  'NEW_ARRIVALS',
  'FEATURED_PICKS',
  'TOP_CATEGORIES_GRID',
  'BRANDS_STRIP',
  'TRUST_BAR',
  'NEWSLETTER',
]);

@Controller('api')
export class CarouselsController {
  constructor(
    private readonly homepageSectionsService: HomepageSectionsService,
    private readonly productsService: ProductsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('carousels/config')
  async getCarouselsConfig() {
    const sections = await this.homepageSectionsService.getPublicSections();

    const normalized = sections
      .filter((section) => HOMEPAGE_DYNAMIC_SECTION_TYPES.has(section.type))
      .map((section) => ({
        id: section.id,
        type: section.type,
        title: section.title,
        config: section.config_json || {},
        enabled: section.enabled,
        previewCount: Array.isArray(section.data)
          ? section.data.length
          : section.data
            ? 1
            : 0,
        data: section.data ?? [],
      }));

    return {
      success: true,
      sections: normalized,
      data: { sections: normalized },
    };
  }

  @Get('admin/trust-items')
  async getTrustItems() {
    const sections = await this.homepageSectionsService.getPublicSections();
    const trust = sections.find((section) => section.type === 'TRUST_BAR');
    return {
      items: Array.isArray(trust?.data) ? trust.data : [],
    };
  }


  private async resolveCategorySlug(value?: string) {
    const raw = String(value || '').trim();
    if (!raw) return undefined;

    if (UUID_V4_REGEX.test(raw)) {
      const byId = await this.prisma.category.findUnique({
        where: { id: raw },
        select: { slug: true },
      });

      if (byId?.slug) return byId.slug;
    }
    return raw;
  }

  private async resolveBrandSlug(value?: string) {
    const raw = String(value || '').trim();
    if (!raw) return undefined;

    if (UUID_V4_REGEX.test(raw)) {
      const byId = await this.prisma.brand.findUnique({
        where: { id: raw },
        select: { slug: true },
      });

      if (byId?.slug) return byId.slug;
    }
    return raw;
  }

  @Get('products')
  async getProducts(
    @Query('filter[category]') categorySlug: string | undefined,
    @Query('filter[brand]') brandSlug: string | undefined,
    @Query('sort') sort: string | undefined,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('in_stock_only', new DefaultValuePipe(true), ParseBoolPipe)
    inStockOnly: boolean,
  ) {
    const normalizedSort = String(sort || '').toLowerCase();
    const [categoryFilter, brandFilter] = await Promise.all([
      this.resolveCategorySlug(categorySlug),
      this.resolveBrandSlug(brandSlug),
    ]);
    const sortBy =
      normalizedSort === 'recent'
        ? ProductSortBy.NEWEST
        : normalizedSort === 'price_asc'
          ? ProductSortBy.PRICE_LOW_TO_HIGH
          : normalizedSort === 'price_desc'
            ? ProductSortBy.PRICE_HIGH_TO_LOW
            : ProductSortBy.NEWEST;

    return this.productsService.getProducts({
      page: 1,
      limit,
      categories: categoryFilter ? [categoryFilter] : undefined,
      brand: brandFilter,
      sort_by: sortBy,
      featured_only: normalizedSort === 'featured' ? true : undefined,
      in_stock_only: inStockOnly,
    });
  }


  @Get('categories')
  async getCategories(
    @Query('limit', new DefaultValuePipe(12), ParseIntPipe) limit: number,
    @Query('parent_slug') parentSlug: string | undefined,
  ) {
    const normalizedParentSlug = String(parentSlug || '').trim() || undefined;

    return this.prisma.category.findMany({
      where: {
        is_active: true,
        ...(normalizedParentSlug
          ? { parent: { slug: normalizedParentSlug } }
          : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: { sort_order: 'asc' },
      take: limit,
    });
  }

  @Get('brands')
  async getBrands(
    @Query('sort') sort: string | undefined,
    @Query('limit', new DefaultValuePipe(12), ParseIntPipe) limit: number,
  ) {
    const normalizedSort = String(sort || '').toLowerCase();
    const brands = await this.prisma.brand.findMany({
      where: { is_active: true },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy:
        normalizedSort === 'popularity'
          ? { products: { _count: 'desc' } }
          : { name: 'asc' },
      take: limit,
    });

    return brands.map((brand) => ({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      logo_url: brand.logo_url,
      product_count: brand._count.products,
    }));
  }
}
