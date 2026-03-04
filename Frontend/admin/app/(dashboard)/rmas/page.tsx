"use client";

import { useEffect, useState } from "react";
import { fetchRmaById, fetchRmas, updateRmaStatus, type Rma, type RmaStatus } from "@/lib/api";
import { toast } from "sonner";

const statuses: RmaStatus[] = ["REQUESTED", "APPROVED", "REJECTED", "RECEIVED", "REFUNDED", "CLOSED"];

export default function RmasPage() {
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(false);
  const [rmas, setRmas] = useState<Rma[]>([]);
  const [selected, setSelected] = useState<Rma | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchRmas(status);
      setRmas(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load RMAs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status]);

  const openDetail = async (id: string) => {
    try {
      const data = await fetchRmaById(id);
      setSelected(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load RMA detail");
    }
  };

  const changeStatus = async (id: string, next: RmaStatus) => {
    try {
      await updateRmaStatus(id, next);
      toast.success("RMA status updated");
      await load();
      if (selected?.id === id) {
        const detail = await fetchRmaById(id);
        setSelected(detail);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update RMA status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Returns (RMA)</h1>
          <p className="text-slate-500 text-sm mt-1">Manage requested, approved, received and refunded returns.</p>
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-slate-500">Loading RMAs...</div>
        ) : rmas.length === 0 ? (
          <div className="p-8 text-sm text-slate-500">No RMAs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left">RMA</th>
                  <th className="px-4 py-3 text-left">Order</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Reason</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rmas.map((rma) => (
                  <tr key={rma.id} className="border-t">
                    <td className="px-4 py-3 font-medium text-blue-700">{rma.rma_number}</td>
                    <td className="px-4 py-3">{rma.order?.order_number || "-"}</td>
                    <td className="px-4 py-3">{rma.customer?.email || rma.order?.email || "-"}</td>
                    <td className="px-4 py-3">{rma.reason_code}</td>
                    <td className="px-4 py-3">
                      <select
                        value={rma.status}
                        onChange={(e) => changeStatus(rma.id, e.target.value as RmaStatus)}
                        className="text-xs px-2 py-1 border rounded"
                      >
                        {statuses.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-blue-600 hover:text-blue-800" onClick={() => openDetail(rma.id)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border shadow-lg w-full max-w-3xl max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">RMA detail: {selected.rma_number}</h2>
              <button onClick={() => setSelected(null)} className="text-slate-500">✕</button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <p><span className="font-medium">Status:</span> {selected.status}</p>
              <p><span className="font-medium">Reason:</span> {selected.reason_code}</p>
              <p><span className="font-medium">Notes:</span> {selected.notes || "-"}</p>
              <p><span className="font-medium">Order:</span> {selected.order?.order_number}</p>

              <div>
                <h3 className="font-semibold mb-2">Items</h3>
                <div className="space-y-2">
                  {selected.items?.map((item) => (
                    <div key={item.id} className="border rounded p-2 bg-slate-50">
                      <p>{item.order_item?.sku?.product?.title || "Product"}</p>
                      <p className="text-xs text-slate-500">SKU: {item.order_item?.sku?.sku_code || "-"}</p>
                      <p className="text-xs text-slate-500">Qty: {item.qty}</p>
                      <p className="text-xs text-slate-500">Resolution: {item.resolution}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
