"use client";

const products = [
  {
    id: 1,
    title: "ASUS VGA NVIDIA PRIME RTX 5060 TI 08GB DDR7",
    price: "€401.22",
    rating: "4.7 / 5",
    image:
      "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?q=80&w=800",
  },
  {
    id: 2,
    title: "ASUS VGA NVIDIA PRIME RTX 5060 TI 08GB DDR7",
    price: "€401.22",
    rating: "4.7 / 5",
    image:
      "https://images.unsplash.com/photo-1517433456452-f9633a875f6f?q=80&w=800",
  },
  {
    id: 3,
    title: "ASUS VGA NVIDIA PRIME RTX 5060 TI 08GB DDR7",
    price: "€401.22",
    rating: "4.7 / 5",
    image:
      "https://images.unsplash.com/photo-1593642634367-d91a135587b5?q=80&w=800",
  },
  {
    id: 4,
    title: "ASUS VGA NVIDIA PRIME RTX 5060 TI 08GB DDR7",
    price: "€401.22",
    rating: "4.7 / 5",
    image:
      "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?q=80&w=800",
  },
];

export default function StoreExplore() {
  return (
    <section className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-extrabold text-[clamp(28px,4vw,48px)] leading-tight">
          Explore
        </h2>
        <button className="text-sm font-medium text-black/60 hover:text-black">
          View All
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
        {products.map((product) => (
          <div
            key={product.id}
            className="rounded-2xl bg-white p-3 shadow-sm hover:shadow-lg transition"
          >
            <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
              <img
                src={product.image}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="mt-3">
              <h3 className="text-sm font-semibold leading-snug line-clamp-2">
                {product.title}
              </h3>

              <p className="text-xs text-gray-500 mt-1">
                Lorem ipsum dolor sit amet consectetur.
              </p>

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1 text-sm font-medium">
                  ⭐ {product.rating}
                </div>
                <span className="font-semibold">{product.price}</span>
              </div>

              <button className="mt-3 w-full rounded-full bg-[#0A0A3F] text-white py-2 text-sm font-medium">
                Buy Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
