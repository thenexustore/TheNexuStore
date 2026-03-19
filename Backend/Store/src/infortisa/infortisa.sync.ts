import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { InfortisaService } from './infortisa.service';
import { ProductsService } from '../user/products/products.service';
import {
  extractInfortisaStock,
  extractLifecycleCode,
} from './infortisa-normalization.util';

type SyncMode = 'full' | 'incremental' | 'stock' | 'images';

type RunErrorInput = {
  sku?: string | null;
  stage: string;
  message: string;
  rawPayload?: Prisma.InputJsonValue;
};

type ProductBatchStats = {
  processed: number;
  persisted: number;
  created: number;
  updated: number;
  skipped: number;
  validationSkipped: number;
  errors: number;
  incidents: RunErrorInput[];
};

type ImportRunSummary = {
  id: string;
  provider: string;
  mode: SyncMode;
  started_at: Date;
  finished_at: Date | null;
  status: 'RUNNING' | 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';
  source_items_received: number;
  processed_count: number;
  persisted_count: number;
  validation_skipped_count: number;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  error_count: number;
  archived_count: number;
  request_meta_json: Prisma.JsonValue | null;
  result_meta_json: Prisma.JsonValue | null;
};

@Injectable()
export class InfortisaSyncService {
  private readonly logger = new Logger(InfortisaSyncService.name);
  private readonly BATCH_SIZE = 100;
  private readonly FULL_SYNC_BATCH_SIZE = 500;
  private readonly PROVIDER = 'infortisa';
  private readonly MAX_INCIDENTS = 10;
  private readonly DEFAULT_LAST_SYNC = '01/01/2024 00:00:00';

  constructor(
    private prisma: PrismaService,
    private infortisa: InfortisaService,
    private products: ProductsService,
  ) {}

  @Cron('0 2 * * *')
  async fullSync() {
    try {
      this.logger.log('Starting full synchronization');
      const summary = await this.syncFullCatalog();
      this.logger.log(
        `Full synchronization completed successfully (run=${summary.id})`,
      );
      return summary;
    } catch (error: any) {
      this.logger.error('Full synchronization failed', error.stack);
      throw error;
    }
  }

  @Cron('*/5 * * * *')
  async syncStockRealTime() {
    const startedAt = new Date();
    const run = await this.createImportRun({
      provider: this.PROVIDER,
      mode: 'stock',
      startedAt,
      requestMeta: { job: 'stock_realtime' },
    });

    try {
      this.logger.debug('Starting real-time stock sync');
      const lastSync = await this.getLastSync('stock_realtime');
      const items = await this.infortisa.getModifiedStock(lastSync);
      const batches = this.chunkArray(items, this.BATCH_SIZE);
      let processed = 0;
      let errors = 0;
      const incidents: RunErrorInput[] = [];

      await this.updateImportRunProgress(run.id, {
        source_items_received: items.length,
        result_meta_json: {
          last_sync_cursor: lastSync,
          batches: batches.length,
        },
      });

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const results = await Promise.allSettled(
          batch.map((product) => this.processStockUpdate(product)),
        );

        results.forEach((result, index) => {
          processed += 1;
          if (result.status === 'rejected') {
            errors += 1;
            this.pushIncident(incidents, {
              sku: this.normalizeSku(batch[index]?.SKU),
              stage: 'stock_update',
              message: this.extractErrorMessage(result.reason),
              rawPayload: this.safeJson(batch[index]),
            });
          }
        });

        this.logger.debug(`Processed batch ${i + 1}/${batches.length}`);
      }

      await this.setLastSync('stock_realtime');
      const finishedAt = new Date();
      const duration = finishedAt.getTime() - startedAt.getTime();
      const status: ImportRunSummary['status'] = errors > 0 ? 'PARTIAL_SUCCESS' : 'SUCCESS';

      await this.finalizeImportRun(run.id, {
        finishedAt,
        status,
        processed_count: processed,
        persisted_count: processed - errors,
        validation_skipped_count: 0,
        created_count: 0,
        updated_count: processed - errors,
        skipped_count: 0,
        error_count: errors,
        resultMeta: {
          last_sync_cursor: lastSync,
          duration_ms: duration,
          items_received_from_provider: items.length,
          items_persisted_in_catalog: processed - errors,
          provider_vs_catalog_label:
            items.length === processed - errors
              ? `La API devolvió ${items.length} y se guardaron ${processed - errors}`
              : `La API devolvió ${items.length} pero solo se guardaron ${processed - errors}`,
          sample_incidents: incidents,
        },
        incidents,
      });

      this.logger.debug(
        `Real-time stock sync completed: ${items.length} items in ${duration}ms`,
      );

      return this.getImportRunSummary(run.id);
    } catch (error: any) {
      await this.failImportRun(run.id, error, { job: 'stock_realtime' });
      this.logger.error('Real-time stock sync failed', error.stack);
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async syncProductsIncremental() {
    const startedAt = new Date();
    const run = await this.createImportRun({
      provider: this.PROVIDER,
      mode: 'incremental',
      startedAt,
      requestMeta: { job: 'product_incremental' },
    });

    try {
      const lastSync = await this.getLastSync('product_incremental');
      const items = await this.infortisa.getModifiedProducts(lastSync);
      const activeItems = items.filter(
        (p) => !['D', 'X'].includes(extractLifecycleCode(p)),
      );
      const lifecycleSkippedCount = items.length - activeItems.length;

      await this.updateImportRunProgress(run.id, {
        source_items_received: items.length,
        skipped_count: lifecycleSkippedCount,
        result_meta_json: {
          last_sync_cursor: lastSync,
          dropped_by_lifecycle: lifecycleSkippedCount,
        },
      });

      const stats = await this.processProductsBatch(activeItems, 'incremental_upsert');
      await this.setLastSync('product_incremental');

      const finishedAt = new Date();
      const duration = finishedAt.getTime() - startedAt.getTime();
      const status = this.resolveRunStatus(stats.errors, stats.validationSkipped);

      await this.finalizeImportRun(run.id, {
        finishedAt,
        status,
        processed_count: stats.processed,
        persisted_count: stats.persisted,
        validation_skipped_count: stats.validationSkipped,
        created_count: stats.created,
        updated_count: stats.updated,
        skipped_count: lifecycleSkippedCount + stats.skipped,
        error_count: stats.errors,
        resultMeta: {
          last_sync_cursor: lastSync,
          duration_ms: duration,
          items_received_from_provider: items.length,
          items_processed_after_lifecycle_filter: activeItems.length,
          items_persisted_in_catalog: stats.persisted,
          items_discarded_by_validation: stats.validationSkipped,
          provider_vs_catalog_label:
            items.length === stats.persisted
              ? `La API devolvió ${items.length} y se guardaron ${stats.persisted}`
              : `La API devolvió ${items.length} pero solo se guardaron ${stats.persisted}`,
          sample_incidents: stats.incidents,
        },
        incidents: stats.incidents,
      });

      this.logger.log(
        `Product incremental sync: ${activeItems.length} items processed in ${duration}ms (created=${stats.created}, updated=${stats.updated}, skipped=${lifecycleSkippedCount + stats.skipped}, validationSkipped=${stats.validationSkipped}, errors=${stats.errors})`,
      );

      return this.getImportRunSummary(run.id);
    } catch (error: any) {
      await this.failImportRun(run.id, error, { job: 'product_incremental' });
      this.logger.error('Product incremental sync failed', error.stack);
      throw error;
    }
  }

  async syncFullCatalog() {
    this.logger.log('Starting full catalog sync');
    const startedAt = new Date();
    const run = await this.createImportRun({
      provider: this.PROVIDER,
      mode: 'full',
      startedAt,
      requestMeta: { job: 'full_catalog' },
    });

    try {
      const allProducts = await this.infortisa.getAllProducts();
      const totals = this.emptyProductBatchStats();

      await this.updateImportRunProgress(run.id, {
        source_items_received: allProducts.length,
        result_meta_json: {
          batch_size: this.FULL_SYNC_BATCH_SIZE,
        },
      });

      for (let i = 0; i < allProducts.length; i += this.FULL_SYNC_BATCH_SIZE) {
        const batch = allProducts.slice(i, i + this.FULL_SYNC_BATCH_SIZE);
        const stats = await this.processProductsBatch(batch, 'full_upsert');
        this.mergeProductBatchStats(totals, stats);

        if (i + this.FULL_SYNC_BATCH_SIZE < allProducts.length) {
          await this.delay(1000);
        }
      }

      const archivedCount = await this.handleDiscontinuedProducts(allProducts);
      const finishedAt = new Date();
      const status = this.resolveRunStatus(totals.errors, totals.validationSkipped);

      await this.finalizeImportRun(run.id, {
        finishedAt,
        status,
        processed_count: totals.processed,
        persisted_count: totals.persisted,
        validation_skipped_count: totals.validationSkipped,
        created_count: totals.created,
        updated_count: totals.updated,
        skipped_count: totals.skipped,
        error_count: totals.errors,
        archived_count: archivedCount,
        resultMeta: {
          duration_ms: finishedAt.getTime() - startedAt.getTime(),
          items_received_from_provider: allProducts.length,
          items_persisted_in_catalog: totals.persisted,
          items_discarded_by_validation: totals.validationSkipped,
          provider_vs_catalog_label:
            allProducts.length === totals.persisted
              ? `La API devolvió ${allProducts.length} y se guardaron ${totals.persisted}`
              : `La API devolvió ${allProducts.length} pero solo se guardaron ${totals.persisted}`,
          sample_incidents: totals.incidents,
        },
        incidents: totals.incidents,
      });

      this.logger.log(
        `Full catalog sync completed: ${allProducts.length} products (created=${totals.created}, updated=${totals.updated}, skipped=${totals.skipped}, validationSkipped=${totals.validationSkipped}, errors=${totals.errors}, archived=${archivedCount})`,
      );

      return this.getImportRunSummary(run.id);
    } catch (error: any) {
      await this.failImportRun(run.id, error, { job: 'full_catalog' });
      this.logger.error('Full catalog sync failed', error.stack);
      throw error;
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
      throw error;
    }
  }

  async listImportRuns(limit = 30) {
    return (this.prisma as any).importRun.findMany({
      orderBy: { started_at: 'desc' },
      take: limit,
      include: {
        errors: {
          orderBy: { created_at: 'desc' },
          take: 5,
        },
      },
    });
  }

  async getImportRunById(id: string) {
    return (this.prisma as any).importRun.findUnique({
      where: { id },
      include: {
        errors: {
          orderBy: { created_at: 'desc' },
          take: 20,
        },
      },
    });
  }

  async getImportRunErrors(id: string, limit = 50) {
    return (this.prisma as any).importRunError.findMany({
      where: { import_run_id: id },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  async getProviderStats(provider = this.PROVIDER) {
    const [latestRun, countsByStatus, lastRuns] = await Promise.all([
      (this.prisma as any).importRun.findFirst({
        where: { provider },
        orderBy: { started_at: 'desc' },
        include: {
          errors: {
            orderBy: { created_at: 'desc' },
            take: 5,
          },
        },
      }),
      (this.prisma as any).importRun.groupBy({
        by: ['status'],
        where: { provider },
        _count: { _all: true },
      }),
      (this.prisma as any).importRun.findMany({
        where: { provider },
        orderBy: { started_at: 'desc' },
        take: 10,
        select: {
          id: true,
          mode: true,
          status: true,
          source_items_received: true,
          processed_count: true,
          persisted_count: true,
          validation_skipped_count: true,
          created_count: true,
          updated_count: true,
          skipped_count: true,
          error_count: true,
          archived_count: true,
          started_at: true,
          finished_at: true,
        },
      }),
    ]);

    const totals = lastRuns.reduce(
      (acc, run) => {
        acc.source_items_received += run.source_items_received;
        acc.processed_count += run.processed_count;
        acc.persisted_count += run.persisted_count;
        acc.validation_skipped_count += run.validation_skipped_count;
        acc.created_count += run.created_count;
        acc.updated_count += run.updated_count;
        acc.skipped_count += run.skipped_count;
        acc.error_count += run.error_count;
        acc.archived_count += run.archived_count;
        return acc;
      },
      {
        source_items_received: 0,
        processed_count: 0,
        persisted_count: 0,
        validation_skipped_count: 0,
        created_count: 0,
        updated_count: 0,
        skipped_count: 0,
        error_count: 0,
        archived_count: 0,
      },
    );

    return {
      provider,
      latestRun,
      statusCounts: (countsByStatus as Array<{ status: string; _count: { _all: number } }>).reduce((acc, item) => {
        acc[item.status] = item._count._all;
        return acc;
      }, {} as Record<string, number>),
      aggregates: totals,
      difference_received_vs_persisted:
        totals.source_items_received - totals.persisted_count,
      note:
        totals.source_items_received === totals.persisted_count
          ? `La API devolvió ${totals.source_items_received} y se guardaron ${totals.persisted_count}`
          : `La API devolvió más elementos que los persistidos: ${totals.source_items_received} recibidos frente a ${totals.persisted_count} guardados`,
    };
  }

  private async processStockUpdate(product: any) {
    const sku = await this.prisma.sku.findUnique({
      where: { sku_code: product.SKU },
    });

    if (!sku) {
      throw new Error(`SKU ${product.SKU} not found in catalog`);
    }

    const warehouse = await this.prisma.warehouse.findFirst({
      where: { code: 'INFORTISA' },
    });

    if (!warehouse) {
      throw new Error('INFORTISA warehouse not found');
    }

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

  private async processProductsBatch(products: any[], stage: string) {
    const stats = this.emptyProductBatchStats();

    for (const product of products) {
      try {
        const result = await this.products.upsertFromInfortisa(product);
        stats.processed += 1;

        if (result === 'skipped') {
          stats.skipped += 1;
          stats.validationSkipped += 1;
          this.pushIncident(stats.incidents, {
            sku: this.normalizeSku(product?.SKU),
            stage,
            message: 'Discarded by validation before persisting to catalog',
            rawPayload: this.safeJson(product),
          });
          continue;
        }

        stats.persisted += 1;
        if (result === 'created') {
          stats.created += 1;
        }
        if (result === 'updated') {
          stats.updated += 1;
        }
      } catch (error: any) {
        stats.processed += 1;
        stats.errors += 1;
        this.pushIncident(stats.incidents, {
          sku: this.normalizeSku(product?.SKU),
          stage,
          message: this.extractErrorMessage(error),
          rawPayload: this.safeJson(product),
        });
        this.logger.warn(
          `Failed to process product ${product?.SKU}`,
          error?.message,
        );
      }
    }

    return stats;
  }

  private async handleDiscontinuedProducts(allProducts: any[]) {
    try {
      const activeSkus = allProducts.map((p) => p.SKU).filter(Boolean);
      const result = await this.prisma.product.updateMany({
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

      return result.count;
    } catch (error: any) {
      this.logger.error('Failed to handle discontinued products', error.stack);
      return 0;
    }
  }

  private async getLastSync(type: string): Promise<string> {
    try {
      const row = await this.prisma.syncLog.findUnique({ where: { type } });
      if (row?.last_sync) {
        return new Date(row.last_sync).toISOString();
      }
      return this.DEFAULT_LAST_SYNC;
    } catch {
      return this.DEFAULT_LAST_SYNC;
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

  private async createImportRun(input: {
    provider: string;
    mode: SyncMode;
    startedAt: Date;
    requestMeta?: Prisma.InputJsonValue;
  }) {
    return (this.prisma as any).importRun.create({
      data: {
        provider: input.provider,
        mode: input.mode,
        started_at: input.startedAt,
        request_meta_json: input.requestMeta,
      },
    });
  }

  private async updateImportRunProgress(
    id: string,
    data: Record<string, unknown>,
  ) {
    await (this.prisma as any).importRun.update({
      where: { id },
      data,
    });
  }

  private async finalizeImportRun(
    id: string,
    input: {
      finishedAt: Date;
      status: 'RUNNING' | 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';
      processed_count: number;
      persisted_count: number;
      validation_skipped_count: number;
      created_count: number;
      updated_count: number;
      skipped_count: number;
      error_count: number;
      archived_count?: number;
      resultMeta: Prisma.InputJsonValue;
      incidents: RunErrorInput[];
    },
  ) {
    await this.prisma.$transaction(async (tx) => {
      await (tx as any).importRun.update({
        where: { id },
        data: {
          finished_at: input.finishedAt,
          status: input.status,
          processed_count: input.processed_count,
          persisted_count: input.persisted_count,
          validation_skipped_count: input.validation_skipped_count,
          created_count: input.created_count,
          updated_count: input.updated_count,
          skipped_count: input.skipped_count,
          error_count: input.error_count,
          archived_count: input.archived_count ?? 0,
          result_meta_json: input.resultMeta,
        },
      });

      if (input.incidents.length > 0) {
        await (tx as any).importRunError.createMany({
          data: input.incidents.map((incident) => ({
            import_run_id: id,
            sku: incident.sku ?? undefined,
            stage: incident.stage,
            message: incident.message,
            raw_payload_json: incident.rawPayload,
          })),
        });
      }
    });
  }

  private async failImportRun(
    id: string,
    error: unknown,
    extraMeta?: Record<string, unknown>,
  ) {
    const message = this.extractErrorMessage(error);

    await this.prisma.$transaction(async (tx) => {
      await (tx as any).importRun.update({
        where: { id },
        data: {
          finished_at: new Date(),
          status: 'FAILED',
          error_count: { increment: 1 },
          result_meta_json: this.safeJson({
            ...(extraMeta ?? {}),
            fatal_error: message,
          }),
        },
      });

      await (tx as any).importRunError.create({
        data: {
          import_run_id: id,
          stage: 'run',
          message,
          raw_payload_json: this.safeJson(extraMeta ?? {}),
        },
      });
    });
  }

  private async getImportRunSummary(id: string): Promise<ImportRunSummary> {
    return (this.prisma as any).importRun.findUniqueOrThrow({ where: { id } });
  }

  private resolveRunStatus(errors: number, validationSkipped: number) {
    if (errors > 0) {
      return 'PARTIAL_SUCCESS' as const;
    }
    if (validationSkipped > 0) {
      return 'PARTIAL_SUCCESS' as const;
    }
    return 'SUCCESS' as const;
  }

  private emptyProductBatchStats(): ProductBatchStats {
    return {
      processed: 0,
      persisted: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      validationSkipped: 0,
      errors: 0,
      incidents: [],
    };
  }

  private mergeProductBatchStats(target: ProductBatchStats, next: ProductBatchStats) {
    target.processed += next.processed;
    target.persisted += next.persisted;
    target.created += next.created;
    target.updated += next.updated;
    target.skipped += next.skipped;
    target.validationSkipped += next.validationSkipped;
    target.errors += next.errors;
    next.incidents.forEach((incident) => this.pushIncident(target.incidents, incident));
  }

  private pushIncident(collection: RunErrorInput[], incident: RunErrorInput) {
    if (collection.length >= this.MAX_INCIDENTS) {
      return;
    }
    collection.push(incident);
  }

  private normalizeSku(value: unknown) {
    if (value == null) {
      return null;
    }
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
  }

  private extractErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error';
    }
  }

  private safeJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
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
