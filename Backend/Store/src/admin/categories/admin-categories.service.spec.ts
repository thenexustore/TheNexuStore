import { AdminCategoriesService } from './admin-categories.service';

describe('AdminCategoriesService taxonomy audit', () => {
  const prisma = {
    category: {
      findMany: jest.fn(),
    },
  } as any;

  let service: AdminCategoriesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminCategoriesService(prisma);
  });

  it('reports direct canonical children, mismatched level-2 parenting and grouped summaries', async () => {
    prisma.category.findMany.mockResolvedValue([
      {
        id: 'canon-print',
        name: 'Impresión y escaneado',
        slug: 'impresion-escaneado',
        parent_id: null,
        is_active: true,
        parent: null,
        _count: { children: 1, products_main: 0 },
      },
      {
        id: 'canon-laptops',
        name: 'Ordenadores y portátiles',
        slug: 'ordenadores-portatiles',
        parent_id: null,
        is_active: true,
        parent: null,
        _count: { children: 1, products_main: 0 },
      },
      {
        id: 'wrong-child',
        name: 'Cartucho tóner',
        slug: 'cartucho-toner',
        parent_id: 'canon-print',
        is_active: true,
        parent: {
          id: 'canon-print',
          name: 'Impresión y escaneado',
          slug: 'impresion-escaneado',
          parent_id: null,
        },
        _count: { children: 0, products_main: 7 },
      },
      {
        id: 'level2-laptops',
        name: 'Portátiles',
        slug: 'ordenadores-portatiles-familia-portatiles',
        parent_id: 'canon-laptops',
        is_active: true,
        parent: {
          id: 'canon-laptops',
          name: 'Ordenadores y portátiles',
          slug: 'ordenadores-portatiles',
          parent_id: null,
        },
        _count: { children: 1, products_main: 0 },
      },
      {
        id: 'leaf-laptops',
        name: 'Portátiles',
        slug: 'portatiles',
        parent_id: 'level2-laptops',
        is_active: true,
        parent: {
          id: 'level2-laptops',
          name: 'Portátiles',
          slug: 'ordenadores-portatiles-familia-portatiles',
          parent_id: 'canon-laptops',
        },
        _count: { children: 0, products_main: 11 },
      },
    ]);

    const result = await service.getTaxonomyStatus();

    expect(result.direct_children_of_canonical).toEqual([
      expect.objectContaining({
        slug: 'cartucho-toner',
        parent_slug: 'impresion-escaneado',
      }),
    ]);
    expect(result.direct_children_summary_by_canonical).toEqual([
      { key: 'impresion-escaneado', count: 1 },
    ]);
    expect(result.mismatched_level2_parenting).toEqual([
      expect.objectContaining({
        slug: 'cartucho-toner',
        current_parent_slug: 'impresion-escaneado',
        expected_parent_slug:
          'impresion-escaneado-familia-consumibles-impresion',
      }),
    ]);
    expect(result.mismatched_summary_by_expected_parent).toEqual([
      {
        key: 'impresion-escaneado-familia-consumibles-impresion',
        count: 1,
      },
    ]);
    expect(result.mismatched_summary_by_current_parent).toEqual([
      { key: 'impresion-escaneado', count: 1 },
    ]);
    expect(result.redundant_navigation_candidates).toEqual([
      expect.objectContaining({
        slug: 'ordenadores-portatiles-familia-portatiles',
      }),
    ]);
    expect(result.stats).toEqual(
      expect.objectContaining({
        total_level2_parents: 1,
        total_direct_children_of_canonical: 1,
        total_mismatched_level2_parenting: 1,
        total_redundant_navigation_candidates: 1,
      }),
    );
  });

  it('uses stored category name + slug when auditing misclassified mobility categories', async () => {
    prisma.category.findMany.mockResolvedValue([
      {
        id: 'canon-laptops',
        name: 'Ordenadores y portátiles',
        slug: 'ordenadores-portatiles',
        parent_id: null,
        is_active: true,
        parent: null,
        _count: { children: 1, products_main: 0 },
      },
      {
        id: 'terminal-row',
        name: 'Terminal móvil RFID',
        slug: 'terminal-rfid',
        parent_id: 'canon-laptops',
        is_active: true,
        parent: {
          id: 'canon-laptops',
          name: 'Ordenadores y portátiles',
          slug: 'ordenadores-portatiles',
          parent_id: null,
        },
        _count: { children: 0, products_main: 3 },
      },
    ]);

    const result = await service.getTaxonomyStatus();

    expect(result.mismatched_level2_parenting).toEqual([
      expect.objectContaining({
        slug: 'terminal-rfid',
        current_parent_slug: 'ordenadores-portatiles',
        expected_parent_slug:
          'telefonia-movilidad-familia-movilidad-profesional-gps-rf',
      }),
    ]);
    expect(result.mismatched_summary_by_expected_parent).toEqual([
      {
        key: 'telefonia-movilidad-familia-movilidad-profesional-gps-rf',
        count: 1,
      },
    ]);
  });
});
