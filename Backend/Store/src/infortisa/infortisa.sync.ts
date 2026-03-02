import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma.service';
import { InfortisaService } from './infortisa.service';
import { ProductsService } from '../user/products/products.service';
import {
  extractInfortisaStock,
  extractLifecycleCode,
} from './infortisa-normalization.util';

@Injectable()
export class InfortisaSyncService {
  private readonly logger = new Logger(InfortisaSyncService.name);
  private readonly BATCH_SIZE = 100;

  private readonly emptyBatchStats = { created: 0, updated: 0, skipped: 0 };

  constructor(
    private prisma: PrismaService,
    private infortisa: InfortisaService,
    private products: ProductsService,
  ) {}

  @Cron('0 2 * * *')
  async fullSync() {
    try {
      this.logger.log('Starting full synchronization');
      await this.syncFullCatalog();
      this.logger.log('Full synchronization completed successfully');
    } catch (error: any) {
      this.logger.error('Full synchronization failed', error.stack);
      throw error;
    }
  }

  @Cron('*/5 * * * *')
  async syncStockRealTime() {
    const startTime = Date.now();

    try {
      this.logger.debug('Starting real-time stock sync');
      const lastSync = await this.getLastSync('stock_realtime');
      const items = await this.infortisa.getModifiedStock(lastSync);

      const batches = this.chunkArray(items, this.BATCH_SIZE);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        await Promise.allSettled(
          batch.map((product) => this.processStockUpdate(product)),
        );

        this.logger.debug(`Processed batch ${i + 1}/${batches.length}`);
      }

      await this.setLastSync('stock_realtime');

      const duration = Date.now() - startTime;

      this.logger.debug(
        `Real-time stock sync completed: ${items.length} items in ${duration}ms`,
      );
    } catch (error: any) {
      this.logger.error('Real-time stock sync failed', error.stack);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async syncProductsIncremental() {
    const startTime = Date.now();

    try {
      const lastSync = await this.getLastSync('product_incremental');
      const items = await this.infortisa.getModifiedProducts(lastSync);

      const activeItems = items.filter(
        (p) => !['D', 'X'].includes(extractLifecycleCode(p)),
      );

      const stats = await this.processProductsBatch(activeItems);
      await this.setLastSync('product_incremental');

      const duration = Date.now() - startTime;

      this.logger.log(
        `Product incremental sync: ${activeItems.length} items processed in ${duration}ms (created=${stats.created}, updated=${stats.updated}, skipped=${stats.skipped})`,
      );
    } catch (error: any) {
      this.logger.error('Product incremental sync failed', error.stack);
    }
  }

  async syncFullCatalog() {
    this.logger.log('Starting full catalog sync');

    try {
      const allProducts = await this.infortisa.getAllProducts();
      const batchSize = 500;
      const totals = { ...this.emptyBatchStats };

      for (let i = 0; i < allProducts.length; i += batchSize) {
        const batch = allProducts.slice(i, i + batchSize);
        const stats = await this.processProductsBatch(batch);
        totals.created += stats.created;
        totals.updated += stats.updated;
        totals.skipped += stats.skipped;

        if (i + batchSize < allProducts.length) {
          await this.delay(1000);
        }
      }

      await this.handleDiscontinuedProducts(allProducts);

      this.logger.log(
        `Full catalog sync completed: ${allProducts.length} products (created=${totals.created}, updated=${totals.updated}, skipped=${totals.skipped})`,
      );
    } catch (error: any) {
      this.logger.error('Full catalog sync failed', error.stack);
    }
  }

  async syncImages() {
    try {
      const products = await this.prisma.product.findMany({
        where: {
          media: {
            none: {},
          },
        },
        take: 50,
      });

      for (const product of products) {
        try {
          const skus = await this.prisma.sku.findMany({
            where: { product_id: product.id },
            take: 1,
          });

          if (skus.length > 0) {
            const productData = await this.infortisa.getProductBySku(
              skus[0].sku_code,
            );

            if (productData.ImageUrl) {
              await this.prisma.productMedia.create({
                data: {
                  product_id: product.id,
                  url: productData.ImageUrl,
                  type: 'IMAGE',
                  sort_order: 0,
                },
              });
            }
          }

          await this.delay(100);
        } catch (error: any) {
          this.logger.warn(`Failed to fetch image for product ${product.id}`);
        }
      }
    } catch (error: any) {
      this.logger.error('Image sync failed', error.stack);
    }
  }

  private async processStockUpdate(product: any) {
    try {
      const sku = await this.prisma.sku.findUnique({
        where: { sku_code: product.SKU },
      });

      if (sku) {
        const warehouse = await this.prisma.warehouse.findFirst({
          where: { code: 'INFORTISA' },
        });

        if (warehouse) {
          const { qtyOnHandForCatalog } = extractInfortisaStock(product);

          await this.prisma.inventoryLevel.upsert({
            where: {
              warehouse_id_sku_id: {
                warehouse_id: warehouse.id,
                sku_id: sku.id,
              },
            },
            update: {
              qty_on_hand: qtyOnHandForCatalog,
              updated_at: new Date(),
            },
            create: {
              warehouse_id: warehouse.id,
              sku_id: sku.id,
              qty_on_hand: qtyOnHandForCatalog,
              qty_reserved: 0,
            },
          });
        }
      }
    } catch (error: any) {
      this.logger.warn(`Failed to update stock for product ${product.SKU}`);
    }
  }

  private async processProductsBatch(products: any[]) {
    const stats = { ...this.emptyBatchStats };

    for (const product of products) {
      try {
        const result = await this.products.upsertFromInfortisa(product);
        stats[result] += 1;
      } catch (error: any) {
        this.logger.warn(
          `Failed to process product ${product.SKU}`,
          error.message,
        );
      }
    }

    return stats;
  }

  private async handleDiscontinuedProducts(allProducts: any[]) {
    try {
      const activeSkus = allProducts.map((p) => p.SKU).filter(Boolean);

      await this.prisma.product.updateMany({
        where: {
          skus: {
            every: {
              sku_code: { notIn: activeSkus },
            },
          },
        },
        data: {
          status: 'ARCHIVED',
        },
      });
    } catch (error: any) {
      this.logger.error('Failed to handle discontinued products', error.stack);
    }
  }

  private async getLastSync(type: string): Promise<string> {
    try {
      const row = await this.prisma.syncLog.findUnique({ where: { type } });
      if (row?.last_sync) {
        return new Date(row.last_sync).toISOString();
      }
      return '01/01/2024 00:00:00';
    } catch {
      return '01/01/2024 00:00:00';
    }
  }

  private async setLastSync(type: string) {
    try {
      await this.prisma.syncLog.upsert({
        where: { type },
        update: { last_sync: new Date() },
        create: { type, last_sync: new Date() },
      });
    } catch (error: any) {
      this.logger.error(`Failed to set last sync for ${type}`, error.stack);
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
