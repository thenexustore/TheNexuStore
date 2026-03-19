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


  it('falls back HERO_CAROUSEL to active banners when curated items reference inactive or missing banners', async () => {
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
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'item-1',
            section_id: 'hero-sec',
            position: 1,
            banner_id: 'banner-inactive',
            banner: {
              id: 'banner-inactive',
              is_active: false,
            },
          },
          {
            id: 'item-2',
            section_id: 'hero-sec',
            position: 2,
            banner_id: 'banner-missing',
            banner: null,
          },
        ]),
      },
      banner: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'banner-active',
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
    const heroSection = payload.sections[0] as any;

    expect(heroSection.type).toBe('HERO_CAROUSEL');
    expect(heroSection.resolved).toHaveLength(1);
    expect(heroSection.resolved[0]?.banner?.id).toBe('banner-active');
    expect(prisma.banner.findMany).toHaveBeenCalled();
  });

  it('keeps curated active banners even when they sort after the first six active banners', async () => {
    const activeBanners = Array.from({ length: 7 }, (_, index) => ({
      id: `banner-${index + 1}`,
      image: `/hero-${index + 1}.jpg`,
      title_text: `Hero ${index + 1}`,
      subtitle_text: `Sub ${index + 1}`,
      button_text: `Shop ${index + 1}`,
      button_link: `/products/${index + 1}`,
      sort_order: index + 1,
      is_active: true,
    }));

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
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'item-1',
            section_id: 'hero-sec',
            position: 1,
            banner_id: 'banner-7',
            banner: { id: 'banner-7', is_active: true },
          },
        ]),
      },
      banner: {
        findMany: jest.fn().mockResolvedValue(activeBanners),
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
    const heroSection = payload.sections[0] as any;

    expect(heroSection.type).toBe('HERO_CAROUSEL');
    expect(heroSection.resolved).toHaveLength(6);
    expect(heroSection.resolved.map((x: any) => x.banner_id)).toEqual([
      'banner-7',
      'banner-1',
      'banner-2',
      'banner-3',
      'banner-4',
      'banner-5',
    ]);
    expect(prisma.banner.findMany).toHaveBeenCalledWith({
      where: { is_active: true },
      orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }],
    });
  });

  it('keeps curated active banner order and appends new active banners from Banner module', async () => {
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
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'item-1',
            section_id: 'hero-sec',
            position: 1,
            banner_id: 'banner-2',
            banner: { id: 'banner-2', is_active: true },
          },
        ]),
      },
      banner: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'banner-1',
            image: '/hero-1.jpg',
            title_text: 'Hero 1',
            subtitle_text: 'Sub 1',
            button_text: 'Shop 1',
            button_link: '/products/1',
            sort_order: 1,
            is_active: true,
          },
          {
            id: 'banner-2',
            image: '/hero-2.jpg',
            title_text: 'Hero 2',
            subtitle_text: 'Sub 2',
            button_text: 'Shop 2',
            button_link: '/products/2',
            sort_order: 2,
            is_active: true,
          },
          {
            id: 'banner-3',
            image: '/hero-3.jpg',
            title_text: 'Hero 3',
            subtitle_text: 'Sub 3',
            button_text: 'Shop 3',
            button_link: '/products/3',
            sort_order: 3,
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
    const heroSection = payload.sections[0] as any;

    expect(heroSection.type).toBe('HERO_CAROUSEL');
    expect(heroSection.resolved).toHaveLength(3);
    expect(heroSection.resolved.map((x: any) => x.banner_id)).toEqual([
      'banner-2',
      'banner-1',
      'banner-3',
    ]);
    expect(heroSection.resolved[0]?.banner?.title_text).toBe('Hero 2');
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

  it('derives CATEGORY_STRIP auto-mode image_url from active category product media when category has no image', async () => {
    const prisma = {
      homePageSection: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'cat-strip-sec',
            type: 'CATEGORY_STRIP',
            title: 'Categories',
            subtitle: null,
            variant: null,
            config: { mode: 'auto', limit: 10 },
          },
        ]),
      },
      homePageLayout: { findUnique: jest.fn() },
      category: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'cat-1',
            name: 'Category 1',
            slug: 'category-1',
            is_active: true,
            parent_id: null,
          },
        ]),
      },
      product: {
        count: jest.fn().mockResolvedValue(3),
        findMany: jest.fn().mockResolvedValue([
          { id: 'p-1', title: 'Category 1 rack', slug: 'category-1-rack', media: [{ url: '/category-1-cover.jpg' }] },
        ]),
      },
    } as any;

    const productsService = {
      getDealsProducts: jest.fn().mockResolvedValue([]),
      getProducts: jest.fn().mockResolvedValue({ products: [] }),
    } as any;

    const service = new HomeLayoutService(prisma, productsService);
    jest.spyOn<any, any>(service as any, 'getActiveLayout').mockResolvedValue({
      id: 'layout-cats',
      locale: 'es',
      name: 'Categories layout',
    });

    const payload = await service.resolveHome('es');
    const section = payload.sections[0] as any;
    expect(section.type).toBe('CATEGORY_STRIP');
    expect(section.resolved).toHaveLength(1);
    expect(section.resolved[0].image_url).toBe('/category-1-cover.jpg');
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'ACTIVE' }),
      }),
    );
  });

  it('prioritizes high-demand keyword categories in CATEGORY_STRIP auto mode', async () => {
    const prisma = {
      homePageSection: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'cat-strip-sec',
            type: 'CATEGORY_STRIP',
            title: 'Categories',
            subtitle: null,
            variant: null,
            config: { mode: 'auto', limit: 2 },
          },
        ]),
      },
      homePageLayout: { findUnique: jest.fn() },
      category: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'cat-a', name: 'Portátiles', slug: 'portatiles', sort_order: 5, is_active: true, parent_id: null },
          { id: 'cat-b', name: 'Consumibles varios', slug: 'consumibles', sort_order: 1, is_active: true, parent_id: null },
          { id: 'cat-c', name: 'Impresoras', slug: 'impresoras', sort_order: 8, is_active: true, parent_id: null },
        ]),
      },
      product: {
        count: jest.fn().mockImplementation(({ where }) => {
          if (where?.OR?.some((x: any) => x.main_category_id === 'cat-a')) return Promise.resolve(8);
          if (where?.OR?.some((x: any) => x.main_category_id === 'cat-b')) return Promise.resolve(20);
          if (where?.OR?.some((x: any) => x.main_category_id === 'cat-c')) return Promise.resolve(4);
          return Promise.resolve(0);
        }),
        findMany: jest.fn().mockResolvedValue([{ id: 'p-1', title: 'fallback', slug: 'fallback', media: [{ url: '/fallback.jpg' }] }]),
      },
    } as any;

    const service = new HomeLayoutService(prisma, {} as any);
    jest.spyOn<any, any>(service as any, 'getActiveLayout').mockResolvedValue({
      id: 'layout-cats',
      locale: 'es',
      name: 'Categories layout',
    });

    const payload = await service.resolveHome('es');
    const section = payload.sections[0] as any;
    expect(section.type).toBe('CATEGORY_STRIP');
    expect(section.resolved).toHaveLength(2);
    expect(section.resolved.map((x: any) => x.slug)).toEqual(['portatiles', 'impresoras']);
  });

  it('picks fallback category image using product-title/category keyword matching', async () => {
    const prisma = {
      homePageSection: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'cat-strip-sec',
            type: 'CATEGORY_STRIP',
            title: 'Categories',
            subtitle: null,
            variant: null,
            config: { mode: 'auto', limit: 1 },
          },
        ]),
      },
      homePageLayout: { findUnique: jest.fn() },
      category: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'cat-network', name: 'Switches de Red', slug: 'switches-red', sort_order: 1, is_active: true, parent_id: null },
        ]),
      },
      product: {
        count: jest.fn().mockResolvedValue(10),
        findMany: jest.fn().mockResolvedValue([
          { id: 'p-random', title: 'Silla ergonómica oficina', slug: 'silla-ergonomica', media: [{ url: '/silla.jpg' }] },
          { id: 'p-switch', title: 'Switch de red gigabit 24 puertos', slug: 'switch-red-gigabit', media: [{ url: '/switch.jpg' }] },
        ]),
      },
    } as any;

    const service = new HomeLayoutService(prisma, {} as any);
    jest.spyOn<any, any>(service as any, 'getActiveLayout').mockResolvedValue({
      id: 'layout-cats',
      locale: 'es',
      name: 'Categories layout',
    });

    const payload = await service.resolveHome('es');
    const section = payload.sections[0] as any;
    expect(section.resolved[0].image_url).toBe('/switch.jpg');
  });



  it('derives parent category image from active child category products', async () => {
    const prisma = {
      homePageSection: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'cat-strip-sec',
            type: 'CATEGORY_STRIP',
            title: 'Categories',
            subtitle: null,
            variant: null,
            config: { mode: 'auto', limit: 1 },
          },
        ]),
      },
      homePageLayout: { findUnique: jest.fn() },
      category: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([
            { id: 'parent-network', name: 'Redes y servidores', slug: 'redes-servidores', sort_order: 1, is_active: true, parent_id: null },
          ])
          .mockResolvedValueOnce([
            { id: 'child-switches', parent_id: 'parent-network' },
          ]),
      },
      product: {
        count: jest.fn().mockResolvedValue(7),
        findMany: jest.fn().mockResolvedValue([
          { id: 'p-switch', title: 'Switch de red 24 puertos', slug: 'switch-red', media: [{ url: '/switch-parent.jpg' }] },
        ]),
      },
    } as any;

    const service = new HomeLayoutService(prisma, {} as any);
    jest.spyOn<any, any>(service as any, 'getActiveLayout').mockResolvedValue({
      id: 'layout-cats',
      locale: 'es',
      name: 'Categories layout',
    });

    const payload = await service.resolveHome('es');
    const section = payload.sections[0] as any;
    expect(section.resolved[0].image_url).toBe('/switch-parent.jpg');
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { main_category_id: { in: ['parent-network', 'child-switches'] } },
          ]),
        }),
      }),
    );
  });

  it('prefers parent categories with active children in CATEGORY_STRIP auto mode', async () => {
    const prisma = {
      homePageSection: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'cat-strip-sec',
            type: 'CATEGORY_STRIP',
            title: 'Categories',
            subtitle: null,
            variant: null,
            config: { mode: 'auto', limit: 2 },
          },
        ]),
      },
      homePageLayout: { findUnique: jest.fn() },
      category: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([
            { id: 'parent-a', name: 'Networking', slug: 'networking', sort_order: 2, is_active: true, parent_id: null },
            { id: 'parent-b', name: 'Storage', slug: 'storage', sort_order: 3, is_active: true, parent_id: null },
          ]),
      },
      product: {
        count: jest.fn().mockResolvedValue(3),
        findMany: jest.fn().mockResolvedValue([{ id: 'p-1', title: 'fallback', slug: 'fallback', media: [{ url: '/fallback.jpg' }] }]),
      },
    } as any;

    const service = new HomeLayoutService(prisma, {} as any);
    jest.spyOn<any, any>(service as any, 'getActiveLayout').mockResolvedValue({
      id: 'layout-cats',
      locale: 'es',
      name: 'Categories layout',
    });

    const payload = await service.resolveHome('es');
    const section = payload.sections[0] as any;
    expect(section.resolved).toHaveLength(2);
    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          parent_id: null,
          children: { some: { is_active: true } },
        }),
      }),
    );
  });

  it('supports alphabetical strategy in CATEGORY_STRIP auto mode', async () => {
    const prisma = {
      homePageSection: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'cat-strip-sec',
            type: 'CATEGORY_STRIP',
            title: 'Categories',
            subtitle: null,
            variant: null,
            config: { mode: 'auto', limit: 3, auto_strategy: 'alphabetical' },
          },
        ]),
      },
      homePageLayout: { findUnique: jest.fn() },
      category: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'cat-c', name: 'Zeta', slug: 'zeta', sort_order: 3, is_active: true, parent_id: null },
          { id: 'cat-a', name: 'Alpha', slug: 'alpha', sort_order: 2, is_active: true, parent_id: null },
          { id: 'cat-b', name: 'Beta', slug: 'beta', sort_order: 1, is_active: true, parent_id: null },
        ]),
      },
      product: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ id: 'p-1', title: 'fallback', slug: 'fallback', media: [{ url: '/fallback.jpg' }] }]),
      },
    } as any;

    const service = new HomeLayoutService(prisma, {} as any);
    jest.spyOn<any, any>(service as any, 'getActiveLayout').mockResolvedValue({
      id: 'layout-cats',
      locale: 'es',
      name: 'Categories layout',
    });

    const payload = await service.resolveHome('es');
    const section = payload.sections[0] as any;
    expect(section.resolved.map((x: any) => x.slug)).toEqual(['alpha', 'beta', 'zeta']);
  });

  it('fills CATEGORY_STRIP auto mode with child categories when parent pool is below configured limit', async () => {
    const prisma = {
      homePageSection: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'cat-strip-sec',
            type: 'CATEGORY_STRIP',
            title: 'Categories',
            subtitle: null,
            variant: null,
            config: { mode: 'auto', limit: 4 },
          },
        ]),
      },
      homePageLayout: { findUnique: jest.fn() },
      category: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([
            { id: 'parent-a', name: 'Networking', slug: 'networking', sort_order: 1, is_active: true, parent_id: null },
            { id: 'parent-b', name: 'Storage', slug: 'storage', sort_order: 2, is_active: true, parent_id: null },
          ])
          .mockResolvedValueOnce([
            { id: 'child-cables', name: 'Cables', slug: 'cables', sort_order: 3, is_active: true, parent_id: 'parent-a' },
            { id: 'child-routers', name: 'Routers', slug: 'routers', sort_order: 4, is_active: true, parent_id: 'parent-a' },
          ])
          .mockResolvedValueOnce([
            { id: 'child-sw', parent_id: 'parent-a' },
            { id: 'child-ssd', parent_id: 'parent-b' },
          ]),
      },
      product: {
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([{ id: 'p-1', title: 'fallback', slug: 'fallback', media: [{ url: '/fallback.jpg' }] }]),
      },
    } as any;

    const service = new HomeLayoutService(prisma, {} as any);
    jest.spyOn<any, any>(service as any, 'getActiveLayout').mockResolvedValue({
      id: 'layout-cats',
      locale: 'es',
      name: 'Categories layout',
    });

    const payload = await service.resolveHome('es');
    const section = payload.sections[0] as any;
    expect(section.resolved).toHaveLength(4);
    expect(section.resolved.map((x: any) => x.slug)).toEqual(
      expect.arrayContaining(['networking', 'storage', 'cables', 'routers']),
    );
  });


  it('supports CATEGORY source with parent_and_descendants scope for product carousel', async () => {
    const prisma = {
      homePageSection: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'prod-sec',
            type: 'PRODUCT_CAROUSEL',
            title: 'Category picks',
            subtitle: null,
            variant: null,
            config: {
              source: 'CATEGORY',
              categoryIds: ['parent-cat'],
              category_scope: 'parent_and_descendants',
              limit: 6,
            },
          },
        ]),
      },
      homePageLayout: { findUnique: jest.fn() },
      category: {
        findMany: jest.fn().mockResolvedValue([{ id: 'child-cat', parent_id: 'parent-cat' }]),
      },
      product: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'p1',
            status: 'ACTIVE',
            title: 'Switch 24 puertos',
            slug: 'switch-24',
            brand: { name: 'Nexus' },
            media: [{ url: '/switch.jpg' }],
            skus: [{ prices: [{ sale_price: 100, compare_at_price: 120 }], inventory: [{ qty_on_hand: 5 }] }],
          },
        ]),
      },
      featuredProduct: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;

    const service = new HomeLayoutService(prisma, { getProducts: jest.fn(), getDealsProducts: jest.fn() } as any);
    jest.spyOn<any, any>(service as any, 'getActiveLayout').mockResolvedValue({
      id: 'layout-category',
      locale: 'es',
      name: 'Category layout',
    });

    const payload = await service.resolveHome('es');
    expect((payload.sections[0] as any).resolved).toHaveLength(1);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { main_category_id: { in: ['parent-cat', 'child-cat'] } },
          ]),
        }),
      }),
    );
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


describe('HomeLayoutService section ordering integrity', () => {

  it('rejects reorder payload with duplicated section ids', async () => {
    const prisma = {
      homePageSection: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    } as any;

    const service = new HomeLayoutService(prisma, {} as any);

    await expect(
      service.reorderSections({
        items: [
          { id: 'sec-1', position: 1 },
          { id: 'sec-1', position: 2 },
        ],
      }),
    ).rejects.toThrow('Section ids must be unique');
  });


  it('rejects reorder payload with duplicated positions', async () => {
    const prisma = {
      homePageSection: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    } as any;

    const service = new HomeLayoutService(prisma, {} as any);

    await expect(
      service.reorderSections({
        items: [
          { id: 'sec-1', position: 1 },
          { id: 'sec-2', position: 1 },
        ],
      }),
    ).rejects.toThrow('Section positions must be unique');
  });

  it('rejects reorder payload with non-positive positions', async () => {
    const prisma = {
      homePageSection: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    } as any;

    const service = new HomeLayoutService(prisma, {} as any);

    await expect(
      service.reorderSections({
        items: [
          { id: 'sec-1', position: 0 },
          { id: 'sec-2', position: 2 },
        ],
      }),
    ).rejects.toThrow('positions must be positive integers');
  });

  it('reorders sections and normalizes contiguous positions', async () => {
    const prisma = {
      homePageSection: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([
            { id: 'sec-1', layout_id: 'layout-1' },
            { id: 'sec-2', layout_id: 'layout-1' },
            { id: 'sec-3', layout_id: 'layout-1' },
          ])
          .mockResolvedValueOnce([
            { id: 'sec-3' },
            { id: 'sec-1' },
            { id: 'sec-2' },
          ])
          .mockResolvedValueOnce([
            { id: 'sec-3', position: 1 },
            { id: 'sec-1', position: 2 },
            { id: 'sec-2', position: 3 },
          ]),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn(async (ops) => Promise.all(ops)),
    } as any;

    const service = new HomeLayoutService(prisma, {} as any);

    const result = await service.reorderSections({
      items: [
        { id: 'sec-3', position: 1 },
        { id: 'sec-1', position: 2 },
        { id: 'sec-2', position: 3 },
      ],
    });

    expect(prisma.homePageSection.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'sec-3' }, data: { position: 1 } }),
    );
    expect(result.map((x: any) => x.id)).toEqual(['sec-3', 'sec-1', 'sec-2']);
  });

  it('reindexes positions after removing a section', async () => {
    const prisma = {
      homePageSection: {
        findUnique: jest.fn().mockResolvedValue({ id: 'sec-2', layout_id: 'layout-1' }),
        delete: jest.fn().mockResolvedValue({ id: 'sec-2' }),
        findMany: jest.fn().mockResolvedValue([
          { id: 'sec-1' },
          { id: 'sec-3' },
        ]),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn(async (ops) => Promise.all(ops)),
    } as any;

    const service = new HomeLayoutService(prisma, {} as any);

    await service.removeSection('sec-2');

    expect(prisma.homePageSection.findUnique).toHaveBeenCalledWith({ where: { id: 'sec-2' } });
    expect(prisma.homePageSection.delete).toHaveBeenCalledWith({ where: { id: 'sec-2' } });
    expect(prisma.homePageSection.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: { id: 'sec-1' }, data: { position: 1 } }),
    );
    expect(prisma.homePageSection.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: { id: 'sec-3' }, data: { position: 2 } }),
    );
  });
});
