import { fetchWithAuth } from "../utils";

export type RmaStatus =
  | "REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "RECEIVED"
  | "REFUNDED"
  | "CLOSED";

export interface RmaItem {
  id: string;
  qty: number;
  resolution: string;
  order_item: {
    sku?: {
      sku_code: string;
      product?: {
        title: string;
      };
    };
  };
}

export interface Rma {
  id: string;
  rma_number: string;
  status: RmaStatus;
  reason_code: string;
  notes?: string | null;
  created_at: string;
  order: {
    id: string;
    order_number: string;
    email: string;
  };
  customer?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  } | null;
  items: RmaItem[];
}

export async function fetchRmas(status = "all"): Promise<Rma[]> {
  const query = status && status !== "all" ? `?status=${status}` : "";
  return fetchWithAuth(`/admin/rmas${query}`);
}

export async function fetchRmaById(id: string): Promise<Rma> {
  return fetchWithAuth(`/admin/rmas/${id}`);
}

export async function updateRmaStatus(id: string, status: RmaStatus): Promise<Rma> {
  return fetchWithAuth(`/admin/rmas/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
