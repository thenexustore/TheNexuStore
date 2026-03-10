"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
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

type TabKey = "rules" | "preview" | "bulk";
type Scope = "GLOBAL" | "CATEGORY" | "BRAND" | "SKU";

const ROUNDING = ["NONE", "X_99", "X_95", "NEAREST_0_05", "CEIL_1"] as const;

const ROUNDING_LABELS: Record<(typeof ROUNDING)[number], string> = {
  NONE: "Sin redondeo",
  X_99: "Terminar en .99",
  X_95: "Terminar en .95",
  NEAREST_0_05: "Al 0,05 más cercano",
  CEIL_1: "Redondear al € superior",
};

const emptyForm = {
  scope: "GLOBAL" as Scope,
  margin_pct: 10,
  discount_pct: 0,
  rounding_mode: "X_99",
  priority: 0,
  min_margin_pct: "",
  min_margin_amount: "",
  is_active: true,
  category_id: "",
  brand_id: "",
  sku_code: "",
  starts_at: "",
  ends_at: "",
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="text-xs text-zinc-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-semibold mt-1 text-zinc-900">{value}</div>
    </div>
  );
}

export default function PricingPage() {
  const locale = useLocale();
  const isEn = locale === "en";
  const [tab, setTab] = useState<TabKey>("rules");
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [ruleScopeFilter, setRuleScopeFilter] = useState<"ALL" | Scope>("ALL");
  const [ruleActiveFilter, setRuleActiveFilter] = useState<"all" | "true" | "false">("all");

  const [editing, setEditing] = useState<PricingRule | null>(null);
  const [form, setForm] = useState<any>(emptyForm);

  const [skuCode, setSkuCode] = useState("");
  const [costOverride, setCostOverride] = useState<string>("");
  const [preview, setPreview] = useState<any>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<any>(null);
  const [recalcRunning, setRecalcRunning] = useState(false);
  const [recalcForm, setRecalcForm] = useState({
    scope: "all" as "all" | "brand" | "category" | "sku",
    brandId: "",
    categoryId: "",
    skuIdsText: "",
    dryRun: false,
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [r, b, c] = await Promise.all([
        fetchPricingRules({ scope: ruleScopeFilter, active: ruleActiveFilter }),
        fetchBrands(),
        fetchCategories(),
      ]);
      setRules(r);
      setBrands(b);
      setCategories(c);
    } catch (e: any) {
      setError(e.message || (isEn ? "Could not load Pricing" : "No se pudo cargar Pricing"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [ruleScopeFilter, ruleActiveFilter]);

  useEffect(() => {
    if (!jobId) return;
    const iv = setInterval(async () => {
      const next = await getRecalculateJob(jobId);
      setJob(next);
      if (["SUCCEEDED", "DONE_WITH_ERRORS", "FAILED"].includes(next.status)) {
        setRecalcRunning(false);
        clearInterval(iv);
      }
    }, 1200);
    return () => clearInterval(iv);
  }, [jobId]);

  const targetLabel = useMemo(
    () => ({
      CATEGORY: (id: string) => categories.find((c: any) => c.id === id)?.name || id,
      BRAND: (id: string) => brands.find((b: any) => b.id === id)?.name || id,
    }),
    [brands, categories],
  );

  const stats = useMemo(() => {
    const active = rules.filter((r) => r.is_active).length;
    return {
      total: rules.length,
      active,
      inactive: rules.length - active,
      avgMargin: rules.length
        ? `${(rules.reduce((acc, curr) => acc + Number(curr.margin_pct || 0), 0) / rules.length).toFixed(1)}%`
        : "-",
    };
  }, [rules]);

  function resetForm() {
    setForm(emptyForm);
    setEditing(null);
  }

  function normalizeDecimalInput(value: string) {
    return value.replace(",", ".").trim();
  }

  function toNumberOrNull(value: string | number) {
    if (value === "" || value == null) return null;
    const normalized = normalizeDecimalInput(String(value));
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function openEdit(rule: PricingRule) {
    setEditing(rule);
    setForm({
      scope: rule.scope,
      margin_pct: rule.margin_pct,
      discount_pct: rule.discount_pct,
      rounding_mode: rule.rounding_mode,
      priority: rule.priority,
      min_margin_pct: rule.min_margin_pct ?? "",
      min_margin_amount: rule.min_margin_amount ?? "",
      is_active: rule.is_active,
      category_id: rule.category_id ?? "",
      brand_id: rule.brand_id ?? "",
      sku_code: "",
      starts_at: rule.starts_at ? rule.starts_at.slice(0, 16) : "",
      ends_at: rule.ends_at ? rule.ends_at.slice(0, 16) : "",
    });
  }

  function validateForm(): string | null {
    const margin = toNumberOrNull(form.margin_pct);
    const discount = toNumberOrNull(form.discount_pct);

    if (margin == null) return isEn ? "Margin is required" : "El margen es obligatorio";
    if (margin < 0 || margin > 500) return isEn ? "Margin must be between 0 and 500" : "Margen debe estar entre 0 y 500";
    if (discount == null) return isEn ? "Discount is required" : "El descuento es obligatorio";
    if (discount < 0 || discount > 90) return isEn ? "Discount must be between 0 and 90" : "Descuento debe estar entre 0 y 90";
    if (form.scope === "CATEGORY" && !form.category_id) return isEn ? "Select a category" : "Selecciona una categoría";
    if (form.scope === "BRAND" && !form.brand_id) return isEn ? "Select a brand" : "Selecciona una marca";
    if (form.scope === "SKU" && !form.sku_code && !editing?.sku_id) return isEn ? "Provide SKU code" : "Indica el SKU code";
    return null;
  }

  async function saveRule() {
    const validation = validateForm();
    if (validation) {
      setError(validation);
      return;
    }

    setSaving(true);
    setError(null);

    const payload: any = {
      scope: form.scope,
      margin_pct: toNumberOrNull(form.margin_pct),
      discount_pct: toNumberOrNull(form.discount_pct),
      rounding_mode: form.rounding_mode,
      priority: Number(toNumberOrNull(form.priority) ?? 0),
      min_margin_pct: toNumberOrNull(form.min_margin_pct),
      min_margin_amount: toNumberOrNull(form.min_margin_amount),
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      is_active: Boolean(form.is_active),
      category_id: form.category_id || null,
      brand_id: form.brand_id || null,
    };

    if (form.scope === "SKU") {
      const trimmedSkuCode = String(form.sku_code || "").trim();
      if (trimmedSkuCode) payload.sku_code = trimmedSkuCode;
    }

    try {
      if (editing) await updatePricingRule(editing.id, payload);
      else await createPricingRule(payload);
      resetForm();
      await load();
    } catch (e: any) {
      setError(e.message || (isEn ? "Could not save" : "No se pudo guardar"));
    } finally {
      setSaving(false);
    }
  }

  async function runPreview() {
    setPreviewError(null);
    setPreview(null);
    try {
      if (!skuCode.trim()) {
        setPreviewError(isEn ? "Enter a SKU code for preview" : "Introduce un SKU code para preview");
        return;
      }
      const result = await previewPricing({
        skuCode: skuCode.trim(),
        costOverride: costOverride !== "" ? Number(costOverride) : undefined,
      });
      setPreview(result);
    } catch (e: any) {
      setPreviewError(e.message || (isEn ? "Could not calculate preview" : "No se pudo calcular preview"));
    }
  }

  async function runRecalc() {
    setRecalcRunning(true);
    const payload: any = {
      scope: recalcForm.scope,
      dryRun: recalcForm.dryRun,
    };

    if (recalcForm.scope === "brand") payload.brandId = recalcForm.brandId;
    if (recalcForm.scope === "category") payload.categoryId = recalcForm.categoryId;
    if (recalcForm.scope === "sku") {
      payload.scope = "sku";
      payload.skuIds = recalcForm.skuIdsText
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    }

    const data = await recalculatePricing(payload);
    setJobId(data.jobId);
  }

  function copyPreview() {
    if (!preview) return;
    navigator.clipboard.writeText(JSON.stringify(preview, null, 2));
  }

  const progress = job?.total ? Math.round((job.processed / job.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-gradient-to-r from-zinc-900 to-zinc-700 text-white p-6">
        <h1 className="text-2xl font-semibold">Pricing / PVP Control Center</h1>
        <p className="text-zinc-200 text-sm mt-1">{isEn ? "Visual, fast panel to manage pricing rules with full control." : "Panel visual, claro y rápido para gestionar reglas de precio sin perder control."}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={isEn ? "Loaded rules" : "Reglas cargadas"} value={stats.total} />
        <StatCard label={isEn ? "Active" : "Activas"} value={stats.active} />
        <StatCard label={isEn ? "Inactive" : "Inactivas"} value={stats.inactive} />
        <StatCard label={isEn ? "Average margin" : "Margen medio"} value={stats.avgMargin} />
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          { key: "rules", label: isEn ? "Rules" : "Reglas" },
          { key: "preview", label: isEn ? "Preview" : "Preview" },
          { key: "bulk", label: "Bulk Recalculate" },
        ] as const).map((item) => (
          <button
            key={item.key}
            className={`px-4 py-2 rounded-xl text-sm ${tab === item.key ? "bg-black text-white" : "bg-white border"}`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 p-3 text-sm">{error}</div>}
      {loading && <div className="text-zinc-500 text-sm">Cargando...</div>}

      {tab === "rules" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-1 rounded-2xl border bg-white p-5 space-y-3">
            <h2 className="font-semibold">{editing ? (isEn ? "Edit rule" : "Editar regla") : (isEn ? "Create rule" : "Crear regla")}</h2>
            <p className="text-xs text-zinc-500">Tip: usa prioridad alta en reglas SKU y baja en global.</p>

            <select className="w-full border rounded-lg p-2" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
              <option>GLOBAL</option><option>CATEGORY</option><option>BRAND</option><option>SKU</option>
            </select>

            {form.scope === "CATEGORY" && (
              <select className="w-full border rounded-lg p-2" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">{isEn ? "Category..." : "Categoría..."}</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            {form.scope === "BRAND" && (
              <select className="w-full border rounded-lg p-2" value={form.brand_id} onChange={(e) => setForm({ ...form, brand_id: e.target.value })}>
                <option value="">{isEn ? "Brand..." : "Marca..."}</option>
                {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
            {form.scope === "SKU" && (
              <input className="w-full border rounded-lg p-2" placeholder="SKU code" value={form.sku_code} onChange={(e) => setForm({ ...form, sku_code: e.target.value })} />
            )}

            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-zinc-600 space-y-1">
                <span>{isEn ? "Margin % (markup over cost)" : "Margen % (subida sobre el coste)"}</span>
                <input
                  className="border rounded-lg p-2 w-full text-sm"
                  inputMode="decimal"
                  type="text"
                  placeholder={isEn ? "e.g. 30" : "ej. 30"}
                  value={form.margin_pct}
                  onChange={(e) => setForm({ ...form, margin_pct: e.target.value })}
                />
              </label>
              <label className="text-xs text-zinc-600 space-y-1">
                <span>{isEn ? "Discount % (applied to final price)" : "Descuento % (sobre el precio final)"}</span>
                <input
                  className="border rounded-lg p-2 w-full text-sm"
                  inputMode="decimal"
                  type="text"
                  placeholder={isEn ? "e.g. 15" : "ej. 15"}
                  value={form.discount_pct}
                  onChange={(e) => setForm({ ...form, discount_pct: e.target.value })}
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-zinc-600 space-y-1">
                <span>{isEn ? "Rounding mode" : "Tipo de redondeo"}</span>
                <select className="border rounded-lg p-2 w-full text-sm" value={form.rounding_mode} onChange={(e) => setForm({ ...form, rounding_mode: e.target.value })}>
                  {ROUNDING.map((r) => <option key={r} value={r}>{r} · {ROUNDING_LABELS[r]}</option>)}
                </select>
              </label>
              <label className="text-xs text-zinc-600 space-y-1">
                <span>{isEn ? "Priority (higher wins)" : "Prioridad (gana la más alta)"}</span>
                <input className="border rounded-lg p-2 w-full text-sm" inputMode="numeric" type="text" placeholder="0" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-zinc-600 space-y-1">
                <span>{isEn ? "Min margin % (optional floor)" : "Margen mínimo % (suelo opcional)"}</span>
                <input className="border rounded-lg p-2 w-full text-sm" inputMode="decimal" type="text" placeholder="Min margin %" value={form.min_margin_pct} onChange={(e) => setForm({ ...form, min_margin_pct: e.target.value })} />
              </label>
              <label className="text-xs text-zinc-600 space-y-1">
                <span>{isEn ? "Min margin € (optional floor)" : "Margen mínimo € (suelo opcional)"}</span>
                <input className="border rounded-lg p-2 w-full text-sm" inputMode="decimal" type="text" placeholder="Min margin €" value={form.min_margin_amount} onChange={(e) => setForm({ ...form, min_margin_amount: e.target.value })} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="border rounded-lg p-2" type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
              <input className="border rounded-lg p-2" type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
            </div>

            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />Activa</label>

            <div className="flex gap-2">
              <button className="flex-1 rounded-xl bg-black text-white px-4 py-2" onClick={saveRule} disabled={saving}>{saving ? "Guardando..." : editing ? "Actualizar" : "Crear"}</button>
              {editing && <button className="rounded-xl border px-4 py-2" onClick={resetForm}>{isEn ? "Cancel" : "Cancelar"}</button>}
            </div>
          </div>

          <div className="xl:col-span-2 rounded-2xl border bg-white overflow-hidden">
            <div className="px-4 py-3 border-b bg-zinc-50 flex flex-wrap gap-2 items-center justify-between">
              <div className="text-sm font-medium">{isEn ? "Rules" : "Reglas"}</div>
              <div className="flex gap-2">
                <select className="border rounded-lg p-2 text-sm" value={ruleScopeFilter} onChange={(e) => setRuleScopeFilter(e.target.value as any)}>
                  <option value="ALL">Todos los scopes</option>
                  <option value="GLOBAL">GLOBAL</option>
                  <option value="CATEGORY">CATEGORY</option>
                  <option value="BRAND">BRAND</option>
                  <option value="SKU">SKU</option>
                </select>
                <select className="border rounded-lg p-2 text-sm" value={ruleActiveFilter} onChange={(e) => setRuleActiveFilter(e.target.value as any)}>
                  <option value="all">{isEn ? "All" : "Todas"}</option>
                  <option value="true">{isEn ? "Active" : "Activas"}</option>
                  <option value="false">{isEn ? "Inactive" : "Inactivas"}</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-zinc-50"><tr><th className="p-3 text-left">Scope</th><th className="p-3 text-left">Target</th><th className="p-3 text-left">{isEn ? "Margin %" : "Margen %"}</th><th className="p-3 text-left">{isEn ? "Discount %" : "Descuento %"}</th><th className="p-3 text-left">Rounding</th><th className="p-3 text-left">Priority</th><th className="p-3 text-left">{isEn ? "Status" : "Estado"}</th><th className="p-3 text-left">{isEn ? "Actions" : "Acciones"}</th></tr></thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r.id} className="border-t hover:bg-zinc-50">
                      <td className="p-3">{r.scope}</td>
                      <td className="p-3">{r.scope === "CATEGORY" ? targetLabel.CATEGORY(r.category_id || "") : r.scope === "BRAND" ? targetLabel.BRAND(r.brand_id || "") : r.scope === "SKU" ? r.sku_id : (isEn ? "Global" : "Global")}</td>
                      <td className="p-3">{r.margin_pct}%</td>
                      <td className="p-3">{r.discount_pct}%</td>
                      <td className="p-3">{r.rounding_mode}</td>
                      <td className="p-3">{r.priority}</td>
                      <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs ${r.is_active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-700"}`}>{r.is_active ? (isEn ? "Active" : "Activa") : (isEn ? "Inactive" : "Inactiva")}</span></td>
                      <td className="p-3 space-x-2">
                        <button className="border rounded-lg px-2 py-1" onClick={() => openEdit(r)}>{isEn ? "Edit" : "Editar"}</button>
                        <button className="border rounded-lg px-2 py-1 text-rose-600" onClick={async () => { if (!window.confirm(isEn ? "Delete rule?" : "Eliminar regla?")) return; await deletePricingRule(r.id); await load(); }}>{isEn ? "Delete" : "Eliminar"}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "preview" && (
        <div className="rounded-2xl border bg-white p-5 space-y-4">
          <h2 className="font-semibold">{isEn ? "Professional preview" : "Preview profesional"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input className="border rounded-xl p-3" placeholder="SKU code" value={skuCode} onChange={(e) => setSkuCode(e.target.value)} />
            <input className="border rounded-xl p-3" placeholder={isEn ? "Cost override (optional)" : "Cost override (opcional)"} type="number" value={costOverride} onChange={(e) => setCostOverride(e.target.value)} />
            <button className="bg-black text-white rounded-xl px-4 py-3" onClick={runPreview}>{isEn ? "Calculate preview" : "Calcular preview"}</button>
          </div>
          {previewError && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{previewError}</div>}
          {preview && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <StatCard label="Cost" value={`${preview.cost ?? "-"} €`} />
                <StatCard label="Compare" value={`${preview.compareAtPrice ?? "-"} €`} />
                <StatCard label="Sale" value={`${preview.salePrice ?? "-"} €`} />
                <StatCard label="Discount" value={preview.discountPct != null ? `${preview.discountPct}%` : "-"} />
                <StatCard label="Floor" value={`${preview.floor ?? "-"} €`} />
              </div>
              <div className="flex gap-2">
                <button className="border rounded-xl px-3 py-2 text-sm" onClick={copyPreview}>{isEn ? "Copy result" : "Copiar resultado"}</button>
                <a className="border rounded-xl px-3 py-2 text-sm" href="/products" target="_blank" rel="noreferrer">{isEn ? "Open products" : "Abrir productos"}</a>
              </div>
              {preview.warnings?.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
                  <div className="font-medium">Warnings</div>
                  <ul className="list-disc pl-5">
                    {preview.warnings.map((w: string) => <li key={w}>{w}</li>)}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "bulk" && (
        <div className="rounded-2xl border bg-white p-5 space-y-4">
          <h2 className="font-semibold">{isEn ? "Bulk recalculate" : "Recálculo masivo"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <select className="border rounded-lg p-2" value={recalcForm.scope} onChange={(e) => setRecalcForm({ ...recalcForm, scope: e.target.value as any })}>
              <option value="all">{isEn ? "Whole catalog" : "Todo el catálogo"}</option>
              <option value="brand">{isEn ? "Brand only" : "Solo marca"}</option>
              <option value="category">{isEn ? "Category only" : "Solo categoría"}</option>
              <option value="sku">SKUs concretos</option>
            </select>
            <label className="inline-flex items-center gap-2 text-sm border rounded-lg p-2"><input type="checkbox" checked={recalcForm.dryRun} onChange={(e) => setRecalcForm({ ...recalcForm, dryRun: e.target.checked })} />Dry run</label>
          </div>
          {recalcForm.scope === "brand" && (
            <select className="border rounded-lg p-2 w-full" value={recalcForm.brandId} onChange={(e) => setRecalcForm({ ...recalcForm, brandId: e.target.value })}>
              <option value="">{isEn ? "Select brand..." : "Selecciona marca..."}</option>
              {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          {recalcForm.scope === "category" && (
            <select className="border rounded-lg p-2 w-full" value={recalcForm.categoryId} onChange={(e) => setRecalcForm({ ...recalcForm, categoryId: e.target.value })}>
              <option value="">{isEn ? "Select category..." : "Selecciona categoría..."}</option>
              {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {recalcForm.scope === "sku" && (
            <textarea className="border rounded-lg p-2 w-full min-h-[90px]" placeholder="sku-id-1, sku-id-2, sku-id-3" value={recalcForm.skuIdsText} onChange={(e) => setRecalcForm({ ...recalcForm, skuIdsText: e.target.value })} />
          )}

          <button disabled={recalcRunning} className="bg-black text-white rounded-xl px-4 py-2.5 disabled:opacity-60" onClick={runRecalc}>{recalcRunning ? (isEn ? "Started..." : "Lanzado...") : (isEn ? "Start recalculation" : "Lanzar recálculo")}</button>

          {job && (
            <div className="rounded-xl border border-zinc-200 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm"><span>{isEn ? "Status" : "Estado"}: {job.status}</span><span>{progress}%</span></div>
              <div className="w-full bg-zinc-200 rounded-full h-2 overflow-hidden"><div className="h-2 bg-black" style={{ width: `${progress}%` }} /></div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label={isEn ? "Processed" : "Procesados"} value={`${job.processed}/${job.total}`} />
                <StatCard label="Updated" value={job.updated_count} />
                <StatCard label="Warnings" value={job.warning_count} />
                <StatCard label="Failed" value={job.failed_count} />
              </div>
              {!!job.errors_json?.length && (
                <button className="border rounded-xl px-3 py-2 text-sm" onClick={() => {
                  const blob = new Blob([JSON.stringify(job.errors_json, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `pricing-job-${job.id}-errors.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}>{isEn ? "Download JSON errors" : "Descargar errores JSON"}</button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
