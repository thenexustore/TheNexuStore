import {
  buildCategoryLevel2Descriptor,
  buildCategoryTaxonomyTree,
  getDescendantIds,
  normalizeCategoryTaxonomyRows,
} from './category-taxonomy.util';

describe('category-taxonomy.util', () => {
  const rows = [
    {
      id: 'grandparent-a',
      name: 'A',
      slug: 'a',
      parent_id: null,
      sort_order: 2,
    },
    {
      id: 'parent-a1',
      name: 'A1',
      slug: 'a-1',
      parent_id: 'grandparent-a',
      sort_order: 1,
    },
    {
      id: 'child-a1-1',
      name: 'A11',
      slug: 'a-1-1',
      parent_id: 'parent-a1',
      sort_order: 1,
    },
    {
      id: 'orphan',
      name: 'Orphan',
      slug: 'orphan',
      parent_id: 'missing',
      sort_order: 3,
    },
    {
      id: 'grandparent-b',
      name: 'B',
      slug: 'b',
      parent_id: null,
      sort_order: 1,
    },
  ];

  it('builds deterministic tree and preserves ancestry path', () => {
    const tree = buildCategoryTaxonomyTree(rows, 3);

    expect(tree.map((node) => node.id)).toEqual([
      'grandparent-b',
      'grandparent-a',
      'orphan',
    ]);
    expect(tree[1].children[0].children[0].path).toBe('A > A1 > A11');
    expect(
      tree[1].children[0].children[0].ancestry.map((item) => item.slug),
    ).toEqual(['a', 'a-1', 'a-1-1']);
  });

  it('stops recursion when a cycle is detected', () => {
    const cyclic = [
      { id: 'x', name: 'X', slug: 'x', parent_id: 'y', sort_order: 1 },
      { id: 'y', name: 'Y', slug: 'y', parent_id: 'x', sort_order: 2 },
    ];

    expect(buildCategoryTaxonomyTree(cyclic, 5)).toEqual([]);
  });

  it('collects descendants including root id once', () => {
    const descendants = getDescendantIds('grandparent-a', rows);
    expect(descendants).toEqual(['grandparent-a', 'parent-a1', 'child-a1-1']);
  });

  it('includes seeded parent categories with no children (empty children array)', () => {
    const taxonomyRows = [
      { id: 'p1', name: 'Ordenadores y portátiles', slug: 'ordenadores-portatiles', parent_id: null, sort_order: 10 },
      { id: 'p2', name: 'Componentes y almacenamiento', slug: 'componentes-almacenamiento', parent_id: null, sort_order: 20 },
      { id: 'p3', name: 'Monitores y periféricos', slug: 'monitores-perifericos', parent_id: null, sort_order: 30 },
      { id: 'p4', name: 'Impresión y escaneado', slug: 'impresion-escaneado', parent_id: null, sort_order: 40 },
      { id: 'p5', name: 'Redes y servidores', slug: 'redes-servidores', parent_id: null, sort_order: 50 },
      { id: 'p6', name: 'Telefonía y movilidad', slug: 'telefonia-movilidad', parent_id: null, sort_order: 60 },
      { id: 'p7', name: 'TV, audio y vídeo', slug: 'tv-audio-video', parent_id: null, sort_order: 65 },
      { id: 'p8', name: 'Software y seguridad', slug: 'software-seguridad', parent_id: null, sort_order: 70 },
      { id: 'p9', name: 'Gaming y smart home', slug: 'gaming-smart-home', parent_id: null, sort_order: 80 },
      { id: 'p10', name: 'Accesorios y consumibles', slug: 'accesorios-consumibles', parent_id: null, sort_order: 90 },
      // Only p1 has a child
      { id: 'c1', name: 'Portátiles', slug: 'ordenadores-portatiles-portatiles', parent_id: 'p1', sort_order: 1 },
    ];

    const tree = buildCategoryTaxonomyTree(taxonomyRows, 3);

    expect(tree).toHaveLength(10);
    expect(tree.map((n) => n.slug)).toEqual([
      'ordenadores-portatiles',
      'componentes-almacenamiento',
      'monitores-perifericos',
      'impresion-escaneado',
      'redes-servidores',
      'telefonia-movilidad',
      'tv-audio-video',
      'software-seguridad',
      'gaming-smart-home',
      'accesorios-consumibles',
    ]);

    const ordenadores = tree.find((n) => n.slug === 'ordenadores-portatiles')!;
    expect(ordenadores.children).toHaveLength(1);

    const componentes = tree.find((n) => n.slug === 'componentes-almacenamiento')!;
    expect(componentes.children).toHaveLength(0);
  });

  it('respects sort_order when building the tree', () => {
    const unordered = [
      { id: 'z', name: 'Z', slug: 'z', parent_id: null, sort_order: 30 },
      { id: 'a', name: 'A', slug: 'a', parent_id: null, sort_order: 10 },
      { id: 'm', name: 'M', slug: 'm', parent_id: null, sort_order: 20 },
    ];
    const tree = buildCategoryTaxonomyTree(unordered, 3);
    expect(tree.map((n) => n.slug)).toEqual(['a', 'm', 'z']);
  });

  it('reparents orphaned roots under canonical parent buckets and seeds missing parents virtually', () => {
    const normalized = normalizeCategoryTaxonomyRows([
      {
        id: 'leaf-ups',
        name: 'Accesorios SAI',
        slug: 'accesorios-sai',
        parent_id: null,
        sort_order: 10,
      },
      {
        id: 'leaf-printer',
        name: 'Accesorios Impresora',
        slug: 'accesorios-impresora',
        parent_id: null,
        sort_order: 20,
      },
    ]);

    const tree = buildCategoryTaxonomyTree(normalized, 3);
    const networking = tree.find((node) => node.slug === 'redes-servidores');
    const printing = tree.find((node) => node.slug === 'impresion-escaneado');

    expect(networking?.children.map((node) => node.slug)).toContain(
      'redes-servidores-familia-rack-energia-cableado',
    );
    expect(
      networking?.children[0]?.children.map((node) => node.slug),
    ).toContain('accesorios-sai');
    expect(printing?.children.map((node) => node.slug)).toContain(
      'impresion-escaneado-familia-impresoras-multifuncion',
    );
    expect(
      printing?.children[0]?.children.map((node) => node.slug),
    ).toContain('accesorios-impresora');
  });

  it('creates synthetic level-2 parent buckets under canonical grandparents', () => {
    const normalized = normalizeCategoryTaxonomyRows([
      {
        id: 'cpu',
        name: 'Procesadores',
        slug: 'procesadores',
        parent_id: 'canonical-parent',
        sort_order: 10,
      },
      {
        id: 'ssd',
        name: 'SSD NVMe',
        slug: 'ssd-nvme',
        parent_id: 'canonical-parent',
        sort_order: 20,
      },
      {
        id: 'canonical-parent',
        name: 'Componentes y almacenamiento',
        slug: 'componentes-almacenamiento',
        parent_id: null,
        sort_order: 20,
      },
    ]);

    const tree = buildCategoryTaxonomyTree(normalized, 3);
    const root = tree.find((node) => node.slug === 'componentes-almacenamiento');

    expect(root?.children.map((node) => node.slug)).toEqual([
      'componentes-almacenamiento-familia-componentes-pc',
      'componentes-almacenamiento-familia-memoria-almacenamiento',
    ]);
    expect(root?.children[0]?.children.map((node) => node.slug)).toEqual([
      'procesadores',
    ]);
    expect(root?.children[1]?.children.map((node) => node.slug)).toEqual([
      'ssd-nvme',
    ]);
  });

  it('prioritizes family/subfamily context when resolving the level-2 parent', () => {
    const descriptor = buildCategoryLevel2Descriptor('impresion-escaneado', {
      familyName: 'Consumibles de impresión',
      subfamilyName: 'Tóner láser',
      name: 'Tóner láser',
      slug: 'toner-laser',
    });

    expect(descriptor.slug).toBe(
      'impresion-escaneado-familia-consumibles-impresion',
    );
    expect(descriptor.name).toBe('Consumibles de impresión');
  });

  it.each([
    {
      grandparentSlug: 'impresion-escaneado',
      familyName: 'Consumibles',
      subfamilyName: 'Tambor de imagen',
      expectedSlug: 'impresion-escaneado-familia-consumibles-impresion',
    },
    {
      grandparentSlug: 'redes-servidores',
      familyName: 'Energía',
      subfamilyName: 'PDU para rack',
      expectedSlug: 'redes-servidores-familia-rack-energia-cableado',
    },
    {
      grandparentSlug: 'software-seguridad',
      familyName: 'Ofimática',
      subfamilyName: 'Microsoft 365 Empresa',
      expectedSlug: 'software-seguridad-familia-productividad-licencias',
    },
    {
      grandparentSlug: 'tv-audio-video',
      familyName: 'Audio',
      subfamilyName: 'Altavoz WiFi multiroom',
      expectedSlug: 'tv-audio-video-familia-audio-home-cinema',
    },
  ])(
    'matches expected level-2 parent for $familyName / $subfamilyName',
    ({ grandparentSlug, familyName, subfamilyName, expectedSlug }) => {
      const descriptor = buildCategoryLevel2Descriptor(grandparentSlug, {
        familyName,
        subfamilyName,
        name: subfamilyName,
        slug: subfamilyName.toLowerCase().replace(/\s+/g, '-'),
      });

      expect(descriptor.slug).toBe(expectedSlug);
    },
  );

  it('deduplicates canonical parent aliases into a single visible root', () => {
    const normalized = normalizeCategoryTaxonomyRows([
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
        id: 'child-row',
        name: 'Portátiles',
        slug: 'portatiles',
        parent_id: 'alias-parent',
        sort_order: 1,
      },
    ]);

    const tree = buildCategoryTaxonomyTree(normalized, 3);
    const canonical = tree.find((node) => node.slug === 'ordenadores-portatiles');

    expect(
      tree.filter((node) => node.slug === 'ordenadores-portatiles'),
    ).toHaveLength(1);
    expect(canonical?.children.map((node) => node.slug)).toContain(
      'ordenadores-portatiles-familia-portatiles',
    );
    expect(
      canonical?.children[0]?.children.map((node) => node.slug),
    ).toContain('portatiles');
    expect(canonical?.children.map((node) => node.slug)).not.toContain(
      'ordenadores-y-portatiles',
    );
  });
});
