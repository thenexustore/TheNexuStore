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
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import {
  AddOrderNoteDto,
  AdminOrdersQueryDto,
  CreateBrandDto,
  CreateCategoryDto,
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
    const isValid = await this.adminService.validateAdmin(
      body.email,
      body.password,
    );

    if (!isValid) {
      return {
        success: false,
        message: 'Invalid credentials',
      };
    }

    const loginData = await this.adminService.login(body.email);

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
  @Get('orders/:id')
  async getOrderById(@Param('id') id: string) {
    const data = await this.adminService.getOrderById(id);
    return {
      success: true,
      data,
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

    const data = await this.adminService.addOrderNote(id, note);

    await this.auditLogService.logAction({
      actor: req.user as any,
      action: 'ORDER_NOTE_ADDED',
      resource: 'ORDER',
      resourceId: id,
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
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
      metadata: { name: category.name },
    });

    return {
      success: true,
      data: category,
      message: 'Category created successfully',
    };
  }
}
