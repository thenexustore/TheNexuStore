"use client";

import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import PhoneIcon from "@mui/icons-material/Phone";
import MailIcon from "@mui/icons-material/Mail";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import XIcon from "@mui/icons-material/X";
import { useState } from "react";
import { useTranslations } from "next-intl";

export default function Footer() {
  const [email, setEmail] = useState("");
  const t = useTranslations("footer");

  const socialLinks = [
    { Icon: FacebookIcon, url: "https://www.facebook.com/people/Nexus-SP-Solutions/61574722507921/?locale=es_ES" },
    { Icon: InstagramIcon, url: "https://www.instagram.com/nexusspsolutions/" },
    { Icon: LinkedInIcon, url: "https://www.linkedin.com/company/nexus-sp-solutions/" },
    { Icon: XIcon, url: "https://x.com/nexusspsolution" }
  ];

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setEmail("");
  };

  return (
    <footer className="w-full bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          <div>
            <h3 className="text-lg font-semibold mb-4">{t("title")}</h3>
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("placeholder")} className="w-full rounded-full px-5 py-3 bg-transparent border border-white/30 text-sm outline-none focus:border-white transition" required />
              <button type="submit" className="rounded-full bg-white text-black px-6 py-3 text-sm font-medium hover:bg-gray-200 transition">{t("subscribe")}</button>
            </form>
          </div>

          <div className="md:justify-self-end w-full md:max-w-sm">
            <h3 className="text-lg font-semibold mb-4">{t("contact")}</h3>
            <div className="space-y-3 text-sm text-white/70">
              <div className="flex items-start gap-3"><LocationOnIcon sx={{ fontSize: 16 }} /><span>Paseo de las Palmeras, 3, Local B, 51001 Ceuta</span></div>
              <div className="flex items-center gap-3"><MailIcon sx={{ fontSize: 16 }} /><span>administracion@nexusssolutions.com</span></div>
              <div className="flex items-center gap-3"><PhoneIcon sx={{ fontSize: 16 }} /><span>+34 656 806 899</span></div>
            </div>
            <div className="flex gap-5 pt-5 text-white/80">{socialLinks.map(({ Icon, url }, i) => <Icon key={i} sx={{ fontSize: 18 }} className="cursor-pointer hover:text-white transition" onClick={() => window.open(url, "_blank", "noopener,noreferrer")} />)}</div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row gap-3 items-center justify-between text-xs text-white/60 text-center md:text-left">
          <p>© {new Date().getFullYear()} Sánchez Peinado Solutions SL — <span className="font-semibold text-white">NEXUS SP Solutions</span>. {t("rights")}</p>
          <div className="flex flex-wrap justify-center gap-6"><span>{t("legal")}</span><span>{t("privacy")}</span><span>{t("terms")}</span></div>
        </div>
      </div>
    </footer>
  );
}
