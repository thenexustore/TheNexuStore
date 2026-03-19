"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchImportRun,
  fetchImportRunErrors,
  fetchImportRuns,
  fetchProviderStats,
  retryImport,
  triggerImport,
  type ImportRun,
  type ImportRunError,
  type ProviderStatsResponse,
} from "@/lib/api";
import { toast } from "sonner";
import {
  RefreshCw,
  Database,
  Box,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";

const statusStyles: Record<string, string> = {
  SUCCESS: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PARTIAL_SUCCESS: "bg-amber-50 text-amber-700 border-amber-200",
  FAILED: "bg-rose-50 text-rose-700 border-rose-200",
  RUNNING: "bg-sky-50 text-sky-700 border-sky-200",
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : "—";

const formatDelta = (received: number, persisted: number) => {
  if (received === persisted) {
    return `La API devolvió ${received} y se guardaron ${persisted}`;
  }
  if (received > persisted) {
    return `La API devolvió ${received} pero solo se guardaron ${persisted}`;
  }
  return `Se guardaron ${persisted} aunque el feed marcó ${received} recibidos`;
};

function MetricCard({ label, value, tone = "slate" }: { label: string; value: string | number; tone?: "slate" | "blue" | "amber" | "emerald" | "rose" }) {
  const tones = {
    slate: "bg-slate-50 border-slate-200 text-slate-900",
    blue: "bg-sky-50 border-sky-200 text-sky-900",
    amber: "bg-amber-50 border-amber-200 text-amber-900",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-900",
    rose: "bg-rose-50 border-rose-200 text-rose-900",
  };

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export default function ImportsPage() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<null | "full" | "stock" | "images">(null);
  const [runs, setRuns] = useState<ImportRun[]>([]);
  const [providerStats, setProviderStats] = useState<ProviderStatsResponse | null>(null);
  const [retryReason, setRetryReason] = useState("");
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [runDetails, setRunDetails] = useState<Record<string, ImportRun>>({});
  const [runErrors, setRunErrors] = useState<Record<string, ImportRunError[]>>({});
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [runsData, providerStatsData] = await Promise.all([
        fetchImportRuns(),
        fetchProviderStats(),
      ]);
      setRuns(runsData);
      setProviderStats(providerStatsData);
    } catch (error: any) {
      toast.error(error.message || "Failed to load import dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const ensureRunExpanded = async (id: string) => {
    if (expandedRunId === id) {
      setExpandedRunId(null);
      return;
    }

    setExpandedRunId(id);
    if (runDetails[id] && runErrors[id]) {
      return;
    }

    setDetailLoadingId(id);
    try {
      const [detail, errors] = await Promise.all([
        fetchImportRun(id),
        fetchImportRunErrors(id),
      ]);
      setRunDetails((prev) => ({ ...prev, [id]: detail }));
      setRunErrors((prev) => ({ ...prev, [id]: errors }));
    } catch (error: any) {
      toast.error(error.message || "Failed to load import run detail");
    } finally {
      setDetailLoadingId(null);
    }
  };

  const runImport = async (mode: "full" | "stock" | "images") => {
    setRunning(mode);
    try {
      await triggerImport(mode);
      toast.success(`Import ${mode} executed successfully`);
      await loadDashboard();
    } catch (error: any) {
      toast.error(error.message || `Failed to execute ${mode} import`);
    } finally {
      setRunning(null);
    }
  };

  const runRetry = async (mode: "full" | "stock" | "images") => {
    const reason = retryReason.trim();
    if (!reason) {
      toast.error("Retry reason is required");
      return;
    }

    setRunning(mode);
    try {
      await retryImport(mode, reason);
      toast.success(`Retry ${mode} executed successfully`);
      await loadDashboard();
    } catch (error: any) {
      toast.error(error.message || `Failed to retry ${mode} import`);
    } finally {
      setRunning(null);
    }
  };

  const latestRun = providerStats?.latestRun ?? runs[0] ?? null;
  const latestIncidents = useMemo(
    () => latestRun?.errors ?? runErrors[latestRun?.id ?? ""] ?? [],
    [latestRun, runErrors],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Imports</h1>
        <p className="mt-2 text-slate-500">
          Run supplier synchronization jobs and compare what the provider returned versus what the catalog actually persisted.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <button onClick={() => runImport("full")} disabled={running !== null} className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-slate-300 disabled:opacity-60">
          <Database className="mb-3 h-5 w-5 text-slate-700" />
          <p className="font-semibold text-slate-900">Run full catalog import</p>
          <p className="mt-1 text-sm text-slate-500">Sync complete catalog, stock and product changes.</p>
        </button>

        <button onClick={() => runRetry("full")} disabled={running !== null} className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-slate-300 disabled:opacity-60">
          <Database className="mb-3 h-5 w-5 text-amber-700" />
          <p className="font-semibold text-slate-900">Retry full import</p>
          <p className="mt-1 text-sm text-slate-500">Re-run full sync with an explicit retry reason.</p>
        </button>

        <button onClick={() => runImport("stock")} disabled={running !== null} className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-slate-300 disabled:opacity-60">
          <Box className="mb-3 h-5 w-5 text-slate-700" />
          <p className="font-semibold text-slate-900">Run stock sync</p>
          <p className="mt-1 text-sm text-slate-500">Refresh inventory levels from supplier feed.</p>
        </button>

        <button onClick={() => runRetry("stock")} disabled={running !== null} className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-slate-300 disabled:opacity-60">
          <Box className="mb-3 h-5 w-5 text-amber-700" />
          <p className="font-semibold text-slate-900">Retry stock sync</p>
          <p className="mt-1 text-sm text-slate-500">Re-run stock synchronization with retry reason.</p>
        </button>

        <button onClick={() => runImport("images")} disabled={running !== null} className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-slate-300 disabled:opacity-60">
          <ImageIcon className="mb-3 h-5 w-5 text-slate-700" />
          <p className="font-semibold text-slate-900">Run image sync</p>
          <p className="mt-1 text-sm text-slate-500">Backfill missing product images.</p>
        </button>

        <button onClick={() => runRetry("images")} disabled={running !== null} className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-slate-300 disabled:opacity-60">
          <ImageIcon className="mb-3 h-5 w-5 text-amber-700" />
          <p className="font-semibold text-slate-900">Retry image sync</p>
          <p className="mt-1 text-sm text-slate-500">Re-run image synchronization with retry reason.</p>
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <label className="mb-2 block text-sm font-medium text-slate-700">Retry reason (required for retry actions)</label>
        <input value={retryReason} onChange={(e) => setRetryReason(e.target.value)} placeholder="e.g. Previous supplier timeout / stock mismatch" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">Loading import dashboard...</div>
      ) : (
        <>
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Latest sync summary</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {latestRun
                    ? `${latestRun.provider.toUpperCase()} · ${latestRun.mode} · ${formatDate(latestRun.started_at)}`
                    : "No structured sync runs yet."}
                </p>
              </div>
              <button onClick={loadDashboard} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
            </div>

            {latestRun ? (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4 xl:grid-cols-6">
                  <MetricCard label="Recibidos proveedor" value={latestRun.source_items_received} tone="blue" />
                  <MetricCard label="Procesados" value={latestRun.processed_count} />
                  <MetricCard label="Persistidos catálogo" value={latestRun.persisted_count} tone="emerald" />
                  <MetricCard label="Descartados validación" value={latestRun.validation_skipped_count} tone="amber" />
                  <MetricCard label="Errores" value={latestRun.error_count} tone={latestRun.error_count > 0 ? "rose" : "slate"} />
                  <MetricCard label="Archivados" value={latestRun.archived_count} />
                </div>

                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                  <p className="font-semibold">Lectura operativa del último sync</p>
                  <p className="mt-1">{formatDelta(latestRun.source_items_received, latestRun.persisted_count)}</p>
                  <p className="mt-2 text-sky-800">
                    Esta etiqueta diferencia explícitamente cuando el proveedor respondió con más registros de los que terminaron persistidos en catálogo.
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">Run a sync to start collecting structured metrics.</p>
            )}
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-bold text-slate-900">Executions</h2>
              <p className="mt-1 text-sm text-slate-500">Structured runs show provider totals, persisted totals, and recent SKU incidents for each execution.</p>

              <div className="mt-4 space-y-3">
                {runs.length === 0 ? (
                  <p className="text-sm text-slate-500">No executions recorded yet.</p>
                ) : (
                  runs.map((run) => {
                    const detail = runDetails[run.id] ?? run;
                    const errors = runErrors[run.id] ?? detail.errors ?? [];
                    const isExpanded = expandedRunId === run.id;

                    return (
                      <div key={run.id} className="rounded-2xl border border-slate-200 bg-slate-50">
                        <button onClick={() => ensureRunExpanded(run.id)} className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-slate-900">{run.provider.toUpperCase()} · {run.mode}</span>
                              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[run.status] ?? statusStyles.RUNNING}`}>{run.status.replaceAll("_", " ")}</span>
                            </div>
                            <p className="text-sm text-slate-500">Started {formatDate(run.started_at)} · Finished {formatDate(run.finished_at)}</p>
                            <p className="text-sm text-slate-700">{formatDelta(run.source_items_received, run.persisted_count)}</p>
                          </div>
                          {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
                        </button>

                        {isExpanded && (
                          <div className="border-t border-slate-200 bg-white p-4">
                            {detailLoadingId === run.id ? (
                              <p className="text-sm text-slate-500">Loading detail...</p>
                            ) : (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
                                  <MetricCard label="Proveedor" value={detail.source_items_received} tone="blue" />
                                  <MetricCard label="Procesados" value={detail.processed_count} />
                                  <MetricCard label="Persistidos" value={detail.persisted_count} tone="emerald" />
                                  <MetricCard label="Creados" value={detail.created_count} tone="emerald" />
                                  <MetricCard label="Actualizados" value={detail.updated_count} />
                                  <MetricCard label="Saltados" value={detail.skipped_count} tone="amber" />
                                </div>

                                <div className="grid gap-4 lg:grid-cols-2">
                                  <div className="rounded-2xl border border-slate-200 p-4">
                                    <h3 className="font-semibold text-slate-900">Detalle de métricas</h3>
                                    <dl className="mt-3 space-y-2 text-sm">
                                      <div className="flex justify-between gap-3"><dt className="text-slate-500">Descartados por validación</dt><dd className="font-medium text-slate-900">{detail.validation_skipped_count}</dd></div>
                                      <div className="flex justify-between gap-3"><dt className="text-slate-500">Errores</dt><dd className="font-medium text-slate-900">{detail.error_count}</dd></div>
                                      <div className="flex justify-between gap-3"><dt className="text-slate-500">Archivados</dt><dd className="font-medium text-slate-900">{detail.archived_count}</dd></div>
                                      <div className="flex justify-between gap-3"><dt className="text-slate-500">Diferencia proveedor vs catálogo</dt><dd className="font-medium text-slate-900">{detail.source_items_received - detail.persisted_count}</dd></div>
                                    </dl>
                                  </div>

                                  <div className="rounded-2xl border border-slate-200 p-4">
                                    <h3 className="font-semibold text-slate-900">Meta</h3>
                                    <pre className="mt-3 max-h-56 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(detail.result_meta_json ?? detail.request_meta_json ?? {}, null, 2)}</pre>
                                  </div>
                                </div>

                                <div className="rounded-2xl border border-slate-200 p-4">
                                  <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                                    <h3 className="font-semibold text-slate-900">Errores recientes por SKU</h3>
                                  </div>
                                  {errors.length === 0 ? (
                                    <p className="mt-3 text-sm text-slate-500">No recent SKU incidents recorded for this run.</p>
                                  ) : (
                                    <div className="mt-3 overflow-x-auto">
                                      <table className="min-w-full text-sm">
                                        <thead>
                                          <tr className="text-left text-slate-500">
                                            <th className="pb-2 pr-4 font-medium">SKU</th>
                                            <th className="pb-2 pr-4 font-medium">Stage</th>
                                            <th className="pb-2 pr-4 font-medium">Message</th>
                                            <th className="pb-2 font-medium">Timestamp</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {errors.map((error) => (
                                            <tr key={error.id} className="border-t border-slate-100 text-slate-700">
                                              <td className="py-2 pr-4 font-medium text-slate-900">{error.sku || "—"}</td>
                                              <td className="py-2 pr-4">{error.stage || "—"}</td>
                                              <td className="py-2 pr-4">{error.message}</td>
                                              <td className="py-2">{formatDate(error.created_at)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-bold text-slate-900">Status counters</h2>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {Object.entries(providerStats?.statusCounts ?? {}).map(([status, count]) => (
                    <MetricCard key={status} label={status.replaceAll("_", " ")} value={count} tone={status === "FAILED" ? "rose" : status === "PARTIAL_SUCCESS" ? "amber" : status === "SUCCESS" ? "emerald" : "blue"} />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-bold text-slate-900">Provider vs catalog</h2>
                <p className="mt-2 text-sm text-slate-600">{providerStats?.note ?? "No provider aggregates yet."}</p>
                {providerStats && (
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Recibidos</dt><dd className="font-medium text-slate-900">{providerStats.aggregates.source_items_received}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Persistidos</dt><dd className="font-medium text-slate-900">{providerStats.aggregates.persisted_count}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Diferencia</dt><dd className="font-medium text-slate-900">{providerStats.difference_received_vs_persisted}</dd></div>
                  </dl>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-bold text-slate-900">Recent SKU incidents</h2>
                {latestIncidents.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">No recent incidents in the latest run.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {latestIncidents.map((error) => (
                      <div key={error.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <p className="text-sm font-semibold text-slate-900">{error.sku || "SKU unavailable"}</p>
                        <p className="mt-1 text-sm text-slate-700">{error.message}</p>
                        <p className="mt-1 text-xs text-slate-500">{error.stage || "run"} · {formatDate(error.created_at)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </section>
        </>
      )}
    </div>
  );
}
