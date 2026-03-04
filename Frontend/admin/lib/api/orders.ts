import { fetchWithAuth } from "../utils";

export interface Order {
  id: string;
  orderNumber: string;
  customer: string;
  customerName: string;
  status: string;
  amount: number;
  createdAt: string;
}

export interface OrderTimelineEntry {
  id: string;
  action: string;
  actorEmail?: string;
  actorRole?: string;
  status: string;
  metadata?: any;
  createdAt: string;
}

export interface OrderDetail {
  id: string;
  order_number: string;
  status: string;
  email: string;
  created_at: string;
  total_amount: number;
  customer?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  } | null;
  items: Array<{
    id: string;
    qty: number;
    unit_price_snapshot?: number | null;
    sku?: {
      sku_code: string;
      product?: {
        title: string;
      };
    };
  }>;
}

export interface OrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  totalPages: number;
}

export async function fetchOrders(
  page: number = 1,
  limit: number = 10,
  status?: string,
  search?: string
): Promise<OrdersResponse> {
  const params: Record<string, string> = {
    page: page.toString(),
    limit: limit.toString(),
  };

  if (status && status !== "all") params.status = status;
  if (search) params.search = search;

  const queryString = `?${new URLSearchParams(params).toString()}`;
  return fetchWithAuth(`/admin/orders${queryString}`);
}

export async function fetchOrderById(orderId: string): Promise<OrderDetail> {
  return fetchWithAuth(`/admin/orders/${orderId}`);
}

export async function fetchOrderTimeline(orderId: string): Promise<OrderTimelineEntry[]> {
  return fetchWithAuth(`/admin/orders/${orderId}/timeline`);
}

export async function addOrderNote(orderId: string, note: string): Promise<{ success: boolean }> {
  return fetchWithAuth(`/admin/orders/${orderId}/notes`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}
