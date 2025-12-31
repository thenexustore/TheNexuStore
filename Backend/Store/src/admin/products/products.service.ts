import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // Helper function to generate unique SKU
  private generateSKU(prefix: string = 'PROD'): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  // Helper function to generate variant SKU
  private generateVariantSKU(productSku: string, index: number): string {
    return `${productSku}-VAR-${(index + 1).toString().padStart(3, '0')}`;
  }

  async getProducts(
    page: number,
    limit: number,
    search?: string,
    status?: string,
    category?: string,
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
          {
            skus: {
              some: { sku_code: { contains: search, mode: 'insensitive' } },
            },
          },
        ];
      }

      if (category) {
        where.categories = {
          some: {
            category: {
              OR: [
                { id: category },
                { name: { contains: category, mode: 'insensitive' } },
              ],
            },
          },
        };
      }

      const [products, total] = await Promise.all([
        this.prisma.product.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
          include: {
            brand: true,
            categories: {
              include: { category: true },
            },
            main_category: true,
            media: {
              orderBy: { sort_order: 'asc' },
            },
            skus: {
              include: {
                prices: true,
                inventory: true,
                attributes: {
                  include: {
                    attribute: true,
                    attribute_value: true,
                  },
                },
              },
            },
          },
        }),
        this.prisma.product.count({ where }),
      ]);

      const productsWithDetails: any[] = [];

      for (const product of products) {
        const defaultSku = product.skus.find((s) => !s.name) || product.skus[0];
        const price = defaultSku?.prices?.[0];
        const inventory = defaultSku?.inventory?.[0];

        let stockStatus = 'IN_STOCK';
        if (inventory) {
          if (inventory.qty_on_hand <= 0) {
            stockStatus = 'OUT_OF_STOCK';
          } else if (inventory.qty_on_hand < 10) {
            stockStatus = 'LOW_STOCK';
          }
        }

        const primaryCategory =
          product.categories.find((pc) => pc.is_primary)?.category ||
          product.main_category;
        const otherCategories = product.categories
          .filter((pc) => !pc.is_primary)
          .map((pc) => pc.category.name);

        const attributes: Record<string, Set<string>> = {};
        for (const sku of product.skus) {
          for (const attr of sku.attributes) {
            const key = attr.attribute.code;
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

            if (key && value) {
              if (!attributes[key]) {
                attributes[key] = new Set<string>();
              }
              attributes[key].add(value);
            }
          }
        }

        const uniqueAttributes: Record<string, string[]> = {};
        for (const [key, valueSet] of Object.entries(attributes)) {
          uniqueAttributes[key] = Array.from(valueSet as Set<string>);
        }

        const variants = product.skus.map((sku) => {
          const skuPrice = sku.prices[0];
          const skuInventory = sku.inventory[0];

          return {
            id: sku.id,
            sku_code: sku.sku_code,
            attributes: sku.attributes.map((attr) => ({
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
            price: skuPrice?.sale_price ? Number(skuPrice.sale_price) : 0,
            compare_at_price: skuPrice?.compare_at_price
              ? Number(skuPrice.compare_at_price)
              : null,
            stock_quantity: skuInventory?.qty_on_hand || 0,
          };
        });

        productsWithDetails.push({
          id: product.id,
          title: product.title,
          category: primaryCategory?.name || 'Uncategorized',
          categories: otherCategories,
          brand: product.brand?.name || 'No Brand',
          sku_code: defaultSku?.sku_code || 'N/A',
          price: price?.sale_price ? Number(price.sale_price) : 0,
          discount_price: price?.compare_at_price
            ? Number(price.compare_at_price)
            : null,
          stock_quantity: inventory?.qty_on_hand || 0,
          stock_status: stockStatus,
          product_description: product.short_description || '',
          product_images: product.media.map((m) => ({
            url: m.url,
            alt_text: m.alt_text,
          })),
          attributes: uniqueAttributes,
          variants: variants,
          product_status: product.status,
          featured_product: product.main_category?.slug === 'featured',
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
        main_category: true,
        categories: {
          include: { category: true },
        },
        media: {
          orderBy: { sort_order: 'asc' },
        },
        skus: {
          include: {
            prices: {
              orderBy: { updated_at: 'desc' },
            },
            inventory: {
              include: { warehouse: true },
            },
            attributes: {
              include: {
                attribute: true,
                attribute_value: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    const defaultSku = product.skus.find((s) => !s.name) || product.skus[0];
    const price = defaultSku?.prices?.[0];
    const inventory = defaultSku?.inventory?.[0];

    let stockStatus = 'IN_STOCK';
    if (inventory) {
      if (inventory.qty_on_hand <= 0) {
        stockStatus = 'OUT_OF_STOCK';
      } else if (inventory.qty_on_hand < 10) {
        stockStatus = 'LOW_STOCK';
      }
    }

    const primaryCategory =
      product.categories.find((pc) => pc.is_primary)?.category ||
      product.main_category;
    const otherCategories = product.categories
      .filter((pc) => !pc.is_primary)
      .map((pc) => pc.category);

    const variants = product.skus.map((sku) => {
      const skuPrice = sku.prices[0];
      const skuInventory = sku.inventory[0];

      let skuStockStatus = 'IN_STOCK';
      if (skuInventory) {
        if (skuInventory.qty_on_hand <= 0) {
          skuStockStatus = 'OUT_OF_STOCK';
        } else if (skuInventory.qty_on_hand < 10) {
          skuStockStatus = 'LOW_STOCK';
        }
      }

      return {
        id: sku.id,
        sku_code: sku.sku_code,
        variant_name: sku.name,
        attributes: sku.attributes.map((attr) => ({
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
          : null,
        stock_quantity: skuInventory?.qty_on_hand || 0,
        stock_status: skuStockStatus,
        weight_grams: sku.weight_grams,
        dimensions_mm: sku.dimensions_mm,
      };
    });

    const productAttributes =
      product.skus[0]?.attributes.map((attr) => ({
        key: attr.attribute.code,
        value:
          attr.attribute_value?.value_text ||
          attr.value_text ||
          (attr.value_number !== null
            ? attr.value_number.toString()
            : attr.value_bool !== null
              ? attr.value_bool.toString()
              : ''),
      })) || [];

    return {
      id: product.id,
      title: product.title,
      slug: product.slug,
      category: primaryCategory,
      categories: otherCategories,
      brand: product.brand,
      sku_code: defaultSku?.sku_code,
      price: price ? Number(price.sale_price) : 0,
      discount_price: price?.compare_at_price
        ? Number(price.compare_at_price)
        : null,
      stock_quantity: inventory?.qty_on_hand || 0,
      stock_status: stockStatus,
      product_description: product.description_html,
      short_description: product.short_description,
      product_images: product.media.map((m) => ({
        url: m.url,
        alt_text: m.alt_text,
        type: m.type,
        sort_order: m.sort_order,
      })),

      attributes: productAttributes,
      variants: variants,
      product_status: product.status,
      featured_product: product.main_category?.slug === 'featured',
      rating_avg: product.rating_avg ? Number(product.rating_avg) : null,
      rating_count: product.rating_count,
      created_at: product.created_at,
      updated_at: product.updated_at,
    };
  }

  async createProduct(data: CreateProductDto) {
    try {
      const {
        title,
        brandId,
        category,
        categories = [],
        description_html,
        short_description,
        status,
        images_base64,
        sale_price,
        compare_at_price,
        qty_on_hand,
        attributes = [],
        variants = [],
        featured = false,
      } = data;

      if (!brandId) {
        throw new Error('Brand is required');
      }

      let productStatus: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' = 'DRAFT';
      if (status) {
        const upperStatus = status.toUpperCase();
        if (['DRAFT', 'ACTIVE', 'ARCHIVED'].includes(upperStatus)) {
          productStatus = upperStatus as 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
        }
      }

      const allCategories: string[] = [];
      if (category) allCategories.push(category);
      if (categories) allCategories.push(...categories);
      const mainCategoryId = allCategories.length > 0 ? allCategories[0] : null;

      const product = await this.prisma.product.create({
        data: {
          title,
          slug: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
          brand_id: brandId,
          main_category_id: mainCategoryId,
          description_html,
          short_description,
          status: productStatus,
        },
      });

      // Auto-generate main SKU
      const mainSkuCode = this.generateSKU();
      const defaultSku = await this.prisma.sku.create({
        data: {
          product_id: product.id,
          sku_code: mainSkuCode,
        },
      });

      const salePriceValue = Number(sale_price) || 0;
      const compareAtPriceValue = compare_at_price
        ? Number(compare_at_price)
        : null;

      await this.prisma.skuPrice.create({
        data: {
          sku_id: defaultSku.id,
          sale_price: salePriceValue,
          compare_at_price: compareAtPriceValue,
          currency: 'EUR',
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
          sku_id: defaultSku.id,
          warehouse_id: warehouse.id,
          qty_on_hand: qty_on_hand ? Number(qty_on_hand) : 0,
          qty_reserved: 0,
        },
      });

      if (allCategories.length > 0) {
        await this.prisma.productCategory.createMany({
          data: allCategories.map((categoryId, i) => ({
            product_id: product.id,
            category_id: categoryId,
            is_primary: i === 0,
            sort_order: i,
          })),
        });
      }

      if (images_base64?.length) {
        await this.prisma.productMedia.createMany({
          data: images_base64.map((img, i) => ({
            product_id: product.id,
            type: 'IMAGE',
            url: img,
            sort_order: i,
          })),
        });
      }

      if (attributes.length > 0) {
        for (const attr of attributes) {
          let attribute = await this.prisma.attribute.findUnique({
            where: { code: attr.key },
          });

          if (!attribute) {
            attribute = await this.prisma.attribute.create({
              data: {
                code: attr.key,
                name: attr.key,
                data_type: 'TEXT',
              },
            });
          }

          let attributeValue = await this.prisma.attributeValue.findFirst({
            where: {
              attribute_id: attribute.id,
              value_text: attr.value,
            },
          });

          if (!attributeValue) {
            attributeValue = await this.prisma.attributeValue.create({
              data: {
                attribute_id: attribute.id,
                value_text: attr.value,
                sort_order: 0,
              },
            });
          }

          await this.prisma.skuAttribute.create({
            data: {
              sku_id: defaultSku.id,
              attribute_id: attribute.id,
              attribute_value_id: attributeValue.id,
              value_text: attr.value,
            },
          });
        }
      }

      if (variants.length > 0) {
        for (let i = 0; i < variants.length; i++) {
          const variant = variants[i];

          // Auto-generate variant SKU
          const variantSkuCode = this.generateVariantSKU(mainSkuCode, i);

          const variantSku = await this.prisma.sku.create({
            data: {
              product_id: product.id,
              sku_code: variantSkuCode,
              name: variant.variant_name,
            },
          });

          await this.prisma.skuPrice.create({
            data: {
              sku_id: variantSku.id,
              sale_price: Number(variant.sale_price),
              compare_at_price: variant.compare_at_price
                ? Number(variant.compare_at_price)
                : null,
              currency: 'EUR',
              price_source: 'ADMIN',
            },
          });

          await this.prisma.inventoryLevel.create({
            data: {
              sku_id: variantSku.id,
              warehouse_id: warehouse.id,
              qty_on_hand: variant.qty_on_hand || 0,
              qty_reserved: 0,
            },
          });

          if (variant.attributes?.length > 0) {
            for (const attr of variant.attributes) {
              let attribute = await this.prisma.attribute.findUnique({
                where: { code: attr.key },
              });

              if (!attribute) {
                attribute = await this.prisma.attribute.create({
                  data: {
                    code: attr.key,
                    name: attr.key,
                    data_type: 'TEXT',
                  },
                });
              }

              let attributeValue = await this.prisma.attributeValue.findFirst({
                where: {
                  attribute_id: attribute.id,
                  value_text: attr.value,
                },
              });

              if (!attributeValue) {
                attributeValue = await this.prisma.attributeValue.create({
                  data: {
                    attribute_id: attribute.id,
                    value_text: attr.value,
                    sort_order: 0,
                  },
                });
              }

              await this.prisma.skuAttribute.create({
                data: {
                  sku_id: variantSku.id,
                  attribute_id: attribute.id,
                  attribute_value_id: attributeValue.id,
                  value_text: attr.value,
                },
              });
            }
          }

          if (variant.images && variant.images.length > 0) {
            await this.prisma.productMedia.createMany({
              data: variant.images.map((img, i) => ({
                product_id: product.id,
                sku_id: variantSku.id,
                type: 'IMAGE',
                url: img,
                sort_order: i,
              })),
            });
          }
        }
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
      category,
      categories,
      description_html,
      short_description,
      status,
      images_base64,
      sale_price,
      compare_at_price,
      qty_on_hand,
      stock_status,
      attributes,
      variants,
      featured,
    } = data;

    const existing = await this.prisma.product.findUnique({
      where: { id },
      include: {
        skus: {
          take: 1,
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!existing) {
      throw new Error('Product not found');
    }

    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (brandId !== undefined) updateData.brand_id = brandId;
    if (description_html !== undefined)
      updateData.description_html = description_html;
    if (short_description !== undefined)
      updateData.short_description = short_description;

    if (status !== undefined) {
      const upperStatus = status.toUpperCase();
      if (['DRAFT', 'ACTIVE', 'ARCHIVED'].includes(upperStatus)) {
        updateData.status = upperStatus as 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
      }
    }

    const allCategories: string[] = [];
    if (category && category.trim() !== '') allCategories.push(category);
    if (categories && categories.length > 0) allCategories.push(...categories);
    const mainCategoryId =
      allCategories.length > 0 ? allCategories[0] : undefined;

    if (mainCategoryId !== undefined) {
      updateData.main_category_id = mainCategoryId;
    }

    await this.prisma.product.update({
      where: { id },
      data: updateData,
    });

    const defaultSku = existing.skus[0];

    // REMOVED: SKU code update logic (line 514-525)
    // SKU codes are now auto-generated and cannot be edited

    if (
      (sale_price !== undefined || compare_at_price !== undefined) &&
      defaultSku
    ) {
      const salePriceValue =
        sale_price !== undefined ? Number(sale_price) : undefined;
      const compareAtPriceValue =
        compare_at_price !== undefined
          ? compare_at_price
            ? Number(compare_at_price)
            : null
          : undefined;

      await this.prisma.skuPrice.updateMany({
        where: { sku_id: defaultSku.id },
        data: {
          ...(salePriceValue !== undefined && { sale_price: salePriceValue }),
          ...(compareAtPriceValue !== undefined && {
            compare_at_price: compareAtPriceValue,
          }),
        },
      });
    }

    if (qty_on_hand !== undefined && defaultSku) {
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
            sku_id: defaultSku.id,
            warehouse_id: warehouse.id,
          },
        },
        update: {
          qty_on_hand: qtyValue,
        },
        create: {
          sku_id: defaultSku.id,
          warehouse_id: warehouse.id,
          qty_on_hand: qtyValue,
          qty_reserved: 0,
        },
      });
    }

    if (categories !== undefined || category !== undefined) {
      await this.prisma.productCategory.deleteMany({
        where: { product_id: id },
      });

      if (allCategories.length > 0) {
        await this.prisma.productCategory.createMany({
          data: allCategories.map((cid, i) => ({
            product_id: id,
            category_id: cid,
            is_primary: i === 0,
            sort_order: i,
          })),
        });
      }
    }

    if (images_base64 !== undefined) {
      await this.prisma.productMedia.deleteMany({
        where: { product_id: id, sku_id: null },
      });

      if (images_base64.length > 0) {
        await this.prisma.productMedia.createMany({
          data: images_base64.map((img, i) => ({
            product_id: id,
            type: 'IMAGE',
            url: img,
            sort_order: i,
          })),
        });
      }
    }

    if (attributes !== undefined && defaultSku) {
      await this.prisma.skuAttribute.deleteMany({
        where: { sku_id: defaultSku.id },
      });

      if (attributes.length > 0) {
        for (const attr of attributes) {
          let attribute = await this.prisma.attribute.findUnique({
            where: { code: attr.key },
          });

          if (!attribute) {
            attribute = await this.prisma.attribute.create({
              data: {
                code: attr.key,
                name: attr.key,
                data_type: 'TEXT',
              },
            });
          }

          let attributeValue = await this.prisma.attributeValue.findFirst({
            where: {
              attribute_id: attribute.id,
              value_text: attr.value,
            },
          });

          if (!attributeValue) {
            attributeValue = await this.prisma.attributeValue.create({
              data: {
                attribute_id: attribute.id,
                value_text: attr.value,
                sort_order: 0,
              },
            });
          }

          await this.prisma.skuAttribute.create({
            data: {
              sku_id: defaultSku.id,
              attribute_id: attribute.id,
              attribute_value_id: attributeValue.id,
              value_text: attr.value,
            },
          });
        }
      }
    }

    if (variants !== undefined) {
      const nonDefaultSkus = await this.prisma.sku.findMany({
        where: { product_id: id, id: { not: defaultSku?.id } },
        select: { id: true, sku_code: true },
      });

      const nonDefaultSkuIds = nonDefaultSkus.map((s) => s.id);

      await Promise.all([
        this.prisma.skuPrice.deleteMany({
          where: { sku_id: { in: nonDefaultSkuIds } },
        }),
        this.prisma.inventoryLevel.deleteMany({
          where: { sku_id: { in: nonDefaultSkuIds } },
        }),
        this.prisma.skuAttribute.deleteMany({
          where: { sku_id: { in: nonDefaultSkuIds } },
        }),
        this.prisma.productMedia.deleteMany({
          where: { sku_id: { in: nonDefaultSkuIds } },
        }),
        this.prisma.sku.deleteMany({
          where: { id: { in: nonDefaultSkuIds } },
        }),
      ]);

      if (variants.length > 0) {
        const warehouse = await this.prisma.warehouse.findFirst({
          where: { code: 'DEFAULT' },
        });

        if (!warehouse) {
          throw new Error('Default warehouse not found');
        }

        // Get main SKU code for reference
        const mainSku = await this.prisma.sku.findFirst({
          where: { product_id: id },
          orderBy: { created_at: 'asc' },
        });

        const mainSkuCode = mainSku?.sku_code || this.generateSKU();

        for (let i = 0; i < variants.length; i++) {
          const variant = variants[i];

          // Auto-generate new variant SKU
          const variantSkuCode = this.generateVariantSKU(mainSkuCode, i);

          const variantSku = await this.prisma.sku.create({
            data: {
              product_id: id,
              sku_code: variantSkuCode,
              name: variant.variant_name,
            },
          });

          await this.prisma.skuPrice.create({
            data: {
              sku_id: variantSku.id,
              sale_price: Number(variant.sale_price),
              compare_at_price: variant.compare_at_price
                ? Number(variant.compare_at_price)
                : null,
              currency: 'EUR',
              price_source: 'ADMIN',
            },
          });

          await this.prisma.inventoryLevel.create({
            data: {
              sku_id: variantSku.id,
              warehouse_id: warehouse.id,
              qty_on_hand: variant.qty_on_hand || 0,
              qty_reserved: 0,
            },
          });

          if (variant.attributes?.length > 0) {
            for (const attr of variant.attributes) {
              let attribute = await this.prisma.attribute.findUnique({
                where: { code: attr.key },
              });

              if (!attribute) {
                attribute = await this.prisma.attribute.create({
                  data: {
                    code: attr.key,
                    name: attr.key,
                    data_type: 'TEXT',
                  },
                });
              }

              let attributeValue = await this.prisma.attributeValue.findFirst({
                where: {
                  attribute_id: attribute.id,
                  value_text: attr.value,
                },
              });

              if (!attributeValue) {
                attributeValue = await this.prisma.attributeValue.create({
                  data: {
                    attribute_id: attribute.id,
                    value_text: attr.value,
                    sort_order: 0,
                  },
                });
              }

              await this.prisma.skuAttribute.create({
                data: {
                  sku_id: variantSku.id,
                  attribute_id: attribute.id,
                  attribute_value_id: attributeValue.id,
                  value_text: attr.value,
                },
              });
            }
          }

          if (variant.images && variant.images.length > 0) {
            await this.prisma.productMedia.createMany({
              data: variant.images.map((img, i) => ({
                product_id: id,
                sku_id: variantSku.id,
                type: 'IMAGE',
                url: img,
                sort_order: i,
              })),
            });
          }
        }
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

    await this.prisma.skuAttribute.deleteMany({
      where: { sku_id: { in: skuIds } },
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

  async toggleFeatured(id: string) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        throw new Error('Product not found');
      }

      let featuredCategory = await this.prisma.category.findFirst({
        where: {
          OR: [{ slug: 'featured' }, { name: 'Featured' }],
        },
      });

      if (!featuredCategory) {
        featuredCategory = await this.prisma.category.create({
          data: {
            name: 'Featured',
            slug: 'featured',
            sort_order: 999,
            is_active: true,
          },
        });
      }

      const isCurrentlyFeatured =
        product.main_category_id === featuredCategory.id;

      const updatedProduct = await this.prisma.product.update({
        where: { id },
        data: {
          main_category_id: isCurrentlyFeatured ? null : featuredCategory.id,
        },
      });

      return updatedProduct;
    } catch (error: any) {
      console.error('Toggle featured error:', error);
      throw new Error('Failed to toggle featured status: ' + error.message);
    }
  }
}
