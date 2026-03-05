import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { OrderStatus, StaffRole } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service';
import { CategoriesService } from '../user/categories/categories.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  private getDefaultAdminCredentials() {
    return {
      email: (process.env.ADMIN_DEFAULT_EMAIL ?? 'admin@thenexusstore.com')
        .trim()
        .toLowerCase(),
      password: process.env.ADMIN_DEFAULT_PASSWORD ?? 'Suraj@123',
      forcePasswordSync:
        (process.env.ADMIN_DEFAULT_FORCE_PASSWORD_SYNC ?? 'true').toLowerCase() !==
        'false',
    };
  }

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private readonly categoriesService: CategoriesService,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultAdminAccount();
  }

  private async ensureDefaultAdminAccount() {
    const {
      email: defaultEmail,
      password: defaultPassword,
      forcePasswordSync,
    } = this.getDefaultAdminCredentials();

    if (!defaultEmail || !defaultPassword) {
      return;
    }

    const existingAdmin = await this.prisma.staff.findUnique({
      where: { email: defaultEmail },
    });

    if (existingAdmin) {
      const updates: {
        is_active?: boolean;
        role?: StaffRole;
        password_hash?: string;
      } = {};

      if (!existingAdmin.is_active) {
        updates.is_active = true;
      }

      if (existingAdmin.role !== StaffRole.ADMIN) {
        updates.role = StaffRole.ADMIN;
      }

      if (forcePasswordSync) {
        updates.password_hash = await bcrypt.hash(defaultPassword, 10);
      }

      if (Object.keys(updates).length > 0) {
        await this.prisma.staff.update({
          where: { id: existingAdmin.id },
          data: updates,
        });
        this.logger.log(`Default admin account synchronized for ${defaultEmail}`);
      }

      return;
    }

    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    await this.prisma.staff.create({
      data: {
        email: defaultEmail,
        password_hash: passwordHash,
        role: StaffRole.ADMIN,
        is_active: true,
      },
    });

    this.logger.log(`Default admin account restored for ${defaultEmail}`);
  }

  private getPermissionsForRole(role: StaffRole): string[] {
    if (role === StaffRole.ADMIN) {
      return ['full_access'];
    }

    if (role === StaffRole.WAREHOUSE) {
      return ['orders:read', 'orders:update', 'inventory:read', 'inventory:update'];
    }

    return [];
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();

    let staff = await this.prisma.staff.findUnique({
      where: { email: normalizedEmail },
    });

    const defaultAdmin = this.getDefaultAdminCredentials();
    const shouldSelfHealDefaultAdminLogin =
      normalizedEmail === defaultAdmin.email && password === defaultAdmin.password;

    if (shouldSelfHealDefaultAdminLogin) {
      await this.ensureDefaultAdminAccount();
      staff = await this.prisma.staff.findUnique({
        where: { email: normalizedEmail },
      });
    }

    if (!staff || !staff.is_active) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(password, staff.password_hash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: staff.id,
      email: staff.email,
      role: staff.role,
      warehouseId: staff.warehouse_id,
      type: 'STAFF',
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: staff.id,
        email: staff.email,
        role: staff.role,
        name: staff.email,
        permissions: this.getPermissionsForRole(staff.role),
      },
    };
  }


  async updateOwnCredentials(
    staffId: string,
    input: { email?: string; password?: string; currentPassword?: string },
  ) {
    if (!staffId) {
      throw new UnauthorizedException('Invalid staff identity');
    }

    const currentPassword = String(input.currentPassword || '');
    if (!currentPassword) {
      throw new BadRequestException('Current password is required');
    }

    const staff = await this.prisma.staff.findUnique({ where: { id: staffId } });

    if (!staff || !staff.is_active) {
      throw new UnauthorizedException('Invalid staff account');
    }

    const passwordMatch = await bcrypt.compare(currentPassword, staff.password_hash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const nextEmail = (input.email || '').trim().toLowerCase();
    const nextPassword = String(input.password || '').trim();

    if (!nextEmail && !nextPassword) {
      throw new BadRequestException('Provide a new email or password');
    }

    if (nextEmail && !nextEmail.includes('@')) {
      throw new BadRequestException('Email format is invalid');
    }

    if (nextPassword && nextPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    if (nextEmail && nextEmail !== staff.email) {
      const emailInUse = await this.prisma.staff.findUnique({
        where: { email: nextEmail },
      });

      if (emailInUse && emailInUse.id !== staff.id) {
        throw new BadRequestException('Email already in use by another account');
      }
    }

    const data: { email?: string; password_hash?: string } = {};

    if (nextEmail && nextEmail !== staff.email) {
      data.email = nextEmail;
    }

    if (nextPassword) {
      data.password_hash = await bcrypt.hash(nextPassword, 10);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No credential changes detected');
    }

    const updated = await this.prisma.staff.update({
      where: { id: staff.id },
      data,
    });

    return {
      id: updated.id,
      email: updated.email,
      role: updated.role,
    };
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

  async getOrderById(orderId: string) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
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
      if (error instanceof NotFoundException) {
        throw error;
      }
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

  async bulkUpdateOrderStatus(ids: string[], status: OrderStatus) {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (uniqueIds.length === 0) {
      return { affected: 0, ids: [], status };
    }

    const result = await this.prisma.order.updateMany({
      where: { id: { in: uniqueIds } },
      data: { status },
    });

    return {
      affected: result.count,
      ids: uniqueIds,
      status,
    };
  }



  async getOrderTimeline(orderId: string) {
    const logs = await this.prisma.adminAuditLog.findMany({
      where: {
        resource: 'ORDER',
        resource_id: orderId,
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      actorEmail: log.actor_email,
      actorRole: log.actor_role,
      status: log.status,
      metadata: log.metadata_json,
      createdAt: log.created_at,
    }));
  }

  async addOrderNote(orderId: string, note: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      success: true,
      orderId,
      note,
    };
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

      this.categoriesService.invalidateTreeCache();

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
