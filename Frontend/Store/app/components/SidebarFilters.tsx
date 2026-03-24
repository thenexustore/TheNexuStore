"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FilterOptions, ProductFilters } from "../lib/products";
import { formatCurrency } from "../lib/currency";

interface SidebarFiltersProps {
  filterOptions: FilterOptions;
  filters: ProductFilters;
  onFilterChange: (filters: ProductFilters) => void;
}

type FilterListItem = {
  id: string;
  name: string;
  slug: string;
  count: number;
  parent_id?: string | null;
  parent_name?: string | null;
  display_name?: string;
};

type TreeNode = FilterListItem & { children: TreeNode[] };

/** Shallow array equality — stable references prevent spurious re-renders. */
function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────
// FilterSection — collapsible accordion wrapper
// ─────────────────────────────────────────────────────
function FilterSection({
  title,
  badge,
  defaultOpen = true,
  children,
}: {
  title: string;
  badge?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          {title}
          {badge ? (
            <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#0B123A] px-1 text-[10px] font-bold text-white leading-none">
              {badge}
            </span>
          ) : null}
        </span>
        <svg
          className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────
// PriceRangeSlider — dual-handle price range picker
// with direct numeric inputs
// ─────────────────────────────────────────────────────
function PriceRangeSlider({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
}) {
  const t = useTranslations("filters");
  const range = max - min || 1;
  const leftPct = Math.round(((value[0] - min) / range) * 100);
  const rightPct = Math.round(((value[1] - min) / range) * 100);

  // Local string state so user can freely type without being hijacked mid-keystroke
  const [minInput, setMinInput] = useState(String(value[0]));
  const [maxInput, setMaxInput] = useState(String(value[1]));

  // Keep input strings in sync when external value changes
  const curMin = value[0];
  const curMax = value[1];
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMinInput(String(curMin));
    setMaxInput(String(curMax));
  }, [curMin, curMax]);

  const commitMin = () => {
    const parsed = parseInt(minInput, 10);
    if (!Number.isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(parsed, value[1] - 1));
      setMinInput(String(clamped));
      onChange([clamped, value[1]]);
    } else {
      setMinInput(String(value[0]));
    }
  };

  const commitMax = () => {
    const parsed = parseInt(maxInput, 10);
    if (!Number.isNaN(parsed)) {
      const clamped = Math.min(max, Math.max(parsed, value[0] + 1));
      setMaxInput(String(clamped));
      onChange([value[0], clamped]);
    } else {
      setMaxInput(String(value[1]));
    }
  };

  return (
    <div className="space-y-3 px-1">
      {/* Direct numeric inputs */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {t("priceMin")}
          </label>
          <input
            type="number"
            min={min}
            max={value[1] - 1}
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
            onBlur={commitMin}
            onKeyDown={(e) => e.key === "Enter" && commitMin()}
            aria-label={t("minPrice")}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-sm font-semibold text-slate-700 transition focus:border-[#0B123A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0B123A]"
          />
        </div>
        <div className="mt-5 h-px w-3 flex-shrink-0 bg-slate-300" />
        <div className="flex-1">
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {t("priceMax")}
          </label>
          <input
            type="number"
            min={value[0] + 1}
            max={max}
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            onBlur={commitMax}
            onKeyDown={(e) => e.key === "Enter" && commitMax()}
            aria-label={t("maxPrice")}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-sm font-semibold text-slate-700 transition focus:border-[#0B123A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0B123A]"
          />
        </div>
      </div>

      {/* Visual track with filled range */}
      <div className="relative mx-1 h-1.5 rounded-full bg-slate-200">
        <div
          className="absolute h-1.5 rounded-full bg-[#0B123A]"
          style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
        />
      </div>

      {/* Min slider */}
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value[0]}
        onChange={(e) => {
          const v = Math.max(min, Math.min(Number(e.target.value), value[1] - 1));
          onChange([v, value[1]]);
        }}
        className="w-full cursor-pointer accent-[#0B123A]"
        aria-label={t("minPrice")}
      />

      {/* Max slider */}
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value[1]}
        onChange={(e) => {
          const v = Math.min(max, Math.max(Number(e.target.value), value[0] + 1));
          onChange([value[0], v]);
        }}
        className="w-full cursor-pointer accent-[#0B123A]"
        aria-label={t("maxPrice")}
      />

      {/* Boundary labels */}
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{formatCurrency(min)}</span>
        <span>{formatCurrency(max)}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// SearchableCheckboxList — checkbox/radio filter list
// ─────────────────────────────────────────────────────
function SearchableCheckboxList({
  title,
  searchPlaceholder,
  items,
  selected,
  onToggle,
  initialVisible = 6,
  singleSelect = false,
}: {
  title: string;
  searchPlaceholder: string;
  items: FilterListItem[];
  selected: string[];
  onToggle: (slug: string) => void;
  initialVisible?: number;
  singleSelect?: boolean;
}) {
  const t = useTranslations("filters");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(
    () =>
      items.filter((item) =>
        (item.display_name || item.name)
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [items, query]
  );

  const visibleItems = expanded ? filtered : filtered.slice(0, initialVisible);

  return (
    <FilterSection title={title} badge={selected.length || undefined}>
      {items.length > initialVisible && (
        <div className="relative mb-3">
          <svg
            className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-sm placeholder-slate-400 focus:border-[#0B123A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0B123A]"
          />
        </div>
      )}

      {filtered.length === 0 && query ? (
        <p className="px-2 py-3 text-xs text-slate-400">{t("noResults")}</p>
      ) : (
        <div className="max-h-60 space-y-0.5 overflow-auto pr-1">
          {visibleItems.map((item) => {
            const isSelected = selected.includes(item.slug);
            return (
              <label
                key={item.id}
                className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-slate-50 ${
                  isSelected ? "bg-[#0B123A]/5 text-[#0B123A]" : "text-slate-700"
                }`}
              >
                {/* Custom checkbox / radio indicator */}
                <span
                  className={`flex h-4 w-4 flex-shrink-0 items-center justify-center border-2 transition-colors ${
                    singleSelect ? "rounded-full" : "rounded"
                  } ${
                    isSelected
                      ? "border-[#0B123A] bg-[#0B123A]"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {isSelected &&
                    (singleSelect ? (
                      <span className="h-2 w-2 rounded-full bg-white" />
                    ) : (
                      <svg
                        className="h-2.5 w-2.5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ))}
                </span>
                <input
                  type={singleSelect ? "radio" : "checkbox"}
                  checked={isSelected}
                  onChange={() => onToggle(item.slug)}
                  className="sr-only"
                />
                <span className="flex-1 truncate">
                  {item.display_name || item.name}
                </span>
                <span className="ml-auto flex-shrink-0 text-xs text-slate-400">
                  {item.count}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {filtered.length > initialVisible && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs font-medium text-[#0B123A] hover:text-[#1a245a] hover:underline underline-offset-2"
        >
          {expanded
            ? t("showLess")
            : t("showMore", { count: filtered.length - initialVisible })}
        </button>
      )}
    </FilterSection>
  );
}

// ─────────────────────────────────────────────────────
// CategoryTreeFilter — hierarchical category picker
// ─────────────────────────────────────────────────────
function CategoryTreeFilter({
  items,
  selected,
  onToggle,
}: {
  items: FilterListItem[];
  selected: string[];
  onToggle: (slug: string) => void;
}) {
  const t = useTranslations("filters");
  const [nodeExpanded, setNodeExpanded] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");

  const tree = useMemo(() => {
    const byId = new Map(
      items.map((item) => [item.id, { ...item, children: [] as TreeNode[] }])
    );
    const roots: TreeNode[] = [];
    for (const item of byId.values()) {
      const pid = item.parent_id as string | null | undefined;
      if (pid && byId.has(pid)) {
        byId.get(pid)!.children.push(item);
      } else {
        roots.push(item);
      }
    }
    return roots;
  }, [items]);

  const matchesQuery = (node: TreeNode): boolean => {
    if (!query) return true;
    const name = (node.display_name || node.name || "").toLowerCase();
    if (name.includes(query.toLowerCase())) return true;
    return node.children?.some((c) => matchesQuery(c)) ?? false;
  };

  const renderNode = (node: TreeNode, depth: number): React.ReactNode => {
    if (!matchesQuery(node)) return null;
    const open = nodeExpanded[node.id] ?? depth < 1;
    const isSelected = selected.includes(node.slug);

    return (
      <div key={node.id} className="space-y-0.5">
        <div
          className={`flex items-center gap-1 rounded-md py-1.5 pr-2 transition-colors hover:bg-slate-50 ${
            isSelected ? "bg-[#0B123A]/5" : ""
          }`}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          {node.children.length > 0 ? (
            <button
              type="button"
              className="mr-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded text-slate-400 hover:text-slate-600"
              onClick={() =>
                setNodeExpanded((prev) => ({
                  ...prev,
                  [node.id]: !open,
                }))
              }
              aria-label={open ? t("collapse") : t("expand")}
            >
              <svg
                className={`h-3 w-3 transition-transform ${
                  open ? "rotate-90" : ""
                }`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          ) : (
            <span className="mr-0.5 w-4 flex-shrink-0" />
          )}

          <label
            className={`flex flex-1 cursor-pointer items-center gap-2 text-sm ${
              isSelected ? "text-[#0B123A]" : "text-slate-700"
            }`}
          >
            <span
              className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2 transition-colors ${
                isSelected
                  ? "border-[#0B123A] bg-[#0B123A]"
                  : "border-slate-300 bg-white"
              }`}
            >
              {isSelected && (
                <svg
                  className="h-2.5 w-2.5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </span>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggle(node.slug)}
              className="sr-only"
            />
            <span className="flex-1 truncate">{node.name}</span>
            <span className="flex-shrink-0 text-xs text-slate-400">
              {node.count}
            </span>
          </label>
        </div>

        {open
          ? node.children.map((child) => renderNode(child, depth + 1))
          : null}
      </div>
    );
  };

  return (
    <FilterSection title={t("categories")} badge={selected.length || undefined}>
      {items.length > 8 && (
        <div className="relative mb-3">
          <svg
            className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchCategories")}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-sm placeholder-slate-400 focus:border-[#0B123A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0B123A]"
          />
        </div>
      )}
      <div className="max-h-80 overflow-auto pr-1">
        {tree.map((node) => renderNode(node, 0))}
      </div>
    </FilterSection>
  );
}

// ─────────────────────────────────────────────────────
// ActiveFilterChip — removable pill for active filters
// ─────────────────────────────────────────────────────
function ActiveFilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#0B123A]/8 px-2.5 py-1 text-xs font-medium text-[#0B123A] ring-1 ring-inset ring-[#0B123A]/20">
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full text-[#0B123A]/60 transition-colors hover:bg-[#0B123A]/15 hover:text-[#0B123A]"
        aria-label={`Remove ${label} filter`}
      >
        <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </span>
  );
}

// ─────────────────────────────────────────────────────
// SidebarFilters — main export
// ─────────────────────────────────────────────────────
export function SidebarFilters({
  filterOptions,
  filters,
  onFilterChange,
}: SidebarFiltersProps) {
  const t = useTranslations("filters");
  const minPrice = filterOptions.price_range.min;
  const maxPrice = filterOptions.price_range.max;

  // Refs so debounced callback always reads current values without stale closures.
  const filtersRef = useRef(filters);
  const onFilterChangeRef = useRef(onFilterChange);
  const minPriceRef = useRef(minPrice);
  const maxPriceRef = useRef(maxPrice);
  // Keep refs up-to-date after every render
  useEffect(() => {
    filtersRef.current = filters;
    onFilterChangeRef.current = onFilterChange;
    minPriceRef.current = minPrice;
    maxPriceRef.current = maxPrice;
  });

  const [price, setPrice] = useState<[number, number]>([
    filters.min_price ?? minPrice,
    filters.max_price ?? maxPrice,
  ]);
  const [categories, setCategories] = useState<string[]>(
    filters.categories ?? []
  );
  // Single-select: API only accepts one brand via `brand` field.
  const [brand, setBrand] = useState<string>(filters.brand ?? "");
  const [attributes, setAttributes] = useState<string[]>(
    filters.attributes ?? []
  );
  const [featured, setFeatured] = useState(!!filters.featured_only);

  // Re-sync local state when the external `filters` prop changes (URL nav, quick filters).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setPrice((prev) => {
      const next: [number, number] = [
        filters.min_price ?? minPrice,
        filters.max_price ?? maxPrice,
      ];
      return prev[0] === next[0] && prev[1] === next[1] ? prev : next;
    });
    setCategories((prev) => {
      const next = filters.categories ?? [];
      return arraysEqual(prev, next) ? prev : next;
    });
    setBrand((prev) => {
      const next = filters.brand ?? "";
      return prev === next ? prev : next;
    });
    setAttributes((prev) => {
      const next = filters.attributes ?? [];
      return arraysEqual(prev, next) ? prev : next;
    });
    setFeatured(!!filters.featured_only);
  }, [filters, minPrice, maxPrice]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Debounced apply — reads external values via refs to avoid stale closures.
  useEffect(() => {
    const min = minPriceRef.current;
    const max = maxPriceRef.current;
    const t = setTimeout(() => {
      onFilterChangeRef.current({
        ...filtersRef.current,
        min_price: price[0] !== min ? price[0] : undefined,
        max_price: price[1] !== max ? price[1] : undefined,
        categories: categories.length ? categories : undefined,
        brand: brand || undefined,
        attributes: attributes.length ? attributes : undefined,
        in_stock_only: true,
        featured_only: featured || undefined,
        page: 1,
      });
    }, 300);
    return () => clearTimeout(t);
  }, [price, categories, brand, attributes, featured]);

  const toggleArrayValue = (
    value: string,
    list: string[],
    setList: (v: string[]) => void
  ) => {
    setList(
      list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
    );
  };

  // Single-select brand toggle.
  const toggleBrand = (slug: string) => {
    setBrand((prev) => (prev === slug ? "" : slug));
  };

  const clearAll = () => {
    setPrice([minPrice, maxPrice]);
    setCategories([]);
    setBrand("");
    setAttributes([]);
    setFeatured(false);
    onFilterChange({
      page: 1,
      limit: filters.limit,
      sort_by: filters.sort_by,
      in_stock_only: true,
    });
  };

  // ── Active filter count for the header badge ──
  const activeCount =
    categories.length +
    (brand ? 1 : 0) +
    attributes.length +
    (featured ? 1 : 0) +
    (price[0] !== minPrice || price[1] !== maxPrice ? 1 : 0);

  // ── Active chips for the quick-remove bar ──
  const activeChips: { key: string; label: string; onRemove: () => void }[] =
    [];

  if (price[0] !== minPrice || price[1] !== maxPrice) {
    activeChips.push({
      key: "price",
      label: `${formatCurrency(price[0])} – ${formatCurrency(price[1])}`,
      onRemove: () => setPrice([minPrice, maxPrice]),
    });
  }
  categories.forEach((slug) => {
    const cat = filterOptions.categories.find((c) => c.slug === slug);
    activeChips.push({
      key: `cat-${slug}`,
      label: cat?.display_name || cat?.name || slug,
      onRemove: () => setCategories((prev) => prev.filter((s) => s !== slug)),
    });
  });
  if (brand) {
    const b = filterOptions.brands.find((b) => b.slug === brand);
    activeChips.push({
      key: "brand",
      label: b?.name || brand,
      onRemove: () => setBrand(""),
    });
  }
  attributes.forEach((attr) => {
    const [key, val] = attr.split(":");
    const attrDef = filterOptions.attributes.find((a) => a.key === key);
    activeChips.push({
      key: `attr-${attr}`,
      label: attrDef ? `${attrDef.name}: ${val}` : attr,
      onRemove: () =>
        setAttributes((prev) => prev.filter((a) => a !== attr)),
    });
  });
  if (featured) {
    activeChips.push({
      key: "featured",
      label: t("featuredOnly"),
      onRemove: () => setFeatured(false),
    });
  }

  return (
    <div className="w-full">
      {/* ── Header ── */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
          {t("title")}
          {activeCount > 0 && (
            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#0B123A] px-1 text-[10px] font-bold text-white leading-none">
              {activeCount}
            </span>
          )}
        </h3>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-medium text-slate-500 underline-offset-2 transition-colors hover:text-[#0B123A] hover:underline"
          >
            {t("clearAll")}
          </button>
        )}
      </div>

      {/* ── Active filter chips ── */}
      {activeChips.length > 0 && (
        <>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {activeChips.map((chip) => (
              <ActiveFilterChip
                key={chip.key}
                label={chip.label}
                onRemove={chip.onRemove}
              />
            ))}
          </div>
          <div className="mb-4 border-t border-slate-100" />
        </>
      )}

      {/* ── Price range ── */}
      {minPrice !== maxPrice && (
        <FilterSection title={t("price")}>
          <PriceRangeSlider
            min={minPrice}
            max={maxPrice}
            value={price}
            onChange={setPrice}
          />
        </FilterSection>
      )}

      {/* ── Categories ── */}
      {filterOptions.categories.length > 0 && (
        <CategoryTreeFilter
          items={filterOptions.categories}
          selected={categories}
          onToggle={(v) => toggleArrayValue(v, categories, setCategories)}
        />
      )}

      {/* ── Brands — single-select ── */}
      {filterOptions.brands.length > 0 && (
        <SearchableCheckboxList
          title={t("brands")}
          searchPlaceholder={t("searchBrands")}
          items={filterOptions.brands}
          selected={brand ? [brand] : []}
          onToggle={toggleBrand}
          singleSelect
        />
      )}

      {/* ── Attribute groups ── */}
      {filterOptions.attributes.map((attr) => (
        <SearchableCheckboxList
          key={attr.key}
          title={attr.name}
          searchPlaceholder={t("searchAttr", { attr: attr.name.toLowerCase() })}
          items={attr.values.map((v) => ({
            id: `${attr.key}-${v.value}`,
            name: v.value,
            slug: `${attr.key}:${v.value}`,
            count: v.count,
          }))}
          selected={attributes}
          onToggle={(v) => toggleArrayValue(v, attributes, setAttributes)}
        />
      ))}

      {/* ── Featured-only toggle ── */}
      <FilterSection title={t("special")} defaultOpen={false}>
        <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-slate-50">
          <span
            className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 transition-colors ${
              featured
                ? "border-[#0B123A] bg-[#0B123A]"
                : "border-slate-300 bg-slate-200"
            }`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                featured ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </span>
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
            className="sr-only"
          />
          <span className="text-slate-700">{t("featuredOnly")}</span>
        </label>
      </FilterSection>
    </div>
  );
}
