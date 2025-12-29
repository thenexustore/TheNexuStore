import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async getProducts(
    page: number,
    limit: number,
    search?: string,
    status?: string,
  ) {
    try {
      const skip = (page - 1) * limit;

      const where: any = {};

      if (status && status !== 'all') {
        where.status = status as 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description_html: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [products, total] = await Promise.all([
        this.prisma.product.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
          include: {
            brand: true,
          },
        }),
        this.prisma.product.count({ where }),
      ]);

      const productsWithDetails: Array<{
        id: string;
        title: string;
        brand: string;
        categories: string[];
        skusCount: number;
        status: string;
        createdAt: Date;
        price: number;
        compareAtPrice: number | null;
        stock: number;
      }> = [];

      for (const product of products) {
        const [categories, skus, firstSku] = await Promise.all([
          this.prisma.productCategory.findMany({
            where: { product_id: product.id },
            include: { category: true },
          }),
          this.prisma.sku.findMany({
            where: { product_id: product.id },
          }),
          this.prisma.sku.findFirst({
            where: { product_id: product.id },
            include: {
              prices: {
                take: 1,
                orderBy: { updated_at: 'desc' },
              },
              inventory: {
                take: 1,
              },
            },
          }),
        ]);

        const priceData = firstSku?.prices[0];
        const inventoryData = firstSku?.inventory[0];

        productsWithDetails.push({
          id: product.id,
          title: product.title,
          brand: product.brand?.name || 'No Brand',
          categories: categories.map((pc) => pc.category.name),
          skusCount: skus.length,
          status: product.status,
          createdAt: product.created_at,
          price: priceData?.sale_price ? Number(priceData.sale_price) : 0,
          compareAtPrice: priceData?.compare_at_price
            ? Number(priceData.compare_at_price)
            : null,
          stock: inventoryData?.qty_on_hand || 0,
        });
      }

      return {
        products: productsWithDetails,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('Get products error:', error);
      throw new Error('Failed to fetch products');
    }
  }

  async getProductById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        skus: {
          include: {
            media: true,
            prices: true,
            inventory: {
              include: { warehouse: true },
            },
          },
        },
        media: {
          orderBy: { sort_order: 'asc' },
        },
        categories: {
          include: { category: true },
        },
      },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    const transformedSkus = await Promise.all(
      product.skus.map(async (sku) => {
        const price = sku.prices[0] || null;
        const inventory = sku.inventory[0] || null;

        return {
          ...sku,
          price: price
            ? {
                sale_price: Number(price.sale_price),
                compare_at_price: price.compare_at_price
                  ? Number(price.compare_at_price)
                  : null,
                currency: price.currency,
              }
            : null,
          inventory: inventory
            ? {
                qty_on_hand: inventory.qty_on_hand,
                qty_reserved: inventory.qty_reserved,
                warehouse: inventory.warehouse,
              }
            : null,
        };
      }),
    );

    return {
      ...product,
      categories: product.categories.map((pc) => pc.category),
      skus: transformedSkus,
    };
  }

  async createProduct(data: CreateProductDto) {
    try {
      const {
        title,
        brandId,
        description_html,
        short_description,
        status,
        categories,
        images_base64,
        sale_price,
        compare_at_price,
        qty_on_hand,
      } = data;

      if (!brandId) {
        throw new Error('Brand is required');
      }

      // Convert status to proper enum value
      let productStatus: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' = 'DRAFT';
      if (status) {
        const upperStatus = status.toUpperCase();
        if (['DRAFT', 'ACTIVE', 'ARCHIVED'].includes(upperStatus)) {
          productStatus = upperStatus as 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
        }
      }

      const product = await this.prisma.product.create({
        data: {
          title,
          slug: `${title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
          brand_id: brandId,
          description_html,
          short_description,
          status: productStatus,
        },
      });

      const sku = await this.prisma.sku.create({
        data: {
          product_id: product.id,
          sku_code: `SKU-${Date.now()}`,
        },
      });

      const salePriceValue = Number(sale_price) || 0;
      const compareAtPriceValue = compare_at_price
        ? Number(compare_at_price)
        : null;

      await this.prisma.skuPrice.create({
        data: {
          sku_id: sku.id,
          sale_price: salePriceValue,
          compare_at_price: compareAtPriceValue,
          currency: 'INR',
          price_source: 'ADMIN',
        },
      });

      let warehouse = await this.prisma.warehouse.findFirst({
        where: { code: 'DEFAULT' },
      });

      if (!warehouse) {
        warehouse = await this.prisma.warehouse.create({
          data: {
            name: 'Default Warehouse',
            code: 'DEFAULT',
          },
        });
      }

      await this.prisma.inventoryLevel.create({
        data: {
          sku_id: sku.id,
          warehouse_id: warehouse.id,
          qty_on_hand: qty_on_hand ? Number(qty_on_hand) : 0,
          qty_reserved: 0,
        },
      });

      if (categories?.length) {
        await this.prisma.productCategory.createMany({
          data: categories.map((cid: string, i: number) => ({
            product_id: product.id,
            category_id: cid,
            is_primary: i === 0,
            sort_order: i,
          })),
        });
      }

      if (images_base64?.length) {
        await this.prisma.productMedia.createMany({
          data: images_base64.map((img: string, i: number) => ({
            product_id: product.id,
            type: 'IMAGE',
            url: img,
            sort_order: i,
          })),
        });
      }

      return await this.getProductById(product.id);
    } catch (error) {
      console.error('Create product error:', error);
      throw error;
    }
  }

  async updateProduct(id: string, data: UpdateProductDto) {
    const {
      title,
      brandId,
      description_html,
      short_description,
      status,
      categories,
      images_base64,
      sale_price,
      compare_at_price,
      qty_on_hand,
    } = data;

    const existing = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Product not found');
    }

    // Prepare update data
    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (brandId !== undefined) updateData.brand_id = brandId;
    if (description_html !== undefined)
      updateData.description_html = description_html;
    if (short_description !== undefined)
      updateData.short_description = short_description;

    // Handle status conversion
    if (status !== undefined) {
      const upperStatus = status.toUpperCase();
      if (['DRAFT', 'ACTIVE', 'ARCHIVED'].includes(upperStatus)) {
        updateData.status = upperStatus as 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
      }
    }

    await this.prisma.product.update({
      where: { id },
      data: updateData,
    });

    const sku = await this.prisma.sku.findFirst({
      where: { product_id: id },
    });

    if (!sku) {
      throw new Error('SKU not found for product');
    }

    if (sale_price !== undefined || compare_at_price !== undefined) {
      const salePriceValue =
        sale_price !== undefined ? Number(sale_price) : undefined;
      const compareAtPriceValue =
        compare_at_price !== undefined
          ? compare_at_price
            ? Number(compare_at_price)
            : null
          : undefined;

      await this.prisma.skuPrice.updateMany({
        where: { sku_id: sku.id },
        data: {
          ...(salePriceValue !== undefined && { sale_price: salePriceValue }),
          ...(compareAtPriceValue !== undefined && {
            compare_at_price: compareAtPriceValue,
          }),
        },
      });
    }

    if (qty_on_hand !== undefined) {
      const warehouse = await this.prisma.warehouse.findFirst({
        where: { code: 'DEFAULT' },
      });

      if (!warehouse) {
        throw new Error('Default warehouse not found');
      }

      const qtyValue = Number(qty_on_hand);

      await this.prisma.inventoryLevel.upsert({
        where: {
          warehouse_id_sku_id: {
            sku_id: sku.id,
            warehouse_id: warehouse.id,
          },
        },
        update: {
          qty_on_hand: qtyValue,
        },
        create: {
          sku_id: sku.id,
          warehouse_id: warehouse.id,
          qty_on_hand: qtyValue,
          qty_reserved: 0,
        },
      });
    }

    if (categories) {
      await this.prisma.productCategory.deleteMany({
        where: { product_id: id },
      });

      if (categories.length > 0) {
        await this.prisma.productCategory.createMany({
          data: categories.map((cid: string, i: number) => ({
            product_id: id,
            category_id: cid,
            is_primary: i === 0,
            sort_order: i,
          })),
        });
      }
    }

    if (images_base64) {
      await this.prisma.productMedia.deleteMany({
        where: { product_id: id },
      });

      if (images_base64.length > 0) {
        await this.prisma.productMedia.createMany({
          data: images_base64.map((img: string, i: number) => ({
            product_id: id,
            type: 'IMAGE',
            url: img,
            sort_order: i,
          })),
        });
      }
    }

    return await this.getProductById(id);
  }

  async deleteProduct(id: string) {
    const skus = await this.prisma.sku.findMany({
      where: { product_id: id },
      select: { id: true },
    });

    const skuIds = skus.map((s) => s.id);

    await this.prisma.skuPrice.deleteMany({
      where: { sku_id: { in: skuIds } },
    });

    await this.prisma.inventoryLevel.deleteMany({
      where: { sku_id: { in: skuIds } },
    });

    await this.prisma.productMedia.deleteMany({
      where: { product_id: id },
    });

    await this.prisma.productCategory.deleteMany({
      where: { product_id: id },
    });

    await this.prisma.sku.deleteMany({
      where: { product_id: id },
    });

    await this.prisma.product.delete({
      where: { id },
    });

    return true;
  }

  async updateProductStatus(id: string, status: string) {
    try {
      const validStatuses = ['DRAFT', 'ACTIVE', 'ARCHIVED'];

      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}`);
      }

      const product = await this.prisma.product.update({
        where: { id },
        data: {
          status: status as 'DRAFT' | 'ACTIVE' | 'ARCHIVED',
        },
      });

      return product;
    } catch (error: any) {
      console.error('Update product status error:', error);
      throw new Error('Failed to update product status: ' + error.message);
    }
  }
}
