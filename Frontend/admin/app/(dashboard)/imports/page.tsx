"use client";

import { useEffect, useState } from "react";
import {
  fetchImportHistory,
  triggerImport,
  type ImportHistoryItem,
} from "@/lib/api";
import { toast } from "sonner";
import { RefreshCw, Database, Box, Image as ImageIcon } from "lucide-react";

export default function ImportsPage() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<null | "full" | "stock" | "images">(
    null,
  );
  const [items, setItems] = useState<ImportHistoryItem[]>([]);

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

  const runImport = async (mode: "full" | "stock" | "images") => {
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
