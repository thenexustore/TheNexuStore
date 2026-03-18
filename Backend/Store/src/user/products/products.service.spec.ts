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
                {
                  main_category_id: {
                    in: ids,
                  },
                },
                {
                  categories: {
                    some: {
                      category_id: {
                        in: ids,
                      },
                    },
                  },
                },
              ]),
            }),
          ]),
        }),
      }),
    );
  };

  const mockResolvedCategoryBranch = (
    selectedIds: string[],
    taxonomyRows: Array<{ id: string; parent_id: string | null }>,
  ) => {
    prisma.category.findMany
      .mockResolvedValueOnce(selectedIds.map((id) => ({ id })))
      .mockResolvedValueOnce(taxonomyRows)
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
      ['parent-1'],
      [
        { id: 'parent-1', parent_id: null },
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
      ['parent-1'],
      [
        { id: 'parent-1', parent_id: null },
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
      ['parent-1'],
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
      ['parent-1'],
      [
        { id: 'parent-1', parent_id: null },
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
      ['parent-1'],
      [
        { id: 'parent-1', parent_id: null },
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
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'leaf-ups',
          name: 'Accesorios SAI',
          slug: 'accesorios-sai',
          parent_id: null,
        },
        {
          id: 'leaf-ups-child',
          name: 'SAI Rack',
          slug: 'sai-rack',
          parent_id: 'leaf-ups',
        },
        {
          id: 'printer-leaf',
          name: 'Accesorios Impresora',
          slug: 'accesorios-impresora',
          parent_id: null,
        },
      ])
      .mockResolvedValueOnce([]);

    await requestProducts({
      category: 'redes-servidores',
    });

    expectCategoryScope(['leaf-ups', 'leaf-ups-child']);
  });

  it.each([
    {
      name: 'returns no matches when the requested category slug cannot be resolved',
      categories: [' slug-inexistente ', 'slug-inexistente'],
      setupCategoryMocks: () =>
        prisma.category.findMany
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]),
      expectedCategoryQueryCount: 2,
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
