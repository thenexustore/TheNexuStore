import {
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Facebook,
  Twitter,
  ArrowUpRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  const services: string[] = [
    t("services.items.nt01.title"),
    t("services.items.cl05.title"),
    t("services.items.sec09.title"),
    t("services.items.sys02.title"),
    t("services.items.int04.title"),
    t("nav.store"),
  ];

  const company = [
    { label: t("footer.links.about"), href: "#about" },
    { label: t("footer.links.services"), href: "#services" },
    { label: t("footer.links.contact"), href: "#contact" },
  ];

  const contact = [
    { icon: MapPin, text: "Ceuta, Spain", id: "LOC_01" },
    { icon: Phone, text: "+34 (5) 6XX-XXXX", id: "TEL_01" },
    { icon: Mail, text: "info@nexussp.es", id: "EML_01" },
  ];

  const legalItems = t("footer.legal", { returnObjects: true }) as string[];

  return (
    <footer className="relative overflow-hidden bg-[#0f1115] border-t border-white/10 pt-24 pb-12 px-6">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      <div className="relative mx-auto max-w-7xl z-10">
        <div className="grid gap-12 lg:grid-cols-12 mb-20">
          {/* Brand Block */}
          <div className="lg:col-span-4 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 grayscale brightness-200">
                <img
                  src="https://nexusspsolutions.com/web/image/website/2/logo/NEXUS%20SP%20Solutions%20Servicios?unique=eb7a754"
                  className="h-8 w-auto"
                  alt="Nexus Logo"
                />
                <span className="text-xl font-light text-white tracking-tighter uppercase">
                  NEXUS{" "}
                  <span className="font-serif italic text-amber-500">SP </span>{" "}
                  Solutions
                </span>
              </div>
              <p className="text-sm text-gray-500 font-light leading-relaxed max-w-xs">
                {t("footer.tagline")}
              </p>
            </div>

            <div className="flex gap-4">
              {[Linkedin, Facebook, Twitter].map((Icon, i) => (
                <motion.a
                  key={i}
                  whileHover={{ y: -3, color: "#f59e0b" }}
                  href="#"
                  className="p-2 border border-white/10 text-gray-500 transition-colors hover:border-amber-500/50"
                >
                  <Icon className="h-4 w-4" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Services Block */}
          <div className="lg:col-span-3">
            <h4 className="mb-8 text-[10px] font-bold uppercase tracking-[0.3em] text-amber-500">
              {t("footer.systems")}
            </h4>
            <ul className="space-y-4">
              {services.map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="group flex items-center text-sm text-gray-400 hover:text-white transition-colors font-light"
                  >
                    {item}
                    <ArrowUpRight className="h-3 w-3 ml-2 opacity-0 group-hover:opacity-100 transition-all group-hover:text-amber-500" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Block */}
          <div className="lg:col-span-2">
            <h4 className="mb-8 text-[10px] font-bold uppercase tracking-[0.3em] text-amber-500">
              {t("footer.directory")}
            </h4>
            <ul className="space-y-4">
              {company.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors font-light"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Block */}
          <div className="lg:col-span-3">
            <h4 className="mb-8 text-[10px] font-bold uppercase tracking-[0.3em] text-amber-500">
              {t("footer.terminal")}
            </h4>
            <div className="space-y-6">
              {contact.map((item) => (
                <div key={item.id} className="flex gap-4 group">
                  <div className="mt-1 text-gray-600 group-hover:text-amber-500 transition-colors">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-gray-600 tracking-tighter uppercase">
                      {item.id}
                    </p>
                    <p className="text-sm text-gray-300 font-light">
                      {item.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            <p className="text-[10px] font-mono text-gray-600 tracking-[0.2em] uppercase">
              © {currentYear} Nexus SP Solutions // Secure_Auth_Verified
            </p>
          </div>

          <div className="flex gap-8">
            {legalItems.map((item) => (
              <a
                key={item}
                href="#"
                className="text-[10px] font-mono text-gray-700 hover:text-white transition-colors uppercase tracking-widest"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
    </footer>
  );
}
