import { fetchWithAuth } from "../utils";

export interface Order {
  id: string;
  orderNumber: string;
  customer: string;
  customerName: string;
  status: string;
  amount: number;
  createdAt: string;
  paymentStatus?: string | null;
  paymentProvider?: string | null;
  redsysResponseCode?: string | null;
  redsysAuthorizationCode?: string | null;
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

export interface OrderShipment {
  id: string;
  carrier: string;
  service_level?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  status: string;
  shipped_at?: string | null;
  delivered_at?: string | null;
  created_at?: string;
  updated_at?: string;
  tracking_events?: Array<{
    id: string;
    event_time: string;
    status: string;
    location?: string | null;
    details?: string | null;
  }>;
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
  payments: Array<{
    id: string;
    provider: string;
    status: string;
    amount: number;
    currency: string;
    provider_payment_id?: string | null;
    raw_response?: unknown;
    redsys_response_code?: string | null;
    redsys_authorization_code?: string | null;
    redsys_payment_method?: string | null;
  }>;
  shipments?: OrderShipment[];
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

export async function createOrderShipment(
  orderId: string,
  payload: {
    carrier: string;
    service_level?: string;
    tracking_number?: string;
    tracking_url?: string;
    status?: string;
  }
): Promise<OrderShipment> {
  return fetchWithAuth(`/admin/orders/${orderId}/shipments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateOrderShipment(
  orderId: string,
  shipmentId: string,
  payload: {
    carrier?: string;
    service_level?: string;
    tracking_number?: string;
    tracking_url?: string;
    status?: string;
  }
): Promise<OrderShipment> {
  return fetchWithAuth(`/admin/orders/${orderId}/shipments/${shipmentId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
