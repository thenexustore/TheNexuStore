'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { API_URL } from '../lib/env';

type HomePayload = {
  layout: { id: string; locale?: string | null } | null;
  sections: Array<{
    id: string;
    type: string;
    title?: string;
    subtitle?: string;
    variant?: string;
    config?: Record<string, unknown>;
    resolved: unknown;
  }>;
};

const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

const FALLBACK_IMG = '/No_Image_Available.png';

const SECTION_TYPE_LABEL: Record<string, string> = {
  HERO_CAROUSEL: '',
  CATEGORY_STRIP: 'Categorías TOP',
  PRODUCT_CAROUSEL: 'Novedades',
  BRAND_STRIP: 'Marcas populares',
  VALUE_PROPS: '¿Por qué elegirnos?',
  TRENDING_CHIPS: 'Tendencias',
};


const isExternalHref = (href: string) => /^https?:\/\//i.test(href);

function ActionLink({ href, className, children, style }: { href: string; className: string; children: React.ReactNode; style?: React.CSSProperties }) {
  if (isExternalHref(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className} style={style}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} style={style}>
      {children}
    </Link>
  );
}

const toArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? value : []);
const uniqueBy = <T,>(items: T[], getKey: (item: T, index: number) => string): T[] => {
  const seen = new Set<string>();
  return items.filter((item, index) => {
    const key = getKey(item, index);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
const asText = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);
const normalizeCategoryLabel = (value: string): string => value
  .replace(/,(?=\S)/g, ', ')
  .replace(/\s*\/\s*/g, ' / ')
  .replace(/\s{2,}/g, ' ')
  .trim();
const isMachineTitle = (value: string) => /^[A-Z0-9_]+$/.test(value);
const resolveSectionTitle = (type: string, title?: string): string => {
  const normalized = asText(title).trim();
  if (normalized && !isMachineTitle(normalized)) return normalized;

  if (type === 'HERO_CAROUSEL') {
    return '';
  }

  return SECTION_TYPE_LABEL[type] || normalized.replace(/_/g, ' ') || 'Sección destacada';
};

const isLikelyMissingImage = (value: unknown): boolean => {
  const src = asText(value).toLowerCase();
  if (!src) return true;
  return src.includes('no_image_available') || src.includes('no-image') || src.includes('placeholder');
};

const sanitizeImageValue = (value: unknown): string => {
  const raw = asText(value).trim();
  if (!raw) return '';
  return raw
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/\\\//g, '/');
};

const asSrc = (value: unknown): string => {
  const src = sanitizeImageValue(value);
  if (!src) return FALLBACK_IMG;
  if (src.startsWith('data:') || src.startsWith('blob:')) return src;
  if (/^https?:\/\//i.test(src)) return src;

  if (src.startsWith('/')) {
    if (src === FALLBACK_IMG || src.startsWith('/_next/')) return src;
    return `${API_URL}${src}`;
  }

  return `${API_URL}/${src.replace(/^\/+/, '')}`;
};

const firstUsableImage = (candidates: unknown[]): string => {
  for (const candidate of candidates) {
    const value = sanitizeImageValue(candidate);
    if (!value) continue;
    if (isLikelyMissingImage(value)) continue;
    return value;
  }
  return '';
};

type HeroImageDecision = {
  selectedField: string;
  selectedRawValue: string;
  normalizedUrl: string;
  hasVisual: boolean;
};

const getHeroImageDecision = (slide: Record<string, unknown>): HeroImageDecision => {
  const banner = (slide.banner as Record<string, unknown>) || {};
  const config = (slide.config as Record<string, unknown> | undefined) || {};
  const candidates: Array<{ field: string; value: unknown }> = [
    { field: 'slide.image_url', value: slide.image_url },
    { field: 'slide.image', value: slide.image },
    { field: 'slide.config.image_url', value: config.image_url },
    { field: 'slide.config.image', value: config.image },
    { field: 'slide.banner.image', value: banner.image },
    { field: 'slide.banner.image_url', value: banner.image_url },
    { field: 'slide.banner.background_image', value: banner.background_image },
    { field: 'slide.banner.desktop_image', value: banner.desktop_image },
    { field: 'slide.banner.mobile_image', value: banner.mobile_image },
  ];

  for (const candidate of candidates) {
    const raw = sanitizeImageValue(candidate.value);
    if (!raw || isLikelyMissingImage(raw)) continue;
    return {
      selectedField: candidate.field,
      selectedRawValue: raw,
      normalizedUrl: asSrc(raw),
      hasVisual: true,
    };
  }

  return {
    selectedField: 'none',
    selectedRawValue: '',
    normalizedUrl: FALLBACK_IMG,
    hasVisual: false,
  };
};

const hasUsableHeroImageData = (slide: Record<string, unknown>): boolean => {
  const banner = (slide.banner as Record<string, unknown>) || {};
  const config =
    (slide.config as Record<string, unknown> | undefined) || {};

  return Boolean(
    firstUsableImage([
      slide.image_url,
      slide.image,
      config.image_url,
      config.image,
      banner.image,
      banner.image_url,
      banner.background_image,
      banner.desktop_image,
      banner.mobile_image,
    ]),
  );
};


function SmartImage({
  src,
  alt,
  className,
  priority = false,
  sizes,
}: {
  src: string;
  alt: string;
  className: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <Image
      src={src || FALLBACK_IMG}
      alt={alt}
      fill
      unoptimized
      priority={priority}
      sizes={sizes || '100vw'}
      className={className}
    />
  );
}

function SectionShell({ title, subtitle, children }: { title?: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="w-full max-w-7xl px-3 sm:px-6">
      {title ? <h2 className="mb-3 break-words text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{title}</h2> : null}
      {subtitle ? <p className="mb-5 text-sm text-slate-600">{subtitle}</p> : null}
      {children}
    </section>
  );
}

function RailControls({
  canPrev,
  canNext,
  onPrev,
  onNext,
}: {
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canPrev}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-sm text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Anterior"
      >
        ←
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-sm text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Siguiente"
      >
        →
      </button>
    </div>
  );
}

function Hero({ title, subtitle, items, config }: { title?: string; subtitle?: string; items: unknown[]; config?: Record<string, unknown> }) {
  const slides = useMemo(
    () =>
      toArray<Record<string, unknown>>(items)
        .map((item): Record<string, unknown> => {
          const banner = (item?.banner as Record<string, unknown>) || {};
          const bannerSlide = {
            id: banner.id,
            title_text: banner.title_text,
            subtitle_text: banner.subtitle_text,
            button_text: banner.button_text,
            button_link: banner.button_link,
            label: banner.label,
            image: banner.image,
            image_url: banner.image_url,
            overlay: banner.overlay,
            align: banner.align,
          } as Record<string, unknown>;

          return {
            ...item,
            ...bannerSlide,
            banner,
            banner_id: item.banner_id || banner.id,
            image: bannerSlide.image,
            image_url: bannerSlide.image_url || bannerSlide.image,
            button_link: bannerSlide.button_link,
            label: bannerSlide.label,
          };
        })
        .filter((slide) => Boolean(slide?.banner_id || slide?.image_url || slide?.title_text)),
    [items],
  );
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoplayEnabled = config?.autoplay !== false;
  const pauseOnHover = config?.pause_on_hover !== false;
  const showArrows = config?.show_arrows !== false;
  const showDots = config?.show_dots !== false;
  const intervalMs = Number(config?.interval_ms || 5000);


  useEffect(() => {
    if (slides.length <= 1 || isPaused || !autoplayEnabled) return;
    const id = setInterval(() => setIndex((prev) => (prev + 1) % slides.length), Math.max(1500, intervalMs));
    return () => clearInterval(id);
  }, [slides.length, isPaused, autoplayEnabled, intervalMs]);

  if (!slides.length) return null;

  const activeIndex = slides.length ? index % slides.length : 0;
  const goPrev = () => setIndex((prev) => (prev - 1 + slides.length) % slides.length);
  const goNext = () => setIndex((prev) => (prev + 1) % slides.length);

  return (
    <SectionShell title={title} subtitle={subtitle}>
      <div
        className="relative h-56 overflow-hidden rounded-3xl bg-slate-200 shadow-sm ring-1 ring-slate-200 sm:h-[420px]"
        onMouseEnter={() => { if (pauseOnHover) setIsPaused(true); }}
        onMouseLeave={() => { if (pauseOnHover) setIsPaused(false); }}
      >
        <div
          className="flex h-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {slides.map((slide, i) => {
            const decision = getHeroImageDecision(slide);
            const hasVisual = decision.hasVisual;
            const slideId = asText(slide.id, `hero-${i}`);

            console.info('[store-home][hero][image-decision]', {
              slideId,
              selectedField: decision.selectedField,
              selectedRawValue: decision.selectedRawValue,
              normalizedUrl: decision.normalizedUrl,
              hasVisual,
            });

            if (!hasVisual) {
              const banner = (slide.banner as Record<string, unknown>) || {};
              console.warn('[store-home][hero] Missing hero image for slide', {
                slideId,
                bannerId: asText(slide.banner_id),
                title: asText(slide.title_text),
                hasBannerObject: Object.keys(banner).length > 0,
                hasUsableHeroImageData: hasUsableHeroImageData(slide),
                selectedField: decision.selectedField,
                normalizedUrl: decision.normalizedUrl,
                rawImageFields: {
                  slideImageUrl: asText(slide.image_url),
                  slideImage: asText(slide.image),
                  bannerImage: asText(banner.image),
                  bannerImageUrl: asText(banner.image_url),
                },
              });
            }
            return (
            <div
              key={slideId}
              className="relative h-full w-full shrink-0"
              data-hero-image-field={decision.selectedField}
              data-hero-image-url={decision.normalizedUrl.slice(0, 300)}
              data-hero-has-visual={hasVisual ? 'true' : 'false'}
            >
              {hasVisual ? (
                <SmartImage
                  src={decision.normalizedUrl}
                  alt={asText(slide.title_text, 'Hero')}
                  className="object-cover"
                  priority={i === 0}
                  sizes="(max-width: 640px) 100vw, 1200px"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/20 to-transparent" />
              <div className="absolute inset-0 flex max-w-2xl flex-col justify-end gap-3 p-4 text-white sm:p-10">
                {slide.label ? <span className="w-fit rounded-full bg-red-600 px-3 py-1 text-xs font-semibold uppercase">{asText(slide.label)}</span> : null}
                <h3 className="w-fit max-w-full rounded-xl bg-black/25 px-3 py-2 text-xl font-bold leading-tight backdrop-blur-[1px] sm:text-4xl">{asText(slide.title_text, 'Top tech deals')}</h3>
                {slide.subtitle_text ? <p className="w-fit max-w-full rounded-lg bg-black/20 px-3 py-1.5 text-sm text-slate-100 backdrop-blur-[1px] sm:text-base">{asText(slide.subtitle_text)}</p> : null}
                {slide.button_text ? (
                  <ActionLink href={asText(slide.button_link, '/products')} className="mt-2 w-fit rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100">
                    {asText(slide.button_text)}
                  </ActionLink>
                ) : null}
              </div>
            </div>
          );
          })}
        </div>

        {slides.length > 1 && (showArrows || showDots) ? (
          <>
            {showArrows ? (
              <>
                <button
                  type="button"
                  aria-label="Banner anterior"
                  onClick={goPrev}
                  className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/85 px-3 py-2 text-lg text-slate-700 shadow-md backdrop-blur transition hover:bg-white"
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Banner siguiente"
                  onClick={goNext}
                  className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/85 px-3 py-2 text-lg text-slate-700 shadow-md backdrop-blur transition hover:bg-white"
                >
                  ›
                </button>
              </>
            ) : null}

            {showDots ? (
              <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/30 px-2 py-1 backdrop-blur-sm">
                {slides.map((_, i) => (
                  <button
                    type="button"
                    key={i}
                    aria-label={`slide-${i + 1}`}
                    onClick={() => setIndex(i)}
                    className={`h-2.5 rounded-full transition-all ${activeIndex === i ? 'w-6 bg-white' : 'w-2.5 bg-white/60'}`}
                  />
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </SectionShell>
  );
}

function CategoryStrip({ title, subtitle, categories, config }: { title?: string; subtitle?: string; categories: unknown[]; config?: Record<string, unknown> }) {
  const rawList = toArray<Record<string, unknown>>(categories);
  const bySemanticSource = uniqueBy(rawList, (cat, idx) => {
    const slug = asText(cat.slug).trim().toLowerCase();
    const href = asText(cat.href).trim().toLowerCase();
    const normalizedPath = href
      ? href.replace(/^https?:\/\/[^/]+/i, '').replace(/[?#].*$/, '')
      : '';
    return slug || normalizedPath || asText(cat.id) || `cat-${idx}`;
  });
  const list = uniqueBy(bySemanticSource, (cat, idx) => {
    const rawName = normalizeCategoryLabel(
      asText(cat.item_label) || asText(cat.name, ''),
    ).toLowerCase();
    return rawName || asText(cat.slug).trim().toLowerCase() || `cat-name-${idx}`;
  });
  const mobileCols = Math.max(2, Math.min(4, Number(config?.items_mobile || 2)));
  const desktopCols = Math.max(mobileCols, Math.min(8, Number(config?.items_desktop || 6)));
  const showNames = config?.show_names !== false;
  const imageFitClass = String(config?.image_fit || 'contain') === 'cover' ? 'object-cover' : 'object-contain';
  const elevatedCards = String(config?.card_style || 'minimal') === 'elevated';
  const showTopBadges = config?.show_top_badges === true;
  const ctaText = (asText(config?.cta_text, 'Explorar').trim() || 'Explorar').slice(0, 24);
  const cardToneClass = elevatedCards
    ? 'border-slate-200 shadow-md hover:shadow-xl hover:border-indigo-300'
    : 'border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-200';

  return (
    <SectionShell title={title || 'Top Categories'} subtitle={subtitle}>
      <div
        className="grid gap-3 sm:gap-4 [grid-template-columns:repeat(var(--cols-mobile),minmax(0,1fr))] lg:[grid-template-columns:repeat(var(--cols-desktop),minmax(0,1fr))]"
        style={{
          ['--cols-mobile' as string]: String(mobileCols),
          ['--cols-desktop' as string]: String(desktopCols),
        }}
      >
        {list.map((cat, idx) => {
          const name = normalizeCategoryLabel(asText(cat.item_label) || asText(cat.name, 'Category'));
          const imageValue = cat.image_url || cat.image || cat.banner_image;
          const hasVisual = !isLikelyMissingImage(imageValue);
          if (!hasVisual) {
            console.warn('[store-home][category-strip] Missing category image', {
              categoryId: asText(cat.id, `cat-${idx}`),
              slug: asText(cat.slug),
              name,
            });
          }
          return (
          <ActionLink
            key={asText(cat.id, `cat-${idx}`)}
            href={asText(cat.href) || (asText(cat.slug) ? `/products?categories=${encodeURIComponent(asText(cat.slug))}` : '/products')}
            className={`group relative flex min-h-[224px] flex-col overflow-hidden rounded-2xl border bg-white px-3 pb-3 pt-2 text-center transition duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${cardToneClass}`}
          >
            {showTopBadges && idx < 3 ? (
              <span className="absolute right-2 top-2 rounded-full border border-indigo-200 bg-white/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 shadow-sm">
                Top {idx + 1}
              </span>
            ) : null}
            <div className="mx-auto mb-3 mt-1 relative h-28 w-full overflow-hidden rounded-xl bg-gradient-to-b from-slate-50 to-slate-100/70 p-2 ring-1 ring-slate-100 transition group-hover:ring-indigo-200">
              {hasVisual ? (
                <SmartImage
                  src={asSrc(imageValue)}
                  alt={name}
                  className={imageFitClass}
                  sizes="160px"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-400"><span className="text-lg">◻</span><span>Sin imagen</span></div>
              )}
            </div>
            {showNames ? (
              <p title={name} className="line-clamp-2 min-h-12 break-words text-base font-semibold leading-6 text-slate-800 transition-colors group-hover:text-indigo-700">{name}</p>
            ) : null}
            <div className="mt-auto pt-2">
              <div className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm transition group-hover:brightness-110 group-hover:shadow-md">
                {ctaText} <span aria-hidden>→</span>
              </div>
            </div>
          </ActionLink>
          );
        })}
      </div>
      {!list.length ? <div className="rounded-xl border border-dashed p-4 text-sm text-slate-500">Configura categorías desde admin.</div> : null}
    </SectionShell>
  );
}

function ProductCarousel({ title, subtitle, products, config }: { title?: string; subtitle?: string; products: unknown[]; config?: Record<string, unknown> }) {
  const list = uniqueBy(
    toArray<Record<string, unknown>>(products),
    (product, idx) => asText(product.id) || asText(product.slug) || asText(product.title) || `product-${idx}`,
  );
  const mobileItems = Math.max(1, Number(config?.items_mobile || 2));
  const desktopItems = Math.max(mobileItems, Math.min(6, Number(config?.items_desktop || 4)));
  const mobileCardPx = Math.max(168, Math.floor(360 / mobileItems));
  const desktopCardPx = Math.max(205, Math.floor(1160 / desktopItems));
  const autoplayEnabled = config?.autoplay !== false;
  const showArrows = config?.show_arrows !== false;
  const showDots = config?.show_dots === true;
  const source = asText(config?.source, 'NEW_ARRIVALS');
  const categoryScope = asText(config?.category_scope, 'parent_and_descendants');
  const categoryIds = Array.isArray(config?.categoryIds)
    ? config?.categoryIds
    : asText(config?.categoryIds || config?.categoryId)
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  const brandIds = Array.isArray(config?.brandIds)
    ? config?.brandIds
    : asText(config?.brandIds || config?.brandId)
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

  const collectionHref = useMemo(() => {
    const explicit = asText(config?.view_all_href).trim();
    if (explicit) return explicit;

    if (source === 'CATEGORY' && categoryIds.length) {
      return `/products?category=${encodeURIComponent(String(categoryIds[0]))}`;
    }
    if (source === 'BRAND' && brandIds.length) {
      return `/products?brand=${encodeURIComponent(String(brandIds[0]))}`;
    }
    if (source === 'BEST_DEALS') return '/deals';
    return '/products';
  }, [brandIds, categoryIds, config?.view_all_href, source]);

  const viewAllLabel = asText(config?.view_all_label, 'Ver catálogo').trim() || 'Ver catálogo';
  const autoplayIntervalMs = Math.max(2800, Number(config?.interval_ms || 4500));
  const railRef = useRef<HTMLDivElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [activeDot, setActiveDot] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const carouselMeta = useMemo(() => {
    const sourceLabel = {
      NEW_ARRIVALS: 'Novedades',
      BEST_DEALS: 'Ofertas activas',
      FEATURED: 'Selección destacada',
      CATEGORY: 'Categoría',
      BRAND: 'Marca',
      BEST_SELLERS: 'Más vendidos',
    }[source] || 'Selección';

    const scopeLabel = {
      parent_only: 'Solo categorías padre',
      children_only: 'Solo categorías hijas',
      parent_and_descendants: 'Padre + descendientes',
    }[categoryScope] || 'Reglas automáticas';

    return {
      contextualChips: [
        sourceLabel,
        source === 'CATEGORY' ? scopeLabel : null,
        categoryIds.length ? `${categoryIds.length} categorías` : null,
        brandIds.length ? `${brandIds.length} marcas` : null,
      ].filter(Boolean),
      useGridFallback:
        list.length > 0 && list.length <= Math.max(2, Math.min(desktopItems, 3)),
    };
  }, [brandIds.length, categoryIds.length, categoryScope, desktopItems, list.length, source]);

  const syncRailState = () => {
    const rail = railRef.current;
    if (!rail) return;
    setCanPrev(rail.scrollLeft > 4);
    setCanNext(rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 4);
    const approxIndex = Math.round(rail.scrollLeft / Math.max(rail.clientWidth * 0.6, 220));
    setActiveDot(Math.max(0, Math.min(list.length - 1, approxIndex)));
  };

  useEffect(() => {
    syncRailState();
  }, [list.length]);

  useEffect(() => {
    const onResize = () => syncRailState();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');

    const sync = () => {
      setIsMobileViewport(media.matches);
      setReduceMotion(motionMedia.matches);
    };

    sync();
    media.addEventListener('change', sync);
    motionMedia.addEventListener('change', sync);
    return () => {
      media.removeEventListener('change', sync);
      motionMedia.removeEventListener('change', sync);
    };
  }, []);

  const step = () => {
    const rail = railRef.current;
    if (!rail) return 260;
    return Math.max(220, Math.floor(rail.clientWidth * 0.82));
  };

  const goPrev = () => railRef.current?.scrollBy({ left: -step(), behavior: 'smooth' });
  const goNext = () => railRef.current?.scrollBy({ left: step(), behavior: 'smooth' });

  useEffect(() => {
    const shouldAutoplay = autoplayEnabled && !reduceMotion && (!isMobileViewport || list.length > 3);
    if (!shouldAutoplay || isPaused || list.length <= 1) return;
    const id = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      const rail = railRef.current;
      if (!rail) return;
      const atEnd = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
      if (atEnd) {
        rail.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        rail.scrollBy({ left: step(), behavior: 'smooth' });
      }
    }, autoplayIntervalMs);
    return () => window.clearInterval(id);
  }, [autoplayEnabled, autoplayIntervalMs, isPaused, isMobileViewport, list.length, reduceMotion]);

  const renderCard = (product: Record<string, unknown>, idx: number) => {
    const hasDeal = Number(product.compare_at_price || 0) > Number(product.price || 0);
    const pct = Number(product.discount_percentage || product.discount_pct || 0);
    const stock = Number(product.stock_quantity || 0);

    return (
      <ActionLink
        key={asText(product.id, `prod-${idx}`)}
        href={asText(product.slug) ? `/products/${asText(product.slug)}` : '/products'}
        className="group relative snap-start overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-3.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg min-w-[var(--card-mobile)] max-w-[var(--card-mobile)] md:min-w-[var(--card-desktop)] md:max-w-[var(--card-desktop)]"
        style={{
          ['--card-mobile' as string]: `${mobileCardPx}px`,
          ['--card-desktop' as string]: `${desktopCardPx}px`,
        }}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 opacity-70" />
        <div className="relative mb-3 aspect-[1/1] overflow-hidden rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100">
          {!isLikelyMissingImage(product.thumbnail) ? (
            <SmartImage
              src={asSrc(product.thumbnail)}
              alt={asText(product.title, 'Product')}
              className="object-contain p-3 transition duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 44vw, 210px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-center text-xs font-medium text-slate-400">Imagen pendiente</div>
          )}
          {hasDeal && pct ? (
            <span className="absolute left-2 top-2 rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white shadow">-{pct}%</span>
          ) : null}
        </div>

        <p className="line-clamp-2 min-h-11 text-[15px] font-semibold leading-5 text-slate-900">{asText(product.title, 'Producto')}</p>
        <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{asText(product.brand_name, 'Marca')}</p>

        <div className="mt-3 flex items-end gap-2">
          <span className={`text-xl font-extrabold leading-none ${hasDeal ? 'text-rose-600' : 'text-slate-900'}`}>
            {eur.format(Number(product.price || 0))}
          </span>
          {hasDeal ? <span className="pb-0.5 text-xs text-slate-400 line-through">{eur.format(Number(product.compare_at_price || 0))}</span> : null}
        </div>

        <div className="mt-2">
          {stock <= 0 ? (
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">Sin stock temporal</span>
          ) : stock <= 8 ? (
            <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">¡Solo quedan {stock}!</span>
          ) : (
            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">En stock · envío rápido</span>
          )}
        </div>

        <div className="mt-3 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition group-hover:border-indigo-200 group-hover:bg-indigo-50 group-hover:text-indigo-700">
          Ver producto <span aria-hidden className="ml-1">→</span>
        </div>
      </ActionLink>
    );
  };

  return (
    <SectionShell title={title} subtitle={subtitle}>
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/70 p-3 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {carouselMeta.contextualChips.map((chip, idx) => (
                <span key={`${chip}-${idx}`} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">{chip}</span>
              ))}
            </div>
            <p className="text-xs text-slate-500">{list.length ? `${list.length} productos cargados` : 'Sin productos por ahora. Revisa filtros o categorías.'}</p>
          </div>

          <div className="flex items-center gap-2">
            <ActionLink href={collectionHref} className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700">
              {viewAllLabel} <span aria-hidden className="ml-1">→</span>
            </ActionLink>
            {list.length > 1 && showArrows && !carouselMeta.useGridFallback ? <RailControls canPrev={canPrev} canNext={canNext} onPrev={goPrev} onNext={goNext} /> : null}
          </div>
        </div>

        {!list.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={`empty-${idx}`} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-3">
                <div className="mb-3 aspect-square rounded-xl bg-slate-100" />
                <div className="h-3 w-4/5 rounded bg-slate-100" />
                <div className="mt-2 h-3 w-2/5 rounded bg-slate-100" />
                <div className="mt-4 h-8 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        ) : carouselMeta.useGridFallback ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((product, idx) => renderCard(product, idx))}
          </div>
        ) : (
          <>
            <div
              ref={railRef}
              onScroll={syncRailState}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => setIsPaused(false)}
              onFocusCapture={() => setIsPaused(true)}
              onBlurCapture={() => setIsPaused(false)}
              className="flex cursor-grab snap-x snap-mandatory gap-3 overflow-x-auto pb-3 [scrollbar-width:thin] [scroll-padding-left:8px] active:cursor-grabbing"
            >
              {list.map((product, idx) => renderCard(product, idx))}
            </div>

            {list.length > 1 && showDots ? (
              <div className="mt-2 flex items-center justify-center gap-1.5">
                {list.slice(0, Math.min(list.length, 8)).map((_, idx) => (
                  <button
                    type="button"
                    key={`dot-${idx}`}
                    onClick={() => {
                      const rail = railRef.current;
                      if (!rail) return;
                      const targetLeft = idx * Math.max(rail.clientWidth * 0.62, 220);
                      rail.scrollTo({ left: targetLeft, behavior: 'smooth' });
                    }}
                    className={`h-2.5 rounded-full transition-all ${activeDot === idx ? 'w-6 bg-indigo-600' : 'w-2.5 bg-slate-300 hover:bg-slate-400'}`}
                    aria-label={`ir a producto ${idx + 1}`}
                  />
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </SectionShell>
  );
}

function BrandStrip({ title, subtitle, brands, config }: { title?: string; subtitle?: string; brands: unknown[]; config?: Record<string, unknown> }) {
  const list = toArray<Record<string, unknown>>(brands);
  const mobileItems = Math.max(2, Number(config?.items_mobile || 2));
  const desktopItems = Math.max(2, Number(config?.items_desktop || 6));
  const mobileItemPx = Math.max(120, Math.floor(360 / mobileItems));
  const itemPx = Math.max(130, Math.floor(1000 / desktopItems));
  const autoplayEnabled = config?.autoplay !== false;
  const showArrows = config?.show_arrows !== false;
  const showDots = config?.show_dots === true;
  const viewAllHref = asText(config?.view_all_href).trim();
  const viewAllLabel = asText(config?.view_all_label, 'Ver todo').trim() || 'Ver todo';
  const autoplayIntervalMs = Math.max(1800, Number(config?.interval_ms || 4500));
  const railRef = useRef<HTMLDivElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [activeDot, setActiveDot] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const syncRailState = () => {
    const rail = railRef.current;
    if (!rail) return;
    setCanPrev(rail.scrollLeft > 4);
    setCanNext(rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 4);
    const approxIndex = Math.round(rail.scrollLeft / Math.max(rail.clientWidth * 0.72, 220));
    setActiveDot(Math.max(0, Math.min(list.length - 1, approxIndex)));
  };

  useEffect(() => {
    syncRailState();
  }, [list.length]);

  useEffect(() => {
    const onResize = () => syncRailState();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const step = () => {
    const rail = railRef.current;
    if (!rail) return 220;
    return Math.max(180, Math.floor(rail.clientWidth * 0.7));
  };

  const goPrev = () => railRef.current?.scrollBy({ left: -step(), behavior: 'smooth' });
  const goNext = () => railRef.current?.scrollBy({ left: step(), behavior: 'smooth' });

  useEffect(() => {
    if (!autoplayEnabled || isPaused || list.length <= 1) return;
    const id = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      const rail = railRef.current;
      if (!rail) return;
      const atEnd = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
      if (atEnd) {
        rail.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        rail.scrollBy({ left: step(), behavior: 'smooth' });
      }
    }, autoplayIntervalMs);
    return () => window.clearInterval(id);
  }, [autoplayEnabled, autoplayIntervalMs, isPaused, list.length]);

  return (
    <SectionShell title={title || 'Top Brands'} subtitle={subtitle}>
      <div className="mb-2 flex items-center justify-between gap-2">
        {viewAllHref ? (
          <ActionLink href={viewAllHref} className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-indigo-200 hover:text-indigo-700">
            {viewAllLabel} <span aria-hidden className="ml-1">→</span>
          </ActionLink>
        ) : <span />}
        {list.length > 1 && showArrows ? <RailControls canPrev={canPrev} canNext={canNext} onPrev={goPrev} onNext={goNext} /> : null}
      </div>

      <div
        ref={railRef}
        onScroll={syncRailState}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        onFocusCapture={() => setIsPaused(true)}
        onBlurCapture={() => setIsPaused(false)}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]"
      >
        {list.map((brand, idx) => (
          <ActionLink
            key={asText(brand.id, `brand-${idx}`)}
            href={asText(brand.href) || (asText(brand.slug) ? `/products?brand=${encodeURIComponent(asText(brand.slug))}` : '/products')}
            className="snap-start rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 min-w-[var(--brand-mobile)] md:min-w-[var(--brand-desktop)]"
            style={{
              ['--brand-mobile' as string]: `${mobileItemPx}px`,
              ['--brand-desktop' as string]: `${itemPx}px`,
            }}
          >
            <div className="mx-auto mb-2 flex h-10 w-full items-center justify-center overflow-hidden rounded bg-slate-50">
              {!isLikelyMissingImage(brand.image_url || brand.logo_url || brand.image) ? (
                <SmartImage
                  src={asSrc(brand.image_url || brand.logo_url || brand.image)}
                  alt={asText(brand.item_label) || asText(brand.name, 'Brand')}
                  className="object-contain"
                  sizes="150px"
                />
              ) : (
                <span className="text-[11px] uppercase tracking-wide text-slate-400">Logo</span>
              )}
            </div>
            {asText(brand.item_label) || asText(brand.name, 'Brand')}
          </ActionLink>
        ))}
      </div>
      {!list.length ? <div className="rounded-xl border border-dashed p-4 text-sm text-slate-500">No hay marcas configuradas para esta sección.</div> : null}
    </SectionShell>
  );
}

function ChipsLike({ title, subtitle, items }: { title?: string; subtitle?: string; items: unknown[] }) {
  const list = toArray<Record<string, unknown>>(items);
  return (
    <SectionShell title={title} subtitle={subtitle}>
      <div className="flex flex-wrap gap-2">
        {list.map((item, i) => (
          <ActionLink
            key={i}
            href={asText(item.href, '/products')}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:border-slate-300"
          >
            {item.image_url ? (
              <span className="relative h-5 w-5 overflow-hidden rounded-full bg-slate-100">
                <SmartImage
                  src={asSrc(item.image_url)}
                  alt={asText(item.title) || asText(item.text) || 'Item'}
                  className="object-cover"
                  sizes="20px"
                />
              </span>
            ) : null}
            {asText(item.title) || asText(item.text) || 'Item'}
          </ActionLink>
        ))}
      </div>
    </SectionShell>
  );
}


function CustomHtmlSection({ title, subtitle, content }: { title?: string; subtitle?: string; content: unknown }) {
  const html = typeof content === 'object' && content && typeof (content as Record<string, unknown>).html === 'string'
    ? String((content as Record<string, unknown>).html || '')
    : '';

  if (!html.trim()) {
    return (
      <SectionShell title={title} subtitle={subtitle}>
        <div className="rounded-xl border border-dashed p-4 text-sm text-slate-500">Bloque HTML sin contenido.</div>
      </SectionShell>
    );
  }

  return (
    <SectionShell title={title} subtitle={subtitle}>
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        El contenido HTML personalizado no se renderiza en storefront público por seguridad. Usa este bloque solo como marcador de migración.
      </div>
    </SectionShell>
  );
}

export default function HomeRenderer({ payload }: { payload: HomePayload }) {
  const sections = toArray<HomePayload['sections'][number]>(payload?.sections);

  return (
    <>
      {sections.map((section, index) => {
        const key = section?.id || `section-${index}`;
        const displayTitle = resolveSectionTitle(asText(section?.type), section?.title);
        if (section?.type === 'HERO_CAROUSEL') return <Hero key={key} title={displayTitle} subtitle={section.subtitle} items={toArray(section.resolved)} config={section.config} />;
        if (section?.type === 'CATEGORY_STRIP') return <CategoryStrip key={key} title={displayTitle} subtitle={section.subtitle} categories={toArray(section.resolved)} config={section.config} />;
        if (section?.type === 'PRODUCT_CAROUSEL') return <ProductCarousel key={key} title={displayTitle} subtitle={section.subtitle} products={toArray(section.resolved)} config={section.config} />;
        if (section?.type === 'BRAND_STRIP') return <BrandStrip key={key} title={displayTitle} subtitle={section.subtitle} brands={toArray(section.resolved)} config={section.config} />;
        if (section?.type === 'VALUE_PROPS' || section?.type === 'TRENDING_CHIPS') return <ChipsLike key={key} title={displayTitle} subtitle={section.subtitle} items={toArray(section.resolved)} />;
        if (section?.type === 'CUSTOM_HTML') return <CustomHtmlSection key={key} title={displayTitle} subtitle={section.subtitle} content={section.resolved} />;
        return null;
      })}
    </>
  );
}
