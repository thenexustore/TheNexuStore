"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
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
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "discount_desc", label: "Biggest Discount" },
];

const DEFAULT_CONFIG_BY_TYPE: Record<string, Record<string, any>> = {
  HERO_BANNER_SLIDER: { items_per_carousel: 1 },
  TOP_CATEGORIES_GRID: { source: "query", query: { type: "categories", limit: 10 } },
  BEST_DEALS: { source: "query", query: { type: "products", sortBy: "discount_desc", inStockOnly: true, limit: 12 } },
  NEW_ARRIVALS: { source: "query", query: { type: "products", sortBy: "newest", inStockOnly: true, limit: 12 } },
  FEATURED_PICKS: { source: "query", query: { type: "products", inStockOnly: true, limit: 12 } },
  BRANDS_STRIP: { source: "query", query: { type: "brands", limit: 12 } },
  TRUST_BAR: {
    items: [
      { icon: "truck", text: "Fast delivery" },
      { icon: "shield", text: "Secure payments" },
      { icon: "refresh-ccw", text: "Easy returns" },
    ],
  },
};

function supportsSource(type: string) {
  return MANUAL_TYPES.includes(type);
}

export default function HomepageSectionsPage() {
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [search, setSearch] = useState<Record<string, string>>({});
  const [options, setOptions] = useState<Record<string, HomepageOption[]>>({});
  const [queryCatalogs, setQueryCatalogs] = useState<{
    categories: HomepageOption[];
    brands: HomepageOption[];
  }>({ categories: [], brands: [] });
  const [newType, setNewType] = useState("TOP_CATEGORIES_GRID");

  const sorted = useMemo(
    () => [...sections].sort((a, b) => a.position - b.position),
    [sections],
  );

  const load = async () => {
    try {
      setSections(await homepageSectionsApi.list());
    } catch (e: any) {
      toast.error(e.message || "Failed to load homepage sections");
    }
  };

  useEffect(() => {
    load();
    (async () => {
      try {
        const [categories, brands] = await Promise.all([
          homepageSectionsApi.options("TOP_CATEGORIES_GRID", "", 100, "categories"),
          homepageSectionsApi.options("BRANDS_STRIP", "", 100, "brands"),
        ]);
        setQueryCatalogs({ categories, brands });
      } catch {
        // silent
      }
    })();
  }, []);

  const updateLocal = (id: string, patch: Partial<HomepageSection>) => {
    setSections((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const updateConfig = (section: HomepageSection, patch: Record<string, any>) => {
    updateLocal(section.id, { config_json: { ...section.config_json, ...patch } });
  };

  const updateQueryConfig = (section: HomepageSection, patch: Record<string, any>) => {
    updateLocal(section.id, {
      config_json: {
        ...section.config_json,
        source: "query",
        query: {
          ...(section.config_json.query || {}),
          ...patch,
        },
      },
    });
  };

  const save = async (section: HomepageSection) => {
    try {
      await homepageSectionsApi.update(section.id, {
        enabled: section.enabled,
        title: section.title,
        config_json: section.config_json,
      });
      toast.success(`${section.type} saved`);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  };

  const create = async () => {
    try {
      await homepageSectionsApi.create({
        type: newType,
        position: sorted.length + 1,
        enabled: true,
        title: newType.replaceAll("_", " "),
        config_json: DEFAULT_CONFIG_BY_TYPE[newType],
      });
      toast.success("Section created");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Create failed");
    }
  };

  const remove = async (section: HomepageSection) => {
    if (!confirm(`Delete ${section.type}?`)) return;
    try {
      await homepageSectionsApi.remove(section.id);
      toast.success("Section deleted");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    }
  };

  const move = async (index: number, delta: number) => {
    const next = index + delta;
    if (next < 0 || next >= sorted.length) return;

    const arr = [...sorted];
    const [item] = arr.splice(index, 1);
    arr.splice(next, 0, item);
    const payload = arr.map((x, i) => ({ id: x.id, position: i + 1 }));

    setSections((prev) =>
      prev.map((x) => ({ ...x, position: payload.find((p) => p.id === x.id)?.position || x.position })),
    );

    try {
      await homepageSectionsApi.reorder(payload);
      toast.success("Sections reordered");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Reorder failed");
    }
  };

  const loadOptions = async (
    section: HomepageSection,
    q: string,
    target: "products" | "categories" | "brands" = "products",
  ) => {
    if (!supportsSource(section.type)) return;
    try {
      const data = await homepageSectionsApi.options(section.type, q, 10, target);
      setOptions((prev) => ({ ...prev, [section.id]: data }));
    } catch (e: any) {
      toast.error(e.message || "Search failed");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Homepage Sections</h1>
        <p className="text-sm text-slate-500">Manage ordering, visibility and section-specific merchandising settings.</p>
      </div>

      <div className="rounded-xl border bg-white p-4 flex flex-wrap items-center gap-2">
        <select
          className="border rounded-lg px-3 py-2"
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
        >
          {SECTION_TYPES.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <button onClick={create} className="px-3 py-2 rounded-lg bg-black text-white text-sm">
          Add Section
        </button>
      </div>

      {sorted.map((section, index) => {
        const source = section.config_json.source || "query";
        const query = section.config_json.query || {};

        return (
          <div key={section.id} className="rounded-xl border bg-white p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{section.type}</div>
                <div className="text-xs text-slate-500">Position #{section.position}</div>
              </div>

              <div className="flex items-center gap-2">
                <button className="px-2 py-1 border rounded" onClick={() => move(index, -1)}>↑</button>
                <button className="px-2 py-1 border rounded" onClick={() => move(index, 1)}>↓</button>
                <label className="text-sm flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={section.enabled}
                    onChange={(e) => updateLocal(section.id, { enabled: e.target.checked })}
                  />
                  Enabled
                </label>
                <button className="px-2 py-1 border rounded text-red-600" onClick={() => remove(section)}>Delete</button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <input
                className="border rounded-lg px-3 py-2"
                value={section.title || ""}
                onChange={(e) => updateLocal(section.id, { title: e.target.value })}
                placeholder="Section title"
              />
            </div>

            {supportsSource(section.type) && (
              <div className="space-y-2">
                <select
                  className="border rounded-lg px-3 py-2"
                  value={source}
                  onChange={(e) =>
                    updateConfig(section, {
                      source: e.target.value,
                      ids: e.target.value === "manual" ? section.config_json.ids || [] : [],
                      query:
                        e.target.value === "query"
                          ? section.config_json.query || DEFAULT_CONFIG_BY_TYPE[section.type].query
                          : undefined,
                    })
                  }
                >
                  <option value="query">Query</option>
                  <option value="manual">Manual</option>
                </select>

                {source === "manual" && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        className="border rounded-lg px-3 py-2 flex-1"
                        value={search[section.id] || ""}
                        onChange={(e) => setSearch((prev) => ({ ...prev, [section.id]: e.target.value }))}
                        placeholder="Search item"
                      />
                      <button
                        className="px-3 py-2 border rounded-lg"
                        onClick={() =>
                          loadOptions(
                            section,
                            search[section.id] || "",
                            section.type === "TOP_CATEGORIES_GRID"
                              ? "categories"
                              : section.type === "BRANDS_STRIP"
                                ? "brands"
                                : "products",
                          )
                        }
                      >
                        Search
                      </button>
                    </div>

                    <div className="max-h-32 overflow-auto border rounded-lg">
                      {(options[section.id] || []).map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() =>
                            updateConfig(section, {
                              ids: Array.from(new Set([...(section.config_json.ids || []), opt.id])),
                            })
                          }
                          className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                        >
                          {opt.label}
                          <span className="text-xs text-slate-400 ml-2">{opt.subtitle}</span>
                        </button>
                      ))}
                    </div>

                    <div className="text-xs text-slate-500">Selected IDs: {(section.config_json.ids || []).join(", ") || "none"}</div>
                  </div>
                )}

                {source === "query" && (
                  <div className="grid md:grid-cols-2 gap-3">
                    <input
                      type="number"
                      min={1}
                      max={24}
                      className="border rounded-lg px-3 py-2"
                      value={query.limit || 12}
                      onChange={(e) => updateQueryConfig(section, { limit: Number(e.target.value) || 12 })}
                      placeholder="limit"
                    />

                    {PRODUCT_QUERY_TYPES.includes(section.type) ? (
                      <>
                        <select
                          className="border rounded-lg px-3 py-2"
                          value={query.categoryId || ""}
                          onChange={(e) => updateQueryConfig(section, { type: "products", categoryId: e.target.value || undefined })}
                        >
                          <option value="">All categories</option>
                          {queryCatalogs.categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.label}</option>
                          ))}
                        </select>

                        <select
                          className="border rounded-lg px-3 py-2"
                          value={query.brandId || ""}
                          onChange={(e) => updateQueryConfig(section, { type: "products", brandId: e.target.value || undefined })}
                        >
                          <option value="">All brands</option>
                          {queryCatalogs.brands.map((brand) => (
                            <option key={brand.id} value={brand.id}>{brand.label}</option>
                          ))}
                        </select>

                        <select
                          className="border rounded-lg px-3 py-2"
                          value={query.sortBy || "newest"}
                          onChange={(e) => updateQueryConfig(section, { type: "products", sortBy: e.target.value })}
                        >
                          {SORT_OPTIONS.map((sort) => (
                            <option key={sort.value} value={sort.value}>{sort.label}</option>
                          ))}
                        </select>

                        <label className="text-sm flex items-center gap-2 border rounded-lg px-3 py-2">
                          <input
                            type="checkbox"
                            checked={query.inStockOnly ?? true}
                            onChange={(e) => updateQueryConfig(section, { type: "products", inStockOnly: e.target.checked })}
                          />
                          In stock only
                        </label>

                        <input
                          type="number"
                          min={0}
                          className="border rounded-lg px-3 py-2"
                          value={query.priceMin ?? ""}
                          onChange={(e) => updateQueryConfig(section, { type: "products", priceMin: e.target.value ? Number(e.target.value) : undefined })}
                          placeholder="Price min"
                        />

                        <input
                          type="number"
                          min={0}
                          className="border rounded-lg px-3 py-2"
                          value={query.priceMax ?? ""}
                          onChange={(e) => updateQueryConfig(section, { type: "products", priceMax: e.target.value ? Number(e.target.value) : undefined })}
                          placeholder="Price max"
                        />
                      </>
                    ) : (
                      <div className="text-xs text-slate-500 md:col-span-2">
                        Query preset for this section is handled automatically ({section.type === "TOP_CATEGORIES_GRID" ? "categories" : "brands"}).
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!supportsSource(section.type) && section.type !== "TRUST_BAR" && section.type !== "HERO_BANNER_SLIDER" && (
              <div className="grid md:grid-cols-2 gap-3">
                <input
                  type="number"
                  min={1}
                  max={24}
                  className="border rounded-lg px-3 py-2"
                  value={query.limit || section.config_json.limit || 12}
                  onChange={(e) =>
                    updateConfig(section, {
                      source: "query",
                      query: {
                        ...(section.config_json.query || { type: "products" }),
                        limit: Number(e.target.value) || 12,
                      },
                    })
                  }
                  placeholder="limit"
                />
              </div>
            )}

            {section.type === "TRUST_BAR" && (
              <textarea
                className="border rounded-lg px-3 py-2 w-full min-h-24 text-xs font-mono"
                value={JSON.stringify(section.config_json.items || [], null, 2)}
                onChange={(e) => {
                  try {
                    updateConfig(section, { items: JSON.parse(e.target.value) });
                  } catch {
                    // ignore partial json
                  }
                }}
              />
            )}

            <button className="px-3 py-2 rounded-lg bg-black text-white text-sm" onClick={() => save(section)}>
              Save changes
            </button>
          </div>
        );
      })}
    </div>
  );
}
