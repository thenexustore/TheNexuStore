"use client";

import { useEffect, useState } from "react";
import { Plus, Percent, Ticket, Loader2 } from "lucide-react";
import { fetchCoupons, createCoupon, type Coupon } from "@/lib/api";
import { toast } from "sonner";

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    code: "",
    type: "PERCENT" as "PERCENT" | "FIXED",
    value: "",
    min_order_amount: "",
    usage_limit: "",
  });

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const data = await fetchCoupons();
      setCoupons(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.value) {
      toast.error("Code and value are required");
      return;
    }

    try {
      setCreating(true);
      await createCoupon({
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        min_order_amount: form.min_order_amount
          ? Number(form.min_order_amount)
          : undefined,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : undefined,
      });
      toast.success("Coupon created");
      setForm({
        code: "",
        type: "PERCENT",
        value: "",
        min_order_amount: "",
        usage_limit: "",
      });
      await loadCoupons();
    } catch (err: any) {
      toast.error(err.message || "Failed to create coupon");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Coupons</h1>
          <p className="text-sm text-zinc-500">
            Manage discount codes available in the storefront.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <form
            onSubmit={handleCreate}
            className="bg-white rounded-xl border shadow-sm p-6 space-y-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Ticket className="w-5 h-5 text-zinc-500" />
              <h2 className="text-base font-semibold">Create Coupon</h2>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-600">
                Code *
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value }))
                }
                placeholder="SUMMER10"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600">
                  Type *
                </label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      type: e.target.value as "PERCENT" | "FIXED",
                    }))
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                >
                  <option value="PERCENT">Percent (%)</option>
                  <option value="FIXED">Fixed (EUR)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600">
                  Value *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.value}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, value: e.target.value }))
                    }
                    className="w-full border rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                    {form.type === "PERCENT" ? "%" : "€"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600">
                  Min order (€)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.min_order_amount}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      min_order_amount: e.target.value,
                    }))
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600">
                  Usage limit
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={form.usage_limit}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, usage_limit: e.target.value }))
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-black text-white text-sm font-medium py-2.5 hover:bg-zinc-900 disabled:opacity-60"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Coupon
                </>
              )}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Percent className="w-5 h-5 text-zinc-500" />
              <h2 className="text-base font-semibold">Existing Coupons</h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
              </div>
            ) : coupons.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No coupons yet. Create your first coupon using the form on the
                left.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-zinc-50">
                      <th className="px-3 py-2 text-left font-medium text-zinc-500">
                        Code
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-zinc-500">
                        Type
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-zinc-500">
                        Value
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-zinc-500">
                        Min Order
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-zinc-500">
                        Usage
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-zinc-500">
                        Active
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map((c) => (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="px-3 py-2 font-semibold">
                          {c.code}
                        </td>
                        <td className="px-3 py-2">
                          {c.type === "PERCENT" ? "Percent" : "Fixed"}
                        </td>
                        <td className="px-3 py-2">
                          {c.type === "PERCENT"
                            ? `${c.value}%`
                            : `${c.value.toFixed(2)} €`}
                        </td>
                        <td className="px-3 py-2">
                          {c.min_order_amount
                            ? `${c.min_order_amount.toFixed(2)} €`
                            : "—"}
                        </td>
                        <td className="px-3 py-2">
                          {c.usage_limit
                            ? `${c.usage_count}/${c.usage_limit}`
                            : c.usage_count}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              c.is_active
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-zinc-100 text-zinc-500"
                            }`}
                          >
                            {c.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

