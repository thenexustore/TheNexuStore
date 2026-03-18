import { GetProductsDto } from './dto/get-products.dto';
import { ProductsListResponseDto } from './dto/product-response.dto';
import { ProductsService } from './products.service';

describe('ProductsService category filtering', () => {
  const prisma = {
    category: {
      findMany: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    brand: {
      findMany: jest.fn(),
    },
    skuPrice: {
      aggregate: jest.fn(),
    },
    attribute: {
      findMany: jest.fn(),
    },
  } as any;

  const pricingService = {} as any;
  const emptyProductsResponse: ProductsListResponseDto = {
    products: [],
    total: 0,
    page: 1,
    limit: 20,
    total_pages: 0,
    filters: {
      categories: [],
      brands: [],
      price_range: { min: 0, max: 0 },
      attributes: [],
    },
  };

  let service: ProductsService;

  const requestProducts = (dto: Partial<GetProductsDto> = {}) =>
    service.getProducts(dto as GetProductsDto);

  const expectNoCatalogQueries = () => {
    expect(prisma.category.findMany).not.toHaveBeenCalled();
    expect(prisma.product.findMany).not.toHaveBeenCalled();
    expect(prisma.product.count).not.toHaveBeenCalled();
    expect(prisma.brand.findMany).not.toHaveBeenCalled();
    expect(prisma.skuPrice.aggregate).not.toHaveBeenCalled();
    expect(prisma.attribute.findMany).not.toHaveBeenCalled();
  };

  const expectNoDownstreamCatalogQueries = () => {
    expect(prisma.product.findMany).not.toHaveBeenCalled();
    expect(prisma.product.count).not.toHaveBeenCalled();
    expect(prisma.brand.findMany).not.toHaveBeenCalled();
    expect(prisma.skuPrice.aggregate).not.toHaveBeenCalled();
    expect(prisma.attribute.findMany).not.toHaveBeenCalled();
  };

  const expectCategoryScope = (ids: string[]) => {
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'ACTIVE',
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                expect.objectContaining({
                  main_category_id: {
                    in: expect.arrayContaining(ids),
                  },
                }),
                expect.objectContaining({
                  categories: {
                    some: {
                      category_id: {
                        in: expect.arrayContaining(ids),
                      },
                    },
                  },
                }),
              ]),
            }),
          ]),
        }),
      }),
    );
  };

  const mockResolvedCategoryBranch = (
    taxonomyRows: Array<{
      id: string;
      parent_id: string | null;
      name?: string;
      slug?: string;
      sort_order?: number;
    }>,
  ) => {
    prisma.category.findMany
      .mockResolvedValueOnce(
        taxonomyRows.map((row) => ({
          name: row.name ?? row.id,
          slug: row.slug ?? row.id,
          sort_order: row.sort_order ?? 0,
          ...row,
        })),
      )
      .mockResolvedValueOnce([]);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductsService(prisma, pricingService);

    prisma.product.findMany.mockResolvedValue([]);
    prisma.product.count.mockResolvedValue(0);
    prisma.brand.findMany.mockResolvedValue([]);
    prisma.skuPrice.aggregate.mockResolvedValue({
      _min: { sale_price: null },
      _max: { sale_price: null },
    });
    prisma.attribute.findMany.mockResolvedValue([]);
  });

  it('expands selected category slugs to include descendants and direct main category matches', async () => {
    mockResolvedCategoryBranch(
      [
        { id: 'parent-1', parent_id: null, slug: 'ordenadores-portatiles' },
        { id: 'child-1', parent_id: 'parent-1' },
        { id: 'grandchild-1', parent_id: 'child-1' },
      ],
    );

    await requestProducts({
      categories: ['ordenadores-portatiles'],
    });

    expectCategoryScope(['parent-1', 'child-1', 'grandchild-1']);
  });

  it('supports the legacy single category filter and expands its descendants', async () => {
    mockResolvedCategoryBranch(
      [
        { id: 'parent-1', parent_id: null, slug: 'ordenadores-portatiles' },
        { id: 'child-1', parent_id: 'parent-1' },
        { id: 'grandchild-1', parent_id: 'child-1' },
      ],
    );

    await requestProducts({
      category: 'ordenadores-portatiles',
    });

    expectCategoryScope(['parent-1', 'child-1', 'grandchild-1']);
  });

  it('accepts category ids as filter values and expands their descendants', async () => {
    mockResolvedCategoryBranch(
      [
        { id: 'parent-1', parent_id: null },
        { id: 'child-1', parent_id: 'parent-1' },
      ],
    );

    await requestProducts({
      category: 'parent-1',
    });

    expectCategoryScope(['parent-1', 'child-1']);
  });

  it('combines legacy category and categories inputs without duplicating descendants', async () => {
    mockResolvedCategoryBranch(
      [
        { id: 'parent-1', parent_id: null, slug: 'ordenadores-portatiles' },
        { id: 'child-1', parent_id: 'parent-1' },
      ],
    );

    await requestProducts({
      category: 'ordenadores-portatiles',
      categories: ['ordenadores-portatiles', 'parent-1'],
    });

    expectCategoryScope(['parent-1', 'child-1']);
  });

  it('keeps valid descendants when the filter mixes valid and invalid category slugs', async () => {
    mockResolvedCategoryBranch(
      [
        { id: 'parent-1', parent_id: null, slug: 'ordenadores-portatiles' },
        { id: 'child-1', parent_id: 'parent-1' },
      ],
    );

    await requestProducts({
      categories: ['ordenadores-portatiles', 'slug-inexistente'],
    });

    expectCategoryScope(['parent-1', 'child-1']);
  });

  it('expands canonical virtual parent slugs to recommended active categories when the parent row is missing', async () => {
    prisma.category.findMany
      .mockResolvedValueOnce([
        {
          id: 'leaf-ups',
          name: 'Accesorios SAI',
          slug: 'accesorios-sai',
          parent_id: null,
          sort_order: 10,
        },
        {
          id: 'leaf-ups-child',
          name: 'SAI Rack',
          slug: 'sai-rack',
          parent_id: 'leaf-ups',
          sort_order: 20,
        },
        {
          id: 'printer-leaf',
          name: 'Accesorios Impresora',
          slug: 'accesorios-impresora',
          parent_id: null,
          sort_order: 30,
        },
      ])
      .mockResolvedValueOnce([]);

    await requestProducts({
      category: 'redes-servidores',
    });

    expectCategoryScope(['leaf-ups', 'leaf-ups-child']);
  });

  it('includes canonical parent aliases and their descendants when filtering by canonical parent slug', async () => {
    prisma.category.findMany
      .mockResolvedValueOnce([
        {
          id: 'canonical-parent',
          name: 'Ordenadores y portátiles',
          slug: 'ordenadores-portatiles',
          parent_id: null,
          sort_order: 10,
        },
        {
          id: 'alias-parent',
          name: 'Ordenadores y portátiles',
          slug: 'ordenadores-y-portatiles',
          parent_id: null,
          sort_order: 11,
        },
        {
          id: 'alias-child',
          name: 'Portátiles',
          slug: 'portatiles',
          parent_id: 'alias-parent',
          sort_order: 12,
        },
      ])
      .mockResolvedValueOnce([]);

    await requestProducts({
      category: 'ordenadores-portatiles',
    });

    expectCategoryScope([
      'canonical-parent',
      'virtual:ordenadores-portatiles:portatiles',
      'alias-child',
    ]);
  });

  it('resolves synthetic level-2 category slugs and expands their descendant leaves', async () => {
    prisma.category.findMany
      .mockResolvedValueOnce([
        {
          id: 'canonical-parent',
          name: 'Componentes y almacenamiento',
          slug: 'componentes-almacenamiento',
          parent_id: null,
          sort_order: 20,
        },
        {
          id: 'cpu-leaf',
          name: 'Procesadores',
          slug: 'procesadores',
          parent_id: 'canonical-parent',
          sort_order: 10,
        },
        {
          id: 'ssd-leaf',
          name: 'SSD NVMe',
          slug: 'ssd-nvme',
          parent_id: 'canonical-parent',
          sort_order: 20,
        },
      ])
      .mockResolvedValueOnce([]);

    await requestProducts({
      category: 'componentes-almacenamiento-familia-componentes-pc',
    });

    expectCategoryScope([
      'virtual:componentes-almacenamiento:componentes-pc',
      'cpu-leaf',
    ]);
  });

  it.each([
    {
      name: 'returns no matches when the requested category slug cannot be resolved',
      categories: [' slug-inexistente ', 'slug-inexistente'],
      setupCategoryMocks: () =>
        prisma.category.findMany.mockResolvedValueOnce([]),
      expectedCategoryQueryCount: 1,
    },
    {
      name: 'returns no matches without touching the database when category slugs are blank',
      categories: ['   ', ''],
      setupCategoryMocks: () => undefined,
      expectedCategoryQueryCount: 0,
    },
  ])(
    '$name',
    async ({ categories, setupCategoryMocks, expectedCategoryQueryCount }) => {
      setupCategoryMocks();

      const response = await requestProducts({ categories });

      expect(response).toEqual(emptyProductsResponse);
      if (expectedCategoryQueryCount === 0) {
        expectNoCatalogQueries();
        return;
      }

      expect(prisma.category.findMany).toHaveBeenCalledTimes(
        expectedCategoryQueryCount,
      );
      expectNoDownstreamCatalogQueries();
    },
  );
});
