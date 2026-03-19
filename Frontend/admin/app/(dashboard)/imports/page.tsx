"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchImportConfig,
  fetchImportHistory,
  fetchImportRun,
  fetchImportRunErrors,
  fetchImportRuns,
  fetchProviderStats,
  retryImport,
  testImportConnection,
  triggerImport,
  updateImportConfig,
  type ImportHistoryItem,
  type ImportRun,
  type ImportRunError,
  type ProviderStatsResponse,
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
  PlugZap,
  RefreshCw,
  Save,
} from "lucide-react";

type ImportMode = "full" | "stock" | "images";

type ImportConfigForm = {
  display_name: string;
  base_url: string;
  api_key: string;
  is_active: boolean;
  notes: string;
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
          ? "Supplier metadata indicates more catalog items than were received."
          : matchesTechnicalLimit || pageSizeLimitReached
            ? "The supplier response matched a known technical limit exactly."
            : "The supplier returned an unusually round item count.",
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
  const [running, setRunning] = useState<ImportMode | null>(null);
  const [retryReason, setRetryReason] = useState("");
  const [items, setItems] = useState<ImportHistoryItem[]>([]);
  const [runs, setRuns] = useState<ImportRun[]>([]);
  const [providerStats, setProviderStats] =
    useState<ProviderStatsResponse | null>(null);
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
  const [form, setForm] = useState<ImportConfigForm>({
    display_name: "",
    base_url: "",
    api_key: "",
    is_active: true,
    notes: "",
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
      toast.error(getErrorMessage(error, "Failed to load import history"));
    } finally {
      setLoading(false);
    }
  }

  async function loadRuns() {
    try {
      const [runsData, providerStatsData] = await Promise.all([fetchImportRuns(), fetchProviderStats()]);
      setRuns(runsData);
      setProviderStats(providerStatsData);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Failed to load import observability"),
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
      });
      setStoredMaskedKey(data.api_key_masked || null);
      setLastHealthcheckAt(data.last_healthcheck_at || null);
      setConfigSource(data.source || null);
      setShowingSecret(includeSecret && Boolean(data.api_key));
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Failed to load API configuration"),
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
      toast.error(getErrorMessage(error, "Failed to load run detail"));
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
      });
      toast.success("API configuration updated");
      await loadConfig(showingSecret && canReadSecret);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Failed to update API configuration"),
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
          ? "Connection to supplier API is healthy"
          : "Supplier API responded as unhealthy",
      );
      await loadConfig(showingSecret && canReadSecret);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to test API connection"));
    } finally {
      setConnectionTesting(false);
    }
  }

  async function handleToggleSecret() {
    if (!canReadSecret) {
      toast.error("You do not have permission to read the API key");
      return;
    }

    await loadConfig(!showingSecret);
  }

  async function runImport(mode: ImportMode) {
    setRunning(mode);

    try {
      await triggerImport(mode);
      toast.success(`Import ${mode} executed successfully`);
      await Promise.all([loadHistory(), loadRuns()]);
    } catch (error) {
      toast.error(
        getErrorMessage(error, `Failed to execute ${mode} import`),
      );
    } finally {
      setRunning(null);
    }
  }

  async function runRetry(mode: ImportMode) {
    const reason = retryReason.trim();
    if (!reason) {
      toast.error("Retry reason is required");
      return;
    }

    setRunning(mode);

    try {
      await retryImport(mode, reason);
      toast.success(`Retry ${mode} executed successfully`);
      await Promise.all([loadHistory(), loadRuns()]);
    } catch (error) {
      toast.error(getErrorMessage(error, `Failed to retry ${mode} import`));
    } finally {
      setRunning(null);
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
        <h1 className="text-3xl font-bold text-slate-900">Imports</h1>
        <p className="mt-2 text-slate-500">
          Total control of the supplier API from a single tab: configuration,
          key visibility, health checks, structured runs, and what actually
          reached the catalog.
        </p>
      </div>

      {suspiciousAlert ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Potential supplier truncation detected</p>
              <p className="mt-1 text-sm">
                {suspiciousAlert.reason} Latest run:
                <strong> {suspiciousAlert.item.type}</strong>
                {` · received=${suspiciousAlert.received}`}
                {suspiciousAlert.pageSize
                  ? ` · pageSize=${suspiciousAlert.pageSize}`
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
              API control center
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage the API name, base URL, active status, current key, and
              connection checks from the Imports tab.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void handleTestConnection()}
              disabled={connectionTesting || !canReadConfig}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <PlugZap className="h-4 w-4" />
              {connectionTesting ? "Testing..." : "Test connection"}
            </button>

            {canUpdateConfig ? (
              <button
                onClick={() => void saveConfig()}
                disabled={configSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {configSaving ? "Saving..." : "Save API config"}
              </button>
            ) : null}
          </div>
        </div>

        {!canReadConfig ? (
          <p className="mt-4 text-sm text-slate-500">
            Your account cannot read supplier API configuration.
          </p>
        ) : configLoading ? (
          <p className="mt-4 text-sm text-slate-500">
            Loading API configuration...
          </p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Database className="h-4 w-4" />
                  API name
                </div>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {form.display_name || "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Globe className="h-4 w-4" />
                  Config source
                </div>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {configSource || "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <PlugZap className="h-4 w-4" />
                  Last healthcheck
                </div>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {formatDate(lastHealthcheckAt)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <KeyRound className="h-4 w-4" />
                  Stored key
                </div>
                <p className="mt-2 break-all text-lg font-semibold text-slate-900">
                  {showingSecret
                    ? form.api_key || "—"
                    : storedMaskedKey || "No key stored"}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    API display name
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
                    Base URL
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
                  Integration active
                </label>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-sm font-medium text-slate-700">
                      API key
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
                        ? "Hide current key"
                        : "Show current key"}
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
                      ? "You are viewing the current stored key."
                      : "The current key is masked by default. Use ‘Show current key’ if your permissions allow it."}
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Internal notes
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
          </>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <button
          onClick={() => void runImport("full")}
          disabled={running !== null}
          className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-slate-300 disabled:opacity-60"
        >
          <Database className="mb-3 h-5 w-5 text-slate-700" />
          <p className="font-semibold text-slate-900">Run full catalog import</p>
          <p className="mt-1 text-sm text-slate-500">
            Sync complete catalog, stock and product changes.
          </p>
        </button>

        <button
          onClick={() => void runRetry("full")}
          disabled={running !== null}
          className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-slate-300 disabled:opacity-60"
        >
          <Database className="mb-3 h-5 w-5 text-amber-700" />
          <p className="font-semibold text-slate-900">Retry full import</p>
          <p className="mt-1 text-sm text-slate-500">
            Re-run full sync with an explicit retry reason.
          </p>
        </button>

        <button
          onClick={() => void runImport("stock")}
          disabled={running !== null}
          className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-slate-300 disabled:opacity-60"
        >
          <Box className="mb-3 h-5 w-5 text-slate-700" />
          <p className="font-semibold text-slate-900">Run stock sync</p>
          <p className="mt-1 text-sm text-slate-500">
            Refresh inventory levels from supplier feed.
          </p>
        </button>

        <button
          onClick={() => void runRetry("stock")}
          disabled={running !== null}
          className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-slate-300 disabled:opacity-60"
        >
          <Box className="mb-3 h-5 w-5 text-amber-700" />
          <p className="font-semibold text-slate-900">Retry stock sync</p>
          <p className="mt-1 text-sm text-slate-500">
            Re-run stock synchronization with retry reason.
          </p>
        </button>

        <button
          onClick={() => void runImport("images")}
          disabled={running !== null}
          className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-slate-300 disabled:opacity-60"
        >
          <ImageIcon className="mb-3 h-5 w-5 text-slate-700" />
          <p className="font-semibold text-slate-900">Run image sync</p>
          <p className="mt-1 text-sm text-slate-500">
            Backfill missing product images.
          </p>
        </button>

        <button
          onClick={() => void runRetry("images")}
          disabled={running !== null}
          className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-slate-300 disabled:opacity-60"
        >
          <ImageIcon className="mb-3 h-5 w-5 text-amber-700" />
          <p className="font-semibold text-slate-900">Retry image sync</p>
          <p className="mt-1 text-sm text-slate-500">
            Re-run image synchronization with retry reason.
          </p>
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Retry reason (required for retry actions)
        </label>
        <input
          value={retryReason}
          onChange={(event) => setRetryReason(event.target.value)}
          placeholder="e.g. Previous supplier timeout / stock mismatch"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Import history</h2>
          <button
            onClick={() => void loadHistory()}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-slate-500">Loading history...</p>
        ) : items.length === 0 ? (
          <p className="text-slate-500">No import history yet.</p>
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
                  <p className="mt-2 text-sm text-slate-600">{item.details}</p>
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
              Structured import runs
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Inspect what the provider returned, what persisted, and the most
              recent SKU-level incidents.
            </p>
          </div>
          <button
            onClick={() => void Promise.all([loadRuns(), loadHistory()])}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh runs
          </button>
        </div>

        {providerStats ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <MetricCard
              label="Provider received"
              value={providerStats.aggregates.source_items_received}
              tone="sky"
            />
            <MetricCard
              label="Catalog persisted"
              value={providerStats.aggregates.persisted_count}
              tone="emerald"
            />
            <MetricCard
              label="Validation skipped"
              value={providerStats.aggregates.validation_skipped_count}
              tone="amber"
            />
            <MetricCard
              label="Difference"
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
                  Latest run interpretation
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
            No structured runs recorded yet.
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
                        Started {formatDate(run.started_at)} · Finished{" "}
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
                        <p className="text-sm text-slate-500">Loading detail...</p>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
                            <div className="rounded-xl border border-slate-200 p-3">
                              <p className="text-xs uppercase tracking-wide text-slate-500">
                                Provider
                              </p>
                              <p className="mt-2 font-semibold text-slate-900">
                                {detail.source_items_received}
                              </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 p-3">
                              <p className="text-xs uppercase tracking-wide text-slate-500">
                                Processed
                              </p>
                              <p className="mt-2 font-semibold text-slate-900">
                                {detail.processed_count}
                              </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 p-3">
                              <p className="text-xs uppercase tracking-wide text-slate-500">
                                Persisted
                              </p>
                              <p className="mt-2 font-semibold text-slate-900">
                                {detail.persisted_count}
                              </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 p-3">
                              <p className="text-xs uppercase tracking-wide text-slate-500">
                                Created
                              </p>
                              <p className="mt-2 font-semibold text-slate-900">
                                {detail.created_count}
                              </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 p-3">
                              <p className="text-xs uppercase tracking-wide text-slate-500">
                                Updated
                              </p>
                              <p className="mt-2 font-semibold text-slate-900">
                                {detail.updated_count}
                              </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 p-3">
                              <p className="text-xs uppercase tracking-wide text-slate-500">
                                Errors
                              </p>
                              <p className="mt-2 font-semibold text-slate-900">
                                {detail.error_count}
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-4 lg:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 p-4">
                              <h3 className="font-semibold text-slate-900">
                                Run metadata
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
                                Latest SKU incidents
                              </h3>
                              {errors.length === 0 ? (
                                <p className="mt-3 text-sm text-slate-500">
                                  No SKU incidents recorded for this run.
                                </p>
                              ) : (
                                <div className="mt-3 space-y-3">
                                  {errors.map((error) => (
                                    <div
                                      key={error.id}
                                      className="rounded-xl border border-amber-200 bg-amber-50 p-3"
                                    >
                                      <p className="text-sm font-semibold text-slate-900">
                                        {error.sku || "SKU unavailable"}
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
              Latest run incidents
            </h3>
            <div className="mt-3 space-y-3">
              {latestIncidents.map((error) => (
                <div
                  key={error.id}
                  className="rounded-xl border border-amber-200 bg-amber-50 p-3"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {error.sku || "SKU unavailable"}
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
    </div>
  );
}
