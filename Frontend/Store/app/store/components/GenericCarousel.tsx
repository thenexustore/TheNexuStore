"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { API_URL } from "../../lib/env";
import { Product } from "../../lib/products";

export type GenericCarouselType = "products" | "categories" | "brands";
export type GenericCarouselFilterType =
  | "category"
  | "brand"
  | "recent"
  | "featured";

interface ItemsPerView {
  mobile: number;
  tablet: number;
  desktop: number;
}

interface CarouselBrand {
  id: string;
  name: string;
  slug?: string;
  logo_url?: string;
  image?: string;
  product_count?: number;
}

interface CarouselCategory {
  id: string;
  name: string;
  slug: string;
}

interface GenericCarouselProps {
  type: GenericCarouselType;
  filterType: GenericCarouselFilterType;
  filterId?: string;
  title: string;
  autoplay?: boolean;
  autoplayIntervalMs?: number;
  itemsPerView?: ItemsPerView;
  maxItems?: number;
  items?: Array<Product | CarouselBrand | CarouselCategory>;
}

const DEFAULT_ITEMS_PER_VIEW: ItemsPerView = {
  mobile: 2,
  tablet: 3,
  desktop: 4,
};

function toApiImage(url?: string) {
  const raw = String(url || "").trim();
  if (!raw) return "/No_Image_Available.png";
  if (
    raw.startsWith("http") ||
    raw.startsWith("data:") ||
    raw.startsWith("blob:") ||
    raw.startsWith("/")
  ) {
    return raw;
  }
  return `${API_URL}/${raw.replace(/^\/+/, "")}`;
}

function parseApiList(payload: unknown): unknown[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (typeof payload !== "object") return [];

  const data = payload as Record<string, unknown>;
  if (typeof data.success === "boolean" && data.success === false) return [];
  if (Array.isArray(data.products)) return data.products;
  if (Array.isArray(data.items)) return data.items;
  if (data.data && typeof data.data === "object") {
    const nested = data.data as Record<string, unknown>;
    if (Array.isArray(nested.products)) return nested.products;
    if (Array.isArray(nested.items)) return nested.items;
    if (Array.isArray(nested.sections)) return nested.sections;
    if (Array.isArray(nested.data)) return nested.data;
  }
  if (Array.isArray(data.data)) return data.data;
  return [];
}

export default function GenericCarousel({
  type,
  filterType,
  filterId,
  title,
  items = [],
  autoplay = true,
  autoplayIntervalMs = 4500,
  itemsPerView = DEFAULT_ITEMS_PER_VIEW,
  maxItems = 20,
}: GenericCarouselProps) {
  const [remoteItems, setRemoteItems] = useState<Array<Product | CarouselBrand | CarouselCategory>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [page, setPage] = useState(0);
  const [perView, setPerView] = useState(itemsPerView.mobile);
  // Gap mirrors the CSS: gap-3 (12px) on mobile, sm:gap-4 (16px) on tablet, lg:gap-5 (20px) on desktop
  const [currentGap, setCurrentGap] = useState(12);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (items.length > 0) return;

    const load = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ limit: String(maxItems) });
        let endpoint = "";

        if (type === "products") {
          if (filterType === "category" && filterId) {
            params.set("filter[category]", filterId);
          }
          if (filterType === "brand" && filterId) {
            params.set("filter[brand]", filterId);
          }
          if (filterType === "recent") {
            params.set("sort", "recent");
          }
          if (filterType === "featured") {
            params.set("sort", "featured");
          }
          endpoint = `${API_URL}/api/products?${params.toString()}`;
        } else if (type === "brands") {
          params.set("sort", "popularity");
          endpoint = `${API_URL}/api/brands?${params.toString()}`;
        } else if (type === "categories") {
          if (filterType === "category" && filterId) {
            params.set("parent_slug", filterId);
          }
          endpoint = `${API_URL}/api/categories?${params.toString()}`;
        }

        if (!endpoint) {
          setRemoteItems([]);
          return;
        }

        const res = await fetch(endpoint, { cache: "no-store" });
        if (!res.ok) {
          setRemoteItems([]);
          return;
        }
        const payload = await res.json().catch(() => null);
        const parsed = parseApiList(payload) as Array<
          Product | CarouselBrand | CarouselCategory
        >;
        setRemoteItems(parsed);
      } catch {
        setRemoteItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [items.length, maxItems, type, filterType, filterId]);

  useEffect(() => {
    const updatePerView = () => {
      if (window.innerWidth >= 1024) {
        setPerView(itemsPerView.desktop);
        setCurrentGap(20); // lg:gap-5
      } else if (window.innerWidth >= 768) {
        setPerView(itemsPerView.tablet);
        setCurrentGap(16); // sm:gap-4
      } else {
        setPerView(itemsPerView.mobile);
        setCurrentGap(12); // gap-3
      }
    };

    updatePerView();
    window.addEventListener("resize", updatePerView);
    return () => window.removeEventListener("resize", updatePerView);
  }, [itemsPerView.desktop, itemsPerView.mobile, itemsPerView.tablet]);

  const list = useMemo(
    () => (items.length ? items : remoteItems).slice(0, maxItems),
    [items, remoteItems, maxItems],
  );

  useEffect(() => {
    setPage(0);
  }, [type, filterType, filterId, maxItems, items.length]);

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(list.length / Math.max(1, perView))),
    [list.length, perView],
  );

  const scrollToPage = useCallback(
    (nextPage: number) => {
      if (!scrollRef.current) return;
      const safePage = ((nextPage % pageCount) + pageCount) % pageCount;
      // Each page starts at: page * (clientWidth + gap)
      // because: item_width = (W - (N-1)*gap)/N, so page_width = W + gap
      scrollRef.current.scrollTo({
        left: safePage * (scrollRef.current.clientWidth + currentGap),
        behavior: "smooth",
      });
      setPage(safePage);
    },
    [pageCount, currentGap],
  );

  useEffect(() => {
    if (!scrollRef.current) return;
    const node = scrollRef.current;
    const onScroll = () => {
      const width = node.clientWidth;
      if (!width) return;
      const pageWidth = width + currentGap;
      // React bails out of re-render automatically if value hasn't changed,
      // so the explicit !== check is not needed here.
      setPage(Math.round(node.scrollLeft / pageWidth));
    };

    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
    // Only re-register when the gap changes (breakpoint change), not on every page update.
  }, [currentGap]);

  useEffect(() => {
    if (!autoplay || pageCount <= 1 || isHovering) return;
    const interval = window.setInterval(() => {
      scrollToPage(page + 1);
    }, Math.max(2000, Number(autoplayIntervalMs || 4500)));
    return () => window.clearInterval(interval);
  }, [autoplay, autoplayIntervalMs, isHovering, page, pageCount, scrollToPage]);

  return (
    <section className="w-full px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl lg:text-4xl">{title}</h2>
        {pageCount > 1 ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollToPage(page - 1)}
              className="rounded-lg border bg-white p-2"
              aria-label="Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scrollToPage(page + 1)}
              className="rounded-lg border bg-white p-2"
              aria-label="Siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
          Cargando sección…
        </div>
      ) : !list.length ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
          No hay elementos para mostrar en este carrusel.
        </div>
      ) : (
        <>
          <div
            ref={scrollRef}
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:gap-4 lg:gap-5 [scrollbar-width:thin]"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            {type === "products"
              ? list.map((item) => {
                  const product = item as Product;
                  return (
                    <Link
                      key={product.id}
                      href={`/products/${product.slug}`}
                      className="snap-start rounded-xl border bg-white p-3"
                      style={{
                        flexBasis: `calc((100% - ${(perView - 1) * currentGap}px) / ${perView})`,
                        flexShrink: 0,
                      }}
                    >
                      <div className="relative mb-2 aspect-square">
                        <Image
                          src={toApiImage(product.thumbnail)}
                          alt={product.title}
                          fill
                          className="object-contain"
                        />
                      </div>
                      <p className="line-clamp-2 text-sm font-semibold">{product.title}</p>
                      <p className="text-xs text-slate-500">{product.brand_name}</p>
                    </Link>
                  );
                })
              : null}

            {type === "brands"
              ? list.map((item) => {
                  const brand = item as CarouselBrand;
                  return (
                    <Link
                      key={brand.id}
                      href={`/products?brand=${encodeURIComponent(brand.slug || brand.id)}`}
                      className="snap-start rounded-xl border bg-white p-3 text-center"
                      style={{
                        flexBasis: `calc((100% - ${(perView - 1) * currentGap}px) / ${perView})`,
                        flexShrink: 0,
                      }}
                    >
                      <div className="relative mx-auto mb-2 h-10 w-24">
                        <Image
                          src={toApiImage(brand.logo_url || brand.image)}
                          alt={brand.name}
                          fill
                          className="object-contain"
                        />
                      </div>
                      <p className="text-sm font-semibold">{brand.name}</p>
                      {typeof brand.product_count === "number" ? (
                        <p className="text-xs text-slate-500">{brand.product_count} productos</p>
                      ) : null}
                    </Link>
                  );
                })
              : null}

            {type === "categories"
              ? list.map((item) => {
                  const category = item as CarouselCategory;
                  return (
                    <Link
                      key={category.id}
                      href={`/products?categories=${encodeURIComponent(category.slug)}`}
                      className="snap-start rounded-xl border bg-white px-4 py-6 text-center text-sm font-semibold"
                      style={{
                        flexBasis: `calc((100% - ${(perView - 1) * currentGap}px) / ${perView})`,
                        flexShrink: 0,
                      }}
                    >
                      {category.name}
                    </Link>
                  );
                })
              : null}
          </div>

          {pageCount > 1 ? (
            <div className="mt-3 flex items-center justify-center gap-2">
              {Array.from({ length: pageCount }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => scrollToPage(index)}
                  className={`h-2.5 rounded-full transition-all ${
                    page === index ? "w-6 bg-slate-900" : "w-2.5 bg-slate-300"
                  }`}
                  aria-label={`Ir a página ${index + 1}`}
                />
              ))}
            </div>
          ) : null}
        </>
      )}
      </div>
    </section>
  );
}
