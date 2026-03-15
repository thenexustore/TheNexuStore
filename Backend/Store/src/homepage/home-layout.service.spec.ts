import { HomeLayoutService } from './home-layout.service';

describe('HomeLayoutService resolveHome cache policy', () => {
  it('does not cache active layout responses', async () => {
    const prisma = {
      homePageSection: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'sec-1',
            type: 'VALUE_PROPS',
            title: 'Value Props',
            subtitle: null,
            variant: null,
            config: { items: [] },
          },
        ]),
      },
      homePageLayout: {
        findUnique: jest.fn(),
      },
    } as any;

    const productsService = {} as any;
    const service = new HomeLayoutService(prisma, productsService);

    jest.spyOn<any, any>(service as any, 'getActiveLayout').mockResolvedValue({
      id: 'layout-1',
      locale: null,
      name: 'Default',
    });

    const first = await service.resolveHome();
    const second = await service.resolveHome();

    expect(first.layout.id).toBe('layout-1');
    expect(second.layout.id).toBe('layout-1');
    expect(prisma.homePageSection.findMany).toHaveBeenCalledTimes(2);
  });

  it('keeps caching preview layout responses', async () => {
    const prisma = {
      homePageSection: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'sec-1',
            type: 'VALUE_PROPS',
            title: 'Value Props',
            subtitle: null,
            variant: null,
            config: { items: [] },
          },
        ]),
      },
      homePageLayout: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'layout-preview',
          locale: null,
          name: 'Preview',
        }),
      },
    } as any;

    const productsService = {} as any;
    const service = new HomeLayoutService(prisma, productsService);

    await service.resolveHome(undefined, 'layout-preview');
    await service.resolveHome(undefined, 'layout-preview');

    expect(prisma.homePageLayout.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.homePageSection.findMany).toHaveBeenCalledTimes(1);
  });
});

describe('HomeLayoutService legacy bridges for Home Composer', () => {
  it('falls back HERO_CAROUSEL to active banners when section has no linked items', async () => {
    const prisma = {
      homePageSection: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'hero-sec',
            type: 'HERO_CAROUSEL',
            title: 'Hero',
            subtitle: null,
            variant: null,
            config: {},
          },
        ]),
      },
      homePageLayout: {
        findUnique: jest.fn(),
      },
      homePageSectionItem: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      banner: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'banner-1',
            image: '/hero.jpg',
            title_text: 'Hero Banner',
            subtitle_text: 'Sub',
            button_text: 'Shop',
            button_link: '/products',
            sort_order: 1,
            is_active: true,
          },
        ]),
      },
    } as any;

    const productsService = {
      getDealsProducts: jest.fn().mockResolvedValue([]),
      getProducts: jest.fn().mockResolvedValue({ products: [] }),
    } as any;

    const service = new HomeLayoutService(prisma, productsService);
    jest.spyOn<any, any>(service as any, 'getActiveLayout').mockResolvedValue({
      id: 'layout-hero',
      locale: 'es',
      name: 'Hero layout',
    });

    const payload = await service.resolveHome('es');
    expect(payload.sections).toHaveLength(1);
    expect(payload.sections[0].type).toBe('HERO_CAROUSEL');
    expect(Array.isArray(payload.sections[0].resolved)).toBe(true);
    expect((payload.sections[0].resolved as any[])[0]?.banner?.id).toBe('banner-1');
  });

  it('falls back BEST_DEALS to featured products when no deals are available', async () => {
    const prisma = {
      homePageSection: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'deals-sec',
            type: 'PRODUCT_CAROUSEL',
            title: 'Best Deals',
            subtitle: null,
            variant: null,
            config: { source: 'BEST_DEALS', limit: 12, inStockOnly: true },
          },
        ]),
      },
      homePageLayout: {
        findUnique: jest.fn(),
      },
      featuredProduct: {
        findMany: jest.fn().mockResolvedValue([
          {
            product: {
              id: 'prod-1',
              title: 'Featured Product',
              slug: 'featured-product',
              status: 'ACTIVE',
              brand: { name: 'BrandX' },
              media: [{ url: '/featured.jpg' }],
              skus: [
                {
                  prices: [{ sale_price: 100, compare_at_price: 120 }],
                  inventory: [{ qty_on_hand: 10 }],
                },
              ],
            },
          },
        ]),
      },
    } as any;

    const productsService = {
      getDealsProducts: jest.fn().mockResolvedValue([]),
      getProducts: jest.fn().mockResolvedValue({ products: [] }),
    } as any;

    const service = new HomeLayoutService(prisma, productsService);
    jest.spyOn<any, any>(service as any, 'getActiveLayout').mockResolvedValue({
      id: 'layout-deals',
      locale: 'es',
      name: 'Deals layout',
    });

    const payload = await service.resolveHome('es');
    const section = payload.sections[0] as any;
    expect(section.type).toBe('PRODUCT_CAROUSEL');
    expect(section.resolved).toHaveLength(1);
    expect(section.resolved[0].id).toBe('prod-1');
    expect(productsService.getDealsProducts).toHaveBeenCalled();
    expect(prisma.featuredProduct.findMany).toHaveBeenCalled();
  });

  it('uses query.categoryId source config for CATEGORY product sections', async () => {
    const prisma = {
      homePageSection: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'cat-sec',
            type: 'PRODUCT_CAROUSEL',
            title: 'Category picks',
            subtitle: null,
            variant: null,
            config: { source: 'CATEGORY', query: { categoryId: 'cat-123' }, limit: 8 },
          },
        ]),
      },
      homePageLayout: { findUnique: jest.fn() },
      featuredProduct: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;

    const productsService = {
      getDealsProducts: jest.fn().mockResolvedValue([]),
      getProducts: jest.fn().mockResolvedValue({ products: [{ id: 'p1' }] }),
    } as any;

    const service = new HomeLayoutService(prisma, productsService);
    jest.spyOn<any, any>(service as any, 'getActiveLayout').mockResolvedValue({
      id: 'layout-category',
      locale: 'es',
      name: 'Category layout',
    });

    const payload = await service.resolveHome('es');
    expect((payload.sections[0] as any).resolved).toHaveLength(1);
    expect(productsService.getProducts).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'cat-123', limit: 8 }),
    );
  });
});
