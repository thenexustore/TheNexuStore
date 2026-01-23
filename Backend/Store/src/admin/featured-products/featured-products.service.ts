import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateFeaturedProductDto } from './dto/create-featured-product.dto';
import { UpdateFeaturedProductDto } from './dto/update-featured-product.dto';
import { UpdateFeaturedProductOrderDto } from './dto/update-featured-product-order.dto';

@Injectable()
export class FeaturedProductsService {
  private readonly logger = new Logger(FeaturedProductsService.name);

  constructor(private prisma: PrismaService) {}

  private async checkProductInventory(productId: string): Promise<boolean> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        skus: {
          include: {
            inventory: true,
          },
        },
      },
    });

    if (!product) return false;

    return product.skus.some((sku) =>
      sku.inventory.some((inv) => inv.qty_on_hand > 0),
    );
  }

  private async deleteOutOfStockFeaturedProducts(): Promise<void> {
    try {
      const featuredProducts = await this.prisma.featuredProduct.findMany({
        include: {
          product: {
            include: {
              skus: {
                include: {
                  inventory: true,
                },
              },
            },
          },
        },
      });

      const outOfStockIds: string[] = [];

      for (const featured of featuredProducts) {
        const hasInventory = featured.product.skus.some((sku) =>
          sku.inventory.some((inv) => inv.qty_on_hand > 0),
        );

        if (!hasInventory) {
          outOfStockIds.push(featured.id);
        }
      }

      if (outOfStockIds.length > 0) {
        await this.prisma.featuredProduct.deleteMany({
          where: { id: { in: outOfStockIds } },
        });

        this.logger.log(
          `Automatically deleted ${outOfStockIds.length} out-of-stock featured products`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Error deleting out-of-stock featured products:',
        error,
      );
    }
  }

  async create(createFeaturedProductDto: CreateFeaturedProductDto) {
    await this.deleteOutOfStockFeaturedProducts();

    const product = await this.prisma.product.findUnique({
      where: { id: createFeaturedProductDto.product_id },
      include: {
        brand: true,
        main_category: true,
        skus: {
          include: {
            inventory: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const hasInventory = await this.checkProductInventory(
      createFeaturedProductDto.product_id,
    );
    if (!hasInventory) {
      throw new BadRequestException(
        'Product is out of stock and cannot be featured',
      );
    }

    const existing = await this.prisma.featuredProduct.findUnique({
      where: { product_id: createFeaturedProductDto.product_id },
    });

    if (existing) {
      throw new NotFoundException('Product is already featured');
    }

    const maxSortOrder = await this.prisma.featuredProduct.aggregate({
      _max: { sort_order: true },
    });

    const sortOrder =
      createFeaturedProductDto.sort_order ||
      (maxSortOrder._max.sort_order || 0) + 1;

    const featuredProduct = await this.prisma.featuredProduct.create({
      data: {
        product_id: createFeaturedProductDto.product_id,
        title: createFeaturedProductDto.title || product.title,
        subtitle:
          createFeaturedProductDto.subtitle ||
          product.short_description?.substring(0, 100),
        description:
          createFeaturedProductDto.description ||
          product.description_html?.substring(0, 200),
        image_url: createFeaturedProductDto.image_url,
        badge_text: createFeaturedProductDto.badge_text,
        badge_color: createFeaturedProductDto.badge_color || 'bg-blue-500',
        button_text: createFeaturedProductDto.button_text || 'Shop Now',
        button_link:
          createFeaturedProductDto.button_link || `/products/${product.slug}`,
        layout_type: createFeaturedProductDto.layout_type || 'default',
        sort_order: sortOrder,
        is_active: createFeaturedProductDto.is_active ?? true,
      },
      include: {
        product: {
          include: {
            brand: true,
            main_category: true,
            skus: {
              include: {
                prices: true,
                inventory: true,
              },
            },
          },
        },
      },
    });

    return {
      success: true,
      data: featuredProduct,
      message: 'Featured product created successfully',
    };
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    is_active?: boolean;
    category_id?: string;
    search?: string;
  }) {
    await this.deleteOutOfStockFeaturedProducts();

    const { skip, take, is_active, category_id, search } = params;

    const where: any = {};

    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { subtitle: { contains: search, mode: 'insensitive' } },
        {
          product: {
            title: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const featuredProducts = await this.prisma.featuredProduct.findMany({
      skip,
      take,
      where,
      include: {
        product: {
          include: {
            brand: true,
            main_category: true,
            skus: {
              include: {
                prices: true,
                inventory: true,
              },
            },
          },
        },
      },
      orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }],
    });

    const total = await this.prisma.featuredProduct.count({ where });

    return {
      success: true,
      data: featuredProducts,
      meta: {
        total: featuredProducts.length,
        skip: skip || 0,
        take: take || featuredProducts.length,
        originalTotal: total,
      },
    };
  }

  async findOne(id: string) {
    await this.deleteOutOfStockFeaturedProducts();

    const featuredProduct = await this.prisma.featuredProduct.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            brand: true,
            main_category: true,
            skus: {
              include: {
                prices: true,
                inventory: true,
              },
            },
          },
        },
      },
    });

    if (!featuredProduct) {
      throw new NotFoundException('Featured product not found');
    }

    const hasInventory = featuredProduct.product.skus.some((sku) =>
      sku.inventory.some((inv) => inv.qty_on_hand > 0),
    );

    if (!hasInventory) {
      throw new BadRequestException('Product is out of stock');
    }

    return {
      success: true,
      data: featuredProduct,
    };
  }

  async update(id: string, updateFeaturedProductDto: UpdateFeaturedProductDto) {
    await this.deleteOutOfStockFeaturedProducts();

    const existing = await this.prisma.featuredProduct.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Featured product not found');
    }

    if (
      updateFeaturedProductDto.product_id &&
      updateFeaturedProductDto.product_id !== existing.product_id
    ) {
      const product = await this.prisma.product.findUnique({
        where: { id: updateFeaturedProductDto.product_id },
        include: {
          skus: {
            include: {
              inventory: true,
            },
          },
        },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const hasInventory = await this.checkProductInventory(
        updateFeaturedProductDto.product_id,
      );
      if (!hasInventory) {
        throw new BadRequestException(
          'Product is out of stock and cannot be featured',
        );
      }

      const duplicate = await this.prisma.featuredProduct.findUnique({
        where: { product_id: updateFeaturedProductDto.product_id },
      });

      if (duplicate && duplicate.id !== id) {
        throw new NotFoundException('Product is already featured');
      }
    }

    if (
      updateFeaturedProductDto.product_id &&
      updateFeaturedProductDto.product_id === existing.product_id
    ) {
      const hasInventory = await this.checkProductInventory(
        existing.product_id,
      );
      if (!hasInventory) {
        throw new BadRequestException(
          'Product is out of stock and cannot be featured',
        );
      }
    }

    const featuredProduct = await this.prisma.featuredProduct.update({
      where: { id },
      data: updateFeaturedProductDto,
      include: {
        product: {
          include: {
            brand: true,
            main_category: true,
            skus: {
              include: {
                prices: true,
                inventory: true,
              },
            },
          },
        },
      },
    });

    return {
      success: true,
      data: featuredProduct,
      message: 'Featured product updated successfully',
    };
  }

  async remove(id: string) {
    const existing = await this.prisma.featuredProduct.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Featured product not found');
    }

    await this.prisma.featuredProduct.delete({
      where: { id },
    });

    return { success: true, message: 'Featured product deleted successfully' };
  }

  async updateOrder(updateOrderDto: UpdateFeaturedProductOrderDto) {
    const updates = updateOrderDto.items.map((item) =>
      this.prisma.featuredProduct.update({
        where: { id: item.id },
        data: { sort_order: item.sort_order },
      }),
    );

    await this.prisma.$transaction(updates);

    return { success: true, message: 'Featured products order updated' };
  }

  async toggleStatus(id: string) {
    await this.deleteOutOfStockFeaturedProducts();

    const featuredProduct = await this.prisma.featuredProduct.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            skus: {
              include: {
                inventory: true,
              },
            },
          },
        },
      },
    });

    if (!featuredProduct) {
      throw new NotFoundException('Featured product not found');
    }

    const hasInventory = featuredProduct.product.skus.some((sku) =>
      sku.inventory.some((inv) => inv.qty_on_hand > 0),
    );

    if (!hasInventory) {
      throw new BadRequestException('Cannot activate out of stock product');
    }

    const updated = await this.prisma.featuredProduct.update({
      where: { id },
      data: { is_active: !featuredProduct.is_active },
      include: {
        product: {
          include: {
            brand: true,
            main_category: true,
          },
        },
      },
    });

    return {
      success: true,
      data: updated,
      message: `Featured product ${updated.is_active ? 'activated' : 'deactivated'} successfully`,
    };
  }

  async getProductOptions(search?: string) {
    await this.deleteOutOfStockFeaturedProducts();

    const where: any = {
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
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        {
          skus: {
            some: { sku_code: { contains: search, mode: 'insensitive' } },
          },
        },
      ];
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        brand: true,
        main_category: true,
        skus: {
          include: {
            prices: true,
            inventory: true,
          },
          take: 1,
        },
        media: {
          where: { type: 'IMAGE' },
          take: 1,
        },
      },
      take: 20,
      orderBy: { title: 'asc' },
    });

    return {
      success: true,
      data: products.map((product) => ({
        id: product.id,
        title: product.title,
        sku: product.skus[0]?.sku_code,
        brand: product.brand.name,
        category: product.main_category?.name,
        price: product.skus[0]?.prices[0]?.sale_price,
        image: product.media[0]?.url,
      })),
    };
  }

  async cleanupOutOfStockFeaturedProducts() {
    try {
      const featuredProducts = await this.prisma.featuredProduct.findMany({
        include: {
          product: {
            include: {
              skus: {
                include: {
                  inventory: true,
                },
              },
            },
          },
        },
      });
      const outOfStockFeaturedIds: string[] = [];

      for (const featured of featuredProducts) {
        const hasInventory = featured.product.skus.some((sku) =>
          sku.inventory.some((inv) => inv.qty_on_hand > 0),
        );

        if (!hasInventory) {
          outOfStockFeaturedIds.push(featured.id);
        }
      }

      if (outOfStockFeaturedIds.length > 0) {
        await this.prisma.featuredProduct.deleteMany({
          where: { id: { in: outOfStockFeaturedIds } },
        });
      }

      return {
        success: true,
        message: `Deleted ${outOfStockFeaturedIds.length} out-of-stock featured products`,
        count: outOfStockFeaturedIds.length,
      };
    } catch (error) {
      console.error('Cleanup out of stock featured products error:', error);
      throw new BadRequestException('Failed to cleanup featured products');
    }
  }
}
