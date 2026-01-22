"use client";

import StoreCarousel from "./StoreCarousel";
import StoreExplore from "./StoreExplore";
import FeaturedProducts from "./FeaturedProducts";

export default function StorePage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <div className="space-y-12 p-8" style={{display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center'}}>
        <StoreCarousel />
        <FeaturedProducts />
        <StoreExplore />
      </div>
    </main>
  );
}
