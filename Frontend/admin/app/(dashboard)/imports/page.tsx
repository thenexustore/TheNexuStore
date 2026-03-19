"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchImportConfig,
  fetchImportHistory,
  retryImport,
  testImportConnection,
  triggerImport,
  updateImportConfig,
  type ImportHistoryItem,
} from "@/lib/api";
import { toast } from "sonner";
import {
  RefreshCw,
  Database,
  Box,
  Image as ImageIcon,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";

type ImportMode = "full" | "stock" | "images";

type ConfigFormState = {
  display_name: string;
  base_url: string;
  api_key: string;
  is_active: boolean;
  notes: string;
};

const EMPTY_FORM: ConfigFormState = {
  display_name: "",
  base_url: "",
  api_key: "",
  is_active: true,
  notes: "",
};

export default function ImportsPage() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<null | ImportMode>(null);
  const [items, setItems] = useState<ImportHistoryItem[]>([]);
  const [retryReason, setRetryReason] = useState("");
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [showingSecret, setShowingSecret] = useState(false);
  const [storedMaskedKey, setStoredMaskedKey] = useState<string | null>(null);
  const [lastHealthcheckAt, setLastHealthcheckAt] = useState<string | null>(
    null,
  );
  const [configSource, setConfigSource] = useState<string>("default_fallback");
  const [form, setForm] = useState<ConfigFormState>(EMPTY_FORM);

  const permissions = useMemo(() => {
    try {
      const rawUser = localStorage.getItem("admin_user");
      if (!rawUser) return [] as string[];
      const parsed = JSON.parse(rawUser) as { permissions?: unknown };
      return Array.isArray(parsed.permissions)
        ? parsed.permissions.map((permission) => String(permission))
        : [];
    } catch {
      return [] as string[];
    }
  }, []);

  const hasPermission = (required: string) =>
    permissions.includes("full_access") || permissions.includes(required);

  const canReadConfig = hasPermission("imports:config:read");
  const canUpdateConfig = hasPermission("imports:config:update");
  const canReadSecret = hasPermission("imports:secret:read");

  const loadHistory = async () => {
    try {
      const data = await fetchImportHistory(1, 30);
      setItems(data.items);
    } catch (error: any) {
      toast.error(error.message || "Failed to load import history");
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async (includeSecret = false) => {
    if (!canReadConfig) {
      setConfigLoading(false);
      return;
    }

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
      setLastHealthcheckAt(data.last_healthcheck_at);
      setConfigSource(data.source);
      setShowingSecret(includeSecret && Boolean(data.api_key));
    } catch (error: any) {
      toast.error(error.message || "Failed to load API configuration");
    } finally {
      setConfigLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runImport = async (mode: ImportMode) => {
    setRunning(mode);
    try {
      await triggerImport(mode);
      toast.success(`Import ${mode} executed successfully`);
      await loadHistory();
    } catch (error: any) {
      toast.error(error.message || `Failed to execute ${mode} import`);
    } finally {
      setRunning(null);
    }
  };

  const runRetry = async (mode: ImportMode) => {
    const reason = retryReason.trim();
    if (!reason) {
      toast.error("Retry reason is required");
      return;
    }

    setRunning(mode);
    try {
      await retryImport(mode, reason);
      toast.success(`Retry ${mode} executed successfully`);
      await loadHistory();
    } catch (error: any) {
      toast.error(error.message || `Failed to retry ${mode} import`);
    } finally {
      setRunning(null);
    }
  };

  const saveConfig = async () => {
    setConfigSaving(true);
    try {
      const data = await updateImportConfig({
        display_name: form.display_name,
        base_url: form.base_url,
        api_key: form.api_key.trim() || undefined,
        is_active: form.is_active,
        notes: form.notes,
      });
      setStoredMaskedKey(data.api_key_masked || null);
      setLastHealthcheckAt(data.last_healthcheck_at);
      setConfigSource(data.source);
      if (!showingSecret) {
        setForm((current) => ({ ...current, api_key: "" }));
      }
      toast.success("API configuration updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update API configuration");
    } finally {
      setConfigSaving(false);
    }
  };

  const revealSecret = async () => {
    if (!canReadSecret) {
      toast.error("You do not have permission to reveal the API key");
      return;
    }

    try {
      const data = await fetchImportConfig(true);
      setForm((current) => ({ ...current, api_key: data.api_key || "" }));
      setStoredMaskedKey(data.api_key_masked || null);
      setShowingSecret(true);
      toast.success("API key revealed for this session");
    } catch (error: any) {
      toast.error(error.message || "Failed to reveal API key");
    }
  };

  const hideSecret = () => {
    setShowingSecret(false);
    setForm((current) => ({ ...current, api_key: "" }));
  };

  const testConnection = async () => {
    setTestingConnection(true);
    try {
      const data = await testImportConnection();
      setLastHealthcheckAt(data.checked_at);
      toast.success(
        data.ok
          ? "Provider connection succeeded"
          : "Provider connection failed",
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to test provider connection");
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Imports</h1>
        <p className="text-slate-500 mt-2">
          Run supplier synchronization jobs, manage provider credentials and
          review latest history.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Configuración API
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Fuente actual:{" "}
              <span className="font-medium text-slate-700">{configSource}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 font-medium ${
                form.is_active
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {form.is_active ? "Activo" : "Inactivo"}
            </span>
            {lastHealthcheckAt && (
              <span className="text-slate-500">
                Último healthcheck:{" "}
                {new Date(lastHealthcheckAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {!canReadConfig ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Necesitas el permiso <code>imports:config:read</code> para ver la
            configuración del proveedor.
          </div>
        ) : configLoading ? (
          <p className="text-slate-500">Loading API configuration...</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Nombre visible
              </span>
              <input
                value={form.display_name}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    display_name: e.target.value,
                  }))
                }
                disabled={!canUpdateConfig}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Base URL
              </span>
              <input
                value={form.base_url}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    base_url: e.target.value,
                  }))
                }
                disabled={!canUpdateConfig}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-700">
                Clave API
              </span>
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  value={
                    showingSecret
                      ? form.api_key
                      : storedMaskedKey || "No configurada"
                  }
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      api_key: e.target.value,
                    }))
                  }
                  disabled={!canUpdateConfig || !showingSecret}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                />
                <button
                  type="button"
                  onClick={showingSecret ? hideSecret : revealSecret}
                  disabled={!canReadSecret}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {showingSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  {showingSecret ? "Ocultar clave" : "Mostrar clave"}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                La clave se devuelve enmascarada por defecto. Mostrarla requiere{" "}
                <code>imports:secret:read</code>.
              </p>
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Notas</span>
              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((current) => ({ ...current, notes: e.target.value }))
                }
                disabled={!canUpdateConfig}
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </label>

            <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700 md:col-span-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    is_active: e.target.checked,
                  }))
                }
                disabled={!canUpdateConfig}
                className="h-4 w-4 rounded border-slate-300"
              />
              Integración activa
            </label>

            <div className="flex flex-wrap gap-3 md:col-span-2">
              <button
                type="button"
                onClick={saveConfig}
                disabled={!canUpdateConfig || configSaving}
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {configSaving ? "Saving..." : "Guardar configuración"}
              </button>
              <button
                type="button"
                onClick={testConnection}
                disabled={!canReadConfig || testingConnection}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShieldCheck className="h-4 w-4" />
                {testingConnection ? "Probando..." : "Probar conexión"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => runImport("full")}
          disabled={running !== null}
          className="bg-white border border-slate-200 rounded-2xl p-4 text-left hover:border-slate-300 disabled:opacity-60"
        >
          <Database className="w-5 h-5 text-slate-700 mb-3" />
          <p className="font-semibold text-slate-900">
            Run full catalog import
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Sync complete catalog, stock and product changes.
          </p>
        </button>

        <button
          onClick={() => runRetry("full")}
          disabled={running !== null}
          className="bg-white border border-slate-200 rounded-2xl p-4 text-left hover:border-slate-300 disabled:opacity-60"
        >
          <Database className="w-5 h-5 text-amber-700 mb-3" />
          <p className="font-semibold text-slate-900">Retry full import</p>
          <p className="text-sm text-slate-500 mt-1">
            Re-run full sync with an explicit retry reason.
          </p>
        </button>

        <button
          onClick={() => runImport("stock")}
          disabled={running !== null}
          className="bg-white border border-slate-200 rounded-2xl p-4 text-left hover:border-slate-300 disabled:opacity-60"
        >
          <Box className="w-5 h-5 text-slate-700 mb-3" />
          <p className="font-semibold text-slate-900">Run stock sync</p>
          <p className="text-sm text-slate-500 mt-1">
            Refresh inventory levels from supplier feed.
          </p>
        </button>

        <button
          onClick={() => runRetry("stock")}
          disabled={running !== null}
          className="bg-white border border-slate-200 rounded-2xl p-4 text-left hover:border-slate-300 disabled:opacity-60"
        >
          <Box className="w-5 h-5 text-amber-700 mb-3" />
          <p className="font-semibold text-slate-900">Retry stock sync</p>
          <p className="text-sm text-slate-500 mt-1">
            Re-run stock synchronization with retry reason.
          </p>
        </button>

        <button
          onClick={() => runImport("images")}
          disabled={running !== null}
          className="bg-white border border-slate-200 rounded-2xl p-4 text-left hover:border-slate-300 disabled:opacity-60"
        >
          <ImageIcon className="w-5 h-5 text-slate-700 mb-3" />
          <p className="font-semibold text-slate-900">Run image sync</p>
          <p className="text-sm text-slate-500 mt-1">
            Backfill missing product images.
          </p>
        </button>

        <button
          onClick={() => runRetry("images")}
          disabled={running !== null}
          className="bg-white border border-slate-200 rounded-2xl p-4 text-left hover:border-slate-300 disabled:opacity-60"
        >
          <ImageIcon className="w-5 h-5 text-amber-700 mb-3" />
          <p className="font-semibold text-slate-900">Retry image sync</p>
          <p className="text-sm text-slate-500 mt-1">
            Re-run image synchronization with retry reason.
          </p>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Retry reason (required for retry actions)
        </label>
        <input
          value={retryReason}
          onChange={(e) => setRetryReason(e.target.value)}
          placeholder="e.g. Previous supplier timeout / stock mismatch"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Import history</h2>
          <button
            onClick={loadHistory}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
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
                    {new Date(item.last_sync).toLocaleString()}
                  </p>
                </div>
                {item.details && (
                  <p className="text-sm text-slate-600 mt-2">{item.details}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
