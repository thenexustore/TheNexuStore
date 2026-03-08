"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import HomeProductSection from "./HomeProductSection";
import { API_URL } from "../lib/env";
import { Product } from "../lib/products";
import { RefreshCcw, ShieldCheck, Truck } from "lucide-react";

type Section = {
  id: string;
  type: string;
  title?: string;
  config_json: Record<string, any>;
  data: any;
  failed?: boolean;
};

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
    <section className="w-full max-w-7xl px-4 pt-4 sm:px-6">
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
    <section className="w-full max-w-7xl px-4 sm:px-6">
      <h2 className="mb-4 text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        {items.map((item) => {
          const card = (
            <div className="rounded-xl border bg-white px-3 py-4 text-sm font-medium text-slate-700 hover:border-slate-300 hover:shadow-sm transition">
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
    <section className="w-full max-w-7xl px-4 sm:px-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map((item, i) => {
          const Icon = resolveIcon(item.icon);
          return (
            <div key={i} className="rounded-xl border bg-white px-4 py-3 text-sm text-slate-700 flex items-center gap-2">
              <Icon className="h-4 w-4 text-slate-500" />
              <span>{item.text}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

type SectionShellProps = {
  sectionId: string;
  highlightedId?: string | null;
  children: React.ReactNode;
};

function SectionShell({ sectionId, highlightedId, children }: SectionShellProps) {
  const highlighted = highlightedId === sectionId;
  return (
    <div className={highlighted ? "rounded-2xl ring-2 ring-slate-900/20 bg-slate-100/50" : ""}>
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

  if (loading) return <div className="w-full max-w-7xl px-4 sm:px-6 py-8 text-sm text-slate-500">{t("dynamic.loading")}</div>;

  return (
    <>
      {highlightedSectionId ? (
        <section className="w-full max-w-7xl px-4 sm:px-6 pt-2">
          <div className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs text-slate-600">
            {t("dynamic.previewMode")} <span className="font-mono">{highlightedSectionId}</span>
          </div>
        </section>
      ) : null}
      {sections.map((section) => {
        if (section.failed) {
          return <SectionShell key={section.id} sectionId={section.id} highlightedId={highlightedSectionId}><section className="w-full max-w-7xl px-4 sm:px-6"><div className="rounded-xl border border-dashed p-4 text-sm text-slate-500">{t("dynamic.sectionUnavailable")}</div></section></SectionShell>;
        }

        switch (section.type) {
          case "HERO_BANNER_SLIDER":
            return <SectionShell key={section.id} sectionId={section.id} highlightedId={highlightedSectionId}><BannerSection banners={section.data || []} /></SectionShell>;
          case "BEST_DEALS":
          case "NEW_ARRIVALS":
          case "FEATURED_PICKS":
            return <SectionShell key={section.id} sectionId={section.id} highlightedId={highlightedSectionId}><HomeProductSection title={section.title || section.type} products={(section.data || []) as Product[]} loading={false} emptyMessage={t("dynamic.emptyProducts")} carouselConfig={{
              enabled: Boolean(section.config_json.carousel_enabled ?? true),
              autoplay: Boolean(section.config_json.carousel_autoplay ?? true),
              autoplayIntervalMs: Number(section.config_json.carousel_interval_ms || 5000),
              itemsPerViewDesktop: Number(section.config_json.carousel_items_desktop || 4),
              itemsPerViewMobile: Number(section.config_json.carousel_items_mobile || 2),
            }} /></SectionShell>;
          case "TOP_CATEGORIES_GRID":
            return <SectionShell key={section.id} sectionId={section.id} highlightedId={highlightedSectionId}><SimpleListSection title={section.title || t("dynamic.topCategories")} buildHref={(slug) => `/products?categories=${slug || ""}`} items={(section.data || []).map((x: any) => ({ id: x.id, name: x.name, slug: x.slug }))} /></SectionShell>;
          case "BRANDS_STRIP":
            return <SectionShell key={section.id} sectionId={section.id} highlightedId={highlightedSectionId}><SimpleListSection title={section.title || t("dynamic.brands")} buildHref={(slug) => `/products?brand=${slug || ""}`} items={(section.data || []).map((x: any) => ({ id: x.id, name: x.name, slug: x.slug }))} /></SectionShell>;
          case "TRUST_BAR":
            return <SectionShell key={section.id} sectionId={section.id} highlightedId={highlightedSectionId}><TrustBar items={section.data || []} /></SectionShell>;
          default:
            return null;
        }
      })}
    </>
  );
}
