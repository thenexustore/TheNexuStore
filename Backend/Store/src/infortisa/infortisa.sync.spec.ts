import { InfortisaSyncService } from './infortisa.sync';
import { InfortisaCatalogFetchResult } from './infortisa.service';

describe('InfortisaSyncService', () => {
  let service: InfortisaSyncService;
  let prisma: any;
  let infortisa: any;
  let products: any;

  beforeEach(() => {
    prisma = {
      product: {
        updateMany: jest.fn().mockResolvedValue(undefined),
        findMany: jest.fn(),
      },
      sku: { findMany: jest.fn(), findUnique: jest.fn() },
      warehouse: { findFirst: jest.fn() },
      inventoryLevel: { upsert: jest.fn() },
      productMedia: { create: jest.fn() },
      syncLog: { findUnique: jest.fn(), upsert: jest.fn() },
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

    service = new InfortisaSyncService(prisma, infortisa, products);
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
});
