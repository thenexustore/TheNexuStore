import { fetchWithAuth } from "../utils";

export interface DashboardAlert {
  id: string;
  severity: "error" | "warning" | "info";
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface DashboardStats {
  todayOrders: number;
  todayRevenue: number;
  totalProducts: number;
  totalCustomers: number;
  pendingOrders: number;
  activeProducts: number;
  alerts: DashboardAlert[];
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
