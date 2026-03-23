"use client";

import { type ReactNode, useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Save,
  RotateCcw,
  Undo2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageCircle,
  Truck,
  ShieldCheck,
  Headphones,
  CreditCard,
  Globe,
  Star,
  CheckCircle2,
  Monitor,
  Columns2,
  ArrowUp,
  Link2,
  Image,
  AlignLeft,
  type LucideIcon,
} from "lucide-react";
import {
  fetchFooterSettings,
  saveFooterSettings,
  resetFooterSettings,
  type FooterSettings,
  type FooterLegalLink,
  type FooterPaymentMethod,
  type FooterSocialLink,
  type FooterTrustItem,
} from "@/lib/api/footer";

// ─── Default settings (mirrors backend defaults) ──────────────────────────────
const DEFAULT_SETTINGS: FooterSettings = {
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
    { platform: "x", label: "X / Twitter", url: "https://x.com/nexusspsolution" },
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

const SOCIAL_ICONS: Record<string, LucideIcon> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  x: Twitter,
  twitter: Twitter,
};

const TRUST_ICONS: Record<string, LucideIcon> = {
  truck: Truck,
  "shield-check": ShieldCheck,
  "rotate-ccw": RotateCcw,
  headphones: Headphones,
  star: Star,
  "check-circle": CheckCircle2,
  globe: Globe,
  phone: Phone,
  mail: Mail,
};

const TRUST_ICON_OPTIONS = [
  { value: "truck", label: "Camión" },
  { value: "shield-check", label: "Escudo" },
  { value: "rotate-ccw", label: "Devolución" },
  { value: "headphones", label: "Soporte" },
  { value: "star", label: "Estrella" },
  { value: "check-circle", label: "Check" },
  { value: "globe", label: "Global" },
  { value: "phone", label: "Teléfono" },
  { value: "mail", label: "Email" },
];

const SOCIAL_PLATFORM_OPTIONS = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "x", label: "X / Twitter" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "pinterest", label: "Pinterest" },
];

// ─── Shared UI atoms ──────────────────────────────────────────────────────────
function SectionCard({
  title,
  icon: Icon,
  children,
  collapsible = true,
  defaultOpen = true,
  badge,
  toggleable,
  toggleValue,
  onToggle,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  badge?: string;
  toggleable?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => collapsible && setOpen((o) => !o)}
        className={`w-full flex items-center gap-3 px-5 py-4 text-left ${collapsible ? "hover:bg-zinc-50 cursor-pointer" : "cursor-default"} transition-colors`}
      >
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex-shrink-0">
          <Icon size={16} />
        </span>
        <span className="flex-1 flex items-center gap-2">
          <span className="font-semibold text-zinc-900 text-sm">{title}</span>
          {badge && (
            <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </span>
        {toggleable && onToggle && (
          <span
            onClick={(e) => { e.stopPropagation(); onToggle(!toggleValue); }}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${toggleValue ? "bg-indigo-600" : "bg-zinc-300"}`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${toggleValue ? "translate-x-4" : "translate-x-0"}`}
            />
          </span>
        )}
        {collapsible && (
          <span className="text-zinc-400 ml-1">
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        )}
      </button>

      {(!collapsible || open) && (
        <div className="px-5 pb-5 pt-1 border-t border-zinc-100">{children}</div>
      )}
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-600 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
      />
      {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}

function FormTextarea({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-600 mb-1">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all resize-none"
      />
    </div>
  );
}

// ─── Footer Preview Component ─────────────────────────────────────────────────
function FooterPreview({
  settings,
  scale = 1,
}: {
  settings: FooterSettings;
  scale?: number;
}) {
  const year = new Date().getFullYear();
  const copyright = settings.copyrightText.replace("{year}", String(year));
  const [previewLogoFailed, setPreviewLogoFailed] = useState(false);

  useEffect(() => {
    setPreviewLogoFailed(false);
  }, [settings.logoUrl]);

  const getSocialIcon = (platform: string) => {
    const IconComp = SOCIAL_ICONS[platform] || Globe;
    return IconComp;
  };

  const getTrustIcon = (icon: string) => {
    const IconComp = TRUST_ICONS[icon] || CheckCircle2;
    return IconComp;
  };

  return (
    <div
      style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
      className="w-full bg-[#0B123A] text-white font-sans text-sm select-none"
    >
      {/* Trust bar */}
      {settings.trustEnabled && settings.trustItems.length > 0 && (
        <div className="border-b border-white/10">
          <div className="max-w-6xl mx-auto px-6 py-3 flex flex-wrap justify-center gap-6">
            {settings.trustItems.map((item, i) => {
              const TrustIcon = getTrustIcon(item.icon);
              return (
                <div key={i} className="flex items-center gap-2 text-white/70">
                  <TrustIcon size={14} className="text-indigo-300" />
                  <span className="text-xs">{item.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Col 1 – Branding + Newsletter */}
          <div className="md:col-span-2">
            {settings.logoUrl && !previewLogoFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.logoUrl}
                alt={settings.logoAlt}
                className="mb-4 h-8 w-auto max-w-full object-contain"
                onError={() => setPreviewLogoFailed(true)}
              />
            ) : (
              <div className="mb-4 h-8 flex items-center">
                <span className="font-bold text-lg text-white">
                  {settings.logoAlt || "TheNexuStore"}
                </span>
              </div>
            )}

            {settings.newsletterEnabled && (
              <div className="mb-4">
                <h3 className="font-semibold text-sm mb-1">
                  {settings.newsletterTitle}
                </h3>
                {settings.newsletterText && (
                  <p className="text-xs text-white/60 mb-3">
                    {settings.newsletterText}
                  </p>
                )}
                <div className="flex gap-2 max-w-sm">
                  <div className="flex-1 rounded-lg px-3 py-2 bg-white/10 border border-white/20 text-xs text-white/50">
                    {settings.newsletterPlaceholder}
                  </div>
                  <div className="rounded-lg bg-white text-[#0B123A] px-4 py-2 text-xs font-semibold whitespace-nowrap">
                    {settings.newsletterButtonText}
                  </div>
                </div>
              </div>
            )}

            {/* Payment methods */}
            {settings.paymentsEnabled && settings.paymentMethods.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-white/40 mb-2 flex items-center gap-1.5">
                  <CreditCard size={11} />
                  Métodos de pago aceptados
                </p>
                <div className="flex flex-wrap gap-2">
                  {settings.paymentMethods.map((pm, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-md px-2 py-1"
                    >
                      {pm.iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={pm.iconUrl} alt={pm.label} className="h-4 w-auto" />
                      ) : (
                        <CreditCard size={12} className="text-white/50" />
                      )}
                      <span className="text-xs text-white/70">{pm.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Col 2 – Contact */}
          <div>
            <h3 className="font-semibold text-sm mb-4 text-white">Contacto</h3>
            <div className="space-y-2.5 text-xs text-white/60">
              {settings.contactAddress && (
                <div className="flex items-start gap-2">
                  <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                  <span>{settings.contactAddress}</span>
                </div>
              )}
              {settings.contactHours && (
                <div className="flex items-center gap-2">
                  <Clock size={12} className="flex-shrink-0" />
                  <span>{settings.contactHours}</span>
                </div>
              )}
              {settings.contactEmail && (
                <div className="flex items-center gap-2">
                  <Mail size={12} className="flex-shrink-0" />
                  <span>{settings.contactEmail}</span>
                </div>
              )}
              {settings.contactPhone && (
                <div className="flex items-center gap-2">
                  <Phone size={12} className="flex-shrink-0" />
                  <span>{settings.contactPhone}</span>
                </div>
              )}
              {settings.contactWhatsapp && settings.contactWhatsapp !== settings.contactPhone && (
                <div className="flex items-center gap-2">
                  <MessageCircle size={12} className="flex-shrink-0" />
                  <span>WhatsApp: {settings.contactWhatsapp}</span>
                </div>
              )}
            </div>

            {/* Social links */}
            {settings.socialEnabled && settings.socialLinks.length > 0 && (
              <div className="flex gap-3 pt-5">
                {settings.socialLinks.map((sl, i) => {
                  const SocIcon = getSocialIcon(sl.platform);
                  return (
                    <div
                      key={i}
                      title={sl.label}
                      className="text-white/50 hover:text-white"
                    >
                      <SocIcon size={16} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex flex-col md:flex-row gap-2 items-center justify-between text-xs text-white/40">
          <p>{copyright}</p>
          {settings.legalLinks.length > 0 && (
            <div className="flex flex-wrap justify-center gap-4">
              {settings.legalLinks.map((ll, i) => (
                <span key={i} className="hover:text-white cursor-pointer transition-colors">
                  {ll.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function FooterSettingsPage() {
  const [settings, setSettings] = useState<FooterSettings>(DEFAULT_SETTINGS);
  const [savedSnapshot, setSavedSnapshot] = useState<FooterSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [layout, setLayout] = useState<"split" | "editor" | "preview">("split");
  const [logoPreviewFailed, setLogoPreviewFailed] = useState(false);

  const hasChanges = !deepEqual(settings, savedSnapshot);

  // Reset logo preview failed state when URL changes
  useEffect(() => {
    setLogoPreviewFailed(false);
  }, [settings.logoUrl]);

  // Load settings on mount
  useEffect(() => {
    setLoading(true);
    fetchFooterSettings()
      .then((data) => {
        setSettings(data);
        setSavedSnapshot(data);
        setLoadError(null);
      })
      .catch((err) => {
        setLoadError(err?.message ?? "Error al cargar la configuración");
        setSettings(DEFAULT_SETTINGS);
        setSavedSnapshot(DEFAULT_SETTINGS);
      })
      .finally(() => setLoading(false));
  }, []);

  // Ctrl+S keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!saving && hasChanges) handleSave();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, hasChanges]);

  // ── Updater helpers ──────────────────────────────────────────────────────
  const upd = useCallback(<K extends keyof FooterSettings>(
    key: K,
    value: FooterSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Legal links
  const addLegalLink = () =>
    upd("legalLinks", [...settings.legalLinks, { label: "", url: "" }]);
  const removeLegalLink = (i: number) =>
    upd("legalLinks", settings.legalLinks.filter((_, idx) => idx !== i));
  const updateLegalLink = (i: number, field: keyof FooterLegalLink, val: string) => {
    const next = settings.legalLinks.map((l, idx) =>
      idx === i ? { ...l, [field]: val } : l
    );
    upd("legalLinks", next);
  };

  // Payment methods
  const addPayment = () =>
    upd("paymentMethods", [...settings.paymentMethods, { label: "", iconUrl: "" }]);
  const removePayment = (i: number) =>
    upd("paymentMethods", settings.paymentMethods.filter((_, idx) => idx !== i));
  const updatePayment = (i: number, field: keyof FooterPaymentMethod, val: string) => {
    const next = settings.paymentMethods.map((p, idx) =>
      idx === i ? { ...p, [field]: val } : p
    );
    upd("paymentMethods", next);
  };

  // Social links
  const addSocial = () =>
    upd("socialLinks", [
      ...settings.socialLinks,
      { platform: "facebook", label: "Facebook", url: "" },
    ]);
  const removeSocial = (i: number) =>
    upd("socialLinks", settings.socialLinks.filter((_, idx) => idx !== i));
  const updateSocial = (i: number, field: keyof FooterSocialLink, val: string) => {
    const next = settings.socialLinks.map((s, idx) => {
      if (idx !== i) return s;
      const updated = { ...s, [field]: val };
      if (field === "platform") {
        const found = SOCIAL_PLATFORM_OPTIONS.find((o) => o.value === val);
        updated.label = found?.label ?? val;
      }
      return updated;
    });
    upd("socialLinks", next);
  };

  // Trust items
  const addTrust = () =>
    upd("trustItems", [...settings.trustItems, { icon: "check-circle", text: "" }]);
  const removeTrust = (i: number) =>
    upd("trustItems", settings.trustItems.filter((_, idx) => idx !== i));
  const updateTrust = (i: number, field: keyof FooterTrustItem, val: string) => {
    const next = settings.trustItems.map((t, idx) =>
      idx === i ? { ...t, [field]: val } : t
    );
    upd("trustItems", next);
  };

  // ── Actions ──────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    try {
      const saved = await saveFooterSettings(settings);
      setSavedSnapshot(saved);
      setSettings(saved);
      toast.success("Configuración del footer guardada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!confirm("¿Restaurar todos los valores por defecto? Perderás los cambios actuales.")) return;
    setResetting(true);
    try {
      const reset = await resetFooterSettings();
      setSettings(reset);
      setSavedSnapshot(reset);
      toast.success("Footer restaurado a valores por defecto");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al restaurar");
    } finally {
      setResetting(false);
    }
  }

  function handleDiscard() {
    setSettings(savedSnapshot);
    toast.info("Cambios descartados");
  }

  // ── Editor panels ─────────────────────────────────────────────────────────
  const editorPanel = (
    <div className="flex flex-col gap-4">
      {/* Branding */}
      <SectionCard title="Marca y Logo" icon={Image}>
        <div className="pt-3 grid gap-4">
          <FormInput
            label="URL del logo"
            value={settings.logoUrl}
            onChange={(v) => upd("logoUrl", v)}
            placeholder="/logo1.jpeg o https://..."
            hint="Ruta relativa o URL absoluta de la imagen del logo"
          />
          <FormInput
            label="Texto alternativo (alt)"
            value={settings.logoAlt}
            onChange={(v) => upd("logoAlt", v)}
            placeholder="Nombre de tu tienda"
          />
          {settings.logoUrl && (
            <div className="flex items-center gap-3 p-3 bg-zinc-900 rounded-xl">
              {!logoPreviewFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={settings.logoUrl}
                  alt={settings.logoAlt}
                  className="h-8 w-auto object-contain"
                  onError={() => setLogoPreviewFailed(true)}
                />
              ) : (
                <span className="text-xs text-white/50 italic">
                  No se pudo cargar la imagen
                </span>
              )}
              <span className="text-xs text-zinc-400">Vista previa del logo</span>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Newsletter */}
      <SectionCard
        title="Newsletter"
        icon={Mail}
        toggleable
        toggleValue={settings.newsletterEnabled}
        onToggle={(v) => upd("newsletterEnabled", v)}
      >
        <div className={`pt-3 grid gap-4 transition-opacity ${settings.newsletterEnabled ? "" : "opacity-40 pointer-events-none"}`}>
          <FormInput
            label="Título"
            value={settings.newsletterTitle}
            onChange={(v) => upd("newsletterTitle", v)}
          />
          <FormTextarea
            label="Texto descriptivo"
            value={settings.newsletterText}
            onChange={(v) => upd("newsletterText", v)}
            rows={2}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Placeholder del input"
              value={settings.newsletterPlaceholder}
              onChange={(v) => upd("newsletterPlaceholder", v)}
            />
            <FormInput
              label="Texto del botón"
              value={settings.newsletterButtonText}
              onChange={(v) => upd("newsletterButtonText", v)}
            />
          </div>
        </div>
      </SectionCard>

      {/* Contact */}
      <SectionCard title="Contacto" icon={Phone}>
        <div className="pt-3 grid gap-4">
          <FormInput
            label="Email de contacto"
            value={settings.contactEmail}
            onChange={(v) => upd("contactEmail", v)}
            type="email"
          />
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Teléfono"
              value={settings.contactPhone}
              onChange={(v) => upd("contactPhone", v)}
              placeholder="+34 000 000 000"
            />
            <FormInput
              label="WhatsApp"
              value={settings.contactWhatsapp}
              onChange={(v) => upd("contactWhatsapp", v)}
              placeholder="+34 000 000 000"
            />
          </div>
          <FormInput
            label="Dirección física"
            value={settings.contactAddress}
            onChange={(v) => upd("contactAddress", v)}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Horario"
              value={settings.contactHours}
              onChange={(v) => upd("contactHours", v)}
              placeholder="Lun-Vie 9:00–18:00"
            />
            <FormInput
              label="URL Google Maps (opcional)"
              value={settings.contactMapsUrl}
              onChange={(v) => upd("contactMapsUrl", v)}
              placeholder="https://maps.google.com/..."
            />
          </div>
        </div>
      </SectionCard>

      {/* Legal links */}
      <SectionCard
        title="Enlaces legales"
        icon={Link2}
        badge={`${settings.legalLinks.length} enlaces`}
      >
        <div className="pt-3 space-y-2">
          {settings.legalLinks.map((ll, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input
                  value={ll.label}
                  onChange={(e) => updateLegalLink(i, "label", e.target.value)}
                  placeholder="Etiqueta"
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                />
                <input
                  value={ll.url}
                  onChange={(e) => updateLegalLink(i, "url", e.target.value)}
                  placeholder="URL o ruta"
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                />
              </div>
              <button
                type="button"
                onClick={() => removeLegalLink(i)}
                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addLegalLink}
            className="mt-2 flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            <Plus size={13} /> Añadir enlace legal
          </button>
        </div>
      </SectionCard>

      {/* Payment methods */}
      <SectionCard
        title="Métodos de pago"
        icon={CreditCard}
        badge={`${settings.paymentMethods.length} métodos`}
        toggleable
        toggleValue={settings.paymentsEnabled}
        onToggle={(v) => upd("paymentsEnabled", v)}
      >
        <div className={`pt-3 space-y-2 transition-opacity ${settings.paymentsEnabled ? "" : "opacity-40 pointer-events-none"}`}>
          {settings.paymentMethods.map((pm, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input
                  value={pm.label}
                  onChange={(e) => updatePayment(i, "label", e.target.value)}
                  placeholder="Nombre (ej. Visa)"
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                />
                <input
                  value={pm.iconUrl}
                  onChange={(e) => updatePayment(i, "iconUrl", e.target.value)}
                  placeholder="URL icono (opcional)"
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                />
              </div>
              <button
                type="button"
                onClick={() => removePayment(i)}
                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addPayment}
            className="mt-2 flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            <Plus size={13} /> Añadir método de pago
          </button>
        </div>
      </SectionCard>

      {/* Social links */}
      <SectionCard
        title="Redes sociales"
        icon={Globe}
        badge={`${settings.socialLinks.length} redes`}
        toggleable
        toggleValue={settings.socialEnabled}
        onToggle={(v) => upd("socialEnabled", v)}
      >
        <div className={`pt-3 space-y-2 transition-opacity ${settings.socialEnabled ? "" : "opacity-40 pointer-events-none"}`}>
          {settings.socialLinks.map((sl, i) => {
            const SocIcon = SOCIAL_ICONS[sl.platform] ?? Globe;
            return (
              <div key={i} className="flex gap-2 items-center">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-100 text-zinc-500 flex-shrink-0">
                  <SocIcon size={14} />
                </div>
                <select
                  value={sl.platform}
                  onChange={(e) => updateSocial(i, "platform", e.target.value)}
                  className="w-32 rounded-lg border border-zinc-200 px-2 py-2 text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all bg-white"
                >
                  {SOCIAL_PLATFORM_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <input
                  value={sl.url}
                  onChange={(e) => updateSocial(i, "url", e.target.value)}
                  placeholder="https://..."
                  className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => removeSocial(i)}
                  className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={addSocial}
            className="mt-2 flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            <Plus size={13} /> Añadir red social
          </button>
        </div>
      </SectionCard>

      {/* Trust items */}
      <SectionCard
        title="Beneficios / Trust"
        icon={ShieldCheck}
        badge={`${settings.trustItems.length} elementos`}
        toggleable
        toggleValue={settings.trustEnabled}
        onToggle={(v) => upd("trustEnabled", v)}
      >
        <div className={`pt-3 space-y-2 transition-opacity ${settings.trustEnabled ? "" : "opacity-40 pointer-events-none"}`}>
          {settings.trustItems.map((ti, i) => {
            const TrustIcon = TRUST_ICONS[ti.icon] ?? CheckCircle2;
            return (
              <div key={i} className="flex gap-2 items-center">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex-shrink-0">
                  <TrustIcon size={14} />
                </div>
                <select
                  value={ti.icon}
                  onChange={(e) => updateTrust(i, "icon", e.target.value)}
                  className="w-32 rounded-lg border border-zinc-200 px-2 py-2 text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all bg-white"
                >
                  {TRUST_ICON_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <input
                  value={ti.text}
                  onChange={(e) => updateTrust(i, "text", e.target.value)}
                  placeholder="Texto del beneficio"
                  className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => removeTrust(i)}
                  className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={addTrust}
            className="mt-2 flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            <Plus size={13} /> Añadir elemento
          </button>
        </div>
      </SectionCard>

      {/* Copyright */}
      <SectionCard title="Copyright" icon={AlignLeft}>
        <div className="pt-3">
          <FormInput
            label="Texto de copyright"
            value={settings.copyrightText}
            onChange={(v) => upd("copyrightText", v)}
            hint="Usa {year} para insertar el año actual automáticamente"
          />
        </div>
      </SectionCard>
    </div>
  );

  const previewPanel = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 rounded-t-xl text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <Monitor size={13} />
          <span>Vista previa en tiempo real</span>
        </div>
        {hasChanges && (
          <span className="flex items-center gap-1 text-amber-400">
            <AlertCircle size={11} />
            Sin guardar
          </span>
        )}
      </div>
      <div className="flex-1 overflow-auto rounded-b-xl border border-zinc-200 bg-[#0B123A]">
        <FooterPreview settings={settings} />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-indigo-500" size={28} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Top toolbar ────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-zinc-200 px-5 py-3 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-zinc-900 truncate">Pie de página</h1>
          <p className="text-xs text-zinc-500 hidden sm:block">
            Configura el footer global del ecommerce
          </p>
        </div>

        {loadError && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
            <AlertCircle size={13} />
            {loadError} — usando valores por defecto
          </div>
        )}

        {hasChanges && (
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-amber-600 font-medium bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
            <AlertCircle size={12} />
            Cambios pendientes
          </span>
        )}

        {/* Layout toggle */}
        <div className="flex items-center rounded-lg border border-zinc-200 overflow-hidden text-xs bg-white">
          {(
            [
              { key: "editor", icon: AlignLeft, label: "Editor" },
              { key: "split", icon: Columns2, label: "Split" },
              { key: "preview", icon: Eye, label: "Preview" },
            ] as const
          ).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setLayout(key)}
              title={label}
              className={`flex items-center gap-1 px-2.5 py-1.5 transition-colors ${layout === key ? "bg-indigo-600 text-white" : "text-zinc-500 hover:bg-zinc-50"}`}
            >
              <Icon size={13} />
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDiscard}
            disabled={!hasChanges || saving}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Undo2 size={13} />
            Descartar
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={saving || resetting}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {resetting ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
            Restaurar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            title="Guardar (Ctrl+S)"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Guardar
          </button>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden p-5">
        {layout === "editor" && (
          <div className="max-w-2xl mx-auto overflow-y-auto max-h-[calc(100vh-9rem)] pr-1">
            {editorPanel}
          </div>
        )}

        {layout === "preview" && (
          <div className="h-[calc(100vh-9rem)] overflow-auto rounded-xl border border-zinc-200 bg-zinc-900">
            <FooterPreview settings={settings} />
          </div>
        )}

        {layout === "split" && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 h-[calc(100vh-9rem)]">
            {/* Left: Editor */}
            <div className="overflow-y-auto pr-1">
              {editorPanel}
            </div>

            {/* Right: Live preview */}
            <div className="flex flex-col min-h-0">
              {previewPanel}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
