import { CarouselsController } from './carousels.controller';
import { HomepageSectionsService } from './homepage-sections.service';
import { ProductsService } from '../user/products/products.service';
import { PrismaService } from '../common/prisma.service';

describe('CarouselsController', () => {
  const homepageSectionsService = {
    getPublicSections: jest.fn(),
  } as unknown as HomepageSectionsService;

  const productsService = {
    getProducts: jest.fn(),
  } as unknown as ProductsService;

  const prisma = {
    category: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    brand: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  } as unknown as PrismaService;

  let controller: CarouselsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new CarouselsController(
      homepageSectionsService,
      productsService,
      prisma,
    );
  });

  it('returns only supported sections for carousels config', async () => {
    (homepageSectionsService.getPublicSections as jest.Mock).mockResolvedValue([
      {
        id: 'a',
        type: 'PRODUCT_CAROUSEL',
        title: 'Productos',
        config_json: {},
        enabled: true,
        data: [{ id: 1 }],
      },
      {
        id: 'b',
        type: 'HERO_BANNER_SLIDER',
        title: 'Hero',
        config_json: {},
        enabled: true,
        data: [{ id: 1 }],
      },
      {
        id: 'c',
        type: 'TRUST_BAR',
        title: 'Confianza',
        config_json: {},
        enabled: true,
        data: [{ id: 1 }, { id: 2 }],
      },
      {
        id: 'd',
        type: 'NEWSLETTER',
        title: 'News',
        config_json: {},
        enabled: true,
        data: { title: 'Suscríbete' },
      },
    ]);

    const result = await controller.getCarouselsConfig();

    expect(result.sections).toHaveLength(3);
    expect(result.sections.map((x) => x.type)).toEqual([
      'PRODUCT_CAROUSEL',
      'TRUST_BAR',
      'NEWSLETTER',
    ]);
    expect(result.sections[1].previewCount).toBe(2);
    expect(result.sections[1].data).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('keeps object payload for newsletter in carousels config', async () => {
    (homepageSectionsService.getPublicSections as jest.Mock).mockResolvedValue([
      {
        id: 'newsletter-1',
        type: 'NEWSLETTER',
        title: 'News',
        config_json: {},
        enabled: true,
        data: { title: 'Suscríbete' },
      },
    ]);

    const result = await controller.getCarouselsConfig();

    expect(result.sections).toEqual([
      expect.objectContaining({
        type: 'NEWSLETTER',
        previewCount: 1,
        data: { title: 'Suscríbete' },
      }),
    ]);
  });

  it('returns trust items from TRUST_BAR section data', async () => {
    (homepageSectionsService.getPublicSections as jest.Mock).mockResolvedValue([
      {
        id: 'trust-1',
        type: 'TRUST_BAR',
        data: [{ icon: 'truck', text: 'Entrega 24-48h' }],
      },
    ]);

    const result = await controller.getTrustItems();

    expect(result).toEqual({
      items: [{ icon: 'truck', text: 'Entrega 24-48h' }],
    });
  });

  it('returns empty trust items when section payload is invalid', async () => {
    (homepageSectionsService.getPublicSections as jest.Mock).mockResolvedValue([
      {
        id: 'trust-1',
        type: 'TRUST_BAR',
        data: null,
      },
    ]);

    const result = await controller.getTrustItems();

    expect(result).toEqual({ items: [] });
  });

  it('resolves uuid filters before querying products', async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue({
      slug: 'electronics',
    });
    (prisma.brand.findUnique as jest.Mock).mockResolvedValue({ slug: 'acer' });
    (productsService.getProducts as jest.Mock).mockResolvedValue({
      products: [],
      total: 0,
    });

    await controller.getProducts(
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
      'featured',
      12,
      true,
    );

    expect(productsService.getProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        categories: ['electronics'],
        brand: 'acer',
        featured_only: true,
      }),
    );
  });

  it('keeps slug filters without id lookup', async () => {
    (productsService.getProducts as jest.Mock).mockResolvedValue({
      products: [],
      total: 0,
    });

    await controller.getProducts('portatiles', 'lenovo', 'recent', 8, true);

    expect(prisma.category.findUnique).not.toHaveBeenCalled();
    expect(prisma.brand.findUnique).not.toHaveBeenCalled();
    expect(productsService.getProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        categories: ['portatiles'],
        brand: 'lenovo',
      }),
    );
  });

  it('requests brands ordered by popularity and maps product_count', async () => {
    (prisma.brand.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'brand-1',
        name: 'Brand 1',
        slug: 'brand-1',
        logo_url: '/brand-1.png',
        _count: { products: 21 },
      },
    ]);

    const result = await controller.getBrands('popularity', 12);

    expect(prisma.brand.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { products: { _count: 'desc' } },
        take: 12,
      }),
    );
    expect(result).toEqual([
      {
        id: 'brand-1',
        name: 'Brand 1',
        slug: 'brand-1',
        logo_url: '/brand-1.png',
        product_count: 21,
      },
    ]);
  });

  it('returns active categories and supports optional parent slug', async () => {
    (prisma.category.findMany as jest.Mock).mockResolvedValue([
      { id: 'cat-1', name: 'Electrónica', slug: 'electronica' },
    ]);

    const result = await controller.getCategories(10, 'informatica');

    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          is_active: true,
          parent: { slug: 'informatica' },
        }),
        take: 10,
      }),
    );
    expect(result).toEqual([
      { id: 'cat-1', name: 'Electrónica', slug: 'electronica' },
    ]);
  });
});
