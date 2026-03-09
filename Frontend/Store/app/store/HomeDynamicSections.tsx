"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import HomeProductSection from "./HomeProductSection";
import { API_URL } from "../lib/env";
import { Product } from "../lib/products";
import { ChevronLeft, ChevronRight, RefreshCcw, ShieldCheck, Truck } from "lucide-react";

type Section = {
  id: string;
  type: string;
  title?: string;
  config_json: Record<string, any>;
  data: any;
  failed?: boolean;
};

const PRIORITY_BRANDS = [
  "hp", "lenovo", "dell", "asus", "acer", "apple", "msi", "samsung", "lg", "sony", "philips", "xiaomi", "huawei", "tp-link", "aoc", "epson", "canon", "brother", "apc", "amd", "intel", "gigabyte", "zotac", "nvidia", "sandisk", "kingston"
];

function resolveAssetUrl(value?: string) {
  const raw = String(value || "").trim();
  if (!raw) return "/No_Image_Available.png";
  if (raw.startsWith("data:") || raw.startsWith("blob:")) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("/")) {
    if (raw === "/No_Image_Available.png") return raw;
    return `${API_URL}${raw}`;
  }
  if (/^https?:\/\//i.test(raw)) return raw.replace(/^http:\/\//i, "https://");
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(raw)) return `https://${raw}`;
  const normalized = raw.replace(/^\/+/, "");
  return `${API_URL}/${normalized}`;
}

function brandInitials(name?: string) {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "BR";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
}

function initialsSvgDataUri(name?: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="48"><rect width="100%" height="100%" rx="8" fill="%23ffffff" stroke="%23e2e8f0"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="18" font-family="Arial, sans-serif" fill="%23475569">${brandInitials(name)}</text></svg>`)}`;
}

function isMissingLogoAsset(value?: string) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return true;
  return ["no_image_available", "placeholder", "default-logo", "default_brand", "no-logo", "logo-missing"].some((token) => raw.includes(token));
}

function resolveBrandOverrideLogo(brand: { id: string; name: string; slug?: string }, overrides?: Record<string, string>) {
  if (!overrides) return "";
  const candidates = [brand.id, brand.slug || "", String(brand.name || "").toLowerCase()]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  for (const key of candidates) {
    const exact = overrides[key];
    if (String(exact || "").trim()) return String(exact).trim();
    const lower = overrides[key.toLowerCase()];
    if (String(lower || "").trim()) return String(lower).trim();
  }
  return "";
}

function BannerSection({ banners }: { banners: any[] }) {
  const [index, setIndex] = useState(0);
  const safeBanners = useMemo(() => banners || [], [banners]);

  useEffect(() => {
    if (safeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % safeBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [safeBanners.length]);

  if (!safeBanners.length) return null;
  const banner = safeBanners[index];

  return (
    <section className="w-full px-4 pt-4 sm:px-6">
      <div className="relative h-52 overflow-hidden rounded-3xl border border-slate-200 shadow-sm sm:h-72 lg:h-80">
        <img
          src={String(banner.image || "/No_Image_Available.png")}
          alt={banner.title_text || "Banner"}
          className="h-full w-full object-cover"
          loading="eager"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = "/No_Image_Available.png";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/55 via-slate-900/25 to-transparent" />
        <div className="absolute inset-0" style={{ background: banner.overlay }} />
        <div className="absolute inset-0 flex flex-col justify-end gap-2 p-5 text-white sm:p-8">
          <h2 className="text-2xl font-bold sm:text-4xl">{banner.title_text}</h2>
          <p className="max-w-2xl text-sm sm:text-base">{banner.subtitle_text}</p>
          {banner.button_text ? (
            <Link href={banner.button_link || "/products"} className="mt-2 w-fit rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow">
              {banner.button_text}
            </Link>
          ) : null}
        </div>
        {safeBanners.length > 1 ? (
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/35 px-2 py-1">
            {safeBanners.map((_, idx) => (
              <button key={idx} onClick={() => setIndex(idx)} className={`h-1.5 rounded-full transition-all ${idx === index ? "w-5 bg-white" : "w-1.5 bg-white/60"}`} aria-label={`Banner ${idx + 1}`} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SimpleListSection({
  title,
  items,
  buildHref,
}: {
  title: string;
  items: Array<{ id: string; name: string; slug?: string }>;
  buildHref?: (slug?: string) => string;
}) {
  if (!items.length) return null;
  return (
    <section className="w-full px-4 sm:px-6">
      <h2 className="mb-4 text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        {items.map((item) => {
          const card = (
            <div className="flex min-h-[64px] items-center rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm">
              {item.name}
            </div>
          );

          if (!buildHref || !item.slug) {
            return <div key={item.id}>{card}</div>;
          }

          return (
            <Link key={item.id} href={buildHref(item.slug)}>
              {card}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function BrandLogoCarousel({
  title,
  items,
  logoOverrides,
  carouselConfig,
}: {
  title: string;
  items: Array<{ id: string; name: string; slug?: string; logo_url?: string; image?: string }>;
  logoOverrides?: Record<string, string>;
  carouselConfig?: {
    enabled?: boolean;
    autoplay?: boolean;
    autoplayIntervalMs?: number;
    itemsPerViewDesktop?: number;
    itemsPerViewMobile?: number;
  };
}) {
  if (!items.length) return null;

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(3);

  const carouselEnabled = Boolean(carouselConfig?.enabled ?? true);
  const autoplay = Boolean(carouselConfig?.autoplay ?? false);
  const autoplayIntervalMs = Math.max(2000, Number(carouselConfig?.autoplayIntervalMs || 5000));
  const mobileItems = Math.min(4, Math.max(1, Number(carouselConfig?.itemsPerViewMobile || 2)));
  const desktopItems = Math.min(10, Math.max(2, Number(carouselConfig?.itemsPerViewDesktop || 8)));

  const sorted = [...items].sort((a, b) => {
    const ai = PRIORITY_BRANDS.indexOf(String(a.name || "").toLowerCase());
    const bi = PRIORITY_BRANDS.indexOf(String(b.name || "").toLowerCase());
    if (ai === -1 && bi === -1) return String(a.name).localeCompare(String(b.name));
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  useEffect(() => {
    if (!carouselEnabled) return;
    const updateItemsPerView = () => {
      const next = window.innerWidth >= 1024 ? desktopItems : mobileItems;
      setItemsPerView(next);
    };
    updateItemsPerView();
    window.addEventListener("resize", updateItemsPerView);
    return () => window.removeEventListener("resize", updateItemsPerView);
  }, [carouselEnabled, desktopItems, mobileItems]);

  const pageCount = useMemo(() => {
    if (!carouselEnabled) return 1;
    return Math.max(1, Math.ceil(sorted.length / Math.max(1, itemsPerView)));
  }, [carouselEnabled, itemsPerView, sorted.length]);

  const scrollToPage = (page: number) => {
    if (!scrollRef.current) return;
    const targetPage = ((page % pageCount) + pageCount) % pageCount;
    const pageWidth = scrollRef.current.clientWidth;
    scrollRef.current.scrollTo({ left: targetPage * pageWidth, behavior: "smooth" });
    setCurrentPage(targetPage);
  };

  useEffect(() => {
    if (!carouselEnabled || !autoplay || pageCount <= 1 || isHovering) return;
    const timer = setInterval(() => {
      scrollToPage(currentPage + 1);
    }, autoplayIntervalMs);
    return () => clearInterval(timer);
  }, [autoplay, autoplayIntervalMs, carouselEnabled, currentPage, isHovering, pageCount]);

  useEffect(() => {
    if (!carouselEnabled || !scrollRef.current) return;
    const el = scrollRef.current;
    const onScroll = () => {
      const pageWidth = el.clientWidth;
      if (!pageWidth) return;
      const page = Math.round(el.scrollLeft / pageWidth);
      if (page !== currentPage) setCurrentPage(page);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [carouselEnabled, currentPage]);

  return (
    <section className="w-full px-4 sm:px-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h2>
        {carouselEnabled && pageCount > 1 ? (
          <div className="flex items-center gap-2">
            <button className="rounded-lg border bg-white p-2" onClick={() => scrollToPage(currentPage - 1)} aria-label="Anterior marcas">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="rounded-lg border bg-white p-2" onClick={() => scrollToPage(currentPage + 1)} aria-label="Siguiente marcas">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
      <div
        ref={carouselEnabled ? scrollRef : null}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {sorted.map((brand) => {
          const overrideLogo = resolveBrandOverrideLogo(brand, logoOverrides);
          const rawLogo = String(overrideLogo || brand.logo_url || brand.image || "").trim();
          const logo = isMissingLogoAsset(rawLogo) ? initialsSvgDataUri(brand.name) : resolveAssetUrl(rawLogo);
          return (
            <Link
              key={brand.id}
              href={`/products?brand=${encodeURIComponent(brand.slug || "")}`}
              className="group min-w-[150px] snap-start rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow"
              title={brand.name}
              style={carouselEnabled ? { flexBasis: `calc((100% - ${(itemsPerView - 1) * 12}px) / ${itemsPerView})` } : undefined}
            >
              <div className="flex h-16 items-center justify-center rounded-lg bg-slate-50">
                <img
                  src={logo}
                  alt={brand.name}
                  className="max-h-10 max-w-[120px] object-contain"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = initialsSvgDataUri(brand.name);
                  }}
                />
              </div>
              <div className="mt-2 line-clamp-1 text-center text-xs font-medium text-slate-600">{brand.name}</div>
            </Link>
          );
        })}
      </div>
      {carouselEnabled && pageCount > 1 ? (
        <div className="mt-3 flex items-center justify-center gap-2">
          {Array.from({ length: pageCount }).map((_, idx) => (
            <button key={idx} className={`h-2.5 rounded-full transition-all ${idx === currentPage ? "w-6 bg-slate-900" : "w-2.5 bg-slate-300"}`} onClick={() => scrollToPage(idx)} aria-label={`Ir a página ${idx + 1}`} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function TrustBar({ items }: { items: Array<{ icon?: string; text: string }> }) {
  if (!items.length) return null;

  const resolveIcon = (icon?: string) => {
    const normalized = String(icon || "").toLowerCase();
    if (normalized.includes("truck")) return Truck;
    if (normalized.includes("shield")) return ShieldCheck;
    if (normalized.includes("refresh")) return RefreshCcw;
    return ShieldCheck;
  };

  return (
    <section className="w-full px-4 sm:px-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {items.map((item, i) => {
          const Icon = resolveIcon(item.icon);
          return (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
              <Icon className="h-4 w-4 text-slate-500" />
              <span>{item.text}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}


function isEmptyRenderableSection(section: Section) {
  const list = Array.isArray(section.data) ? section.data : [];
  if (section.type === "TRUST_BAR") return list.length === 0;
  if (["BEST_DEALS", "NEW_ARRIVALS", "FEATURED_PICKS", "TOP_CATEGORIES_GRID", "BRANDS_STRIP", "HERO_BANNER_SLIDER"].includes(section.type)) {
    return list.length === 0;
  }
  return false;
}

type SectionShellProps = {
  sectionId: string;
  highlightedId?: string | null;
  children: React.ReactNode;
};

function SectionShell({ sectionId, highlightedId, children }: SectionShellProps) {
  const highlighted = highlightedId === sectionId;
  return (
    <div className={`w-full ${highlighted ? "rounded-2xl ring-2 ring-slate-900/20 bg-slate-100/50" : ""}`}>
      {children}
    </div>
  );
}

export default function HomeDynamicSections() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const t = useTranslations("home");
  const highlightedSectionId = searchParams.get("highlightSection");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/homepage/sections`, { cache: "no-store" });
        const json = await res.json();
        setSections((json.data || []) as Section[]);
      } catch {
        setSections([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="w-full px-4 sm:px-6 py-8 text-sm text-slate-500">{t("dynamic.loading")}</div>;

  return (
    <>
      {highlightedSectionId ? (
        <section className="w-full px-4 sm:px-6 pt-2">
          <div className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs text-slate-600">
            {t("dynamic.previewMode")} <span className="font-mono">{highlightedSectionId}</span>
          </div>
        </section>
      ) : null}
      {sections.map((section) => {
        if (section.failed) {
          return <SectionShell key={section.id} sectionId={section.id} highlightedId={highlightedSectionId}><section className="w-full px-4 sm:px-6"><div className="rounded-xl border border-dashed p-4 text-sm text-slate-500">{t("dynamic.sectionUnavailable")}</div></section></SectionShell>;
        }

        if (!highlightedSectionId && isEmptyRenderableSection(section)) {
          return null;
        }

        const sectionConfig = section.config_json || {};

        switch (section.type) {
          case "HERO_BANNER_SLIDER":
            return <SectionShell key={section.id} sectionId={section.id} highlightedId={highlightedSectionId}><BannerSection banners={section.data || []} /></SectionShell>;
          case "BEST_DEALS":
          case "NEW_ARRIVALS":
          case "FEATURED_PICKS":
            return <SectionShell key={section.id} sectionId={section.id} highlightedId={highlightedSectionId}><HomeProductSection title={section.title || section.type} products={(section.data || []) as Product[]} loading={false} emptyMessage={t("dynamic.emptyProducts")} carouselConfig={{
              enabled: Boolean(sectionConfig.carousel_enabled ?? true),
              autoplay: Boolean(sectionConfig.carousel_autoplay ?? true),
              autoplayIntervalMs: Number(sectionConfig.carousel_interval_ms || 5000),
              itemsPerViewDesktop: Number(sectionConfig.carousel_items_desktop || 4),
              itemsPerViewMobile: Number(sectionConfig.carousel_items_mobile || 2),
            }} /></SectionShell>;
          case "TOP_CATEGORIES_GRID":
            return <SectionShell key={section.id} sectionId={section.id} highlightedId={highlightedSectionId}><SimpleListSection title={section.title || t("dynamic.topCategories")} buildHref={(slug) => `/products?categories=${slug || ""}`} items={(section.data || []).map((x: any) => ({ id: x.id, name: x.name, slug: x.slug }))} /></SectionShell>;
          case "BRANDS_STRIP":
            return <SectionShell key={section.id} sectionId={section.id} highlightedId={highlightedSectionId}><BrandLogoCarousel title={section.title || t("dynamic.brands")} items={(section.data || []).map((x: any) => ({ id: x.id, name: x.name, slug: x.slug, logo_url: x.logo_url, image: x.image }))} logoOverrides={(sectionConfig.logo_overrides || {}) as Record<string, string>} carouselConfig={{ enabled: Boolean(sectionConfig.carousel_enabled ?? true), autoplay: Boolean(sectionConfig.carousel_autoplay ?? false), autoplayIntervalMs: Number(sectionConfig.carousel_interval_ms || 5000), itemsPerViewDesktop: Number(sectionConfig.carousel_items_desktop || 8), itemsPerViewMobile: Number(sectionConfig.carousel_items_mobile || 2) }} /></SectionShell>;
          case "TRUST_BAR":
            return <SectionShell key={section.id} sectionId={section.id} highlightedId={highlightedSectionId}><TrustBar items={section.data || []} /></SectionShell>;
          default:
            return null;
        }
      })}
    </>
  );
}
