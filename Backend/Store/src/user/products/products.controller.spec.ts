import { ProductsController } from './products.controller';

describe('ProductsController category routing', () => {
  const productsService = {
    getProducts: jest.fn(),
  } as any;

  let controller: ProductsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ProductsController(productsService);
    productsService.getProducts.mockResolvedValue({
      products: [],
      total: 0,
      page: 1,
      limit: 20,
      total_pages: 0,
    });
  });

  it('maps /categories/:slug/products requests to the legacy singular category filter', async () => {
    const query = { page: 2, categories: ['already-present'] } as any;

    await controller.getProductsByCategory('ordenadores-portatiles', query);

    expect(productsService.getProducts).toHaveBeenCalledWith({
      page: 2,
      categories: ['already-present'],
      category: 'ordenadores-portatiles',
    });
  });
});
