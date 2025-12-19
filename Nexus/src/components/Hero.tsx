import { ArrowRight } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function Hero() {
  const { t } = useTranslation();

  const titleWords: Variants = {
    hidden: { y: "100%", rotate: 5 },
    visible: {
      y: 0,
      rotate: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
    },
  };

  const containerVars: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.1 },
    },
  };

  const expertiseItems = t("hero.expertise", {
    returnObjects: true,
  }) as string[];

  return (
    <section className="relative min-h-screen bg-[#0f1115] pt-28 pb-16 md:pt-32 md:pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden flex items-center">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.1, scale: 1 }}
        transition={{ duration: 2 }}
        className="absolute right-[-5%] top-[15%] md:right-[-10%] md:top-[20%] text-[25vw] md:text-[20vw] font-bold text-white select-none pointer-events-none italic opacity-5 leading-none"
      >
        NX-2025
      </motion.div>

      <div className="max-w-7xl mx-auto relative z-10 w-full">
        <div className="flex flex-col lg:flex-row gap-12 md:gap-16 items-start">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVars}
            className="w-full lg:w-2/3 space-y-8 md:space-y-10"
          >
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-block px-3 py-1 border-l-2 border-amber-500 bg-white/5 text-amber-500 text-[10px] md:text-xs tracking-[0.2em] uppercase font-bold"
            >
              {t("hero.badge")}
            </motion.div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-light text-white leading-[0.95] md:leading-[0.9] tracking-tighter uppercase">
              <div className="overflow-hidden">
                <motion.span variants={titleWords} className="block">
                  {t("hero.titleMain")}
                </motion.span>
              </div>
              <div className="overflow-hidden flex flex-wrap gap-x-3 md:gap-x-4">
                <motion.span
                  variants={titleWords}
                  className="font-serif italic text-amber-500 block"
                >
                  {t("hero.titleItalic")}
                </motion.span>
                <motion.span variants={titleWords} className="block">
                  {t("hero.titleEnd")}
                </motion.span>
              </div>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="max-w-md text-lg md:text-xl text-gray-400 font-light leading-relaxed"
            >
              {t("hero.description")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-6 md:gap-8"
            >
              <button className="group relative w-full sm:w-auto py-4 px-8 bg-white text-black font-bold outline-none transition-colors">
                <span className="relative z-10">{t("hero.cta")}</span>
                <motion.div
                  className="absolute inset-0 border border-white translate-x-1 translate-y-1 sm:translate-x-2 sm:translate-y-2 -z-10"
                  whileHover={{ x: 0, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                />
              </button>

              <a
                href="#capabilities"
                className="text-gray-500 hover:text-white transition-colors flex items-center gap-2 text-sm md:text-base underline underline-offset-8 decoration-amber-500/30 hover:decoration-amber-500"
              >
                {t("hero.secondaryCta")}
              </a>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="w-full lg:w-1/3 border-t lg:border-t-0 lg:border-l border-white/10 pt-10 lg:pt-0 lg:pl-10 mt-4 md:mt-0"
          >
            <h3 className="text-gray-500 text-[10px] md:text-xs font-bold mb-6 md:mb-8 uppercase tracking-widest flex items-center gap-2">
              <span className="h-1 w-1 bg-amber-500 rounded-full inline-block" />
              {t("hero.expertiseTitle")}
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-y-2 sm:gap-x-8 lg:gap-x-0">
              {expertiseItems.map((item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  className="group flex justify-between items-center py-4 md:py-2 border-b border-white/5 cursor-default transition-colors hover:border-white/20"
                >
                  <span className="text-xl md:text-2xl text-gray-300 group-hover:text-amber-500 transition-colors font-light italic">
                    {item}
                  </span>
                  <motion.div whileHover={{ x: 5 }}>
                    <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-gray-600 group-hover:text-amber-500 transition-colors" />
                  </motion.div>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
