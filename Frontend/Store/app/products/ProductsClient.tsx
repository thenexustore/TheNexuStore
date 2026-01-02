"use client";

import { useSearchParams } from "next/navigation";
import ProductCard from "../components/ProductCard";
import { ProductFilters } from "../lib/products";
import { useProductData } from "../hooks/useProductData";
import { useURLSync } from "../hooks/useURLSync";
import { ProductGridSkeleton } from "../components/ProductGridSkeleton";
import { Pagination } from "../components/Pagination";
import { SidebarFilters } from "../components/SidebarFilters";
import { MobileFilters } from "../components/MobileFilters";

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const { updateURL } = useURLSync();

  const initialFilters: ProductFilters = {
    page: parseInt(searchParams.get("page") || "1"),
    limit: 20,
    search: searchParams.get("search") || undefined,
    category: searchParams.get("category") || undefined,
    brand: searchParams.get("brand") || undefined,
    sort_by: (searchParams.get("sort_by") as any) || "newest",
    min_price: searchParams.get("min_price")
      ? parseInt(searchParams.get("min_price")!)
      : undefined,
    max_price: searchParams.get("max_price")
      ? parseInt(searchParams.get("max_price")!)
      : undefined,
    in_stock_only: searchParams.get("in_stock_only") === "true",
    featured_only: searchParams.get("featured_only") === "true",
    attributes: searchParams.get("attributes")?.split(","),
  };

  const categoriesParam = searchParams.get("categories");
  if (categoriesParam) {
    initialFilters.categories = categoriesParam.split(",");
  }

  const {
    productsResponse,
    loading,
    error,
    filters,
    setFilters,
    filterOptions,
  } = useProductData(initialFilters);

  const handlePageChange = (page: number) => {
    const newFilters = { ...filters, page };
    setFilters(newFilters);
    updateURL(newFilters);
  };

  const handleSortChange = (sortBy: string) => {
    const newFilters = { ...filters, sort_by: sortBy as any, page: 1 };
    setFilters(newFilters);
    updateURL(newFilters);
  };

  const handleFilterChange = (newFilters: ProductFilters) => {
    setFilters(newFilters);
    updateURL(newFilters);
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-white text-black">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">All Products</h1>
        <p className="mt-2 text-gray-600">
          {productsResponse?.total || 0} products found
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {filterOptions && (
          <div className="hidden lg:block w-64 flex-shrink-0">
            <SidebarFilters
              filterOptions={filterOptions}
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          </div>
        )}

        <div className="flex-1">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {filterOptions && (
                <MobileFilters
                  filterOptions={filterOptions}
                  filters={filters}
                  onFilterChange={handleFilterChange}
                />
              )}
              <span className="text-sm text-gray-600 hidden lg:inline">
                Sort by:
              </span>
              <select
                value={filters.sort_by}
                onChange={(e) => handleSortChange(e.target.value)}
                className="rounded-full border border-gray-300 bg-gray-100 px-4 py-2 text-sm outline-none text-black"
              >
                <option value="newest">Newest</option>
                <option value="price_low_to_high">Price: Low to High</option>
                <option value="price_high_to_low">Price: High to Low</option>
                <option value="highest_rated">Highest Rated</option>
                <option value="most_reviewed">Most Reviewed</option>
                <option value="name_a_to_z">Name: A to Z</option>
                <option value="name_z_to_a">Name: Z to A</option>
              </select>
            </div>
          </div>

          {error ? (
            <div className="text-center text-red-500">{error}</div>
          ) : loading ? (
            <ProductGridSkeleton />
          ) : productsResponse?.products.length === 0 ? (
            <div className="py-12 text-center">
              <h3 className="text-xl font-semibold">No products found</h3>
              <p className="mt-2 text-gray-600">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                {productsResponse?.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {productsResponse && productsResponse.total_pages > 1 && (
                <Pagination
                  currentPage={filters.page || 1}
                  totalPages={productsResponse.total_pages}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
