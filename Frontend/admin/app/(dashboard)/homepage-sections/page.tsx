"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CategoryMenuTreeNode,
  HomepageOption,
  HomepageSection,
  homepageSectionsApi,
} from "@/lib/api/homepage-sections";

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
  BEST_DEALS: { source: "query", query: { type: "products", sortBy: "discount_desc", inStockOnly: true, limit: 12 } },
  NEW_ARRIVALS: { source: "query", query: { type: "products", sortBy: "newest", inStockOnly: true, limit: 12 } },
  FEATURED_PICKS: { source: "query", query: { type: "products", inStockOnly: true, limit: 12 } },
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

  const sorted = useMemo(() => [...sections].sort((a, b) => a.position - b.position), [sections]);
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((section) => (section.title || "").toLowerCase().includes(q) || section.type.toLowerCase().includes(q));
  }, [sorted, filter]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setSections(await homepageSectionsApi.list());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar las secciones");
    } finally {
      setIsLoading(false);
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

  const saveAll = async () => {
    if (!sections.length) return;
    try {
      await Promise.all(
        sections.map((section) =>
          homepageSectionsApi.update(section.id, {
            enabled: section.enabled,
            title: section.title,
            config_json: section.config_json,
          }),
        ),
      );
      toast.success('Todos los cambios guardados');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar todo');
    }
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Página Principal</h1>
        <p className="text-sm text-slate-500">Configura y ordena las secciones que se exportan a la tienda.</p>
      </div>

      <div className="rounded-2xl border bg-white p-4 space-y-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-2 rounded-lg border text-sm" onClick={() => setAllVisibility(true)}>Marcar todas visibles</button>
          <button className="px-3 py-2 rounded-lg border text-sm" onClick={() => setAllVisibility(false)}>Ocultar todas</button>
          <button className="px-3 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-50" disabled={!sections.length} onClick={() => void saveAll()}>Guardar todo</button>
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

        return (
          <div key={section.id} className="rounded-2xl border bg-white p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{section.title || section.type}</div>
                <div className="text-xs text-slate-500">{section.type} · Posición #{section.position}</div>
              </div>

              <div className="flex items-center gap-2">
                <button className="px-2 py-1 border rounded" onClick={() => void move(currentIndex, -1)}>↑</button>
                <button className="px-2 py-1 border rounded" onClick={() => void move(currentIndex, 1)}>↓</button>
                <button className="px-2 py-1 border rounded" onClick={() => void duplicate(section)}>Duplicar</button>
                <label className="text-sm flex items-center gap-1">
                  <input type="checkbox" checked={section.enabled} onChange={(e) => updateLocal(section.id, { enabled: e.target.checked })} />
                  Visible
                </label>
                <button className="px-2 py-1 border rounded text-red-600" onClick={() => void remove(section)}>Eliminar</button>
              </div>
            </div>

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

                    <div className="flex flex-wrap gap-2">
                      {selectedIds.map((id) => (
                        <button
                          key={id}
                          className="rounded-full border px-2 py-1 text-xs"
                          onClick={() => updateConfig(section, { ids: selectedIds.filter((value) => value !== id) })}
                        >
                          {id} ✕
                        </button>
                      ))}
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
          </div>
        );
      })}

      {!isLoading && filtered.length === 0 ? (
        <div className="rounded-lg border bg-white p-4 text-sm text-slate-500">No hay secciones para el filtro actual.</div>
      ) : null}
    </div>
  );
}
