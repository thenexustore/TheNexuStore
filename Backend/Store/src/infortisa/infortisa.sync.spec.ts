import { InfortisaSyncService } from './infortisa.sync';
import { InfortisaCatalogFetchResult } from './infortisa.service';

describe('InfortisaSyncService', () => {
  let service: InfortisaSyncService;
  let prisma: any;
  let infortisa: any;
  let products: any;
  let schedulerRegistry: any;

  beforeEach(() => {
    prisma = {
      supplierIntegration: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      product: {
        updateMany: jest.fn().mockResolvedValue(undefined),
        findMany: jest.fn(),
      },
      sku: { findMany: jest.fn(), findUnique: jest.fn() },
      warehouse: { findFirst: jest.fn() },
      inventoryLevel: { upsert: jest.fn() },
      productMedia: { create: jest.fn() },
      syncLog: { findUnique: jest.fn(), upsert: jest.fn() },
      importRun: {
        create: jest.fn().mockImplementation(async ({ data }) => ({
          id: 'run-1',
          provider: data.provider,
          mode: data.mode,
          started_at: data.started_at,
          finished_at: null,
          status: 'RUNNING',
          source_items_received: 0,
          processed_count: 0,
          persisted_count: 0,
          validation_skipped_count: 0,
          created_count: 0,
          updated_count: 0,
          skipped_count: 0,
          error_count: 0,
          archived_count: 0,
          request_meta_json: data.request_meta_json ?? null,
          result_meta_json: null,
          created_at: new Date(),
          updated_at: new Date(),
        })),
        update: jest.fn().mockResolvedValue(undefined),
        findUniqueOrThrow: jest.fn().mockImplementation(async ({ where }) => ({
          id: where.id,
          provider: 'infortisa',
          mode: 'full',
          started_at: new Date(),
          finished_at: new Date(),
          status: 'SUCCESS',
          source_items_received: 3,
          processed_count: 3,
          persisted_count: 3,
          validation_skipped_count: 0,
          created_count: 3,
          updated_count: 0,
          skipped_count: 0,
          error_count: 0,
          archived_count: 0,
          request_meta_json: null,
          result_meta_json: null,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      },
      importRunError: {
        create: jest.fn().mockResolvedValue(undefined),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest
        .fn()
        .mockImplementation(async (callback) => callback(prisma)),
    };
    infortisa = {
      getAllProductsPaged: jest.fn(),
      getModifiedStock: jest.fn(),
      getModifiedProducts: jest.fn(),
      getProductBySku: jest.fn(),
    };
    products = {
      upsertFromInfortisa: jest.fn().mockResolvedValue('created'),
    };
    schedulerRegistry = {
      getCronJob: jest.fn(() => {
        throw new Error('missing');
      }),
      addCronJob: jest.fn(),
      deleteCronJob: jest.fn(),
    };

    service = new InfortisaSyncService(
      prisma,
      infortisa,
      products,
      schedulerRegistry,
    );
    jest.spyOn(service as any, 'delay').mockResolvedValue(undefined);
  });

  it('syncs full catalog across multiple pages', async () => {
    const catalog: InfortisaCatalogFetchResult = {
      items: [{ SKU: 'SKU-1' }, { SKU: 'SKU-2' }, { SKU: 'SKU-3' }],
      meta: {
        page: 1,
        pageSize: 2,
        totalReceived: 3,
        totalExpected: 3,
        totalPages: 2,
        offset: null,
        limit: 2,
        hasMore: false,
        raw: {},
      },
    };
    infortisa.getAllProductsPaged.mockResolvedValue(catalog);

    const result = await service.syncFullCatalog();

    expect(products.upsertFromInfortisa).toHaveBeenCalledTimes(3);
    expect(prisma.product.updateMany).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      created: 3,
      sourceItemsReceived: 3,
      sourcePages: 2,
      sourcePageSize: 2,
      sourceTotalExpected: 3,
    });
  });

  it('fails visibly when truncation is probable', async () => {
    infortisa.getAllProductsPaged.mockResolvedValue({
      items: Array.from({ length: 1000 }, (_, index) => ({
        SKU: `SKU-${index}`,
      })),
      meta: {
        page: 1,
        pageSize: 1000,
        totalReceived: 1000,
        totalExpected: null,
        totalPages: 1,
        offset: null,
        limit: 1000,
        hasMore: null,
        raw: {},
      },
    });

    await expect(service.syncFullCatalog()).rejects.toThrow(/truncation/i);
    expect(products.upsertFromInfortisa).not.toHaveBeenCalled();
  });


  it('reports effective runtime overview', async () => {
    const runningJob = {
      nextDate: jest.fn().mockReturnValue({
        toISO: () => '2026-03-20T02:00:00.000Z',
      }),
    };
    prisma.supplierIntegration.findUnique.mockResolvedValue({
      is_active: true,
      settings_json: {
        stock_sync_enabled: true,
        incremental_sync_enabled: false,
        full_sync_enabled: true,
        images_sync_enabled: true,
      },
    });
    schedulerRegistry.getCronJob = jest.fn((name: string) => {
      if (name === 'infortisa-stock-sync' || name === 'infortisa-full-sync') {
        return runningJob;
      }
      throw new Error('missing');
    });

    const overview = await service.getRuntimeOverview();

    expect(overview.integration_enabled).toBe(true);
    expect(overview.jobs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'stock',
          effective_enabled: true,
          registered: true,
          next_run_at: '2026-03-20T02:00:00.000Z',
        }),
        expect.objectContaining({
          key: 'incremental',
          effective_enabled: false,
          registered: false,
          next_run_at: null,
        }),
      ]),
    );
  });

  it('reloads runtime settings including images cron and per-job toggles', async () => {
    prisma.supplierIntegration.findUnique.mockResolvedValue({
      is_active: true,
      settings_json: {
        stock_sync_enabled: true,
        incremental_sync_enabled: false,
        full_sync_enabled: true,
        images_sync_enabled: true,
        images_sync_cron: '15 * * * *',
        full_sync_batch_delay_ms: 250,
        image_sync_take: 25,
      },
    });

    await service.reloadRuntimeSettings();

    expect(schedulerRegistry.addCronJob).toHaveBeenCalledTimes(3);
    expect(schedulerRegistry.addCronJob).toHaveBeenCalledWith(
      'infortisa-stock-sync',
      expect.anything(),
    );
    expect(schedulerRegistry.addCronJob).toHaveBeenCalledWith(
      'infortisa-full-sync',
      expect.anything(),
    );
    expect(schedulerRegistry.addCronJob).toHaveBeenCalledWith(
      'infortisa-images-sync',
      expect.anything(),
    );
  });

  it('uses runtime image take limit when syncing images', async () => {
    prisma.product.findMany.mockResolvedValue([]);
    prisma.supplierIntegration.findUnique.mockResolvedValue({
      is_active: true,
      settings_json: {
        image_sync_take: 12,
      },
    });

    await service.reloadRuntimeSettings();
    await service.syncImages();

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 12 }),
    );
  });
});
