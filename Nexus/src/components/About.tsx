import {
  Award,
  Users,
  Globe,
  TrendingUp,
  ArrowRight,
  Minus,
} from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation, Trans } from "react-i18next";

export default function About() {
  const { t } = useTranslation();

  const values = [
    {
      icon: Award,
      title: t("about.values.excellence.title"),
      desc: t("about.values.excellence.desc"),
    },
    {
      icon: Users,
      title: t("about.values.partnership.title"),
      desc: t("about.values.partnership.desc"),
    },
    {
      icon: Globe,
      title: t("about.values.innovation.title"),
      desc: t("about.values.innovation.desc"),
    },
    {
      icon: TrendingUp,
      title: t("about.values.growth.title"),
      desc: t("about.values.growth.desc"),
    },
  ];

  const stats = [
    { num: "15+", lab: t("about.stats.years") },
    { num: "200+", lab: t("about.stats.nodes") },
    { num: "500+", lab: t("about.stats.projects") },
    { num: "99.9%", lab: t("about.stats.uptime") },
  ];

  return (
    <section className="relative bg-[#0f1115] py-16 md:py-32 px-4 sm:px-6 lg:px-8 border-t border-white/5 overflow-hidden">
      <div className="absolute top-10 right-4 md:right-10 font-mono text-[8px] md:text-[10px] text-white/10 rotate-90 tracking-[0.5em] md:tracking-[1em] pointer-events-none whitespace-nowrap">
        35.8894° N, 5.3213° W // CEUTA_STATION
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start mb-16 md:mb-32">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-7 space-y-6 md:space-y-8"
          >
            <div className="flex items-center gap-3 md:gap-4 text-amber-500 font-mono text-xs md:text-sm tracking-widest">
              <Minus className="w-6 md:w-8" />
              <span>{t("about.badge")}</span>
            </div>

            <h2 className="text-4xl sm:text-5xl md:text-7xl font-light text-white leading-[1.1] md:leading-none tracking-tighter uppercase">
              {t("about.titleMain")} <br className="hidden sm:block" />
              <span className="font-serif italic text-amber-500">
                {t("about.titleItalic")}
              </span>
            </h2>

            <div className="space-y-4 md:space-y-6 max-w-xl">
              <p className="text-lg md:text-xl text-gray-300 font-light leading-relaxed">
                <Trans i18nKey="about.p1">
                  Based in Ceuta, Spain,{" "}
                  <span className="text-white font-medium underline underline-offset-4 decoration-amber-500/50">
                    Nexus SP
                  </span>{" "}
                  has spent 15 years reinforcing the digital backbone of the
                  Mediterranean’s enterprise sector.
                </Trans>
              </p>
              <p className="text-sm md:text-base text-gray-500 leading-relaxed">
                {t("about.p2")}
              </p>
            </div>

            <motion.button
              whileHover={{ x: 10 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-4 text-white font-bold group pt-2"
            >
              <span className="h-10 w-10 md:h-12 md:w-12 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
              </span>
              <span className="tracking-widest text-[10px] md:text-xs uppercase">
                {t("about.cta")}
              </span>
            </motion.button>
          </motion.div>

          <div className="lg:col-span-5 grid grid-cols-2 gap-px bg-white/10 border border-white/10 w-full mt-8 lg:mt-0">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                whileHover={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                className="bg-[#0f1115] p-6 md:p-8 flex flex-col justify-center items-center text-center"
              >
                <span className="text-2xl md:text-3xl font-light text-amber-500 mb-1 tracking-tighter">
                  {stat.num}
                </span>
                <span className="text-[8px] md:text-[10px] text-gray-500 font-mono tracking-widest uppercase">
                  {stat.lab}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="pt-12 md:pt-20 border-t border-white/10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {values.map((v, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="space-y-3 md:space-y-4"
              >
                <v.icon className="w-5 h-5 md:w-6 md:h-6 text-amber-500/50" />
                <h4 className="text-white font-bold tracking-widest text-[10px] md:text-xs uppercase">
                  {v.title}
                </h4>
                <div className="h-[1px] w-full bg-gradient-to-r from-amber-500/50 to-transparent" />
                <p className="text-gray-500 text-xs md:text-sm leading-relaxed">
                  {v.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
