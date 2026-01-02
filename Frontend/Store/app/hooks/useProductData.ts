"use client";

import { useState, useEffect, useCallback } from "react";
import {
  productAPI,
  ProductResponse,
  ProductFilters,
  FilterOptions,
} from "../lib/products";

export function useProductData(initialFilters: ProductFilters) {
  const [productsResponse, setProductsResponse] =
    useState<ProductResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProductFilters>(initialFilters);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(
    null
  );

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
