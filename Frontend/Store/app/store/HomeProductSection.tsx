"use client";

import Link from "next/link";
import Image from "next/image";
import { Product } from "../lib/products";

interface Props {
  title: string;
  products: Product[];
  loading: boolean;
  emptyMessage: string;
}

const eur = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

export default function HomeProductSection({
  title,
  products,
  loading,
  emptyMessage,
}: Props) {
  return (
    <section className="w-full max-w-7xl px-4 sm:px-6">
      <h2 className="mb-4 text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h2>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
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
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => {
            const hasDeal =
              typeof product.compare_at_price === "number" &&
              product.compare_at_price > product.price;

            return (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="group flex h-full min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-3 transition hover:border-slate-300 hover:shadow-sm"
              >
                <div className="relative mb-3 aspect-square overflow-hidden rounded-lg bg-slate-50">
                  <Image
                    src={product.thumbnail || "/No_Image_Available.png"}
                    alt={product.title}
                    fill
                    className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                  {hasDeal && product.discount_percentage ? (
                    <span className="absolute left-2 top-2 rounded bg-red-600 px-2 py-1 text-[11px] font-bold leading-none text-white">
                      -{product.discount_percentage}%
                    </span>
                  ) : null}
                </div>

                <p className="line-clamp-2 min-h-10 break-words text-sm font-medium text-slate-800">{product.title}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{product.brand_name}</p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-base font-bold text-red-600">{eur.format(product.price)}</span>
                  {hasDeal && product.compare_at_price ? (
                    <span className="text-xs text-slate-400 line-through">
                      {eur.format(product.compare_at_price)}
                    </span>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
