"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  CategoryMenuTreeNode,
  HomepageOption,
  HomepageSection,
  HomepageSectionsDiagnostics,
  homepageSectionsApi,
} from "@/lib/api/homepage-sections";
import { API_URL } from "@/lib/constants";
import {
  Banner,
  getBanners,
  reorderBanners,
  toggleBannerStatus,
} from "@/lib/api/banners";
import {
  FeaturedProduct,
  fetchFeaturedProducts,
  toggleFeaturedProductStatus,
  updateFeaturedProductOrder,
} from "@/lib/api/featured-products";
import {
  AlertTriangle,
  CheckCircle2,
  CircleOff,
  Copy,
  Eye,
  Layers3,
  RotateCw,
  ServerCrash,
  Images,
  Star,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FoldVertical,
  UnfoldVertical,
} from "lucide-react";

const MANUAL_TYPES = ["FEATURED_PICKS", "TOP_CATEGORIES_GRID", "BRANDS_STRIP"];
const PRODUCT_QUERY_TYPES = ["BEST_DEALS", "NEW_ARRIVALS", "FEATURED_PICKS"];
const SECTION_TYPES = [
  "HERO_BANNER_SLIDER",
  "TOP_CATEGORIES_GRID",
  "BEST_DEALS",
  "NEW_ARRIVALS",
  "FEATURED_PICKS",
  "BRANDS_STRIP",
  "TRUST_BAR",
] as const;

const SORT_OPTIONS = [
  { value: "newest", label: "Más recientes" },
  { value: "price_asc", label: "Precio: menor a mayor" },
  { value: "price_desc", label: "Precio: mayor a menor" },
  { value: "discount_desc", label: "Mayor descuento" },
];

const DEFAULT_CONFIG_BY_TYPE: Record<string, Record<string, unknown>> = {
  HERO_BANNER_SLIDER: { items_per_carousel: 1 },
  TOP_CATEGORIES_GRID: { source: "query", query: { type: "categories", limit: 10 } },
  BEST_DEALS: { source: "query", query: { type: "products", sortBy: "discount_desc", inStockOnly: true, limit: 12 }, carousel_enabled: true, carousel_autoplay: true, carousel_interval_ms: 4500, carousel_items_desktop: 4, carousel_items_mobile: 2 },
  NEW_ARRIVALS: { source: "query", query: { type: "products", sortBy: "newest", inStockOnly: true, limit: 12 }, carousel_enabled: true, carousel_autoplay: true, carousel_interval_ms: 4500, carousel_items_desktop: 4, carousel_items_mobile: 2 },
  FEATURED_PICKS: { source: "query", query: { type: "products", inStockOnly: true, limit: 12 }, carousel_enabled: true, carousel_autoplay: true, carousel_interval_ms: 4500, carousel_items_desktop: 4, carousel_items_mobile: 2 },
  BRANDS_STRIP: { source: "query", query: { type: "brands", limit: 12 } },
  TRUST_BAR: {
    items: [
      { icon: "truck", text: "Envío rápido" },
      { icon: "shield", text: "Pago seguro" },
      { icon: "refresh-ccw", text: "Devoluciones fáciles" },
    ],
  },
};

type PresetKey = "tv" | "gaming" | "laptops" | "networking" | "cctv";

type SectionType = (typeof SECTION_TYPES)[number];

const PRESET_BUTTONS: Array<{ key: PresetKey; label: string; title: string; sortBy: "discount_desc" | "newest"; matcher: string[] }> = [
  { key: "tv", label: "Añadir sección TV", title: "TV", sortBy: "discount_desc", matcher: ["tv, audio y vídeo", "tv", "audio", "video", "television"] },
  { key: "gaming", label: "Añadir sección Gaming", title: "Gaming", sortBy: "discount_desc", matcher: ["gaming", "consola", "juego", "game"] },
  { key: "laptops", label: "Añadir sección Laptops", title: "Laptops", sortBy: "newest", matcher: ["portátil", "portatiles", "laptop", "notebook"] },
  { key: "networking", label: "Añadir sección Networking", title: "Networking", sortBy: "newest", matcher: ["network", "redes", "router", "switch", "wifi"] },
  { key: "cctv", label: "Añadir sección CCTV", title: "CCTV", sortBy: "discount_desc", matcher: ["cctv", "videovigilancia", "vigilancia", "seguridad", "camara", "cámara"] },
];

function normalizeText(value?: string) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function supportsSource(type: string) {
  return MANUAL_TYPES.includes(type);
}

function defaultConfigFor(type: string): Record<string, unknown> {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG_BY_TYPE[type] || {})) as Record<string, unknown>;
}

function findPresetCategoryId(presetMatchers: string[], tree: CategoryMenuTreeNode[]): string | undefined {
  if (!tree.length) return undefined;

  const normalizedMatchers = presetMatchers.map(normalizeText);

  const byExactParent = tree.find((parent) =>
    normalizedMatchers.some((matcher) => normalizeText(parent.name) === matcher),
  );
  if (byExactParent) return byExactParent.id;

  const byParentContains = tree.find((parent) => {
    const parentName = normalizeText(parent.name);
    return normalizedMatchers.some((matcher) => parentName.includes(matcher) || matcher.includes(parentName));
  });
  if (byParentContains) return byParentContains.id;

  for (const parent of tree) {
    const child = parent.children.find((node) => {
      const name = normalizeText(node.name);
      return normalizedMatchers.some((matcher) => name.includes(matcher) || matcher.includes(name));
    });
    if (child) return child.id;
  }

  return undefined;
}

export default function HomepageSectionsPage() {
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [search, setSearch] = useState<Record<string, string>>({});
  const [options, setOptions] = useState<Record<string, HomepageOption[]>>({});
  const [queryCatalogs, setQueryCatalogs] = useState<{ categories: HomepageOption[]; brands: HomepageOption[] }>({ categories: [], brands: [] });
  const [menuTree, setMenuTree] = useState<CategoryMenuTreeNode[]>([]);
  const [newType, setNewType] = useState<SectionType>("TOP_CATEGORIES_GRID");
  const [isLoading, setIsLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [diagnostics, setDiagnostics] = useState<HomepageSectionsDiagnostics | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [originalSections, setOriginalSections] = useState<HomepageSection[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled" | "dirty">("all");

  const sorted = useMemo(() => [...sections].sort((a, b) => a.position - b.position), [sections]);

  const sectionSignature = useCallback((section: HomepageSection) => {
    return JSON.stringify({
      enabled: section.enabled,
      title: section.title || "",
      config_json: section.config_json || {},
      position: section.position,
      type: section.type,
    });
  }, []);

  const duplicateTypeSummary = useMemo(() => {
    const countByType = new Map<string, number>();
    for (const section of sections) {
      countByType.set(section.type, (countByType.get(section.type) || 0) + 1);
    }
    return Array.from(countByType.entries()).filter(([, count]) => count > 1);
  }, [sections]);

  const sectionTypeStats = useMemo(() => {
    const countByType = new Map<string, number>();
    for (const type of SECTION_TYPES) countByType.set(type, 0);
    for (const section of sections) {
      countByType.set(section.type, (countByType.get(section.type) || 0) + 1);
    }

    return SECTION_TYPES.map((type) => ({
      type,
      count: countByType.get(type) || 0,
    }));
  }, [sections]);
  const isDirtySection = useCallback((section: HomepageSection) => {
    const original = originalSections.find((item) => item.id === section.id);
    if (!original) return true;
    return sectionSignature(section) !== sectionSignature(original);
  }, [originalSections, sectionSignature]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return sorted.filter((section) => {
      const textOk = !q || (section.title || "").toLowerCase().includes(q) || section.type.toLowerCase().includes(q);
      if (!textOk) return false;
      if (statusFilter === "enabled") return section.enabled;
      if (statusFilter === "disabled") return !section.enabled;
      if (statusFilter === "dirty") return isDirtySection(section);
      return true;
    });
  }, [sorted, filter, statusFilter, isDirtySection]);

  const dirtySectionIds = useMemo(() => {
    return new Set(sections.filter((section) => isDirtySection(section)).map((section) => section.id));
  }, [isDirtySection, sections]);

  const optionLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of queryCatalogs.categories) map.set(item.id, item.label);
    for (const item of queryCatalogs.brands) map.set(item.id, item.label);
    for (const sectionOptions of Object.values(options)) {
      for (const opt of sectionOptions) map.set(opt.id, opt.label);
    }
    return map;
  }, [options, queryCatalogs.brands, queryCatalogs.categories]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setDiagnosticsLoading(true);
    try {
      const [sectionsData, diagnosticsData, bannersData, featuredResponse] = await Promise.all([
        homepageSectionsApi.list(),
        homepageSectionsApi.diagnostics(),
        getBanners(),
        fetchFeaturedProducts({ take: 20 }),
      ]);
      setSections(sectionsData);
      setOriginalSections(sectionsData);
      setDiagnostics(diagnosticsData);
      setBanners(bannersData);
      setFeaturedProducts(featuredResponse.data || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar las secciones");
    } finally {
      setIsLoading(false);
      setDiagnosticsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    (async () => {
      try {
        const [categories, brands, menuTreeResponse] = await Promise.all([
          homepageSectionsApi.options("TOP_CATEGORIES_GRID", "", 100, "categories"),
          homepageSectionsApi.options("BRANDS_STRIP", "", 100, "brands"),
          homepageSectionsApi.menuTree(),
        ]);
        setQueryCatalogs({ categories, brands });
        setMenuTree(menuTreeResponse.tree || []);
      } catch {
        // optional preload
      }
    })();
  }, [load]);

  const updateLocal = (id: string, patch: Partial<HomepageSection>) => {
    setSections((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const updateConfig = (section: HomepageSection, patch: Record<string, unknown>) => {
    updateLocal(section.id, { config_json: { ...section.config_json, ...patch } });
  };

  const updateQueryConfig = (section: HomepageSection, patch: Record<string, unknown>) => {
    const query = (section.config_json.query || {}) as Record<string, unknown>;
    updateLocal(section.id, {
      config_json: {
        ...section.config_json,
        source: "query",
        query: { ...query, ...patch },
      },
    });
  };

  const save = async (section: HomepageSection) => {
    setSavingId(section.id);
    try {
      await homepageSectionsApi.update(section.id, {
        enabled: section.enabled,
        title: section.title,
        config_json: section.config_json,
      });
      toast.success(`Sección ${section.type} guardada`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la sección");
    } finally {
      setSavingId(null);
    }
  };

  const create = async () => {
    try {
      await homepageSectionsApi.create({
        type: newType,
        position: sorted.length + 1,
        enabled: true,
        title: newType.replaceAll("_", " "),
        config_json: defaultConfigFor(newType),
      });
      toast.success("Sección creada");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear la sección");
    }
  };

  const createOfType = async (type: SectionType) => {
    try {
      await homepageSectionsApi.create({
        type,
        position: sorted.length + 1,
        enabled: true,
        title: type.replaceAll("_", " "),
        config_json: defaultConfigFor(type),
      });
      toast.success(`Sección ${type} creada`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `No se pudo crear ${type}`);
    }
  };

  const createMissingBaseSections = async () => {
    const missing = sectionTypeStats.filter((item) => item.count === 0).map((item) => item.type);
    if (!missing.length) {
      toast.message("No faltan tipos base de sección");
      return;
    }

    try {
      const startPosition = sorted.length;
      for (const [index, type] of missing.entries()) {
        await homepageSectionsApi.create({
          type,
          position: startPosition + index + 1,
          enabled: true,
          title: type.replaceAll("_", " "),
          config_json: defaultConfigFor(type),
        });
      }
      toast.success(`Se añadieron ${missing.length} tipo(s) faltantes`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron crear los faltantes");
    }
  };

  const duplicate = async (section: HomepageSection) => {
    try {
      await homepageSectionsApi.create({
        type: section.type,
        position: sorted.length + 1,
        enabled: section.enabled,
        title: `${section.title || section.type} (copia)`,
        config_json: JSON.parse(JSON.stringify(section.config_json)) as Record<string, unknown>,
      });
      toast.success("Sección duplicada");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo duplicar la sección");
    }
  };

  const createPresetSection = async (presetKey: PresetKey) => {
    const preset = PRESET_BUTTONS.find((item) => item.key === presetKey);
    if (!preset) return;

    try {
      const categoryId = findPresetCategoryId(preset.matcher, menuTree);
      await homepageSectionsApi.create({
        type: "FEATURED_PICKS",
        position: sorted.length + 1,
        enabled: true,
        title: preset.title,
        config_json: {
          source: "query",
          query: {
            type: "products",
            limit: 12,
            inStockOnly: true,
            sortBy: preset.sortBy,
            ...(categoryId ? { categoryId } : {}),
          },
        },
      });
      toast.success(`Sección preset ${preset.title} añadida`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `No se pudo crear el preset ${preset.title}`);
    }
  };

  const remove = async (section: HomepageSection) => {
    if (!confirm(`¿Eliminar ${section.type}?`)) return;
    try {
      await homepageSectionsApi.remove(section.id);
      toast.success("Sección eliminada");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la sección");
    }
  };

  const move = async (index: number, delta: number) => {
    const next = index + delta;
    if (next < 0 || next >= sorted.length) return;

    const arr = [...sorted];
    const [item] = arr.splice(index, 1);
    arr.splice(next, 0, item);
    const payload = arr.map((x, i) => ({ id: x.id, position: i + 1 }));

    setSections((prev) => prev.map((x) => ({ ...x, position: payload.find((p) => p.id === x.id)?.position || x.position })));

    try {
      await homepageSectionsApi.reorder(payload);
      toast.success("Orden actualizado");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo reordenar");
    }
  };


  const setAllVisibility = (enabled: boolean) => {
    setSections((prev) => prev.map((section) => ({ ...section, enabled })));
  };

  const setAllCollapsed = (collapsed: boolean) => {
    setCollapsedSections(Object.fromEntries(sorted.map((section) => [section.id, collapsed])));
  };

  const toggleCollapsed = (id: string) => {
    setCollapsedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const applyCarouselPreset = (section: HomepageSection, preset: "compact" | "balanced" | "showcase") => {
    const presets: Record<string, Record<string, unknown>> = {
      compact: { carousel_enabled: true, carousel_autoplay: true, carousel_interval_ms: 3500, carousel_items_desktop: 5, carousel_items_mobile: 2 },
      balanced: { carousel_enabled: true, carousel_autoplay: true, carousel_interval_ms: 4500, carousel_items_desktop: 4, carousel_items_mobile: 2 },
      showcase: { carousel_enabled: true, carousel_autoplay: false, carousel_interval_ms: 5500, carousel_items_desktop: 3, carousel_items_mobile: 1 },
    };
    updateConfig(section, presets[preset]);
    toast.success(`Preset de carrusel aplicado: ${preset}`);
  };

  const autoFixSectionConfigs = () => {
    const productTypes = new Set(["BEST_DEALS", "NEW_ARRIVALS", "FEATURED_PICKS"]);
    setSections((prev) =>
      prev.map((section) => {
        const config = { ...(section.config_json || {}) } as Record<string, unknown>;
        const query = ((config.query || {}) as Record<string, unknown>);

        if (config.source !== "manual" && !query.type) {
          if (section.type === "TOP_CATEGORIES_GRID") query.type = "categories";
          else if (section.type === "BRANDS_STRIP") query.type = "brands";
          else query.type = "products";
          config.query = query;
          config.source = "query";
        }

        if (productTypes.has(section.type)) {
          config.carousel_enabled = Boolean(config.carousel_enabled ?? true);
          config.carousel_autoplay = Boolean(config.carousel_autoplay ?? true);
          config.carousel_interval_ms = Math.min(15000, Math.max(2000, Number(config.carousel_interval_ms || 4500)));
          config.carousel_items_desktop = Math.min(6, Math.max(2, Number(config.carousel_items_desktop || 4)));
          config.carousel_items_mobile = Math.min(3, Math.max(1, Number(config.carousel_items_mobile || 2)));
        }

        return { ...section, config_json: config };
      }),
    );
    toast.success("Configuración normalizada localmente. Revisa y guarda cambios pendientes.");
  };

  const saveAll = async () => {
    if (!sections.length) return;

    const pending = sections.filter((section) => dirtySectionIds.has(section.id));
    if (!pending.length) {
      toast.message("No hay cambios pendientes por guardar");
      return;
    }

    try {
      await Promise.all(
        pending.map((section) =>
          homepageSectionsApi.update(section.id, {
            enabled: section.enabled,
            title: section.title,
            config_json: section.config_json,
          }),
        ),
      );
      toast.success(`${pending.length} sección(es) guardadas`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar todo');
    }
  };

  const discardLocalChanges = () => {
    setSections(originalSections);
    toast.message("Cambios locales descartados");
  };

  const loadOptions = async (section: HomepageSection, q: string, target: "products" | "categories" | "brands") => {
    if (!supportsSource(section.type)) return;
    try {
      const data = await homepageSectionsApi.options(section.type, q, 10, target);
      setOptions((prev) => ({ ...prev, [section.id]: data }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Búsqueda fallida");
    }
  };

  const syncFeaturedProductsToHomepage = async () => {
    const activeFeatured = featuredProducts.filter((item) => item.is_active);
    const productIds = Array.from(new Set(activeFeatured.map((item) => item.product_id).filter(Boolean)));

    if (!productIds.length) {
      toast.message("No hay productos destacados activos para sincronizar");
      return;
    }

    try {
      const featuredSection = sections.find((section) => section.type === "FEATURED_PICKS");

      if (featuredSection) {
        await homepageSectionsApi.update(featuredSection.id, {
          enabled: true,
          title: featuredSection.title || "Productos Destacados",
          config_json: {
            ...featuredSection.config_json,
            source: "manual",
            ids: productIds,
          },
        });
      } else {
        await homepageSectionsApi.create({
          type: "FEATURED_PICKS",
          position: sorted.length + 1,
          enabled: true,
          title: "Productos Destacados",
          config_json: {
            source: "manual",
            ids: productIds,
          },
        });
      }

      toast.success("Destacados sincronizados con la sección FEATURED_PICKS de portada");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo sincronizar destacados con portada");
    }
  };

  const moveBanner = async (index: number, delta: number) => {
    const next = index + delta;
    if (next < 0 || next >= banners.length) return;

    const arr = [...banners];
    const [item] = arr.splice(index, 1);
    arr.splice(next, 0, item);
    setBanners(arr);

    try {
      await reorderBanners(arr.map((banner) => banner.id));
      toast.success("Orden de banners actualizado");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo reordenar banners");
    }
  };

  const toggleBanner = async (id: string) => {
    try {
      await toggleBannerStatus(id);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar banner");
    }
  };

  const moveFeatured = async (index: number, delta: number) => {
    const next = index + delta;
    if (next < 0 || next >= featuredProducts.length) return;

    const arr = [...featuredProducts];
    const [item] = arr.splice(index, 1);
    arr.splice(next, 0, item);
    setFeaturedProducts(arr);

    try {
      await updateFeaturedProductOrder(arr.map((x, i) => ({ id: x.id, sort_order: i + 1 })));
      toast.success("Orden de destacados actualizado");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo reordenar destacados");
    }
  };

  const toggleFeatured = async (id: string) => {
    try {
      await toggleFeaturedProductStatus(id);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar destacado");
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-5 text-white shadow-sm">
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 right-20 h-24 w-24 rounded-full bg-white/5" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Página Principal</h1>
            <p className="text-sm text-slate-200">Configura, valida y publica secciones para la Store desde un único panel fullstack.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            Modo Pro Admin
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">Secciones</div>
          <div className="mt-2 flex items-end justify-between">
            <div className="text-2xl font-semibold">{diagnostics?.totals.total ?? sections.length}</div>
            <Layers3 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-1 text-xs text-slate-500">Total configuradas en admin</div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">Visibilidad</div>
          <div className="mt-2 flex items-end justify-between">
            <div className="text-2xl font-semibold">{diagnostics?.totals.enabled ?? sections.filter((x) => x.enabled).length}</div>
            <Eye className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {diagnostics?.totals.disabled ?? sections.filter((x) => !x.enabled).length} ocultas
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">Duplicadas</div>
          <div className="mt-2 flex items-end justify-between">
            <div className="text-2xl font-semibold">{diagnostics?.totals.duplicatedTypes ?? duplicateTypeSummary.length}</div>
            <Copy className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-1 text-xs text-slate-500">Tipos que aparecen más de una vez</div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">Store payload</div>
          <div className="mt-2 flex items-end justify-between">
            <div className="text-2xl font-semibold">{diagnostics?.totals.failedPublicSections ?? 0}</div>
            {diagnostics?.checks.storePayloadOk ?? true ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <ServerCrash className="h-4 w-4 text-red-500" />
            )}
          </div>
          <div className="mt-1 text-xs text-slate-500">Secciones públicas con error al resolver</div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">Config inválida</div>
          <div className="mt-2 flex items-end justify-between">
            <div className="text-2xl font-semibold">{diagnostics?.totals.invalidConfigSections ?? 0}</div>
            {diagnostics?.checks.configsValid ?? true ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
          </div>
          <div className="mt-1 text-xs text-slate-500">Secciones con ajustes recomendados</div>
        </div>
      </div>

      {!diagnosticsLoading && diagnostics && !diagnostics.checks.hasVisibleSections ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-2">
          <CircleOff className="h-4 w-4 mt-0.5" />
          No hay secciones visibles. La Store no mostrará contenido de Página Principal hasta activar alguna sección.
        </div>
      ) : null}

      {!diagnosticsLoading && diagnostics && diagnostics.totals.failedPublicSections > 0 ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5" />
          Hay {diagnostics.totals.failedPublicSections} secciones con fallo en el endpoint público. Revisa su configuración y vuelve a guardar.
        </div>
      ) : null}

      {!diagnosticsLoading && diagnostics && !diagnostics.checks.configsValid ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5" />
          <div className="space-y-2">
            <div>Hay {diagnostics.totals.invalidConfigSections} sección(es) con configuración mejorable o inconsistente.</div>
            <button className="inline-flex px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs" onClick={autoFixSectionConfigs}>
              Autocorregir configuración en local
            </button>
          </div>
        </div>
      ) : null}

      {!diagnosticsLoading && diagnostics && !diagnostics.checks.bannersLinkedToHome ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5" />
          <div>
            Hay {diagnostics.totals.activeBanners} banner(s) activos pero no hay una sección HERO_BANNER_SLIDER visible en Página Principal. Crea/activa la sección HERO para que se muestren en la Store.
            <div className="mt-2">
              <Link className="inline-flex px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs" href="/banners">
                Ir a Banners
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {!diagnosticsLoading && diagnostics && !diagnostics.checks.featuredLinkedToHome ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5" />
          <div>
            Hay {diagnostics.totals.activeFeaturedProducts} destacado(s) activos pero no están enlazados manualmente a FEATURED_PICKS en portada.
            <div className="mt-2">
              <button className="inline-flex px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs" onClick={() => void syncFeaturedProductsToHomepage()}>
                Sincronizar destacados con portada
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-2">
        <div className="text-sm font-medium text-slate-800">Estado end-to-end (Admin → Store)</div>
        <p className="text-xs text-slate-600">
          Esta pantalla alimenta <code>/homepage/sections</code> y se muestra por defecto en la Store. Usa <code>useLayout=1</code> si quieres ver el layout moderno de <code>/home</code>. Banners activos: <strong>{diagnostics?.totals.activeBanners ?? 0}</strong> · HERO visibles: <strong>{diagnostics?.totals.heroEnabledSections ?? 0}</strong> · Destacados activos: <strong>{diagnostics?.totals.activeFeaturedProducts ?? 0}</strong> · Secciones FEATURED_PICKS: <strong>{diagnostics?.totals.featuredPicksSections ?? 0}</strong>.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            className="px-3 py-2 rounded-lg border text-sm"
            href={`/store`}
            target="_blank"
            rel="noreferrer"
          >
            Abrir Store
          </a>
          <a
            className="px-3 py-2 rounded-lg border text-sm"
            href={`${API_URL}/homepage/sections`}
            target="_blank"
            rel="noreferrer"
          >
            Ver JSON público de secciones
          </a>
          <button
            className="px-3 py-2 rounded-lg border text-sm inline-flex items-center gap-2"
            onClick={() => void load()}
            disabled={diagnosticsLoading || isLoading}
          >
            <RotateCw className={`h-4 w-4 ${(diagnosticsLoading || isLoading) ? "animate-spin" : ""}`} />
            Recargar diagnóstico
          </button>
        </div>
        {duplicateTypeSummary.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Tipos duplicados detectados: {duplicateTypeSummary.map(([type, count]) => `${type} (${count})`).join(", ")}. Esto puede ser válido, pero revisa que no sea contenido repetido.
          </div>
        ) : null}

        {diagnostics && diagnostics.invalidConfigSections.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 space-y-1">
            <div className="font-semibold">Secciones con configuración a revisar</div>
            <ul className="list-disc pl-4 space-y-1">
              {diagnostics.invalidConfigSections.slice(0, 6).map((item) => (
                <li key={item.id}>
                  <span className="font-medium">{item.title || item.type}</span>: {item.issues.join(" · ")}
                </li>
              ))}
            </ul>
            {diagnostics.invalidConfigSections.length > 6 ? (
              <div>Y {diagnostics.invalidConfigSections.length - 6} más…</div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border bg-white p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm text-slate-700">
            Cambios pendientes: <span className="font-semibold">{dirtySectionIds.size}</span>
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-2 rounded-lg border text-sm disabled:opacity-50"
              disabled={!dirtySectionIds.size}
              onClick={discardLocalChanges}
            >
              Descartar cambios locales
            </button>
            <button
              className="px-3 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-50"
              disabled={!dirtySectionIds.size}
              onClick={() => void saveAll()}
            >
              Guardar cambios pendientes
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-2 rounded-lg border text-sm" onClick={() => setAllVisibility(true)}>Marcar todas visibles</button>
          <button className="px-3 py-2 rounded-lg border text-sm" onClick={() => setAllVisibility(false)}>Ocultar todas</button>
          <button className="px-3 py-2 rounded-lg border text-sm" onClick={autoFixSectionConfigs}>Autocorregir configs</button>
          <button className="px-3 py-2 rounded-lg border text-sm inline-flex items-center gap-1" onClick={() => setAllCollapsed(true)}><FoldVertical className="h-3.5 w-3.5" /> Colapsar todo</button>
          <button className="px-3 py-2 rounded-lg border text-sm inline-flex items-center gap-1" onClick={() => setAllCollapsed(false)}><UnfoldVertical className="h-3.5 w-3.5" /> Expandir todo</button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Filtro rápido:</span>
          {[
            { key: "all", label: "Todas" },
            { key: "enabled", label: "Visibles" },
            { key: "disabled", label: "Ocultas" },
            { key: "dirty", label: "Con cambios" },
          ].map((option) => (
            <button
              key={option.key}
              className={`rounded-full border px-3 py-1 text-xs ${statusFilter === option.key ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700"}`}
              onClick={() => setStatusFilter(option.key as "all" | "enabled" | "disabled" | "dirty")}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <select className="border rounded-lg px-3 py-2" value={newType} onChange={(e) => setNewType(e.target.value as SectionType)}>
            {SECTION_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <input className="border rounded-lg px-3 py-2" placeholder="Filtrar secciones por título/tipo" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <button onClick={() => void create()} className="px-3 py-2 rounded-lg bg-black text-white text-sm">Añadir sección</button>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm font-medium text-slate-700">Cobertura de tipos de sección</div>
          <button
            className="px-3 py-2 rounded-lg border text-xs"
            onClick={() => void createMissingBaseSections()}
          >
            Añadir tipos faltantes
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {sectionTypeStats.map((item) => (
            <button
              key={item.type}
              className={`rounded-full border px-3 py-1.5 text-xs ${item.count === 0 ? "border-red-300 bg-red-50 text-red-700" : item.count > 1 ? "border-amber-300 bg-amber-50 text-amber-800" : "border-emerald-300 bg-emerald-50 text-emerald-700"}`}
              onClick={() => item.count === 0 ? void createOfType(item.type) : setFilter(item.type)}
              title={item.count === 0 ? "Crear este tipo" : "Filtrar por este tipo"}
            >
              {item.type} · {item.count}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <Images className="h-4 w-4" />
              Banners (integrado)
            </div>
            <Link className="text-xs underline" href="/banners/new">Nuevo banner</Link>
          </div>
          <div className="text-xs text-slate-500">Gestiona aquí el orden y visibilidad para la portada.</div>
          <div className="space-y-2 max-h-64 overflow-auto">
            {banners.map((banner, index) => (
              <div key={banner.id} className="rounded-lg border p-2 flex items-center justify-between gap-2">
                <div className="min-w-0 flex items-center gap-2">
                  <img src={banner.image || "/No_Image_Available.png"} alt={banner.title_text || `Banner ${index + 1}`} className="h-10 w-16 rounded object-cover border" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/No_Image_Available.png"; }} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{banner.title_text || `Banner ${index + 1}`}</div>
                    <div className="text-xs text-slate-500">#{index + 1} · {banner.is_active ? "Visible" : "Oculto"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Link className="px-2 py-1 border rounded text-xs" href={`/banners/${banner.id}/edit`}>Editar</Link>
                  <button className="p-1 border rounded" onClick={() => void moveBanner(index, -1)}><ArrowUp className="h-3 w-3" /></button>
                  <button className="p-1 border rounded" onClick={() => void moveBanner(index, 1)}><ArrowDown className="h-3 w-3" /></button>
                  <button className="px-2 py-1 border rounded text-xs" onClick={() => void toggleBanner(banner.id)}>{banner.is_active ? "Activo" : "Inactivo"}</button>
                </div>
              </div>
            ))}
            {!banners.length ? <div className="text-xs text-slate-500">No hay banners</div> : null}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <Star className="h-4 w-4" />
              Productos destacados (integrado)
            </div>
            <div className="flex items-center gap-3">
              <button className="text-xs underline" onClick={() => void syncFeaturedProductsToHomepage()}>
                Sincronizar con portada
              </button>
              <Link className="text-xs underline" href="/featured-products/new">Nuevo destacado</Link>
            </div>
          </div>
          <div className="text-xs text-slate-500">Controla orden/estado y sincroniza los activos en FEATURED_PICKS para que salgan en la Store.</div>
          <div className="space-y-2 max-h-64 overflow-auto">
            {featuredProducts.map((item, index) => (
              <div key={item.id} className="rounded-lg border p-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{item.title || item.product?.title || `Destacado ${index + 1}`}</div>
                  <div className="text-xs text-slate-500">#{index + 1}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-1 border rounded" onClick={() => void moveFeatured(index, -1)}><ArrowUp className="h-3 w-3" /></button>
                  <button className="p-1 border rounded" onClick={() => void moveFeatured(index, 1)}><ArrowDown className="h-3 w-3" /></button>
                  <button className="px-2 py-1 border rounded text-xs" onClick={() => void toggleFeatured(item.id)}>{item.is_active ? "Activo" : "Inactivo"}</button>
                </div>
              </div>
            ))}
            {!featuredProducts.length ? <div className="text-xs text-slate-500">No hay productos destacados</div> : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="text-sm font-medium text-slate-700 mb-3">Presets rápidos</div>
        <div className="flex flex-wrap gap-2">
          {PRESET_BUTTONS.map((preset) => (
            <button key={preset.key} onClick={() => void createPresetSection(preset.key)} className="px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-sm hover:bg-slate-100">
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <div className="rounded-lg border bg-white p-4 text-sm text-slate-500">Cargando secciones...</div> : null}

      {filtered.map((section) => {
        const source = String(section.config_json.source || "query");
        const query = (section.config_json.query || {}) as Record<string, unknown>;
        const currentIndex = sorted.findIndex((x) => x.id === section.id);
        const selectedIds = Array.isArray(section.config_json.ids) ? (section.config_json.ids as string[]) : [];
        const isCollapsed = Boolean(collapsedSections[section.id]);

        return (
          <div key={section.id} className="rounded-2xl border bg-white p-4 space-y-3 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{section.title || section.type}</div>
                <div className="text-xs text-slate-500">{section.type} · Posición #{section.position}</div>
                {dirtySectionIds.has(section.id) ? (
                  <div className="mt-1 inline-flex rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                    Sin guardar
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-end">
                <a
                  className="px-2 py-1 border rounded text-xs"
                  href={`/store?highlightSection=${encodeURIComponent(section.id)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver en Store
                </a>
                <button className="px-2 py-1 border rounded" onClick={() => void move(currentIndex, -1)}>↑</button>
                <button className="px-2 py-1 border rounded" onClick={() => void move(currentIndex, 1)}>↓</button>
                <button className="px-2 py-1 border rounded" onClick={() => void duplicate(section)}>Duplicar</button>
                <button className="px-2 py-1 border rounded inline-flex items-center gap-1 text-xs" onClick={() => toggleCollapsed(section.id)}>
                  {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                  {isCollapsed ? "Expandir" : "Colapsar"}
                </button>
                <label className="text-sm flex items-center gap-1">
                  <input type="checkbox" checked={section.enabled} onChange={(e) => updateLocal(section.id, { enabled: e.target.checked })} />
                  Visible
                </label>
                <button className="px-2 py-1 border rounded text-red-600" onClick={() => void remove(section)}>Eliminar</button>
              </div>
            </div>

            {!isCollapsed ? (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className="border rounded-lg px-3 py-2" value={section.title || ""} onChange={(e) => updateLocal(section.id, { title: e.target.value })} placeholder="Título de sección" />
                  <button className="border rounded-lg px-3 py-2 text-sm" onClick={() => updateLocal(section.id, { config_json: defaultConfigFor(section.type) })}>Reset config por defecto</button>
                </div>

            {supportsSource(section.type) && (
              <div className="space-y-2">
                <select
                  className="border rounded-lg px-3 py-2"
                  value={source}
                  onChange={(e) =>
                    updateConfig(section, {
                      source: e.target.value,
                      ids: e.target.value === "manual" ? selectedIds : [],
                      query: e.target.value === "query" ? (section.config_json.query || defaultConfigFor(section.type).query) : undefined,
                    })
                  }
                >
                  <option value="query">Por consulta</option>
                  <option value="manual">Manual</option>
                </select>

                {source === "manual" && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input className="border rounded-lg px-3 py-2 flex-1" value={search[section.id] || ""} onChange={(e) => setSearch((prev) => ({ ...prev, [section.id]: e.target.value }))} placeholder="Buscar item" />
                      <button
                        className="px-3 py-2 border rounded-lg"
                        onClick={() =>
                          void loadOptions(
                            section,
                            search[section.id] || "",
                            section.type === "TOP_CATEGORIES_GRID" ? "categories" : section.type === "BRANDS_STRIP" ? "brands" : "products",
                          )
                        }
                      >
                        Buscar
                      </button>
                    </div>

                    <div className="max-h-36 overflow-auto border rounded-lg">
                      {(options[section.id] || []).map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => updateConfig(section, { ids: Array.from(new Set([...selectedIds, opt.id])) })}
                          className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                        >
                          {opt.label}
                          <span className="text-xs text-slate-400 ml-2">{opt.subtitle}</span>
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                      {selectedIds.map((id) => (
                        <button
                          key={id}
                          className="rounded-full border px-2 py-1 text-xs"
                          onClick={() => updateConfig(section, { ids: selectedIds.filter((value) => value !== id) })}
                          title={id}
                        >
                          {optionLabelById.get(id) || id} ✕
                        </button>
                      ))}
                      {selectedIds.length ? (
                        <button className="rounded-full border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700" onClick={() => updateConfig(section, { ids: [] })}>
                          Limpiar selección
                        </button>
                      ) : null}
                      {!selectedIds.length ? <div className="text-xs text-slate-500">Sin IDs seleccionados</div> : null}
                    </div>
                  </div>
                )}

                {source === "query" && (
                  <div className="grid md:grid-cols-2 gap-3">
                    <input type="number" min={1} max={24} className="border rounded-lg px-3 py-2" value={Number(query.limit || 12)} onChange={(e) => updateQueryConfig(section, { limit: Number(e.target.value) || 12 })} placeholder="Límite" />

                    {PRODUCT_QUERY_TYPES.includes(section.type) ? (
                      <>
                        <select className="border rounded-lg px-3 py-2" value={String(query.categoryId || "")} onChange={(e) => updateQueryConfig(section, { type: "products", categoryId: e.target.value || undefined })}>
                          <option value="">Todas las categorías</option>
                          {queryCatalogs.categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.label}</option>
                          ))}
                        </select>

                        <select className="border rounded-lg px-3 py-2" value={String(query.brandId || "")} onChange={(e) => updateQueryConfig(section, { type: "products", brandId: e.target.value || undefined })}>
                          <option value="">Todas las marcas</option>
                          {queryCatalogs.brands.map((brand) => (
                            <option key={brand.id} value={brand.id}>{brand.label}</option>
                          ))}
                        </select>

                        <select className="border rounded-lg px-3 py-2" value={String(query.sortBy || "newest")} onChange={(e) => updateQueryConfig(section, { type: "products", sortBy: e.target.value })}>
                          {SORT_OPTIONS.map((sort) => (
                            <option key={sort.value} value={sort.value}>{sort.label}</option>
                          ))}
                        </select>

                        <label className="text-sm flex items-center gap-2 border rounded-lg px-3 py-2">
                          <input type="checkbox" checked={Boolean(query.inStockOnly ?? true)} onChange={(e) => updateQueryConfig(section, { type: "products", inStockOnly: e.target.checked })} />
                          Solo con stock
                        </label>

                        <input type="number" min={0} className="border rounded-lg px-3 py-2" value={typeof query.priceMin === "number" ? query.priceMin : ""} onChange={(e) => updateQueryConfig(section, { type: "products", priceMin: e.target.value ? Number(e.target.value) : undefined })} placeholder="Precio mínimo" />
                        <input type="number" min={0} className="border rounded-lg px-3 py-2" value={typeof query.priceMax === "number" ? query.priceMax : ""} onChange={(e) => updateQueryConfig(section, { type: "products", priceMax: e.target.value ? Number(e.target.value) : undefined })} placeholder="Precio máximo" />
                      </>
                    ) : (
                      <div className="text-xs text-slate-500 md:col-span-2">Esta sección usa consulta automática de categorías/marcas.</div>
                    )}
                  </div>
                )}

                {PRODUCT_QUERY_TYPES.includes(section.type) ? (
                  <div className="rounded-lg border border-slate-200 p-3 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Carrusel en Store</div>
                      <div className="flex gap-1">
                        <button className="rounded border px-2 py-1 text-[11px]" onClick={() => applyCarouselPreset(section, "compact")}>Compacto</button>
                        <button className="rounded border px-2 py-1 text-[11px]" onClick={() => applyCarouselPreset(section, "balanced")}>Balanceado</button>
                        <button className="rounded border px-2 py-1 text-[11px]" onClick={() => applyCarouselPreset(section, "showcase")}>Escaparate</button>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="text-sm flex items-center gap-2 border rounded-lg px-3 py-2">
                        <input type="checkbox" checked={Boolean(section.config_json.carousel_enabled ?? true)} onChange={(e) => updateConfig(section, { carousel_enabled: e.target.checked })} />
                        Activar carrusel horizontal
                      </label>
                      <label className="text-sm flex items-center gap-2 border rounded-lg px-3 py-2">
                        <input type="checkbox" checked={Boolean(section.config_json.carousel_autoplay ?? true)} onChange={(e) => updateConfig(section, { carousel_autoplay: e.target.checked })} />
                        Autoplay
                      </label>
                      <input type="number" min={2000} step={500} className="border rounded-lg px-3 py-2" value={Number(section.config_json.carousel_interval_ms || 4500)} onChange={(e) => updateConfig(section, { carousel_interval_ms: Number(e.target.value) || 4500 })} placeholder="Intervalo autoplay (ms)" />
                      <input type="number" min={1} max={6} className="border rounded-lg px-3 py-2" value={Number(section.config_json.carousel_items_desktop || 4)} onChange={(e) => updateConfig(section, { carousel_items_desktop: Number(e.target.value) || 4 })} placeholder="Items visibles desktop" />
                      <input type="number" min={1} max={3} className="border rounded-lg px-3 py-2 md:col-span-2" value={Number(section.config_json.carousel_items_mobile || 2)} onChange={(e) => updateConfig(section, { carousel_items_mobile: Number(e.target.value) || 2 })} placeholder="Items visibles móvil" />
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {section.type === "TRUST_BAR" && (
              <textarea
                className="border rounded-lg px-3 py-2 w-full min-h-24 text-xs font-mono"
                value={JSON.stringify(section.config_json.items || [], null, 2)}
                onChange={(e) => {
                  try {
                    updateConfig(section, { items: JSON.parse(e.target.value) as unknown[] });
                  } catch {
                    // skip partial JSON
                  }
                }}
              />
            )}

                <button className="px-3 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-50" disabled={savingId === section.id} onClick={() => void save(section)}>
                  {savingId === section.id ? "Guardando..." : "Guardar cambios"}
                </button>
              </>
            ) : (
              <div className="rounded-lg border border-dashed px-3 py-2 text-xs text-slate-500">Sección colapsada. Expándela para editar su configuración.</div>
            )}
          </div>
        );
      })}

      {!isLoading && filtered.length === 0 ? (
        <div className="rounded-lg border bg-white p-4 text-sm text-slate-500 flex flex-wrap items-center justify-between gap-3">
          <span>No hay secciones para el filtro actual.</span>
          {filter ? (
            <button className="px-3 py-1.5 border rounded-lg text-xs" onClick={() => setFilter("")}>Limpiar filtro</button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
