import { PrismaService } from '../../common/prisma.service';
import { ProductsService } from './products.service';

describe('ProductsService bulk actions', () => {
  const prisma = {
    product: {
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    sku: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    skuPrice: {
      deleteMany: jest.fn(),
    },
    inventoryLevel: {
      deleteMany: jest.fn(),
    },
    productMedia: {
      deleteMany: jest.fn(),
    },
    skuAttribute: {
      deleteMany: jest.fn(),
    },
    productCategory: {
      deleteMany: jest.fn(),
    },
  } as unknown as PrismaService;

  let service: ProductsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductsService(prisma);
  });

  it('bulk updates product status', async () => {
    (prisma.product.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

    const result = await service.bulkUpdateProductStatus(
      ['p1', 'p2', 'p1'],
      'ACTIVE',
    );

    expect(prisma.product.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['p1', 'p2'] } },
      data: { status: 'ACTIVE' },
    });
    expect(result).toEqual({
      affected: 2,
      ids: ['p1', 'p2'],
      status: 'ACTIVE',
    });
  });

  it('bulk deletes products and related entities', async () => {
    (prisma.sku.findMany as jest.Mock).mockResolvedValue([
      { id: 's1' },
      { id: 's2' },
    ]);
    (prisma.product.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });

    const result = await service.bulkDeleteProducts(['p1', 'p2']);

    expect(prisma.sku.findMany).toHaveBeenCalledWith({
      where: { product_id: { in: ['p1', 'p2'] } },
      select: { id: true },
    });
    expect(prisma.product.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['p1', 'p2'] } },
    });
    expect(result).toEqual({ affected: 2, ids: ['p1', 'p2'] });
  });
});
