import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Query,
  Req,
  Param,
  Put,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { Permissions } from '../auth/staff-auth/permissions.decorator';
import {
  AddOrderNoteDto,
  AdminOrderAction,
  AdminOrdersQueryDto,
  BulkUpdateOrderStatusDto,
  CreateBrandDto,
  CreateCategoryDto,
  CreateOrderShipmentDto,
  OrderActionDto,
  UpdateOrderShipmentDto,
} from './admin.dto';
import { AuditLogService } from './audit-log.service';
import { Request } from 'express';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post('login')
  async adminLogin(@Body() body: { email: string; password: string }) {
    const loginData = await this.adminService.login(body.email, body.password);

    return {
      success: true,
      data: loginData,
    };
  }

  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      service: 'admin-api',
      timestamp: new Date().toISOString(),
    };
  }

  @UseGuards(AdminGuard)
  @Put('account/credentials')
  async updateMyCredentials(
    @Body()
    body: { email?: string; password?: string; currentPassword?: string },
    @Req() req: Request,
  ) {
    const data = await this.adminService.updateOwnCredentials(
      String((req.user as any)?.sub || ''),
      body,
    );

    return {
      success: true,
      data,
      message: 'Credentials updated successfully',
    };
  }

  @UseGuards(AdminGuard)
  @Get('orders')
  async getOrders(@Query() query: AdminOrdersQueryDto) {
    const pageNum = query.page;
    const limitNum = query.limit;

    const data = await this.adminService.getOrders(
      pageNum,
      limitNum,
      query.status,
      query.search,
    );

    return {
      success: true,
      data,
    };
  }

  @UseGuards(AdminGuard)
  @Put('orders/bulk/status')
  @Permissions('orders:bulk_update')
  async bulkUpdateOrderStatus(
    @Body() body: BulkUpdateOrderStatusDto,
    @Req() req: Request,
  ) {
    const data = await this.adminService.bulkUpdateOrderStatus(
      body.ids,
      body.status,
    );

    await this.auditLogService.logAction({
      actor: req.user as any,
      action: 'ORDER_BULK_STATUS_UPDATED',
      resource: 'ORDER',
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      requestId: (req.requestId ?? req.get('x-request-id')) || undefined,
      metadata: {
        ids: data.ids,
        status: data.status,
        affected: data.affected,
      },
    });

    return {
      success: true,
      data,
      message: 'Orders status updated',
    };
  }

  @UseGuards(AdminGuard)
  @Get('orders/:id')
  async getOrderById(@Param('id') id: string) {
    const data = await this.adminService.getOrderById(id);
    return {
      success: true,
      data,
    };
  }

  @UseGuards(AdminGuard)
  @Post('orders/:id/shipments')
  async createOrderShipment(
    @Param('id') id: string,
    @Body() body: CreateOrderShipmentDto,
    @Req() req: Request,
  ) {
    const data = await this.adminService.createOrderShipment(id, body);

    await this.auditLogService.logAction({
      actor: req.user as any,
      action: 'ORDER_SHIPMENT_CREATED',
      resource: 'ORDER',
      resourceId: id,
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      requestId: (req.requestId ?? req.get('x-request-id')) || undefined,
      metadata: {
        shipmentId: data.id,
        carrier: data.carrier,
        status: data.status,
        tracking_number: data.tracking_number,
      },
    });

    return {
      success: true,
      data,
      message: 'Shipment created successfully',
    };
  }

  @UseGuards(AdminGuard)
  @Put('orders/:id/shipments/:shipmentId')
  async updateOrderShipment(
    @Param('id') id: string,
    @Param('shipmentId') shipmentId: string,
    @Body() body: UpdateOrderShipmentDto,
    @Req() req: Request,
  ) {
    const data = await this.adminService.updateOrderShipment(
      id,
      shipmentId,
      body,
    );

    await this.auditLogService.logAction({
      actor: req.user as any,
      action: 'ORDER_SHIPMENT_UPDATED',
      resource: 'ORDER',
      resourceId: id,
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      requestId: (req.requestId ?? req.get('x-request-id')) || undefined,
      metadata: {
        shipmentId: data.id,
        carrier: data.carrier,
        status: data.status,
        tracking_number: data.tracking_number,
      },
    });

    return {
      success: true,
      data,
      message: 'Shipment updated successfully',
    };
  }

  @UseGuards(AdminGuard)
  @Get('orders/:id/timeline')
  async getOrderTimeline(@Param('id') id: string) {
    const data = await this.adminService.getOrderTimeline(id);
    return {
      success: true,
      data,
    };
  }

  @UseGuards(AdminGuard)
  @Post('orders/:id/notes')
  async addOrderNote(
    @Param('id') id: string,
    @Body() body: AddOrderNoteDto,
    @Req() req: Request,
  ) {
    const note = (body.note || '').trim();
    if (!note) {
      throw new BadRequestException('Note is required');
    }

    const actor = req.user as any;
    const data = await this.adminService.addOrderNote(id, note, {
      staffId: actor?.sub ? String(actor.sub) : null,
      staffEmail: actor?.email ? String(actor.email) : null,
    });

    await this.auditLogService.logAction({
      actor: req.user as any,
      action: 'ORDER_NOTE_ADDED',
      resource: 'ORDER',
      resourceId: id,
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      requestId: (req.requestId ?? req.get('x-request-id')) || undefined,
      metadata: {
        note,
      },
    });

    return {
      success: true,
      data,
    };
  }

  @UseGuards(AdminGuard)
  @Post('orders/:id/actions')
  async performOrderAction(
    @Param('id') id: string,
    @Body() body: OrderActionDto,
    @Req() req: Request,
  ) {
    const actor = req.user as any;
    const data = await this.adminService.performOrderAction(id, body, {
      staffId: actor?.sub ? String(actor.sub) : null,
      staffEmail: actor?.email ? String(actor.email) : null,
    });

    await this.auditLogService.logAction({
      actor,
      action: `ORDER_ACTION_${body.action}`,
      resource: 'ORDER',
      resourceId: id,
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      requestId: (req.requestId ?? req.get('x-request-id')) || undefined,
      metadata: {
        action: body.action,
        status: data.status,
        shipment_id: (data as any).shipment?.id,
      },
    });

    return {
      success: true,
      data,
      message: this.getOrderActionMessage(body.action),
    };
  }

  private getOrderActionMessage(action: AdminOrderAction): string {
    switch (action) {
      case AdminOrderAction.PUT_ON_HOLD:
        return 'Order placed on hold';
      case AdminOrderAction.RELEASE_HOLD:
        return 'Order moved to processing';
      case AdminOrderAction.CANCEL:
        return 'Order cancelled';
      case AdminOrderAction.MARK_SHIPPED:
        return 'Order marked as shipped';
      default:
        return 'Order action completed';
    }
  }

  @UseGuards(AdminGuard)
  @Get('brands')
  async getBrands() {
    const brands = await this.adminService.getBrands();
    return {
      success: true,
      data: brands,
    };
  }

  @UseGuards(AdminGuard)
  @Post('brands')
  async createBrand(@Body() body: CreateBrandDto, @Req() req: Request) {
    const brand = await this.adminService.createBrand(body);
    await this.auditLogService.logAction({
      actor: req.user as any,
      action: 'BRAND_CREATED',
      resource: 'BRAND',
      resourceId: brand.id,
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      requestId: (req.requestId ?? req.get('x-request-id')) || undefined,
      metadata: { name: brand.name },
    });

    return {
      success: true,
      data: brand,
      message: 'Brand created successfully',
    };
  }

  @UseGuards(AdminGuard)
  @Get('categories')
  async getCategories() {
    const categories = await this.adminService.getCategories();
    return {
      success: true,
      data: categories,
    };
  }

  @UseGuards(AdminGuard)
  @Post('categories')
  async createCategory(@Body() body: CreateCategoryDto, @Req() req: Request) {
    const category = await this.adminService.createCategory(body);
    await this.auditLogService.logAction({
      actor: req.user as any,
      action: 'CATEGORY_CREATED',
      resource: 'CATEGORY',
      resourceId: category.id,
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      requestId: (req.requestId ?? req.get('x-request-id')) || undefined,
      metadata: { name: category.name },
    });

    return {
      success: true,
      data: category,
      message: 'Category created successfully',
    };
  }
}
