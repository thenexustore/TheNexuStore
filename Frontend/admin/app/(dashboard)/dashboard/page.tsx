"use client";

import { useEffect, useState } from "react";
import { fetchDashboardStats } from "@/lib/api";
import {
  ShoppingCart,
  DollarSign,
  Package,
  Users,
  AlertCircle,
  TrendingUp,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface DashboardStats {
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

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await fetchDashboardStats();
      setStats(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Today's Orders",
      value: stats?.todayOrders || 0,
      icon: ShoppingCart,
      color: "bg-blue-500",
      change: "+12%",
    },
    {
      title: "Today's Revenue",
      value: `₹${stats?.todayRevenue?.toLocaleString() || 0}`,
      icon: DollarSign,
      color: "bg-green-500",
      change: "+8%",
    },
    {
      title: "Total Products",
      value: stats?.totalProducts || 0,
      icon: Package,
      color: "bg-purple-500",
      change: "+5%",
    },
    {
      title: "Total Customers",
      value: stats?.totalCustomers || 0,
      icon: Users,
      color: "bg-orange-500",
      change: "+15%",
    },
    {
      title: "Pending Orders",
      value: stats?.pendingOrders || 0,
      icon: AlertCircle,
      color: "bg-yellow-500",
      change: "-3%",
    },
    {
      title: "Active Products",
      value: stats?.activeProducts || 0,
      icon: TrendingUp,
      color: "bg-indigo-500",
      change: "+7%",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-2">
          Welcome to your store management dashboard
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                  {stat.title}
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {stat.value}
                </p>
                <p className="text-sm text-green-600 mt-1 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  {stat.change} from yesterday
                </p>
              </div>
              <div className={`${stat.color} p-3 rounded-xl`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Orders</h3>
        <div className="space-y-4">
          {stats?.recentOrders?.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
            >
              <div>
                <p className="font-semibold text-slate-900">
                  {order.orderNumber}
                </p>
                <p className="text-sm text-slate-500">{order.customer}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900">₹{order.amount}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-500">
                    {new Date(order.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
