import { fetchWithAuth } from "../utils";

export interface ImportHistoryItem {
  id: number;
  type: string;
  last_sync: string;
  details?: string | null;
}

export interface ImportHistoryResponse {
  items: ImportHistoryItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ImportRunError {
  id: string;
  sku?: string | null;
  stage?: string | null;
  message: string;
  created_at: string;
}

export interface ImportRun {
  id: string;
  provider: string;
  mode: string;
  started_at: string;
  finished_at?: string | null;
  status: "RUNNING" | "SUCCESS" | "PARTIAL_SUCCESS" | "FAILED";
  source_items_received: number;
  processed_count: number;
  persisted_count: number;
  validation_skipped_count: number;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  error_count: number;
  archived_count: number;
  request_meta_json?: Record<string, unknown> | null;
  result_meta_json?: Record<string, unknown> | null;
  errors?: ImportRunError[];
}

export interface ProviderStatsResponse {
  provider: string;
  latestRun?: ImportRun | null;
  statusCounts: Record<string, number>;
  aggregates: {
    source_items_received: number;
    processed_count: number;
    persisted_count: number;
    validation_skipped_count: number;
    created_count: number;
    updated_count: number;
    skipped_count: number;
    error_count: number;
    archived_count: number;
  };
  difference_received_vs_persisted: number;
  note: string;
}

export async function fetchImportHistory(
  page = 1,
  limit = 20,
): Promise<ImportHistoryResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  return fetchWithAuth(`/admin/imports/history?${params.toString()}`);
}

export async function fetchImportRuns(): Promise<ImportRun[]> {
  return fetchWithAuth("/admin/imports/runs");
}

export async function fetchImportRun(id: string): Promise<ImportRun> {
  return fetchWithAuth(`/admin/imports/runs/${id}`);
}

export async function fetchImportRunErrors(id: string): Promise<ImportRunError[]> {
  return fetchWithAuth(`/admin/imports/runs/${id}/errors`);
}

export async function fetchProviderStats(): Promise<ProviderStatsResponse> {
  return fetchWithAuth("/admin/imports/provider-stats");
}

export async function triggerImport(mode: "full" | "stock" | "images") {
  return fetchWithAuth("/admin/imports/run", {
    method: "POST",
    body: JSON.stringify({ mode }),
  });
}

export async function retryImport(
  mode: "full" | "stock" | "images",
  reason: string,
) {
  return fetchWithAuth("/admin/imports/retry", {
    method: "POST",
    body: JSON.stringify({ mode, reason }),
  });
}
