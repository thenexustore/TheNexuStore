import {
  DEFAULT_PARENT_CATEGORY,
  MENU_PARENT_TAXONOMY,
  recommendParentCategory,
  slugifyCategory,
} from '../../infortisa/infortisa-category-mapping.util';

export type CategoryTaxonomyRow = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
};

export type CategoryTaxonomyLinkRow = Pick<
  CategoryTaxonomyRow,
  'id' | 'parent_id'
>;

export type CategoryTaxonomyNode = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  depth: number;
  ancestry: Array<{ id: string; slug: string; name: string }>;
  path: string;
  children: CategoryTaxonomyNode[];
};

type CategoryTaxonomyGroup = {
  key: string;
  label: string;
  sortOrder: number;
  keywords: readonly string[];
};

type CategoryTaxonomyGroupOverrideRule = {
  groupKey: string;
  anyOf: readonly string[];
  noneOf?: readonly string[];
};

type CategoryLevel2Input = Pick<CategoryTaxonomyRow, 'name' | 'slug'> & {
  familyName?: string | null;
  subfamilyName?: string | null;
};

const SOFTWARE_BUSINESS_KEYWORDS = [
  'erp',
  'crm',
  'facturacion',
  'facturación',
  'tpv',
  'punto de venta',
  'contabilidad',
  'nomina',
  'nómina',
  'software gestion',
  'software gestión',
] as const;

const GAMING_SECURITY_KEYWORDS = [
  'videovigilancia',
  'cctv',
  'camara ip',
  'cámara ip',
  'camara inalambrica',
  'cámara inalámbrica',
  'camara seguridad',
  'cámara seguridad',
  'camara wifi',
  'cámara wifi',
  'camara exterior',
  'cámara exterior',
  'nvr',
  'dvr',
  'videoportero',
  'kit videovigilancia',
] as const;

const ACCESSORY_ORGANIZATION_KEYWORDS = [
  'candado portatil',
  'candado portátil',
  'cable lock',
  'filtro privacidad',
  'privacidad pantalla',
  'organizador cables',
  'bridas',
  'bridas velcro',
  'filtro de privacidad',
  'anclaje seguridad',
  'anclaje antirrobo',
  'soporte antirrobo',
] as const;

const CATEGORY_TAXONOMY_GROUPS: Readonly<
  Record<string, readonly CategoryTaxonomyGroup[]>
> = {
  'ordenadores-portatiles': [
    {
      key: 'portatiles',
      label: 'Portátiles',
      sortOrder: 10,
      keywords: ['portatil', 'notebook', 'laptop', 'ultrabook', 'chromebook'],
    },
    {
      key: 'sobremesa-workstations',
      label: 'Sobremesa y workstations',
      sortOrder: 20,
      keywords: [
        'sobremesa',
        'desktop',
        'torre',
        'workstation',
        'all in one',
        'todo en uno',
        'semitorre',
        'miditorre',
      ],
    },
    {
      key: 'mini-pc-barebones',
      label: 'Mini PC y barebones',
      sortOrder: 30,
      keywords: ['mini pc', 'nettop', 'barebone'],
    },
    {
      key: 'clientes-ligeros-industriales',
      label: 'Clientes ligeros e industriales',
      sortOrder: 35,
      keywords: [
        'thin client',
        'cliente ligero',
        'embedded',
        'industrial',
        'panel pc',
      ],
    },
  ],
  'componentes-almacenamiento': [
    {
      key: 'componentes-pc',
      label: 'Componentes de PC',
      sortOrder: 10,
      keywords: ['placa', 'motherboard', 'grafica', 'gpu', 'procesador', 'cpu'],
    },
    {
      key: 'cajas-montaje',
      label: 'Cajas y montaje',
      sortOrder: 15,
      keywords: [
        'chasis',
        'caja pc',
        'caja',
        'rackmount',
        'kit montaje',
        'riser',
      ],
    },
    {
      key: 'memoria-almacenamiento',
      label: 'Memoria y almacenamiento',
      sortOrder: 20,
      keywords: [
        'ssd',
        'hdd',
        'nvme',
        'disco',
        'memoria',
        'ram',
        'almacenamiento',
      ],
    },
    {
      key: 'energia-refrigeracion',
      label: 'Energía y refrigeración',
      sortOrder: 30,
      keywords: [
        'fuente',
        'psu',
        'ventilador',
        'cooler',
        'disipador',
        'refrigeracion',
      ],
    },
    {
      key: 'conectividad-interna',
      label: 'Conectividad interna',
      sortOrder: 40,
      keywords: ['controladora', 'adaptador interno', 'tarjeta de red'],
    },
  ],
  'monitores-perifericos': [
    {
      key: 'monitores-pantallas',
      label: 'Monitores y pantallas',
      sortOrder: 10,
      keywords: ['monitor', 'pantalla', 'display', 'tft', 'tactil', 'táctil'],
    },
    {
      key: 'teclados-ratones',
      label: 'Teclados y ratones',
      sortOrder: 20,
      keywords: ['teclado', 'raton', 'mouse', 'trackball'],
    },
    {
      key: 'audio-video-streaming',
      label: 'Audio, vídeo y streaming',
      sortOrder: 30,
      keywords: [
        'auricular',
        'headset',
        'altavoz',
        'microfono',
        'webcam',
        'capturadora',
      ],
    },
    {
      key: 'digitalizacion-lectores',
      label: 'Digitalización y lectores',
      sortOrder: 35,
      keywords: [
        'lector',
        'scanner de mano',
        'escaner de mano',
        'codigo de barras',
        'codigo barras',
        'document camera',
      ],
    },
    {
      key: 'docks-creacion-accesorios',
      label: 'Docks, creación y accesorios',
      sortOrder: 40,
      keywords: [
        'dock',
        'docking station',
        'dock usb c',
        'replicador puertos',
        'hub',
        'stylus',
        'pen tablet',
        'grabadora',
      ],
    },
  ],
  'impresion-escaneado': [
    {
      key: 'impresoras-multifuncion',
      label: 'Impresoras y multifunción',
      sortOrder: 10,
      keywords: [
        'impresora',
        'multifuncion',
        'multifunción',
        'plotter',
        'fotocopiadora',
        'laser',
        'inkjet',
      ],
    },
    {
      key: 'escaneres-etiquetado',
      label: 'Escáneres y etiquetado',
      sortOrder: 20,
      keywords: ['escaner', 'scanner', 'etiqueta', 'etiquetadora'],
    },
    {
      key: 'consumibles-impresion',
      label: 'Consumibles de impresión',
      sortOrder: 30,
      keywords: [
        'consumible',
        'toner',
        'tinta',
        'cartucho',
        'tambor',
        'drum',
        'fusor',
        'fuser',
        'fotoconductor',
        'rollo',
        'rollo termico',
        'rollo térmico',
        'cinta termica',
        'cinta resina',
        'ribbon',
        'etiqueta termica',
        'etiqueta térmica',
        'papel',
      ],
    },
  ],
  'redes-servidores': [
    {
      key: 'redes-wifi',
      label: 'Redes y Wi‑Fi',
      sortOrder: 10,
      keywords: [
        'switch',
        'router',
        'wifi',
        'mesh',
        'repetidor',
        'access point',
        'punto de acceso',
        'puntos de acceso',
        'red inalambrica',
        'servidor torre',
      ],
    },
    {
      key: 'seguridad-edge-conectividad',
      label: 'Seguridad, edge y conectividad',
      sortOrder: 15,
      keywords: [
        'firewall',
        'utm',
        'modem',
        'powerline',
        'gateway',
        'balanceador',
      ],
    },
    {
      key: 'servidores-almacenamiento',
      label: 'Servidores y almacenamiento',
      sortOrder: 20,
      keywords: ['server', 'servidor', 'nas', 'kvm'],
    },
    {
      key: 'rack-energia-cableado',
      label: 'Rack, energía y cableado',
      sortOrder: 30,
      keywords: [
        'rack',
        'sai',
        'ups',
        'pdu',
        'cableado',
        'patch panel',
        'panel de parcheo',
        'latiguillo',
        'armario rack',
        'fibra optica',
        'transceiver',
        'sfp',
      ],
    },
  ],
  'telefonia-movilidad': [
    {
      key: 'smartphones-telefonia',
      label: 'Smartphones y telefonía',
      sortOrder: 10,
      keywords: ['smartphone', 'telefono', 'telefono movil', 'mifi'],
    },
    {
      key: 'tablets-wearables',
      label: 'Tablets y wearables',
      sortOrder: 20,
      keywords: ['tablet', 'smartwatch', 'wearable', 'ebook', 'ereader'],
    },
    {
      key: 'movilidad-profesional-gps-rf',
      label: 'Movilidad profesional y GPS',
      sortOrder: 25,
      keywords: [
        'pda',
        'radiofrecuencia',
        'rfid',
        'terminal movil',
        'terminal portatil',
        'handheld',
        'terminal tactil',
        'lector codigo',
        'barcode',
        'lector de codigo',
        'lector codigo',
        'gps',
      ],
    },
    {
      key: 'accesorios-movilidad',
      label: 'Accesorios de movilidad',
      sortOrder: 30,
      keywords: [
        'funda',
        'cargador movil',
        'protector pantalla',
        'accesorio movil',
        'power bank',
        'bateria externa',
        'soporte movil',
      ],
    },
  ],
  'tv-audio-video': [
    {
      key: 'televisores-smart-tv',
      label: 'Televisores y Smart TV',
      sortOrder: 10,
      keywords: [
        'television',
        'televisión',
        'tv',
        'led',
        'mini led',
        'oled',
        'qled',
        'google tv',
        'android tv',
        'smart tv',
      ],
    },
    {
      key: 'audio-home-cinema',
      label: 'Audio y home cinema',
      sortOrder: 20,
      keywords: [
        'audio',
        'barra de sonido',
        'soundbar',
        'receptor av',
        'altavoz',
        'altavoz bluetooth',
        'auriculares bluetooth',
      ],
    },
    {
      key: 'carteleria-videoconferencia',
      label: 'Cartelería y videoconferencia',
      sortOrder: 25,
      keywords: [
        'carteleria digital',
        'cartelería digital',
        'digital signage',
        'videoconferencia',
        'camara conferencia',
        'speakerphone',
        'room system',
      ],
    },
    {
      key: 'proyeccion-streaming-soportes',
      label: 'Proyección, streaming y soportes',
      sortOrder: 30,
      keywords: [
        'proyector',
        'streaming',
        'tdt',
        'soporte tv',
        'pantalla proyeccion',
        'radio despertador',
        'reproductor tv',
        'via satelite',
        'sintonizador radio',
      ],
    },
  ],
  'software-seguridad': [
    {
      key: 'productividad-licencias',
      label: 'Productividad y licencias',
      sortOrder: 10,
      keywords: [
        'office',
        'ofimatica',
        'ofimática',
        'microsoft 365',
        'licencia',
        'saas',
        'cloud',
        'software ofimatica',
        'software ofimática',
      ],
    },
    {
      key: 'gestion-facturacion-pdv',
      label: 'Gestión, facturación y TPV',
      sortOrder: 15,
      keywords: [
        ...SOFTWARE_BUSINESS_KEYWORDS,
      ],
    },
    {
      key: 'seguridad-backup',
      label: 'Seguridad y backup',
      sortOrder: 20,
      keywords: ['antivirus', 'backup', 'endpoint', 'vpn'],
    },
    {
      key: 'identidad-firma-compliance',
      label: 'Identidad, firma y compliance',
      sortOrder: 25,
      keywords: [
        'certificado',
        'firma electronica',
        'firma electrónica',
        'identidad digital',
        'compliance',
      ],
    },
    {
      key: 'sistemas-operativos-virtualizacion',
      label: 'Sistemas operativos y virtualización',
      sortOrder: 30,
      keywords: [
        'windows',
        'linux',
        'sistema operativo',
        'virtualizacion',
        'virtualización',
      ],
    },
  ],
  'gaming-smart-home': [
    {
      key: 'gaming',
      label: 'Gaming',
      sortOrder: 10,
      keywords: ['gaming', 'consola', 'vr', 'gamepad', 'mando'],
    },
    {
      key: 'mobiliario-gaming-simracing',
      label: 'Mobiliario gaming y simracing',
      sortOrder: 15,
      keywords: [
        'simracing',
        'volante',
        'silla gaming',
        'escritorio gaming',
        'cockpit',
        'soporte volante',
      ],
    },
    {
      key: 'smart-home-domotica',
      label: 'Smart home y domótica',
      sortOrder: 20,
      keywords: [
        'smart home',
        'domotica',
        'domótica',
        'sensor',
        'iluminacion',
        'cerradura inteligente',
      ],
    },
    {
      key: 'seguridad-control-acceso',
      label: 'Seguridad y control de acceso',
      sortOrder: 30,
      keywords: [
        ...GAMING_SECURITY_KEYWORDS,
        'alarma',
        'control de acceso',
      ],
    },
  ],
  'accesorios-consumibles': [
    {
      key: 'cables-adaptadores',
      label: 'Cables y adaptadores',
      sortOrder: 10,
      keywords: [
        'cable',
        'adaptador',
        'hub',
        'hdmi',
        'displayport',
        'usb c',
        'usb-c',
        'vga',
        'dvi',
        'jack',
      ],
    },
    {
      key: 'energia-carga',
      label: 'Energía y carga',
      sortOrder: 20,
      keywords: ['cargador', 'cargador universal', 'regleta', 'alargador', 'power strip', 'base multiple', 'base múltiple', 'base enchufes'],
    },
    {
      key: 'fundas-transporte',
      label: 'Fundas y transporte',
      sortOrder: 30,
      keywords: [
        'bolsa',
        'mochila',
        'mochila portatil',
        'mochila portátil',
        'maletin',
        'maletin trolley',
        'maletín trolley',
        'funda',
        'funda portátil',
        'sleeve',
        'bandolera',
        'trolley',
      ],
    },
    {
      key: 'soportes-ergonomia',
      label: 'Soportes y ergonomía',
      sortOrder: 35,
      keywords: [
        'soporte',
        'brazo monitor',
        'elevador',
        'elevador portatil',
        'elevador portátil',
        'soporte portatil',
        'soporte portátil',
        'reposamunecas',
        'reposamuñecas',
        'alfombrilla',
        'alfombrilla ergonomica',
        'alfombrilla ergonómica',
        'reposapie',
        'ergonomia',
      ],
    },
    {
      key: 'seguridad-organizacion',
      label: 'Seguridad y organización',
      sortOrder: 37,
      keywords: [
        ...ACCESSORY_ORGANIZATION_KEYWORDS,
      ],
    },
    {
      key: 'pilas-baterias',
      label: 'Pilas y baterías',
      sortOrder: 40,
      keywords: [
        'pila',
        'bateria',
        'pila boton',
        'pila botón',
        'bateria recargable',
        'batería recargable',
        'pilas aa',
        'pilas aaa',
        'cr2032',
        'aa',
        'aaa',
      ],
    },
    {
      key: 'limpieza-mantenimiento',
      label: 'Limpieza y mantenimiento',
      sortOrder: 50,
      keywords: [
        'limpieza',
        'aire comprimido',
        'spray',
        'spray limpieza',
        'toallita',
        'toallitas',
        'kit limpieza',
        'limpiador pantalla',
        'gel limpieza',
        'mantenimiento',
      ],
    },
  ],
};

const CATEGORY_TAXONOMY_GROUP_OVERRIDE_RULES: Readonly<
  Record<string, readonly CategoryTaxonomyGroupOverrideRule[]>
> = {
  'impresion-escaneado': [
    {
      groupKey: 'consumibles-impresion',
      anyOf: [
        'ribbon',
        'etiqueta termica',
        'etiqueta térmica',
        'rollo termico',
        'rollo térmico',
        'cinta resina',
      ],
    },
  ],
  'software-seguridad': [
    {
      groupKey: 'gestion-facturacion-pdv',
      anyOf: [
        ...SOFTWARE_BUSINESS_KEYWORDS,
      ],
    },
  ],
  'telefonia-movilidad': [
    {
      groupKey: 'movilidad-profesional-gps-rf',
      anyOf: [
        'rfid',
        'terminal movil',
        'terminal portatil',
        'handheld',
        'terminal tactil',
        'lector codigo',
        'barcode',
        'pda',
        'gps',
      ],
    },
    {
      groupKey: 'accesorios-movilidad',
      anyOf: [
        'power bank',
        'bateria externa',
        'cargador movil',
        'protector pantalla',
        'soporte movil',
      ],
    },
    {
      groupKey: 'tablets-wearables',
      anyOf: ['smartwatch', 'wearable', 'ebook', 'ereader', 'tablet'],
      noneOf: ['pen tablet', 'tableta grafica', 'tableta digitalizadora'],
    },
    {
      groupKey: 'smartphones-telefonia',
      anyOf: ['smartphone', 'telefono movil', 'telefono', 'movil', 'mifi'],
      noneOf: ['terminal movil', 'terminal portatil'],
    },
  ],
  'gaming-smart-home': [
    {
      groupKey: 'mobiliario-gaming-simracing',
      anyOf: [
        'silla gaming',
        'escritorio gaming',
        'simracing',
        'volante',
        'cockpit',
        'soporte volante',
      ],
    },
    {
      groupKey: 'seguridad-control-acceso',
      anyOf: [
        ...GAMING_SECURITY_KEYWORDS,
        'control de acceso',
        'alarma',
      ],
    },
  ],
  'accesorios-consumibles': [
    {
      groupKey: 'seguridad-organizacion',
      anyOf: [
        ...ACCESSORY_ORGANIZATION_KEYWORDS,
      ],
    },
  ],
};

function normalizeTaxonomyText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function scoreGroupMatch(
  familyText: string,
  detailText: string,
  group: CategoryTaxonomyGroup,
): number {
  return group.keywords.reduce((score, keyword) => {
    const normalizedKeyword = normalizeTaxonomyText(keyword);
    let nextScore = score;

    if (familyText.includes(normalizedKeyword)) {
      nextScore += 3;
    }

    if (detailText.includes(normalizedKeyword)) {
      nextScore += 1;
    }

    return nextScore;
  }, 0);
}

function matchesGroupOverrideRule(
  text: string,
  rule: CategoryTaxonomyGroupOverrideRule,
): boolean {
  const hasPositive = rule.anyOf.some((keyword) =>
    text.includes(normalizeTaxonomyText(keyword)),
  );
  if (!hasPositive) return false;

  return !(rule.noneOf ?? []).some((keyword) =>
    text.includes(normalizeTaxonomyText(keyword)),
  );
}

function resolveCategoryTaxonomyGroup(
  grandparentSlug: string,
  row: CategoryLevel2Input,
): CategoryTaxonomyGroup {
  const groups = CATEGORY_TAXONOMY_GROUPS[grandparentSlug] ?? [];
  const familyText = normalizeTaxonomyText(row.familyName ?? '');
  const detailText = normalizeTaxonomyText(
    `${row.subfamilyName ?? ''} ${row.name} ${row.slug.replace(/-/g, ' ')}`,
  );
  const combinedText = normalizeTaxonomyText(
    `${row.familyName ?? ''} ${row.subfamilyName ?? ''} ${row.name} ${row.slug.replace(/-/g, ' ')}`,
  );

  const override = (
    CATEGORY_TAXONOMY_GROUP_OVERRIDE_RULES[grandparentSlug] ?? []
  ).find((rule) => matchesGroupOverrideRule(combinedText, rule));
  if (override) {
    const overrideGroup = groups.find(
      (group) => group.key === override.groupKey,
    );
    if (overrideGroup) return overrideGroup;
  }

  const bestMatch = groups
    .map((group) => ({
      group,
      score: scoreGroupMatch(familyText, detailText, group),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score === a.score) {
        return a.group.sortOrder - b.group.sortOrder;
      }

      return b.score - a.score;
    })[0]?.group;

  if (bestMatch) return bestMatch;

  return {
    key: 'otras-categorias',
    label: 'Otras categorías',
    sortOrder: 90,
    keywords: [],
  };
}

export function buildCategoryLevel2Descriptor(
  grandparentSlug: string,
  row: CategoryLevel2Input,
) {
  const group = resolveCategoryTaxonomyGroup(grandparentSlug, row);

  return {
    key: group.key,
    name: group.label,
    slug: `${grandparentSlug}-familia-${group.key}`,
    sort_order: group.sortOrder,
  };
}

export function resolveCanonicalParentSlug(slug: string): string | null {
  const normalized = slugifyCategory(slug);
  const match = MENU_PARENT_TAXONOMY.find((category) => {
    return (
      slugifyCategory(category.key) === normalized ||
      slugifyCategory(category.label) === normalized
    );
  });

  return match ? slugifyCategory(match.key) : null;
}

export function normalizeCategoryTaxonomyRows(
  rows: CategoryTaxonomyRow[],
): CategoryTaxonomyRow[] {
  const clonedRows = rows.map((row) => ({ ...row }));
  const rowIds = new Set(clonedRows.map((row) => row.id));
  const parentIdByCanonicalSlug = new Map<string, string>();
  const aliasRowIds = new Set<string>();
  const aliasTargets = new Map<string, string>();
  const syntheticLevel2Parents = new Map<string, CategoryTaxonomyRow>();

  for (const category of MENU_PARENT_TAXONOMY) {
    const canonicalSlug = slugifyCategory(category.key);
    const matches = clonedRows.filter(
      (row) => resolveCanonicalParentSlug(row.slug) === canonicalSlug,
    );

    if (matches.length === 0) continue;

    const anchor =
      matches.find((row) => slugifyCategory(row.slug) === canonicalSlug) ??
      matches.sort((a, b) => a.sort_order - b.sort_order)[0];

    anchor.parent_id = null;
    parentIdByCanonicalSlug.set(canonicalSlug, anchor.id);

    for (const match of matches) {
      if (match.id === anchor.id) continue;
      aliasRowIds.add(match.id);
      aliasTargets.set(match.id, anchor.id);
    }
  }

  for (const row of clonedRows) {
    if (row.parent_id && aliasTargets.has(row.parent_id)) {
      row.parent_id = aliasTargets.get(row.parent_id)!;
    }
  }

  for (const row of clonedRows) {
    if (aliasRowIds.has(row.id)) continue;

    const canonicalSlug = resolveCanonicalParentSlug(row.slug);
    if (!canonicalSlug) continue;
  }

  const syntheticParents = MENU_PARENT_TAXONOMY.filter(
    (category) => !parentIdByCanonicalSlug.has(slugifyCategory(category.key)),
  ).map((category) => {
    const canonicalSlug = slugifyCategory(category.key);
    const syntheticId = `virtual:${canonicalSlug}`;
    parentIdByCanonicalSlug.set(canonicalSlug, syntheticId);

    return {
      id: syntheticId,
      name: category.label,
      slug: canonicalSlug,
      parent_id: null,
      sort_order: category.sortOrder,
    } satisfies CategoryTaxonomyRow;
  });

  const normalizedRows = [
    ...syntheticParents,
    ...clonedRows.filter((row) => !aliasRowIds.has(row.id)),
  ];

  for (const row of normalizedRows) {
    const canonicalSlug = resolveCanonicalParentSlug(row.slug);
    if (canonicalSlug) continue;

    const hasVisibleParent = row.parent_id && rowIds.has(row.parent_id);
    if (hasVisibleParent) continue;

    const recommendedParent = recommendParentCategory(
      null,
      row.slug.replace(/-/g, ' '),
    );
    const recommendedSlug =
      resolveCanonicalParentSlug(recommendedParent.key) ??
      slugifyCategory(DEFAULT_PARENT_CATEGORY.key);

    row.parent_id = parentIdByCanonicalSlug.get(recommendedSlug) ?? null;
  }

  const normalizedById = new Map(normalizedRows.map((row) => [row.id, row]));

  const resolveCanonicalAncestorSlug = (row: CategoryTaxonomyRow) => {
    if (!row.parent_id) return null;
    const directParent = normalizedById.get(row.parent_id);
    if (!directParent) return null;

    const directCanonical = resolveCanonicalParentSlug(directParent.slug);
    if (directCanonical) return directCanonical;

    if (!directParent.parent_id) return null;
    const grandparent = normalizedById.get(directParent.parent_id);
    return grandparent?.slug
      ? resolveCanonicalParentSlug(grandparent.slug)
      : null;
  };

  for (const row of normalizedRows) {
    const canonicalSlug = resolveCanonicalParentSlug(row.slug);
    if (canonicalSlug) continue;

    const currentCanonicalSlug = resolveCanonicalAncestorSlug(row);
    if (!currentCanonicalSlug) continue;

    const recommendedParent = recommendParentCategory(
      row.name,
      `${row.name} ${row.slug.replace(/-/g, ' ')}`,
    );
    const recommendedCanonicalSlug =
      resolveCanonicalParentSlug(recommendedParent.key) ?? null;

    if (
      recommendedCanonicalSlug &&
      recommendedCanonicalSlug !== currentCanonicalSlug
    ) {
      const currentLevel2 = buildCategoryLevel2Descriptor(
        currentCanonicalSlug,
        row,
      );
      if (currentLevel2.key === 'otras-categorias') {
        row.parent_id =
          parentIdByCanonicalSlug.get(recommendedCanonicalSlug) ??
          row.parent_id;
      }
    }

    if (!row.parent_id) continue;
    const parent = normalizedById.get(row.parent_id);
    if (!parent) continue;

    const parentCanonicalSlug = resolveCanonicalParentSlug(parent.slug);
    if (!parentCanonicalSlug) continue;

    const level2 = buildCategoryLevel2Descriptor(parentCanonicalSlug, row);
    const syntheticGroupId = `virtual:${parentCanonicalSlug}:${level2.key}`;

    if (!syntheticLevel2Parents.has(syntheticGroupId)) {
      syntheticLevel2Parents.set(syntheticGroupId, {
        id: syntheticGroupId,
        name: level2.name,
        slug: level2.slug,
        parent_id: parent.id,
        sort_order: parent.sort_order + level2.sort_order / 100,
      });
    }

    row.parent_id = syntheticGroupId;
  }

  return [
    ...syntheticParents,
    ...syntheticLevel2Parents.values(),
    ...clonedRows.filter((row) => !aliasRowIds.has(row.id)),
  ];
}

function compareRows(a: CategoryTaxonomyRow, b: CategoryTaxonomyRow) {
  return (
    a.sort_order - b.sort_order ||
    a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
  );
}

export function sortCategoryRows(
  rows: CategoryTaxonomyRow[],
): CategoryTaxonomyRow[] {
  return [...rows].sort(compareRows);
}

export function buildCategoryTaxonomyTree(
  rows: CategoryTaxonomyRow[],
  maxDepth: number,
) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const childrenByParent = new Map<string, CategoryTaxonomyRow[]>();

  for (const row of rows) {
    if (!row.parent_id || !byId.has(row.parent_id)) continue;
    if (!childrenByParent.has(row.parent_id))
      childrenByParent.set(row.parent_id, []);
    childrenByParent.get(row.parent_id)!.push(row);
  }

  for (const [parentId, children] of childrenByParent) {
    childrenByParent.set(parentId, sortCategoryRows(children));
  }

  const roots = sortCategoryRows(
    rows.filter((row) => !row.parent_id || !byId.has(row.parent_id)),
  );

  const buildNode = (
    row: CategoryTaxonomyRow,
    depth: number,
    trail: Array<{ id: string; slug: string; name: string }>,
    visited: Set<string>,
  ): CategoryTaxonomyNode | null => {
    if (visited.has(row.id)) {
      return null;
    }

    const nextVisited = new Set(visited);
    nextVisited.add(row.id);

    const ancestry = [...trail, { id: row.id, slug: row.slug, name: row.name }];
    const children =
      depth >= maxDepth
        ? []
        : (childrenByParent.get(row.id) ?? [])
            .map((child) => buildNode(child, depth + 1, ancestry, nextVisited))
            .filter((item): item is CategoryTaxonomyNode => item !== null);

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      parent_id: row.parent_id,
      sort_order: row.sort_order,
      depth,
      ancestry,
      path: ancestry.map((item) => item.name).join(' > '),
      children,
    };
  };

  return roots
    .map((row) => buildNode(row, 1, [], new Set<string>()))
    .filter((item): item is CategoryTaxonomyNode => item !== null);
}

export function getDescendantIds(
  rootId: string,
  rows: CategoryTaxonomyLinkRow[],
): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.parent_id) continue;
    if (!childrenByParent.has(row.parent_id))
      childrenByParent.set(row.parent_id, []);
    childrenByParent.get(row.parent_id)!.push(row.id);
  }

  const queue = [rootId];
  const visited = new Set<string>();
  const result: string[] = [];

  while (queue.length) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    result.push(current);

    for (const childId of childrenByParent.get(current) ?? []) {
      if (!visited.has(childId)) queue.push(childId);
    }
  }

  return result;
}
