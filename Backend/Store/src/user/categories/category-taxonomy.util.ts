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

type CategoryLevel2Input = Pick<CategoryTaxonomyRow, 'name' | 'slug'> & {
  familyName?: string | null;
  subfamilyName?: string | null;
};

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
      keywords: ['sobremesa', 'desktop', 'torre', 'workstation', 'all in one'],
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
      keywords: ['monitor', 'pantalla', 'display'],
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
      keywords: ['dock', 'hub', 'stylus', 'pen tablet', 'grabadora'],
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
        'rollo',
        'cinta termica',
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
        'fibra optica',
        'transceiver',
      ],
    },
  ],
  'telefonia-movilidad': [
    {
      key: 'smartphones-telefonia',
      label: 'Smartphones y telefonía',
      sortOrder: 10,
      keywords: ['smartphone', 'telefono', 'mifi'],
    },
    {
      key: 'tablets-wearables',
      label: 'Tablets y wearables',
      sortOrder: 20,
      keywords: ['tablet', 'smartwatch', 'wearable'],
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
        'oled',
        'qled',
        'google tv',
        'android tv',
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
      ],
    },
    {
      key: 'gestion-facturacion-pdv',
      label: 'Gestión, facturación y TPV',
      sortOrder: 15,
      keywords: [
        'erp',
        'facturacion',
        'facturación',
        'tpv',
        'punto de venta',
        'contabilidad',
        'nomina',
        'nómina',
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
      keywords: ['videovigilancia', 'cctv', 'alarma', 'control de acceso'],
    },
  ],
  'accesorios-consumibles': [
    {
      key: 'cables-adaptadores',
      label: 'Cables y adaptadores',
      sortOrder: 10,
      keywords: ['cable', 'adaptador', 'hub'],
    },
    {
      key: 'energia-carga',
      label: 'Energía y carga',
      sortOrder: 20,
      keywords: ['cargador', 'regleta', 'alargador'],
    },
    {
      key: 'fundas-transporte',
      label: 'Fundas y transporte',
      sortOrder: 30,
      keywords: ['bolsa', 'mochila', 'maletin', 'funda'],
    },
    {
      key: 'soportes-ergonomia',
      label: 'Soportes y ergonomía',
      sortOrder: 35,
      keywords: [
        'soporte',
        'brazo monitor',
        'elevador',
        'reposapie',
        'ergonomia',
      ],
    },
    {
      key: 'pilas-baterias',
      label: 'Pilas y baterías',
      sortOrder: 40,
      keywords: ['pila', 'bateria'],
    },
    {
      key: 'limpieza-mantenimiento',
      label: 'Limpieza y mantenimiento',
      sortOrder: 50,
      keywords: [
        'limpieza',
        'aire comprimido',
        'spray',
        'toallita',
        'mantenimiento',
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

function resolveCategoryTaxonomyGroup(
  grandparentSlug: string,
  row: CategoryLevel2Input,
): CategoryTaxonomyGroup {
  const groups = CATEGORY_TAXONOMY_GROUPS[grandparentSlug] ?? [];
  const familyText = normalizeTaxonomyText(row.familyName ?? '');
  const detailText = normalizeTaxonomyText(
    `${row.subfamilyName ?? ''} ${row.name} ${row.slug.replace(/-/g, ' ')}`,
  );

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

  for (const row of normalizedRows) {
    const canonicalSlug = resolveCanonicalParentSlug(row.slug);
    if (canonicalSlug) continue;

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
