"use client";

import { useEffect, useMemo, useState } from "react";
import { FilterOptions, ProductFilters } from "../lib/products";

interface SidebarFiltersProps {
  filterOptions: FilterOptions;
  filters: ProductFilters;
  onFilterChange: (filters: ProductFilters) => void;
}

function SearchableCheckboxList({
  title,
  items,
  selected,
  onToggle,
  initialVisible = 6,
}: {
  title: string;
  items: { id: string; name: string; slug: string; count: number }[];
  selected: string[];
  onToggle: (slug: string) => void;
  initialVisible?: number;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(
    () =>
      items.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase())
      ),
    [items, query]
  );

  const visibleItems = expanded ? filtered : filtered.slice(0, initialVisible);

  return (
    <div className="space-y-3">
      <h4 className="font-medium">{title}</h4>

      {items.length > initialVisible && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${title.toLowerCase()}...`}
          className="w-full rounded border px-2 py-1 text-sm"
        />
      )}

      <div className="space-y-2 max-h-64 overflow-auto">
        {visibleItems.map((item) => (
          <label key={item.id} className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(item.slug)}
              onChange={() => onToggle(item.slug)}
              className="rounded border-gray-300 text-blue-600"
            />
            <span className="ml-2 text-sm">
              {item.name} ({item.count})
            </span>
          </label>
        ))}
      </div>

      {filtered.length > initialVisible && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-blue-600"
        >
          {expanded
            ? "Show less"
            : `Show ${filtered.length - initialVisible} more`}
        </button>
      )}
    </div>
  );
}

export function SidebarFilters({
  filterOptions,
  filters,
  onFilterChange,
}: SidebarFiltersProps) {
  const minPrice = filterOptions.price_range.min;
  const maxPrice = filterOptions.price_range.max;

  const [price, setPrice] = useState<[number, number]>([
    filters.min_price ?? minPrice,
    filters.max_price ?? maxPrice,
  ]);

  const [categories, setCategories] = useState<string[]>(
    filters.categories ?? []
  );
  const [brands, setBrands] = useState<string[]>(
    filters.brand ? [filters.brand] : []
  );
  const [attributes, setAttributes] = useState<string[]>(
    filters.attributes ?? []
  );
  const [inStock, setInStock] = useState(!!filters.in_stock_only);
  const [featured, setFeatured] = useState(!!filters.featured_only);

  useEffect(() => {
    const t = setTimeout(() => {
      onFilterChange({
        ...filters,
        min_price: price[0] !== minPrice ? price[0] : undefined,
        max_price: price[1] !== maxPrice ? price[1] : undefined,
        categories: categories.length ? categories : undefined,
        brand: brands.length ? brands[0] : undefined,
        attributes: attributes.length ? attributes : undefined,
        in_stock_only: inStock || undefined,
        featured_only: featured || undefined,
        page: 1,
      });
    }, 300);
    return () => clearTimeout(t);
  }, [price, categories, brands, attributes, inStock, featured]);

  const toggleArrayValue = (
    value: string,
    list: string[],
    setList: (v: string[]) => void
  ) => {
    setList(
      list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
    );
  };

  const clearAll = () => {
    setPrice([minPrice, maxPrice]);
    setCategories([]);
    setBrands([]);
    setAttributes([]);
    setInStock(false);
    setFeatured(false);
    onFilterChange({
      page: 1,
      limit: filters.limit,
      sort_by: filters.sort_by,
    });
  };

  const active =
    categories.length ||
    brands.length ||
    attributes.length ||
    inStock ||
    featured ||
    price[0] !== minPrice ||
    price[1] !== maxPrice;

  return (
    <div className="w-64 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Filters</h3>
        {active && (
          <button onClick={clearAll} className="text-sm text-blue-600">
            Clear all
          </button>
        )}
      </div>

      {filterOptions.categories.length > 0 && (
        <SearchableCheckboxList
          title="Categories"
          items={filterOptions.categories}
          selected={categories}
          onToggle={(v) => toggleArrayValue(v, categories, setCategories)}
        />
      )}

      {filterOptions.brands.length > 0 && (
        <SearchableCheckboxList
          title="Brands"
          items={filterOptions.brands}
          selected={brands}
          onToggle={(v) => toggleArrayValue(v, brands, setBrands)}
        />
      )}

      {filterOptions.attributes.map((attr) => (
        <SearchableCheckboxList
          key={attr.key}
          title={attr.name}
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
    </div>
  );
}
