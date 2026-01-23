"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface ApiResponse {
  success: boolean;
  data: FeaturedItem[];
  meta?: {
    total: number;
    skip: number;
    take: number;
    originalTotal: number;
  };
}

interface FeaturedItem {
  id: string;
  product_id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  badge_text: string | null;
  badge_color: string;
  button_text: string;
  button_link: string | null;
  layout_type: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product: {
    id: string;
    title: string;
    slug: string;
    short_description?: string | null;
    brand: {
      name: string;
    };
    main_category: {
      name: string;
    } | null;
    skus: Array<{
      id: string;
      sku_code: string;
      prices: Array<{
        sale_price: string;
        currency: string;
      }>;
      inventory: Array<{
        qty_on_hand: number;
        qty_reserved: number;
      }>;
    }>;
  };
}

export default function CompactFeaturedRow() {
  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const res = await fetch(`${apiUrl}/featured-products?limit=20`);
        if (!res.ok) throw new Error("fetch failed");
        const json: ApiResponse = await res.json();
        if (json.success) setItems(json.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading)
    return (
      <div className="flex gap-6 p-6">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="w-[280px] h-[460px] bg-neutral-100 rounded-2xl animate-pulse"
          />
        ))}
      </div>
    );

  if (!items.length) return null;

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-8">
          Featured Products
        </h2>

        <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-4">
          {items.map((item) => {
            const sku = item.product.skus?.[0];
            const price = sku?.prices?.[0];
            const inventoryList = sku?.inventory || [];
            const availableQty = inventoryList.reduce(
              (sum, inv) => sum + (inv.qty_on_hand - inv.qty_reserved),
              0,
            );
            const isInStock = availableQty > 0;
            const stockStatus = isInStock
              ? availableQty > 5
                ? "In Stock"
                : "Low Stock"
              : "Out of Stock";

            const formattedPrice =
              price?.sale_price && price?.currency
                ? new Intl.NumberFormat("en-IE", {
                    style: "currency",
                    currency: price.currency,
                  }).format(Number(price.sale_price))
                : null;

            const categoryName =
              item.product.main_category?.name || "Uncategorized";

            const imageUrl = item.image_url || "/placeholder.png";
            const productLink =
              item.button_link || `/products/${item.product.slug}`;
            const displayTitle = item.title || item.product.title;
            const displaySubtitle =
              item.subtitle ||
              item.product.short_description
                ?.replace(/<[^>]+>/g, "")
                .slice(0, 80) ||
              "";

            return (
              <Link
                key={item.id}
                href={productLink}
                className="snap-start flex-shrink-0"
              >
                <div className="group w-[280px] h-[460px] bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col transition hover:shadow-lg">
                  <div className="relative h-[180px] rounded-xl bg-neutral-50 mb-3 overflow-hidden">
                    <Image
                      src={imageUrl}
                      alt={displayTitle}
                      fill
                      priority={item.sort_order <= 2}
                      sizes="280px"
                      className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
                    />

                    {item.badge_text && (
                      <span
                        className={`absolute top-2 left-2 text-[10px] font-semibold uppercase text-white px-2 py-0.5 rounded-full ${
                          item.badge_color || "bg-gray-500"
                        }`}
                      >
                        {item.badge_text}
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">
                    {item.product.brand.name}
                  </p>

                  <h3 className="text-sm font-semibold text-neutral-800 line-clamp-2 mt-1">
                    {displayTitle}
                  </h3>

                  {displaySubtitle && (
                    <p className="text-[11px] text-neutral-500 line-clamp-2 mt-1">
                      {displaySubtitle}
                    </p>
                  )}

                  <span className="inline-block mt-2 w-fit text-[10px] uppercase px-2 py-1 rounded-full bg-neutral-100 text-neutral-600">
                    {categoryName}
                  </span>

                  <div className="mt-auto pt-3 border-t border-neutral-100 space-y-3">
                    <div className="text-lg font-mono font-semibold text-neutral-900">
                      {formattedPrice}
                    </div>

                    <div
                      className={`w-full h-9 flex items-center justify-center rounded-lg text-xs font-semibold uppercase tracking-wide transition ${
                        isInStock
                          ? "bg-neutral-900 text-white group-hover:bg-neutral-800"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {!isInStock
                        ? "Out of Stock"
                        : item.button_text || "View Product"}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          scrollbar-width: none;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </section>
  );
}
