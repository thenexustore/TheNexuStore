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

export interface ImportIntegrationConfig {
  provider: string;
  display_name: string;
  base_url: string;
  is_active: boolean;
  notes: string | null;
  last_healthcheck_at: string | null;
  api_key_last4: string | null;
  api_key_masked: string | null;
  api_key?: string;
  source: "database" | "env_fallback" | "default_fallback";
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

export async function fetchImportConfig(includeSecret = false) {
  const params = new URLSearchParams();
  if (includeSecret) {
    params.set("includeSecret", "true");
  }

  return fetchWithAuth<ImportIntegrationConfig>(
    `/admin/imports/config${params.toString() ? `?${params.toString()}` : ""}`,
  );
}

export async function updateImportConfig(input: {
  display_name: string;
  base_url: string;
  api_key?: string;
  is_active: boolean;
  notes?: string;
}) {
  return fetchWithAuth<ImportIntegrationConfig>("/admin/imports/config", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function testImportConnection() {
  return fetchWithAuth<{ ok: boolean; checked_at: string }>(
    "/admin/imports/config/test-connection",
    {
      method: "POST",
    },
  );
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
