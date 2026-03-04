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
