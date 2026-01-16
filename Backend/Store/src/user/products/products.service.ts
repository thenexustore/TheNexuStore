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

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

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

  async getProducts(dto: GetProductsDto): Promise<ProductsListResponseDto> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
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

      if (categories && categories.length > 0) {
        const categoryRecords = await this.prisma.category.findMany({
          where: { slug: { in: categories } },
          select: { id: true },
        });

        if (categoryRecords.length > 0) {
          const categoryIds = categoryRecords.map((c) => c.id);
          where.categories = {
            some: {
              category_id: { in: categoryIds },
            },
          };
        }
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

      if (sort_by === ProductSortBy.PRICE_LOW_TO_HIGH || sort_by === ProductSortBy.PRICE_HIGH_TO_LOW) {
        const orderDirection = sort_by === ProductSortBy.PRICE_LOW_TO_HIGH ? 'asc' : 'desc';
        
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

        const productIds = productIdsWithPrice.map(row => row.id);

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
              _count: {
                select: { products: { where: { product: where } } },
              },
            },
            orderBy: { sort_order: 'asc' },
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

      const attributeFilters = await this.getAttributeFilters(where);

      const response: ProductsListResponseDto = {
        products: productList,
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
        filters: {
          categories: categoriesResult.map((cat) => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            count: cat._count.products,
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
    const skuCode = String(p.SKU);
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

    const categoryName = p.CategoryName ? String(p.CategoryName) : 'Infortisa';
    const categorySlug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    let category = await this.prisma.category.findFirst({
      where: { slug: categorySlug },
    });

    if (!category) {
      category = await this.prisma.category.create({
        data: {
          name: categoryName,
          slug: categorySlug,
          is_active: true,
          sort_order: 0,
        },
      });
    }

    const brandSlug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
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
      const productSlug = p.slug || skuCode.toLowerCase();

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

      await this.prisma.skuPrice.create({
        data: {
          sku_id: newSku.id,
          sale_price: price,
          currency: 'EUR',
          price_source: 'INFORTISA',
        },
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

      await this.prisma.skuPrice.upsert({
        where: { sku_id: existingSku.id },
        update: { sale_price: price },
        create: {
          sku_id: existingSku.id,
          sale_price: price,
          currency: 'EUR',
          price_source: 'INFORTISA',
        },
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
}