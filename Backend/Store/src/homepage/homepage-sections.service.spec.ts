import { PrismaService } from '../common/prisma.service';
import { BannersService } from '../admin/banners/banners.service';
import { ProductsService } from '../user/products/products.service';
import { HomepageSectionsService } from './homepage-sections.service';
import { HomepageSectionType } from './homepage-section.types';

describe('HomepageSectionsService', () => {
  const prisma = {
    category: { findUnique: jest.fn() },
    brand: { findUnique: jest.fn() },
  } as unknown as PrismaService;

  const productsService = {
    getProducts: jest.fn(),
    getDealsProducts: jest.fn(),
  } as unknown as ProductsService;

  const bannersService = {} as BannersService;

  let service: HomepageSectionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HomepageSectionsService(
      prisma,
      productsService,
      bannersService,
    );
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.brand.findUnique as jest.Mock).mockResolvedValue(null);
  });

  it('defaults featured picks query configs to featured-only during normalization', () => {
    const normalized = (service as any).normalizeProductCarouselConfig(
      HomepageSectionType.FEATURED_PICKS,
      {
        source: 'query',
        query: { type: 'products', limit: 12 },
      },
    );

    expect(normalized.query.featuredOnly).toBe(true);
    expect(normalized.featured_only).toBe(true);
  });

  it('preserves explicit featuredOnly=false overrides for featured picks', () => {
    const normalized = (service as any).normalizeProductCarouselConfig(
      HomepageSectionType.FEATURED_PICKS,
      {
        source: 'query',
        query: { type: 'products', featuredOnly: false },
      },
    );

    expect(normalized.query.featuredOnly).toBe(false);
    expect(normalized.featured_only).toBe(false);
  });

  it('uses featured_only=true by default when querying featured picks', async () => {
    (productsService.getProducts as jest.Mock).mockResolvedValue({
      products: [{ id: 'p1' }],
    });

    const result = await (service as any).executeProductsQuery(
      { source: 'query', query: { type: 'products', limit: 12 } },
      HomepageSectionType.FEATURED_PICKS,
    );

    expect(productsService.getProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        featured_only: true,
      }),
    );
    expect(result).toEqual([{ id: 'p1' }]);
  });
});
