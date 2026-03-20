"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  fetchImportConfig,
  fetchImportHistory,
  fetchImportRun,
  fetchImportRunErrors,
  fetchImportRuntimeOverview,
  fetchImportRuns,
  fetchProviderStats,
  retryImport,
  testImportConnection,
  triggerImport,
  updateImportConfig,
  fetchCatalogProbe,
  type ImportHistoryItem,
  type ImportRun,
  type ImportRunError,
  type ImportRuntimeOverviewResponse,
  type ProviderStatsResponse,
  type CatalogProbeResponse,
} from "@/lib/api";
import { toast } from "sonner";
import {
  AlertTriangle,
  Box,
  ChevronDown,
  ChevronUp,
  Database,
  Eye,
  EyeOff,
  Globe,
  Image as ImageIcon,
  KeyRound,
  Loader2,
  PlugZap,
  RefreshCw,
  Save,
  Search,
} from "lucide-react";

type ImportMode = "full" | "incremental" | "stock" | "images";
type RunningState = { mode: ImportMode; action: "trigger" | "retry" } | null;

type ImportConfigForm = {
  display_name: string;
  base_url: string;
  api_key: string;
  is_active: boolean;
  notes: string;
  stock_sync_enabled: boolean;
  incremental_sync_enabled: boolean;
  full_sync_enabled: boolean;
  images_sync_enabled: boolean;
  stock_sync_cron: string;
  incremental_sync_cron: string;
  full_sync_cron: string;
  images_sync_cron: string;
  stock_batch_size: string;
  full_sync_batch_size: string;
  full_sync_batch_delay_ms: string;
  image_sync_take: string;
  catalog_page_size: string;
};

type MetricCardTone = "slate" | "sky" | "emerald" | "amber" | "rose";

type SuspiciousImportAlert = {
  item: ImportHistoryItem;
  received: number;
  pageSize: number | null;
  total: number | null;
  reason: string;
};

const KNOWN_TECHNICAL_LIMITS = [100, 250, 500, 1000, 2000, 5000, 10000];

const STATUS_STYLES: Record<string, string> = {
  RUNNING: "border-sky-200 bg-sky-50 text-sky-800",
  SUCCESS: "border-emerald-200 bg-emerald-50 text-emerald-800",
  PARTIAL_SUCCESS: "border-amber-200 bg-amber-50 text-amber-900",
  FAILED: "border-rose-200 bg-rose-50 text-rose-900",
};

const METRIC_CARD_STYLES: Record<MetricCardTone, string> = {
  slate: "border-slate-200 bg-slate-50 text-slate-900",
  sky: "border-sky-200 bg-sky-50 text-sky-900",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  rose: "border-rose-200 bg-rose-50 text-rose-900",
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function cronToHuman(expr: string): string {
  if (!expr?.trim()) return "";
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return expr;
  const [min, hour, dom, month, dow] = parts;

  // Every N minutes: */N * * * *
  const minStepMatch = /^\*\/(\d+)$/.exec(min);
  if (minStepMatch && hour === "*" && dom === "*" && month === "*" && dow === "*") {
    const n = Number(minStepMatch[1]);
    return n === 1 ? "Cada minuto" : `Cada ${n} minutos`;
  }

  // Every hour at minute 0: 0 * * * *
  if (min === "0" && hour === "*" && dom === "*" && month === "*" && dow === "*") {
    return "Cada hora";
  }

  // Every N hours: 0 */N * * *
  const hourStepMatch = /^\*\/(\d+)$/.exec(hour);
  if (hourStepMatch && min === "0" && dom === "*" && month === "*" && dow === "*") {
    const n = Number(hourStepMatch[1]);
    return n === 1 ? "Cada hora" : `Cada ${n} horas`;
  }

  // Daily at H:M: M H * * *
  if (/^\d+$/.test(min) && /^\d+$/.test(hour) && dom === "*" && month === "*" && dow === "*") {
    const h = String(hour).padStart(2, "0");
    const m = String(min).padStart(2, "0");
    if (h === "00" && m === "00") return "Cada día a medianoche";
    return `Cada día a las ${h}:${m}`;
  }

  // Weekly on weekday at H:M: M H * * d
  if (/^\d+$/.test(min) && /^\d+$/.test(hour) && dom === "*" && month === "*" && /^\d$/.test(dow)) {
    const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    const diaName = dias[Number(dow)];
    if (!diaName) return expr;
    const h = String(hour).padStart(2, "0");
    const m = String(min).padStart(2, "0");
    return `Cada ${diaName} a las ${h}:${m}`;
  }

  return expr;
}

const CRON_PRESETS_FREQUENT = [
  { label: "Cada 5 min", value: "*/5 * * * *" },
  { label: "Cada 15 min", value: "*/15 * * * *" },
  { label: "Cada 30 min", value: "*/30 * * * *" },
  { label: "Cada hora", value: "0 * * * *" },
];

const CRON_PRESETS_MODERATE = [
  { label: "Cada hora", value: "0 * * * *" },
  { label: "Cada 2h", value: "0 */2 * * *" },
  { label: "Cada 6h", value: "0 */6 * * *" },
  { label: "Cada 12h", value: "0 */12 * * *" },
];

const CRON_PRESETS_DAILY = [
  { label: "Cada 6h", value: "0 */6 * * *" },
  { label: "Cada 12h", value: "0 */12 * * *" },
  { label: "Cada día 2:00", value: "0 2 * * *" },
  { label: "Cada día medianoche", value: "0 0 * * *" },
];

const MODE_LABELS: Record<ImportMode, string> = {
  full: "catálogo completo",
  incremental: "incremental",
  stock: "stock",
  images: "imágenes",
};

const ACTION_MODES: {
  mode: ImportMode;
  Icon: React.ElementType;
  title: string;
  description: string;
}[] = [
  {
    mode: "full",
    Icon: Database,
    title: "Catálogo completo",
    description: "Sincroniza todo el catálogo, stock y cambios de producto desde el proveedor.",
  },
  {
    mode: "incremental",
    Icon: RefreshCw,
    title: "Incremental de productos",
    description: "Obtiene solo los productos modificados desde la última sincronización.",
  },
  {
    mode: "stock",
    Icon: Box,
    title: "Sincronización de stock",
    description: "Actualiza los niveles de inventario desde el feed del proveedor.",
  },
  {
    mode: "images",
    Icon: ImageIcon,
    title: "Sincronización de imágenes",
    description: "Rellena las imágenes de productos que faltan en el catálogo.",
  },
];

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString();
}

function formatDelta(received: number, persisted: number) {
  const difference = received - persisted;

  if (difference === 0) {
    return `La API devolvió ${received} y el catálogo persistió ${persisted}.`;
  }

  if (difference > 0) {
    return `La API devolvió ${received} pero el catálogo persistió ${persisted} (${difference} menos).`;
  }

  return `El catálogo persistió ${persisted} a partir de ${received} elementos recibidos.`;
}

function parseDetails(details?: string | null) {
  if (!details) {
    return {} as Record<string, string>;
  }

  return details.split(";").reduce<Record<string, string>>((acc, chunk) => {
    const [rawKey, ...rest] = chunk.split("=");
    const key = rawKey?.trim();

    if (!key || rest.length === 0) {
      return acc;
    }

    acc[key] = rest.join("=").trim();
    return acc;
  }, {});
}

function getSuspiciousImportAlert(
  items: ImportHistoryItem[],
): SuspiciousImportAlert | null {
  for (const item of items) {
    const parsed = parseDetails(item.details);
    const received = Number(parsed.source_items_received ?? "");
    const pageSize = Number(parsed.source_page_size ?? "");
    const total = Number(parsed.source_total_expected ?? "");

    if (!Number.isFinite(received) || received <= 0) {
      continue;
    }

    const receivedIsRound = received % 100 === 0;
    const matchesTechnicalLimit = KNOWN_TECHNICAL_LIMITS.includes(received);
    const pageSizeLimitReached =
      Number.isFinite(pageSize) &&
      KNOWN_TECHNICAL_LIMITS.includes(pageSize) &&
      received === pageSize;
    const totalMismatch = Number.isFinite(total) && total > received;

    if (
      receivedIsRound ||
      matchesTechnicalLimit ||
      pageSizeLimitReached ||
      totalMismatch
    ) {
      return {
        item,
        received,
        pageSize: Number.isFinite(pageSize) ? pageSize : null,
        total: Number.isFinite(total) ? total : null,
        reason: totalMismatch
          ? "Los metadatos del proveedor indican más productos en el catálogo de los que se han recibido."
          : matchesTechnicalLimit || pageSizeLimitReached
            ? "La respuesta del proveedor coincide exactamente con un límite técnico conocido."
            : "El proveedor devolvió un número de elementos sospechosamente redondo.",
      };
    }
  }

  return null;
}

function readAdminPermissions(): string[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem("admin_user");
    if (!raw) return [];

    const parsed = JSON.parse(raw) as { permissions?: unknown };
    return Array.isArray(parsed.permissions)
      ? parsed.permissions.map((permission) => String(permission))
      : [];
  } catch {
    return [];
  }
}

function MetricCard({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  tone?: MetricCardTone;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${METRIC_CARD_STYLES[tone]}`}>
      <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export default function ImportsPage() {
  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [connectionTesting, setConnectionTesting] = useState(false);
  const [running, setRunning] = useState<RunningState>(null);
  const [retryReason, setRetryReason] = useState("");
  const [items, setItems] = useState<ImportHistoryItem[]>([]);
  const [runs, setRuns] = useState<ImportRun[]>([]);
  const [providerStats, setProviderStats] =
    useState<ProviderStatsResponse | null>(null);
  const [runtimeOverview, setRuntimeOverview] =
    useState<ImportRuntimeOverviewResponse | null>(null);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [runDetails, setRunDetails] = useState<Record<string, ImportRun>>({});
  const [runErrors, setRunErrors] = useState<
    Record<string, ImportRunError[]>
  >({});
  const [permissions, setPermissions] = useState<string[]>([]);
  const [showingSecret, setShowingSecret] = useState(false);
  const [storedMaskedKey, setStoredMaskedKey] = useState<string | null>(null);
  const [lastHealthcheckAt, setLastHealthcheckAt] = useState<string | null>(
    null,
  );
  const [configSource, setConfigSource] = useState<string | null>(null);
  const [catalogProbe, setCatalogProbe] = useState<CatalogProbeResponse | null>(null);
  const [catalogProbeLoading, setCatalogProbeLoading] = useState(false);
  const [form, setForm] = useState<ImportConfigForm>({
    display_name: "",
    base_url: "",
    api_key: "",
    is_active: true,
    notes: "",
    stock_sync_enabled: true,
    incremental_sync_enabled: true,
    full_sync_enabled: true,
    images_sync_enabled: false,
    stock_sync_cron: "",
    incremental_sync_cron: "",
    full_sync_cron: "",
    images_sync_cron: "",
    stock_batch_size: "",
    full_sync_batch_size: "",
    full_sync_batch_delay_ms: "",
    image_sync_take: "",
    catalog_page_size: "",
  });

  const hasPermission = (permission: string) =>
    permissions.includes("full_access") || permissions.includes(permission);
  const canReadConfig =
    hasPermission("imports:config:read") || permissions.length === 0;
  const canUpdateConfig =
    hasPermission("imports:config:update") || permissions.length === 0;
  const canReadSecret =
    hasPermission("imports:secret:read") || permissions.includes("full_access");

  const suspiciousAlert = useMemo(
    () => getSuspiciousImportAlert(items),
    [items],
  );

  async function loadHistory() {
    try {
      const data = await fetchImportHistory(1, 30);
      setItems(data.items);
    } catch (error) {
      toast.error(getErrorMessage(error, "Error al cargar el historial de importaciones"));
    } finally {
      setLoading(false);
    }
  }

  async function loadRuns() {
    try {
      const [runsData, providerStatsData, runtimeOverviewData] = await Promise.all([
        fetchImportRuns(),
        fetchProviderStats(),
        fetchImportRuntimeOverview(),
      ]);
      setRuns(runsData);
      setProviderStats(providerStatsData);
      setRuntimeOverview(runtimeOverviewData);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Error al cargar la observabilidad de importaciones"),
      );
    }
  }

  async function loadConfig(includeSecret = false) {
    if (!canReadConfig) {
      setConfigLoading(false);
      return;
    }

    setConfigLoading(true);

    try {
      const data = await fetchImportConfig(includeSecret);
      setForm({
        display_name: data.display_name,
        base_url: data.base_url,
        api_key: includeSecret ? data.api_key || "" : "",
        is_active: data.is_active,
        notes: data.notes || "",
        stock_sync_enabled: data.settings.stock_sync_enabled,
        incremental_sync_enabled: data.settings.incremental_sync_enabled,
        full_sync_enabled: data.settings.full_sync_enabled,
        images_sync_enabled: data.settings.images_sync_enabled,
        stock_sync_cron: data.settings.stock_sync_cron,
        incremental_sync_cron: data.settings.incremental_sync_cron,
        full_sync_cron: data.settings.full_sync_cron,
        images_sync_cron: data.settings.images_sync_cron,
        stock_batch_size: String(data.settings.stock_batch_size),
        full_sync_batch_size: String(data.settings.full_sync_batch_size),
        full_sync_batch_delay_ms: String(data.settings.full_sync_batch_delay_ms),
        image_sync_take: String(data.settings.image_sync_take),
        catalog_page_size: data.settings.catalog_page_size
          ? String(data.settings.catalog_page_size)
          : "",
      });
      setStoredMaskedKey(data.api_key_masked || null);
      setLastHealthcheckAt(data.last_healthcheck_at || null);
      setConfigSource(data.source || null);
      setShowingSecret(includeSecret && Boolean(data.api_key));
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Error al cargar la configuración de la API"),
      );
    } finally {
      setConfigLoading(false);
    }
  }

  async function ensureRunExpanded(runId: string) {
    const nextExpanded = expandedRunId === runId ? null : runId;
    setExpandedRunId(nextExpanded);

    if (nextExpanded === null || runDetails[runId]) {
      return;
    }

    setDetailLoadingId(runId);

    try {
      const [detail, errors] = await Promise.all([
        fetchImportRun(runId),
        fetchImportRunErrors(runId),
      ]);
      setRunDetails((current) => ({ ...current, [runId]: detail }));
      setRunErrors((current) => ({ ...current, [runId]: errors }));
    } catch (error) {
      toast.error(getErrorMessage(error, "Error al cargar el detalle de la ejecución"));
    } finally {
      setDetailLoadingId(null);
    }
  }

  async function saveConfig() {
    setConfigSaving(true);

    try {
      await updateImportConfig({
        display_name: form.display_name,
        base_url: form.base_url,
        api_key: form.api_key.trim() || undefined,
        is_active: form.is_active,
        notes: form.notes,
        stock_sync_enabled: form.stock_sync_enabled,
        incremental_sync_enabled: form.incremental_sync_enabled,
        full_sync_enabled: form.full_sync_enabled,
        images_sync_enabled: form.images_sync_enabled,
        stock_sync_cron: form.stock_sync_cron,
        incremental_sync_cron: form.incremental_sync_cron,
        full_sync_cron: form.full_sync_cron,
        images_sync_cron: form.images_sync_cron,
        stock_batch_size: Number(form.stock_batch_size),
        full_sync_batch_size: Number(form.full_sync_batch_size),
        full_sync_batch_delay_ms: Number(form.full_sync_batch_delay_ms),
        image_sync_take: Number(form.image_sync_take),
        catalog_page_size: form.catalog_page_size.trim()
          ? Number(form.catalog_page_size)
          : null,
      });
      toast.success("Configuración de API actualizada");
      await loadConfig(showingSecret && canReadSecret);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Error al actualizar la configuración de la API"),
      );
    } finally {
      setConfigSaving(false);
    }
  }

  async function handleTestConnection() {
    setConnectionTesting(true);

    try {
      const result = await testImportConnection();
      setLastHealthcheckAt(result.checked_at || new Date().toISOString());
      toast.success(
        result.ok
          ? "La conexión con la API del proveedor es correcta"
          : "La API del proveedor respondió como no disponible",
      );
      await loadConfig(showingSecret && canReadSecret);
    } catch (error) {
      toast.error(getErrorMessage(error, "Error al probar la conexión con la API"));
    } finally {
      setConnectionTesting(false);
    }
  }

  async function handleToggleSecret() {
    if (!canReadSecret) {
      toast.error("No tienes permiso para ver la clave de API");
      return;
    }

    await loadConfig(!showingSecret);
  }

  async function runImport(mode: ImportMode) {
    setRunning({ mode, action: "trigger" });

    try {
      await triggerImport(mode);
      toast.success(`Importación de ${MODE_LABELS[mode]} ejecutada correctamente`);
      await Promise.all([loadHistory(), loadRuns()]);
    } catch (error) {
      toast.error(
        getErrorMessage(error, `Error al ejecutar la importación de ${MODE_LABELS[mode]}`),
      );
    } finally {
      setRunning(null);
    }
  }

  async function runRetry(mode: ImportMode) {
    const reason = retryReason.trim();
    if (!reason) {
      toast.error("El motivo del reintento es obligatorio");
      return;
    }

    setRunning({ mode, action: "retry" });

    try {
      await retryImport(mode, reason);
      toast.success(`Reintento de ${MODE_LABELS[mode]} ejecutado correctamente`);
      await Promise.all([loadHistory(), loadRuns()]);
    } catch (error) {
      toast.error(getErrorMessage(error, `Error al reintentar la importación de ${MODE_LABELS[mode]}`));
    } finally {
      setRunning(null);
    }
  }

  async function runCatalogProbe() {
    setCatalogProbeLoading(true);
    try {
      const result = await fetchCatalogProbe();
      setCatalogProbe(result);
    } catch (error) {
      toast.error(getErrorMessage(error, "Error al analizar el catálogo"));
    } finally {
      setCatalogProbeLoading(false);
    }
  }

  useEffect(() => {
    setPermissions(readAdminPermissions());
  }, []);

  useEffect(() => {
    void Promise.all([loadHistory(), loadRuns(), loadConfig(false)]);
  }, [canReadConfig]);

  const latestRun = providerStats?.latestRun ?? runs[0] ?? null;
  const latestIncidents = latestRun
    ? runErrors[latestRun.id] ?? latestRun.errors ?? []
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Importaciones</h1>
        <p className="mt-2 text-slate-500">
          Control total de la integración con el proveedor: configuración de la API, crons,
          ejecuciones manuales, historial y diagnóstico del catálogo, todo desde aquí.
        </p>
      </div>

      {suspiciousAlert ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Posible truncación del proveedor detectada</p>
              <p className="mt-1 text-sm">
                {suspiciousAlert.reason} Última ejecución:
                <strong> {suspiciousAlert.item.type}</strong>
                {` · recibidos=${suspiciousAlert.received}`}
                {suspiciousAlert.pageSize
                  ? ` · tamañoPágina=${suspiciousAlert.pageSize}`
                  : ""}
                {suspiciousAlert.total
                  ? ` · total=${suspiciousAlert.total}`
                  : ""}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Centro de control de la API
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Gestiona el nombre de la API, la URL base, el estado activo, la clave actual
              y las comprobaciones de conexión desde la pestaña de importaciones.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void handleTestConnection()}
              disabled={connectionTesting || !canReadConfig}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <PlugZap className="h-4 w-4" />
              {connectionTesting ? "Probando..." : "Probar conexión"}
            </button>

            {canUpdateConfig ? (
              <button
                onClick={() => void saveConfig()}
                disabled={configSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {configSaving ? "Guardando..." : "Guardar configuración"}
              </button>
            ) : null}
          </div>
        </div>

        {!canReadConfig ? (
          <p className="mt-4 text-sm text-slate-500">
            Tu cuenta no puede leer la configuración de la API del proveedor.
          </p>
        ) : configLoading ? (
          <p className="mt-4 text-sm text-slate-500">
            Cargando configuración de API...
          </p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Database className="h-4 w-4" />
                  Nombre de API
                </div>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {form.display_name || "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Globe className="h-4 w-4" />
                  Fuente de configuración
                </div>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {configSource || "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <PlugZap className="h-4 w-4" />
                  Último healthcheck
                </div>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {formatDate(lastHealthcheckAt)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <KeyRound className="h-4 w-4" />
                  Clave almacenada
                </div>
                <p className="mt-2 break-all text-lg font-semibold text-slate-900">
                  {showingSecret
                    ? form.api_key || "—"
                    : storedMaskedKey || "Sin clave almacenada"}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Nombre de la API
                  </label>
                  <input
                    value={form.display_name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        display_name: event.target.value,
                      }))
                    }
                    disabled={!canUpdateConfig}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    URL base
                  </label>
                  <input
                    value={form.base_url}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        base_url: event.target.value,
                      }))
                    }
                    disabled={!canUpdateConfig}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                  />
                </div>

                <label className="inline-flex items-center gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        is_active: event.target.checked,
                      }))
                    }
                    disabled={!canUpdateConfig}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Integración activa
                </label>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-sm font-medium text-slate-700">
                      Clave de API
                    </label>
                    <button
                      type="button"
                      onClick={() => void handleToggleSecret()}
                      className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                    >
                      {showingSecret ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      {showingSecret
                        ? "Ocultar clave"
                        : "Ver clave actual"}
                    </button>
                  </div>
                  <textarea
                    value={showingSecret ? form.api_key : storedMaskedKey || form.api_key}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        api_key: event.target.value,
                      }))
                    }
                    disabled={!canUpdateConfig || !showingSecret}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    {showingSecret
                      ? "Estás viendo la clave almacenada actual."
                      : "La clave se muestra enmascarada por defecto. Usa ‘Ver clave actual’ si tus permisos lo permiten."}
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Notas internas
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    disabled={!canUpdateConfig}
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Programación de tareas y ajustes de obtención
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Activa o desactiva cada tarea, define la cadencia del cron y ajusta
                  la agresividad con la que se consume la API del proveedor.
                </p>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Sincronización de stock", "Mantiene el inventario actualizado.", "stock_sync_enabled"],
                  ["Productos incrementales", "Aplica cambios de producto entre sincronizaciones completas.", "incremental_sync_enabled"],
                  ["Catálogo completo", "Ejecuta la actualización completa del catálogo.", "full_sync_enabled"],
                  ["Sincronización de imágenes", "Rellena automáticamente las imágenes de los productos.", "images_sync_enabled"],
                ].map(([label, description, key]) => (
                  <label
                    key={key}
                    className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block font-semibold text-slate-900">{label}</span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {description}
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={form[key as keyof Pick<ImportConfigForm, "stock_sync_enabled" | "incremental_sync_enabled" | "full_sync_enabled" | "images_sync_enabled">] as boolean}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            [key]: event.target.checked,
                          }))
                        }
                        disabled={!canUpdateConfig || !form.is_active}
                        className="mt-1 h-4 w-4 rounded border-slate-300"
                      />
                    </span>
                  </label>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Cron sincronización de stock
                    </label>
                    <input value={form.stock_sync_cron} onChange={(event) => setForm((current) => ({ ...current, stock_sync_cron: event.target.value }))} disabled={!canUpdateConfig} className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm disabled:bg-slate-50" placeholder="*/5 * * * *" />
                    {form.stock_sync_cron && (
                      <p className="mt-1 text-xs font-medium text-emerald-600">{cronToHuman(form.stock_sync_cron)}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {CRON_PRESETS_FREQUENT.map((preset) => (
                        <button key={preset.value} type="button" onClick={() => setForm((c) => ({ ...c, stock_sync_cron: preset.value }))} disabled={!canUpdateConfig} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50">
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Cron productos incrementales
                    </label>
                    <input value={form.incremental_sync_cron} onChange={(event) => setForm((current) => ({ ...current, incremental_sync_cron: event.target.value }))} disabled={!canUpdateConfig} className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm disabled:bg-slate-50" placeholder="0 * * * *" />
                    {form.incremental_sync_cron && (
                      <p className="mt-1 text-xs font-medium text-emerald-600">{cronToHuman(form.incremental_sync_cron)}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {CRON_PRESETS_MODERATE.map((preset) => (
                        <button key={preset.value} type="button" onClick={() => setForm((c) => ({ ...c, incremental_sync_cron: preset.value }))} disabled={!canUpdateConfig} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50">
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Cron catálogo completo
                    </label>
                    <input value={form.full_sync_cron} onChange={(event) => setForm((current) => ({ ...current, full_sync_cron: event.target.value }))} disabled={!canUpdateConfig} className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm disabled:bg-slate-50" placeholder="0 2 * * *" />
                    {form.full_sync_cron && (
                      <p className="mt-1 text-xs font-medium text-emerald-600">{cronToHuman(form.full_sync_cron)}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {CRON_PRESETS_DAILY.map((preset) => (
                        <button key={preset.value} type="button" onClick={() => setForm((c) => ({ ...c, full_sync_cron: preset.value }))} disabled={!canUpdateConfig} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50">
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Cron sincronización de imágenes
                    </label>
                    <input value={form.images_sync_cron} onChange={(event) => setForm((current) => ({ ...current, images_sync_cron: event.target.value }))} disabled={!canUpdateConfig} className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm disabled:bg-slate-50" placeholder="30 2 * * *" />
                    {form.images_sync_cron && (
                      <p className="mt-1 text-xs font-medium text-emerald-600">{cronToHuman(form.images_sync_cron)}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {CRON_PRESETS_DAILY.map((preset) => (
                        <button key={preset.value} type="button" onClick={() => setForm((c) => ({ ...c, images_sync_cron: preset.value }))} disabled={!canUpdateConfig} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50">
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Tamaño de lote (stock)
                    </label>
                    <input type="number" min={1} value={form.stock_batch_size} onChange={(event) => setForm((current) => ({ ...current, stock_batch_size: event.target.value }))} disabled={!canUpdateConfig} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50" />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Tamaño de lote (catálogo completo)
                    </label>
                    <input type="number" min={1} value={form.full_sync_batch_size} onChange={(event) => setForm((current) => ({ ...current, full_sync_batch_size: event.target.value }))} disabled={!canUpdateConfig} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50" />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Pausa entre lotes (ms)
                    </label>
                    <input type="number" min={0} value={form.full_sync_batch_delay_ms} onChange={(event) => setForm((current) => ({ ...current, full_sync_batch_delay_ms: event.target.value }))} disabled={!canUpdateConfig} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50" />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Límite de imágenes por ciclo
                    </label>
                    <input type="number" min={1} value={form.image_sync_take} onChange={(event) => setForm((current) => ({ ...current, image_sync_take: event.target.value }))} disabled={!canUpdateConfig} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50" />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Tamaño de página del catálogo
                    </label>
                    <input type="number" min={1} value={form.catalog_page_size} onChange={(event) => setForm((current) => ({ ...current, catalog_page_size: event.target.value }))} disabled={!canUpdateConfig} placeholder="Por defecto: 1000" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50" />
                    <p className="mt-2 text-xs text-slate-500">
                      Necesario para importar todo el catálogo. Se recomienda <strong>1000</strong>. Si el proveedor no devuelve metadatos de paginación, el sistema usará modo sonda para obtener todas las páginas automáticamente.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {runtimeOverview ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Estado efectivo del scheduler
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Muestra qué jobs están realmente activos ahora mismo, con su cron
                aplicado y la próxima ejecución calculada.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void loadRuns()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </button>
              <div className={`rounded-full px-3 py-1 text-xs font-semibold ${runtimeOverview.integration_enabled ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                {runtimeOverview.integration_enabled ? "Integración global activa" : "Integración global desactivada"}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-4 md:grid-cols-2">
            {runtimeOverview.jobs.map((job: ImportRuntimeOverviewResponse["jobs"][number]) => (
              <div key={job.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold capitalize text-slate-900">
                      {job.key === "full"
                        ? "Catálogo completo"
                        : job.key === "incremental"
                          ? "Incremental"
                          : job.key === "stock"
                            ? "Stock"
                            : "Imágenes"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{job.job_name}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${job.effective_enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                    {job.effective_enabled ? "Activo" : "Inactivo"}
                  </span>
                </div>

                <dl className="mt-4 space-y-2 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-3">
                    <dt>Habilitado en ajustes</dt>
                    <dd>{job.enabled_in_settings ? "Sí" : "No"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt>Registrado en scheduler</dt>
                    <dd>{job.registered ? "Sí" : "No"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Cron</dt>
                    <dd className="mt-1 break-all rounded-lg bg-white px-2 py-1 font-mono text-xs text-slate-700">{job.cron}</dd>
                    {job.cron && cronToHuman(job.cron) !== job.cron && (
                      <dd className="mt-0.5 text-xs font-medium text-emerald-600">{cronToHuman(job.cron)}</dd>
                    )}
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Próxima ejecución</dt>
                    <dd className="mt-1 text-slate-700">{formatDate(job.next_run_at ?? null)}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Acciones de importación</h2>
            <p className="mt-1 text-sm text-slate-500">
              Lanza una importación manual o reintenta una importación anterior con un motivo explícito.
            </p>
          </div>
          {running !== null && (
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-800">
              <Loader2 className="h-4 w-4 animate-spin" />
              Ejecutando {MODE_LABELS[running.mode]}...
            </div>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Motivo del reintento{" "}
            <span className="font-normal text-slate-400">(obligatorio para los reintentos)</span>
          </label>
          <input
            value={retryReason}
            onChange={(event) => setRetryReason(event.target.value)}
            placeholder="Ej: Timeout del proveedor / desajuste de stock anterior"
            maxLength={250}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {ACTION_MODES.map(({ mode, Icon, title, description }) => (
            <div
              key={mode}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                  <Icon className="h-5 w-5 text-slate-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{description}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => void runImport(mode)}
                  disabled={running !== null}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {running?.mode === mode && running?.action === "trigger" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Ejecutar
                </button>
                <button
                  onClick={() => void runRetry(mode)}
                  disabled={running !== null}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-60"
                >
                  {running?.mode === mode && running?.action === "retry" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Reintentar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Historial de importaciones</h2>
          <button
            onClick={() => void loadHistory()}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
        </div>

        {loading ? (
          <p className="text-slate-500">Cargando historial...</p>
        ) : items.length === 0 ? (
          <p className="text-slate-500">Sin historial de importaciones.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{item.type}</p>
                  <p className="text-sm text-slate-500">
                    {formatDate(item.last_sync)}
                  </p>
                </div>
                {item.details ? (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {Object.entries(parseDetails(item.details)).map(([k, v]) => (
                      <span key={k} className="text-xs text-slate-500">
                        <span className="font-medium text-slate-700">{k}</span>
                        {" = "}
                        <span>{v}</span>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Ejecuciones de importación
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Inspecciona lo que devolvió el proveedor, lo que se persistió y los
              últimos incidentes a nivel de SKU.
            </p>
          </div>
          <button
            onClick={() => void Promise.all([loadRuns(), loadHistory()])}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar ejecuciones
          </button>
        </div>

        {providerStats ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <MetricCard
              label="Recibido del proveedor"
              value={providerStats.aggregates.source_items_received}
              tone="sky"
            />
            <MetricCard
              label="Persistido en catálogo"
              value={providerStats.aggregates.persisted_count}
              tone="emerald"
            />
            <MetricCard
              label="Omitidos por validación"
              value={providerStats.aggregates.validation_skipped_count}
              tone="amber"
            />
            <MetricCard
              label="Diferencia"
              value={providerStats.difference_received_vs_persisted}
              tone="rose"
            />
          </div>
        ) : null}

        {providerStats?.note ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            {providerStats.note}
          </div>
        ) : null}

        {latestRun ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <p className="font-semibold text-slate-900">
                  Interpretación de la última ejecución
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {formatDelta(
                    latestRun.source_items_received,
                    latestRun.persisted_count,
                  )}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {runs.length === 0 ? (
          <p className="text-sm text-slate-500">
            Sin ejecuciones registradas.
          </p>
        ) : (
          <div className="space-y-3">
            {runs.map((run) => {
              const detail = runDetails[run.id] ?? run;
              const errors = runErrors[run.id] ?? detail.errors ?? [];
              const isExpanded = expandedRunId === run.id;

              return (
                <div
                  key={run.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50"
                >
                  <button
                    onClick={() => void ensureRunExpanded(run.id)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          {run.provider.toUpperCase()} · {run.mode}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[run.status] ?? STATUS_STYLES.RUNNING}`}
                        >
                          {run.status.replaceAll("_", " ")}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">
                        Iniciado {formatDate(run.started_at)} · Finalizado{" "}
                        {formatDate(run.finished_at)}
                      </p>
                      <p className="text-sm text-slate-700">
                        {formatDelta(
                          run.source_items_received,
                          run.persisted_count,
                        )}
                      </p>
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-500" />
                    )}
                  </button>

                  {isExpanded ? (
                    <div className="border-t border-slate-200 bg-white p-4">
                      {detailLoadingId === run.id ? (
                        <p className="text-sm text-slate-500">Cargando detalle...</p>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
                            <div className="rounded-xl border border-slate-200 p-3">
                              <p className="text-xs uppercase tracking-wide text-slate-500">
                                Proveedor
                              </p>
                              <p className="mt-2 font-semibold text-slate-900">
                                {detail.source_items_received}
                              </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 p-3">
                              <p className="text-xs uppercase tracking-wide text-slate-500">
                                Procesados
                              </p>
                              <p className="mt-2 font-semibold text-slate-900">
                                {detail.processed_count}
                              </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 p-3">
                              <p className="text-xs uppercase tracking-wide text-slate-500">
                                Persistidos
                              </p>
                              <p className="mt-2 font-semibold text-slate-900">
                                {detail.persisted_count}
                              </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 p-3">
                              <p className="text-xs uppercase tracking-wide text-slate-500">
                                Creados
                              </p>
                              <p className="mt-2 font-semibold text-slate-900">
                                {detail.created_count}
                              </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 p-3">
                              <p className="text-xs uppercase tracking-wide text-slate-500">
                                Actualizados
                              </p>
                              <p className="mt-2 font-semibold text-slate-900">
                                {detail.updated_count}
                              </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 p-3">
                              <p className="text-xs uppercase tracking-wide text-slate-500">
                                Errores
                              </p>
                              <p className="mt-2 font-semibold text-slate-900">
                                {detail.error_count}
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-4 lg:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 p-4">
                              <h3 className="font-semibold text-slate-900">
                                Metadatos de la ejecución
                              </h3>
                              <pre className="mt-3 max-h-56 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
                                {JSON.stringify(
                                  detail.result_meta_json ??
                                    detail.request_meta_json ??
                                    {},
                                  null,
                                  2,
                                )}
                              </pre>
                            </div>

                            <div className="rounded-2xl border border-slate-200 p-4">
                              <h3 className="font-semibold text-slate-900">
                                Últimos incidentes por SKU
                              </h3>
                              {errors.length === 0 ? (
                                <p className="mt-3 text-sm text-slate-500">
                                  Sin incidentes SKU en esta ejecución.
                                </p>
                              ) : (
                                <div className="mt-3 space-y-3">
                                  {errors.map((error) => (
                                    <div
                                      key={error.id}
                                      className="rounded-xl border border-amber-200 bg-amber-50 p-3"
                                    >
                                      <p className="text-sm font-semibold text-slate-900">
                                        {error.sku || "SKU no disponible"}
                                      </p>
                                      <p className="mt-1 text-sm text-slate-700">
                                        {error.message}
                                      </p>
                                      <p className="mt-1 text-xs text-slate-500">
                                        {error.stage || "run"} ·{" "}
                                        {formatDate(error.created_at)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {latestIncidents.length > 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="font-semibold text-slate-900">
              Incidentes de la última ejecución
            </h3>
            <div className="mt-3 space-y-3">
              {latestIncidents.map((error) => (
                <div
                  key={error.id}
                  className="rounded-xl border border-amber-200 bg-amber-50 p-3"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {error.sku || "SKU no disponible"}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{error.message}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {error.stage || "run"} · {formatDate(error.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Diagnóstico de catálogo
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Comprueba cuántos productos hay en la API del proveedor y compáralos
              con los que están en la base de datos. Si el número no coincide, es
              posible que falten productos por importar.
            </p>
          </div>
          <button
            onClick={() => void runCatalogProbe()}
            disabled={catalogProbeLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <Search className="h-4 w-4" />
            {catalogProbeLoading ? "Analizando..." : "Analizar catálogo"}
          </button>
        </div>

        {catalogProbe ? (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  API · primera página
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {catalogProbe.api.firstPageReceived}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  API · total esperado
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {catalogProbe.api.totalExpected ?? "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  BD · productos activos
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {catalogProbe.db.activeProducts}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  BD · total productos
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {catalogProbe.db.totalProducts}
                </p>
              </div>
            </div>

            <div
              className={`rounded-2xl border p-4 ${
                catalogProbe.api.totalExpected !== null &&
                catalogProbe.api.totalExpected > catalogProbe.db.activeProducts
                  ? "border-amber-300 bg-amber-50 text-amber-900"
                  : catalogProbe.probeModeAvailable
                    ? "border-sky-300 bg-sky-50 text-sky-900"
                    : "border-emerald-200 bg-emerald-50 text-emerald-900"
              }`}
            >
              <div className="flex items-start gap-3">
                {catalogProbe.api.totalExpected !== null &&
                catalogProbe.api.totalExpected > catalogProbe.db.activeProducts ? (
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                ) : (
                  <Database className="mt-0.5 h-5 w-5 shrink-0" />
                )}
                <div className="space-y-1">
                  <p className="font-semibold">{catalogProbe.assessment}</p>
                  <div className="text-sm opacity-80">
                    <span>
                      pageSize={catalogProbe.api.pageSize}
                      {catalogProbe.api.configuredPageSize
                        ? ` (configurado: ${catalogProbe.api.configuredPageSize})`
                        : " (sin override)"}
                      {catalogProbe.api.totalPages !== null
                        ? ` · páginas=${catalogProbe.api.totalPages}`
                        : ""}
                      {catalogProbe.api.hasMore !== null
                        ? ` · hasMore=${String(catalogProbe.api.hasMore)}`
                        : ""}
                    </span>
                  </div>
                  {catalogProbe.probeModeAvailable && (
                    <p className="mt-2 text-sm font-medium">
                      ✓ El modo sonda (probe) está disponible. La siguiente importación completa
                      con <code className="rounded bg-black/10 px-1 py-0.5 text-xs">catalog_page_size</code>{" "}
                      configurado obtendrá automáticamente todas las páginas disponibles.
                    </p>
                  )}
                  {!catalogProbe.api.configuredPageSize && (
                    <p className="mt-2 text-sm">
                      💡 Para habilitar la paginación por sonda, configura{" "}
                      <strong>catalog_page_size</strong> en los ajustes de la API
                      (p. ej. 500) y ejecuta una importación completa.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            Pulsa «Analizar catálogo» para comparar los productos de la API con
            los de la base de datos y detectar posibles importaciones incompletas.
          </p>
        )}
      </section>
    </div>
  );
}
