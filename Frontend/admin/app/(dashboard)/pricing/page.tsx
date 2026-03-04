"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchBrands } from "@/lib/api/brands";
import { fetchCategories } from "@/lib/api/categories";
import {
  createPricingRule,
  deletePricingRule,
  fetchPricingRules,
  getRecalculateJob,
  previewPricing,
  recalculatePricing,
  updatePricingRule,
  type PricingRule,
} from "@/lib/api/pricing";

const ROUNDING = ["NONE", "X_99", "X_95", "NEAREST_0_05", "CEIL_1"] as const;

export default function PricingPage() {
  const [tab, setTab] = useState<"rules" | "preview" | "bulk">("rules");
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<PricingRule | null>(null);
  const [form, setForm] = useState<any>({
    scope: "GLOBAL",
    margin_pct: 10,
    discount_pct: 0,
    rounding_mode: "X_99",
    priority: 0,
    min_margin_pct: null,
    min_margin_amount: null,
    is_active: true,
    category_id: null,
    brand_id: null,
    sku_code: "",
    starts_at: null,
    ends_at: null,
  });

  const [skuCode, setSkuCode] = useState("");
  const [preview, setPreview] = useState<any>(null);

  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<any>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [r, b, c] = await Promise.all([fetchPricingRules(), fetchBrands(), fetchCategories()]);
      setRules(r);
      setBrands(b);
      setCategories(c);
    } catch (e: any) {
      setError(e.message || "Failed to load pricing");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!jobId) return;
    const iv = setInterval(async () => {
      const next = await getRecalculateJob(jobId);
      setJob(next);
      if (["SUCCEEDED", "DONE_WITH_ERRORS", "FAILED"].includes(next.status)) {
        clearInterval(iv);
      }
    }, 1500);
    return () => clearInterval(iv);
  }, [jobId]);

  const targetLabel = useMemo(
    () => ({
      CATEGORY: (id: string) => categories.find((c) => c.id === id)?.name || id,
      BRAND: (id: string) => brands.find((b) => b.id === id)?.name || id,
    }),
    [brands, categories],
  );

  async function saveRule() {
    const payload = { ...form };
    if (editing) await updatePricingRule(editing.id, payload);
    else await createPricingRule(payload);
    setEditing(null);
    await load();
  }

  async function runPreview() {
    setPreview(await previewPricing({ skuCode }));
  }

  async function runRecalc() {
    const data = await recalculatePricing({ scope: "all" });
    setJobId(data.jobId);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Pricing</h1>
      <div className="flex gap-2">
        {(["rules", "preview", "bulk"] as const).map((t) => (
          <button key={t} className={`px-3 py-2 rounded ${tab === t ? "bg-black text-white" : "bg-white border"}`} onClick={() => setTab(t)}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-600">{error}</div>}

      {tab === "rules" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-white border rounded p-4">
            <select className="border rounded p-2" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
              <option>GLOBAL</option><option>CATEGORY</option><option>BRAND</option><option>SKU</option>
            </select>
            <input className="border rounded p-2" type="number" placeholder="Margin %" value={form.margin_pct} onChange={(e) => setForm({ ...form, margin_pct: Number(e.target.value) })} />
            <input className="border rounded p-2" type="number" placeholder="Discount %" value={form.discount_pct} onChange={(e) => setForm({ ...form, discount_pct: Number(e.target.value) })} />
            <select className="border rounded p-2" value={form.rounding_mode} onChange={(e) => setForm({ ...form, rounding_mode: e.target.value })}>
              {ROUNDING.map((r) => <option key={r}>{r}</option>)}
            </select>
            {form.scope === "CATEGORY" && (
              <select className="border rounded p-2" value={form.category_id || ""} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Category...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            {form.scope === "BRAND" && (
              <select className="border rounded p-2" value={form.brand_id || ""} onChange={(e) => setForm({ ...form, brand_id: e.target.value })}>
                <option value="">Brand...</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
            {form.scope === "SKU" && (
              <input className="border rounded p-2" placeholder="SKU code" value={form.sku_code || ""} onChange={(e) => setForm({ ...form, sku_code: e.target.value })} />
            )}
            <input className="border rounded p-2" type="number" placeholder="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
            <input className="border rounded p-2" type="number" placeholder="Min margin %" value={form.min_margin_pct ?? ""} onChange={(e) => setForm({ ...form, min_margin_pct: e.target.value ? Number(e.target.value) : null })} />
            <input className="border rounded p-2" type="number" placeholder="Min margin amount" value={form.min_margin_amount ?? ""} onChange={(e) => setForm({ ...form, min_margin_amount: e.target.value ? Number(e.target.value) : null })} />
            <button className="bg-black text-white rounded p-2" onClick={saveRule}>{editing ? "Update" : "Create"} rule</button>
          </div>

          <div className="bg-white border rounded overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]"><thead><tr className="bg-gray-50"><th className="p-2 text-left">Scope</th><th className="p-2 text-left">Target</th><th className="p-2 text-left">Margin%</th><th className="p-2 text-left">Discount%</th><th className="p-2 text-left">Rounding</th><th className="p-2 text-left">Priority</th><th className="p-2 text-left">Schedule</th><th className="p-2 text-left">Actions</th></tr></thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{r.scope}</td>
                    <td className="p-2">{r.scope === "CATEGORY" ? targetLabel.CATEGORY(r.category_id || "") : r.scope === "BRAND" ? targetLabel.BRAND(r.brand_id || "") : r.scope === "SKU" ? r.sku_id : "—"}</td>
                    <td className="p-2">{r.margin_pct}</td><td className="p-2">{r.discount_pct}</td><td className="p-2">{r.rounding_mode}</td><td className="p-2">{r.priority}</td>
                    <td className="p-2 text-xs">{r.starts_at || "-"} / {r.ends_at || "-"}</td>
                    <td className="p-2 space-x-2"><button className="border rounded px-2 py-1" onClick={() => { setEditing(r); setForm({ ...r }); }}>Edit</button><button className="border rounded px-2 py-1 text-red-600" onClick={async () => { await deletePricingRule(r.id); await load(); }}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "preview" && (
        <div className="space-y-3 bg-white border rounded p-4">
          <div className="flex gap-2">
            <input className="border rounded p-2 flex-1" placeholder="SKU code" value={skuCode} onChange={(e) => setSkuCode(e.target.value)} />
            <button className="bg-black text-white rounded px-4" onClick={runPreview}>Preview</button>
          </div>
          {preview && <pre className="bg-gray-50 border rounded p-3 text-sm overflow-auto">{JSON.stringify(preview, null, 2)}</pre>}
        </div>
      )}

      {tab === "bulk" && (
        <div className="space-y-3 bg-white border rounded p-4">
          <button className="bg-black text-white px-4 py-2 rounded" onClick={runRecalc}>Recalculate now</button>
          {job && (
            <div className="text-sm space-y-1">
              <div>Status: {job.status}</div>
              <div>Processed: {job.processed} / {job.total}</div>
              <div>Updated: {job.updated_count} | Warnings: {job.warning_count} | Failed: {job.failed_count}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
