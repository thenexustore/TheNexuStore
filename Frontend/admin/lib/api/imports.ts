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
  return fetchWithAuth(`/admin/imports/history?page=${page}&limit=${limit}`);
}

export async function triggerImport(mode: "full" | "stock" | "images") {
  return fetchWithAuth("/admin/imports/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mode }),
  });
}
