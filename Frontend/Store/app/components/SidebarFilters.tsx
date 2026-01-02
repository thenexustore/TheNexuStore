"use client";

import { useState, useEffect } from "react";
import { FilterOptions, ProductFilters } from "../lib/products";

interface SidebarFiltersProps {
  filterOptions: FilterOptions;
  filters: ProductFilters;
  onFilterChange: (filters: ProductFilters) => void;
}

export function SidebarFilters({
  filterOptions,
  filters,
  onFilterChange,
}: SidebarFiltersProps) {
  const [priceRange, setPriceRange] = useState<[number, number]>([
    filterOptions.price_range.min,
    filterOptions.price_range.max,
  ]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<
    [number, number]
  >([
    filters.min_price || filterOptions.price_range.min,
    filters.max_price || filterOptions.price_range.max,
  ]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    filters.categories || []
  );
  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    filters.brand ? [filters.brand] : []
  );
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>(
    filters.attributes || []
  );
  const [inStockOnly, setInStockOnly] = useState(
    filters.in_stock_only || false
  );
  const [featuredOnly, setFeaturedOnly] = useState(
    filters.featured_only || false
  );

  useEffect(() => {
    setPriceRange([
      filterOptions.price_range.min,
      filterOptions.price_range.max,
    ]);
    setSelectedPriceRange([
      filters.min_price || filterOptions.price_range.min,
      filters.max_price || filterOptions.price_range.max,
    ]);
  }, [filterOptions, filters]);

  const handlePriceChange = (type: "min" | "max", value: number) => {
    const newRange = [...selectedPriceRange] as [number, number];
    if (type === "min") {
      newRange[0] = Math.min(value, selectedPriceRange[1] - 1);
    } else {
      newRange[1] = Math.max(value, selectedPriceRange[0] + 1);
    }
    setSelectedPriceRange(newRange);

    onFilterChange({
      ...filters,
      min_price: newRange[0] === priceRange[0] ? undefined : newRange[0],
      max_price: newRange[1] === priceRange[1] ? undefined : newRange[1],
      page: 1,
    });
  };

  const handleCategoryToggle = (categorySlug: string) => {
    const newCategories = selectedCategories.includes(categorySlug)
      ? selectedCategories.filter((cat) => cat !== categorySlug)
      : [...selectedCategories, categorySlug];

    setSelectedCategories(newCategories);
    onFilterChange({
      ...filters,
      categories: newCategories.length > 0 ? newCategories : undefined,
      category: undefined,
      page: 1,
    });
  };

  const handleBrandToggle = (brandSlug: string) => {
    const newBrands = selectedBrands.includes(brandSlug)
      ? selectedBrands.filter((brand) => brand !== brandSlug)
      : [...selectedBrands, brandSlug];

    setSelectedBrands(newBrands);
    onFilterChange({
      ...filters,
      brand: newBrands.length > 0 ? newBrands[0] : undefined,
      page: 1,
    });
  };

  const handleAttributeToggle = (key: string, value: string) => {
    const attributeString = `${key}:${value}`;
    const newAttributes = selectedAttributes.includes(attributeString)
      ? selectedAttributes.filter((attr) => attr !== attributeString)
      : [...selectedAttributes, attributeString];

    setSelectedAttributes(newAttributes);
    onFilterChange({
      ...filters,
      attributes: newAttributes.length > 0 ? newAttributes : undefined,
      page: 1,
    });
  };

  const handleInStockToggle = () => {
    const newValue = !inStockOnly;
    setInStockOnly(newValue);
    onFilterChange({
      ...filters,
      in_stock_only: newValue || undefined,
      page: 1,
    });
  };

  const handleFeaturedToggle = () => {
    const newValue = !featuredOnly;
    setFeaturedOnly(newValue);
    onFilterChange({
      ...filters,
      featured_only: newValue || undefined,
      page: 1,
    });
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setSelectedPriceRange(priceRange);
    setSelectedAttributes([]);
    setInStockOnly(false);
    setFeaturedOnly(false);

    onFilterChange({
      page: 1,
      limit: filters.limit,
      sort_by: filters.sort_by,
    });
  };

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    selectedBrands.length > 0 ||
    selectedPriceRange[0] !== priceRange[0] ||
    selectedPriceRange[1] !== priceRange[1] ||
    selectedAttributes.length > 0 ||
    inStockOnly ||
    featuredOnly;

  return (
    <div className="w-64 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="space-y-4">
        <h4 className="font-medium">Price Range</h4>
        <div className="space-y-2">
          <div className="relative pt-1">
            <input
              type="range"
              min={priceRange[0]}
              max={priceRange[1]}
              value={selectedPriceRange[0]}
              onChange={(e) =>
                handlePriceChange("min", parseInt(e.target.value))
              }
              className="w-full"
            />
            <input
              type="range"
              min={priceRange[0]}
              max={priceRange[1]}
              value={selectedPriceRange[1]}
              onChange={(e) =>
                handlePriceChange("max", parseInt(e.target.value))
              }
              className="w-full"
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>€{selectedPriceRange[0]}</span>
            <span>€{selectedPriceRange[1]}</span>
          </div>
        </div>
      </div>

      {filterOptions.categories.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium">Categories</h4>
          <div className="space-y-2">
            {filterOptions.categories.map((category) => (
              <label
                key={category.id}
                className="flex items-center cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(category.slug)}
                  onChange={() => handleCategoryToggle(category.slug)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm">
                  {category.name} ({category.count})
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {filterOptions.brands.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium">Brands</h4>
          <div className="space-y-2">
            {filterOptions.brands.map((brand) => (
              <label
                key={brand.id}
                className="flex items-center cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(brand.slug)}
                  onChange={() => handleBrandToggle(brand.slug)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm">
                  {brand.name} ({brand.count})
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h4 className="font-medium">Stock Status</h4>
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={handleInStockToggle}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm">In Stock Only</span>
        </label>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium">Featured</h4>
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={featuredOnly}
            onChange={handleFeaturedToggle}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm">Featured Products Only</span>
        </label>
      </div>

      {filterOptions.attributes.length > 0 &&
        filterOptions.attributes.map((attribute) => (
          <div key={attribute.key} className="space-y-4">
            <h4 className="font-medium">{attribute.name}</h4>
            <div className="space-y-2">
              {attribute.values.map((value) => (
                <label
                  key={value.value}
                  className="flex items-center cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedAttributes.includes(
                      `${attribute.key}:${value.value}`
                    )}
                    onChange={() =>
                      handleAttributeToggle(attribute.key, value.value)
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm">
                    {value.value} ({value.count})
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
