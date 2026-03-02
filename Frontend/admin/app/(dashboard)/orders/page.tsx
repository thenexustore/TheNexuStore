// app/(dashboard)/orders/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Search, Filter, Download, Eye, CheckCircle, XCircle, Clock } from "lucide-react";
import { fetchOrders, type Order, type OrdersResponse } from "@/lib/api";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  PENDING_PAYMENT: "bg-blue-100 text-blue-800",
  PROCESSING: "bg-yellow-100 text-yellow-800",
  PAID: "bg-green-100 text-green-800",
  SHIPPED: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-800",
  REFUNDED: "bg-zinc-100 text-zinc-800",
  FAILED: "bg-red-100 text-red-800",
};

const statusIcons: Record<string, any> = {
  PENDING_PAYMENT: Clock,
  PROCESSING: Clock,
  PAID: CheckCircle,
  SHIPPED: CheckCircle,
  DELIVERED: CheckCircle,
  CANCELLED: XCircle,
  REFUNDED: XCircle,
  FAILED: XCircle,
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(
    amount,
  );

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadOrders = async (pageToLoad = 1) => {
    try {
      setLoading(true);
      const data: OrdersResponse = await fetchOrders(
        pageToLoad,
        10,
        statusFilter,
        search,
      );
      setOrders(data.orders);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      toast.error(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrders(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    loadOrders(newPage);
  };

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order number or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black/20 outline-none"
            />
          </form>

          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <Filter className="w-5 h-5 text-gray-400 mr-2" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black/5 focus:border-black/20 outline-none"
              >
                <option value="all">All Status</option>
                <option value="PENDING_PAYMENT">Pending payment</option>
                <option value="PROCESSING">Processing</option>
                <option value="PAID">Paid</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REFUNDED">Refunded</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => loadOrders(page)}
              className="flex items-center px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="py-16 flex items-center justify-center text-sm text-gray-500">
            Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 flex items-center justify-center text-sm text-gray-500">
            No orders found.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order) => {
                    const statusKey = order.status;
                    const StatusIcon =
                      statusIcons[statusKey] || Clock;
                    const statusClass =
                      statusColors[statusKey] ||
                      "bg-zinc-100 text-zinc-700";

                    return (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-blue-600">
                              {order.orderNumber}
                            </span>
                            <span className="text-xs text-gray-500">
                              #{order.id.slice(0, 8)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {order.customerName || "Guest"}
                            </span>
                            <span className="text-xs text-gray-500">
                              {order.customer}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-sm">
                          {new Date(order.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 font-medium">
                          {formatCurrency(Number(order.amount))}
                        </td>
                        <td className="px-6 py-4">
                          <div
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusClass}`}
                          >
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {order.status.replace("_", " ")}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button className="flex items-center text-blue-600 hover:text-blue-800 text-sm">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t flex items-center justify-between text-sm">
              <div className="text-gray-500">
                Page {page} of {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                  disabled={page <= 1}
                  onClick={() => handlePageChange(page - 1)}
                >
                  Previous
                </button>
                <button
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                  disabled={page >= totalPages}
                  onClick={() => handlePageChange(page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}