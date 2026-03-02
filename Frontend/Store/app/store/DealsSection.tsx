"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import HomeProductSection from "./HomeProductSection";
import { productAPI, Product } from "../lib/products";
import { getCachedData } from "../lib/home-cache";

export default function DealsSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const t = useTranslations("home");

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
      title={t("deals")}
      products={products}
      loading={loading}
      emptyMessage={t("dealsEmpty")}
    />
  );
}
