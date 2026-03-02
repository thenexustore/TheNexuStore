"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Banner, getActiveBanners } from "../lib/banners";
import { getCachedData } from "../lib/home-cache";

export default function StoreCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCachedData("home:banners", 60_000, () =>
          getActiveBanners(),
        );
        setBanners(data);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [banners.length]);

  if (loading) {
    return (
      <section className="w-full max-w-7xl px-4 sm:px-6">
        <div className="h-52 animate-pulse rounded-2xl bg-slate-200 sm:h-72 lg:h-80" />
      </section>
    );
  }

  if (banners.length === 0) {
    return null;
  }

  const current = banners[index];

  return (
    <section className="w-full max-w-7xl px-4 pt-4 sm:px-6">
      <div className="relative h-52 overflow-hidden rounded-2xl sm:h-72 lg:h-80">
        <Image
          src={current.image}
          alt={current.title_text || "Banner"}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 1200px"
        />
        <div className="absolute inset-0" style={{ background: current.overlay }} />

        <div className="absolute inset-0 flex flex-col justify-end gap-2 p-5 text-white sm:p-8">
          <h1 className="text-2xl font-bold sm:text-4xl">{current.title_text}</h1>
          <p className="max-w-2xl text-sm sm:text-base">{current.subtitle_text}</p>
          {current.button_text ? (
            <Link
              href={current.button_link || "/products"}
              className="mt-2 w-fit rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-900"
            >
              {current.button_text}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
