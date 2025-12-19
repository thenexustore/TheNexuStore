import { Wifi, Cloud, Lock, Cpu, Zap, Package, Plus } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function Services() {
  const { t } = useTranslation();

  const services = [
    {
      icon: Wifi,
      code: "NT-01",
      title: t("services.items.nt01.title"),
      desc: t("services.items.nt01.desc"),
    },
    {
      icon: Cloud,
      code: "CL-05",
      title: t("services.items.cl05.title"),
      desc: t("services.items.cl05.desc"),
    },
    {
      icon: Lock,
      code: "SEC-09",
      title: t("services.items.sec09.title"),
      desc: t("services.items.sec09.desc"),
    },
    {
      icon: Cpu,
      code: "SYS-02",
      title: t("services.items.sys02.title"),
      desc: t("services.items.sys02.desc"),
    },
    {
      icon: Zap,
      code: "INT-04",
      title: t("services.items.int04.title"),
      desc: t("services.items.int04.desc"),
    },
    {
      icon: Package,
      code: "SUP-07",
      title: t("services.items.sup07.title"),
      desc: t("services.items.sup07.desc"),
    },
  ];

  const containerVars: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.3 },
    },
  };

  const itemVars: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <section className="bg-[#0f1115] py-16 md:py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(#fff 1px, transparent 1px),
            linear-gradient(90deg, #fff 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 md:mb-24 gap-6">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="max-w-full md:max-w-4xl"
          >
            <h2 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-light text-white tracking-tighter leading-[1] sm:leading-[0.9] uppercase">
              {t("services.title")} <br className="hidden sm:block" />
              <motion.span
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="font-serif italic text-amber-500"
              >
                {t("services.subtitle")}
              </motion.span>
            </h2>
          </motion.div>
        </div>

        <motion.div
          variants={containerVars}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="border-t border-white/10"
        >
          {services.map((service, idx) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={idx}
                variants={itemVars}
                className="group relative border-b border-white/10 py-6 sm:py-8 md:py-10 flex flex-col md:flex-row items-start md:items-center justify-between transition-all"
              >
                <motion.div
                  className="absolute bottom-0 left-0 h-[1px] bg-amber-500 z-20 hidden md:block"
                  initial={{ width: 0 }}
                  whileHover={{ width: "100%" }}
                  transition={{ duration: 0.4 }}
                />

                <div className="flex items-center gap-4 sm:gap-6 w-full md:w-1/2">
                  <div className="relative shrink-0">
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500 group-hover:text-white transition-colors z-10 relative" />
                    <motion.div
                      className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full"
                      animate={{ scale: [1, 1.5, 1], opacity: [0, 0.5, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    />
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[8px] sm:text-[9px] md:text-[10px] font-mono text-amber-500/60 mb-1 tracking-widest uppercase">
                      Catalog // {service.code}
                    </span>
                    <h3 className="text-lg sm:text-2xl md:text-3xl font-light text-gray-300 group-hover:text-white md:group-hover:translate-x-2 transition-all duration-500">
                      {service.title}
                    </h3>
                  </div>
                </div>

                <div className="mt-3 md:mt-0 w-full md:w-1/3">
                  <p className="text-gray-500 text-xs sm:text-sm leading-relaxed group-hover:text-gray-300 transition-colors">
                    {service.desc}
                  </p>
                </div>

                <div className="mt-5 md:mt-0 flex items-center justify-between md:justify-end w-full md:w-auto gap-4">
                  <span className="text-[9px] sm:text-[10px] text-gray-600 font-mono opacity-0 md:group-hover:opacity-100 transition-opacity uppercase">
                    Core_Init_Sys
                  </span>
                  <motion.button
                    whileHover={{
                      rotate: 90,
                      backgroundColor: "#f59e0b",
                      borderColor: "#f59e0b",
                    }}
                    whileTap={{ scale: 0.9 }}
                    className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border border-white/10 flex items-center justify-center text-white transition-all shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
