'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

type HomePayload = {
  layout: { id: string; locale?: string | null } | null;
  sections: Array<{ id: string; type: string; title?: string; subtitle?: string; variant?: string; resolved: any }>;
};

const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

function SectionShell({ title, subtitle, children }: { title?: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="w-full max-w-7xl px-3 sm:px-6">
      {title ? <h2 className="mb-1 text-xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h2> : null}
      {subtitle ? <p className="mb-4 text-sm text-slate-500">{subtitle}</p> : null}
      {children}
    </section>
  );
}

function Hero({ title, subtitle, items }: { title?: string; subtitle?: string; items: any[] }) {
  const slides = useMemo(() => items.map((x) => x.banner || x).filter(Boolean), [items]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => setIndex((prev) => (prev + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, [slides.length]);

  if (!slides.length) return null;

  const active = slides[index];

  return (
    <SectionShell title={title} subtitle={subtitle}>
      <div className="relative h-52 overflow-hidden rounded-2xl bg-slate-200 shadow-sm sm:h-[380px]">
        <Image src={active.image || '/No_Image_Available.png'} alt={active.title_text || 'Hero'} fill priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/30 to-transparent" />
        <div className="absolute inset-0 flex max-w-2xl flex-col justify-end gap-2 p-4 text-white sm:p-10">
          {active.label ? <span className="w-fit rounded-full bg-red-600 px-3 py-1 text-xs font-semibold uppercase">{active.label}</span> : null}
          <h3 className="text-xl font-bold leading-tight sm:text-4xl">{active.title_text || 'Top tech deals'}</h3>
          {active.subtitle_text ? <p className="text-sm text-slate-100 sm:text-base">{active.subtitle_text}</p> : null}
          {active.button_text ? (
            <Link href={active.button_link || '/products'} className="mt-2 w-fit rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100">
              {active.button_text}
            </Link>
          ) : null}
        </div>

        {slides.length > 1 ? (
          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                aria-label={`slide-${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-2.5 rounded-full transition-all ${index === i ? 'w-6 bg-white' : 'w-2.5 bg-white/60'}`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </SectionShell>
  );
}

function CategoryStrip({ title, subtitle, categories }: { title?: string; subtitle?: string; categories: any[] }) {
  return (
    <SectionShell title={title || 'Top Categories'} subtitle={subtitle}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map((cat: any) => (
          <Link key={cat.id} href={`/products?categories=${cat.slug}`} className="group rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300">
            <p className="text-sm font-medium text-slate-800 group-hover:text-slate-900">{cat.name}</p>
          </Link>
        ))}
      </div>
      {!categories.length ? <div className="rounded-xl border border-dashed p-4 text-sm text-slate-500">Configure categories from admin.</div> : null}
    </SectionShell>
  );
}

function ProductCarousel({ title, subtitle, products }: { title?: string; subtitle?: string; products: any[] }) {
  return (
    <SectionShell title={title} subtitle={subtitle}>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {products.map((product) => {
          const hasDeal = Number(product.compare_at_price || 0) > Number(product.price || 0);
          const pct = product.discount_percentage || product.discount_pct || 0;
          return (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="group w-[72vw] min-w-[200px] max-w-[220px] snap-start rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow sm:w-auto"
            >
              <div className="relative mb-2 aspect-square overflow-hidden rounded-xl bg-slate-50">
                <Image src={product.thumbnail || '/No_Image_Available.png'} alt={product.title} fill className="object-contain p-2 transition group-hover:scale-105" />
                {hasDeal && pct ? (
                  <span className="absolute left-2 top-2 rounded-md bg-red-600 px-2 py-1 text-xs font-bold text-white">-{pct}%</span>
                ) : null}
              </div>

              <p className="line-clamp-2 min-h-10 text-sm font-medium text-slate-800">{product.title}</p>
              <p className="mt-0.5 text-xs uppercase tracking-wide text-slate-400">{product.brand_name}</p>

              <div className="mt-2 flex items-center gap-2">
                <span className="text-lg font-bold text-red-600">{eur.format(Number(product.price || 0))}</span>
                {hasDeal ? <span className="text-xs text-slate-400 line-through">{eur.format(Number(product.compare_at_price || 0))}</span> : null}
              </div>

              {Number(product.stock_quantity || 0) > 0 && Number(product.stock_quantity || 0) <= 8 ? (
                <div className="mt-1 text-xs font-medium text-orange-600">¡Solo quedan {product.stock_quantity}!</div>
              ) : null}
            </Link>
          );
        })}
      </div>
      {!products.length ? <div className="rounded-xl border border-dashed p-4 text-sm text-slate-500">No products configured for this section.</div> : null}
    </SectionShell>
  );
}

function BrandStrip({ title, subtitle, brands }: { title?: string; subtitle?: string; brands: any[] }) {
  return (
    <SectionShell title={title || 'Top Brands'} subtitle={subtitle}>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {brands.map((brand: any) => (
          <Link key={brand.id} href={`/products?brand=${brand.slug}`} className="min-w-[130px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 sm:min-w-[150px] sm:px-4 sm:py-3">
            {brand.name}
          </Link>
        ))}
      </div>
    </SectionShell>
  );
}

function ChipsLike({ title, subtitle, items }: { title?: string; subtitle?: string; items: any[] }) {
  return (
    <SectionShell title={title} subtitle={subtitle}>
      <div className="flex flex-wrap gap-2">
        {items.map((item: any, i: number) => (
          <Link key={i} href={item.href || '/products'} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:border-slate-300">
            {item.title || item.text}
          </Link>
        ))}
      </div>
    </SectionShell>
  );
}

export default function HomeRenderer({ payload }: { payload: HomePayload }) {
  return (
    <>
      {payload.sections.map((section) => {
        if (section.type === 'HERO_CAROUSEL') return <Hero key={section.id} title={section.title} subtitle={section.subtitle} items={section.resolved || []} />;
        if (section.type === 'CATEGORY_STRIP') return <CategoryStrip key={section.id} title={section.title} subtitle={section.subtitle} categories={section.resolved || []} />;
        if (section.type === 'PRODUCT_CAROUSEL') return <ProductCarousel key={section.id} title={section.title} subtitle={section.subtitle} products={section.resolved || []} />;
        if (section.type === 'BRAND_STRIP') return <BrandStrip key={section.id} title={section.title} subtitle={section.subtitle} brands={section.resolved || []} />;
        if (section.type === 'VALUE_PROPS' || section.type === 'TRENDING_CHIPS') return <ChipsLike key={section.id} title={section.title} subtitle={section.subtitle} items={section.resolved || []} />;
        return null;
      })}
    </>
  );
}
