"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  productAPI,
  ProductResponse,
  ProductFilters,
  FilterOptions,
} from "../lib/products";

export function useProductData(
  initialFilters: ProductFilters,
  initialProductsResponse: ProductResponse | null = null,
) {
  const [productsResponse, setProductsResponse] =
    useState<ProductResponse | null>(initialProductsResponse);
  const [loading, setLoading] = useState(!initialProductsResponse);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProductFilters>(initialFilters);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(
    initialProductsResponse?.filters || null,
  );
  const shouldSkipInitialFetch = useRef(Boolean(initialProductsResponse));

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await productAPI.getProducts(filters);
      setProductsResponse(data);
      setFilterOptions(data.filters || null);
      setError(null);
    } catch (err) {
      setError("Failed to load products");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (shouldSkipInitialFetch.current) {
      shouldSkipInitialFetch.current = false;
      return;
    }

    fetchProducts();
  }, [fetchProducts]);

  return {
    productsResponse,
    loading,
    error,
    filters,
    setFilters,
    filterOptions,
    fetchProducts,
  };
}
