"use client";

import { useSearchParams } from "next/navigation";
import { ProductFilters } from "../lib/products";

export function useURLSync() {
  const searchParams = useSearchParams();

  const updateURL = (newFilters: ProductFilters) => {
    const params = new URLSearchParams(searchParams.toString());

    if (newFilters.page && newFilters.page > 1) {
      params.set("page", newFilters.page.toString());
    } else {
      params.delete("page");
    }

    if (newFilters.search) {
      params.set("search", newFilters.search);
    } else {
      params.delete("search");
    }

    if (newFilters.sort_by && newFilters.sort_by !== "newest") {
      params.set("sort_by", newFilters.sort_by);
    } else {
      params.delete("sort_by");
    }

    if (newFilters.category) {
      params.set("category", newFilters.category);
    } else {
      params.delete("category");
    }

    if (newFilters.brand) {
      params.set("brand", newFilters.brand);
    } else {
      params.delete("brand");
    }

    if (newFilters.min_price) {
      params.set("min_price", newFilters.min_price.toString());
    } else {
      params.delete("min_price");
    }

    if (newFilters.max_price) {
      params.set("max_price", newFilters.max_price.toString());
    } else {
      params.delete("max_price");
    }

    if (newFilters.in_stock_only === false) {
      params.set("in_stock_only", "false");
    } else {
      params.delete("in_stock_only");
    }

    if (newFilters.featured_only) {
      params.set("featured_only", "true");
    } else {
      params.delete("featured_only");
    }

    if (newFilters.categories && newFilters.categories.length > 0) {
      params.set("categories", newFilters.categories.join(","));
    } else {
      params.delete("categories");
    }

    if (newFilters.attributes && newFilters.attributes.length > 0) {
      params.set("attributes", newFilters.attributes.join(","));
    } else {
      params.delete("attributes");
    }

    const url = `?${params.toString()}`;
    window.history.pushState({}, "", url);
  };

  return { updateURL };
}
