export type MenuParentCategory = {
  key: string;
  label: string;
  sortOrder: number;
  familyKeywords: readonly string[];
  subfamilyKeywords: readonly string[];
};

type TaxonomyOverrideRule = {
  key: string;
  anyOf: readonly string[];
  noneOf?: readonly string[];
};

export const DEFAULT_PARENT_CATEGORY: Pick<
  MenuParentCategory,
  'key' | 'label'
> = {
  key: 'accesorios-consumibles',
  label: 'Accesorios y consumibles',
};

const SOFTWARE_BUSINESS_KEYWORDS = [
  'software gestion',
  'software ofimatica',
  'software gestión',
  'software ofimática',
  'facturacion',
  'facturación',
  'tpv',
  'erp',
  'crm',
  'contabilidad',
  'nomina',
  'nómina',
  'punto de venta',
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

export const MENU_PARENT_TAXONOMY: readonly MenuParentCategory[] = [
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
      'laptop',
      'nettop',
      'barebone',
      'embedded',
      'todo en uno',
    ],
    subfamilyKeywords: ['ultrabook', 'chromebook', 'torre pc', 'todo en uno'],
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
      'tarjeta de red',
      'controladora',
      'ventilador',
      'cooler',
      'disipador',
      'adaptador interno',
      'semitorre',
      'miditorre',
      'tarjeta controladora',
      'tarjetas controladoras',
      'secure digital',
      'sd',
      'micro sd',
      'tarjeta sonido',
      'tarjetas sonido',
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
      'docking station',
      'dock usb c',
      'replicador puertos',
      'monitor gaming',
      'pantalla',
      'display',
      'tft',
      'tactil',
      'táctil',
      'lector',
      'scanner de mano',
      'trackball',
      'stylus',
      'pen tablet',
      'grabadora',
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
      'consumible impresion',
      'cartucho',
      'rollo',
      'cinta termica',
      'papel',
      'etiquetadora',
      'fotoconductor',
      'tambor',
      'ribbon',
      'etiqueta termica',
      'etiqueta térmica',
      'rollo termico',
      'rollo térmico',
      'cinta resina',
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
      'sfp',
      'patch panel',
      'panel de parcheo',
      'latiguillo',
      'armario rack',
      'kvm',
      'punto de acceso',
      'puntos de acceso',
      'red inalambrica',
      'red inalámbrica',
      'mesh',
      'servidor torre',
      'servidores torre',
      'powerline',
      'repetidor',
      'amplificador wifi',
      'fibra optica',
      'modem',
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
      'telefono movil',
      'tablet',
      'smartwatch',
      'wearable',
      'mifi',
      'pda',
      'rfid',
      'terminal movil',
      'terminal portatil',
      'handheld',
      'lector codigo',
      'radiofrecuencia',
      'funda',
      'cargador movil',
      'accesorio movil',
      'protector pantalla',
      'power bank',
      'gps',
      'telefono ip',
      'telefonos ip',
      'telefonos fijos',
      'teléfonos fijos',
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
      'proyector',
      'pantalla proyeccion',
      'altavoz bluetooth',
      'auriculares bluetooth',
      'reproductor tv',
      'radio despertador',
      'reproductor tv',
      'via satelite',
      'sintonizador radio',
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
      ...SOFTWARE_BUSINESS_KEYWORDS,
      'sistema operativo',
      'endpoint',
      'vpn',
      'certificado digital',
      'firma electronica',
      'microsoft 365',
      'windows',
      'linux',
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
      ...GAMING_SECURITY_KEYWORDS,
      'hogar inteligente',
      'sensor',
      'iluminacion inteligente',
      'silla gaming',
      'escritorio gaming',
      'mando',
      'gamepad',
      'volante',
      'control de acceso',
      'alarma',
      'cerradura inteligente',
    ],
  },
  {
    key: 'accesorios-consumibles',
    label: 'Accesorios y consumibles',
    sortOrder: 90,
    familyKeywords: [
      'accesorio',
      'consumible',
      'cable',
      'adaptador',
      'bolsa',
      'mochila',
      'maletin',
      'funda portatil',
      'funda portátil',
      'sleeve',
      'bandolera',
      'trolley',
      'mochila portatil',
      'mochila portátil',
      'maletin trolley',
      'maletín trolley',
    ],
    subfamilyKeywords: [
      'pila',
      'bateria',
      'cargador',
      'regleta',
      'alargador',
      'soporte',
      'brazo monitor',
      'hdmi',
      'displayport',
      'usb c',
      'usb-c',
      'vga',
      'dvi',
      'jack',
      'reposamunecas',
      'reposamuñecas',
      'alfombrilla',
      'alfombrilla ergonomica',
      'alfombrilla ergonómica',
      'elevador portatil',
      'elevador portátil',
      'soporte portatil',
      'soporte portátil',
      'sleeve',
      'bandolera',
      'trolley',
      'mochila portatil',
      'mochila portátil',
      'maletin trolley',
      'maletín trolley',
      'funda portátil',
      'aire comprimido',
      'spray limpieza',
      'toallitas',
      'kit limpieza',
      'limpiador pantalla',
      'gel limpieza',
      'pila boton',
      'pila botón',
      'bateria recargable',
      'batería recargable',
      'pilas aa',
      'pilas aaa',
      'cr2032',
      'aa',
      'aaa',
      'power strip',
      'base multiple',
      'base múltiple',
      'base enchufes',
      'cargador universal',
      ...ACCESSORY_ORGANIZATION_KEYWORDS,
    ],
  },
];

const PARENT_CATEGORY_OVERRIDE_RULES: readonly TaxonomyOverrideRule[] = [
  {
    key: 'monitores-perifericos',
    anyOf: ['docking station', 'dock usb c', 'replicador puertos'],
  },
  {
    key: 'accesorios-consumibles',
    anyOf: [
      'aire comprimido',
      'spray limpieza',
      'toallitas',
      'kit limpieza',
      'limpiador pantalla',
      'gel limpieza',
      'pila boton',
      'pila botón',
      'bateria recargable',
      'batería recargable',
      'pilas aa',
      'pilas aaa',
      'cr2032',
      'aa',
      'aaa',
      'power strip',
      'base multiple',
      'base múltiple',
      'base enchufes',
      'cargador universal',
      ...ACCESSORY_ORGANIZATION_KEYWORDS,
    ],
  },
  {
    key: 'accesorios-consumibles',
    anyOf: [
      'hdmi',
      'displayport',
      'usb c',
      'usb-c',
      'vga',
      'dvi',
      'jack',
      'reposamunecas',
      'reposamuñecas',
      'alfombrilla ergonomica',
      'alfombrilla ergonómica',
      'elevador portatil',
      'elevador portátil',
      'soporte portatil',
      'soporte portátil',
      'sleeve',
      'bandolera',
      'trolley',
      'mochila portatil',
      'mochila portátil',
      'maletin trolley',
      'maletín trolley',
      'funda portátil',
      'aire comprimido',
      'spray limpieza',
      'toallitas',
      'kit limpieza',
      'limpiador pantalla',
      'gel limpieza',
      'pila boton',
      'pila botón',
      'bateria recargable',
      'batería recargable',
      'pilas aa',
      'pilas aaa',
      'cr2032',
      'aa',
      'aaa',
      'power strip',
      'base multiple',
      'base múltiple',
      'base enchufes',
      'cargador universal',
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
    ],
    noneOf: ['monitor', 'pantalla'],
  },
  {
    key: 'monitores-perifericos',
    anyOf: [
      'pen tablet',
      'tableta grafica',
      'tableta digitalizadora',
      'docking station',
      'dock usb c',
      'replicador puertos',
    ],
  },
  {
    key: 'telefonia-movilidad',
    anyOf: [
      'smartphone',
      'telefono movil',
      'movil',
      'mobile',
      'tablet',
      'smartwatch',
      'wearable',
      'mifi',
      'pda',
      'rfid',
      'terminal movil',
      'terminal portatil',
      'handheld',
      'gps',
    ],
    noneOf: ['pen tablet', 'tableta grafica', 'tableta digitalizadora'],
  },
  {
    key: 'gaming-smart-home',
    anyOf: [
      'camara seguridad',
      'cámara seguridad',
      'camara ip',
      'cámara ip',
      'camara inalambrica',
      'cámara inalámbrica',
      'camara wifi',
      'cámara wifi',
      'camara exterior',
      'cámara exterior',
      'nvr',
      'dvr',
      'videoportero',
      'kit videovigilancia',
      'videovigilancia',
      'cctv',
      'alarma',
      'control de acceso',
      'cerradura inteligente',
    ],
  },
  {
    key: 'ordenadores-portatiles',
    anyOf: [
      'portatil',
      'notebook',
      'laptop',
      'ultrabook',
      'chromebook',
      'desktop',
      'sobremesa',
      'workstation',
      'all in one',
      'mini pc',
      'barebone',
      'thin client',
      'cliente ligero',
      'panel pc',
      'embedded pc',
    ],
    noneOf: ['movil', 'telefono', 'smartphone', 'tablet'],
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

function matchesOverrideRule(
  text: string,
  rule: TaxonomyOverrideRule,
): boolean {
  const hasPositive = rule.anyOf.some((keyword) =>
    text.includes(normalizeText(keyword)),
  );
  if (!hasPositive) return false;

  return !(rule.noneOf ?? []).some((keyword) =>
    text.includes(normalizeText(keyword)),
  );
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
  const combined = normalizeText(`${familyName ?? ''} ${subfamilyName ?? ''}`);

  if (!family && !subfamily) {
    return DEFAULT_PARENT_CATEGORY;
  }

  const override = PARENT_CATEGORY_OVERRIDE_RULES.find((rule) =>
    matchesOverrideRule(combined, rule),
  );
  if (override) {
    const matchedCategory = MENU_PARENT_TAXONOMY.find(
      (category) => category.key === override.key,
    );
    if (matchedCategory) {
      return {
        key: matchedCategory.key,
        label: matchedCategory.label,
      };
    }
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
