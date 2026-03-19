import {
  Monitor,
  Cpu,
  Printer,
  Server,
  Smartphone,
  Tv,
  Shield,
  Gamepad2,
  Package,
  Laptop,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;

const CATEGORY_ICON_MAP: Record<string, IconComponent> = {
  "ordenadores-portatiles": Laptop,
  "componentes-almacenamiento": Cpu,
  "monitores-perifericos": Monitor,
  "impresion-escaneado": Printer,
  "redes-servidores": Server,
  "telefonia-movilidad": Smartphone,
  "tv-audio-video": Tv,
  "software-seguridad": Shield,
  "gaming-smart-home": Gamepad2,
  "accesorios-consumibles": Package,
};

export function getCategoryIcon(slug: string): IconComponent | null {
  return CATEGORY_ICON_MAP[slug] ?? null;
}
