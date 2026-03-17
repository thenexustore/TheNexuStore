"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { HomeBuilderApiError, homeBuilderApi } from "@/lib/api/home-builder";
import { API_URL, SITE_URL } from "@/lib/constants";
import { useLocale } from "next-intl";
import { Eye, LayoutTemplate, Sparkles, Wand2 } from "lucide-react";
import { getBanners, toggleBannerStatus } from "@/lib/api/banners";
import {
  fetchFeaturedProducts,
  toggleFeaturedProductStatus,
} from "@/lib/api/featured-products";
import { fetchCategories, type Category } from "@/lib/api/categories";
import { fetchBrands, type Brand } from "@/lib/api/brands";
import CanvasSections from "@/app/components/home-composer/CanvasSections";
import CuratedItemsPanel from "@/app/components/home-composer/CuratedItemsPanel";
import { HomeOption, HomeSection, HomeSectionItem, HomeSectionType } from "@/app/components/home-composer/types";

type HomeLayout = {
  id: string;
  name: string;
  locale?: string | null;
  is_active: boolean;
};

type ActiveLayoutDiagnostics = {
  locale: string | null;
  activeLayout: {
    id: string;
    name: string;
    locale?: string | null;
    is_active: boolean;
    updated_at?: string;
  } | null;
  sections: Array<{
    id: string;
    type: string;
    title?: string | null;
    position: number;
    is_enabled: boolean;
    raw_config: Record<string, unknown>;
    effective_config: Record<string, unknown>;
    resolved_count: number;
    fallback_reason: string | null;
    warnings: string[];
  }>;
};

type ProductSource =
  | "NEW_ARRIVALS"
  | "BEST_DEALS"
  | "FEATURED"
  | "CATEGORY"
  | "BRAND"
  | "BEST_SELLERS";

type SectionDraft = {
  title: string;
  subtitle: string;
  is_enabled: boolean;
  variant: string;
  configText: string;
};

type IntegratedBanner = {
  id: string;
  title_text: string | null;
  sort_order: number;
  is_active: boolean;
};

type IntegratedFeatured = {
  id: string;
  title: string | null;
  sort_order: number;
  is_active: boolean;
  product?: { title?: string | null } | null;
};

function shouldUseLegacyIntegratedFallback(error: unknown) {
  return error instanceof HomeBuilderApiError && error.status === 404;
}

const SECTION_TYPES: HomeSectionType[] = [
  "HERO_CAROUSEL",
  "CATEGORY_STRIP",
  "PRODUCT_CAROUSEL",
  "BRAND_STRIP",
  "VALUE_PROPS",
  "TRENDING_CHIPS",
  "CUSTOM_HTML",
];

const SECTION_TYPE_LABELS: Record<HomeSectionType, string> = {
  HERO_CAROUSEL: "Banner",
  CATEGORY_STRIP: "Grid de categorías",
  PRODUCT_CAROUSEL: "Carrusel de productos",
  BRAND_STRIP: "Carrusel de marcas",
  VALUE_PROPS: "Beneficios / confianza",
  TRENDING_CHIPS: "Chips de tendencias",
  CUSTOM_HTML: "Bloque HTML personalizado",
};

const DEFAULT_CONFIG: Record<HomeSectionType, Record<string, unknown>> = {
  HERO_CAROUSEL: { autoplay: true, interval_ms: 5000, pause_on_hover: true, show_arrows: true, show_dots: true },
  CATEGORY_STRIP: { mode: "auto", limit: 10, items_mobile: 2, items_desktop: 6, show_names: true, show_top_badges: true, image_fit: "contain", card_style: "elevated", auto_strategy: "demand", cta_text: "Explorar" },
  PRODUCT_CAROUSEL: {
    mode: "rule",
    source: "NEW_ARRIVALS",
    limit: 12,
    inStockOnly: true,
    discount_only: false,
    featured_only: false,
    category_scope: "parent_and_descendants",
    sortBy: "newest",
    autoplay: true,
    show_arrows: true,
    show_dots: false,
    interval_ms: 4500,
    items_mobile: 2,
    items_desktop: 4,
    view_all_label: "Ver todo",
    view_all_href: "/products",
  },
  BRAND_STRIP: {
    mode: "auto",
    limit: 12,
    autoplay: true,
    interval_ms: 4500,
    items_mobile: 2,
    items_desktop: 6,
  },
  VALUE_PROPS: {
    items: [
      { icon: "truck", text: "Entrega 24/48h" },
      { icon: "shield", text: "Pago seguro" },
    ],
  },
  TRENDING_CHIPS: { items: [{ text: "Gaming" }, { text: "Portátiles" }] },
  CUSTOM_HTML: { html: "" },
};

function byPosition(a: HomeSection, b: HomeSection) {
  return a.position - b.position;
}

function safeJsonParse(value: string): Record<string, unknown> {
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("La config JSON debe ser un objeto");
  }
  return parsed as Record<string, unknown>;
}

function asNumber(value: unknown, fallback: number) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function parseIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || "").trim()).filter(Boolean);
  }
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function pickImageFileAsDataUrl(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);

      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };

    input.click();
  });
}

type ChipsConfigItem = {
  text?: string;
  title?: string;
  icon?: string;
  image_url?: string;
  href?: string;
};

export default function HomeComposerPage() {
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [layouts, setLayouts] = useState<HomeLayout[]>([]);
  const [activeLayoutId, setActiveLayoutId] = useState<string>("");
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [saving, setSaving] = useState(false);
  const [newSectionType, setNewSectionType] =
    useState<HomeSectionType>("PRODUCT_CAROUSEL");
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SectionDraft | null>(null);
  const [items, setItems] = useState<HomeSectionItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOptions, setSearchOptions] = useState<HomeOption[]>([]);
  const [activeDiagnostics, setActiveDiagnostics] = useState<ActiveLayoutDiagnostics | null>(null);
  const [integratedBanners, setIntegratedBanners] = useState<IntegratedBanner[]>([]);
  const [integratedFeatured, setIntegratedFeatured] = useState<IntegratedFeatured[]>([]);
  const [integratedLoading, setIntegratedLoading] = useState(false);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");

  const activeLayout = useMemo(
    () => layouts.find((l) => l.id === activeLayoutId) || null,
    [layouts, activeLayoutId],
  );

  const selectedSection = useMemo(
    () => sections.find((section) => section.id === selectedSectionId) || null,
    [sections, selectedSectionId],
  );

  const parsedDraftConfig = useMemo(() => {
    if (!draft) return null;
    try {
      return safeJsonParse(draft.configText);
    } catch {
      return null;
    }
  }, [draft]);

  const categoryTree = useMemo(() => {
    const parentBuckets = new Map<string, Category[]>();
    const roots: Category[] = [];

    allCategories.forEach((category) => {
      if (category.parent_id) {
        const bucket = parentBuckets.get(category.parent_id) || [];
        bucket.push(category);
        parentBuckets.set(category.parent_id, bucket);
        return;
      }
      roots.push(category);
    });

    const bySort = (a: Category, b: Category) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
    };

    return roots.sort(bySort).map((parent) => ({
      parent,
      children: (parentBuckets.get(parent.id) || []).sort(bySort),
    }));
  }, [allCategories]);

  const selectedCategoryIds = useMemo(() => {
    if (!parsedDraftConfig) return [];
    return [...new Set(parseIds(parsedDraftConfig.categoryIds || parsedDraftConfig.categoryId))];
  }, [parsedDraftConfig]);

  const selectedBrandIds = useMemo(() => {
    if (!parsedDraftConfig) return [];
    return [...new Set(parseIds(parsedDraftConfig.brandIds || parsedDraftConfig.brandId))];
  }, [parsedDraftConfig]);

  const normalizedCategoryFilter = categoryFilter.trim().toLowerCase();
  const normalizedBrandFilter = brandFilter.trim().toLowerCase();

  const filteredCategoryTree = useMemo(() => {
    if (!normalizedCategoryFilter) return categoryTree;
    return categoryTree
      .map(({ parent, children }) => {
        const parentMatch = `${parent.name} ${parent.slug}`.toLowerCase().includes(normalizedCategoryFilter);
        if (parentMatch) return { parent, children };
        const matchingChildren = children.filter((child) => `${child.name} ${child.slug}`.toLowerCase().includes(normalizedCategoryFilter));
        return { parent, children: matchingChildren };
      })
      .filter(({ parent, children }) => children.length > 0 || `${parent.name} ${parent.slug}`.toLowerCase().includes(normalizedCategoryFilter));
  }, [categoryTree, normalizedCategoryFilter]);

  const filteredBrands = useMemo(() => {
    const sorted = [...allBrands].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
    if (!normalizedBrandFilter) return sorted;
    return sorted.filter((brand) => `${brand.name} ${brand.slug}`.toLowerCase().includes(normalizedBrandFilter));
  }, [allBrands, normalizedBrandFilter]);

  const selectedCategoryMeta = useMemo(() => {
    const index = new Map(allCategories.map((category) => [category.id, category]));
    return selectedCategoryIds
      .map((id) => index.get(id))
      .filter((entry): entry is Category => Boolean(entry));
  }, [allCategories, selectedCategoryIds]);

  const selectedBrandMeta = useMemo(() => {
    const index = new Map(allBrands.map((brand) => [brand.id, brand]));
    return selectedBrandIds
      .map((id) => index.get(id))
      .filter((entry): entry is Brand => Boolean(entry));
  }, [allBrands, selectedBrandIds]);

  useEffect(() => {
    if (selectedSection?.type !== "PRODUCT_CAROUSEL") {
      setCategoryFilter("");
      setBrandFilter("");
    }
  }, [selectedSection?.type]);

  const currentTarget = useMemo<"products" | "brands" | "categories" | "banners" | null>(() => {
    if (!selectedSection) return null;
    if (selectedSection.type === "PRODUCT_CAROUSEL") return "products";
    if (selectedSection.type === "BRAND_STRIP") return "brands";
    if (selectedSection.type === "CATEGORY_STRIP") return "categories";
    if (selectedSection.type === "HERO_CAROUSEL") return "banners";
    return null;
  }, [selectedSection]);

  const curatedEnabled = useMemo(() => {
    if (!selectedSection || !parsedDraftConfig) return false;
    if (selectedSection.type === "PRODUCT_CAROUSEL") {
      return String(parsedDraftConfig.mode || "rule") === "curated";
    }
    if (selectedSection.type === "BRAND_STRIP" || selectedSection.type === "CATEGORY_STRIP") {
      return String(parsedDraftConfig.mode || "auto") === "curated";
    }
    if (selectedSection.type === "HERO_CAROUSEL") return true;
    return false;
  }, [selectedSection, parsedDraftConfig]);


  const curatedLimit = useMemo(() => {
    const raw = Number(parsedDraftConfig?.limit || 0);
    if (!Number.isFinite(raw) || raw <= 0) return selectedSection?.type === "HERO_CAROUSEL" ? 6 : 24;
    return Math.max(1, Math.min(24, Math.floor(raw)));
  }, [parsedDraftConfig, selectedSection]);

  const curatedRemaining = useMemo(() => {
    return Math.max(0, curatedLimit - items.length);
  }, [curatedLimit, items.length]);

  const selectedSectionDiagnostic = useMemo(() => {
    if (!selectedSection || !activeDiagnostics) return null;
    return activeDiagnostics.sections.find((section) => section.id === selectedSection.id) || null;
  }, [activeDiagnostics, selectedSection]);

  const isDraftDirty = useMemo(() => {
    if (!selectedSection || !draft || !parsedDraftConfig) return false;
    const originalConfig = JSON.stringify(selectedSection.config || {});
    const currentConfig = JSON.stringify(parsedDraftConfig || {});
    return (
      (draft.title || "") !== (selectedSection.title || "") ||
      (draft.subtitle || "") !== (selectedSection.subtitle || "") ||
      draft.is_enabled !== selectedSection.is_enabled ||
      (draft.variant || "") !== (selectedSection.variant || "") ||
      originalConfig !== currentConfig
    );
  }, [selectedSection, draft, parsedDraftConfig]);

  const loadLayouts = useCallback(async () => {
    const data = (await homeBuilderApi.layouts()) as HomeLayout[];
    setLayouts(data);

    const fallbackLayout = data.find((x) => x.is_active) || data[0] || null;
    if (!fallbackLayout) {
      setActiveLayoutId("");
      setSections([]);
      setSelectedSectionId(null);
      return;
    }

    setActiveLayoutId((prev) => prev || fallbackLayout.id);
  }, []);

  const loadSections = useCallback(async (layoutId: string) => {
    if (!layoutId) {
      setSections([]);
      setSelectedSectionId(null);
      setDraft(null);
      setSearchQuery("");
      return;
    }

    const data = (await homeBuilderApi.sections(layoutId)) as HomeSection[];
    const sorted = [...data].sort(byPosition);
    setSections(sorted);

    if (!sorted.length) {
      setSelectedSectionId(null);
      setDraft(null);
      setSearchQuery("");
      return;
    }

    setSelectedSectionId((prev) => (prev && sorted.some((x) => x.id === prev) ? prev : sorted[0].id));
  }, []);

  const loadActiveDiagnostics = useCallback(async () => {
    try {
      const data = (await homeBuilderApi.activeDiagnostics(locale)) as ActiveLayoutDiagnostics;
      setActiveDiagnostics(data);
    } catch {
      setActiveDiagnostics(null);
    }
  }, [locale]);

  const loadIntegratedModules = useCallback(async () => {
    setIntegratedLoading(true);

    try {
      try {
        const summary = (await homeBuilderApi.integratedSummary(8)) as {
          banners?: IntegratedBanner[];
          featured?: IntegratedFeatured[];
        };
        setIntegratedBanners(summary?.banners || []);
        setIntegratedFeatured(summary?.featured || []);
        return;
      } catch (error) {
        if (!shouldUseLegacyIntegratedFallback(error)) {
          throw error;
        }
      }

      const [banners, featuredResponse] = await Promise.all([
        getBanners(),
        fetchFeaturedProducts({ take: 8 }),
      ]);

      setIntegratedBanners(
        banners
          .sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.sort_order - b.sort_order)
          .slice(0, 8)
          .map((banner) => ({
            id: banner.id,
            title_text: banner.title_text ?? null,
            sort_order: banner.sort_order,
            is_active: banner.is_active,
          })),
      );

      setIntegratedFeatured(
        (featuredResponse?.data || [])
          .sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.sort_order - b.sort_order)
          .slice(0, 8)
          .map((item) => ({
            id: item.id,
            title: item.title ?? null,
            sort_order: item.sort_order,
            is_active: item.is_active,
            product: { title: item.product?.title ?? null },
          })),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los módulos integrados",
      );
    } finally {
      setIntegratedLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        await loadLayouts();
        await loadActiveDiagnostics();
        await loadIntegratedModules();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudieron cargar los diseños");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [loadLayouts, loadActiveDiagnostics, loadIntegratedModules]);

  useEffect(() => {
    const loadTaxonomy = async () => {
      try {
        const [categories, brands] = await Promise.all([fetchCategories(), fetchBrands()]);
        setAllCategories(categories || []);
        setAllBrands(brands || []);
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[home-composer] failed to load category/brand selectors", error);
        }
      }
    };
    void loadTaxonomy();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadIntegratedModules();
    }, 45_000);
    return () => window.clearInterval(id);
  }, [loadIntegratedModules]);

  const syncComposerRuntimeState = async () => {
    await Promise.all([
      loadActiveDiagnostics(),
      activeLayoutId ? loadSections(activeLayoutId) : Promise.resolve(),
    ]);
  };

  const toggleIntegratedBanner = async (bannerId: string) => {
    try {
      await toggleBannerStatus(bannerId);
      await loadIntegratedModules();
      await syncComposerRuntimeState();
      toast.success("Estado de banner actualizado");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo actualizar banner",
      );
    }
  };

  const toggleIntegratedFeatured = async (featuredId: string) => {
    try {
      await toggleFeaturedProductStatus(featuredId);
      await loadIntegratedModules();
      await syncComposerRuntimeState();
      toast.success("Estado de destacado actualizado");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar producto destacado",
      );
    }
  };

  useEffect(() => {
    if (!activeLayoutId) return;
    void loadSections(activeLayoutId).catch((error) => {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar secciones");
    });
    void loadActiveDiagnostics();
  }, [activeLayoutId, loadSections, loadActiveDiagnostics]);

  useEffect(() => {
    if (!selectedSection) {
      setDraft(null);
      setSearchQuery("");
      return;
    }

    setDraft({
      title: selectedSection.title || "",
      subtitle: selectedSection.subtitle || "",
      is_enabled: selectedSection.is_enabled,
      variant: selectedSection.variant || "",
      configText: JSON.stringify(selectedSection.config || {}, null, 2),
    });
  }, [selectedSection]);

  useEffect(() => {
    const loadItems = async () => {
      if (!selectedSection || !curatedEnabled || !currentTarget) {
        setItems([]);
        return;
      }
      try {
        setItemsLoading(true);
        const data = (await homeBuilderApi.listItems(selectedSection.id)) as HomeSectionItem[];
        setItems([...data].sort((a, b) => a.position - b.position));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudieron cargar los ítems curados");
      } finally {
        setItemsLoading(false);
      }
    };

    void loadItems();
  }, [selectedSection, curatedEnabled, currentTarget]);

  useEffect(() => {
    const search = async () => {
      if (!selectedSection || !curatedEnabled || !currentTarget) {
        setSearchOptions([]);
        return;
      }

      try {
        setOptionsLoading(true);
        const data = (await homeBuilderApi.options(currentTarget, searchQuery, 20)) as HomeOption[];
        setSearchOptions(data);
      } catch {
        setSearchOptions([]);
      } finally {
        setOptionsLoading(false);
      }
    };

    const handle = setTimeout(() => void search(), 250);
    return () => clearTimeout(handle);
  }, [selectedSection, curatedEnabled, currentTarget, searchQuery]);

  const createLayout = async () => {
    try {
      setSaving(true);
      const name = `Home ${new Date().toLocaleDateString()}`;
      const layout = (await homeBuilderApi.createLayout({ name, locale })) as HomeLayout;
      await loadLayouts();
      setActiveLayoutId(layout.id);
      toast.success("Diseño creado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el diseño");
    } finally {
      setSaving(false);
    }
  };

  const publishLayout = async () => {
    if (!activeLayout) return;
    try {
      setSaving(true);
      await homeBuilderApi.updateLayout(activeLayout.id, {
        is_active: true,
        locale: activeLayout.locale || locale,
      });
      await loadLayouts();
      await loadActiveDiagnostics();
      toast.success("Diseño publicado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo publicar");
    } finally {
      setSaving(false);
    }
  };

  const addSection = async () => {
    if (!activeLayoutId) return;

    try {
      setSaving(true);
      await homeBuilderApi.createSection(activeLayoutId, {
        type: newSectionType,
        position: sections.length + 1,
        is_enabled: true,
        title:
          newSectionTitle.trim() ||
          (newSectionType === "HERO_CAROUSEL" ? "Banner" : newSectionType),
        config: DEFAULT_CONFIG[newSectionType],
      });
      await loadSections(activeLayoutId);
      setNewSectionTitle("");
      toast.success("Sección añadida");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear la sección");
    } finally {
      setSaving(false);
    }
  };

  const moveSection = async (section: HomeSection, direction: -1 | 1) => {
    if (saving) return;

    const orderedSections = [...sections].sort(byPosition);
    const currentIndex = orderedSections.findIndex((x) => x.id === section.id);
    if (currentIndex < 0) return;

    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= orderedSections.length) return;

    const reordered = [...orderedSections];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(nextIndex, 0, moved);
    const payload = reordered.map((entry, index) => ({ id: entry.id, position: index + 1 }));

    const previousSections = sections;
    setSections(reordered.map((entry, index) => ({ ...entry, position: index + 1 })));

    try {
      setSaving(true);
      try {
        await homeBuilderApi.reorderSections(payload);
      } catch (error) {
        // Fallback defensivo: algunos entornos legacy aún no aceptan reorder masivo.
        await homeBuilderApi.moveSection(section.id, nextIndex + 1);
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[home-composer] reorderSections failed, used moveSection fallback', error);
        }
      }
      await loadSections(activeLayoutId);
      toast.success('Bloque reordenado');
    } catch (error) {
      setSections(previousSections);
      toast.error(error instanceof Error ? error.message : "No se pudo mover la sección");
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = async (section: HomeSection) => {
    try {
      setSaving(true);
      await homeBuilderApi.updateSection(section.id, {
        is_enabled: !section.is_enabled,
      });
      await loadSections(activeLayoutId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la sección");
    } finally {
      setSaving(false);
    }
  };

  const deleteSection = async (sectionId: string) => {
    if (!window.confirm("¿Seguro que quieres eliminar este bloque?")) return;
    try {
      setSaving(true);
      await homeBuilderApi.deleteSection(sectionId);
      await loadSections(activeLayoutId);
      await loadActiveDiagnostics();
      toast.success("Sección eliminada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la sección");
    } finally {
      setSaving(false);
    }
  };

  const updateDraftConfig = (nextConfig: Record<string, unknown>) => {
    if (!draft) return;
    setDraft({
      ...draft,
      configText: JSON.stringify(nextConfig, null, 2),
    });
  };

  const toggleCategorySelection = (categoryId: string) => {
    if (!parsedDraftConfig) return;
    const current = new Set(selectedCategoryIds);
    if (current.has(categoryId)) {
      current.delete(categoryId);
    } else {
      current.add(categoryId);
    }
    updateDraftConfig({
      ...parsedDraftConfig,
      categoryIds: Array.from(current),
      categoryId: null,
    });
  };

  const toggleBrandSelection = (brandId: string) => {
    if (!parsedDraftConfig) return;
    const current = new Set(selectedBrandIds);
    if (current.has(brandId)) {
      current.delete(brandId);
    } else {
      current.add(brandId);
    }
    updateDraftConfig({
      ...parsedDraftConfig,
      brandIds: Array.from(current),
      brandId: null,
    });
  };

  const saveInspector = async () => {
    if (!selectedSection || !draft) return;

    try {
      const config = safeJsonParse(draft.configText);
      setSaving(true);

      await homeBuilderApi.updateSection(selectedSection.id, {
        title: draft.title.trim() || selectedSection.type,
        subtitle: draft.subtitle.trim() || null,
        variant: draft.variant.trim() || null,
        is_enabled: draft.is_enabled,
        config,
      });

      await loadSections(activeLayoutId);
      if (selectedSection.type === "HERO_CAROUSEL") {
        await loadIntegratedModules();
      }
      toast.success("Bloque guardado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el bloque");
    } finally {
      setSaving(false);
    }
  };

  const addCuratedItem = async (option: HomeOption) => {
    if (!selectedSection || !currentTarget) return;

    if (items.length >= curatedLimit) {
      toast.error(`Has alcanzado el límite (${curatedLimit}) para este bloque.`);
      return;
    }

    const alreadyAdded = items.some((item) => {
      if (currentTarget === "products") return item.product_id === option.id;
      if (currentTarget === "brands") return item.brand_id === option.id;
      if (currentTarget === "categories") return item.category_id === option.id;
      return item.banner_id === option.id;
    });

    if (alreadyAdded) {
      toast.error("Ese elemento ya está añadido en este bloque.");
      return;
    }

    const basePayload: Record<string, unknown> = {
      position: items.length + 1,
      label: option.label,
    };

    if (currentTarget === "products") {
      basePayload.type = "PRODUCT";
      basePayload.product_id = option.id;
    }
    if (currentTarget === "brands") {
      basePayload.type = "BRAND";
      basePayload.brand_id = option.id;
    }
    if (currentTarget === "categories") {
      basePayload.type = "CATEGORY";
      basePayload.category_id = option.id;
    }
    if (currentTarget === "banners") {
      basePayload.type = "BANNER";
      basePayload.banner_id = option.id;
    }

    try {
      setSaving(true);
      await homeBuilderApi.createItem(selectedSection.id, basePayload);
      const data = (await homeBuilderApi.listItems(selectedSection.id)) as HomeSectionItem[];
      setItems([...data].sort((a, b) => a.position - b.position));
      if (currentTarget === "banners") {
        await loadIntegratedModules();
      }
      toast.success("Ítem añadido");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo añadir el ítem");
    } finally {
      setSaving(false);
    }
  };

  const deleteCuratedItem = async (itemId: string) => {
    if (!selectedSection) return;
    if (!window.confirm("¿Eliminar este ítem curado?")) return;
    try {
      setSaving(true);
      await homeBuilderApi.deleteItem(itemId);
      const remaining = items.filter((item) => item.id !== itemId);
      const reordered = remaining.map((item, index) => ({ id: item.id, position: index + 1 }));
      if (reordered.length) {
        await homeBuilderApi.reorderItems(reordered);
      }
      setItems(remaining.map((item, index) => ({ ...item, position: index + 1 })));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el ítem");
    } finally {
      setSaving(false);
    }
  };

  const moveCuratedItem = async (item: HomeSectionItem, direction: -1 | 1) => {
    const nextIndex = items.findIndex((x) => x.id === item.id) + direction;
    const currentIndex = items.findIndex((x) => x.id === item.id);
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= items.length) return;

    const reordered = [...items];
    const [removed] = reordered.splice(currentIndex, 1);
    reordered.splice(nextIndex, 0, removed);
    const payload = reordered.map((entry, index) => ({ id: entry.id, position: index + 1 }));

    try {
      setSaving(true);
      await homeBuilderApi.reorderItems(payload);
      setItems(reordered.map((entry, index) => ({ ...entry, position: index + 1 })));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo reordenar el ítem");
    } finally {
      setSaving(false);
    }
  };


  const updateCuratedItemImage = async (item: HomeSectionItem) => {
    const action = window.prompt("URL de imagen para este elemento (vacío para quitarla):", item.image_url || "");
    if (action === null) return;

    try {
      setSaving(true);
      await homeBuilderApi.updateItem(item.id, { image_url: action.trim() || null });
      const data = (await homeBuilderApi.listItems(item.section_id)) as HomeSectionItem[];
      setItems([...data].sort((a, b) => a.position - b.position));
      toast.success("Imagen del ítem actualizada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la imagen");
    } finally {
      setSaving(false);
    }
  };

  const uploadCuratedItemImage = async (item: HomeSectionItem) => {
    try {
      const dataUrl = await pickImageFileAsDataUrl();
      if (!dataUrl) return;

      setSaving(true);
      const uploaded = await homeBuilderApi.uploadItemImage(dataUrl);
      await homeBuilderApi.updateItem(item.id, { image_url: uploaded.url || null });

      const data = (await homeBuilderApi.listItems(item.section_id)) as HomeSectionItem[];
      setItems([...data].sort((a, b) => a.position - b.position));
      toast.success("Imagen subida y aplicada al ítem");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo subir la imagen");
    } finally {
      setSaving(false);
    }
  };

  const updateCuratedItemLink = async (item: HomeSectionItem) => {
    const nextLink = window.prompt("Enlace destino (vacío para usar el enlace por defecto):", item.href || "");
    if (nextLink === null) return;
    try {
      setSaving(true);
      await homeBuilderApi.updateItem(item.id, { href: nextLink.trim() || null });
      const data = (await homeBuilderApi.listItems(item.section_id)) as HomeSectionItem[];
      setItems([...data].sort((a, b) => a.position - b.position));
      toast.success("Enlace del ítem actualizado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el enlace");
    } finally {
      setSaving(false);
    }
  };

  const resetDraft = () => {
    if (!selectedSection) return;
    setDraft({
      title: selectedSection.title || "",
      subtitle: selectedSection.subtitle || "",
      is_enabled: selectedSection.is_enabled,
      variant: selectedSection.variant || "",
      configText: JSON.stringify(selectedSection.config || {}, null, 2),
    });
  };

  const previewLink = activeLayoutId
    ? `${SITE_URL}/${locale}/store?previewLayoutId=${activeLayoutId}`
    : `${SITE_URL}/${locale}/store`;

  if (loading) {
    return <div className="p-6 text-sm text-zinc-600">Cargando Compositor de Inicio…</div>;
  }

  const config = parsedDraftConfig || {};
  const chipsItems = Array.isArray(config.items) ? (config.items as ChipsConfigItem[]) : [];
  const isHeroSection = selectedSection?.type === "HERO_CAROUSEL";
  const isFeaturedProductSection =
    selectedSection?.type === "PRODUCT_CAROUSEL" &&
    String(config.source || "NEW_ARRIVALS") === "FEATURED";

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-lg bg-black px-3 py-2 font-medium text-white">Compositor de Inicio</span>
          <a href="#composer-banners-panel" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-700 hover:bg-zinc-50">
            Ir a Banners integrados
          </a>
          <a href="#composer-featured-panel" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-700 hover:bg-zinc-50">
            Ir a Productos destacados integrados
          </a>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-zinc-900"><Sparkles className="h-5 w-5 text-indigo-500" />Compositor de Inicio</h1>
            <p className="text-sm text-zinc-500">
              Gestiona diseños de inicio, secciones y publicación por idioma desde un flujo más visual.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={createLayout}
              disabled={saving}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
            >
              + Nuevo diseño
            </button>
            <button
              onClick={publishLayout}
              disabled={saving || !activeLayout}
              className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              Publicar diseño
            </button>
            <a
              href={previewLink}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
            >
              Abrir vista previa
            </a>
            <a
              href={`${API_URL}/admin/home/preview?layoutId=${activeLayoutId}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
            >
              Ver JSON de vista previa
            </a>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-zinc-500">Diseño</span>
            <select
              value={activeLayoutId}
              onChange={(event) => setActiveLayoutId(event.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            >
              {layouts.map((layout) => (
                <option key={layout.id} value={layout.id}>
                  {layout.name}
                  {layout.is_active ? " (Activo)" : ""}
                  {layout.locale ? ` · ${layout.locale}` : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm">
            <div className="text-zinc-500">Estado</div>
            <div className="font-medium text-zinc-900">
              {activeLayout?.is_active ? "Publicado" : "Borrador"}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm">
            <div className="text-zinc-500">Secciones</div>
            <div className="font-medium text-zinc-900">{sections.length}</div>
          </div>
        </div>

        {activeDiagnostics?.activeLayout ? (
          <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900">
            <div className="font-semibold">Diagnóstico layout activo (runtime)</div>
            <div className="mt-1">
              Layout activo en API: <span className="font-mono">{activeDiagnostics.activeLayout.id}</span>
              {activeDiagnostics.activeLayout.locale ? ` · ${activeDiagnostics.activeLayout.locale}` : " · global"}
            </div>
            <div className="mt-1">Secciones diagnosticadas: {activeDiagnostics.sections.length}</div>
            <div className="mt-2 max-h-36 overflow-auto space-y-1">
              {activeDiagnostics.sections.map((section) => (
                <div key={section.id} className="rounded border border-indigo-200 bg-white px-2 py-1">
                  <span className="font-semibold">{section.type}</span>
                  <span className="ml-1">• resolved: {section.resolved_count}</span>
                  {section.fallback_reason ? (
                    <span className="ml-1 text-amber-700">• fallback: {section.fallback_reason}</span>
                  ) : null}
                  {section.warnings.length ? (
                    <div className="mt-1 text-amber-700">{section.warnings.join(" ")}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-zinc-700"><LayoutTemplate className="h-3.5 w-3.5" /> Diseña por bloques</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-zinc-700"><Eye className="h-3.5 w-3.5" /> Previsualiza antes de publicar</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-zinc-700"><Wand2 className="h-3.5 w-3.5" /> Ajustes rápidos en inspector</span>
      </div>

      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Añadir bloque</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Selecciona el tipo de bloque, ponle un título y añádelo al lienzo. Después podrás ajustarlo desde el inspector.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <select
            value={newSectionType}
            onChange={(event) => setNewSectionType(event.target.value as HomeSectionType)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            {SECTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {SECTION_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <input
            value={newSectionTitle}
            onChange={(event) => setNewSectionTitle(event.target.value)}
            placeholder="Título de la sección"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <button
            onClick={addSection}
            disabled={saving || !activeLayoutId}
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            Añadir
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Lienzo de secciones</h2>
          <p className="mt-1 text-xs text-zinc-500">Reordena, oculta o elimina bloques con un clic.</p>

          <CanvasSections
            sections={sections}
            selectedSectionId={selectedSectionId}
            saving={saving}
            sectionTypeLabels={SECTION_TYPE_LABELS}
            onSelect={setSelectedSectionId}
            onMove={(section, direction) => void moveSection(section, direction)}
            onToggle={(section) => void toggleSection(section)}
            onDelete={(id) => void deleteSection(id)}
          />
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Inspector del bloque</h2>
          <p className="mt-1 text-xs text-zinc-500">Edita contenido, comportamiento y configuración avanzada.</p>

          {!selectedSection || !draft ? (
            <div className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-500">
              Selecciona un bloque en el lienzo para empezar a editarlo.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                Editando: <span className="font-semibold text-zinc-800">{SECTION_TYPE_LABELS[selectedSection.type]}</span>
                {isDraftDirty ? (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">Cambios sin guardar</span>
                ) : (
                  <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">Sin cambios</span>
                )}
              </div>

              {selectedSection.type === "HERO_CAROUSEL" ? (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                  Este bloque está vinculado al módulo interno de <strong>Banners</strong>. El título, subtítulo, CTA e imagen se editan en cada banner individual.
                </div>
              ) : (
                <>
                  <label className="block text-sm">
                    <span className="mb-1 block text-zinc-500">Título</span>
                    <input
                      value={draft.title}
                      onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block text-zinc-500">Subtítulo</span>
                    <input
                      value={draft.subtitle}
                      onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block text-zinc-500">Variante (opcional)</span>
                    <input
                      value={draft.variant}
                      onChange={(event) => setDraft({ ...draft, variant: event.target.value })}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                    />
                  </label>
                </>
              )}

              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={draft.is_enabled}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      is_enabled: event.target.checked,
                    })
                  }
                />
                Bloque visible
              </label>

              {selectedSection.type === "HERO_CAROUSEL" && parsedDraftConfig ? (
                <div className="rounded-xl border border-zinc-200 p-3">
                  <div className="mb-3 text-sm font-medium">Controles rápidos: Banner</div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        checked={Boolean(config.autoplay ?? true)}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            autoplay: event.target.checked,
                          })
                        }
                      />
                      Reproducción automática
                    </label>
                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        checked={Boolean(config.pause_on_hover ?? true)}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            pause_on_hover: event.target.checked,
                          })
                        }
                      />
                      Pausar al pasar el cursor
                    </label>
                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        checked={Boolean(config.show_arrows ?? true)}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            show_arrows: event.target.checked,
                          })
                        }
                      />
                      Mostrar flechas laterales
                    </label>
                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        checked={Boolean(config.show_dots ?? true)}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            show_dots: event.target.checked,
                          })
                        }
                      />
                      Mostrar indicadores (dots)
                    </label>
                    <label className="text-sm md:col-span-2">
                      <span className="mb-1 block text-zinc-500">Intervalo (ms)</span>
                      <input
                        type="number"
                        value={asNumber(config.interval_ms, 5000)}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            interval_ms: Math.max(2500, Number(event.target.value) || 2500),
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              {selectedSection.type === "PRODUCT_CAROUSEL" && parsedDraftConfig ? (
                <div className="rounded-xl border border-zinc-200 p-3">
                  <div className="mb-3 text-sm font-medium">Controles rápidos: Carrusel de productos</div>
                  {selectedSectionDiagnostic ? (
                    <div className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                      <div className="font-medium text-zinc-900">Diagnóstico en tiempo real</div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white px-2 py-1">Resultados: {selectedSectionDiagnostic.resolved_count}</span>
                        {selectedSectionDiagnostic.fallback_reason ? (
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">Fallback: {selectedSectionDiagnostic.fallback_reason}</span>
                        ) : null}
                        {selectedSectionDiagnostic.warnings.length ? (
                          <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700">Warnings: {selectedSectionDiagnostic.warnings.length}</span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">Sin warnings</span>
                        )}
                      </div>
                    </div>
                  ) : null}
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-500">Modo</span>
                      <select
                        value={String(config.mode || "rule")}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            mode: event.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                      >
                        <option value="rule">Reglas automáticas</option>
                        <option value="curated">Curado manual</option>
                      </select>
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-500">Fuente</span>
                      <select
                        value={String(config.source || "NEW_ARRIVALS")}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            source: event.target.value as ProductSource,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                      >
                        <option value="NEW_ARRIVALS">Novedades</option>
                        <option value="BEST_DEALS">Mejores ofertas</option>
                        <option value="FEATURED">Destacados</option>
                        <option value="CATEGORY">Por categoría</option>
                        <option value="BRAND">Por marca</option>
                        <option value="BEST_SELLERS">Más vendidos</option>
                      </select>
                      <p className="mt-1 text-xs text-zinc-500">
                        {String(config.source || "NEW_ARRIVALS") === "CATEGORY"
                          ? "Usa category scope + categorías seleccionadas para controlar padre/hijas."
                          : String(config.source || "NEW_ARRIVALS") === "BRAND"
                            ? "Filtra por una o varias marcas seleccionadas."
                            : String(config.source || "NEW_ARRIVALS") === "BEST_DEALS"
                              ? "Prioriza productos con descuento activo."
                              : "Fuente automática de catálogo."}
                      </p>
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-500">Límite</span>
                      <input
                        type="number"
                        value={asNumber(config.limit, 12)}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            limit: Math.max(1, Number(event.target.value) || 1),
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                      />
                    </label>

                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        checked={Boolean(config.inStockOnly ?? true)}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            inStockOnly: event.target.checked,
                          })
                        }
                      />
                      Solo con stock
                    </label>
                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        checked={Boolean(config.discount_only ?? false)}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            discount_only: event.target.checked,
                          })
                        }
                      />
                      Solo productos con descuento
                    </label>

                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        checked={Boolean(config.featured_only ?? false)}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            featured_only: event.target.checked,
                          })
                        }
                      />
                      Restringir a destacados
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-500">Orden</span>
                      <select
                        value={String(config.sortBy || "newest")}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            sortBy: event.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                      >
                        <option value="newest">Más nuevos</option>
                        <option value="price_asc">Precio ascendente</option>
                        <option value="price_desc">Precio descendente</option>
                        <option value="discount_desc">Mayor descuento</option>
                      </select>
                    </label>

                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        checked={Boolean(config.autoplay ?? true)}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            autoplay: event.target.checked,
                          })
                        }
                      />
                      Autoplay
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-500">Intervalo autoplay (ms)</span>
                      <input
                        type="number"
                        value={asNumber(config.interval_ms, 4500)}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            interval_ms: Math.max(2000, Number(event.target.value) || 2000),
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-500">Ítems en desktop</span>
                      <input
                        type="number"
                        value={asNumber(config.items_desktop, 4)}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            items_desktop: Math.max(2, Number(event.target.value) || 2),
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-500">Ítems en móvil</span>
                      <input
                        type="number"
                        value={asNumber(config.items_mobile, 2)}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            items_mobile: Math.max(1, Number(event.target.value) || 1),
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-500">Alcance categoría</span>
                      <select
                        value={String(config.category_scope || "parent_and_descendants")}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            category_scope: event.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                      >
                        <option value="parent_and_descendants">Padre + descendientes</option>
                        <option value="parent_only">Solo padres</option>
                        <option value="children_only">Solo hijas</option>
                      </select>
                    </label>

                    <div className="text-sm md:col-span-2">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="block text-zinc-500">Selector de categorías (padre/hijas)</span>
                        <div className="flex items-center gap-2">
                          <input
                            value={categoryFilter}
                            onChange={(event) => setCategoryFilter(event.target.value)}
                            placeholder="Buscar categoría..."
                            className="w-44 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs"
                          />
                          {selectedCategoryIds.length ? (
                            <button
                              type="button"
                              onClick={() =>
                                updateDraftConfig({
                                  ...config,
                                  categoryIds: [],
                                  categoryId: null,
                                })
                              }
                              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
                            >
                              Limpiar
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {selectedCategoryMeta.length ? (
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {selectedCategoryMeta.map((category) => (
                            <button
                              key={`cat-chip-${category.id}`}
                              type="button"
                              onClick={() => toggleCategorySelection(category.id)}
                              className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                            >
                              {category.name} <span aria-hidden>×</span>
                            </button>
                          ))}
                        </div>
                      ) : null}

                      <div className="max-h-52 space-y-2 overflow-auto rounded-lg border border-zinc-300 bg-zinc-50 p-2">
                        {filteredCategoryTree.length === 0 ? (
                          <p className="text-xs text-zinc-500">No hay categorías disponibles para seleccionar.</p>
                        ) : (
                          filteredCategoryTree.map(({ parent, children }) => (
                            <div key={parent.id} className="rounded-md border border-zinc-200 bg-white p-2">
                              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-800">
                                <input
                                  type="checkbox"
                                  checked={selectedCategoryIds.includes(parent.id)}
                                  onChange={() => toggleCategorySelection(parent.id)}
                                />
                                {parent.name}
                                <span className="text-xs text-zinc-500">({parent.id})</span>
                              </label>
                              {children.length ? (
                                <div className="mt-2 grid gap-1 pl-5">
                                  {children.map((child) => (
                                    <label key={child.id} className="flex cursor-pointer items-center gap-2 text-xs text-zinc-700">
                                      <input
                                        type="checkbox"
                                        checked={selectedCategoryIds.includes(child.id)}
                                        onChange={() => toggleCategorySelection(child.id)}
                                      />
                                      {child.name}
                                      <span className="text-[11px] text-zinc-500">({child.id})</span>
                                    </label>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ))
                        )}
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        Seleccionadas: {selectedCategoryIds.length ? selectedCategoryIds.join(", ") : "ninguna"}.
                      </p>
                    </div>

                    <div className="text-sm md:col-span-2">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="block text-zinc-500">Selector de marcas</span>
                        <div className="flex items-center gap-2">
                          <input
                            value={brandFilter}
                            onChange={(event) => setBrandFilter(event.target.value)}
                            placeholder="Buscar marca..."
                            className="w-44 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs"
                          />
                          {selectedBrandIds.length ? (
                            <button
                              type="button"
                              onClick={() =>
                                updateDraftConfig({
                                  ...config,
                                  brandIds: [],
                                  brandId: null,
                                })
                              }
                              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
                            >
                              Limpiar
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {selectedBrandMeta.length ? (
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {selectedBrandMeta.map((brand) => (
                            <button
                              key={`brand-chip-${brand.id}`}
                              type="button"
                              onClick={() => toggleBrandSelection(brand.id)}
                              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                            >
                              {brand.name} <span aria-hidden>×</span>
                            </button>
                          ))}
                        </div>
                      ) : null}

                      <div className="max-h-40 overflow-auto rounded-lg border border-zinc-300 bg-zinc-50 p-2">
                        <div className="grid gap-1 sm:grid-cols-2">
                          {filteredBrands.length === 0 ? (
                            <p className="text-xs text-zinc-500">No hay marcas disponibles.</p>
                          ) : (
                            filteredBrands.map((brand) => (
                                <label key={brand.id} className="flex cursor-pointer items-center gap-2 text-xs text-zinc-700">
                                  <input
                                    type="checkbox"
                                    checked={selectedBrandIds.includes(brand.id)}
                                    onChange={() => toggleBrandSelection(brand.id)}
                                  />
                                  {brand.name}
                                  <span className="text-[11px] text-zinc-500">({brand.id})</span>
                                </label>
                              ))
                          )}
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        Seleccionadas: {selectedBrandIds.length ? selectedBrandIds.join(", ") : "ninguna"}.
                      </p>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        checked={Boolean(config.show_arrows ?? true)}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            show_arrows: event.target.checked,
                          })
                        }
                      />
                      Mostrar flechas
                    </label>

                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        checked={Boolean(config.show_dots ?? false)}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            show_dots: event.target.checked,
                          })
                        }
                      />
                      Mostrar indicadores
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-500">CTA ver todo (texto)</span>
                      <input
                        value={String(config.view_all_label || "")}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            view_all_label: event.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-500">CTA ver todo (URL)</span>
                      <input
                        value={String(config.view_all_href || "")}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            view_all_href: event.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              {selectedSection.type === "BRAND_STRIP" && parsedDraftConfig ? (
                <div className="rounded-xl border border-zinc-200 p-3">
                  <div className="mb-3 text-sm font-medium">Controles rápidos: Carrusel de marcas</div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-500">Modo</span>
                      <select
                        value={String(config.mode || "auto")}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            mode: event.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                      >
                        <option value="auto">Automático</option>
                        <option value="curated">Curado</option>
                      </select>
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-500">Límite</span>
                      <input
                        type="number"
                        value={asNumber(config.limit, 12)}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            limit: Math.max(1, Number(event.target.value) || 1),
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                      />
                    </label>

                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        checked={Boolean(config.autoplay ?? true)}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            autoplay: event.target.checked,
                          })
                        }
                      />
                      Autoplay
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-500">Intervalo autoplay (ms)</span>
                      <input
                        type="number"
                        value={asNumber(config.interval_ms, 4500)}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            interval_ms: Math.max(2000, Number(event.target.value) || 2000),
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-500">Ítems en desktop</span>
                      <input
                        type="number"
                        value={asNumber(config.items_desktop, 6)}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            items_desktop: Math.max(2, Number(event.target.value) || 2),
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-500">Ítems en móvil</span>
                      <input
                        type="number"
                        value={asNumber(config.items_mobile, 2)}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            items_mobile: Math.max(2, Number(event.target.value) || 2),
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              {selectedSection.type === "CATEGORY_STRIP" && parsedDraftConfig ? (
                <div className="rounded-xl border border-zinc-200 p-3">
                  <div className="mb-3 text-sm font-medium">Controles rápidos: Grid de categorías</div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-500">Modo</span>
                      <select
                        value={String(config.mode || "auto")}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            mode: event.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                      >
                        <option value="auto">Automático</option>
                        <option value="curated">Curado</option>
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-500">Límite</span>
                      <input
                        type="number"
                        value={asNumber(config.limit, 10)}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            limit: Math.max(1, Number(event.target.value) || 1),
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-500">Columnas móvil</span>
                      <input
                        type="number"
                        min={2}
                        max={4}
                        value={asNumber(config.items_mobile, 2)}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            items_mobile: Math.max(2, Math.min(4, Number(event.target.value) || 2)),
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-500">Columnas desktop</span>
                      <input
                        type="number"
                        min={2}
                        max={8}
                        value={asNumber(config.items_desktop, 6)}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            items_desktop: Math.max(2, Math.min(8, Number(event.target.value) || 2)),
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        checked={Boolean(config.show_names ?? true)}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            show_names: event.target.checked,
                          })
                        }
                      />
                      Mostrar nombre de categoría
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-500">Ajuste de imagen</span>
                      <select
                        value={String(config.image_fit || "contain")}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            image_fit: event.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                      >
                        <option value="contain">Contener (sin recorte)</option>
                        <option value="cover">Cubrir (recorte suave)</option>
                      </select>
                    </label>
                    <label className="text-sm md:col-span-2">
                      <span className="mb-1 block text-zinc-500">Estilo de tarjeta</span>
                      <select
                        value={String(config.card_style || "minimal")}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            card_style: event.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                      >
                        <option value="minimal">Minimal (borde limpio)</option>
                        <option value="elevated">Elevated (sombra marcada)</option>
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-500">Estrategia automática</span>
                      <select
                        value={String(config.auto_strategy || "demand")}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            auto_strategy: event.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                      >
                        <option value="demand">Demanda (ventas + categorías tech top)</option>
                        <option value="alphabetical">Alfabético</option>
                        <option value="manual_sort">Orden manual de categorías</option>
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-500">Texto CTA</span>
                      <input
                        value={String(config.cta_text || "Explorar")}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            cta_text: event.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                        placeholder="Explorar"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm text-zinc-700 md:col-span-2">
                      <input
                        type="checkbox"
                        checked={Boolean(config.show_top_badges ?? true)}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            show_top_badges: event.target.checked,
                          })
                        }
                      />
                      Mostrar badges Top 1/2/3
                    </label>
                  </div>
                </div>
              ) : null}

              {isHeroSection ? (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                  Este bloque Banner está conectado al módulo de Banners: selecciona y ordena aquí los banners reales que se mostrarán en el carrusel.
                  <div className="mt-2">
                    <a
                      href="#composer-banners-panel"
                      className="inline-block rounded-md border border-blue-300 bg-white px-2 py-1 text-xs font-medium text-blue-800 hover:bg-blue-100"
                    >
                      Gestionar Banners
                    </a>
                  </div>
                </div>
              ) : null}

              {isFeaturedProductSection ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                  Esta sección usa la fuente Destacados. Puedes gestionarlos desde el panel integrado de Productos destacados.
                  <div className="mt-2">
                    <a
                      href="#composer-featured-panel"
                      className="inline-block rounded-md border border-emerald-300 bg-white px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                    >
                      Gestionar Productos destacados
                    </a>
                  </div>
                </div>
              ) : null}

              {selectedSection.type === "CATEGORY_STRIP" ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Nota: en modo automático priorizamos categorías con mayor demanda (catálogo activo + señales comerciales como portátiles, impresoras, monitores, tablets, periféricos y consumibles).
                </div>
              ) : null}

              {selectedSection.type === "PRODUCT_CAROUSEL" && parsedDraftConfig ? (
                <>
                  {String(config.mode || "rule") === "curated" && items.length === 0 ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      El modo curado requiere productos vinculados. Si guardas sin items, la sección quedará vacía en Store.
                    </div>
                  ) : null}
                  {String(config.source || "NEW_ARRIVALS") === "CATEGORY" && !String(config.categoryId || config.categoryIds || "").trim() ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      Fuente por categoría sin categoryId/categoryIds: Store aplicará fallback a catálogo general.
                    </div>
                  ) : null}
                  {String(config.source || "NEW_ARRIVALS") === "BRAND" && !String(config.brandId || config.brandIds || "").trim() ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      Fuente por marca sin brandId/brandIds: Store aplicará fallback a catálogo general.
                    </div>
                  ) : null}
                </>
              ) : null}

              {selectedSection.type === "CUSTOM_HTML" ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Este bloque no renderiza HTML libre en Store público por seguridad. Úsalo solo como marcador de migración.
                </div>
              ) : null}

              {curatedEnabled && currentTarget ? (
                <CuratedItemsPanel
                  currentTarget={currentTarget}
                  items={items}
                  itemsLoading={itemsLoading}
                  optionsLoading={optionsLoading}
                  searchQuery={searchQuery}
                  searchOptions={searchOptions}
                  saving={saving}
                  curatedLimit={curatedLimit}
                  curatedRemaining={curatedRemaining}
                  onSearchChange={setSearchQuery}
                  onAdd={(option) => void addCuratedItem(option)}
                  onMove={(item, direction) => void moveCuratedItem(item, direction)}
                  onDelete={(id) => void deleteCuratedItem(id)}
                  onEditImage={(item) => void updateCuratedItemImage(item)}
                  onUploadImage={(item) => void uploadCuratedItemImage(item)}
                  onEditLink={(item) => void updateCuratedItemLink(item)}
                />
              ) : null}

              {(selectedSection.type === "VALUE_PROPS" || selectedSection.type === "TRENDING_CHIPS") && parsedDraftConfig ? (
                <div className="rounded-xl border border-zinc-200 p-3">
                  <div className="mb-3 text-sm font-medium">
                    Controles rápidos: {selectedSection.type === "VALUE_PROPS" ? "Beneficios / confianza" : "Chips de tendencias"}
                  </div>
                  <div className="space-y-2">
                    {chipsItems.map((item, index) => (
                      <div key={`${index}-${item.text || item.title || "chip"}`} className="grid gap-2 rounded-lg border border-zinc-200 p-2 md:grid-cols-2">
                        <label className="text-xs">
                          <span className="mb-1 block text-zinc-500">Texto</span>
                          <input
                            value={String(item.text || item.title || "")}
                            onChange={(event) => {
                              const next = chipsItems.map((current, currentIndex) =>
                                currentIndex === index
                                  ? { ...current, text: event.target.value, title: event.target.value }
                                  : current,
                              );
                              updateDraftConfig({ ...config, items: next });
                            }}
                            className="w-full rounded-md border border-zinc-300 px-2 py-1.5"
                          />
                        </label>
                        <label className="text-xs">
                          <span className="mb-1 block text-zinc-500">Enlace</span>
                          <input
                            value={String(item.href || "")}
                            onChange={(event) => {
                              const next = chipsItems.map((current, currentIndex) =>
                                currentIndex === index ? { ...current, href: event.target.value } : current,
                              );
                              updateDraftConfig({ ...config, items: next });
                            }}
                            className="w-full rounded-md border border-zinc-300 px-2 py-1.5"
                            placeholder="/products"
                          />
                        </label>
                        <label className="text-xs md:col-span-2">
                          <span className="mb-1 block text-zinc-500">Imagen (opcional)</span>
                          <input
                            value={String(item.image_url || "")}
                            onChange={(event) => {
                              const next = chipsItems.map((current, currentIndex) =>
                                currentIndex === index ? { ...current, image_url: event.target.value } : current,
                              );
                              updateDraftConfig({ ...config, items: next });
                            }}
                            className="w-full rounded-md border border-zinc-300 px-2 py-1.5"
                            placeholder="https://..."
                          />
                        </label>

                        {selectedSection.type === "VALUE_PROPS" ? (
                          <label className="text-xs md:col-span-2">
                            <span className="mb-1 block text-zinc-500">Icono (opcional)</span>
                            <input
                              value={String(item.icon || "")}
                              onChange={(event) => {
                                const next = chipsItems.map((current, currentIndex) =>
                                  currentIndex === index ? { ...current, icon: event.target.value } : current,
                                );
                                updateDraftConfig({ ...config, items: next });
                              }}
                              className="w-full rounded-md border border-zinc-300 px-2 py-1.5"
                              placeholder="shield"
                            />
                          </label>
                        ) : null}

                        <div className="md:col-span-2 flex justify-end">
                          <button
                            onClick={() => {
                              const next = chipsItems.filter((_, currentIndex) => currentIndex !== index);
                              updateDraftConfig({ ...config, items: next });
                            }}
                            className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100"
                          >
                            Eliminar ítem
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => {
                        const nextItem: ChipsConfigItem =
                          selectedSection.type === "VALUE_PROPS"
                            ? { text: "", title: "", icon: "", image_url: "", href: "/products" }
                            : { text: "", title: "", image_url: "", href: "/products" };
                        updateDraftConfig({ ...config, items: [...chipsItems, nextItem] });
                      }}
                      className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs hover:bg-zinc-50"
                    >
                      + Añadir ítem
                    </button>
                  </div>
                </div>
              ) : null}

              <label className="block text-sm">
                <span className="mb-1 block text-zinc-500">Config JSON (avanzado)</span>
                <textarea
                  value={draft.configText}
                  onChange={(event) => setDraft({ ...draft, configText: event.target.value })}
                  rows={14}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs"
                />
              </label>

              {!parsedDraftConfig ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  JSON inválido: corrige la configuración antes de guardar.
                </div>
              ) : null}

              <div className="flex items-center gap-2">
                <button
                  onClick={saveInspector}
                  disabled={saving || !parsedDraftConfig || !isDraftDirty}
                  className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-60"
                >
                  Guardar bloque
                </button>
                <button
                  onClick={resetDraft}
                  disabled={saving || !isDraftDirty}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
                >
                  Descartar cambios
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section id="composer-banners-panel" className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Gestión de Banners</h3>
              <p className="text-xs text-zinc-500">Panel integrado dentro del Compositor de Inicio.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadIntegratedModules}
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
              >
                Refrescar
              </button>
              <a
                href={`/${locale}/banners`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
              >
                Abrir completo ↗
              </a>
            </div>
          </div>
          <div className="space-y-2 rounded-xl border border-zinc-200 p-2">
            {integratedLoading ? (
              <div className="p-3 text-xs text-zinc-500">Cargando banners…</div>
            ) : integratedBanners.length === 0 ? (
              <div className="p-3 text-xs text-zinc-500">No hay banners configurados.</div>
            ) : (
              integratedBanners.slice(0, 8).map((banner) => (
                <div key={banner.id} className="flex items-center justify-between rounded-lg border border-zinc-200 px-2 py-1.5">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium text-zinc-900">{banner.title_text || "Sin título"}</div>
                    <div className="text-[11px] text-zinc-500">Orden #{banner.sort_order}</div>
                  </div>
                  <button
                    onClick={() => toggleIntegratedBanner(banner.id)}
                    className={`rounded px-2 py-1 text-[11px] ${banner.is_active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-700"}`}
                  >
                    {banner.is_active ? "Activo" : "Inactivo"}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section id="composer-featured-panel" className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Gestión de Productos destacados</h3>
              <p className="text-xs text-zinc-500">Panel integrado dentro del Compositor de Inicio.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadIntegratedModules}
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
              >
                Refrescar
              </button>
              <a
                href={`/${locale}/featured-products`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
              >
                Abrir completo ↗
              </a>
            </div>
          </div>
          <div className="space-y-2 rounded-xl border border-zinc-200 p-2">
            {integratedLoading ? (
              <div className="p-3 text-xs text-zinc-500">Cargando destacados…</div>
            ) : integratedFeatured.length === 0 ? (
              <div className="p-3 text-xs text-zinc-500">No hay productos destacados configurados.</div>
            ) : (
              integratedFeatured.slice(0, 8).map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-zinc-200 px-2 py-1.5">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium text-zinc-900">{item.title || item.product?.title || "Sin título"}</div>
                    <div className="text-[11px] text-zinc-500">Orden #{item.sort_order}</div>
                  </div>
                  <button
                    onClick={() => toggleIntegratedFeatured(item.id)}
                    className={`rounded px-2 py-1 text-[11px] ${item.is_active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-700"}`}
                  >
                    {item.is_active ? "Activo" : "Inactivo"}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
