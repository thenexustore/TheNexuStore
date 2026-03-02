"use client";

import { useEffect, useState } from "react";
import HomeProductSection from "./HomeProductSection";
import { productAPI, Product } from "../lib/products";
import { getCachedData } from "../lib/home-cache";

export default function DealsSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const deals = await getCachedData("home:deals", 60_000, async () => {
          const response = await productAPI.getProducts({
            limit: 48,
            sort_by: "newest",
            in_stock_only: true,
          });

          return (response.products || [])
            .filter(
              (product) =>
                typeof product.compare_at_price === "number" &&
                product.compare_at_price > product.price,
            )
            .sort(
              (a, b) =>
                (b.discount_percentage || 0) - (a.discount_percentage || 0),
            )
            .slice(0, 12);
        });

        setProducts(deals);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <HomeProductSection
      title="Ofertas"
      products={products}
      loading={loading}
      emptyMessage="No hay ofertas activas en este momento."
    />
  );
}
