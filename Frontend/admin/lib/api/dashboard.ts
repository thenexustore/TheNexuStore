import { fetchWithAuth } from "../utils";

export interface DashboardStats {
  todayOrders: number;
  todayRevenue: number;
  totalProducts: number;
  totalCustomers: number;
  pendingOrders: number;
  activeProducts: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customer: string;
    amount: number;
    status: string;
    date: string;
  }>;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return fetchWithAuth("/admin/dashboard/stats");
}