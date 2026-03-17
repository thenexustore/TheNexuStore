"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import GenericCarousel from "./components/GenericCarousel";
import BrandCarousel from "./components/BrandCarousel";
import TrustBarSection from "./components/TrustBar";
import { API_URL } from "../lib/env";
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
        <div
          className="absolute inset-0"
          style={{ background: banner.overlay }}
        />
        <div className="absolute inset-0 flex flex-col justify-end gap-2 p-5 text-white sm:p-8">
          <h2 className="text-2xl font-bold sm:text-4xl">
            {banner.title_text}
          </h2>
          <p className="max-w-2xl text-sm sm:text-base">
            {banner.subtitle_text}
          </p>
          {banner.button_text ? (
            <Link
              href={banner.button_link || "/products"}
              className="mt-2 w-fit rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow"
            >
              {banner.button_text}
            </Link>
          ) : null}
        </div>
        {safeBanners.length > 1 ? (
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/35 px-2 py-1">
            {safeBanners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${idx === index ? "w-5 bg-white" : "w-1.5 bg-white/60"}`}
                aria-label={`Banner ${idx + 1}`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}



function NewsletterSection({
  config,
  payload,
}: {
  config: Record<string, any>;
  payload: Record<string, any>;
}) {
  const title = String(
    payload?.title || config?.title || 'Suscríbete a nuestra newsletter',
  );
  const subtitle = String(
    payload?.subtitle ||
      config?.subtitle ||
      'Recibe ofertas, novedades y lanzamientos antes que nadie.',
  );
  const placeholder = String(payload?.placeholder || config?.placeholder || 'Tu email');
  const buttonText = String(payload?.button_text || config?.button_text || 'Suscribirme');
  const buttonLink = String(payload?.button_link || config?.button_link || '/register');

  return (
    <section className="w-full px-4 sm:px-6 py-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 to-slate-700 p-6 sm:p-8 text-white">
        <h3 className="text-xl sm:text-2xl font-bold">{title}</h3>
        <p className="mt-2 text-sm sm:text-base text-slate-200 max-w-2xl">{subtitle}</p>
        <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center">
          <input
            type="email"
            placeholder={placeholder}
            className="w-full sm:max-w-sm rounded-full border border-white/30 bg-white/10 px-4 py-2 text-white placeholder:text-slate-300 outline-none"
            readOnly
            aria-label={placeholder}
          />
          <Link
            href={buttonLink || '/register'}
            className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900"
          >
            {buttonText}
          </Link>
        </div>
      </div>
    </section>
  );
}

function extractSectionsFromPayload(payload: unknown): Section[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;

  if (Array.isArray(root.data)) return root.data as Section[];
  if (Array.isArray(root.sections)) return root.sections as Section[];

  if (root.data && typeof root.data === "object") {
    const nested = root.data as Record<string, unknown>;
    if (Array.isArray(nested.sections)) return nested.sections as Section[];
    if (Array.isArray(nested.data)) return nested.data as Section[];
  }

  return [];
}

function isEmptyRenderableSection(section: Section) {
  const list = Array.isArray(section.data) ? section.data : [];
  if (section.type === "TRUST_BAR") return list.length === 0;

  // Product sections must still render when empty so the UI can show
  // explicit empty-state messaging instead of silently disappearing.
  if (
    [
      "PRODUCT_CAROUSEL",
      "BEST_DEALS",
      "NEW_ARRIVALS",
      "FEATURED_PICKS",
    ].includes(section.type)
  ) {
    return false;
  }

  if (
    ["TOP_CATEGORIES_GRID", "BRANDS_STRIP", "HERO_BANNER_SLIDER"].includes(
      section.type,
    )
  ) {
    return list.length === 0;
  }

  return false;
}

type SectionShellProps = {
  sectionId: string;
  highlightedId?: string | null;
  children: React.ReactNode;
};

function SectionShell({
  sectionId,
  highlightedId,
  children,
}: SectionShellProps) {
  const highlighted = highlightedId === sectionId;
  return (
    <div
      className={`w-full ${highlighted ? "rounded-2xl ring-2 ring-slate-900/20 bg-slate-100/50" : ""}`}
    >
      {children}
    </div>
  );
}

type HomeDynamicSectionsProps = {
  initialSections?: Section[];
};

function calculateCarouselBreakpoints(
  config: Record<string, any>,
  maxDesktop = 6,
): { mobile: number; tablet: number; desktop: number } {
  const mobile = Math.max(1, Number(config.carousel_items_mobile) || 2);
  const desktop = Math.max(mobile, Math.min(maxDesktop, Number(config.carousel_items_desktop) || Math.min(maxDesktop, 4)));
  const tablet = Math.min(desktop, Math.ceil((mobile + desktop) / 2));
  return { mobile, tablet, desktop };
}

export default function HomeDynamicSections({
  initialSections = [],
}: HomeDynamicSectionsProps) {
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [loading, setLoading] = useState(initialSections.length === 0);
  const searchParams = useSearchParams();
  const t = useTranslations("home");
  const highlightedSectionId = searchParams.get("highlightSection");

  useEffect(() => {
    const shouldForceRefresh = Boolean(highlightedSectionId);

    if (initialSections.length > 0 && !shouldForceRefresh) {
      setSections(initialSections);
      setLoading(false);
      return;
    }

    let isMounted = true;
    let activeController: AbortController | null = null;
    let requestInFlight = false;

    const load = async () => {
      if (requestInFlight) return;
      requestInFlight = true;
      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;

      try {
        const res = await fetch(`${API_URL}/homepage/sections`, {
          cache: highlightedSectionId ? "no-store" : "force-cache",
          signal: controller.signal,
        });

        const json = res.ok ? await res.json().catch(() => null) : null;
        const primarySections = extractSectionsFromPayload(json);

        if (primarySections.length) {
          if (isMounted) setSections(primarySections);
          return;
        }

        const fallbackRes = await fetch(`${API_URL}/api/carousels/config`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const fallbackJson = fallbackRes.ok
          ? await fallbackRes.json().catch(() => null)
          : null;
        const fallbackSections = extractSectionsFromPayload(fallbackJson).map(
          (section) => ({
            id: String(section.id || ""),
            type: String(section.type || ""),
            title: section.title,
            config_json: ((section as Record<string, unknown>).config as Record<string, unknown>) || section.config_json || {},
            data: section.data ?? [],
          }),
        );

        if (isMounted) setSections(fallbackSections as Section[]);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        if (isMounted) setSections([]);
      } finally {
        requestInFlight = false;
        if (isMounted) setLoading(false);
      }
    };

    load();

    const refreshInterval = highlightedSectionId
      ? window.setInterval(() => {
          if (document.visibilityState !== "visible") return;
          if (typeof navigator !== "undefined" && navigator.onLine === false) return;
          void load();
        }, 5000)
      : null;

    const livePreviewStream = highlightedSectionId
      ? new EventSource(`${API_URL}/homepage/sections/stream`)
      : null;

    if (livePreviewStream) {
      livePreviewStream.onmessage = () => {
        if (document.visibilityState !== "visible") return;
        void load();
      };

      livePreviewStream.onerror = () => {
        // Keep polling as resilience fallback if stream is interrupted.
      };
    }

    return () => {
      isMounted = false;
      activeController?.abort();
      if (refreshInterval) window.clearInterval(refreshInterval);
      if (livePreviewStream) livePreviewStream.close();
    };
  }, [highlightedSectionId, initialSections]);

  if (loading)
    return (
      <section className="w-full px-4 py-6 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 text-sm text-slate-500">{t("dynamic.loading")}</div>
          <div className="space-y-3">
            <div className="h-48 animate-pulse rounded-xl bg-slate-100 sm:h-64" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="h-20 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={`card-${idx}`} className="h-44 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );

  const hasRenderableSections = sections.some((section) => {
    if (section.failed) return true;
    if (!highlightedSectionId && isEmptyRenderableSection(section)) return false;
    return [
      "HERO_BANNER_SLIDER",
      "PRODUCT_CAROUSEL",
      "BEST_DEALS",
      "NEW_ARRIVALS",
      "FEATURED_PICKS",
      "TOP_CATEGORIES_GRID",
      "BRANDS_STRIP",
      "TRUST_BAR",
      "NEWSLETTER",
    ].includes(section.type);
  });

  if (!hasRenderableSections) {
    return (
      <section className="w-full px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
          <h2 className="text-base font-semibold text-slate-800 sm:text-lg">{t("dynamic.noContentTitle")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("dynamic.noContentBody")}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {t("dynamic.browseProducts")}
            </Link>
            <Link
              href="/products?sort_by=newest"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t("dynamic.seeNewProducts")}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      {highlightedSectionId ? (
        <section className="w-full px-4 sm:px-6 pt-2">
          <div className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs text-slate-600">
            {t("dynamic.previewMode")}{" "}
            <span className="font-mono">{highlightedSectionId}</span>
          </div>
        </section>
      ) : null}
      {sections.map((section) => {
        if (section.failed) {
          return (
            <SectionShell
              key={section.id}
              sectionId={section.id}
              highlightedId={highlightedSectionId}
            >
              <section className="w-full px-4 sm:px-6">
                <div className="rounded-xl border border-dashed p-4 text-sm text-slate-500">
                  {t("dynamic.sectionUnavailable")}
                </div>
              </section>
            </SectionShell>
          );
        }

        if (!highlightedSectionId && isEmptyRenderableSection(section)) {
          return null;
        }

        const sectionConfig = section.config_json || {};

        switch (section.type) {
          case "HERO_BANNER_SLIDER":
            return (
              <SectionShell
                key={section.id}
                sectionId={section.id}
                highlightedId={highlightedSectionId}
              >
                <BannerSection banners={section.data || []} />
              </SectionShell>
            );
          case "PRODUCT_CAROUSEL":
          case "BEST_DEALS":
          case "NEW_ARRIVALS":
          case "FEATURED_PICKS": {
            const productBreakpoints = calculateCarouselBreakpoints(sectionConfig, 6);
            if (sectionConfig.carousel_items_desktop == null || sectionConfig.carousel_items_mobile == null) {
              console.warn(
                `[HomeDynamicSections] Section "${section.id}" (${section.type}) is missing carousel_items_desktop or carousel_items_mobile config. Using defaults.`,
                sectionConfig,
              );
            }
            return (
              <SectionShell
                key={section.id}
                sectionId={section.id}
                highlightedId={highlightedSectionId}
              >
                <GenericCarousel
                  type="products"
                  filterType={
                    section.type === "NEW_ARRIVALS"
                      ? "recent"
                      : section.type === "FEATURED_PICKS"
                        ? "featured"
                        : sectionConfig?.query?.brandId
                          ? "brand"
                          : "category"
                  }
                  title={section.title || section.type}
                  filterId={
                    String(
                      sectionConfig?.query?.brandId ||
                        sectionConfig?.query?.categoryId ||
                        "",
                    ) || undefined
                  }
                  items={(section.data || []) as Product[]}
                  autoplay={Boolean(sectionConfig.carousel_autoplay ?? true)}
                  autoplayIntervalMs={Number(
                    sectionConfig.carousel_interval_ms || 4500,
                  )}
                  itemsPerView={productBreakpoints}
                  maxItems={Number(
                    sectionConfig.limit || sectionConfig?.query?.limit || 20,
                  )}
                />
              </SectionShell>
            );
          }
          case "TOP_CATEGORIES_GRID": {
            const catBreakpoints = calculateCarouselBreakpoints(sectionConfig, 8);
            if (sectionConfig.carousel_items_desktop == null || sectionConfig.carousel_items_mobile == null) {
              console.warn(
                `[HomeDynamicSections] Section "${section.id}" (TOP_CATEGORIES_GRID) is missing carousel_items_desktop or carousel_items_mobile config. Using defaults.`,
                sectionConfig,
              );
            }
            return (
              <SectionShell
                key={section.id}
                sectionId={section.id}
                highlightedId={highlightedSectionId}
              >
                <GenericCarousel
                  type="categories"
                  filterType="category"
                  title={section.title || t("dynamic.topCategories")}
                  filterId={String(sectionConfig?.query?.categoryId || "") || undefined}
                  items={(section.data || []) as Array<{
                    id: string;
                    name: string;
                    slug: string;
                  }>}
                  autoplay={false}
                  itemsPerView={catBreakpoints}
                  maxItems={Number(
                    sectionConfig.limit || sectionConfig?.query?.limit || 12,
                  )}
                />
              </SectionShell>
            );
          }
          case "BRANDS_STRIP": {
            const brandBreakpoints = calculateCarouselBreakpoints(sectionConfig, 8);
            if (sectionConfig.carousel_items_desktop == null || sectionConfig.carousel_items_mobile == null) {
              console.warn(
                `[HomeDynamicSections] Section "${section.id}" (BRANDS_STRIP) is missing carousel_items_desktop or carousel_items_mobile config. Using defaults.`,
                sectionConfig,
              );
            }
            return (
              <SectionShell
                key={section.id}
                sectionId={section.id}
                highlightedId={highlightedSectionId}
              >
                <BrandCarousel
                  title={section.title || t("dynamic.brands")}
                  autoplay={Boolean(sectionConfig.carousel_autoplay ?? true)}
                  autoplayIntervalMs={Number(
                    sectionConfig.carousel_interval_ms || 4500,
                  )}
                  itemsPerView={brandBreakpoints}
                  items={(section.data || []).map((x: any) => ({
                    id: x.id,
                    name: x.name,
                    slug: x.slug,
                    logo_url: x.logo_url,
                    image: x.image,
                    product_count: x.product_count,
                  }))}
                />
              </SectionShell>
            );
          }
          case "TRUST_BAR":
            return (
              <SectionShell
                key={section.id}
                sectionId={section.id}
                highlightedId={highlightedSectionId}
              >
                <TrustBarSection items={section.data || []} />
              </SectionShell>
            );
          case "NEWSLETTER":
            return (
              <SectionShell
                key={section.id}
                sectionId={section.id}
                highlightedId={highlightedSectionId}
              >
                <NewsletterSection
                  config={sectionConfig}
                  payload={
                    section.data && typeof section.data === "object"
                      ? (section.data as Record<string, any>)
                      : {}
                  }
                />
              </SectionShell>
            );
          default:
            return null;
        }
      })}
    </>
  );
}
