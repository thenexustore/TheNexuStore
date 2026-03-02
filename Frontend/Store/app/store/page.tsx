"use client";

import StoreCarousel from "./StoreCarousel";
import FeaturedProducts from "./FeaturedProducts";
import DealsSection from "./DealsSection";

export default function StorePage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-10">
      <div className="mx-auto flex w-full flex-col items-center gap-8">
        <StoreCarousel />
        <FeaturedProducts />
        <DealsSection />
      </div>
    </main>
  );
}
