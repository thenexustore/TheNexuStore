"use client";

export default function FeaturedProducts() {
  const featuredProducts = [
    { id: 1, title: "Storage" },
    { id: 2, title: "Software" },
    { id: 3, title: "Cables" },
    { id: 4, title: "Cases" },
    { id: 5, title: "Laptops" },
    { id: 6, title: "UPS" },
    { id: 7, title: "Gaming" },
  ];

  return (
    <section className="px-4 py-12">
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-8">
        Featured Products
      </h2>

      <div className="flex gap-6 md:gap-8 lg:gap-10 overflow-x-auto pb-4 scrollbar-hide">
        {featuredProducts.map((item) => (
          <div
            key={item.id}
            className="flex flex-col items-center gap-4 min-w-[120px] md:min-w-[140px] lg:min-w-[160px] flex-shrink-0"
          >
            <div className="w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-2xl bg-gray-200"></div>
            <span className="text-lg md:text-xl font-bold whitespace-nowrap">
              {item.title}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
