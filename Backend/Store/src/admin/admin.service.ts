import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { OrderStatus, Prisma, ShipmentStatus, StaffRole } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service';
import { CategoriesService } from '../user/categories/categories.service';
import * as bcrypt from 'bcrypt';
import { OrderTrackingEventsService } from '../order-tracking/order-tracking-events.service';

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
        (
          process.env.ADMIN_DEFAULT_FORCE_PASSWORD_SYNC ?? 'true'
        ).toLowerCase() !== 'false',
    };
  }

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private readonly categoriesService: CategoriesService,
    private readonly orderTrackingEvents: OrderTrackingEventsService,
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
        this.logger.log(
          `Default admin account synchronized for ${defaultEmail}`,
        );
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
      return [
        'orders:read',
        'orders:update',
        'inventory:read',
        'inventory:update',
      ];
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
      normalizedEmail === defaultAdmin.email &&
      password === defaultAdmin.password;

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

    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff || !staff.is_active) {
      throw new UnauthorizedException('Invalid staff account');
    }

    const passwordMatch = await bcrypt.compare(
      currentPassword,
      staff.password_hash,
    );
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
        throw new BadRequestException(
          'Email already in use by another account',
        );
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
          include: {
            payments: {
              orderBy: { created_at: 'desc' },
              take: 1,
            },
          },
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
        paymentStatus: string | null;
        paymentProvider: string | null;
        redsysResponseCode: string | null;
        redsysAuthorizationCode: string | null;
      }> = [];

      for (const order of orders) {
        let customerEmail = order.email || 'Guest';
        let customerName = 'Guest';
        const latestPayment = order.payments[0] || null;
        const redsys = this.extractRedsysPayload(
          latestPayment?.raw_response ?? null,
        );

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
          paymentStatus: latestPayment?.status ?? null,
          paymentProvider: latestPayment?.provider ?? null,
          redsysResponseCode: redsys?.responseCode ?? null,
          redsysAuthorizationCode: redsys?.authCode ?? null,
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
        include: {
          payments: {
            orderBy: { created_at: 'desc' },
          },
          shipments: {
            orderBy: { created_at: 'desc' },
            include: {
              tracking_events: {
                orderBy: { event_time: 'desc' },
              },
            },
          },
        },
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
        shipments: order.shipments.map((shipment) =>
          this.serializeShipment(shipment),
        ),
        payments: order.payments.map((payment) => {
          const redsys = this.extractRedsysPayload(payment.raw_response);
          return {
            ...payment,
            redsys_response_code: redsys?.responseCode ?? null,
            redsys_authorization_code: redsys?.authCode ?? null,
            redsys_payment_method: redsys?.payMethod ?? null,
          };
        }),
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

    await this.orderTrackingEvents.notifyByOrderIds(
      uniqueIds,
      'order_status_updated',
    );

    return {
      affected: result.count,
      ids: uniqueIds,
      status,
    };
  }

  async createOrderShipment(
    orderId: string,
    input: {
      carrier: string;
      service_level?: string;
      tracking_number?: string;
      tracking_url?: string;
      status?: ShipmentStatus;
    },
  ) {
    const status = input.status ?? ShipmentStatus.PENDING;

    const shipment = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            select: { id: true },
          },
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      const created = await tx.shipment.create({
        data: {
          order_id: orderId,
          carrier: input.carrier.trim(),
          service_level: input.service_level?.trim() || null,
          tracking_number: input.tracking_number?.trim() || null,
          tracking_url: input.tracking_url?.trim() || null,
          status,
          shipped_at: this.resolveShippedAt(status),
          delivered_at: this.resolveDeliveredAt(status),
        },
      });

      if (order.items.length > 0) {
        await tx.shipmentItem.createMany({
          data: order.items.map((item) => ({
            shipment_id: created.id,
            order_item_id: item.id,
          })),
          skipDuplicates: true,
        });
      }

      await tx.trackingEvent.create({
        data: {
          shipment_id: created.id,
          event_time: new Date(),
          status,
          details: this.buildTrackingEventDetails(
            'Shipment created',
            input.tracking_number,
            input.tracking_url,
          ),
        },
      });

      const nextOrderStatus = this.resolveOrderStatusFromShipmentStatus(
        status,
        order.status,
      );
      if (nextOrderStatus !== order.status) {
        await tx.order.update({
          where: { id: orderId },
          data: { status: nextOrderStatus },
        });
      }

      return tx.shipment.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          tracking_events: {
            orderBy: { event_time: 'desc' },
          },
        },
      });
    });

    await this.orderTrackingEvents.notifyByOrderId(orderId, 'shipment_created', {
      shipmentId: shipment.id,
    });

    return this.serializeShipment(shipment);
  }

  async updateOrderShipment(
    orderId: string,
    shipmentId: string,
    input: {
      carrier?: string;
      service_level?: string;
      tracking_number?: string;
      tracking_url?: string;
      status?: ShipmentStatus;
    },
  ) {
    const shipment = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.shipment.findUnique({
        where: { id: shipmentId },
        include: {
          order: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });

      if (!existing || existing.order_id !== orderId) {
        throw new NotFoundException('Shipment not found');
      }

      const status = input.status ?? existing.status;
      const updated = await tx.shipment.update({
        where: { id: shipmentId },
        data: {
          ...(input.carrier !== undefined
            ? { carrier: input.carrier.trim() }
            : {}),
          ...(input.service_level !== undefined
            ? { service_level: input.service_level.trim() || null }
            : {}),
          ...(input.tracking_number !== undefined
            ? { tracking_number: input.tracking_number.trim() || null }
            : {}),
          ...(input.tracking_url !== undefined
            ? { tracking_url: input.tracking_url.trim() || null }
            : {}),
          ...(input.status !== undefined
            ? {
                status,
                shipped_at:
                  status === ShipmentStatus.SHIPPED ||
                  status === ShipmentStatus.IN_TRANSIT ||
                  status === ShipmentStatus.DELIVERED
                    ? existing.shipped_at ?? new Date()
                    : null,
                delivered_at:
                  status === ShipmentStatus.DELIVERED ? new Date() : null,
              }
            : {}),
        },
      });

      if (
        input.status !== undefined &&
        input.status !== existing.status
      ) {
        await tx.trackingEvent.create({
          data: {
            shipment_id: shipmentId,
            event_time: new Date(),
            status,
            details: this.buildTrackingEventDetails(
              'Shipment status updated',
              input.tracking_number ?? existing.tracking_number ?? undefined,
              input.tracking_url ?? existing.tracking_url ?? undefined,
            ),
          },
        });
      } else if (
        input.tracking_number !== undefined ||
        input.tracking_url !== undefined
      ) {
        await tx.trackingEvent.create({
          data: {
            shipment_id: shipmentId,
            event_time: new Date(),
            status,
            details: this.buildTrackingEventDetails(
              'Tracking information updated',
              input.tracking_number ?? existing.tracking_number ?? undefined,
              input.tracking_url ?? existing.tracking_url ?? undefined,
            ),
          },
        });
      }

      const nextOrderStatus = this.resolveOrderStatusFromShipmentStatus(
        status,
        existing.order.status,
      );
      if (nextOrderStatus !== existing.order.status) {
        await tx.order.update({
          where: { id: orderId },
          data: { status: nextOrderStatus },
        });
      }

      return tx.shipment.findUniqueOrThrow({
        where: { id: shipmentId },
        include: {
          tracking_events: {
            orderBy: { event_time: 'desc' },
          },
        },
      });
    });

    await this.orderTrackingEvents.notifyByOrderId(orderId, 'shipment_updated', {
      shipmentId: shipment.id,
    });

    return this.serializeShipment(shipment);
  }

  private serializeShipment(shipment: any) {
    return {
      id: shipment.id,
      carrier: shipment.carrier,
      service_level: shipment.service_level,
      tracking_number: shipment.tracking_number,
      tracking_url: shipment.tracking_url,
      status: shipment.status,
      shipped_at: shipment.shipped_at,
      delivered_at: shipment.delivered_at,
      created_at: shipment.created_at,
      updated_at: shipment.updated_at,
      tracking_events: shipment.tracking_events?.map((event: any) => ({
        id: event.id,
        event_time: event.event_time,
        status: event.status,
        location: event.location,
        details: event.details,
      })),
    };
  }

  private buildTrackingEventDetails(
    prefix: string,
    trackingNumber?: string | null,
    trackingUrl?: string | null,
  ) {
    const parts = [prefix];
    if (trackingNumber) {
      parts.push(`tracking #${trackingNumber}`);
    }
    if (trackingUrl) {
      parts.push(trackingUrl);
    }
    return parts.join(' · ');
  }

  private resolveOrderStatusFromShipmentStatus(
    shipmentStatus: ShipmentStatus,
    currentStatus: OrderStatus,
  ): OrderStatus {
    switch (shipmentStatus) {
      case ShipmentStatus.DELIVERED:
        return OrderStatus.DELIVERED;
      case ShipmentStatus.SHIPPED:
      case ShipmentStatus.IN_TRANSIT:
      case ShipmentStatus.EXCEPTION:
        return OrderStatus.SHIPPED;
      case ShipmentStatus.PENDING:
      default:
        if (
          currentStatus === OrderStatus.PENDING_PAYMENT ||
          currentStatus === OrderStatus.FAILED ||
          currentStatus === OrderStatus.CANCELLED ||
          currentStatus === OrderStatus.REFUNDED
        ) {
          return currentStatus;
        }
        return OrderStatus.PROCESSING;
    }
  }

  private resolveShippedAt(status: ShipmentStatus) {
    return status === ShipmentStatus.SHIPPED ||
      status === ShipmentStatus.IN_TRANSIT ||
      status === ShipmentStatus.DELIVERED
      ? new Date()
      : null;
  }

  private resolveDeliveredAt(status: ShipmentStatus) {
    return status === ShipmentStatus.DELIVERED ? new Date() : null;
  }

  private extractRedsysPayload(rawResponse: Prisma.JsonValue | null): {
    responseCode?: string;
    authCode?: string;
    payMethod?: string;
  } | null {
    if (
      !rawResponse ||
      typeof rawResponse !== 'object' ||
      Array.isArray(rawResponse)
    ) {
      return null;
    }

    const container = rawResponse as Record<string, unknown>;
    const redsys = container.redsys;
    if (!redsys || typeof redsys !== 'object' || Array.isArray(redsys)) {
      return null;
    }

    const parsed = redsys as Record<string, unknown>;
    return {
      responseCode:
        typeof parsed.responseCode === 'string'
          ? parsed.responseCode
          : undefined,
      authCode:
        typeof parsed.authCode === 'string' ? parsed.authCode : undefined,
      payMethod:
        typeof parsed.payMethod === 'string'
          ? parsed.payMethod
          : typeof parsed.processedPayMethod === 'string'
            ? parsed.processedPayMethod
            : undefined,
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
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
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

      if (data.parent_id) {
        const parent = await this.prisma.category.findUnique({
          where: { id: data.parent_id },
          select: { id: true, parent_id: true },
        });
        if (!parent) {
          throw new Error('Parent category does not exist');
        }
        if (parent.parent_id) {
          const grandparent = await this.prisma.category.findUnique({
            where: { id: parent.parent_id },
            select: { id: true, parent_id: true },
          });
          if (grandparent?.parent_id) {
            throw new Error(
              'Category depth cannot exceed grandparent/parent/child hierarchy',
            );
          }
        }
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
