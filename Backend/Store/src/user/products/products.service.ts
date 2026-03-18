import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import {
  GetProductsDto,
  ProductSortBy,
  ProductStatus,
} from './dto/get-products.dto';
import {
  ProductResponseDto,
  ProductListItemDto,
  ProductsListResponseDto,
  ProductReviewDto,
} from './dto/product-response.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import {
  generateDeterministicProductSlug,
  normalizeSku,
} from '../../infortisa/product-slug.util';
import {
  getParentCategorySortOrder,
  isKnownParentCategorySlug,
  recommendParentCategory,
  slugifyCategory,
} from '../../infortisa/infortisa-category-mapping.util';
import { shouldReparentImportedCategory } from '../../infortisa/infortisa-category-parent-policy.util';
import {
  buildCategoryLevel2Descriptor,
  buildCategoryTaxonomyTree,
  getDescendantIds,
  normalizeCategoryTaxonomyRows,
  resolveCanonicalParentSlug,
} from '../categories/category-taxonomy.util';
import { PricingService } from '../../pricing/pricing.service';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private readonly pricingService: PricingService,
  ) {}

  async getMenuTree() {
    const rows = normalizeCategoryTaxonomyRows(
      await this.prisma.category.findMany({
        where: { is_active: true },
        select: {
          id: true,
          name: true,
          slug: true,
          parent_id: true,
          sort_order: true,
        },
        orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
      }),
    );

    const tree = buildCategoryTaxonomyTree(rows, 3);
    const groups = tree.map((parent) => ({
      parent_id: parent.id,
      parent_name: parent.name,
      parent_slug: parent.slug,
      sort_order: parent.sort_order,
      children: parent.children.map((child) => ({
        parent_id: parent.id,
        parent_name: parent.name,
        parent_slug: parent.slug,
        child_id: child.id,
        child_name: child.name,
        child_slug: child.slug,
        sort_order: child.sort_order,
        product_count: 0,
      })),
    }));

    return {
      parents: groups.map((parent) => ({
        parent_id: parent.parent_id,
        parent_name: parent.parent_name,
        parent_slug: parent.parent_slug,
        sort_order: parent.sort_order,
      })),
      groups,
      tree,
    };
  }

  private calculateDiscountPercentage(
    price: number,
    compareAtPrice?: number,
  ): number | undefined {
    if (!compareAtPrice || compareAtPrice <= price) return undefined;
    return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
  }

  private getStockStatus(quantity: number): string {
    if (quantity <= 0) return 'OUT_OF_STOCK';
    if (quantity < 10) return 'LOW_STOCK';
    return 'IN_STOCK';
  }

  private buildEmptyProductsResponse(
    page: number,
    limit: number,
  ): ProductsListResponseDto {
    return {
      products: [],
      total: 0,
      page,
      limit,
      total_pages: 0,
      filters: {
        categories: [],
        brands: [],
        price_range: { min: 0, max: 0 },
        attributes: [],
      },
    };
  }

  private async resolveCategoryFilterIds(values: string[]): Promise<string[]> {
    const normalizedValues = Array.from(
      new Set(values.map((value) => value.trim()).filter(Boolean)),
    );
    if (!normalizedValues.length) return [];

    const taxonomyRows = normalizeCategoryTaxonomyRows(
      await this.prisma.category.findMany({
        where: { is_active: true },
        select: {
          id: true,
          name: true,
          slug: true,
          parent_id: true,
          sort_order: true,
        },
        orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
      }),
    );

    const canonicalRequestedSlugs = new Set(
      normalizedValues
        .map((value) => resolveCanonicalParentSlug(value))
        .filter((value): value is string => Boolean(value)),
    );

    const selectedIds = new Set(
      taxonomyRows
        .filter((row) => {
          return (
            normalizedValues.includes(row.id) ||
            normalizedValues.includes(row.slug) ||
            canonicalRequestedSlugs.has(row.slug)
          );
        })
        .map((row) => row.id),
    );

    if (selectedIds.size === 0) return [];

    const descendantIds = [...selectedIds].flatMap((categoryId) =>
      getDescendantIds(categoryId, taxonomyRows),
    );

    return Array.from(new Set(descendantIds));
  }

  async getDealsProducts(
    limit: number = 48,
    inStockOnly: boolean = true,
  ): Promise<ProductListItemDto[]> {
    try {
      const products = await this.prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          skus: {
            some: {
              name: null,
              prices: {
                some: {
                  compare_at_price: { not: null },
                },
              },
              ...(inStockOnly
                ? {
                    inventory: {
                      some: {
                        qty_on_hand: { gt: 0 },
                      },
                    },
                  }
                : {}),
            },
          },
        },
        include: {
          brand: true,
          main_category: true,
          media: {
            where: { sku_id: null },
            orderBy: { sort_order: 'asc' },
            take: 1,
          },
          skus: {
            where: {
              name: null,
              prices: {
                some: {
                  compare_at_price: { not: null },
                },
              },
              ...(inStockOnly
                ? {
                    inventory: {
                      some: {
                        qty_on_hand: { gt: 0 },
                      },
                    },
                  }
                : {}),
            },
            include: {
              prices: true,
              inventory: true,
            },
            take: 1,
          },
        },
      });

      const dealsDraft: Array<ProductListItemDto | null> = products.map(
        (product) => {
          const defaultSku = product.skus[0];
          const price = defaultSku?.prices?.[0];
          const inventory = defaultSku?.inventory?.[0];

          if (!price) return null;

          const priceValue = Number(price.sale_price);
          const compareAtPrice = price.compare_at_price
            ? Number(price.compare_at_price)
            : undefined;

          if (!compareAtPrice || compareAtPrice <= priceValue) return null;

          const discountPct = this.calculateDiscountPercentage(
            priceValue,
            compareAtPrice,
          );

          const stockQuantity = inventory?.qty_on_hand || 0;

          return {
            id: product.id,
            title: product.title,
            slug: product.slug,
            brand_name: product.brand.name,
            brand_slug: product.brand.slug,
            category_name: product.main_category?.name || 'Uncategorized',
            category_slug: product.main_category?.slug || 'uncategorized',
            sku_code: defaultSku?.sku_code || 'N/A',
            sku_id: defaultSku?.id || '',
            price: priceValue,
            compare_at_price: compareAtPrice,
            discount_pct: discountPct,
            discount_percentage: discountPct,
            stock_quantity: stockQuantity,
            stock_status: this.getStockStatus(stockQuantity),
            short_description: product.short_description || undefined,
            thumbnail: product.media[0]?.url || '',
            rating_avg: product.rating_avg
              ? Number(product.rating_avg)
              : undefined,
            rating_count: product.rating_count,
            is_featured: product.main_category?.slug === 'featured',
          };
        },
      );

      const deals = dealsDraft
        .filter((product): product is ProductListItemDto => product !== null)
        .sort((a, b) => (b.discount_pct || 0) - (a.discount_pct || 0))
        .slice(0, limit);

      return deals;
    } catch (error) {
      console.error('Get deals products error:', error);
      throw new BadRequestException('Failed to fetch deals products');
    }
  }

  async getProducts(dto: GetProductsDto): Promise<ProductsListResponseDto> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        category,
        brand,
        categories,
        sort_by = ProductSortBy.NEWEST,
        min_price,
        max_price,
        status = ProductStatus.ACTIVE,
        in_stock_only = false,
        featured_only = false,
        attributes = [],
      } = dto;
      const categoryFilters = [
        ...(category ? [category] : []),
        ...(categories ?? []),
      ];

      const skip = (page - 1) * limit;
      const where: any = {};

      if (status === ProductStatus.ACTIVE) {
        where.status = 'ACTIVE';
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { short_description: { contains: search, mode: 'insensitive' } },
          { description_html: { contains: search, mode: 'insensitive' } },
          {
            skus: {
              some: { sku_code: { contains: search, mode: 'insensitive' } },
            },
          },
        ];
      }

      if (brand) {
        where.brand = {
          slug: brand,
        };
      }

      if (categoryFilters.length > 0) {
        const categoryIds =
          await this.resolveCategoryFilterIds(categoryFilters);
        if (categoryIds.length === 0) {
          return this.buildEmptyProductsResponse(page, limit);
        }

        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { main_category_id: { in: categoryIds } },
              {
                categories: {
                  some: {
                    category_id: { in: categoryIds },
                  },
                },
              },
            ],
          },
        ];
      }

      if (featured_only) {
        where.main_category = {
          slug: 'featured',
        };
      }

      const skusConditions: any = {
        inventory: {
          some: {
            qty_on_hand: { gt: 0 },
          },
        },
      };

      if (min_price !== undefined || max_price !== undefined) {
        skusConditions.prices = {
          some: {
            sale_price: {
              ...(min_price !== undefined && { gte: min_price }),
              ...(max_price !== undefined && { lte: max_price }),
            },
          },
        };
      }

      where.skus = {
        some: skusConditions,
      };

      if (attributes.length > 0) {
        const attributeConditions = attributes.map((attr) => {
          const [key, value] = attr.split(':');
          return {
            skus: {
              some: {
                attributes: {
                  some: {
                    attribute: { code: key },
                    OR: [
                      { value_text: value },
                      { attribute_value: { value_text: value } },
                    ],
                  },
                },
                inventory: {
                  some: {
                    qty_on_hand: { gt: 0 },
                  },
                },
              },
            },
          };
        });

        where.AND = [...(where.AND || []), ...attributeConditions];
      }

      let products: any[] = [];
      let total: number;

      if (
        sort_by === ProductSortBy.PRICE_LOW_TO_HIGH ||
        sort_by === ProductSortBy.PRICE_HIGH_TO_LOW
      ) {
        const orderDirection =
          sort_by === ProductSortBy.PRICE_LOW_TO_HIGH ? 'asc' : 'desc';

        const productIdsWithPrice = await this.prisma.$queryRaw<any[]>`
          SELECT p.id, MIN(sp.sale_price) as min_price
          FROM products p
          LEFT JOIN skus s ON s.product_id = p.id
          LEFT JOIN sku_prices sp ON sp.sku_id = s.id
          WHERE p.status = 'ACTIVE'
          AND s.name IS NULL
          AND sp.sale_price IS NOT NULL
          GROUP BY p.id
          ORDER BY min_price ${orderDirection}
          LIMIT ${limit} OFFSET ${skip}
        `;

        const productIds = productIdsWithPrice.map((row) => row.id);

        products = await this.prisma.product.findMany({
          where: {
            ...where,
            id: { in: productIds },
          },
          include: {
            brand: true,
            main_category: true,
            categories: {
              include: { category: true },
            },
            media: {
              where: { sku_id: null },
              orderBy: { sort_order: 'asc' },
              take: 1,
            },
            skus: {
              where: { name: null },
              include: {
                prices: true,
                inventory: true,
              },
            },
          },
        });

        products.sort((a, b) => {
          const indexA = productIds.indexOf(a.id);
          const indexB = productIds.indexOf(b.id);
          return indexA - indexB;
        });

        total = await this.prisma.product.count({ where });
      } else {
        let orderBy: any = { created_at: 'desc' };
        switch (sort_by) {
          case ProductSortBy.HIGHEST_RATED:
            orderBy = { rating_avg: 'desc' };
            break;
          case ProductSortBy.MOST_REVIEWED:
            orderBy = { rating_count: 'desc' };
            break;
          case ProductSortBy.NAME_A_TO_Z:
            orderBy = { title: 'asc' };
            break;
          case ProductSortBy.NAME_Z_TO_A:
            orderBy = { title: 'desc' };
            break;
        }

        [products, total] = await Promise.all([
          this.prisma.product.findMany({
            where,
            skip,
            take: limit,
            orderBy,
            include: {
              brand: true,
              main_category: true,
              categories: {
                include: { category: true },
              },
              media: {
                where: { sku_id: null },
                orderBy: { sort_order: 'asc' },
                take: 1,
              },
              skus: {
                where: { name: null },
                include: {
                  prices: true,
                  inventory: true,
                },
              },
            },
          }),
          this.prisma.product.count({ where }),
        ]);
      }

      const productList: ProductListItemDto[] = products.map((product) => {
        const defaultSku = product.skus[0];
        const price = defaultSku?.prices?.[0];
        const inventory = defaultSku?.inventory?.[0];
        const thumbnail = product.media[0]?.url || '';

        const priceValue = price ? Number(price.sale_price) : 0;
        const compareAtPrice = price?.compare_at_price
          ? Number(price.compare_at_price)
          : undefined;
        const stockQuantity = inventory?.qty_on_hand || 0;

        return {
          id: product.id,
          title: product.title,
          slug: product.slug,
          brand_name: product.brand.name,
          brand_slug: product.brand.slug,
          category_name: product.main_category?.name || 'Uncategorized',
          category_slug: product.main_category?.slug || 'uncategorized',
          sku_code: defaultSku?.sku_code || 'N/A',
          sku_id: defaultSku?.id || '',
          price: priceValue,
          compare_at_price: compareAtPrice,
          discount_percentage: this.calculateDiscountPercentage(
            priceValue,
            compareAtPrice,
          ),
          stock_quantity: stockQuantity,
          stock_status: this.getStockStatus(stockQuantity),
          short_description: product.short_description || undefined,
          thumbnail,
          rating_avg: product.rating_avg
            ? Number(product.rating_avg)
            : undefined,
          rating_count: product.rating_count,
          is_featured: product.main_category?.slug === 'featured',
        };
      });

      const [categoriesResult, brandsResult, priceRangeResult] =
        await Promise.all([
          this.prisma.category.findMany({
            where: {
              products: {
                some: { product: where },
              },
              is_active: true,
            },
            include: {
              parent: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  sort_order: true,
                },
              },
              _count: {
                select: { products: { where: { product: where } } },
              },
            },
            orderBy: [
              { parent_id: 'asc' },
              { sort_order: 'asc' },
              { name: 'asc' },
            ],
          }),
          this.prisma.brand.findMany({
            where: {
              products: { some: where },
              is_active: true,
            },
            include: {
              _count: {
                select: { products: { where } },
              },
            },
            orderBy: { name: 'asc' },
          }),
          this.prisma.skuPrice.aggregate({
            where: {
              sku: {
                product: where,
              },
            },
            _min: { sale_price: true },
            _max: { sale_price: true },
          }),
        ]);

      const sortedCategories = categoriesResult.slice().sort((a, b) => {
        const aParentSort = a.parent?.sort_order ?? a.sort_order ?? 9999;
        const bParentSort = b.parent?.sort_order ?? b.sort_order ?? 9999;
        if (aParentSort !== bParentSort) return aParentSort - bParentSort;

        const aParentName = a.parent?.name || a.name;
        const bParentName = b.parent?.name || b.name;
        const parentCmp = aParentName.localeCompare(bParentName, 'es', {
          sensitivity: 'base',
        });
        if (parentCmp !== 0) return parentCmp;

        const aSort = a.sort_order ?? 9999;
        const bSort = b.sort_order ?? 9999;
        if (aSort !== bSort) return aSort - bSort;

        return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
      });

      const attributeFilters = await this.getAttributeFilters(where);

      const response: ProductsListResponseDto = {
        products: productList,
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
        filters: {
          categories: sortedCategories.map((cat) => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            count: cat._count.products,
            parent_id: cat.parent?.id || null,
            parent_name: cat.parent?.name || null,
            parent_slug: cat.parent?.slug || null,
            display_name: cat.parent
              ? `${cat.parent.name} > ${cat.name}`
              : cat.name,
          })),
          brands: brandsResult.map((brand) => ({
            id: brand.id,
            name: brand.name,
            slug: brand.slug,
            count: brand._count.products,
          })),
          price_range: {
            min: priceRangeResult._min?.sale_price
              ? Number(priceRangeResult._min.sale_price)
              : 0,
            max: priceRangeResult._max?.sale_price
              ? Number(priceRangeResult._max.sale_price)
              : 1000,
          },
          attributes: attributeFilters,
        },
      };

      return response;
    } catch (error) {
      console.error('Get products error:', error);
      throw new BadRequestException('Failed to fetch products');
    }
  }

  private async getAttributeFilters(productWhere: any): Promise<any[]> {
    try {
      const attributes = await this.prisma.attribute.findMany({
        where: {
          is_filterable: true,
          sku_attributes: {
            some: {
              sku: {
                product: productWhere,
              },
            },
          },
        },
        include: {
          sku_attributes: {
            where: {
              sku: {
                product: productWhere,
              },
            },
            distinct: ['value_text', 'attribute_value_id'],
            include: {
              attribute_value: true,
            },
          },
        },
      });

      return attributes.map((attr) => ({
        key: attr.code,
        name: attr.name,
        values: attr.sku_attributes
          .filter((sa) => sa.value_text || sa.attribute_value)
          .map((sa) => ({
            value: sa.attribute_value?.value_text || sa.value_text || '',
            count: 1,
          })),
      }));
    } catch (error) {
      console.error('Get attribute filters error:', error);
      return [];
    }
  }

  async getProductById(id: string): Promise<ProductResponseDto> {
    try {
      const product = await this.prisma.product.findUnique({
        where: {
          id,
          status: 'ACTIVE',
        },
        include: {
          brand: true,
          main_category: true,
          categories: {
            include: { category: true },
          },
          media: {
            orderBy: { sort_order: 'asc' },
          },
          skus: {
            include: {
              prices: true,
              inventory: {
                include: { warehouse: true },
              },
              attributes: {
                include: {
                  attribute: true,
                  attribute_value: true,
                },
              },
              media: true,
            },
          },
          reviews: {
            where: { is_approved: true },
            include: {
              customer: true,
            },
            orderBy: { created_at: 'desc' },
            take: 10,
          },
        },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      return this.transformProductToDto(product);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Get product by id error:', error);
      throw new BadRequestException('Failed to fetch product');
    }
  }

  async getProductBySlug(slug: string): Promise<ProductResponseDto> {
    try {
      const product = await this.prisma.product.findUnique({
        where: {
          slug,
          status: 'ACTIVE',
        },
        include: {
          brand: true,
          main_category: true,
          categories: {
            include: { category: true },
          },
          media: {
            orderBy: { sort_order: 'asc' },
          },
          skus: {
            include: {
              prices: true,
              inventory: {
                include: { warehouse: true },
              },
              attributes: {
                include: {
                  attribute: true,
                  attribute_value: true,
                },
              },
              media: true,
            },
          },
          reviews: {
            where: { is_approved: true },
            include: {
              customer: true,
            },
            orderBy: { created_at: 'desc' },
            take: 10,
          },
        },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      return this.transformProductToDto(product);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Get product by slug error:', error);
      throw new BadRequestException('Failed to fetch product');
    }
  }

  private transformProductToDto(product: any): ProductResponseDto {
    const defaultSku =
      product.skus.find((s: any) => !s.name) || product.skus[0];
    const price = defaultSku?.prices?.[0];
    const inventory = defaultSku?.inventory?.[0];

    const attributeMap = new Map();
    for (const sku of product.skus) {
      for (const attr of sku.attributes) {
        const key = attr.attribute.code;
        const name = attr.attribute.name;
        const dataType = attr.attribute.data_type;

        if (!attributeMap.has(key)) {
          attributeMap.set(key, {
            key,
            name,
            data_type: dataType,
            values: new Set<string>(),
          });
        }

        let value = '';
        if (attr.attribute_value?.value_text) {
          value = attr.attribute_value.value_text;
        } else if (attr.value_text) {
          value = attr.value_text;
        } else if (attr.value_number !== null) {
          value = attr.value_number.toString();
        } else if (attr.value_bool !== null) {
          value = attr.value_bool.toString();
        }

        if (value) {
          attributeMap.get(key).values.add(value);
        }
      }
    }

    const attributes = Array.from(attributeMap.values()).map((attr: any) => ({
      ...attr,
      values: Array.from(attr.values),
    }));

    const variants = product.skus.map((sku: any) => {
      const skuPrice = sku.prices[0];
      const skuInventory = sku.inventory[0];
      const skuImages = sku.media || [];

      return {
        id: sku.id,
        sku_code: sku.sku_code,
        variant_name: sku.name || undefined,
        attributes: sku.attributes.map((attr: any) => ({
          key: attr.attribute.code,
          value:
            attr.attribute_value?.value_text ||
            attr.value_text ||
            (attr.value_number !== null
              ? attr.value_number.toString()
              : attr.value_bool !== null
                ? attr.value_bool.toString()
                : ''),
        })),
        price: skuPrice ? Number(skuPrice.sale_price) : 0,
        compare_at_price: skuPrice?.compare_at_price
          ? Number(skuPrice.compare_at_price)
          : undefined,
        stock_quantity: skuInventory?.qty_on_hand || 0,
        stock_status: this.getStockStatus(skuInventory?.qty_on_hand || 0),
        images: skuImages.map((img: any) => ({
          url: img.url,
          alt_text: img.alt_text || undefined,
          type: img.type,
          sort_order: img.sort_order,
        })),
      };
    });

    const reviews: ProductReviewDto[] = product.reviews.map((review: any) => ({
      id: review.id,
      customer_name: review.customer
        ? `${review.customer.first_name} ${review.customer.last_name}`
        : 'Anonymous',
      rating: review.rating,
      title: review.title || undefined,
      comment: review.comment || undefined,
      created_at: review.created_at,
    }));

    const priceValue = price ? Number(price.sale_price) : 0;
    const compareAtPrice = price?.compare_at_price
      ? Number(price.compare_at_price)
      : undefined;

    return {
      id: product.id,
      title: product.title,
      slug: product.slug,
      brand: {
        id: product.brand.id,
        name: product.brand.name,
        slug: product.brand.slug,
        logo_url: product.brand.logo_url || undefined,
      },
      categories: product.categories.map((pc: any) => ({
        id: pc.category.id,
        name: pc.category.name,
        slug: pc.category.slug,
      })),
      main_category: product.main_category
        ? {
            id: product.main_category.id,
            name: product.main_category.name,
            slug: product.main_category.slug,
          }
        : undefined,
      sku_code: defaultSku?.sku_code || '',
      sku_id: defaultSku?.id || '',
      price: priceValue,
      compare_at_price: compareAtPrice,
      discount_percentage: this.calculateDiscountPercentage(
        priceValue,
        compareAtPrice,
      ),
      stock_quantity: inventory?.qty_on_hand || 0,
      stock_status: this.getStockStatus(inventory?.qty_on_hand || 0),
      description_html: product.description_html || undefined,
      short_description: product.short_description || undefined,
      images: product.media.map((img: any) => ({
        url: img.url,
        alt_text: img.alt_text || undefined,
        type: img.type,
        sort_order: img.sort_order,
      })),
      attributes,
      variants,
      rating_avg: product.rating_avg ? Number(product.rating_avg) : undefined,
      rating_count: product.rating_count,
      is_featured: product.main_category?.slug === 'featured',
      created_at: product.created_at,
      updated_at: product.updated_at,
      reviews,
    };
  }

  async getRelatedProducts(
    productId: string,
    limit: number = 4,
  ): Promise<ProductListItemDto[]> {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        include: {
          categories: {
            include: { category: true },
          },
        },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const categoryIds = product.categories.map((pc) => pc.category_id);

      const relatedProducts = await this.prisma.product.findMany({
        where: {
          id: { not: productId },
          status: 'ACTIVE',
          categories: {
            some: {
              category_id: { in: categoryIds },
            },
          },
          skus: {
            some: {
              inventory: {
                some: {
                  qty_on_hand: { gt: 0 },
                },
              },
            },
          },
        },
        take: limit,
        include: {
          brand: true,
          main_category: true,
          media: {
            where: { sku_id: null },
            orderBy: { sort_order: 'asc' },
            take: 1,
          },
          skus: {
            where: { name: null },
            include: {
              prices: true,
              inventory: true,
            },
          },
        },
      });

      return relatedProducts.map((product) => {
        const defaultSku = product.skus[0];
        const price = defaultSku?.prices?.[0];
        const inventory = defaultSku?.inventory?.[0];
        const thumbnail = product.media[0]?.url || '';

        const priceValue = price ? Number(price.sale_price) : 0;
        const compareAtPrice = price?.compare_at_price
          ? Number(price.compare_at_price)
          : undefined;
        const stockQuantity = inventory?.qty_on_hand || 0;

        return {
          id: product.id,
          title: product.title,
          slug: product.slug,
          brand_name: product.brand.name,
          brand_slug: product.brand.slug,
          category_name: product.main_category?.name || 'Uncategorized',
          category_slug: product.main_category?.slug || 'uncategorized',
          sku_code: defaultSku?.sku_code || 'N/A',
          sku_id: defaultSku?.id || '',
          price: priceValue,
          compare_at_price: compareAtPrice,
          discount_percentage: this.calculateDiscountPercentage(
            priceValue,
            compareAtPrice,
          ),
          stock_quantity: stockQuantity,
          stock_status: this.getStockStatus(stockQuantity),
          short_description: product.short_description || undefined,
          thumbnail,
          rating_avg: product.rating_avg
            ? Number(product.rating_avg)
            : undefined,
          rating_count: product.rating_count,
          is_featured: product.main_category?.slug === 'featured',
        };
      });
    } catch (error) {
      console.error('Get related products error:', error);
      return [];
    }
  }

  async getFeaturedProducts(limit: number = 8): Promise<ProductListItemDto[]> {
    try {
      const featuredProducts = await this.prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          main_category: {
            slug: 'featured',
          },
          skus: {
            some: {
              inventory: {
                some: {
                  qty_on_hand: { gt: 0 },
                },
              },
            },
          },
        },
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          brand: true,
          main_category: true,
          media: {
            where: { sku_id: null },
            orderBy: { sort_order: 'asc' },
            take: 1,
          },
          skus: {
            where: { name: null },
            include: {
              prices: true,
              inventory: true,
            },
          },
        },
      });

      return featuredProducts.map((product) => {
        const defaultSku = product.skus[0];
        const price = defaultSku?.prices?.[0];
        const inventory = defaultSku?.inventory?.[0];
        const thumbnail = product.media[0]?.url || '';

        const priceValue = price ? Number(price.sale_price) : 0;
        const compareAtPrice = price?.compare_at_price
          ? Number(price.compare_at_price)
          : undefined;
        const stockQuantity = inventory?.qty_on_hand || 0;

        return {
          id: product.id,
          title: product.title,
          slug: product.slug,
          brand_name: product.brand.name,
          brand_slug: product.brand.slug,
          category_name: product.main_category?.name || 'Uncategorized',
          category_slug: product.main_category?.slug || 'uncategorized',
          sku_code: defaultSku?.sku_code || 'N/A',
          sku_id: defaultSku?.id || '',
          price: priceValue,
          compare_at_price: compareAtPrice,
          discount_percentage: this.calculateDiscountPercentage(
            priceValue,
            compareAtPrice,
          ),
          stock_quantity: stockQuantity,
          stock_status: this.getStockStatus(stockQuantity),
          short_description: product.short_description || undefined,
          thumbnail,
          rating_avg: product.rating_avg
            ? Number(product.rating_avg)
            : undefined,
          rating_count: product.rating_count,
          is_featured: true,
        };
      });
    } catch (error) {
      console.error('Get featured products error:', error);
      return [];
    }
  }

  async createReview(
    productId: string,
    customerId: string,
    dto: CreateReviewDto,
  ) {
    try {
      const product = await this.prisma.product.findUnique({
        where: {
          id: productId,
          status: 'ACTIVE',
        },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const existingReview = await this.prisma.productReview.findUnique({
        where: {
          product_id_customer_id: {
            product_id: productId,
            customer_id: customerId,
          },
        },
      });

      if (existingReview) {
        throw new BadRequestException('You have already reviewed this product');
      }

      const review = await this.prisma.productReview.create({
        data: {
          product_id: productId,
          customer_id: customerId,
          rating: dto.rating,
          title: dto.title,
          comment: dto.comment,
          is_approved: false,
        },
      });

      return {
        success: true,
        message: 'Review submitted successfully and is pending approval',
        review,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error('Create review error:', error);
      throw new BadRequestException('Failed to create review');
    }
  }

  async searchProducts(
    query: string,
    limit: number = 10,
  ): Promise<ProductListItemDto[]> {
    try {
      const products = await this.prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          skus: {
            some: {
              inventory: {
                some: {
                  qty_on_hand: { gt: 0 },
                },
              },
            },
          },
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { short_description: { contains: query, mode: 'insensitive' } },
            { description_html: { contains: query, mode: 'insensitive' } },
            {
              skus: {
                some: { sku_code: { contains: query, mode: 'insensitive' } },
              },
            },
          ],
        },
        take: limit,
        include: {
          brand: true,
          main_category: true,
          media: {
            where: { sku_id: null },
            orderBy: { sort_order: 'asc' },
            take: 1,
          },
          skus: {
            where: { name: null },
            include: {
              prices: true,
              inventory: true,
            },
          },
        },
      });

      return products.map((product) => {
        const defaultSku = product.skus[0];
        const price = defaultSku?.prices?.[0];
        const inventory = defaultSku?.inventory?.[0];
        const thumbnail = product.media[0]?.url || '';

        const priceValue = price ? Number(price.sale_price) : 0;
        const compareAtPrice = price?.compare_at_price
          ? Number(price.compare_at_price)
          : undefined;
        const stockQuantity = inventory?.qty_on_hand || 0;

        return {
          id: product.id,
          title: product.title,
          slug: product.slug,
          brand_name: product.brand.name,
          brand_slug: product.brand.slug,
          category_name: product.main_category?.name || 'Uncategorized',
          category_slug: product.main_category?.slug || 'uncategorized',
          sku_code: defaultSku?.sku_code || 'N/A',
          sku_id: defaultSku?.id || '',
          price: priceValue,
          compare_at_price: compareAtPrice,
          discount_percentage: this.calculateDiscountPercentage(
            priceValue,
            compareAtPrice,
          ),
          stock_quantity: stockQuantity,
          stock_status: this.getStockStatus(stockQuantity),
          short_description: product.short_description || undefined,
          thumbnail,
          rating_avg: product.rating_avg
            ? Number(product.rating_avg)
            : undefined,
          rating_count: product.rating_count,
          is_featured: product.main_category?.slug === 'featured',
        };
      });
    } catch (error) {
      console.error('Search products error:', error);
      return [];
    }
  }

  async upsertFromInfortisa(
    p: any,
  ): Promise<'created' | 'updated' | 'skipped'> {
    const skuCode = normalizeSku(p.SKU);
    const title = String(p.Name || 'Unknown Product');
    const price = Number(p.Price || 0);
    const stock = Number(p.Stock || 0);
    const stockPalma = Number(p.StockPalma || 0);
    const totalStock = stock + stockPalma;

    const image = p.PictureUrl || null;
    const brandName = String(p.ManufacturerName || 'Infortisa');
    const shortDesc = p.ShortDescription || null;
    const fullDesc = p.FullDescription || null;

    if (!skuCode || !title) {
      return 'skipped';
    }

    const productSlug = generateDeterministicProductSlug(title, skuCode);
    if (!productSlug) {
      return 'skipped';
    }

    const infortisaFamily = p.FamilyName
      ? String(p.FamilyName)
      : p.TITULO_FAMILIA
        ? String(p.TITULO_FAMILIA)
        : null;
    const infortisaSubfamily = p.SubfamilyName
      ? String(p.SubfamilyName)
      : p.TITULOSUBFAMILIA
        ? String(p.TITULOSUBFAMILIA)
        : p.CategoryName
          ? String(p.CategoryName)
          : 'Infortisa';

    const recommendedParent = recommendParentCategory(
      infortisaFamily,
      infortisaSubfamily,
    );

    const parentCategorySlug = slugifyCategory(recommendedParent.key);
    const parentCategorySortOrder = getParentCategorySortOrder(
      recommendedParent.label,
    );

    const parentCategory = await this.prisma.category.upsert({
      where: { slug: parentCategorySlug },
      update: {
        name: recommendedParent.label,
        is_active: true,
        sort_order: parentCategorySortOrder,
      },
      create: {
        name: recommendedParent.label,
        slug: parentCategorySlug,
        is_active: true,
        sort_order: parentCategorySortOrder,
      },
    });

    const categoryName = infortisaSubfamily;
    const childSlugPart = slugifyCategory(categoryName) || 'general';
    const categorySlug = `${parentCategorySlug}-${childSlugPart}`;
    const level2Descriptor = buildCategoryLevel2Descriptor(parentCategorySlug, {
      familyName: infortisaFamily,
      name: categoryName,
      slug: categorySlug,
      subfamilyName: infortisaSubfamily,
      name: categoryName,
      slug: categorySlug,
    });
    const level2Category = await this.prisma.category.upsert({
      where: { slug: level2Descriptor.slug },
      update: {
        name: level2Descriptor.name,
        parent_id: parentCategory.id,
        is_active: true,
        sort_order: parentCategorySortOrder * 100 + level2Descriptor.sort_order,
      },
      create: {
        parent_id: parentCategory.id,
        name: level2Descriptor.name,
        slug: level2Descriptor.slug,
        is_active: true,
        sort_order: parentCategorySortOrder * 100 + level2Descriptor.sort_order,
      },
    });

    const existingCategory = await this.prisma.category.findUnique({
      where: { slug: categorySlug },
      select: {
        id: true,
        parent_id: true,
        parent_locked: true,
        parent: {
          select: {
            slug: true,
          },
        },
      },
    });

    const shouldReparent = shouldReparentImportedCategory({
      isNewCategory: !existingCategory,
      isParentLocked: Boolean(existingCategory?.parent_locked),
      hasKnownCurrentParent: isKnownParentCategorySlug(
        existingCategory?.parent?.slug,
      ),
      currentParentSlug: existingCategory?.parent?.slug,
      recommendedParentSlug: parentCategory.slug,
    });

    const category = existingCategory
      ? await this.prisma.category.update({
          where: { slug: categorySlug },
          data: {
            parent_id: shouldReparent
              ? level2Category.id
              : existingCategory.parent_id,
            name: categoryName,
            is_active: true,
          },
        })
      : await this.prisma.category.create({
          data: {
            parent_id: level2Category.id,
            name: categoryName,
            slug: categorySlug,
            is_active: true,
            sort_order: 0,
          },
        });

    const brandSlug = slugifyCategory(brandName) || 'infortisa';
    let brand = await this.prisma.brand.findFirst({
      where: { slug: brandSlug },
    });

    if (!brand) {
      brand = await this.prisma.brand.create({
        data: {
          name: brandName,
          slug: brandSlug,
        },
      });
    }

    let warehouse = await this.prisma.warehouse.findFirst({
      where: { code: 'INFORTISA' },
    });

    if (!warehouse) {
      warehouse = await this.prisma.warehouse.create({
        data: {
          name: 'Infortisa Warehouse',
          code: 'INFORTISA',
        },
      });
    }

    const existingSku = await this.prisma.sku.findUnique({
      where: { sku_code: skuCode },
      include: { product: true },
    });

    if (!existingSku) {
      const product = await this.prisma.product.create({
        data: {
          title,
          slug: productSlug,
          short_description: shortDesc,
          description_html: fullDesc,
          status: 'ACTIVE',
          brand_id: brand.id,
          main_category_id: category.id,
        },
      });

      await this.prisma.productCategory.create({
        data: {
          product_id: product.id,
          category_id: category.id,
          sort_order: 0,
        },
      });

      const newSku = await this.prisma.sku.create({
        data: {
          sku_code: skuCode,
          product_id: product.id,
          status: 'ACTIVE',
        },
      });

      await this.pricingService.applyAndUpsertSkuPriceBySkuId({
        skuId: newSku.id,
        costPrice: price,
        fallbackSource: 'INFORTISA',
      });

      await this.prisma.inventoryLevel.create({
        data: {
          sku_id: newSku.id,
          warehouse_id: warehouse.id,
          qty_on_hand: totalStock,
          qty_reserved: 0,
        },
      });

      if (image) {
        await this.prisma.productMedia.create({
          data: {
            product_id: product.id,
            url: image,
            type: 'IMAGE',
            sort_order: 0,
          },
        });
      }

      return 'created';
    } else {
      await this.prisma.product.update({
        where: { id: existingSku.product_id },
        data: {
          title,
          slug: productSlug,
          short_description: shortDesc,
          description_html: fullDesc,
          brand_id: brand.id,
          main_category_id: category.id,
          status: 'ACTIVE',
        },
      });

      await this.prisma.productCategory.upsert({
        where: {
          product_id_category_id: {
            product_id: existingSku.product_id,
            category_id: category.id,
          },
        },
        update: {},
        create: {
          product_id: existingSku.product_id,
          category_id: category.id,
          sort_order: 0,
        },
      });

      await this.pricingService.applyAndUpsertSkuPriceBySkuId({
        skuId: existingSku.id,
        costPrice: price,
        fallbackSource: 'INFORTISA',
      });

      await this.prisma.inventoryLevel.upsert({
        where: {
          warehouse_id_sku_id: {
            warehouse_id: warehouse.id,
            sku_id: existingSku.id,
          },
        },
        update: { qty_on_hand: totalStock },
        create: {
          warehouse_id: warehouse.id,
          sku_id: existingSku.id,
          qty_on_hand: totalStock,
          qty_reserved: 0,
        },
      });

      const existingImage = await this.prisma.productMedia.findFirst({
        where: {
          product_id: existingSku.product_id,
          sku_id: null,
        },
      });

      if (image && !existingImage) {
        await this.prisma.productMedia.create({
          data: {
            product_id: existingSku.product_id,
            url: image,
            type: 'IMAGE',
            sort_order: 0,
          },
        });
      }

      return 'updated';
    }
  }

  async getBySku(skuCode: string): Promise<any> {
    try {
      const sku = await this.prisma.sku.findFirst({
        where: {
          OR: [
            { sku_code: skuCode },
            { sku_code: skuCode.toUpperCase() },
            { sku_code: skuCode.toLowerCase() },
          ],
          status: 'ACTIVE',
        },
        include: {
          product: true,
        },
      });

      if (!sku) {
        throw new NotFoundException(`SKU '${skuCode}' not found`);
      }

      const product = await this.prisma.product.findFirst({
        where: {
          id: sku.product_id,
          status: 'ACTIVE',
        },
        include: {
          brand: true,
        },
      });

      if (!product) {
        throw new NotFoundException(
          `Product for SKU '${skuCode}' is not active`,
        );
      }

      const price = await this.prisma.skuPrice.findFirst({
        where: { sku_id: sku.id },
        orderBy: { updated_at: 'desc' },
      });

      const inventory = await this.prisma.inventoryLevel.aggregate({
        where: { sku_id: sku.id },
        _sum: {
          qty_on_hand: true,
          qty_reserved: true,
        },
      });

      const availableStock =
        (inventory._sum.qty_on_hand || 0) - (inventory._sum.qty_reserved || 0);

      return {
        id: sku.id,
        sku_code: sku.sku_code,
        product_id: sku.product_id,
        product_title: product.title,
        brand_name: product.brand?.name || 'Unknown',
        price: price?.sale_price || 0,
        stock_quantity: availableStock,
        in_stock: availableStock > 0,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error in getBySku:', error);
      throw new BadRequestException('Failed to fetch product by SKU');
    }
  }
}
