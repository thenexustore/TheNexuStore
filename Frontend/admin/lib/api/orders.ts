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