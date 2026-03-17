"use client";

import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import PhoneIcon from "@mui/icons-material/Phone";
import MailIcon from "@mui/icons-material/Mail";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import XIcon from "@mui/icons-material/X";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { loadStoreBranding, subscribeStoreBranding, type StoreBranding } from "@/app/lib/admin-branding";
import StoreBrandLogo from "./StoreBrandLogo";
import { ArrowUp } from "lucide-react";

export default function Footer() {
  const [email, setEmail] = useState("");
  const t = useTranslations("footer");
  const [storeBranding, setStoreBranding] = useState<StoreBranding>(() => loadStoreBranding());
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => subscribeStoreBranding(setStoreBranding), []);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const socialLinks = [
    { Icon: FacebookIcon, url: "https://www.facebook.com/people/Nexus-SP-Solutions/61574722507921/?locale=es_ES", label: "Facebook" },
    { Icon: InstagramIcon, url: "https://www.instagram.com/nexusspsolutions/", label: "Instagram" },
    { Icon: LinkedInIcon, url: "https://www.linkedin.com/company/nexus-sp-solutions/", label: "LinkedIn" },
    { Icon: XIcon, url: "https://x.com/nexusspsolution", label: "X" }
  ];

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setEmail("");
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const address = "Paseo de las Palmeras, 3, Local B, 51001 Ceuta";
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <>
      {/* Back to top button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          aria-label="Back to top"
          className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-[#0B123A] text-white shadow-lg hover:bg-[#1a245a] transition-all duration-200 hover:scale-110 active:scale-95"
        >
          <ArrowUp size={20} />
        </button>
      )}

      <footer className="w-full bg-[#0B123A] text-white">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 items-start">
            {/* Brand + Newsletter */}
            <div className="lg:col-span-2">
              <StoreBrandLogo branding={storeBranding} alt="Logo" className="w-auto mb-5" height={36} />
              <h3 className="text-base font-semibold mb-3">{t("title")}</h3>
              <form
                onSubmit={handleSubscribe}
                className="flex flex-col sm:flex-row gap-2 max-w-md"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("placeholder")}
                  className="flex-1 rounded-xl px-4 py-3 bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/50 outline-none focus:border-white/60 focus:bg-white/15 transition-all"
                  required
                />
                <button
                  type="submit"
                  className="rounded-xl bg-white text-[#0B123A] px-6 py-3 text-sm font-semibold hover:bg-slate-100 transition-all duration-200 whitespace-nowrap"
                >
                  {t("subscribe")}
                </button>
              </form>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-base font-semibold mb-4">{t("contact")}</h3>
              <div className="space-y-3 text-sm text-white/70">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 hover:text-white transition-colors group"
                >
                  <LocationOnIcon sx={{ fontSize: 16 }} className="mt-0.5 group-hover:text-indigo-300 transition-colors" />
                  <span>{address}</span>
                </a>
                <a
                  href="mailto:administracion@nexusssolutions.com"
                  className="flex items-center gap-3 hover:text-white transition-colors group"
                >
                  <MailIcon sx={{ fontSize: 16 }} className="group-hover:text-indigo-300 transition-colors" />
                  <span>administracion@nexusssolutions.com</span>
                </a>
                <a
                  href="tel:+34656806899"
                  className="flex items-center gap-3 hover:text-white transition-colors group"
                >
                  <PhoneIcon sx={{ fontSize: 16 }} className="group-hover:text-indigo-300 transition-colors" />
                  <span>+34 656 806 899</span>
                </a>
              </div>

              <div className="flex gap-4 pt-5">
                {socialLinks.map(({ Icon, url, label }) => (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="text-white/60 hover:text-white hover:scale-110 transition-all duration-200"
                  >
                    <Icon sx={{ fontSize: 20 }} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row gap-3 items-center justify-between text-xs text-white/50 text-center md:text-left">
            <p>
              © {new Date().getFullYear()} Sánchez Peinado Solutions SL —{" "}
              <span className="font-semibold text-white/80">NEXUS SP Solutions</span>
              . {t("rights")}
            </p>

            <div className="flex flex-wrap justify-center gap-6">
              <span className="cursor-pointer hover:text-white transition-colors">
                {t("legal")}
              </span>
              <span className="cursor-pointer hover:text-white transition-colors">
                {t("privacy")}
              </span>
              <span className="cursor-pointer hover:text-white transition-colors">
                {t("terms")}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
