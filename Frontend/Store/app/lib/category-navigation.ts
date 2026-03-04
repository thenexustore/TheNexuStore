import { CategoryTreeNode } from "./products";

type ParentPreset = {
  id: string;
  name: string;
  slug: string;
  keywords: string[];
};

export const CURATED_PARENT_CATEGORIES: ReadonlyArray<string> = [
  "Ordenadores y Portátiles",
  "Componentes de PC",
  "Periféricos y Gaming",
  "Monitores y Proyección",
  "Redes y Servidores",
  "Almacenamiento y Memoria",
  "Impresión y Oficina",
  "Telefonía y Tablets",
  "TV, Audio y Vídeo",
  "Hogar y Domótica",
  "Software y Seguridad",
  "Ofertas y Otros",
];

const PARENT_PRESETS: ParentPreset[] = [
  { id: "ordenadores-portatiles", name: "Ordenadores y Portátiles", slug: "ordenadores-portatiles", keywords: ["ordenador", "pc", "portatil", "laptop", "notebook", "aio", "workstation", "mini pc", "chromebook"] },
  { id: "componentes-pc", name: "Componentes de PC", slug: "componentes-pc", keywords: ["componente", "placa", "procesador", "cpu", "grafica", "gpu", "ram", "memoria", "fuente", "caja", "refrigeracion", "ventilador", "motherboard"] },
  { id: "perifericos-gaming", name: "Periféricos y Gaming", slug: "perifericos-gaming", keywords: ["teclado", "raton", "mouse", "auricular", "gaming", "mando", "volante", "silla", "alfombrilla", "periferico", "joystick", "consola"] },
  { id: "monitores-proyeccion", name: "Monitores y Proyección", slug: "monitores-proyeccion", keywords: ["monitor", "pantalla", "proyector", "proyeccion", "display", "tv profesional", "carteleria"] },
  { id: "redes-servidores", name: "Redes y Servidores", slug: "redes-servidores", keywords: ["router", "switch", "wifi", "red", "network", "servidor", "rack", "nas", "sai", "ups", "firewall"] },
  { id: "almacenamiento-memoria", name: "Almacenamiento y Memoria", slug: "almacenamiento-memoria", keywords: ["disco", "ssd", "hdd", "almacenamiento", "pendrive", "usb", "tarjeta", "memoria", "micro sd", "backup"] },
  { id: "impresion-oficina", name: "Impresión y Oficina", slug: "impresion-oficina", keywords: ["impresora", "impresion", "scanner", "escaner", "multifuncion", "toner", "tinta", "oficina", "etiqueta", "papel"] },
  { id: "telefonia-tablets", name: "Telefonía y Tablets", slug: "telefonia-tablets", keywords: ["telefono", "smartphone", "movil", "tablet", "smartwatch", "wearable", "reloj", "iphone", "android"] },
  { id: "tv-audio-video", name: "TV, Audio y Vídeo", slug: "tv-audio-video", keywords: ["televisor", "tv", "audio", "altavoz", "soundbar", "sonido", "camara", "video", "pro audio", "microfono"] },
  { id: "hogar-domotica", name: "Hogar y Domótica", slug: "hogar-domotica", keywords: ["hogar", "domotica", "smart home", "seguridad", "cctv", "iluminacion", "electrodomestico", "aspirador", "climatizacion"] },
  { id: "software-seguridad", name: "Software y Seguridad", slug: "software-seguridad", keywords: ["software", "licencia", "antivirus", "seguridad", "saas", "office", "windows", "backup cloud"] },
  { id: "ofertas-otros", name: "Ofertas y Otros", slug: "ofertas-otros", keywords: ["oferta", "outlet", "reacondicionado", "promocion", "liquidacion", "otros", "varios"] },
];

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const collectNodeText = (node: CategoryTreeNode): string => {
  const childrenText = node.children.map(collectNodeText).join(" ");
  return normalize(`${node.name} ${node.slug} ${childrenText}`);
};

export function buildCuratedCategoryTree(tree: CategoryTreeNode[]): CategoryTreeNode[] {
  if (!tree.length) return [];

  const grouped = new Map<string, CategoryTreeNode[]>();
  PARENT_PRESETS.forEach((preset) => grouped.set(preset.id, []));

  for (const node of tree) {
    const searchableText = collectNodeText(node);
    const match = PARENT_PRESETS
      .map((preset) => ({
        preset,
        score: preset.keywords.reduce((acc, keyword) => (searchableText.includes(normalize(keyword)) ? acc + 1 : acc), 0),
      }))
      .sort((a, b) => b.score - a.score)[0];

    const targetPresetId = match && match.score > 0 ? match.preset.id : "ofertas-otros";
    grouped.get(targetPresetId)?.push(node);
  }

  return PARENT_PRESETS.map((preset) => {
    const children = grouped.get(preset.id) ?? [];

    return {
      id: `curated-${preset.id}`,
      name: preset.name,
      slug: children[0]?.slug ?? preset.slug,
      depth: 0,
      children,
    };
  });
}
