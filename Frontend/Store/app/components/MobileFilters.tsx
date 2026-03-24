"use client";

import { useState } from "react";
import { SidebarFilters } from "./SidebarFilters";
import { FilterOptions, ProductFilters } from "../lib/products";

interface MobileFiltersProps {
  filterOptions: FilterOptions;
  filters: ProductFilters;
  onFilterChange: (filters: ProductFilters) => void;
}

/** Count how many filter groups are currently active. */
function countActiveFilters(
  filters: ProductFilters,
  priceRange: FilterOptions["price_range"]
): number {
  let count = 0;
  if (filters.categories?.length) count += 1;
  if (filters.brand) count += 1;
  if (filters.attributes?.length) count += 1;
  if (filters.featured_only) count += 1;
  if (
    (filters.min_price !== undefined &&
      filters.min_price !== priceRange.min) ||
    (filters.max_price !== undefined && filters.max_price !== priceRange.max)
  )
    count += 1;
  return count;
}

export function MobileFilters({
  filterOptions,
  filters,
  onFilterChange,
}: MobileFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const activeCount = countActiveFilters(filters, filterOptions.price_range);

  return (
    <>
      {/* ── Trigger button ── */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 lg:hidden"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        Filters
        {activeCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#0B123A] px-1 text-[10px] font-bold text-white leading-none">
            {activeCount}
          </span>
        )}
      </button>

      {/* ── Drawer overlay ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-in panel */}
          <div className="fixed inset-y-0 right-0 flex w-full max-w-sm flex-col bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">
                Filters
                {activeCount > 0 && (
                  <span className="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#0B123A] px-1 text-[10px] font-bold text-white leading-none">
                    {activeCount}
                  </span>
                )}
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close filters"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Filter content — scrollable */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <SidebarFilters
                filterOptions={filterOptions}
                filters={filters}
                onFilterChange={(newFilters) => {
                  onFilterChange(newFilters);
                  setIsOpen(false);
                }}
              />
            </div>

            {/* Footer — Apply button */}
            <div className="border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full rounded-full bg-[#0B123A] py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1a245a] focus:outline-none focus:ring-2 focus:ring-[#0B123A] focus:ring-offset-2"
              >
                See results
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
