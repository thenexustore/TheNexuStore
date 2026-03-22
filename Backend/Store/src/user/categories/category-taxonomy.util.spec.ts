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
      {
        id: 'p1',
        name: 'Ordenadores y portátiles',
        slug: 'ordenadores-portatiles',
        parent_id: null,
        sort_order: 10,
      },
      {
        id: 'p2',
        name: 'Componentes y almacenamiento',
        slug: 'componentes-almacenamiento',
        parent_id: null,
        sort_order: 20,
      },
      {
        id: 'p3',
        name: 'Monitores y periféricos',
        slug: 'monitores-perifericos',
        parent_id: null,
        sort_order: 30,
      },
      {
        id: 'p4',
        name: 'Impresión y escaneado',
        slug: 'impresion-escaneado',
        parent_id: null,
        sort_order: 40,
      },
      {
        id: 'p5',
        name: 'Redes y servidores',
        slug: 'redes-servidores',
        parent_id: null,
        sort_order: 50,
      },
      {
        id: 'p6',
        name: 'Telefonía y movilidad',
        slug: 'telefonia-movilidad',
        parent_id: null,
        sort_order: 60,
      },
      {
        id: 'p7',
        name: 'TV, audio y vídeo',
        slug: 'tv-audio-video',
        parent_id: null,
        sort_order: 65,
      },
      {
        id: 'p8',
        name: 'Software y seguridad',
        slug: 'software-seguridad',
        parent_id: null,
        sort_order: 70,
      },
      {
        id: 'p9',
        name: 'Gaming y smart home',
        slug: 'gaming-smart-home',
        parent_id: null,
        sort_order: 80,
      },
      {
        id: 'p10',
        name: 'Accesorios y consumibles',
        slug: 'accesorios-consumibles',
        parent_id: null,
        sort_order: 90,
      },
      // Only p1 has a child
      {
        id: 'c1',
        name: 'Portátiles',
        slug: 'ordenadores-portatiles-portatiles',
        parent_id: 'p1',
        sort_order: 1,
      },
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

    const componentes = tree.find(
      (n) => n.slug === 'componentes-almacenamiento',
    )!;
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
    expect(printing?.children[0]?.children.map((node) => node.slug)).toContain(
      'accesorios-impresora',
    );
  });

  it('rescues misplaced rows from otras-categorias when the name clearly maps to another canonical parent', () => {
    const normalized = normalizeCategoryTaxonomyRows([
      {
        id: 'canonical-accessories',
        name: 'Accesorios y consumibles',
        slug: 'accesorios-consumibles',
        parent_id: null,
        sort_order: 90,
      },
      {
        id: 'misplaced-ap',
        name: 'Puntos de acceso',
        slug: 'puntos-de-acceso',
        parent_id: 'canonical-accessories',
        sort_order: 10,
      },
      {
        id: 'misplaced-toner',
        name: 'Tambor/Fotoconductor',
        slug: 'tambor-fotoconductor',
        parent_id: 'canonical-accessories',
        sort_order: 20,
      },
      {
        id: 'misplaced-ip-phone',
        name: 'Teléfonos IP',
        slug: 'telefonos-ip',
        parent_id: 'canonical-accessories',
        sort_order: 30,
      },
    ]);

    const tree = buildCategoryTaxonomyTree(normalized, 3);
    const networking = tree.find((node) => node.slug === 'redes-servidores');
    const printing = tree.find((node) => node.slug === 'impresion-escaneado');

    expect(networking?.children.map((node) => node.slug)).toContain(
      'redes-servidores-familia-redes-wifi',
    );
    expect(
      networking?.children
        .flatMap((node) => node.children)
        .map((node) => node.slug),
    ).toContain('puntos-de-acceso');

    expect(printing?.children.map((node) => node.slug)).toContain(
      'impresion-escaneado-familia-consumibles-impresion',
    );
    expect(
      printing?.children
        .flatMap((node) => node.children)
        .map((node) => node.slug),
    ).toContain('tambor-fotoconductor');

    const telephony = tree.find((node) => node.slug === 'telefonia-movilidad');
    expect(telephony?.children.map((node) => node.slug)).toContain(
      'telefonia-movilidad-familia-smartphones-telefonia',
    );
    expect(
      telephony?.children
        .flatMap((node) => node.children)
        .map((node) => node.slug),
    ).toContain('telefonos-ip');
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
    const root = tree.find(
      (node) => node.slug === 'componentes-almacenamiento',
    );

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
      grandparentSlug: 'redes-servidores',
      familyName: 'Infraestructura',
      subfamilyName: 'SFP 10G multimodo',
      expectedSlug: 'redes-servidores-familia-rack-energia-cableado',
    },
    {
      grandparentSlug: 'redes-servidores',
      familyName: 'Cableado',
      subfamilyName: 'Latiguillo fibra óptica',
      expectedSlug: 'redes-servidores-familia-rack-energia-cableado',
    },
    {
      grandparentSlug: 'redes-servidores',
      familyName: 'Rack',
      subfamilyName: 'Armario rack mural 19',
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
    {
      grandparentSlug: 'redes-servidores',
      familyName: 'Networking',
      subfamilyName: 'Firewall UTM',
      expectedSlug: 'redes-servidores-familia-seguridad-edge-conectividad',
    },
    {
      grandparentSlug: 'telefonia-movilidad',
      familyName: 'Movilidad profesional',
      subfamilyName: 'Terminal PDA de radiofrecuencia',
      expectedSlug: 'telefonia-movilidad-familia-movilidad-profesional-gps-rf',
    },
    {
      grandparentSlug: 'monitores-perifericos',
      familyName: 'Periféricos',
      subfamilyName: 'Escáner de mano y lector de código',
      expectedSlug: 'monitores-perifericos-familia-digitalizacion-lectores',
    },
    {
      grandparentSlug: 'accesorios-consumibles',
      familyName: 'Accesorios',
      subfamilyName: 'Brazo monitor ergonómico',
      expectedSlug: 'accesorios-consumibles-familia-soportes-ergonomia',
    },
    {
      grandparentSlug: 'accesorios-consumibles',
      familyName: 'Cableado',
      subfamilyName: 'HDMI 2.1 alta velocidad',
      expectedSlug: 'accesorios-consumibles-familia-cables-adaptadores',
    },
    {
      grandparentSlug: 'accesorios-consumibles',
      familyName: 'Adaptadores',
      subfamilyName: 'USB-C a HDMI',
      expectedSlug: 'accesorios-consumibles-familia-cables-adaptadores',
    },
    {
      grandparentSlug: 'accesorios-consumibles',
      familyName: 'Cableado',
      subfamilyName: 'DisplayPort 1.4',
      expectedSlug: 'accesorios-consumibles-familia-cables-adaptadores',
    },
    {
      grandparentSlug: 'accesorios-consumibles',
      familyName: 'Ergonomía',
      subfamilyName: 'Reposamuñecas gel teclado',
      expectedSlug: 'accesorios-consumibles-familia-soportes-ergonomia',
    },
    {
      grandparentSlug: 'accesorios-consumibles',
      familyName: 'Ergonomía',
      subfamilyName: 'Soporte portátil plegable',
      expectedSlug: 'accesorios-consumibles-familia-soportes-ergonomia',
    },
    {
      grandparentSlug: 'accesorios-consumibles',
      familyName: 'Accesorios',
      subfamilyName: 'Alfombrilla ergonómica',
      expectedSlug: 'accesorios-consumibles-familia-soportes-ergonomia',
    },
    {
      grandparentSlug: 'accesorios-consumibles',
      familyName: 'Transporte',
      subfamilyName: 'Sleeve 15.6',
      expectedSlug: 'accesorios-consumibles-familia-fundas-transporte',
    },
    {
      grandparentSlug: 'accesorios-consumibles',
      familyName: 'Transporte',
      subfamilyName: 'Mochila portátil 15.6',
      expectedSlug: 'accesorios-consumibles-familia-fundas-transporte',
    },
    {
      grandparentSlug: 'accesorios-consumibles',
      familyName: 'Transporte',
      subfamilyName: 'Maletín trolley',
      expectedSlug: 'accesorios-consumibles-familia-fundas-transporte',
    },
    {
      grandparentSlug: 'accesorios-consumibles',
      familyName: 'Mantenimiento',
      subfamilyName: 'Aire comprimido multiuso',
      expectedSlug: 'accesorios-consumibles-familia-limpieza-mantenimiento',
    },
    {
      grandparentSlug: 'accesorios-consumibles',
      familyName: 'Limpieza',
      subfamilyName: 'Kit limpieza pantalla',
      expectedSlug: 'accesorios-consumibles-familia-limpieza-mantenimiento',
    },
    {
      grandparentSlug: 'accesorios-consumibles',
      familyName: 'Limpieza',
      subfamilyName: 'Toallitas limpieza monitor',
      expectedSlug: 'accesorios-consumibles-familia-limpieza-mantenimiento',
    },
    {
      grandparentSlug: 'accesorios-consumibles',
      familyName: 'Baterías',
      subfamilyName: 'Pila botón CR2032',
      expectedSlug: 'accesorios-consumibles-familia-pilas-baterias',
    },
    {
      grandparentSlug: 'accesorios-consumibles',
      familyName: 'Baterías',
      subfamilyName: 'Batería recargable AA',
      expectedSlug: 'accesorios-consumibles-familia-pilas-baterias',
    },
    {
      grandparentSlug: 'accesorios-consumibles',
      familyName: 'Baterías',
      subfamilyName: 'Pilas AAA',
      expectedSlug: 'accesorios-consumibles-familia-pilas-baterias',
    },
    {
      grandparentSlug: 'accesorios-consumibles',
      familyName: 'Energía',
      subfamilyName: 'Power strip 6 tomas',
      expectedSlug: 'accesorios-consumibles-familia-energia-carga',
    },
    {
      grandparentSlug: 'accesorios-consumibles',
      familyName: 'Energía',
      subfamilyName: 'Base múltiple 6 tomas',
      expectedSlug: 'accesorios-consumibles-familia-energia-carga',
    },
    {
      grandparentSlug: 'accesorios-consumibles',
      familyName: 'Carga',
      subfamilyName: 'Cargador universal portátil',
      expectedSlug: 'accesorios-consumibles-familia-energia-carga',
    },
    {
      grandparentSlug: 'accesorios-consumibles',
      familyName: 'Seguridad',
      subfamilyName: 'Candado portátil con llave',
      expectedSlug: 'accesorios-consumibles-familia-seguridad-organizacion',
    },
    {
      grandparentSlug: 'accesorios-consumibles',
      familyName: 'Seguridad',
      subfamilyName: 'Filtro privacidad 15.6',
      expectedSlug: 'accesorios-consumibles-familia-seguridad-organizacion',
    },
    {
      grandparentSlug: 'accesorios-consumibles',
      familyName: 'Organización',
      subfamilyName: 'Organizador cables escritorio',
      expectedSlug: 'accesorios-consumibles-familia-seguridad-organizacion',
    },
    {
      grandparentSlug: 'accesorios-consumibles',
      familyName: 'Seguridad',
      subfamilyName: 'Filtro de privacidad magnético',
      expectedSlug: 'accesorios-consumibles-familia-seguridad-organizacion',
    },
    {
      grandparentSlug: 'accesorios-consumibles',
      familyName: 'Seguridad',
      subfamilyName: 'Anclaje antirrobo sobremesa',
      expectedSlug: 'accesorios-consumibles-familia-seguridad-organizacion',
    },
    {
      grandparentSlug: 'accesorios-consumibles',
      familyName: 'Organización',
      subfamilyName: 'Bridas velcro reutilizables',
      expectedSlug: 'accesorios-consumibles-familia-seguridad-organizacion',
    },
    {
      grandparentSlug: 'accesorios-consumibles',
      familyName: 'Consumibles',
      subfamilyName: 'Spray de limpieza',
      expectedSlug: 'accesorios-consumibles-familia-limpieza-mantenimiento',
    },
    {
      grandparentSlug: 'componentes-almacenamiento',
      familyName: 'Componentes',
      subfamilyName: 'Chasis ATX para PC',
      expectedSlug: 'componentes-almacenamiento-familia-cajas-montaje',
    },
    {
      grandparentSlug: 'gaming-smart-home',
      familyName: 'Gaming',
      subfamilyName: 'Silla gaming premium',
      expectedSlug: 'gaming-smart-home-familia-mobiliario-gaming-simracing',
    },
    {
      grandparentSlug: 'gaming-smart-home',
      familyName: 'Seguridad',
      subfamilyName: 'Cámara IP WiFi exterior',
      expectedSlug: 'gaming-smart-home-familia-seguridad-control-acceso',
    },
    {
      grandparentSlug: 'tv-audio-video',
      familyName: 'TV',
      subfamilyName: 'Mini LED 55',
      expectedSlug: 'tv-audio-video-familia-televisores-smart-tv',
    },
    {
      grandparentSlug: 'gaming-smart-home',
      familyName: 'Seguridad',
      subfamilyName: 'NVR videovigilancia 8 canales',
      expectedSlug: 'gaming-smart-home-familia-seguridad-control-acceso',
    },
    {
      grandparentSlug: 'gaming-smart-home',
      familyName: 'Seguridad',
      subfamilyName: 'Videoportero WiFi',
      expectedSlug: 'gaming-smart-home-familia-seguridad-control-acceso',
    },
    {
      grandparentSlug: 'software-seguridad',
      familyName: 'Gestión empresarial',
      subfamilyName: 'TPV y facturación',
      expectedSlug: 'software-seguridad-familia-gestion-facturacion-pdv',
    },
    {
      grandparentSlug: 'software-seguridad',
      familyName: 'Gestión empresarial',
      subfamilyName: 'CRM cloud para ventas',
      expectedSlug: 'software-seguridad-familia-gestion-facturacion-pdv',
    },
    {
      grandparentSlug: 'software-seguridad',
      familyName: 'Gestión empresarial',
      subfamilyName: 'Software de nómina',
      expectedSlug: 'software-seguridad-familia-gestion-facturacion-pdv',
    },
    {
      grandparentSlug: 'monitores-perifericos',
      familyName: 'Periféricos',
      subfamilyName: 'Docking station USB-C',
      expectedSlug: 'monitores-perifericos-familia-docks-creacion-accesorios',
    },
    {
      grandparentSlug: 'impresion-escaneado',
      familyName: 'Consumibles',
      subfamilyName: 'Ribbon resina cera',
      expectedSlug: 'impresion-escaneado-familia-consumibles-impresion',
    },
    {
      grandparentSlug: 'impresion-escaneado',
      familyName: 'Etiquetado',
      subfamilyName: 'Etiqueta térmica 100x150',
      expectedSlug: 'impresion-escaneado-familia-consumibles-impresion',
    },
    {
      grandparentSlug: 'software-seguridad',
      familyName: 'Seguridad',
      subfamilyName: 'Certificado digital y firma electrónica',
      expectedSlug: 'software-seguridad-familia-identidad-firma-compliance',
    },
    {
      grandparentSlug: 'ordenadores-portatiles',
      familyName: 'Computing',
      subfamilyName: 'Thin client embedded industrial',
      expectedSlug:
        'ordenadores-portatiles-familia-clientes-ligeros-industriales',
    },
    {
      grandparentSlug: 'tv-audio-video',
      familyName: 'AV',
      subfamilyName: 'Cartelería digital profesional',
      expectedSlug: 'tv-audio-video-familia-carteleria-videoconferencia',
    },
    {
      grandparentSlug: 'telefonia-movilidad',
      familyName: 'Telefonía',
      subfamilyName: 'Smartphone Android 5G',
      expectedSlug: 'telefonia-movilidad-familia-smartphones-telefonia',
    },
    {
      grandparentSlug: 'telefonia-movilidad',
      familyName: 'Movilidad profesional',
      subfamilyName: 'Terminal móvil Android RFID',
      expectedSlug: 'telefonia-movilidad-familia-movilidad-profesional-gps-rf',
    },
    {
      grandparentSlug: 'telefonia-movilidad',
      familyName: 'Accesorios',
      subfamilyName: 'Power bank MagSafe',
      expectedSlug: 'telefonia-movilidad-familia-accesorios-movilidad',
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
    const canonical = tree.find(
      (node) => node.slug === 'ordenadores-portatiles',
    );

    expect(
      tree.filter((node) => node.slug === 'ordenadores-portatiles'),
    ).toHaveLength(1);
    expect(canonical?.children.map((node) => node.slug)).toContain(
      'ordenadores-portatiles-familia-portatiles',
    );
    expect(canonical?.children[0]?.children.map((node) => node.slug)).toContain(
      'portatiles',
    );
    expect(canonical?.children.map((node) => node.slug)).not.toContain(
      'ordenadores-y-portatiles',
    );
  });
});
