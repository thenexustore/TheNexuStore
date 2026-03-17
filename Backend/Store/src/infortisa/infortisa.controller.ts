import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { InfortisaService } from './infortisa.service';
import { PrismaService } from '../common/prisma.service';
import { ProductsService } from '../user/products/products.service';
import { InfortisaSyncService } from './infortisa.sync';
import { AdminGuard } from '../admin/admin.guard';

@UseGuards(AdminGuard)
@Controller('admin/infortisa')
export class InfortisaController {
  constructor(
    private readonly infortisa: InfortisaService,
    private readonly prisma: PrismaService,
    private readonly products: ProductsService,
    private readonly syncService: InfortisaSyncService,
  ) {}

  @Delete('clean')
  async cleanDatabase() {
    try {
      await this.prisma.productCategory.deleteMany();
      await this.prisma.productMedia.deleteMany();
      await this.prisma.inventoryLevel.deleteMany();
      await this.prisma.skuPrice.deleteMany();
      await this.prisma.sku.deleteMany();
      await this.prisma.product.deleteMany();
      await this.prisma.brand.deleteMany();
      await this.prisma.category.deleteMany();
      await this.prisma.warehouse.deleteMany();

      return { success: true, message: 'Database cleaned successfully' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  @Post('sync')
  async fullSync() {
    try {
      const products = await this.infortisa.getAllProducts();

      let created = 0;
      let updated = 0;
      let errors = 0;

      for (const p of products) {
        try {
          const result = await this.products.upsertFromInfortisa(p);
          if (result === 'created') created++;
          if (result === 'updated') updated++;
        } catch (err: any) {
          errors++;
        }
      }

      await this.prisma.syncLog.upsert({
        where: { type: 'manual' },
        update: {
          last_sync: new Date(),
          details: `Created: ${created}, Updated: ${updated}, Errors: ${errors}`,
        },
        create: {
          type: 'manual',
          last_sync: new Date(),
          details: `Created: ${created}, Updated: ${updated}, Errors: ${errors}`,
        },
      });

      return {
        success: true,
        count: products.length,
        created,
        updated,
        errors,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  @Get('health')
  async checkHealth() {
    try {
      const isHealthy = await this.infortisa.checkServiceHealth();
      return {
        healthy: isHealthy,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('product/:sku')
  async getProduct(@Param('sku') sku: string) {
    try {
      const product = await this.infortisa.getProductBySku(sku);
      return {
        success: true,
        data: product,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('sync/images')
  async syncImages() {
    try {
      await this.syncService.syncImages();
      return {
        success: true,
        message: 'Images sync initiated',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('stats')
  async getStats() {
    try {
      const productCount = await this.prisma.product.count();
      const categoryCount = await this.prisma.category.count();

      const lastSync = await this.prisma.syncLog.findMany({
        orderBy: { last_sync: 'desc' },
        take: 5,
      });

      return {
        success: true,
        data: {
          products: productCount,
          categories: categoryCount,
          lastSyncs: lastSync.map((sync) => ({
            type: sync.type,
            last_sync: sync.last_sync,
            details: sync.details,
          })),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('sync/full')
  async triggerFullSync() {
    try {
      await this.syncService.fullSync();
      return {
        success: true,
        message: 'Full sync initiated',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('sync/stock')
  async triggerStockSync() {
    try {
      await this.syncService.syncStockRealTime();
      return {
        success: true,
        message: 'Stock sync initiated',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('tariff')
  async getTariff(@Query('format') format = 'standard') {
    try {
      const tariff = await this.infortisa.getTariffFile(
        format as 'standard' | 'extended',
      );
      return {
        success: true,
        data: tariff,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
