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

export interface ImportConnectionTestResponse {
  ok: boolean;
  checked_at: string;
}

export interface ImportRuntimeSettings {
  stock_sync_enabled: boolean;
  incremental_sync_enabled: boolean;
  full_sync_enabled: boolean;
  images_sync_enabled: boolean;
  stock_sync_cron: string;
  incremental_sync_cron: string;
  full_sync_cron: string;
  images_sync_cron: string;
  stock_batch_size: number;
  full_sync_batch_size: number;
  full_sync_batch_delay_ms: number;
  image_sync_take: number;
  catalog_page_size?: number | null;
}


export interface ImportRuntimeJobOverview {
  key: "full" | "incremental" | "stock" | "images";
  job_name: string;
  cron: string;
  enabled_in_settings: boolean;
  effective_enabled: boolean;
  registered: boolean;
  next_run_at?: string | null;
}

export interface ImportRuntimeOverviewResponse {
  provider: string;
  integration_enabled: boolean;
  settings: ImportRuntimeSettings;
  jobs: ImportRuntimeJobOverview[];
}

export interface ImportConfigResponse {
  provider: string;
  display_name: string;
  base_url: string;
  is_active: boolean;
  notes?: string | null;
  last_healthcheck_at?: string | null;
  api_key_last4?: string | null;
  api_key_masked?: string | null;
  api_key?: string;
  source?: string;
  settings: ImportRuntimeSettings;
}

export interface UpdateImportConfigInput {
  display_name: string;
  base_url: string;
  api_key?: string;
  is_active?: boolean;
  notes?: string;
  stock_sync_enabled?: boolean;
  incremental_sync_enabled?: boolean;
  full_sync_enabled?: boolean;
  images_sync_enabled?: boolean;
  stock_sync_cron?: string;
  incremental_sync_cron?: string;
  full_sync_cron?: string;
  images_sync_cron?: string;
  stock_batch_size?: number;
  full_sync_batch_size?: number;
  full_sync_batch_delay_ms?: number;
  image_sync_take?: number;
  catalog_page_size?: number | null;
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

export async function fetchImportRuntimeOverview(): Promise<ImportRuntimeOverviewResponse> {
  return fetchWithAuth("/admin/imports/runtime-overview");
}

export async function fetchImportConfig(
  includeSecret = false,
): Promise<ImportConfigResponse> {
  return fetchWithAuth(
    `/admin/imports/config?includeSecret=${includeSecret ? "true" : "false"}`,
  );
}

export async function updateImportConfig(
  input: UpdateImportConfigInput,
): Promise<ImportConfigResponse> {
  return fetchWithAuth("/admin/imports/config", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function testImportConnection(): Promise<ImportConnectionTestResponse> {
  return fetchWithAuth("/admin/imports/config/test-connection", {
    method: "POST",
  });
}

export async function triggerImport(mode: "full" | "incremental" | "stock" | "images") {
  return fetchWithAuth("/admin/imports/run", {
    method: "POST",
    body: JSON.stringify({ mode }),
  });
}

export async function retryImport(
  mode: "full" | "incremental" | "stock" | "images",
  reason: string,
) {
  return fetchWithAuth("/admin/imports/retry", {
    method: "POST",
    body: JSON.stringify({ mode, reason }),
  });
}

export interface CatalogProbeResponse {
  api: {
    firstPageReceived: number;
    totalExpected: number | null;
    totalPages: number | null;
    pageSize: number;
    hasMore: boolean | null;
    configuredPageSize: number | null;
  };
  db: {
    totalProducts: number;
    activeProducts: number;
  };
  assessment: string;
  probeModeAvailable: boolean;
}

export async function fetchCatalogProbe(): Promise<CatalogProbeResponse> {
  const response = await fetchWithAuth("/admin/imports/catalog-probe");
  return response.data ?? response;
}
