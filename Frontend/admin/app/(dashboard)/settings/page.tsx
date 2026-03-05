"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Building2,
  Clock3,
  Gauge,
  Mail,
  MessageSquare,
  Save,
  Settings2,
  Sparkles,
  Undo2,
} from "lucide-react";
import {
  defaultAdminSettings,
  loadAdminSettings,
  saveAdminSettings,
  type AdminSettings,
} from "@/lib/admin-settings";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AdminSettings>(() => loadAdminSettings());
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const hasChanges = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(loadAdminSettings()),
    [settings],
  );

  function onSave() {
    saveAdminSettings(settings);
    setSavedAt(new Date());
  }

  function onReset() {
    setSettings(defaultAdminSettings);
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
              Centro de configuración para comportamiento del panel, operaciones y notificaciones.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              <Undo2 className="h-4 w-4" />
              Restaurar por defecto
            </button>
            <button
              type="button"
              onClick={onSave}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800"
            >
              <Save className="h-4 w-4" />
              Guardar ajustes
            </button>
          </div>
        </div>
        <div className="mt-3 text-xs text-zinc-500">
          {savedAt ? `Último guardado: ${savedAt.toLocaleTimeString()}` : "Aún no guardado en esta sesión"}
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
            <Building2 className="h-5 w-5" />
            Identidad y operación
          </h2>
          <label className="block text-sm text-zinc-700">
            Marca visible
            <input
              value={settings.brandName}
              onChange={(e) => update("brandName", e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm text-zinc-700">
            Email soporte
            <input
              type="email"
              value={settings.supportEmail}
              onChange={(e) => update("supportEmail", e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm text-zinc-700">
              Divisa por defecto
              <select
                value={settings.defaultCurrency}
                onChange={(e) => update("defaultCurrency", e.target.value as AdminSettings["defaultCurrency"])}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
              </select>
            </label>
            <label className="block text-sm text-zinc-700">
              Formato de fecha
              <select
                value={settings.dateFormat}
                onChange={(e) => update("dateFormat", e.target.value as AdminSettings["dateFormat"])}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
              >
                <option value="es-ES">España (dd/mm/yyyy)</option>
                <option value="en-GB">Reino Unido (dd/mm/yyyy)</option>
                <option value="en-US">USA (mm/dd/yyyy)</option>
              </select>
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
            <Gauge className="h-5 w-5" />
            Rendimiento y listados
          </h2>
          <label className="block text-sm text-zinc-700">
            Refresco automático de pedidos (segundos)
            <input
              type="number"
              min={10}
              max={300}
              value={settings.ordersRefreshSeconds}
              onChange={(e) => update("ordersRefreshSeconds", Number(e.target.value || 30))}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm text-zinc-700">
            Tamaño de página en productos
            <input
              type="number"
              min={10}
              max={200}
              value={settings.productsPageSize}
              onChange={(e) => update("productsPageSize", Number(e.target.value || 25))}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm text-zinc-700">
            Umbral de bajo stock
            <input
              type="number"
              min={0}
              max={500}
              value={settings.lowStockThreshold}
              onChange={(e) => update("lowStockThreshold", Number(e.target.value || 5))}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
            />
          </label>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
            <Bell className="h-5 w-5" />
            Alertas y experiencia
          </h2>
          <ToggleRow
            icon={<Mail className="h-4 w-4" />}
            label="Notificaciones por email"
            description="Avisos de incidencias, importaciones y tareas críticas"
            value={settings.emailNotifications}
            onChange={(value) => update("emailNotifications", value)}
          />
          <ToggleRow
            icon={<MessageSquare className="h-4 w-4" />}
            label="Sonido en chat"
            description="Reproducir aviso al llegar nuevos mensajes"
            value={settings.chatSoundEnabled}
            onChange={(value) => update("chatSoundEnabled", value)}
          />
          <ToggleRow
            icon={<Sparkles className="h-4 w-4" />}
            label="Métricas avanzadas"
            description="Mostrar KPIs extendidos en el dashboard"
            value={settings.showAdvancedMetrics}
            onChange={(value) => update("showAdvancedMetrics", value)}
          />
          <ToggleRow
            icon={<Settings2 className="h-4 w-4" />}
            label="Sidebar compacta"
            description="Navegación más ajustada para pantallas pequeñas"
            value={settings.compactSidebar}
            onChange={(value) => update("compactSidebar", value)}
          />
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
            <Clock3 className="h-5 w-5" />
            Integración rápida con módulos
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            Desde esta pestaña puedes saltar a las áreas más relacionadas con cada ajuste.
          </p>
          <div className="mt-4 grid gap-2">
            <QuickLink href="/dashboard" label="Dashboard" description="Comprobar métricas y actividad diaria" />
            <QuickLink href="/orders" label="Pedidos" description="Aplicar política de refresco y supervisión" />
            <QuickLink href="/products" label="Productos" description="Validar paginación y control de stock" />
            <QuickLink href="/chat" label="Chat" description="Revisar notificaciones y avisos sonoros" />
          </div>
          <div className="mt-5 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3 text-xs text-zinc-600">
            {hasChanges
              ? "Tienes cambios sin guardar. Guarda para mantener estos ajustes en el navegador actual."
              : "Sin cambios pendientes. Tu configuración está sincronizada en este navegador."}
          </div>
        </div>
      </section>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 p-3">
      <div>
        <p className="flex items-center gap-2 text-sm font-medium text-zinc-900">
          {icon}
          {label}
        </p>
        <p className="mt-1 text-xs text-zinc-600">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          value ? "bg-zinc-900" : "bg-zinc-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
            value ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function QuickLink({ href, label, description }: { href: string; label: string; description: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 transition hover:border-zinc-300 hover:bg-zinc-50"
    >
      <p className="text-sm font-medium text-zinc-900">{label}</p>
      <p className="text-xs text-zinc-600">{description}</p>
    </Link>
  );
}
