"use client";

import { useEffect, useState } from "react";
import { fetchDashboardStats, type DashboardStats, type DashboardAlert } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  ShoppingCart,
  Euro,
  Package,
  Users,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { loadAdminSettings, subscribeAdminSettings } from "@/lib/admin-settings";

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-zinc-100 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <div className="h-3 w-28 bg-zinc-100 rounded-full" />
          <div className="h-8 w-20 bg-zinc-200 rounded-lg" />
          <div className="h-3 w-16 bg-zinc-100 rounded-full" />
        </div>
        <div className="w-11 h-11 bg-zinc-100 rounded-xl" />
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between px-4 py-3 animate-pulse">
      <div className="space-y-1.5">
        <div className="h-3.5 w-24 bg-zinc-100 rounded-full" />
        <div className="h-3 w-32 bg-zinc-100 rounded-full" />
      </div>
      <div className="text-right space-y-1.5">
        <div className="h-3.5 w-16 bg-zinc-100 rounded-full ml-auto" />
        <div className="h-5 w-20 bg-zinc-100 rounded-full ml-auto" />
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ORDER_STATUS_STYLE: Record<string, string> = {
  PENDING_PAYMENT: "bg-blue-50 text-blue-700",
  PROCESSING: "bg-amber-50 text-amber-700",
  PAID: "bg-green-50 text-green-700",
  SHIPPED: "bg-purple-50 text-purple-700",
  DELIVERED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-red-50 text-red-700",
  REFUNDED: "bg-zinc-100 text-zinc-600",
  FAILED: "bg-rose-50 text-rose-700",
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Pago pendiente",
  PROCESSING: "En proceso",
  PAID: "Pagado",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
  REFUNDED: "Devuelto",
  FAILED: "Fallido",
};

const SEVERITY_STYLES = {
  error: "border-l-red-400 bg-red-50 text-red-800",
  warning: "border-l-amber-400 bg-amber-50 text-amber-800",
  info: "border-l-blue-400 bg-blue-50 text-blue-800",
} as const;

function getGreeting(locale: string): string {
  const hour = new Date().getHours();
  if (locale === "es") {
    if (hour < 12) return "¡Buenos días";
    if (hour < 20) return "¡Buenas tardes";
    return "¡Buenas noches";
  }
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

type RecentOrder = DashboardStats["recentOrders"][number];

export default function DashboardPage() {
  const locale = useLocale();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminSettings] = useState(() => loadAdminSettings());

  const staffName = (() => {
    try {
      const raw = localStorage.getItem("admin_user");
      if (!raw) return "";
      const u = JSON.parse(raw) as { name?: string; email?: string };
      return u.name || u.email?.split("@")[0] || "";
    } catch { return ""; }
  })();

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat(adminSettings.dateFormat, {
      style: "currency",
      currency: adminSettings.defaultCurrency,
    }).format(v);

  const loadStats = async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      else setRefreshing(true);
      const data = await fetchDashboardStats();
      setStats(data);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error al cargar el dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadStats(); }, []);

  const statCards = stats
    ? [
        {
          title: locale === "es" ? "Pedidos hoy" : "Today's orders",
          value: stats.todayOrders,
          formatted: String(stats.todayOrders),
          icon: ShoppingCart,
          accent: "text-blue-600",
          bg: "bg-blue-50",
        },
        {
          title: locale === "es" ? "Ingresos hoy" : "Today's revenue",
          value: stats.todayRevenue,
          formatted: formatCurrency(stats.todayRevenue),
          icon: Euro,
          accent: "text-emerald-600",
          bg: "bg-emerald-50",
        },
        {
          title: locale === "es" ? "Total productos" : "Total products",
          value: stats.totalProducts,
          formatted: stats.totalProducts.toLocaleString(),
          icon: Package,
          accent: "text-violet-600",
          bg: "bg-violet-50",
        },
        {
          title: locale === "es" ? "Clientes" : "Customers",
          value: stats.totalCustomers,
          formatted: stats.totalCustomers.toLocaleString(),
          icon: Users,
          accent: "text-orange-600",
          bg: "bg-orange-50",
        },
        {
          title: locale === "es" ? "Pedidos pendientes" : "Pending orders",
          value: stats.pendingOrders,
          formatted: String(stats.pendingOrders),
          icon: AlertCircle,
          accent: "text-amber-600",
          bg: "bg-amber-50",
        },
        {
          title: locale === "es" ? "Productos activos" : "Active products",
          value: stats.activeProducts,
          formatted: String(stats.activeProducts),
          icon: TrendingUp,
          accent: "text-indigo-600",
          bg: "bg-indigo-50",
        },
      ]
    : [];

  const greeting = getGreeting(locale);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            {loading
              ? locale === "es" ? "Dashboard" : "Dashboard"
              : `${greeting}${staffName ? `, ${staffName}` : ""}${locale === "es" ? "!" : "!"}`}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            {new Date().toLocaleDateString(adminSettings.dateFormat, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <button
          onClick={() => loadStats(true)}
          disabled={loading || refreshing}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition disabled:opacity-40 px-3 py-2 rounded-xl hover:bg-white border border-transparent hover:border-zinc-200"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {locale === "es" ? "Actualizar" : "Refresh"}
        </button>
      </div>

      {/* Alerts */}
      {!!stats?.alerts?.length && (
        <div className="space-y-2">
          {stats.alerts.map((alert: DashboardAlert) => (
            <div
              key={alert.id}
              className={`border-l-4 rounded-xl px-4 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${SEVERITY_STYLES[alert.severity]}`}
            >
              <div>
                <p className="font-semibold text-sm">{alert.title}</p>
                <p className="text-xs opacity-80 mt-0.5">{alert.description}</p>
              </div>
              <Link
                href={alert.ctaHref}
                className="inline-flex items-center gap-1.5 text-xs font-semibold hover:opacity-70 shrink-0"
              >
                {alert.ctaLabel}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : statCards.map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className="bg-white rounded-2xl p-5 border border-zinc-100 hover:border-zinc-200 hover:shadow-sm transition group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold text-zinc-900 tabular-nums leading-none">
                      {stat.formatted}
                    </p>
                  </div>
                  <div className={`${stat.bg} ${stat.accent} p-2.5 rounded-xl shrink-0 group-hover:scale-105 transition-transform`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                </div>
              </motion.div>
            ))}
      </div>

      {/* Recent orders */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl border border-zinc-100"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-50">
          <h2 className="font-semibold text-zinc-900 text-sm">
            {locale === "es" ? "Pedidos recientes" : "Recent orders"}
          </h2>
          <Link
            href="/orders"
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition font-medium"
          >
            {locale === "es" ? "Ver todos" : "View all"}
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="divide-y divide-zinc-50">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : !stats?.recentOrders?.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
            <ShoppingCart className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">{locale === "es" ? "Sin pedidos recientes" : "No recent orders"}</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {stats.recentOrders.map((order: RecentOrder) => {
              const statusCls = ORDER_STATUS_STYLE[order.status] ?? "bg-zinc-100 text-zinc-600";
              const statusLabel = ORDER_STATUS_LABEL[order.status] ?? order.status;
              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50/60 transition"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 leading-tight">
                      {order.orderNumber}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5 truncate">{order.customer}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-bold text-zinc-900 tabular-nums">
                      {formatCurrency(order.amount)}
                    </p>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCls}`}>
                        {statusLabel}
                      </span>
                      <span className="text-xs text-zinc-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(order.date).toLocaleDateString(adminSettings.dateFormat)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
