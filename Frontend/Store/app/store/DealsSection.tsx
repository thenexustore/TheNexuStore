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
          return productAPI.getDealsProducts(12, true);
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
