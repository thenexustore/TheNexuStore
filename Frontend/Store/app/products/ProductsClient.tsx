"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import ProductCard from "../components/ProductCard";
import { FilterOptions, ProductFilters } from "../lib/products";
import { useProductData } from "../hooks/useProductData";
import { useURLSync } from "../hooks/useURLSync";
import { ProductGridSkeleton } from "../components/ProductGridSkeleton";
import { Pagination } from "../components/Pagination";
import { SidebarFilters } from "../components/SidebarFilters";
import { MobileFilters } from "../components/MobileFilters";

type SearchSuggestionItem = FilterOptions["categories"][number] &
  Partial<FilterOptions["brands"][number]>;

function SearchRefinePanel({
  title,
  hint,
  categoriesLabel,
  brandsLabel,
  relatedCategories,
  relatedBrands,
  onCategoryClick,
  onBrandClick,
  mobileLabel,
}: {
  title: string;
  hint: string;
  categoriesLabel: string;
  brandsLabel: string;
  relatedCategories: FilterOptions["categories"];
  relatedBrands: FilterOptions["brands"];
  onCategoryClick: (item: SearchSuggestionItem) => void;
  onBrandClick: (brandSlug: string) => void;
  mobileLabel: string;
}) {
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  if (!relatedCategories.length && !relatedBrands.length) {
    return null;
  }

  const totalSuggestions = relatedCategories.length + relatedBrands.length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setIsMobileExpanded((current) => !current)}
        className="sticky top-[4.5rem] z-20 flex w-full items-center justify-between gap-3 rounded-2xl border-b border-slate-200 bg-white/95 px-4 py-3 text-left backdrop-blur sm:hidden"
        aria-expanded={isMobileExpanded}
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {mobileLabel}
          </p>
          <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {totalSuggestions}
        </span>
      </button>

      <div className={`${isMobileExpanded ? "block" : "hidden"} p-4 sm:block sm:p-5`}>
        <div className="flex flex-col gap-5">
          <div className="hidden sm:block">
            <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{hint}</p>
          </div>

          {relatedCategories.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {categoriesLabel}
                </h3>
                <span className="text-xs font-medium text-slate-400 sm:hidden">
                  {relatedCategories.length}
                </span>
              </div>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                {relatedCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => onCategoryClick(category)}
                    className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-[#0B123A] hover:bg-white hover:text-[#0B123A]"
                  >
                    {category.display_name || category.name}
                    <span className="ml-2 text-slate-400">({category.count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {relatedBrands.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {brandsLabel}
                </h3>
                <span className="text-xs font-medium text-slate-400 sm:hidden">
                  {relatedBrands.length}
                </span>
              </div>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                {relatedBrands.map((brand) => (
                  <button
                    key={brand.id}
                    type="button"
                    onClick={() => onBrandClick(brand.slug)}
                    className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-[#0B123A] hover:bg-white hover:text-[#0B123A]"
                  >
                    {brand.name}
                    <span className="ml-2 text-slate-400">({brand.count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-slate-500 sm:hidden">{hint}</p>
        </div>
      </div>
    </div>
  );
}

function buildFiltersFromSearchParams(
  searchParams: ReturnType<typeof useSearchParams>,
): ProductFilters {
  const sortByParam = searchParams.get("sort_by") as ProductFilters["sort_by"];

  // Fix 4: Guard against NaN values from malformed query params
  const rawPage = parseInt(searchParams.get("page") ?? "1", 10);
  const rawMinPrice = parseInt(searchParams.get("min_price") ?? "", 10);
  const rawMaxPrice = parseInt(searchParams.get("max_price") ?? "", 10);

  const filters: ProductFilters = {
    page: Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage,
    limit: 20,
    search: searchParams.get("search") || undefined,
    category: searchParams.get("category") || undefined,
    brand: searchParams.get("brand") || undefined,
    sort_by: sortByParam || "newest",
    min_price: Number.isNaN(rawMinPrice) ? undefined : rawMinPrice,
    max_price: Number.isNaN(rawMaxPrice) ? undefined : rawMaxPrice,
    in_stock_only: true,
    // Return undefined instead of false so the param is omitted when inactive
    featured_only: searchParams.get("featured_only") === "true" ? true : undefined,
    // Fix 4: Filter out empty strings produced by splitting an empty param
    attributes: searchParams.get("attributes")
      ? searchParams.get("attributes")!.split(",").filter((s) => s.length > 0)
      : undefined,
  };

  const categoriesParam = searchParams.get("categories");
  if (categoriesParam) {
    // Fix 4: Filter out empty strings (e.g. trailing comma: "a,b,")
    const cats = categoriesParam.split(",").filter((s) => s.length > 0);
    if (cats.length > 0) {
      filters.categories = cats;
    }
  }

  return filters;
}

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const { updateURL } = useURLSync();
  const t = useTranslations("products");

  const initialFilters = useMemo(
    () => buildFiltersFromSearchParams(searchParams),
    [searchParams],
  );
  const activeSearchTerm = initialFilters.search?.trim() ?? "";

  const {
    productsResponse,
    loading,
    error,
    filters,
    setFilters,
    filterOptions,
  } = useProductData(initialFilters);

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters, setFilters]);

  const handlePageChange = (page: number) => {
    const newFilters = { ...filters, page };
    setFilters(newFilters);
    updateURL(newFilters);
  };

  const handleSortChange = (sortBy: string) => {
    const newFilters: ProductFilters = {
      ...filters,
      sort_by: sortBy as ProductFilters["sort_by"],
      page: 1,
    };
    setFilters(newFilters);
    updateURL(newFilters);
  };

  const handleFilterChange = (newFilters: ProductFilters) => {
    setFilters(newFilters);
    updateURL(newFilters);
  };

  const relatedCategories = useMemo(
    () =>
      [...(filterOptions?.categories ?? [])]
        .sort((a, b) => b.count - a.count)
        .slice(0, 6),
    [filterOptions?.categories],
  );

  const relatedBrands = useMemo(
    () =>
      [...(filterOptions?.brands ?? [])]
        .sort((a, b) => b.count - a.count)
        .slice(0, 6),
    [filterOptions?.brands],
  );

  const applyQuickCategory = (item: SearchSuggestionItem) => {
    const newFilters: ProductFilters = {
      ...filters,
      page: 1,
      category: item.slug,
      categories: undefined,
    };
    setFilters(newFilters);
    updateURL(newFilters);
  };

  const applyQuickBrand = (brandSlug: string) => {
    const newFilters: ProductFilters = {
      ...filters,
      page: 1,
      brand: brandSlug,
    };
    setFilters(newFilters);
    updateURL(newFilters);
  };

  const clearSearchAndFilters = () => {
    const newFilters: ProductFilters = {
      page: 1,
      limit: filters.limit,
      sort_by: filters.sort_by,
      in_stock_only: true,
    };
    setFilters(newFilters);
    updateURL(newFilters);
  };

  return (
    <div className="mx-auto w-full max-w-7xl overflow-x-clip px-4 py-6 text-black sm:px-6 lg:px-8">
      <div className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-800 p-5 text-white shadow-sm sm:p-8">
        <h1 className="break-words text-2xl font-bold sm:text-3xl lg:text-4xl">{t("all")}</h1>
        <p className="mt-2 text-sm text-indigo-100 sm:text-base">
          {t("found", {count: productsResponse?.total || 0})}
        </p>
        {activeSearchTerm && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-white/10 px-3 py-1 font-medium text-white/90">
              {t("searchTermLabel")}
            </span>
            <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-900">
              {activeSearchTerm}
            </span>
          </div>
        )}
      </div>

      {activeSearchTerm && (
        <div className="mb-6">
          <SearchRefinePanel
            title={t("searchRefineTitle")}
            hint={t("searchRefineHint")}
            categoriesLabel={t("relatedCategories")}
            brandsLabel={t("relatedBrands")}
            relatedCategories={relatedCategories}
            relatedBrands={relatedBrands}
            onCategoryClick={applyQuickCategory}
            onBrandClick={applyQuickBrand}
            mobileLabel={t("mobileRefineLabel")}
          />
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {filterOptions && (
          <div className="hidden lg:block w-64 xl:w-72 flex-shrink-0">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <SidebarFilters
              filterOptions={filterOptions}
              filters={filters}
              onFilterChange={handleFilterChange}
            />
            </div>
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
                <option value="price_low_to_high">{t("priceLowHigh")}</option>
                <option value="price_high_to_low">{t("priceHighLow")}</option>
                <option value="best_selling">{t("bestSelling")}</option>
                <option value="highest_rated">{t("highestRated")}</option>
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
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                  <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-800">{t("noProducts")}</h3>
                <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto">
                  {t("adjustFilters")}
                </p>
                {activeSearchTerm && (
                  <button
                    type="button"
                    onClick={clearSearchAndFilters}
                    className="mt-4 rounded-full bg-[#0B123A] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#1a245a]"
                  >
                    {t("clearSearchAndFilters")}
                  </button>
                )}
              </div>

              {activeSearchTerm && (
                <SearchRefinePanel
                  title={t("emptySearchRefineTitle")}
                  hint={t("emptySearchRefineHint")}
                  categoriesLabel={t("relatedCategories")}
                  brandsLabel={t("relatedBrands")}
                  relatedCategories={relatedCategories}
                  relatedBrands={relatedBrands}
                  onCategoryClick={applyQuickCategory}
                  onBrandClick={applyQuickBrand}
                  mobileLabel={t("mobileRefineLabel")}
                />
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 lg:gap-5">
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
