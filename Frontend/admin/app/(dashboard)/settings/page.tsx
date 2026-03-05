"use client";

import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  CheckCircle2,
  CircleDot,
  Clock3,
  Gauge,
  Globe,
  ImageIcon,
  Mail,
  MessageSquare,
  MousePointerClick,
  Save,
  Settings2,
  Sparkles,
  Undo2,
} from "lucide-react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import AdminBrandLogo from "@/app/components/AdminBrandLogo";
import {
  defaultAdminSettings,
  loadAdminSettings,
  resolveAdminLogoSrc,
  saveAdminSettings,
  type AdminLanguage,
  type AdminLogoFit,
  type AdminLogoMode,
  type AdminSettings,
} from "@/lib/admin-settings";

export default function SettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const [settings, setSettings] = useState<AdminSettings>(() => loadAdminSettings());
  const [savedSnapshot, setSavedSnapshot] = useState<AdminSettings>(() => loadAdminSettings());
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const hasChanges = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSnapshot),
    [savedSnapshot, settings],
  );

  const isCustomLogo = settings.brandLogoMode === "custom";
  const hasValidLightLogo = !isCustomLogo || settings.brandLogoUrl.trim().length > 0;
  const hasValidDarkLogo = !isCustomLogo || settings.brandLogoDarkUrl.trim().length > 0;
  const isSupportEmailValid = settings.supportEmail.includes("@");

  const applyLocaleIfNeeded = (nextLanguage: AdminLanguage) => {
    if (locale !== nextLanguage) {
      router.replace(pathname, { locale: nextLanguage });
    }
  };

  function onSave() {
    if (!isSupportEmailValid) {
      toast.error("El email de soporte no tiene formato válido");
      return;
    }

    if (!hasValidLightLogo) {
      toast.error("Añade URL o sube un logo principal para modo personalizado");
      return;
    }

    const logoFieldsChanged = [
      settings.brandLogoMode !== savedSnapshot.brandLogoMode,
      settings.brandLogoUrl !== savedSnapshot.brandLogoUrl,
      settings.brandLogoDarkUrl !== savedSnapshot.brandLogoDarkUrl,
      settings.brandLogoFit !== savedSnapshot.brandLogoFit,
      settings.brandLogoHeight !== savedSnapshot.brandLogoHeight,
    ].some(Boolean);

    const nextSettings = logoFieldsChanged
      ? { ...settings, brandLogoVersion: settings.brandLogoVersion + 1 }
      : settings;

    saveAdminSettings(nextSettings);
    setSettings(nextSettings);
    setSavedSnapshot(nextSettings);
    setSavedAt(new Date());
    applyLocaleIfNeeded(nextSettings.adminLanguage);
    toast.success("Ajustes guardados y aplicados");
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (hasChanges) onSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hasChanges, settings]);

  function onReset() {
    setSettings(defaultAdminSettings);
    saveAdminSettings(defaultAdminSettings);
    setSavedSnapshot(defaultAdminSettings);
    setSavedAt(new Date());
    applyLocaleIfNeeded(defaultAdminSettings.adminLanguage);
    toast.success("Ajustes restaurados");
  }

  function onDiscard() {
    const latest = loadAdminSettings();
    setSettings(latest);
    setSavedSnapshot(latest);
    applyLocaleIfNeeded(latest.adminLanguage);
    toast.info("Cambios descartados");
  }

  function update<K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function scrollToSection(id: string) {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  async function onLogoFileChange(event: ChangeEvent<HTMLInputElement>, variant: "light" | "dark") {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona un archivo de imagen válido");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen no debe superar 2MB");
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    update("brandLogoMode", "custom");
    if (variant === "dark") {
      update("brandLogoDarkUrl", dataUrl);
    } else {
      update("brandLogoUrl", dataUrl);
    }
    toast.success(`Logo ${variant === "dark" ? "oscuro" : "principal"} cargado. Guarda para aplicar.`);
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Ajustes del panel</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Configura idioma, branding y preferencias operativas con enfoque eCommerce profesional.
            </p>
            <p className="mt-2 text-xs text-zinc-500">Tip: usa Ctrl/Cmd + S para guardar rápido.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={onDiscard} className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50">Descartar</button>
            <button type="button" onClick={onReset} className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"><Undo2 className="h-4 w-4" />Restaurar por defecto</button>
            <button type="button" disabled={!hasChanges} onClick={onSave} className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"><Save className="h-4 w-4" />Guardar ajustes</button>
          </div>
        </div>
        <div className="mt-3 text-xs text-zinc-500 flex items-center gap-2">
          {hasChanges ? <span className="text-amber-600 font-medium">Cambios pendientes</span> : <span className="text-emerald-600 font-medium inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Sincronizado</span>}
          <span>·</span>
          <span>{savedAt ? `Último guardado: ${savedAt.toLocaleTimeString()}` : "Aún no guardado en esta sesión"}</span>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => scrollToSection("branding-section")} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-zinc-200 hover:bg-zinc-50"><CircleDot className="h-3.5 w-3.5" />Branding</button>
        <button type="button" onClick={() => scrollToSection("operations-section")} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-zinc-200 hover:bg-zinc-50"><Gauge className="h-3.5 w-3.5" />Operaciones</button>
        <button type="button" onClick={() => scrollToSection("experience-section")} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-zinc-200 hover:bg-zinc-50"><Sparkles className="h-3.5 w-3.5" />Experiencia</button>
        <button type="button" onClick={() => scrollToSection("integration-section")} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-zinc-200 hover:bg-zinc-50"><MousePointerClick className="h-3.5 w-3.5" />Integración</button>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div id="branding-section" className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900"><Building2 className="h-5 w-5" />Branding e identidad</h2>

          <div className="rounded-xl border border-zinc-200 p-4 space-y-3">
            <p className="text-sm font-medium text-zinc-900">Sistema de logo enterprise</p>
            <p className="text-xs text-zinc-500">Configura logo principal y alternativo para fondos oscuros con fallback automático y cache busting.</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs font-medium text-zinc-700 mb-2">Preview claro</p>
                <div className="h-12 rounded bg-white border border-zinc-200 flex items-center justify-center">
                  <AdminBrandLogo settings={settings} variant="light" className="w-auto" />
                </div>
              </div>
              <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3">
                <p className="text-xs font-medium text-zinc-200 mb-2">Preview oscuro</p>
                <div className="h-12 rounded bg-zinc-950 border border-zinc-700 flex items-center justify-center">
                  <AdminBrandLogo settings={settings} variant="dark" className="w-auto" />
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-zinc-700">
                Modo de logo
                <select value={settings.brandLogoMode} onChange={(e) => update("brandLogoMode", e.target.value as AdminLogoMode)} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2">
                  <option value="default">Logo actual (/logo.png)</option>
                  <option value="favicon">Favicon (/favicon.ico)</option>
                  <option value="custom">Imagen personalizada</option>
                </select>
              </label>
              <label className="block text-sm text-zinc-700">
                Ajuste de imagen
                <select value={settings.brandLogoFit} onChange={(e) => update("brandLogoFit", e.target.value as AdminLogoFit)} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2">
                  <option value="contain">Contain</option>
                  <option value="cover">Cover</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => update("brandLogoMode", "default")} className="text-xs rounded-md border border-zinc-200 px-2.5 py-1.5 hover:bg-zinc-50">Preset: estándar</button>
              <button type="button" onClick={() => update("brandLogoMode", "favicon")} className="text-xs rounded-md border border-zinc-200 px-2.5 py-1.5 hover:bg-zinc-50">Preset: minimal favicon</button>
              <button type="button" onClick={() => { update("brandLogoMode", "custom"); update("brandLogoFit", "contain"); }} className="text-xs rounded-md border border-zinc-200 px-2.5 py-1.5 hover:bg-zinc-50">Preset: custom CDN</button>
            </div>

            <NumberField label="Altura del logo (px)" value={settings.brandLogoHeight} min={20} max={64} onChange={(value) => update("brandLogoHeight", value)} />

            <label className="block text-sm text-zinc-700">
              URL logo principal
              <input value={settings.brandLogoUrl} onChange={(e) => update("brandLogoUrl", e.target.value)} disabled={!isCustomLogo} placeholder="https://cdn.tu-dominio.com/brand/logo-light.svg" className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 disabled:bg-zinc-100 disabled:text-zinc-400" />
            </label>

            <label className="block text-sm text-zinc-700">
              URL logo para fondo oscuro (login)
              <input value={settings.brandLogoDarkUrl} onChange={(e) => update("brandLogoDarkUrl", e.target.value)} disabled={!isCustomLogo} placeholder="https://cdn.tu-dominio.com/brand/logo-dark.svg" className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 disabled:bg-zinc-100 disabled:text-zinc-400" />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-zinc-700">
                Subir logo principal (máx 2MB)
                <input type="file" accept="image/*" disabled={!isCustomLogo} onChange={(e) => onLogoFileChange(e, "light")} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-100 disabled:text-zinc-400" />
              </label>
              <label className="block text-sm text-zinc-700">
                Subir logo oscuro (máx 2MB)
                <input type="file" accept="image/*" disabled={!isCustomLogo} onChange={(e) => onLogoFileChange(e, "dark")} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-100 disabled:text-zinc-400" />
              </label>
            </div>

            <p className="text-xs text-zinc-500">Versión de cache actual: {settings.brandLogoVersion}. Se incrementa automáticamente cuando cambias branding y guardas.</p>
            {isCustomLogo && (!hasValidLightLogo || !hasValidDarkLogo) && (
              <p className="text-xs text-amber-600">Para una UX completa en light/dark, define ambos logos personalizados.</p>
            )}
          </div>

          <label className="block text-sm text-zinc-700">
            Email soporte
            <input type="email" value={settings.supportEmail} onChange={(e) => update("supportEmail", e.target.value)} className={`mt-1 w-full rounded-lg border px-3 py-2 ${isSupportEmailValid ? "border-zinc-200" : "border-red-300 bg-red-50"}`} />
            {!isSupportEmailValid && <span className="text-xs text-red-600">Revisa el email de soporte.</span>}
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm text-zinc-700">
              Idioma del panel
              <select value={settings.adminLanguage} onChange={(e) => update("adminLanguage", e.target.value as AdminLanguage)} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2">
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="block text-sm text-zinc-700">
              Divisa por defecto
              <select value={settings.defaultCurrency} onChange={(e) => update("defaultCurrency", e.target.value as AdminSettings["defaultCurrency"])} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2">
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
              </select>
            </label>
          </div>

          <label className="block text-sm text-zinc-700">
            Formato de fecha
            <select value={settings.dateFormat} onChange={(e) => update("dateFormat", e.target.value as AdminSettings["dateFormat"])} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2">
              <option value="es-ES">España (dd/mm/yyyy)</option>
              <option value="en-GB">Reino Unido (dd/mm/yyyy)</option>
              <option value="en-US">USA (mm/dd/yyyy)</option>
            </select>
          </label>
        </div>

        <div id="operations-section" className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900"><Gauge className="h-5 w-5" />Rendimiento y listados</h2>
          <NumberField label="Refresco automático de pedidos (segundos)" value={settings.ordersRefreshSeconds} min={10} max={300} onChange={(value) => update("ordersRefreshSeconds", value)} />
          <NumberField label="Filas por página en pedidos" value={settings.ordersPageSize} min={5} max={100} onChange={(value) => update("ordersPageSize", value)} />
          <NumberField label="Filas por página en productos" value={settings.productsPageSize} min={10} max={200} onChange={(value) => update("productsPageSize", value)} />
          <NumberField label="Umbral de bajo stock" value={settings.lowStockThreshold} min={0} max={500} onChange={(value) => update("lowStockThreshold", value)} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div id="experience-section" className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900"><Bell className="h-5 w-5" />Alertas y experiencia</h2>
          <ToggleRow icon={<Mail className="h-4 w-4" />} label="Notificaciones por email" description="Avisos de incidencias, importaciones y tareas críticas" value={settings.emailNotifications} onChange={(value) => update("emailNotifications", value)} />
          <ToggleRow icon={<MessageSquare className="h-4 w-4" />} label="Sonido en chat" description="Reproducir aviso al llegar nuevos mensajes" value={settings.chatSoundEnabled} onChange={(value) => update("chatSoundEnabled", value)} />
          <ToggleRow icon={<Sparkles className="h-4 w-4" />} label="Métricas avanzadas" description="Mostrar KPIs extendidos en el dashboard" value={settings.showAdvancedMetrics} onChange={(value) => update("showAdvancedMetrics", value)} />
          <ToggleRow icon={<Settings2 className="h-4 w-4" />} label="Sidebar compacta" description="Navegación más ajustada para pantallas pequeñas" value={settings.compactSidebar} onChange={(value) => update("compactSidebar", value)} />
        </div>

        <div id="integration-section" className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900"><Clock3 className="h-5 w-5" />Integración rápida con módulos</h2>
          <p className="mt-2 text-sm text-zinc-600">Los ajustes se aplican al instante en módulos conectados y se mantienen por navegador.</p>
          <div className="mt-4 grid gap-2">
            <QuickLink href="/dashboard" label="Dashboard" description="Validar métricas avanzadas y vista general" />
            <QuickLink href="/orders" label="Pedidos" description="Aplicar idioma, divisa, refresco y filas" />
            <QuickLink href="/products" label="Productos" description="Validar paginación, divisa y umbral de stock" />
            <QuickLink href="/chat" label="Chat" description="Comprobar notificaciones y sonido" />
          </div>
          <div className="mt-5 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3 text-xs text-zinc-600">
            {hasChanges ? "Tienes cambios sin guardar. Guarda para aplicarlos y persistirlos." : "Sin cambios pendientes. Configuración sincronizada."}
          </div>
          <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
            <p className="flex items-center gap-2 font-medium text-zinc-700"><Globe className="h-4 w-4" />Idioma actual: {locale.toUpperCase()}</p>
            <p className="mt-1 flex items-center gap-2"><ImageIcon className="h-3.5 w-3.5" />Logo activo: {resolveAdminLogoSrc(settings)}</p>
          </div>
        </div>
      </section>

      {hasChanges && (
        <div className="fixed bottom-4 right-4 left-4 lg:left-auto lg:w-[520px] rounded-xl border border-zinc-200 bg-white/95 backdrop-blur p-3 shadow-xl z-40">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-zinc-600">Tienes cambios sin guardar en Ajustes.</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onDiscard} className="text-xs rounded-md border border-zinc-200 px-2.5 py-1.5 hover:bg-zinc-50">Descartar</button>
              <button type="button" onClick={onSave} className="text-xs rounded-md bg-zinc-900 text-white px-2.5 py-1.5 hover:bg-zinc-800">Guardar ahora</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (next: number) => void; }) {
  return (
    <label className="block text-sm text-zinc-700">
      {label}
      <input type="number" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value || min))} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2" />
    </label>
  );
}

function ToggleRow({ icon, label, description, value, onChange }: { icon: React.ReactNode; label: string; description: string; value: boolean; onChange: (value: boolean) => void; }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 p-3">
      <div>
        <p className="flex items-center gap-2 text-sm font-medium text-zinc-900">{icon}{label}</p>
        <p className="mt-1 text-xs text-zinc-600">{description}</p>
      </div>
      <button type="button" onClick={() => onChange(!value)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${value ? "bg-zinc-900" : "bg-zinc-300"}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${value ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

function QuickLink({ href, label, description }: { href: string; label: string; description: string }) {
  return (
    <Link href={href} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 transition hover:border-zinc-300 hover:bg-zinc-50">
      <p className="text-sm font-medium text-zinc-900">{label}</p>
      <p className="text-xs text-zinc-600">{description}</p>
    </Link>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}
