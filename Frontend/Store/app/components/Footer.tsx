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
import {
  ArrowUp,
  Truck,
  ShieldCheck,
  RotateCcw,
  Headphones,
  Star,
  CheckCircle2,
  Globe,
  Clock,
  MessageCircle,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import { API_URL } from "@/app/lib/env";

// ─── Types (mirrors backend) ──────────────────────────────────────────────────
type FooterLegalLink = { label: string; url: string };
type FooterPaymentMethod = { label: string; iconUrl: string };
type FooterSocialLink = { platform: string; label: string; url: string };
type FooterTrustItem = { icon: string; text: string };

type FooterSettings = {
  logoUrl: string;
  logoAlt: string;
  newsletterEnabled: boolean;
  newsletterTitle: string;
  newsletterText: string;
  newsletterPlaceholder: string;
  newsletterButtonText: string;
  contactEmail: string;
  contactPhone: string;
  contactWhatsapp: string;
  contactAddress: string;
  contactHours: string;
  contactMapsUrl: string;
  legalLinks: FooterLegalLink[];
  paymentsEnabled: boolean;
  paymentMethods: FooterPaymentMethod[];
  socialEnabled: boolean;
  socialLinks: FooterSocialLink[];
  trustEnabled: boolean;
  trustItems: FooterTrustItem[];
  copyrightText: string;
};

// ─── Defaults (shown immediately while loading / on error) ───────────────────
const DEFAULT_FOOTER: FooterSettings = {
  logoUrl: "/logo1.jpeg",
  logoAlt: "TheNexuStore",
  newsletterEnabled: true,
  newsletterTitle: "¡Únete a nuestra comunidad!",
  newsletterText:
    "Recibe las últimas ofertas y novedades directamente en tu bandeja de entrada.",
  newsletterPlaceholder: "Tu correo electrónico",
  newsletterButtonText: "Suscribirse",
  contactEmail: "nexusspsolutionsceuta@gmail.com",
  contactPhone: "+34 656 806 899",
  contactWhatsapp: "+34 656 806 899",
  contactAddress: "Avenida España, nº32, 2ºB, CP 51001 Ceuta",
  contactHours: "Lun-Vie 9:00–18:00",
  contactMapsUrl: "",
  legalLinks: [
    { label: "Aviso legal", url: "/legal" },
    { label: "Privacidad", url: "/privacidad" },
    { label: "Términos y condiciones", url: "/terminos" },
    { label: "Política de cookies", url: "/cookies" },
    { label: "Envíos", url: "/envios" },
    { label: "Devoluciones", url: "/devoluciones" },
  ],
  paymentsEnabled: true,
  paymentMethods: [
    { label: "Visa", iconUrl: "" },
    { label: "Mastercard", iconUrl: "" },
    { label: "Bizum", iconUrl: "" },
    { label: "Redsys", iconUrl: "" },
  ],
  socialEnabled: true,
  socialLinks: [
    {
      platform: "facebook",
      label: "Facebook",
      url: "https://www.facebook.com/people/Nexus-SP-Solutions/61574722507921/?locale=es_ES",
    },
    {
      platform: "instagram",
      label: "Instagram",
      url: "https://www.instagram.com/nexusspsolutions/",
    },
    {
      platform: "linkedin",
      label: "LinkedIn",
      url: "https://www.linkedin.com/company/nexus-sp-solutions/",
    },
    { platform: "x", label: "X", url: "https://x.com/nexusspsolution" },
  ],
  trustEnabled: true,
  trustItems: [
    { icon: "truck", text: "Envío 24/48h" },
    { icon: "shield-check", text: "Compra 100% segura" },
    { icon: "rotate-ccw", text: "Devolución fácil" },
    { icon: "headphones", text: "Soporte 24/7" },
  ],
  copyrightText:
    "© {year} Sánchez Peinado Solutions S.L.U. — TheNexuStore. Todos los derechos reservados.",
};

// ─── Icon maps ────────────────────────────────────────────────────────────────
const SOCIAL_ICON_MAP: Record<
  string,
  React.ComponentType<{ sx?: Record<string, unknown> }>
> = {
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  linkedin: LinkedInIcon,
  x: XIcon,
  twitter: XIcon,
};

const TRUST_ICON_MAP: Record<string, LucideIcon> = {
  truck: Truck,
  "shield-check": ShieldCheck,
  "rotate-ccw": RotateCcw,
  headphones: Headphones,
  star: Star,
  "check-circle": CheckCircle2,
  globe: Globe,
};

export default function Footer() {
  const [email, setEmail] = useState("");
  const t = useTranslations("footer");
  const [footerLogoFallback, setFooterLogoFallback] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [config, setConfig] = useState<FooterSettings>(DEFAULT_FOOTER);

  // Back-to-top scroll listener
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch footer config from API
  useEffect(() => {
    fetch(`${API_URL}/footer/settings`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch footer settings");
        return r.json();
      })
      .then((payload) => {
        if (payload?.success && payload?.data) {
          setConfig(payload.data as FooterSettings);
        }
      })
      .catch(() => {
        // Silently fall back to DEFAULT_FOOTER
      });
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setEmail("");
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const effectiveLogoSrc = footerLogoFallback ? "/logo.png" : config.logoUrl;

  const mapsUrl =
    config.contactMapsUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.contactAddress)}`;

  const year = new Date().getFullYear();
  const copyright = config.copyrightText.replace("{year}", String(year));

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
        {/* Trust bar */}
        {config.trustEnabled && config.trustItems.length > 0 && (
          <div className="border-b border-white/10">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-3 flex flex-wrap justify-center gap-6 md:gap-10">
              {config.trustItems.map((item, i) => {
                const TrustIcon = TRUST_ICON_MAP[item.icon] ?? CheckCircle2;
                return (
                  <div key={i} className="flex items-center gap-2 text-white/70">
                    <TrustIcon size={14} className="text-indigo-300 flex-shrink-0" />
                    <span className="text-xs font-medium">{item.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 items-start">
            {/* Brand + Newsletter */}
            <div className="lg:col-span-2">
              <img
                src={effectiveLogoSrc}
                alt={config.logoAlt}
                className="mb-5 block h-9 w-auto max-w-full"
                onError={() => {
                  if (!footerLogoFallback) setFooterLogoFallback(true);
                }}
              />

              {config.newsletterEnabled && (
                <>
                  <h3 className="text-base font-semibold mb-1">
                    {config.newsletterTitle || t("title")}
                  </h3>
                  {config.newsletterText && (
                    <p className="text-sm text-white/60 mb-3">
                      {config.newsletterText}
                    </p>
                  )}
                  <form
                    onSubmit={handleSubscribe}
                    className="flex flex-col sm:flex-row gap-2 max-w-md lg:max-w-lg"
                  >
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={
                        config.newsletterPlaceholder || t("placeholder")
                      }
                      className="flex-1 rounded-xl px-4 py-3 bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/50 outline-none focus:border-white/60 focus:bg-white/15 transition-all"
                      required
                    />
                    <button
                      type="submit"
                      className="rounded-xl bg-white text-[#0B123A] px-6 py-3 text-sm font-semibold hover:bg-slate-100 transition-all duration-200 whitespace-nowrap"
                    >
                      {config.newsletterButtonText || t("subscribe")}
                    </button>
                  </form>
                </>
              )}

              {/* Payment methods */}
              {config.paymentsEnabled && config.paymentMethods.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs text-white/40 mb-2 flex items-center gap-1.5">
                    <CreditCard size={11} />
                    Métodos de pago aceptados
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {config.paymentMethods.map((pm, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-md px-2.5 py-1"
                      >
                        {pm.iconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={pm.iconUrl}
                            alt={pm.label}
                            className="h-4 w-auto"
                          />
                        ) : (
                          <CreditCard size={11} className="text-white/50" />
                        )}
                        <span className="text-xs text-white/70">{pm.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-base font-semibold mb-4">{t("contact")}</h3>
              <div className="space-y-3 text-sm text-white/70">
                {config.contactAddress && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 hover:text-white transition-colors group"
                  >
                    <LocationOnIcon
                      sx={{ fontSize: 16 }}
                      className="mt-0.5 group-hover:text-indigo-300 transition-colors"
                    />
                    <span>{config.contactAddress}</span>
                  </a>
                )}

                {config.contactHours && (
                  <div className="flex items-center gap-3">
                    <Clock size={14} className="flex-shrink-0" />
                    <span>{config.contactHours}</span>
                  </div>
                )}

                {config.contactEmail && (
                  <a
                    href={`mailto:${config.contactEmail}`}
                    className="flex items-center gap-3 hover:text-white transition-colors group"
                  >
                    <MailIcon
                      sx={{ fontSize: 16 }}
                      className="group-hover:text-indigo-300 transition-colors"
                    />
                    <span>{config.contactEmail}</span>
                  </a>
                )}

                {config.contactPhone && (
                  <a
                    href={`tel:${config.contactPhone.replace(/\s/g, "")}`}
                    className="flex items-center gap-3 hover:text-white transition-colors group"
                  >
                    <PhoneIcon
                      sx={{ fontSize: 16 }}
                      className="group-hover:text-indigo-300 transition-colors"
                    />
                    <span>{config.contactPhone}</span>
                  </a>
                )}

                {config.contactWhatsapp &&
                  config.contactWhatsapp !== config.contactPhone && (
                    <a
                      href={`https://wa.me/${config.contactWhatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 hover:text-white transition-colors group"
                    >
                      <MessageCircle
                        size={14}
                        className="group-hover:text-green-400 transition-colors"
                      />
                      <span>WhatsApp: {config.contactWhatsapp}</span>
                    </a>
                  )}
              </div>

              {/* Social links */}
              {config.socialEnabled && config.socialLinks.length > 0 && (
                <div className="flex gap-4 pt-5">
                  {config.socialLinks.map((sl, i) => {
                    const SocIcon = SOCIAL_ICON_MAP[sl.platform] ?? FacebookIcon;
                    return (
                      <a
                        key={i}
                        href={sl.url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={sl.label}
                        className="text-white/60 hover:text-white hover:scale-110 transition-all duration-200"
                      >
                        <SocIcon sx={{ fontSize: 20 }} />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4 flex flex-col md:flex-row gap-3 items-center justify-between text-xs text-white/50 text-center md:text-left">
            <p>{copyright}</p>

            {config.legalLinks.length > 0 && (
              <div className="flex flex-wrap justify-center gap-6">
                {config.legalLinks.map((ll, i) => (
                  <a
                    key={i}
                    href={ll.url || "#"}
                    className="cursor-pointer hover:text-white transition-colors"
                  >
                    {ll.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </footer>
    </>
  );
}
