import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

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
