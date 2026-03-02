"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import HomeProductSection from "./HomeProductSection";
import { Product } from "../lib/products";
import { getCachedData } from "../lib/home-cache";

interface FeaturedApiResponse {
  success: boolean;
  data: Array<{
    id: string;
    image_url?: string | null;
    product: {
      id: string;
      title: string;
      slug: string;
      brand: { name: string; slug: string };
      skus: Array<{
        prices: Array<{ sale_price: string; compare_at_price?: string | null }>;
      }>;
      media: Array<{ url: string }>;
    };
  }>;
}

export default function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const t = useTranslations("home");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCachedData("home:featured", 60_000, async () => {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
          const res = await fetch(`${apiUrl}/featured-products?limit=12`);
          if (!res.ok) throw new Error("Failed to fetch featured products");
          const json: FeaturedApiResponse = await res.json();

          return (json.data || []).map((item) => {
            const firstPrice = item.product.skus?.[0]?.prices?.[0];
            const price = Number(firstPrice?.sale_price || 0);
            const compareAt = firstPrice?.compare_at_price
              ? Number(firstPrice.compare_at_price)
              : undefined;
            const discountPercentage =
              compareAt && compareAt > price
                ? Math.round(((compareAt - price) / compareAt) * 100)
                : undefined;

            return {
              id: item.product.id,
              title: item.product.title,
              slug: item.product.slug,
              brand_name: item.product.brand.name,
              brand_slug: item.product.brand.slug,
              category_name: "",
              category_slug: "",
              sku_code: "",
              price,
              compare_at_price: compareAt,
              discount_percentage: discountPercentage,
              stock_quantity: 1,
              stock_status: "IN_STOCK",
              thumbnail: item.image_url || "/No_Image_Available.png",
              rating_count: 0,
              is_featured: true,
            } as Product;
          });
        });

        setProducts(data);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <HomeProductSection
      title={t("featured")}
      products={products}
      loading={loading}
      emptyMessage={t("featuredEmpty")}
    />
  );
}
