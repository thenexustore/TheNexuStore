import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class AdminService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  private readonly ADMIN_CREDENTIALS = {
    email: 'admin@thenexustore.com',
    password: 'admin123',
  };

  validateAdmin(email: string, password: string): boolean {
    return (
      email === this.ADMIN_CREDENTIALS.email &&
      password === this.ADMIN_CREDENTIALS.password
    );
  }

  login(email: string) {
    const payload = {
      email,
      role: 'admin',
      permissions: ['full_access'],
      sub: 'admin_user',
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        email,
        role: 'admin',
        name: 'Admin User',
      },
    };
  }

  async getDashboardStats() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        todayOrders,
        revenueData,
        totalProducts,
        totalCustomers,
        recentOrders,
        pendingOrdersCount,
        activeProducts,
      ] = await Promise.all([
        this.prisma.order.count({
          where: {
            created_at: { gte: today },
            status: 'PAID',
          },
        }),

        this.prisma.order.aggregate({
          where: {
            created_at: { gte: today },
            status: 'PAID',
          },
          _sum: { total_amount: true },
        }),

        this.prisma.product.count(),

        this.prisma.customer.count(),

        this.prisma.order.findMany({
          where: { status: 'PAID' },
          orderBy: { created_at: 'desc' },
          take: 5,
        }),

        this.prisma.order.count({
          where: { status: 'PENDING_PAYMENT' },
        }),

        this.prisma.product.count({
          where: { status: 'ACTIVE' },
        }),
      ]);

      return {
        todayOrders,
        todayRevenue: revenueData._sum.total_amount || 0,
        totalProducts,
        totalCustomers,
        pendingOrders: pendingOrdersCount,
        activeProducts,
        recentOrders: recentOrders.map((order) => ({
          id: order.id,
          orderNumber: order.order_number || `ORD-${order.id}`,
          customer: order.email,
          amount: order.total_amount,
          status: order.status,
          date: order.created_at,
        })),
      };
    } catch (error) {
      console.error('Dashboard stats error:', error);
      throw new Error('Failed to fetch dashboard statistics');
    }
  }

  async getOrders(
    page: number,
    limit: number,
    status?: string,
    search?: string,
  ) {
    try {
      const skip = (page - 1) * limit;

      const where: any = {};

      if (status && status !== 'all') {
        where.status = status;
      }

      if (search) {
        where.OR = [
          { order_number: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [orders, total] = await Promise.all([
        this.prisma.order.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
        }),
        this.prisma.order.count({ where }),
      ]);

      const ordersWithCustomerInfo: Array<{
        id: string;
        orderNumber: string;
        customer: string;
        customerName: string;
        status: string;
        amount: any;
        createdAt: Date;
      }> = [];

      for (const order of orders) {
        let customerEmail = order.email || 'Guest';
        let customerName = 'Guest';

        if (order.customer_id) {
          const customer = await this.prisma.customer.findUnique({
            where: { id: order.customer_id },
            select: { email: true, first_name: true, last_name: true },
          });

          if (customer) {
            customerEmail = customer.email;
            customerName = `${customer.first_name} ${customer.last_name}`;
          }
        }

        ordersWithCustomerInfo.push({
          id: order.id,
          orderNumber: order.order_number || `ORD-${order.id}`,
          customer: customerEmail,
          customerName,
          status: order.status,
          amount: order.total_amount,
          createdAt: order.created_at,
        });
      }

      return {
        orders: ordersWithCustomerInfo,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('Get orders error:', error);
      throw new Error('Failed to fetch orders');
    }
  }

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
        where.status = status;
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
      }> = [];

      for (const product of products) {
        const [brand, categories, skus] = await Promise.all([
          this.prisma.brand.findUnique({
            where: { id: product.brand_id },
          }),
          this.prisma.productCategory.findMany({
            where: { product_id: product.id },
            include: { category: true },
          }),
          this.prisma.sku.findMany({
            where: { product_id: product.id },
          }),
        ]);

        productsWithDetails.push({
          id: product.id,
          title: product.title,
          brand: brand?.name || 'No Brand',
          categories: categories.map((pc) => pc.category.name),
          skusCount: skus.length,
          status: product.status,
          createdAt: product.created_at,
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

  async getOrderById(orderId: string) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      const customer = order.customer_id
        ? await this.prisma.customer.findUnique({
            where: { id: order.customer_id },
          })
        : null;

      const items = await this.prisma.orderItem.findMany({
        where: { order_id: orderId },
        include: {
          sku: {
            include: {
              product: true,
            },
          },
        },
      });

      return {
        ...order,
        customer,
        items,
      };
    } catch (error) {
      console.error('Get order by ID error:', error);
      throw new Error('Failed to fetch order details');
    }
  }

  async updateOrderStatus(orderId: string, status: string) {
    try {
      const order = await this.prisma.order.update({
        where: { id: orderId },
        data: { status: status as any },
      });

      return order;
    } catch (error) {
      console.error('Update order status error:', error);
      throw new Error('Failed to update order status');
    }
  }

  async getProductById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        skus: {
          include: { media: true },
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

    return {
      ...product,
      categories: product.categories.map((pc) => pc.category),
    };
  }

  async createProduct(data: any) {
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

      const product = await this.prisma.product.create({
        data: {
          title,
          slug: `${title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
          brand_id: brandId,
          description_html,
          short_description,
          status: status || 'DRAFT',
        },
      });

      const sku = await this.prisma.sku.create({
        data: {
          product_id: product.id,
          sku_code: `SKU-${Date.now()}`,
        },
      });

      await this.prisma.skuPrice.create({
        data: {
          sku_id: sku.id,
          sale_price,
          compare_at_price,
          currency: 'INR',
          price_source: 'ADMIN',
        },
      });

      const warehouse = await this.prisma.warehouse.findFirst();

      if (!warehouse) {
        throw new Error('No warehouse found. Please create a warehouse first.');
      }

      await this.prisma.inventoryLevel.create({
        data: {
          sku_id: sku.id,
          warehouse_id: warehouse.id,
          qty_on_hand: qty_on_hand ?? 0,
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

      return product;
    } catch (error) {
      console.error('Create product error 👉', error);
      throw error;
    }
  }

  async updateProduct(id: string, data: any) {
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

    await this.prisma.product.update({
      where: { id },
      data: {
        title,
        brand_id: brandId,
        description_html,
        short_description,
        status,
      },
    });

    const sku = await this.prisma.sku.findFirst({
      where: { product_id: id },
    });

    if (!sku) return true;

    await this.prisma.skuPrice.updateMany({
      where: { sku_id: sku.id },
      data: {
        sale_price,
        compare_at_price,
      },
    });

    const warehouse = await this.prisma.warehouse.findFirst({
      where: { code: 'DEFAULT' },
    });

    if (!warehouse) {
      throw new Error('Default warehouse not found');
    }

    if (typeof qty_on_hand === 'number') {
      await this.prisma.inventoryLevel.updateMany({
        where: {
          sku_id: sku.id,
          warehouse_id: warehouse.id,
        },
        data: {
          qty_on_hand,
        },
      });
    }

    if (categories) {
      await this.prisma.productCategory.deleteMany({
        where: { product_id: id },
      });

      await this.prisma.productCategory.createMany({
        data: categories.map((cid: string, i: number) => ({
          product_id: id,
          category_id: cid,
          is_primary: i === 0,
          sort_order: i,
        })),
      });
    }

    if (images_base64) {
      await this.prisma.productMedia.deleteMany({
        where: { product_id: id },
      });

      await this.prisma.productMedia.createMany({
        data: images_base64.map((img: string, i: number) => ({
          product_id: id,
          type: 'IMAGE',
          url: img,
          sort_order: i,
        })),
      });
    }

    return true;
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

  async getBrands() {
    try {
      const brands = await this.prisma.brand.findMany({
        where: { is_active: true },
        orderBy: { name: 'asc' },
      });

      return brands;
    } catch (error) {
      console.error('Get brands error:', error);
      throw new Error('Failed to fetch brands');
    }
  }

  async getCategories() {
    try {
      const categories = await this.prisma.category.findMany({
        where: { is_active: true },
        orderBy: { sort_order: 'asc' },
      });

      return categories;
    } catch (error) {
      console.error('Get categories error:', error);
      throw new Error('Failed to fetch categories');
    }
  }

  async createBrand(data: { name: string; logo_url?: string }) {
    try {
      const slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const existingBrand = await this.prisma.brand.findFirst({
        where: {
          OR: [{ name: data.name }, { slug: slug }],
        },
      });

      if (existingBrand) {
        throw new Error('Brand with this name or slug already exists');
      }

      const brand = await this.prisma.brand.create({
        data: {
          name: data.name,
          slug: slug,
          logo_url: data.logo_url,
          is_active: true,
        },
      });

      return brand;
    } catch (error: any) {
      console.error('Create brand error:', error);
      throw new Error(error.message || 'Failed to create brand');
    }
  }

  async createCategory(data: {
    name: string;
    parent_id?: string;
    sort_order?: number;
  }) {
    try {
      const slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const existingCategory = await this.prisma.category.findFirst({
        where: {
          OR: [{ name: data.name }, { slug: slug }],
        },
      });

      if (existingCategory) {
        throw new Error('Category with this name or slug already exists');
      }

      const sortOrder =
        data.sort_order ??
        (await this.getNextCategorySortOrder(data.parent_id));

      const category = await this.prisma.category.create({
        data: {
          name: data.name,
          slug: slug,
          parent_id: data.parent_id,
          sort_order: sortOrder,
          is_active: true,
        },
      });

      return category;
    } catch (error: any) {
      console.error('Create category error:', error);
      throw new Error(error.message || 'Failed to create category');
    }
  }

  async getNextCategorySortOrder(parentId?: string): Promise<number> {
    const where = parentId ? { parent_id: parentId } : { parent_id: null };

    const lastCategory = await this.prisma.category.findFirst({
      where,
      orderBy: { sort_order: 'desc' },
    });

    return (lastCategory?.sort_order || 0) + 1;
  }
}
