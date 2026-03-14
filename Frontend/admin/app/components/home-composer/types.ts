export type HomeSectionType =
  | "HERO_CAROUSEL"
  | "CATEGORY_STRIP"
  | "PRODUCT_CAROUSEL"
  | "BRAND_STRIP"
  | "VALUE_PROPS"
  | "TRENDING_CHIPS"
  | "CUSTOM_HTML";

export type HomeSection = {
  id: string;
  layout_id: string;
  type: HomeSectionType;
  title?: string | null;
  subtitle?: string | null;
  position: number;
  is_enabled: boolean;
  variant?: string | null;
  config: Record<string, unknown>;
};

export type HomeSectionItem = {
  id: string;
  section_id: string;
  position: number;
  type: "BANNER" | "CATEGORY" | "BRAND" | "PRODUCT" | "LINK";
  category_id?: string | null;
  brand_id?: string | null;
  product_id?: string | null;
  banner_id?: string | null;
  label?: string | null;
};

export type HomeOption = {
  id: string;
  label: string;
  subtitle?: string;
};
