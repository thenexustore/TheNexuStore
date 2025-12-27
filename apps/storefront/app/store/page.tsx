import FeaturedProducts from "./FeaturedProcucts";
import StoreCarousel from "./StoreCarousel";
import StoreExplore from "./StoreExplore";

export default function StorePage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <div
        className="
          mx-auto 
          w-full
          px-4 sm:px-6 md:px-8 lg:px-12
          py-6 sm:py-8 md:py-10
          flex flex-col 
          gap-6 sm:gap-8 md:gap-12
        "
      >
        <StoreCarousel />
        <FeaturedProducts />
        <StoreExplore />
      </div>
    </main>
  );
}
