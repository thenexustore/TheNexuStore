"use client";

import { useState } from "react";
import { Search, Filter, CheckCircle, XCircle, Clock, Eye } from "lucide-react";

const returns = [
  {
    id: "RMA-1001",
    orderId: "ORD-1001",
    customer: "John Doe",
    date: "2024-01-15",
    status: "Approved",
    items: 1,
    type: "Refund",
  },
  {
    id: "RMA-1002",
    orderId: "ORD-1002",
    customer: "Jane Smith",
    date: "2024-01-14",
    status: "Pending",
    items: 2,
    type: "Replace",
  },
  {
    id: "RMA-1003",
    orderId: "ORD-1003",
    customer: "Bob Johnson",
    date: "2024-01-13",
    status: "Rejected",
    items: 1,
    type: "Refund",
  },
  {
    id: "RMA-1004",
    orderId: "ORD-1004",
    customer: "Alice Brown",
    date: "2024-01-12",
    status: "Received",
    items: 1,
    type: "Replace",
  },
  {
    id: "RMA-1005",
    orderId: "ORD-1005",
    customer: "Charlie Wilson",
    date: "2024-01-11",
    status: "Refunded",
    items: 1,
    type: "Refund",
  },
];

const statusColors = {
  Pending: "bg-yellow-100 text-yellow-800",
  Approved: "bg-blue-100 text-blue-800",
  Rejected: "bg-red-100 text-red-800",
  Received: "bg-purple-100 text-purple-800",
  Refunded: "bg-green-100 text-green-800",
};

const statusIcons = {
  Pending: Clock,
  Approved: CheckCircle,
  Rejected: XCircle,
  Received: Clock,
  Refunded: CheckCircle,
};

export default function ReturnsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredReturns = returns.filter((r) => {
    const matchesSearch =
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.customer.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>

      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by RMA ID or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <Filter className="w-5 h-5 text-gray-400 mr-2" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Received">Received</option>
                <option value="Refunded">Refunded</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  RMA ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
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
              {filteredReturns.map((rma) => {
                const StatusIcon =
                  statusIcons[rma.status as keyof typeof statusIcons];
                return (
                  <tr key={rma.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-medium text-blue-600">
                        {rma.id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-700">{rma.orderId}</span>
                    </td>
                    <td className="px-6 py-4">{rma.customer}</td>
                    <td className="px-6 py-4 text-gray-500">{rma.date}</td>
                    <td className="px-6 py-4">
                      {rma.items} item{rma.items > 1 ? "s" : ""}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          rma.type === "Refund"
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {rma.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          statusColors[rma.status as keyof typeof statusColors]
                        }`}
                      >
                        <StatusIcon className="w-4 h-4 mr-1" />
                        {rma.status}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <button className="flex items-center text-blue-600 hover:text-blue-800 text-sm">
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </button>
                        {rma.status === "Pending" && (
                          <>
                            <button className="text-green-600 hover:text-green-800 text-sm">
                              Approve
                            </button>
                            <button className="text-red-600 hover:text-red-800 text-sm">
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
