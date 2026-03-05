"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  Building2,
  Clock3,
  Gauge,
  Globe,
  Mail,
  MessageSquare,
  Save,
  Settings2,
  Sparkles,
  Undo2,
} from "lucide-react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  defaultAdminSettings,
  loadAdminSettings,
  saveAdminSettings,
  type AdminLanguage,
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

  const applyLocaleIfNeeded = (nextLanguage: AdminLanguage) => {
    if (locale !== nextLanguage) {
      router.replace(pathname, { locale: nextLanguage });
    }
  };

  function onSave() {
    saveAdminSettings(settings);
    setSavedSnapshot(settings);
    setSavedAt(new Date());
    applyLocaleIfNeeded(settings.adminLanguage);
    toast.success("Ajustes guardados y aplicados");
  }

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

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Ajustes del panel</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Configura idioma, comportamiento y preferencias operativas del admin desde un solo sitio.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={onDiscard} className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50">Descartar</button>
            <button type="button" onClick={onReset} className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"><Undo2 className="h-4 w-4" />Restaurar por defecto</button>
            <button type="button" onClick={onSave} className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800"><Save className="h-4 w-4" />Guardar ajustes</button>
          </div>
        </div>
        <div className="mt-3 text-xs text-zinc-500">
          {savedAt ? `Último guardado: ${savedAt.toLocaleTimeString()}` : "Aún no guardado en esta sesión"}
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900"><Building2 className="h-5 w-5" />Identidad y operación</h2>
          <label className="block text-sm text-zinc-700">
            Marca visible
            <input value={settings.brandName} onChange={(e) => update("brandName", e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2" />
          </label>
          <label className="block text-sm text-zinc-700">
            Email soporte
            <input type="email" value={settings.supportEmail} onChange={(e) => update("supportEmail", e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2" />
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

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900"><Gauge className="h-5 w-5" />Rendimiento y listados</h2>
          <NumberField label="Refresco automático de pedidos (segundos)" value={settings.ordersRefreshSeconds} min={10} max={300} onChange={(value) => update("ordersRefreshSeconds", value)} />
          <NumberField label="Filas por página en pedidos" value={settings.ordersPageSize} min={5} max={100} onChange={(value) => update("ordersPageSize", value)} />
          <NumberField label="Filas por página en productos" value={settings.productsPageSize} min={10} max={200} onChange={(value) => update("productsPageSize", value)} />
          <NumberField label="Umbral de bajo stock" value={settings.lowStockThreshold} min={0} max={500} onChange={(value) => update("lowStockThreshold", value)} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900"><Bell className="h-5 w-5" />Alertas y experiencia</h2>
          <ToggleRow icon={<Mail className="h-4 w-4" />} label="Notificaciones por email" description="Avisos de incidencias, importaciones y tareas críticas" value={settings.emailNotifications} onChange={(value) => update("emailNotifications", value)} />
          <ToggleRow icon={<MessageSquare className="h-4 w-4" />} label="Sonido en chat" description="Reproducir aviso al llegar nuevos mensajes" value={settings.chatSoundEnabled} onChange={(value) => update("chatSoundEnabled", value)} />
          <ToggleRow icon={<Sparkles className="h-4 w-4" />} label="Métricas avanzadas" description="Mostrar KPIs extendidos en el dashboard" value={settings.showAdvancedMetrics} onChange={(value) => update("showAdvancedMetrics", value)} />
          <ToggleRow icon={<Settings2 className="h-4 w-4" />} label="Sidebar compacta" description="Navegación más ajustada para pantallas pequeñas" value={settings.compactSidebar} onChange={(value) => update("compactSidebar", value)} />
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
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
            <p className="flex items-center gap-2 font-medium text-zinc-700"><Globe className="h-4 w-4" />Idioma actual de navegación: {locale.toUpperCase()}</p>
            <p className="mt-1">Idioma configurado en ajustes: {settings.adminLanguage.toUpperCase()} (se aplica al guardar).</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (next: number) => void; }) {
  return (
    <label className="block text-sm text-zinc-700">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value || min))}
        className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
      />
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
