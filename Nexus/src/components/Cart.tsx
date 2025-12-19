import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
  Activity,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function Cart() {
  const { t } = useTranslation();
  const { items, removeItem, updateQuantity, clearCart, total, itemCount } =
    useCart();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const getValidImageUrl = (url: string) => {
    if (!url || url.trim() === "" || url.includes("undefined")) {
      return "https://images.unsplash.com/photo-1581090700227-1e37b190418e?auto=format&fit=crop&w=300&q=80";
    }
    return url;
  };

  if (items.length === 0) {
    return (
      <section className="relative min-h-screen bg-[#0f1115] pt-32 flex items-center justify-center px-6">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-8 w-full max-w-md"
        >
          <div className="relative inline-block">
            <ShoppingBag className="h-16 w-16 md:h-20 md:w-20 text-gray-800" />
            <motion.div
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 bg-amber-500/10 blur-2xl rounded-full"
            />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-light text-white tracking-tighter uppercase">
              {t("cart.emptyTitle")}{" "}
              <span className="font-serif italic text-amber-500">
                {t("cart.emptyItalic")}
              </span>
            </h1>
            <p className="text-gray-500 font-mono text-[9px] md:text-[10px] tracking-[0.3em] uppercase">
              {t("cart.emptySubtitle")}
            </p>
          </div>
          <button
            onClick={() => navigate("/store")}
            className="group relative w-full md:w-auto py-4 px-10 bg-white text-black font-bold text-xs tracking-widest uppercase"
          >
            <span className="relative z-10">{t("cart.emptyCta")}</span>
            <div className="absolute inset-0 border border-white translate-x-2 translate-y-2 -z-10 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform" />
          </button>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="relative min-h-screen bg-[#0f1115] pt-24 md:pt-32 pb-24 px-4 md:px-6 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 md:mb-16 border-b border-white/10 pb-8 md:pb-12 gap-6">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-light text-white tracking-tighter uppercase">
              {t("cart.titleMain")}{" "}
              <span className="font-serif italic text-amber-500">
                {t("cart.titleItalic")}
              </span>
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-[9px] md:text-[10px] font-mono text-gray-500 tracking-widest uppercase">
              <div className="flex items-center gap-2">
                <Activity className="h-3 w-3 text-amber-500" />
                <span>{t("cart.sessionActive")}</span>
              </div>
              <span className="hidden sm:inline text-white/20">|</span>
              <span>
                {t("cart.unitsReady")}: {itemCount}
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate("/store")}
            className="text-gray-500 hover:text-amber-500 transition-colors font-mono text-[10px] tracking-widest uppercase flex items-center gap-2"
          >
            <ArrowLeft className="h-3 w-3" />
            <span className="border-b border-transparent hover:border-amber-500 transition-all">
              {t("cart.continueSourcing")}
            </span>
          </button>
        </div>
        <div className="grid lg:grid-cols-12 gap-8 md:gap-12">
          <div className="lg:col-span-8 space-y-px bg-white/10 border border-white/10">
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <motion.div
                  key={item.productId}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-[#0f1115] p-4 md:p-6 flex flex-col sm:flex-row gap-6 md:gap-8 group hover:bg-white/[0.02] transition-colors"
                >
                  <div className="h-24 w-24 sm:h-32 sm:w-32 shrink-0 border border-white/5 grayscale group-hover:grayscale-0 transition-all duration-500 mx-auto sm:mx-0 overflow-hidden bg-black">
                    <img
                      src={getValidImageUrl(item.image_url)}
                      alt={item.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://images.unsplash.com/photo-1581090700227-1e37b190418e?auto=format&fit=crop&w=300&q=80";
                      }}
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div>
                        <p className="text-[9px] font-mono text-amber-500/40 mb-1">
                          {t("cart.partNo")}:{" "}
                          {item.productId.toString().slice(0, 8)}
                        </p>
                        <h3 className="text-lg md:text-xl font-light text-white uppercase tracking-tight leading-tight">
                          {item.name}
                        </h3>
                      </div>
                      <p className="text-lg md:text-xl font-light text-white whitespace-nowrap">
                        €{item.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-8 sm:mt-6">
                      <div className="flex items-center border border-white/10 p-1 bg-black/20">
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.productId,
                              Math.max(1, item.quantity - 1)
                            )
                          }
                          className="p-2 text-gray-500 hover:text-white transition-colors"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 md:w-10 text-center font-mono text-sm text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity + 1)
                          }
                          className="p-2 text-gray-500 hover:text-white transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="flex items-center gap-2 text-[9px] font-mono text-gray-600 hover:text-red-500 transition-colors uppercase tracking-tighter"
                      >
                        <Trash2 className="h-3 w-3" /> {t("cart.purgeItem")}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="lg:col-span-4">
            <div className="sticky top-24 border border-white/10 bg-white/[0.02] p-6 md:p-8 space-y-8">
              <h2 className="text-[10px] font-bold text-amber-500 tracking-[0.3em] uppercase">
                {t("cart.summaryTitle")}
              </h2>
              <div className="space-y-4 font-mono text-[10px] md:text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>{t("cart.subtotal")}</span>
                  <span className="text-white">€{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-4">
                  <span>{t("cart.logisticsFee")}</span>
                  <span className="text-green-500 font-bold">
                    {t("cart.logisticsCredit")}
                  </span>
                </div>
                <div className="flex justify-between pt-4 items-end">
                  <span className="text-[10px] text-gray-400">
                    {t("cart.totalValuation")}
                  </span>
                  <motion.span
                    key={total}
                    initial={{ scale: 1.1, color: "#f59e0b" }}
                    animate={{ scale: 1, color: "#fff" }}
                    className="text-3xl md:text-4xl font-light tracking-tighter leading-none"
                  >
                    €{total.toFixed(2)}
                  </motion.span>
                </div>
              </div>
              <div className="space-y-4 pt-4">
                <div className="relative group">
                  <button className="w-full py-5 bg-white text-black font-bold uppercase tracking-[0.2em] text-[10px] relative z-10 overflow-hidden">
                    <span className="relative z-20 flex items-center justify-center gap-3">
                      {t("cart.checkout")} <ArrowRight className="h-4 w-4" />
                    </span>
                    <motion.div
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "0%" }}
                      className="absolute inset-0 bg-amber-500 z-10 transition-transform duration-300"
                    />
                  </button>
                  <div className="absolute inset-0 border border-white translate-x-2 translate-y-2 -z-10 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform" />
                </div>
                <button
                  onClick={clearCart}
                  className="w-full py-3 text-[9px] font-mono text-gray-600 hover:text-white transition-colors uppercase tracking-[0.2em]"
                >
                  {t("cart.terminate")}
                </button>
              </div>
              <div className="pt-6 border-t border-white/5 space-y-3">
                {(
                  t("cart.guarantees", { returnObjects: true }) as string[]
                ).map((text, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 text-[9px] text-gray-600 uppercase tracking-tighter"
                  >
                    <div className="h-1 w-1 bg-amber-500/40 rounded-full shrink-0" />
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
