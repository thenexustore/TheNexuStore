import { Menu, X, ShoppingCart, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18nInstance from "../context/i18n";

export default function Navigation() {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { itemCount } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const currentLang = (i18nInstance.language || "en")
    .split("-")[0]
    .toUpperCase();

  const navLinks = [
    { label: t("nav.engineering"), path: "/" },
    { label: t("nav.store"), path: "/store" },
  ];

  const toggleLang = () => {
    const next = currentLang === "EN" ? "es" : "en";
    i18nInstance.changeLanguage(next);
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed inset-x-0 top-0 z-[100] transition-all duration-500 ${
        scrolled ? "py-4" : "py-3"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div
          className={`relative flex items-center justify-between px-4 md:px-8 transition-all duration-500 border border-white/10 ${
            scrolled
              ? "h-16 bg-[#0f1115]/80 backdrop-blur-xl rounded-full"
              : "h-20 bg-transparent rounded-none border-transparent"
          }`}
        >
          <div
            onClick={() => navigate("/")}
            className="flex cursor-pointer items-center gap-3 md:gap-4 group"
          >
            <div className="relative">
              <img
                src="https://nexusspsolutions.com/web/image/website/2/logo/NEXUS%20SP%20Solutions%20Servicios?unique=eb7a754"
                className="h-5 md:h-6 w-auto grayscale brightness-200 group-hover:grayscale-0 transition-all duration-500"
              />
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full blur-[2px]"
              />
            </div>
            <div className="hidden sm:block">
              <span className="text-[10px] md:text-xs font-bold tracking-[0.3em] text-white uppercase">
                Nexus SP Solutions
              </span>
              <p className="text-[8px] text-amber-500/60 font-mono leading-none tracking-widest mt-0.5">
                EST_2009_CEUTA
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 lg:gap-12">
            {navLinks.map((link) => {
              const active = location.pathname === link.path;
              return (
                <Link
                  key={link.label}
                  to={link.path}
                  className="group relative flex flex-col items-center"
                >
                  <span
                    className={`text-[10px] font-bold tracking-[0.2em] transition-colors ${
                      active
                        ? "text-amber-500"
                        : "text-gray-400 group-hover:text-white"
                    }`}
                  >
                    {link.label}
                  </span>
                  {active && (
                    <motion.div
                      layoutId="nav-dot"
                      className="absolute -bottom-2 w-1 h-1 bg-amber-500 rounded-full"
                    />
                  )}
                </Link>
              );
            })}

            <div className="flex items-center gap-4 ml-4 border-l border-white/10 pl-8">
              <button
                onClick={toggleLang}
                className="flex items-center gap-2 text-[10px] font-mono text-gray-400 hover:text-amber-500 transition-colors uppercase"
              >
                <Globe className="h-3 w-3" />
                <span>{currentLang}</span>
              </button>

              <button
                onClick={() => navigate("/cart")}
                className="relative group p-2"
              >
                <ShoppingCart className="h-4 w-4 text-white group-hover:text-amber-500 transition-colors" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-black italic">
                    {itemCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="md:hidden flex items-center gap-3">
            <button
              onClick={toggleLang}
              className="p-2 text-gray-400 flex items-center gap-1"
            >
              <span className="text-[10px] font-mono">{currentLang}</span>
            </button>
            <button onClick={() => navigate("/cart")} className="relative p-2">
              <ShoppingCart className="h-5 w-5 text-white" />
              {itemCount > 0 && (
                <span className="absolute top-1 right-1 bg-amber-500 w-2.5 h-2.5 rounded-full border-2 border-[#0f1115]" />
              )}
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white p-2"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[110] bg-[#0f1115] p-8 md:p-10 flex flex-col justify-between md:hidden"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono text-amber-500">
                  {t("nav.system")}
                </span>
                <button
                  onClick={toggleLang}
                  className="text-[10px] font-mono text-white px-2 py-1 border border-white/20 rounded uppercase"
                >
                  {currentLang === "EN" ? "Switch to ES" : "Cambiar a EN"}
                </button>
              </div>
              <button onClick={() => setIsMenuOpen(false)}>
                <X className="text-white" />
              </button>
            </div>

            <div className="space-y-6">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  className="block text-4xl sm:text-5xl font-light text-white tracking-tighter hover:italic hover:text-amber-500 transition-all uppercase"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="border-t border-white/10 pt-8">
              <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">
                Global Terminal / {currentLang}
              </p>
              <p className="text-[10px] text-gray-700 mt-2">
                © 2025 NEXUS SP SOLUTIONS / SECURE_LINE_01
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
