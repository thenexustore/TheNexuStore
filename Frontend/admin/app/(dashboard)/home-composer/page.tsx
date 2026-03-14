"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { homeBuilderApi } from "@/lib/api/home-builder";
import { API_URL, SITE_URL } from "@/lib/constants";
import { useLocale } from "next-intl";
import { Eye, LayoutTemplate, Sparkles, Wand2 } from "lucide-react";
import CanvasSections from "@/app/components/home-composer/CanvasSections";
import CuratedItemsPanel from "@/app/components/home-composer/CuratedItemsPanel";
import { HomeOption, HomeSection, HomeSectionItem, HomeSectionType } from "@/app/components/home-composer/types";

type HomeLayout = {
  id: string;
  name: string;
  locale?: string | null;
  is_active: boolean;
};

type ProductSource =
  | "NEW_ARRIVALS"
  | "BEST_DEALS"
  | "FEATURED"
  | "CATEGORY"
  | "BRAND";

type SectionDraft = {
  title: string;
  subtitle: string;
  is_enabled: boolean;
  variant: string;
  configText: string;
};

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
  HERO_CAROUSEL: "Hero principal",
  CATEGORY_STRIP: "Carrusel de categorías",
  PRODUCT_CAROUSEL: "Carrusel de productos",
  BRAND_STRIP: "Carrusel de marcas",
  VALUE_PROPS: "Beneficios / confianza",
  TRENDING_CHIPS: "Chips de tendencias",
  CUSTOM_HTML: "Bloque HTML personalizado",
};

const DEFAULT_CONFIG: Record<HomeSectionType, Record<string, unknown>> = {
  HERO_CAROUSEL: { autoplay: true, interval_ms: 5000 },
  CATEGORY_STRIP: { mode: "auto", limit: 10 },
  PRODUCT_CAROUSEL: {
    mode: "rule",
    source: "NEW_ARRIVALS",
    limit: 12,
    inStockOnly: true,
    autoplay: true,
    interval_ms: 4500,
    items_mobile: 2,
    items_desktop: 4,
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

  const currentTarget = useMemo<"products" | "brands" | "categories" | null>(() => {
    if (!selectedSection) return null;
    if (selectedSection.type === "PRODUCT_CAROUSEL") return "products";
    if (selectedSection.type === "BRAND_STRIP") return "brands";
    if (selectedSection.type === "CATEGORY_STRIP") return "categories";
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
    return false;
  }, [selectedSection, parsedDraftConfig]);


  const curatedLimit = useMemo(() => {
    const raw = Number(parsedDraftConfig?.limit || 0);
    if (!Number.isFinite(raw) || raw <= 0) return 24;
    return Math.max(1, Math.min(24, Math.floor(raw)));
  }, [parsedDraftConfig]);

  const curatedRemaining = useMemo(() => {
    return Math.max(0, curatedLimit - items.length);
  }, [curatedLimit, items.length]);

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

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        await loadLayouts();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudieron cargar los diseños");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [loadLayouts]);

  useEffect(() => {
    if (!activeLayoutId) return;
    void loadSections(activeLayoutId).catch((error) => {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar secciones");
    });
  }, [activeLayoutId, loadSections]);

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
        title: newSectionTitle.trim() || newSectionType,
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
    const nextPosition = section.position + direction;
    if (nextPosition < 1 || nextPosition > sections.length) return;

    try {
      setSaving(true);
      await homeBuilderApi.moveSection(section.id, nextPosition);
      await loadSections(activeLayoutId);
    } catch (error) {
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
      return item.category_id === option.id;
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

    try {
      setSaving(true);
      await homeBuilderApi.createItem(selectedSection.id, basePayload);
      const data = (await homeBuilderApi.listItems(selectedSection.id)) as HomeSectionItem[];
      setItems([...data].sort((a, b) => a.position - b.position));
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

  return (
    <div className="space-y-6 p-6">
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

              {selectedSection.type === "PRODUCT_CAROUSEL" && parsedDraftConfig ? (
                <div className="rounded-xl border border-zinc-200 p-3">
                  <div className="mb-3 text-sm font-medium">Controles rápidos: Carrusel de productos</div>
                  <div className="grid gap-3 md:grid-cols-2">
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

                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-500">ID de categoría</span>
                      <input
                        value={String(config.categoryId || "")}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            categoryId: event.target.value.trim() || null,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-500">ID de marca</span>
                      <input
                        value={String(config.brandId || "")}
                        onChange={(event) =>
                          updateDraftConfig({
                            ...config,
                            brandId: event.target.value.trim() || null,
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
                            items_desktop: Math.max(1, Number(event.target.value) || 1),
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
                  </div>
                </div>
              ) : null}

              {selectedSection.type === "CATEGORY_STRIP" && parsedDraftConfig ? (
                <div className="rounded-xl border border-zinc-200 p-3">
                  <div className="mb-3 text-sm font-medium">Controles rápidos: Carrusel de categorías</div>
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
                  </div>
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
                />
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
    </div>
  );
}
