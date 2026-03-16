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
  HERO_CAROUSEL: 'Destacados',
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
const asText = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);
const isMachineTitle = (value: string) => /^[A-Z0-9_]+$/.test(value);
const resolveSectionTitle = (type: string, title?: string): string => {
  const normalized = asText(title).trim();
  if (normalized && !isMachineTitle(normalized)) return normalized;
  return SECTION_TYPE_LABEL[type] || normalized.replace(/_/g, ' ') || 'Sección destacada';
};

const isLikelyMissingImage = (value: unknown): boolean => {
  const src = asText(value).toLowerCase();
  if (!src) return true;
  return src.includes('no_image_available') || src.includes('no-image') || src.includes('placeholder');
};
const asSrc = (value: unknown): string => {
  if (typeof value !== 'string') return FALLBACK_IMG;
  const src = value.trim();
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
    const value = asText(candidate).trim();
    if (!value) continue;
    if (isLikelyMissingImage(value)) continue;
    return value;
  }
  return '';
};

const resolveHeroImage = (slide: Record<string, unknown>): unknown => {
  const banner = (slide.banner as Record<string, unknown>) || {};
  const config =
    (slide.config as Record<string, unknown> | undefined) || {};

  return firstUsableImage([
    slide.image_url,
    slide.image,
    config.image_url,
    config.image,
    banner.image,
    banner.image_url,
    banner.background_image,
    banner.desktop_image,
    banner.mobile_image,
  ]);
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
      {title ? <h2 className="mb-1 break-words text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{title}</h2> : null}
      {subtitle ? <p className="mb-4 text-sm text-slate-600">{subtitle}</p> : null}
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
    <div className="mb-2 flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canPrev}
        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Anterior"
      >
        ←
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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
          return {
            ...banner,
            ...item,
            image: item.image_url || banner.image,
            button_link: item.href || banner.button_link,
          };
        })
        .filter(Boolean),
    [items],
  );
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoplayEnabled = config?.autoplay !== false;
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
        className="relative h-52 overflow-hidden rounded-2xl bg-slate-200 shadow-sm sm:h-[380px]"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          className="flex h-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {slides.map((slide, i) => {
            const heroImage = resolveHeroImage(slide);
            const hasVisual = !isLikelyMissingImage(heroImage);
            if (!hasVisual) {
              const banner = (slide.banner as Record<string, unknown>) || {};
              console.warn('[store-home][hero] Missing hero image for slide', {
                slideId: asText(slide.id, `hero-${i}`),
                bannerId: asText(slide.banner_id),
                title: asText(slide.title_text),
                hasBannerObject: Object.keys(banner).length > 0,
                hasUsableHeroImageData: hasUsableHeroImageData(slide),
                rawImageFields: {
                  slideImageUrl: asText(slide.image_url),
                  slideImage: asText(slide.image),
                  bannerImage: asText(banner.image),
                  bannerImageUrl: asText(banner.image_url),
                },
              });
            }
            return (
            <div key={asText(slide.id, `hero-${i}`)} className="relative h-full min-w-full">
              {hasVisual ? (
                <SmartImage
                  src={asSrc(heroImage)}
                  alt={asText(slide.title_text, 'Hero')}
                  className="object-cover"
                  priority={i === 0}
                  sizes="(max-width: 640px) 100vw, 1200px"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/20 to-transparent" />
              <div className="absolute inset-0 flex max-w-2xl flex-col justify-end gap-2 p-4 text-white sm:p-10">
                {slide.label ? <span className="w-fit rounded-full bg-red-600 px-3 py-1 text-xs font-semibold uppercase">{asText(slide.label)}</span> : null}
                <h3 className="text-xl font-bold leading-tight sm:text-4xl">{asText(slide.title_text, 'Top tech deals')}</h3>
                {slide.subtitle_text ? <p className="text-sm text-slate-100 sm:text-base">{asText(slide.subtitle_text)}</p> : null}
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

        {slides.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Banner anterior"
              onClick={goPrev}
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-md bg-white/95 px-3 py-2 text-lg text-slate-700 shadow transition hover:bg-white"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Banner siguiente"
              onClick={goNext}
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-md bg-white/95 px-3 py-2 text-lg text-slate-700 shadow transition hover:bg-white"
            >
              ›
            </button>

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
          </>
        ) : null}
      </div>
    </SectionShell>
  );
}

function CategoryStrip({ title, subtitle, categories }: { title?: string; subtitle?: string; categories: unknown[] }) {
  const list = toArray<Record<string, unknown>>(categories);
  return (
    <SectionShell title={title || 'Top Categories'} subtitle={subtitle}>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {list.map((cat, idx) => {
          const name = asText(cat.item_label) || asText(cat.name, 'Category');
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
            className="group rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"
          >
            <div className="mx-auto mb-2 relative h-16 w-full overflow-hidden rounded bg-slate-50">
              {hasVisual ? (
                <SmartImage
                  src={asSrc(imageValue)}
                  alt={name}
                  className="object-contain"
                  sizes="120px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[11px] font-medium uppercase tracking-wide text-slate-400">Sin imagen</div>
              )}
            </div>
            <p className="text-sm font-medium text-slate-800 group-hover:text-slate-900">{name}</p>
          </ActionLink>
          );
        })}
      </div>
      {!list.length ? <div className="rounded-xl border border-dashed p-4 text-sm text-slate-500">Configura categorías desde admin.</div> : null}
    </SectionShell>
  );
}

function ProductCarousel({ title, subtitle, products, config }: { title?: string; subtitle?: string; products: unknown[]; config?: Record<string, unknown> }) {
  const list = toArray<Record<string, unknown>>(products);
  const mobileItems = Math.max(1, Number(config?.items_mobile || 2));
  const desktopItems = Math.max(mobileItems, Number(config?.items_desktop || 4));
  const mobileCardPx = Math.max(150, Math.floor(360 / mobileItems));
  const desktopCardPx = Math.max(180, Math.floor(1120 / desktopItems));
  const autoplayEnabled = config?.autoplay !== false;
  const autoplayIntervalMs = Math.max(1800, Number(config?.interval_ms || 4500));
  const railRef = useRef<HTMLDivElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const syncRailState = () => {
    const rail = railRef.current;
    if (!rail) return;
    setCanPrev(rail.scrollLeft > 4);
    setCanNext(rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 4);
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
    if (!rail) return 260;
    return Math.max(200, Math.floor(rail.clientWidth * 0.8));
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
    <SectionShell title={title} subtitle={subtitle}>
      {list.length > 1 ? <RailControls canPrev={canPrev} canNext={canNext} onPrev={goPrev} onNext={goNext} /> : null}

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
        {list.map((product, idx) => {
          const hasDeal = Number(product.compare_at_price || 0) > Number(product.price || 0);
          const pct = Number(product.discount_percentage || product.discount_pct || 0);
          return (
            <ActionLink
              key={asText(product.id, `prod-${idx}`)}
              href={asText(product.slug) ? `/products/${asText(product.slug)}` : '/products'}
              className="group snap-start rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow min-w-[var(--card-mobile)] max-w-[var(--card-mobile)] md:min-w-[var(--card-desktop)] md:max-w-[var(--card-desktop)]"
              style={{
                ['--card-mobile' as string]: `${mobileCardPx}px`,
                ['--card-desktop' as string]: `${desktopCardPx}px`,
              }}
            >
              <div className="relative mb-2 aspect-square overflow-hidden rounded-xl bg-slate-50">
                {!isLikelyMissingImage(product.thumbnail) ? (
                  <SmartImage
                    src={asSrc(product.thumbnail)}
                    alt={asText(product.title, 'Product')}
                    className="object-contain p-2 transition group-hover:scale-105"
                    sizes="(max-width: 640px) 180px, 210px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-center text-xs font-medium text-slate-400">Imagen pendiente</div>
                )}
                {hasDeal && pct ? (
                  <span className="absolute left-2 top-2 rounded-md bg-red-600 px-2 py-1 text-xs font-bold text-white">-{pct}%</span>
                ) : null}
              </div>

              <p className="line-clamp-2 min-h-10 text-sm font-medium text-slate-800">{asText(product.title, 'Product')}</p>
              <p className="mt-0.5 text-xs uppercase tracking-wide text-slate-400">{asText(product.brand_name)}</p>

              <div className="mt-2 flex items-center gap-2">
                <span className={`text-base font-bold sm:text-lg ${hasDeal ? 'text-red-600' : 'text-slate-900'}`}>
                  {eur.format(Number(product.price || 0))}
                </span>
                {hasDeal ? <span className="text-xs text-slate-500 line-through">{eur.format(Number(product.compare_at_price || 0))}</span> : null}
              </div>

              {Number(product.stock_quantity || 0) > 0 && Number(product.stock_quantity || 0) <= 8 ? (
                <div className="mt-1 text-xs font-medium text-orange-600">¡Solo quedan {Number(product.stock_quantity || 0)}!</div>
              ) : (
                <div className="mt-1 text-xs text-slate-400">Envío rápido disponible</div>
              )}

              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-center text-xs font-medium text-slate-700 transition group-hover:bg-slate-100">
                Ver producto
              </div>
            </ActionLink>
          );
        })}
      </div>
      {!list.length ? <div className="rounded-xl border border-dashed p-4 text-sm text-slate-500">No hay productos configurados para esta sección.</div> : null}
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
  const autoplayIntervalMs = Math.max(1800, Number(config?.interval_ms || 4500));
  const railRef = useRef<HTMLDivElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const syncRailState = () => {
    const rail = railRef.current;
    if (!rail) return;
    setCanPrev(rail.scrollLeft > 4);
    setCanNext(rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 4);
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
      {list.length > 1 ? <RailControls canPrev={canPrev} canNext={canNext} onPrev={goPrev} onNext={goNext} /> : null}

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
        if (section?.type === 'CATEGORY_STRIP') return <CategoryStrip key={key} title={displayTitle} subtitle={section.subtitle} categories={toArray(section.resolved)} />;
        if (section?.type === 'PRODUCT_CAROUSEL') return <ProductCarousel key={key} title={displayTitle} subtitle={section.subtitle} products={toArray(section.resolved)} config={section.config} />;
        if (section?.type === 'BRAND_STRIP') return <BrandStrip key={key} title={displayTitle} subtitle={section.subtitle} brands={toArray(section.resolved)} config={section.config} />;
        if (section?.type === 'VALUE_PROPS' || section?.type === 'TRENDING_CHIPS') return <ChipsLike key={key} title={displayTitle} subtitle={section.subtitle} items={toArray(section.resolved)} />;
        if (section?.type === 'CUSTOM_HTML') return <CustomHtmlSection key={key} title={displayTitle} subtitle={section.subtitle} content={section.resolved} />;
        return null;
      })}
    </>
  );
}
