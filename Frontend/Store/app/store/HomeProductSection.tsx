"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { formatCurrency } from "../lib/currency";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Product } from "../lib/products";

interface CarouselConfig {
  enabled?: boolean;
  autoplay?: boolean;
  autoplayIntervalMs?: number;
  itemsPerViewDesktop?: number;
  itemsPerViewMobile?: number;
}

interface Props {
  title: string;
  products: Product[];
  loading: boolean;
  emptyMessage: string;
  carouselConfig?: CarouselConfig;
}

export default function HomeProductSection({
  title,
  products,
  loading,
  emptyMessage,
  carouselConfig,
}: Props) {
  const t = useTranslations("home");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(2);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);

  const carouselEnabled = Boolean(carouselConfig?.enabled);
  const autoplay = Boolean(carouselConfig?.autoplay ?? true);
  const autoplayIntervalMs = Math.max(2000, Number(carouselConfig?.autoplayIntervalMs || 5000));
  const mobileItems = Math.min(3, Math.max(1, Number(carouselConfig?.itemsPerViewMobile || 2)));
  const desktopItems = Math.min(6, Math.max(2, Number(carouselConfig?.itemsPerViewDesktop || 4)));
  // Gap mirrors the responsive CSS: gap-3 (12px) mobile, sm:gap-4 (16px) tablet, lg:gap-5 (20px) desktop
  const [currentGap, setCurrentGap] = useState(12);

  useEffect(() => {
    if (!carouselEnabled) return;

    const updateItemsPerView = () => {
      // Items per view: >= 1024px → desktopItems, otherwise → mobileItems
      // Gap mirrors responsive CSS: gap-3 (12px) < 640px, sm:gap-4 (16px) 640-1024px, lg:gap-5 (20px) >= 1024px
      if (window.innerWidth >= 1024) {
        setItemsPerView(desktopItems);
        setCurrentGap(20); // lg:gap-5
      } else {
        setItemsPerView(mobileItems);
        setCurrentGap(window.innerWidth >= 640 ? 16 : 12); // sm:gap-4 or gap-3
      }
    };

    updateItemsPerView();
    window.addEventListener("resize", updateItemsPerView);
    return () => window.removeEventListener("resize", updateItemsPerView);
  }, [carouselEnabled, desktopItems, mobileItems]);


  useEffect(() => {
    const onVisibility = () => {
      setIsPageVisible(document.visibilityState === "visible");
    };
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!isInteracting) return;
    const timer = window.setTimeout(() => setIsInteracting(false), 3500);
    return () => window.clearTimeout(timer);
  }, [isInteracting]);
  const pageCount = useMemo(() => {
    if (!carouselEnabled) return 1;
    return Math.max(1, Math.ceil(products.length / Math.max(1, itemsPerView)));
  }, [carouselEnabled, itemsPerView, products.length]);

  const scrollToPage = useCallback((page: number) => {
    if (!scrollRef.current) return;
    const targetPage = ((page % pageCount) + pageCount) % pageCount;
    // Each page starts at: page * (clientWidth + gap)
    // because item_width = (W - (N-1)*gap)/N, so page_width = W + gap
    const pageWidth = scrollRef.current.clientWidth + currentGap;
    scrollRef.current.scrollTo({ left: targetPage * pageWidth, behavior: "smooth" });
    setCurrentPage(targetPage);
  }, [pageCount, currentGap]);

  useEffect(() => {
    if (!carouselEnabled || !autoplay || pageCount <= 1 || isHovering || isInteracting || isFocusWithin || !isPageVisible) return;
    const timer = setInterval(() => {
      scrollToPage(currentPage + 1);
    }, autoplayIntervalMs);
    return () => clearInterval(timer);
  }, [autoplay, autoplayIntervalMs, carouselEnabled, currentPage, isHovering, isInteracting, isFocusWithin, isPageVisible, pageCount, scrollToPage]);

  useEffect(() => {
    if (!carouselEnabled || !scrollRef.current) return;
    const el = scrollRef.current;
    const onScroll = () => {
      const pageWidth = el.clientWidth + currentGap;
      if (!pageWidth) return;
      // The explicit !== guard avoids the setter call overhead on every scroll event.
      const next = Math.round(el.scrollLeft / pageWidth);
      if (next !== currentPage) setCurrentPage(next);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
    // Only re-register when gap or enabled state changes, not on every page update.
  }, [carouselEnabled, currentGap]);

  const card = (product: Product) => {
    const hasDeal =
      typeof product.compare_at_price === "number" &&
      product.compare_at_price > product.price;

    return (
      <Link
        key={product.id}
        href={`/products/${product.slug}`}
        className="group flex h-full min-w-0 flex-col rounded-2xl border border-slate-200/80 bg-white p-3 transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
      >
        <div className="relative mb-3 aspect-square overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-slate-100">
          <Image
            src={product.thumbnail || "/No_Image_Available.png"}
            alt={product.title}
            fill
            className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          {hasDeal && product.discount_percentage ? (
            <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold leading-none text-white shadow">
              -{product.discount_percentage}%
            </span>
          ) : null}
        </div>

        <p className="line-clamp-3 min-h-[4.5rem] break-words text-sm font-medium text-slate-800">{product.title}</p>
        <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{product.brand_name}</p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`text-base font-bold ${hasDeal ? "text-red-600" : "text-slate-900"}`}>
            {formatCurrency(product.price)}
          </span>
          {hasDeal && product.compare_at_price ? (
            <span className="text-xs text-slate-500 line-through">
              {formatCurrency(product.compare_at_price)}
            </span>
          ) : null}
        </div>
      </Link>
    );
  };

  return (
    <section className="w-full px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 px-4 py-3 lg:px-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl lg:text-4xl">{title}</h2>
        </div>
        {carouselEnabled && pageCount > 1 ? (
          <div className="flex items-center gap-2">
            <button className="rounded-lg border bg-white p-2" onClick={() => { setIsInteracting(true); scrollToPage(currentPage - 1); }} aria-label={t("dynamic.carouselPrev")}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="rounded-lg border bg-white p-2" onClick={() => { setIsInteracting(true); scrollToPage(currentPage + 1); }} aria-label={t("dynamic.carouselNext")}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 lg:gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-slate-200 p-3">
              <div className="mb-3 aspect-square rounded-lg bg-slate-200" />
              <div className="mb-2 h-4 rounded bg-slate-200" />
              <div className="mb-2 h-4 w-3/4 rounded bg-slate-200" />
              <div className="h-4 w-1/2 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
          {emptyMessage}
        </p>
      ) : carouselEnabled ? (
        <>
          <div
            className="space-y-2"
            onFocusCapture={() => setIsFocusWithin(true)}
            onKeyDownCapture={(event) => {
              if (["Tab", "ArrowLeft", "ArrowRight", "Enter", " ", "Spacebar", "Home", "End"].includes(event.key)) setIsInteracting(true);
            }}
            onBlurCapture={(event) => {
              const nextTarget = event.relatedTarget as Node | null;
              if (!event.currentTarget.contains(nextTarget)) setIsFocusWithin(false);
            }}
          >
          <div
            ref={scrollRef}
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 sm:gap-4 lg:gap-5 lg:[scrollbar-width:none] lg:[-ms-overflow-style:none] lg:[&::-webkit-scrollbar]:hidden"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onTouchStart={() => setIsInteracting(true)}
          >
            {products.map((product) => (
              <div
                key={product.id}
                className="snap-start shrink-0"
                style={{ flexBasis: `calc((100% - ${(itemsPerView - 1) * currentGap}px) / ${itemsPerView})` }}
              >
                {card(product)}
              </div>
            ))}
          </div>
          {pageCount > 1 ? (
            <div className="mt-3 flex items-center justify-center gap-2">
              {Array.from({ length: pageCount }).map((_, idx) => (
                <button
                  key={idx}
                  className={`h-2.5 rounded-full transition-all ${idx === currentPage ? "w-6 bg-slate-900" : "w-2.5 bg-slate-300"}`}
                  onClick={() => { setIsInteracting(true); scrollToPage(idx); }}
                  aria-label={t("dynamic.carouselGoToPage", { page: idx + 1 })}
                />
              ))}
            </div>
          ) : null}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 lg:gap-5">
          {products.map((product) => card(product))}
        </div>
      )}
      </div>
    </section>
  );
}
