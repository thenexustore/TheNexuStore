"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("products");

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
    <div className="mx-auto w-full max-w-7xl overflow-x-clip px-4 py-6 text-black sm:px-6">
      <div className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-800 p-5 text-white shadow-sm sm:p-8">
        <h1 className="break-words text-2xl font-bold sm:text-3xl">{t("all")}</h1>
        <p className="mt-2 text-sm text-indigo-100 sm:text-base">
          {t("found", {count: productsResponse?.total || 0})}
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
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="hidden text-sm font-medium text-slate-600 sm:block">
              {t("found", {count: productsResponse?.total || 0})}
            </p>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
              {filterOptions && (
                <MobileFilters
                  filterOptions={filterOptions}
                  filters={filters}
                  onFilterChange={handleFilterChange}
                />
              )}
              <span className="text-sm text-gray-600 hidden lg:inline">
                {t("sortBy")}
              </span>
              <select
                value={filters.sort_by}
                onChange={(e) => handleSortChange(e.target.value)}
                className="w-full min-w-0 rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm text-black outline-none ring-indigo-500 transition focus:ring-2 sm:w-auto"
              >
                <option value="newest">{t("newest")}</option>
                <option value="name_a_to_z">{t("nameAZ")}</option>
                <option value="name_z_to_a">{t("nameZA")}</option>
              </select>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600">{error}</div>
          ) : loading ? (
            <ProductGridSkeleton />
          ) : productsResponse?.products.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white py-12 text-center">
              <h3 className="text-xl font-semibold">{t("noProducts")}</h3>
              <p className="mt-2 text-gray-600">
                {t("adjustFilters")}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
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
