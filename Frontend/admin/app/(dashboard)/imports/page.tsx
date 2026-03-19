"use client";

import { useEffect, useState } from "react";
import {
  fetchImportHistory,
  retryImport,
  triggerImport,
  type ImportHistoryItem,
} from "@/lib/api";
import { toast } from "sonner";
import { RefreshCw, Database, Box, Image as ImageIcon } from "lucide-react";

type ImportMode = "full" | "stock" | "images";

export default function ImportsPage() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<ImportMode | null>(null);
  const [items, setItems] = useState<ImportHistoryItem[]>([]);
  const [retryReason, setRetryReason] = useState("");

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

  useEffect(() => {
    loadHistory();
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Imports</h1>
        <p className="text-slate-500 mt-2">
          Run supplier synchronization jobs and review latest history.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => runImport("full")}
          disabled={running !== null}
          className="bg-white border border-slate-200 rounded-2xl p-4 text-left hover:border-slate-300 disabled:opacity-60"
        >
          <Database className="w-5 h-5 text-slate-700 mb-3" />
          <p className="font-semibold text-slate-900">Run full catalog import</p>
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
