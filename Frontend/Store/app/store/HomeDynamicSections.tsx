"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import HomeProductSection from "./HomeProductSection";
import { Product } from "../lib/products";

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
      <div className="relative h-52 overflow-hidden rounded-2xl sm:h-72 lg:h-80">
        <Image
          src={banner.image}
          alt={banner.title_text || "Banner"}
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0" style={{ background: banner.overlay }} />
        <div className="absolute inset-0 flex flex-col justify-end gap-2 p-5 text-white sm:p-8">
          <h2 className="text-2xl font-bold sm:text-4xl">{banner.title_text}</h2>
          <p className="max-w-2xl text-sm sm:text-base">{banner.subtitle_text}</p>
          {banner.button_text ? (
            <Link href={banner.button_link || "/products"} className="mt-2 w-fit rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-900">
              {banner.button_text}
            </Link>
          ) : null}
        </div>
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
  return (
    <section className="w-full max-w-7xl px-4 sm:px-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl border bg-white px-4 py-3 text-sm text-slate-700">{item.text}</div>
        ))}
      </div>
    </section>
  );
}

export default function HomeDynamicSections() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const res = await fetch(`${apiUrl}/homepage/sections`, { cache: "no-store" });
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

  if (loading) return <div className="w-full max-w-7xl px-4 sm:px-6 py-8 text-sm text-slate-500">Loading homepage...</div>;

  return (
    <>
      {sections.map((section) => {
        if (section.failed) {
          return <section key={section.id} className="w-full max-w-7xl px-4 sm:px-6"><div className="rounded-xl border border-dashed p-4 text-sm text-slate-500">Section unavailable.</div></section>;
        }

        switch (section.type) {
          case "HERO_BANNER_SLIDER":
            return <BannerSection key={section.id} banners={section.data || []} />;
          case "BEST_DEALS":
          case "NEW_ARRIVALS":
          case "FEATURED_PICKS":
            return <HomeProductSection key={section.id} title={section.title || section.type} products={(section.data || []) as Product[]} loading={false} emptyMessage="No items available" />;
          case "TOP_CATEGORIES_GRID":
            return <SimpleListSection key={section.id} title={section.title || "Top Categories"} buildHref={(slug) => `/products?categories=${slug || ""}`} items={(section.data || []).map((x: any) => ({ id: x.id, name: x.name, slug: x.slug }))} />;
          case "BRANDS_STRIP":
            return <SimpleListSection key={section.id} title={section.title || "Brands"} buildHref={(slug) => `/products?brand=${slug || ""}`} items={(section.data || []).map((x: any) => ({ id: x.id, name: x.name, slug: x.slug }))} />;
          case "TRUST_BAR":
            return <TrustBar key={section.id} items={section.data || []} />;
          default:
            return null;
        }
      })}
    </>
  );
}
