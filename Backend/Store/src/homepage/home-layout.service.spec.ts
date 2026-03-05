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
