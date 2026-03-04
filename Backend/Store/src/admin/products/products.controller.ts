import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Query,
  Put,
  Delete,
  Param,
  Patch,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ProductsService } from './products.service';
import { AdminGuard } from '../admin.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import {
  BulkDeleteProductsDto,
  BulkUpdateProductStatusDto,
} from './dto/bulk-product-actions.dto';
import { AuditLogService } from '../audit-log.service';

@Controller('admin/products')
@UseGuards(AdminGuard)
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  async getProducts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const data = await this.productsService.getProducts(
      pageNum,
      limitNum,
      search,
      status,
      category,
    );

    return {
      success: true,
      data,
    };
  }


  @Put('bulk/status')
  async bulkUpdateStatus(
    @Body() body: BulkUpdateProductStatusDto,
    @Req() req: Request,
  ) {
    const data = await this.productsService.bulkUpdateProductStatus(
      body.ids,
      body.status,
    );

    await this.auditLogService.logAction({
      actor: req.user as any,
      action: 'PRODUCT_BULK_STATUS_UPDATED',
      resource: 'PRODUCT',
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      metadata: {
        ids: body.ids,
        status: body.status,
        affected: data.affected,
      },
    });

    return {
      success: true,
      data,
      message: 'Products status updated',
    };
  }

  @Delete('bulk')
  async bulkDelete(
    @Body() body: BulkDeleteProductsDto,
    @Req() req: Request,
  ) {
    const data = await this.productsService.bulkDeleteProducts(body.ids);

    await this.auditLogService.logAction({
      actor: req.user as any,
      action: 'PRODUCT_BULK_DELETED',
      resource: 'PRODUCT',
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      metadata: {
        ids: body.ids,
        affected: data.affected,
      },
    });

    return {
      success: true,
      data,
      message: 'Products deleted successfully',
    };
  }

  @Get(':id')
  async getProductById(@Param('id') id: string) {
    const product = await this.productsService.getProductById(id);
    return {
      success: true,
      data: product,
    };
  }

  @Post()
  async createProduct(@Body() body: CreateProductDto, @Req() req: Request) {
    const product = await this.productsService.createProduct(body);

    await this.auditLogService.logAction({
      actor: req.user as any,
      action: 'PRODUCT_CREATED',
      resource: 'PRODUCT',
      resourceId: product.id,
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      metadata: {
        title: product.title,
      },
    });

    return {
      success: true,
      data: product,
      message: 'Product created successfully',
    };
  }

  @Put(':id')
  async updateProduct(
    @Param('id') id: string,
    @Body() body: UpdateProductDto,
    @Req() req: Request,
  ) {
    const product = await this.productsService.updateProduct(id, body);

    await this.auditLogService.logAction({
      actor: req.user as any,
      action: 'PRODUCT_UPDATED',
      resource: 'PRODUCT',
      resourceId: product.id,
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      metadata: {
        changedFields: Object.keys(body || {}),
      },
    });

    return {
      success: true,
      data: product,
      message: 'Product updated successfully',
    };
  }

  @Delete(':id')
  async deleteProduct(@Param('id') id: string, @Req() req: Request) {
    await this.productsService.deleteProduct(id);

    await this.auditLogService.logAction({
      actor: req.user as any,
      action: 'PRODUCT_DELETED',
      resource: 'PRODUCT',
      resourceId: id,
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
    });

    return {
      success: true,
      message: 'Product deleted successfully',
    };
  }

  @Put(':id/status')
  async updateProductStatus(
    @Param('id') id: string,
    @Body() body: UpdateProductStatusDto,
    @Req() req: Request,
  ) {
    const product = await this.productsService.updateProductStatus(
      id,
      body.status,
    );

    await this.auditLogService.logAction({
      actor: req.user as any,
      action: 'PRODUCT_STATUS_UPDATED',
      resource: 'PRODUCT',
      resourceId: id,
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      metadata: {
        status: body.status,
      },
    });

    return {
      success: true,
      data: product,
      message: 'Product status updated',
    };
  }

  @Patch(':id/toggle-featured')
  async toggleFeatured(@Param('id') id: string, @Req() req: Request) {
    const product = await this.productsService.toggleFeatured(id);

    await this.auditLogService.logAction({
      actor: req.user as any,
      action: 'PRODUCT_FEATURED_TOGGLED',
      resource: 'PRODUCT',
      resourceId: id,
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
    });

    return {
      success: true,
      data: product,
      message: 'Product featured status toggled',
    };
  }
}
