import { Controller, Post, Delete } from '@nestjs/common';
import { InfortisaService } from './infortisa.service';
import { PrismaService } from '../common/prisma.service';
import { ProductsService } from '../user/products/products.service';

@Controller('admin/infortisa')
export class InfortisaController {
  constructor(
    private readonly infortisa: InfortisaService,
    private readonly prisma: PrismaService,
    private readonly products: ProductsService,
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
    } catch (err) {
      const error = err as Error;
      return { success: false, error: error.message };
    }
  }

  @Post('sync')
  async fullSync() {
    try {
      const products = await this.infortisa.getAllProducts();

      let created = 0;
      let updated = 0;

      for (const p of products) {
        try {
          const result = await this.products.upsertFromInfortisa(p);
          if (result === 'created') created++;
          if (result === 'updated') updated++;
        } catch (err) {
          const error = err as Error;
          console.error(`Error processing product ${p.SKU}:`, error.message);
        }
      }

      await this.prisma.syncLog.upsert({
        where: { type: 'manual' },
        update: {
          last_sync: new Date().toISOString(),
          details: `Created: ${created}, Updated: ${updated}`,
        },
        create: {
          type: 'manual',
          last_sync: new Date().toISOString(),
          details: `Created: ${created}, Updated: ${updated}`,
        },
      });

      return {
        success: true,
        count: products.length,
        created,
        updated,
      };
    } catch (err) {
      const error = err as Error;
      return { success: false, error: error.message };
    }
  }
}
