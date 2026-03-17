type MenuParentCategory = {
  key: string;
  label: string;
  sortOrder: number;
  familyKeywords: readonly string[];
  subfamilyKeywords: readonly string[];
};

const DEFAULT_PARENT_CATEGORY: Pick<MenuParentCategory, 'key' | 'label'> = {
  key: 'accesorios-consumibles',
  label: 'Accesorios y consumibles',
};

const MENU_PARENT_TAXONOMY: readonly MenuParentCategory[] = [
  {
    key: 'ordenadores-portatiles',
    label: 'Ordenadores y portátiles',
    sortOrder: 10,
    familyKeywords: [
      'ordenador',
      'desktop',
      'sobremesa',
      'portatil',
      'notebook',
      'workstation',
      'all in one',
      'mini pc',
      'thin client',
      'cliente ligero',
    ],
    subfamilyKeywords: ['ultrabook', 'chromebook', 'torre pc'],
  },
  {
    key: 'componentes-almacenamiento',
    label: 'Componentes y almacenamiento',
    sortOrder: 20,
    familyKeywords: [
      'componentes',
      'almacenamiento',
      'storage',
      'memoria',
      'disco',
      'ssd',
      'hdd',
    ],
    subfamilyKeywords: [
      'procesador',
      'cpu',
      'placa base',
      'motherboard',
      'tarjeta grafica',
      'gpu',
      'fuente alimentacion',
      'psu',
      'refrigeracion',
      'ram',
      'nvme',
      'caja pc',
      'chasis',
    ],
  },
  {
    key: 'monitores-perifericos',
    label: 'Monitores y periféricos',
    sortOrder: 30,
    familyKeywords: ['monitor', 'periferico', 'periférico', 'audio pc'],
    subfamilyKeywords: [
      'teclado',
      'raton',
      'mouse',
      'webcam',
      'auricular',
      'headset',
      'altavoz',
      'microfono',
      'dock',
      'hub usb',
      'capturadora',
      'monitor gaming',
    ],
  },
  {
    key: 'impresion-escaneado',
    label: 'Impresión y escaneado',
    sortOrder: 40,
    familyKeywords: [
      'impresion',
      'impresión',
      'printing',
      'escaneado',
      'scanner',
    ],
    subfamilyKeywords: [
      'impresora',
      'multifuncion',
      'multifunción',
      'toner',
      'tinta',
      'plotter',
      'fotocopiadora',
      'escaner',
      'scanner',
      'etiquetas',
      'impresora termica',
    ],
  },
  {
    key: 'redes-servidores',
    label: 'Redes y servidores',
    sortOrder: 50,
    familyKeywords: ['red', 'network', 'servidor', 'server', 'infraestructura'],
    subfamilyKeywords: [
      'switch',
      'router',
      'firewall',
      'access point',
      'wifi',
      'rack',
      'nas',
      'sai',
      'ups',
      'cableado',
      'transceiver',
      'patch panel',
      'kvm',
    ],
  },
  {
    key: 'telefonia-movilidad',
    label: 'Telefonía y movilidad',
    sortOrder: 60,
    familyKeywords: ['telefonia', 'telefonía', 'movilidad', 'movil', 'mobile'],
    subfamilyKeywords: [
      'smartphone',
      'telefono',
      'tablet',
      'smartwatch',
      'wearable',
      'mifi',
      'pda',
      'radiofrecuencia',
    ],
  },
  {
    key: 'tv-audio-video',
    label: 'TV, audio y vídeo',
    sortOrder: 65,
    familyKeywords: [
      'television',
      'televisión',
      'tv',
      'smart tv',
      'audio video',
      'home cinema',
    ],
    subfamilyKeywords: [
      'oled',
      'qled',
      'led',
      'mini led',
      'android tv',
      'google tv',
      'proyector tv',
      'barra de sonido',
      'soundbar',
      'receptor av',
      'streaming',
      'tdt',
      'soporte tv',
    ],
  },
  {
    key: 'software-seguridad',
    label: 'Software y seguridad',
    sortOrder: 70,
    familyKeywords: [
      'software',
      'licencia',
      'suscripcion',
      'seguridad',
      'security',
    ],
    subfamilyKeywords: [
      'antivirus',
      'backup',
      'virtualizacion',
      'virtualización',
      'cloud',
      'saas',
      'office',
      'sistema operativo',
      'endpoint',
    ],
  },
  {
    key: 'gaming-smart-home',
    label: 'Gaming y smart home',
    sortOrder: 80,
    familyKeywords: ['gaming', 'domotica', 'domótica', 'smart home', 'iot'],
    subfamilyKeywords: [
      'consola',
      'vr',
      'simracing',
      'videovigilancia',
      'cctv',
      'hogar inteligente',
      'sensor',
      'iluminacion inteligente',
    ],
  },
];

function normalizeText(value: string | null | undefined): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreCategory(
  family: string,
  subfamily: string,
  category: MenuParentCategory,
): number {
  let score = 0;

  for (const keyword of category.familyKeywords) {
    if (family.includes(normalizeText(keyword))) {
      score += 3;
    }
  }

  for (const keyword of category.subfamilyKeywords) {
    if (subfamily.includes(normalizeText(keyword))) {
      score += 2;
    }
  }

  return score;
}

export function slugifyCategory(value: string): string {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export function getParentCategorySortOrder(parentLabel: string): number {
  const match = MENU_PARENT_TAXONOMY.find((cat) => cat.label === parentLabel);
  if (match) return match.sortOrder;
  return 90;
}

export function recommendParentCategory(
  familyName?: string | null,
  subfamilyName?: string | null,
): { key: string; label: string } {
  const family = normalizeText(familyName);
  const subfamily = normalizeText(subfamilyName);

  if (!family && !subfamily) {
    return DEFAULT_PARENT_CATEGORY;
  }

  const scored = MENU_PARENT_TAXONOMY.map((category) => ({
    key: category.key,
    label: category.label,
    score: scoreCategory(family, subfamily, category),
    sortOrder: category.sortOrder,
  }))
    .filter((row) => row.score > 0)
    .sort((a, b) => {
      if (b.score === a.score) return a.sortOrder - b.sortOrder;
      return b.score - a.score;
    });

  if (scored.length === 0) {
    return DEFAULT_PARENT_CATEGORY;
  }

  return {
    key: scored[0].key,
    label: scored[0].label,
  };
}

const KNOWN_PARENT_CATEGORY_SLUGS = new Set<string>([
  ...MENU_PARENT_TAXONOMY.flatMap((category) => [
    slugifyCategory(category.label),
    slugifyCategory(category.key),
  ]),
  slugifyCategory(DEFAULT_PARENT_CATEGORY.label),
  slugifyCategory(DEFAULT_PARENT_CATEGORY.key),
]);

export function isKnownParentCategorySlug(
  slug: string | null | undefined,
): boolean {
  if (!slug) return false;
  return KNOWN_PARENT_CATEGORY_SLUGS.has(slug);
}
