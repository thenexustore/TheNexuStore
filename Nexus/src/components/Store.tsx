import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Search, ShoppingCart, ShieldCheck, Box } from "lucide-react";
import { useCart } from "../context/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  stock: number;
  type: string;
  category_id: string;
}

interface Category {
  id: string;
  name: string;
}

const FALLBACK_IMAGES = {
  hardware: [
    "https://images.unsplash.com/photo-1581090700227-1e37b190418e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1580894908361-967195033215?auto=format&fit=crop&w=800&q=80",
  ],
  software: [
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1618477388954-7852f32655ec?auto=format&fit=crop&w=800&q=80",
  ],
};

const getFallbackImage = (type: string, id: string) => {
  const images =
    FALLBACK_IMAGES[type as "hardware" | "software"] ||
    FALLBACK_IMAGES.hardware;
  const index =
    Math.abs(id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) %
    images.length;
  return images[index];
};

export default function Store() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    fetchData();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [categoriesRes, productsRes] = await Promise.all([
      supabase.from("categories").select("*"),
      supabase.from("products").select("*"),
    ]);
    if (categoriesRes.data) setCategories(categoriesRes.data);
    if (productsRes.data) setProducts(productsRes.data);
    setLoading(false);
  };

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      !selectedCategory || product.category_id === selectedCategory;
    const matchesType = !selectedType || product.type === selectedType;
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCategory && matchesType && matchesSearch;
  });

  if (loading)
    return (
      <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-6">
        <motion.div
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-amber-500 font-mono text-xs md:text-sm tracking-[0.3em] md:tracking-[0.5em]"
        >
          {t("store.loading")}
        </motion.div>
      </div>
    );

  return (
    <section className="min-h-screen bg-[#0f1115] pt-24 md:pt-32 pb-24 px-4 md:px-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 md:mb-16 gap-8 border-b border-white/10 pb-10 md:pb-12">
          <div className="space-y-4 w-full">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-light text-white tracking-tighter uppercase">
              {t("store.titleMain")}{" "}
              <span className="font-serif italic text-amber-500">
                {t("store.titleItalic")}
              </span>
            </h1>
            <p className="text-gray-500 font-mono text-[10px] md:text-xs tracking-widest uppercase max-w-md">
              {t("store.subtitle")}
            </p>
          </div>

          <div className="relative w-full lg:w-96 group">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500/50 group-focus-within:text-amber-500 transition-colors" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("store.searchPlaceholder")}
              className="w-full bg-transparent border-b border-white/10 py-3 pl-8 text-white focus:outline-none focus:border-amber-500 font-mono text-sm uppercase transition-all placeholder:text-gray-700"
            />
          </div>
        </div>

        <div className="mb-12">
          <div className="flex flex-wrap gap-y-4 gap-x-6 md:gap-8 items-center text-[10px] font-bold tracking-widest uppercase">
            <button
              onClick={() => {
                setSelectedCategory(null);
                setSelectedType(null);
              }}
              className={`${
                !selectedCategory && !selectedType
                  ? "text-amber-500"
                  : "text-gray-500"
              } hover:text-white transition-colors whitespace-nowrap`}
            >
              {t("store.filters.all")}
            </button>

            <div className="hidden sm:block h-4 w-[1px] bg-white/10" />

            <button
              onClick={() => setSelectedType("hardware")}
              className={`${
                selectedType === "hardware" ? "text-amber-500" : "text-gray-500"
              } hover:text-white transition-colors whitespace-nowrap`}
            >
              {t("store.filters.hardware")}
            </button>
            <button
              onClick={() => setSelectedType("software")}
              className={`${
                selectedType === "software" ? "text-amber-500" : "text-gray-500"
              } hover:text-white transition-colors whitespace-nowrap`}
            >
              {t("store.filters.software")}
            </button>

            <div className="h-4 w-[1px] bg-white/10" />

            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`${
                  selectedCategory === cat.id
                    ? "text-amber-500"
                    : "text-gray-500"
                } hover:text-white transition-colors whitespace-nowrap`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10 border border-white/10">
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-[#0f1115] group relative p-5 md:p-6 lg:p-8 flex flex-col justify-between hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex justify-between items-start mb-6">
                  <span className="text-[9px] font-mono text-amber-500/50 bg-amber-500/5 px-2 py-1 border border-amber-500/20">
                    {t("store.idLabel")}: {product.id.slice(0, 8)}
                  </span>
                  {product.type === "hardware" ? (
                    <Box className="w-3.5 h-3.5 text-gray-600" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5 text-gray-600" />
                  )}
                </div>

                <div className="relative h-48 sm:h-56 mb-6 grayscale group-hover:grayscale-0 transition-all duration-700 overflow-hidden border border-white/5">
                  <img
                    src={
                      product.image_url ||
                      getFallbackImage(product.type, product.id)
                    }
                    alt={product.name}
                    className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-700"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = getFallbackImage(
                        product.type,
                        product.id
                      );
                    }}
                  />
                </div>

                <div className="space-y-2 mb-8">
                  <h3 className="text-lg md:text-xl font-light text-white group-hover:text-amber-500 transition-colors uppercase tracking-tight leading-tight">
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-2 font-light leading-relaxed">
                    {product.description}
                  </p>
                </div>

                <div className="flex items-end justify-between border-t border-white/5 pt-6">
                  <div>
                    <span className="block text-[10px] text-gray-600 font-mono tracking-tighter mb-1 uppercase">
                      {t("store.unitPrice")}
                    </span>
                    <span className="text-xl md:text-2xl font-light text-white">
                      €{product.price.toFixed(2)}
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      addItem({
                        productId: product.id,
                        name: product.name,
                        price: product.price,
                        quantity: 1,
                        image_url:
                          product.image_url ||
                          getFallbackImage(product.type, product.id),
                      })
                    }
                    className="h-11 w-11 md:h-12 md:w-12 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all active:scale-95"
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredProducts.length === 0 && (
          <div className="py-24 text-center border border-dashed border-white/10">
            <p className="font-mono text-xs text-gray-600 tracking-widest uppercase">
              {t("store.empty")}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
