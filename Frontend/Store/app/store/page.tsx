"use client";

import StoreCarousel from "./StoreCarousel";
import StoreExplore from "./StoreExplore";
import FeaturedProducts from "./FeaturedProcucts";

export default function StorePage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <div className="space-y-12 p-8">
        <StoreCarousel />
        <FeaturedProducts />
        <StoreExplore />
      </div>
    </main>
  );
}
