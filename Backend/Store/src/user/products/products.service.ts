import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
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
        category,
        brand,
        categories: categoryList,
        sort_by = ProductSortBy.NEWEST,
        min_price,
        max_price,
        status = ProductStatus.ACTIVE,
        in_stock_only = false,
        featured_only = false,
        attributes = [],
      } = dto;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {
        status: status === ProductStatus.ACTIVE ? 'ACTIVE' : undefined,
      };

      // Search filter
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

      // Category filter
      if (category || categoryList) {
        const categoryIds: string[] = [];
        if (category) categoryIds.push(category);
        if (categoryList && Array.isArray(categoryList))
          categoryIds.push(...categoryList);

        where.categories = {
          some: {
            category_id: { in: categoryIds },
          },
        };
      }

      // Brand filter
      if (brand) {
        where.brand = {
          OR: [{ id: brand }, { slug: brand }],
        };
      }

      // Featured filter
      if (featured_only) {
        where.main_category = {
          slug: 'featured',
        };
      }

      // Price range filter
      if (min_price !== undefined || max_price !== undefined) {
        where.skus = {
          some: {
            prices: {
              some: {
                sale_price: {
                  ...(min_price !== undefined && { gte: min_price }),
                  ...(max_price !== undefined && { lte: max_price }),
                },
              },
            },
          },
        };
      }

      // Stock filter
      if (in_stock_only) {
        where.skus = {
          ...where.skus,
          some: {
            inventory: {
              some: {
                qty_on_hand: { gt: 0 },
              },
            },
          },
        };
      }

      // Attribute filters
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
              },
            },
          };
        });

        where.AND = [...(where.AND || []), ...attributeConditions];
      }

      // Build orderBy based on sort option
      let orderBy: any = { created_at: 'desc' };
      switch (sort_by) {
        case ProductSortBy.PRICE_LOW_TO_HIGH:
          orderBy = {
            skus: {
              prices: {
                sale_price: 'asc',
              },
            },
          };
          break;
        case ProductSortBy.PRICE_HIGH_TO_LOW:
          orderBy = {
            skus: {
              prices: {
                sale_price: 'desc',
              },
            },
          };
          break;
        case ProductSortBy.BEST_SELLING:
          // This would require order item tracking - for now use newest
          orderBy = { created_at: 'desc' };
          break;
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

      // Fetch products
      const [products, total] = await Promise.all([
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
              where: { name: null }, // Default SKU
              include: {
                prices: true,
                inventory: true,
              },
            },
          },
        }),
        this.prisma.product.count({ where }),
      ]);

      // Transform to DTO
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

      // Get filter options for the current result set
      const [categoriesResult, brandsResult, priceRangeResult] =
        await Promise.all([
          // Get categories with counts
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
          // Get brands with counts
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
          // Get price range
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

      // Get attribute filters
      const attributeFilters = await this.getAttributeFilters(where);

      const response: ProductsListResponseDto = {
        products: productList,
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
        filters: {
          categories: Array.isArray(categoriesResult)
            ? categoriesResult.map((cat) => ({
                id: cat.id,
                name: cat.name,
                slug: cat.slug,
                count: cat._count.products,
              }))
            : [],
          brands: Array.isArray(brandsResult)
            ? brandsResult.map((brand) => ({
                id: brand.id,
                name: brand.name,
                slug: brand.slug,
                count: brand._count.products,
              }))
            : [],
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
            count: 1, // This should be aggregated count in a real scenario
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

    // Group attributes by key
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
      // Check if product exists and is active
      const product = await this.prisma.product.findUnique({
        where: {
          id: productId,
          status: 'ACTIVE',
        },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // Check if customer already reviewed this product
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

      // Create review
      const review = await this.prisma.productReview.create({
        data: {
          product_id: productId,
          customer_id: customerId,
          rating: dto.rating,
          title: dto.title,
          comment: dto.comment,
          is_approved: false, // Requires admin approval
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
}
