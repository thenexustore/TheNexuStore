import React from 'react';
import { ProductFilters as FilterType } from '../lib/products';

interface ProductFiltersProps {
  filters: FilterType;
  onFilterChange: (filters: Partial<FilterType>) => void;
  availableFilters?: {
    categories: Array<{ id: string; name: string; slug: string; count: number }>;
    brands: Array<{ id: string; name: string; slug: string; count: number }>;
    price_range: { min: number; max: number };
    attributes: Array<{ key: string; name: string; values: Array<{ value: string; count: number }> }>;
  };
}

const ProductFilters: React.FC<ProductFiltersProps> = ({
  filters,
  onFilterChange,
  availableFilters,
}) => {
  const handleCategoryChange = (categorySlug: string) => {
    const currentCategories = filters.categories || [];
    const newCategories = currentCategories.includes(categorySlug)
      ? currentCategories.filter(c => c !== categorySlug)
      : [...currentCategories, categorySlug];
    
    onFilterChange({ categories: newCategories });
  };

  const handleBrandChange = (brandSlug: string) => {
    onFilterChange({ brand: filters.brand === brandSlug ? undefined : brandSlug });
  };

  const handlePriceChange = (min?: number, max?: number) => {
    onFilterChange({ min_price: min, max_price: max });
  };

  const handleStockChange = () => {
    onFilterChange({ in_stock_only: !filters.in_stock_only });
  };

  const clearFilters = () => {
    onFilterChange({
      search: undefined,
      category: undefined,
      brand: undefined,
      categories: undefined,
      min_price: undefined,
      max_price: undefined,
      in_stock_only: false,
      featured_only: false,
      page: 1,
    });
  };

  return (
    <div className="space-y-6 rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filters</h3>
        <button
          onClick={clearFilters}
          className="text-sm text-blue-600 hover:underline"
        >
          Clear all
        </button>
      </div>

      {/* Categories */}
      {availableFilters?.categories && availableFilters.categories.length > 0 && (
        <div>
          <h4 className="mb-3 font-medium">Categories</h4>
          <div className="space-y-2">
            {availableFilters.categories.map((category) => (
              <label key={category.id} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(filters.categories || []).includes(category.slug)}
                  onChange={() => handleCategoryChange(category.slug)}
                  className="mr-2 rounded"
                />
                <span className="text-sm">
                  {category.name} ({category.count})
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Brands */}
      {availableFilters?.brands && availableFilters.brands.length > 0 && (
        <div>
          <h4 className="mb-3 font-medium">Brands</h4>
          <div className="space-y-2">
            {availableFilters.brands.map((brand) => (
              <label key={brand.id} className="flex items-center">
                <input
                  type="radio"
                  name="brand"
                  checked={filters.brand === brand.slug}
                  onChange={() => handleBrandChange(brand.slug)}
                  className="mr-2"
                />
                <span className="text-sm">
                  {brand.name} ({brand.count})
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Price Range */}
      {availableFilters?.price_range && (
        <div>
          <h4 className="mb-3 font-medium">Price Range</h4>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.min_price || ''}
                onChange={(e) => handlePriceChange(e.target.value ? parseInt(e.target.value) : undefined, filters.max_price)}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
              <input
                type="number"
                placeholder="Max"
                value={filters.max_price || ''}
                onChange={(e) => handlePriceChange(filters.min_price, e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </div>
            <div className="text-xs text-gray-500">
              Range: €{availableFilters.price_range.min.toFixed(2)} - €{availableFilters.price_range.max.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Stock Filter */}
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={filters.in_stock_only || false}
            onChange={handleStockChange}
            className="mr-2 rounded"
          />
          <span className="text-sm">In stock only</span>
        </label>
      </div>

      {/* Featured Filter */}
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={filters.featured_only || false}
            onChange={() => onFilterChange({ featured_only: !filters.featured_only })}
            className="mr-2 rounded"
          />
          <span className="text-sm">Featured products only</span>
        </label>
      </div>
    </div>
  );
};

export default ProductFilters;