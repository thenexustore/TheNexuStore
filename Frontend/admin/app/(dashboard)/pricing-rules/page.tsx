"use client";

import { useEffect, useState } from "react";
import { fetchBrands } from "@/lib/api/brands";
import { fetchCategories } from "@/lib/api/categories";
import {
  createPricingRule,
  fetchPricingRules,
  previewPricingRule,
  togglePricingRuleStatus,
  transitionPricingRuleStatus,
  updatePricingRule,
  type PricingRule,
  type PricingApprovalStatus,
} from "@/lib/api/pricing-rules";

export default function PricingRulesPage() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PricingRule | null>(null);

  const [form, setForm] = useState<any>({
    scope: "GLOBAL",
    margin_pct: 10,
    min_margin_amount: 0,
    rounding_mode: "NONE",
    priority: 10,
    is_active: true,
    category_id: null,
    brand_id: null,
    sku_code: "",
  });

  const [previewSku, setPreviewSku] = useState("");
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewErr, setPreviewErr] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const [r, b, c] = await Promise.all([fetchPricingRules(), fetchBrands(), fetchCategories()]);
      setRules(r);
      setBrands(b);
      setCategories(c);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function startCreate() {
    setEditing(null);
    setForm({
      scope: "GLOBAL",
      margin_pct: 10,
      min_margin_amount: 0,
      rounding_mode: "NONE",
      priority: 10,
      is_active: true,
      category_id: null,
      brand_id: null,
      sku_code: "",
    });
    setOpen(true);
  }

  function startEdit(r: PricingRule) {
    setEditing(r);
    setForm({
      scope: r.scope,
      margin_pct: r.margin_pct,
      min_margin_amount: r.min_margin_amount ?? 0,
      rounding_mode: r.rounding_mode ?? "NONE",
      priority: r.priority,
      is_active: r.is_active,
      category_id: r.category_id ?? null,
      brand_id: r.brand_id ?? null,
      sku_code: "",
    });
    setOpen(true);
  }

  async function save() {
    setErr(null);
    try {
      if (!form.scope) throw new Error("scope required");
      if (form.scope === "CATEGORY" && !form.category_id) throw new Error("category required");
      if (form.scope === "BRAND" && !form.brand_id) throw new Error("brand required");
      if (form.scope === "SKU" && !form.sku_code && !editing?.sku_id) throw new Error("sku_code required");

      if (editing) await updatePricingRule(editing.id, form);
      else await createPricingRule(form);

      setOpen(false);
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Save failed");
    }
  }

  async function toggle(r: PricingRule) {
    try {
      await togglePricingRuleStatus(r.id, !r.is_active);
      await refresh();
    } catch (e: any) {
      alert(e?.message ?? "Toggle failed");
    }
  }

  async function transition(r: PricingRule, status: PricingApprovalStatus) {
    try {
      await transitionPricingRuleStatus(r.id, status);
      await refresh();
    } catch (e: any) {
      alert(e?.message ?? "Status transition failed");
    }
  }

  async function doPreview() {
    setPreviewErr(null);
    setPreviewData(null);
    try {
      const data = await previewPricingRule(previewSku.trim());
      setPreviewData(data);
    } catch (e: any) {
      setPreviewErr(e?.message ?? "Preview failed");
    }
  }

  const statusBadge: Record<PricingApprovalStatus, string> = {
    DRAFT: "bg-slate-100 text-slate-700",
    PENDING: "bg-amber-100 text-amber-800",
    APPROVED: "bg-blue-100 text-blue-800",
    PUBLISHED: "bg-emerald-100 text-emerald-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pricing Rules</h1>
        <button className="px-4 py-2 rounded bg-black text-white" onClick={startCreate}>
          New Rule
        </button>
      </div>

      {loading && <div>Loading...</div>}
      {err && <div className="text-red-600">{err}</div>}

      <div className="border rounded p-4 space-y-3">
        <h2 className="font-semibold">Preview (by SKU code)</h2>
        <div className="flex gap-2">
          <input className="border rounded px-3 py-2 w-full" value={previewSku} onChange={(e) => setPreviewSku(e.target.value)} placeholder="SKU code" />
          <button className="px-4 py-2 rounded bg-gray-900 text-white" onClick={doPreview}>Preview</button>
        </div>
        {previewErr && <div className="text-red-600">{previewErr}</div>}
        {previewData && <pre className="bg-gray-50 border rounded p-3 overflow-auto text-sm">{JSON.stringify(previewData, null, 2)}</pre>}
      </div>

      <div className="border rounded overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[980px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Scope</th>
              <th className="text-left p-3">Target</th>
              <th className="text-left p-3">Margin %</th>
              <th className="text-left p-3">Min Margin</th>
              <th className="text-left p-3">Rounding</th>
              <th className="text-left p-3">Priority</th>
              <th className="text-left p-3">Active</th>
              <th className="text-left p-3">Workflow</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{r.scope}</td>
                <td className="p-3">
                  {r.scope === "CATEGORY" && <span>{r.category_id}</span>}
                  {r.scope === "BRAND" && <span>{r.brand_id}</span>}
                  {r.scope === "SKU" && <span>{r.sku_id}</span>}
                  {r.scope === "GLOBAL" && <span>—</span>}
                </td>
                <td className="p-3">{r.margin_pct}</td>
                <td className="p-3">{r.min_margin_amount ?? 0}</td>
                <td className="p-3">{r.rounding_mode}</td>
                <td className="p-3">{r.priority}</td>
                <td className="p-3">{String(r.is_active)}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-1 rounded ${statusBadge[r.approval_status || "DRAFT"]}`}>
                      {r.approval_status || "DRAFT"}
                    </span>
                    {r.approval_status === "DRAFT" && (
                      <button className="px-2 py-1 text-xs rounded border" onClick={() => transition(r, "PENDING")}>Submit</button>
                    )}
                    {r.approval_status === "PENDING" && (
                      <button className="px-2 py-1 text-xs rounded border" onClick={() => transition(r, "APPROVED")}>Approve</button>
                    )}
                    {r.approval_status === "APPROVED" && (
                      <button className="px-2 py-1 text-xs rounded border" onClick={() => transition(r, "PUBLISHED")}>Publish</button>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <button className="px-2 py-1 rounded border" onClick={() => startEdit(r)}>Edit</button>
                    <button className="px-2 py-1 rounded border" onClick={() => toggle(r)}>
                      {r.is_active ? "Disable" : "Enable"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rules.length && !loading && (
              <tr>
                <td className="p-4 text-gray-500" colSpan={9}>No rules</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-2xl rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{editing ? "Edit Rule" : "New Rule"}</h3>
              <button onClick={() => setOpen(false)} className="text-gray-500">✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1">
                <div className="text-xs text-gray-600">Scope</div>
                <select className="border rounded px-3 py-2 w-full" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
                  <option value="GLOBAL">GLOBAL</option>
                  <option value="CATEGORY">CATEGORY</option>
                  <option value="BRAND">BRAND</option>
                  <option value="SKU">SKU</option>
                </select>
              </label>

              <label className="space-y-1">
                <div className="text-xs text-gray-600">Priority</div>
                <input className="border rounded px-3 py-2 w-full" type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
              </label>

              {form.scope === "CATEGORY" && (
                <label className="space-y-1 col-span-2">
                  <div className="text-xs text-gray-600">Category</div>
                  <select className="border rounded px-3 py-2 w-full" value={form.category_id ?? ""} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
              )}

              {form.scope === "BRAND" && (
                <label className="space-y-1 col-span-2">
                  <div className="text-xs text-gray-600">Brand</div>
                  <select className="border rounded px-3 py-2 w-full" value={form.brand_id ?? ""} onChange={(e) => setForm({ ...form, brand_id: e.target.value })}>
                    <option value="">Select brand</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </label>
              )}

              {form.scope === "SKU" && (
                <label className="space-y-1 col-span-2">
                  <div className="text-xs text-gray-600">SKU code</div>
                  <input className="border rounded px-3 py-2 w-full" value={form.sku_code ?? ""} onChange={(e) => setForm({ ...form, sku_code: e.target.value })} />
                </label>
              )}

              <label className="space-y-1">
                <div className="text-xs text-gray-600">Margin %</div>
                <input className="border rounded px-3 py-2 w-full" type="number" value={form.margin_pct} onChange={(e) => setForm({ ...form, margin_pct: Number(e.target.value) })} />
              </label>

              <label className="space-y-1">
                <div className="text-xs text-gray-600">Min margin amount</div>
                <div className="relative">
                  <input className="border rounded px-3 py-2 pr-8 w-full" type="number" value={form.min_margin_amount} onChange={(e) => setForm({ ...form, min_margin_amount: Number(e.target.value) })} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">€</span>
                </div>
              </label>

              <label className="space-y-1">
                <div className="text-xs text-gray-600">Rounding</div>
                <select className="border rounded px-3 py-2 w-full" value={form.rounding_mode} onChange={(e) => setForm({ ...form, rounding_mode: e.target.value })}>
                  <option value="NONE">NONE</option>
                  <option value="X_99">X_99</option>
                  <option value="X_95">X_95</option>
                </select>
              </label>

              <label className="space-y-1">
                <div className="text-xs text-gray-600">Active</div>
                <select className="border rounded px-3 py-2 w-full" value={String(form.is_active)} onChange={(e) => setForm({ ...form, is_active: e.target.value === "true" })}>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              </label>
            </div>

            {err && <div className="text-red-600">{err}</div>}

            <div className="flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="px-4 py-2 rounded border">Cancel</button>
              <button onClick={save} className="px-4 py-2 rounded bg-black text-white">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
