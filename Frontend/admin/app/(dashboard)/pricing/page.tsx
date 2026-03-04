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

type TabKey = "rules" | "preview" | "bulk";
type Scope = "GLOBAL" | "CATEGORY" | "BRAND" | "SKU";

const ROUNDING = ["NONE", "X_99", "X_95", "NEAREST_0_05", "CEIL_1"] as const;

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

function StatCard({ label, value, tone = "default" }: { label: string; value: string | number; tone?: "default" | "ok" | "warn" | "danger" }) {
  const colorClass =
    tone === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : tone === "danger"
          ? "border-rose-200 bg-rose-50 text-rose-900"
          : "border-zinc-200 bg-white text-zinc-900";

  return (
    <div className={`rounded-xl border p-4 ${colorClass}`}>
      <div className="text-xs uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

export default function PricingPage() {
  const [tab, setTab] = useState<TabKey>("rules");
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<PricingRule | null>(null);
  const [form, setForm] = useState<any>(emptyForm);

  const [skuCode, setSkuCode] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<any>(null);
  const [recalcRunning, setRecalcRunning] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [r, b, c] = await Promise.all([
        fetchPricingRules(),
        fetchBrands(),
        fetchCategories(),
      ]);
      setRules(r);
      setBrands(b);
      setCategories(c);
    } catch (e: any) {
      setError(e.message || "No se pudo cargar Pricing");
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
        setRecalcRunning(false);
        clearInterval(iv);
      }
    }, 1200);
    return () => clearInterval(iv);
  }, [jobId]);

  const targetLabel = useMemo(
    () => ({
      CATEGORY: (id: string) => categories.find((c) => c.id === id)?.name || id,
      BRAND: (id: string) => brands.find((b) => b.id === id)?.name || id,
    }),
    [brands, categories],
  );

  const stats = useMemo(() => {
    const active = rules.filter((r) => r.is_active).length;
    const scheduled = rules.filter((r) => r.starts_at || r.ends_at).length;
    return {
      total: rules.length,
      active,
      inactive: rules.length - active,
      scheduled,
    };
  }, [rules]);

  function resetForm() {
    setForm(emptyForm);
    setEditing(null);
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
    setTab("rules");
  }

  function validateForm(): string | null {
    if (form.margin_pct < 0 || form.margin_pct > 500) return "Margen debe estar entre 0 y 500";
    if (form.discount_pct < 0 || form.discount_pct > 90) return "Descuento debe estar entre 0 y 90";
    if (form.priority < -999 || form.priority > 999) return "Prioridad debe estar entre -999 y 999";
    if (form.scope === "CATEGORY" && !form.category_id) return "Selecciona una categoría";
    if (form.scope === "BRAND" && !form.brand_id) return "Selecciona una marca";
    if (form.scope === "SKU" && !form.sku_code && !editing?.sku_id) return "Indica el SKU code";
    return null;
  }

  async function saveRule() {
    const v = validateForm();
    if (v) {
      setError(v);
      return;
    }

    setSaving(true);
    setError(null);
    const payload: any = {
      ...form,
      min_margin_pct: form.min_margin_pct === "" ? null : Number(form.min_margin_pct),
      min_margin_amount:
        form.min_margin_amount === "" ? null : Number(form.min_margin_amount),
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      category_id: form.category_id || null,
      brand_id: form.brand_id || null,
    };

    try {
      if (editing) await updatePricingRule(editing.id, payload);
      else await createPricingRule(payload);
      resetForm();
      await load();
    } catch (e: any) {
      setError(e.message || "No se pudo guardar la regla");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = window.confirm("¿Seguro que quieres eliminar esta regla?");
    if (!ok) return;
    await deletePricingRule(id);
    await load();
  }

  async function runPreview() {
    setPreviewError(null);
    setPreview(null);
    try {
      if (!skuCode.trim()) {
        setPreviewError("Introduce un SKU code para calcular preview");
        return;
      }
      const result = await previewPricing({ skuCode: skuCode.trim() });
      setPreview(result);
    } catch (e: any) {
      setPreviewError(e.message || "No se pudo calcular preview");
    }
  }

  async function runRecalc() {
    setRecalcRunning(true);
    const data = await recalculatePricing({ scope: "all" });
    setJobId(data.jobId);
  }

  const progress =
    job && job.total > 0 ? Math.min(100, Math.round((job.processed / job.total) * 100)) : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-gradient-to-r from-zinc-900 to-zinc-700 text-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Pricing / PVP</h1>
        <p className="text-sm text-zinc-200 mt-1">
          Gestiona reglas, previsualiza resultados y recalcula precios cacheados de forma segura.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Reglas totales" value={stats.total} />
        <StatCard label="Reglas activas" value={stats.active} tone="ok" />
        <StatCard label="Inactivas" value={stats.inactive} tone="warn" />
        <StatCard label="Programadas" value={stats.scheduled} />
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          { key: "rules", label: "Reglas" },
          { key: "preview", label: "Preview" },
          { key: "bulk", label: "Bulk / Recalculate" },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              tab === t.key
                ? "bg-black text-white shadow"
                : "bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-sm text-zinc-500">Cargando datos...</div>}
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 p-3 text-sm">{error}</div>}

      {tab === "rules" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-1 rounded-2xl border bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-zinc-900">{editing ? "Editar regla" : "Nueva regla"}</h2>
              {editing && (
                <button className="text-xs text-zinc-500 underline" onClick={resetForm}>
                  Cancelar edición
                </button>
              )}
            </div>

            <div className="space-y-3 text-sm">
              <label className="block space-y-1">
                <span className="text-zinc-600">Scope</span>
                <select className="w-full border rounded-lg p-2" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
                  <option>GLOBAL</option>
                  <option>CATEGORY</option>
                  <option>BRAND</option>
                  <option>SKU</option>
                </select>
              </label>

              {form.scope === "CATEGORY" && (
                <label className="block space-y-1">
                  <span className="text-zinc-600">Categoría objetivo</span>
                  <select className="w-full border rounded-lg p-2" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                    <option value="">Selecciona...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
              )}

              {form.scope === "BRAND" && (
                <label className="block space-y-1">
                  <span className="text-zinc-600">Marca objetivo</span>
                  <select className="w-full border rounded-lg p-2" value={form.brand_id} onChange={(e) => setForm({ ...form, brand_id: e.target.value })}>
                    <option value="">Selecciona...</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </label>
              )}

              {form.scope === "SKU" && (
                <label className="block space-y-1">
                  <span className="text-zinc-600">SKU code</span>
                  <input className="w-full border rounded-lg p-2" placeholder="Ej: NEX-12345" value={form.sku_code} onChange={(e) => setForm({ ...form, sku_code: e.target.value })} />
                </label>
              )}

              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-zinc-600">Margen %</span>
                  <input className="w-full border rounded-lg p-2" type="number" value={form.margin_pct} onChange={(e) => setForm({ ...form, margin_pct: Number(e.target.value) })} />
                </label>
                <label className="block space-y-1">
                  <span className="text-zinc-600">Descuento %</span>
                  <input className="w-full border rounded-lg p-2" type="number" value={form.discount_pct} onChange={(e) => setForm({ ...form, discount_pct: Number(e.target.value) })} />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-zinc-600">Rounding</span>
                  <select className="w-full border rounded-lg p-2" value={form.rounding_mode} onChange={(e) => setForm({ ...form, rounding_mode: e.target.value })}>
                    {ROUNDING.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-zinc-600">Prioridad</span>
                  <input className="w-full border rounded-lg p-2" type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-zinc-600">Min margin %</span>
                  <input className="w-full border rounded-lg p-2" type="number" placeholder="Opcional" value={form.min_margin_pct} onChange={(e) => setForm({ ...form, min_margin_pct: e.target.value })} />
                </label>
                <label className="block space-y-1">
                  <span className="text-zinc-600">Min margin €</span>
                  <input className="w-full border rounded-lg p-2" type="number" placeholder="Opcional" value={form.min_margin_amount} onChange={(e) => setForm({ ...form, min_margin_amount: e.target.value })} />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-zinc-600">Inicio (opcional)</span>
                  <input className="w-full border rounded-lg p-2" type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
                </label>
                <label className="block space-y-1">
                  <span className="text-zinc-600">Fin (opcional)</span>
                  <input className="w-full border rounded-lg p-2" type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
                </label>
              </div>

              <label className="inline-flex items-center gap-2 pt-1">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                <span className="text-zinc-700">Regla activa</span>
              </label>

              <button disabled={saving} className="w-full bg-black text-white rounded-xl px-4 py-2.5 disabled:opacity-50" onClick={saveRule}>
                {saving ? "Guardando..." : editing ? "Actualizar regla" : "Crear regla"}
              </button>
            </div>
          </div>

          <div className="xl:col-span-2 rounded-2xl border bg-white overflow-hidden">
            <div className="px-5 py-4 border-b bg-zinc-50">
              <h3 className="font-semibold text-zinc-900">Reglas actuales</h3>
              <p className="text-xs text-zinc-500 mt-1">La regla ganadora se decide por prioridad, scope y última actualización.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-600">
                    <th className="text-left p-3">Scope</th>
                    <th className="text-left p-3">Target</th>
                    <th className="text-left p-3">Margen</th>
                    <th className="text-left p-3">Desc.</th>
                    <th className="text-left p-3">Rounding</th>
                    <th className="text-left p-3">Prioridad</th>
                    <th className="text-left p-3">Estado</th>
                    <th className="text-left p-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r.id} className="border-t hover:bg-zinc-50/70">
                      <td className="p-3 font-medium text-zinc-800">{r.scope}</td>
                      <td className="p-3 text-zinc-700">
                        {r.scope === "CATEGORY"
                          ? targetLabel.CATEGORY(r.category_id || "")
                          : r.scope === "BRAND"
                            ? targetLabel.BRAND(r.brand_id || "")
                            : r.scope === "SKU"
                              ? r.sku_id
                              : "Global"}
                      </td>
                      <td className="p-3">{r.margin_pct}%</td>
                      <td className="p-3">{r.discount_pct}%</td>
                      <td className="p-3">{r.rounding_mode}</td>
                      <td className="p-3">{r.priority}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${r.is_active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-700"}`}>
                          {r.is_active ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td className="p-3 space-x-2">
                        <button className="border rounded-lg px-2.5 py-1.5 hover:bg-zinc-100" onClick={() => openEdit(r)}>Editar</button>
                        <button className="border rounded-lg px-2.5 py-1.5 text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(r.id)}>Eliminar</button>
                      </td>
                    </tr>
                  ))}
                  {!rules.length && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-zinc-500">Sin reglas todavía. Crea la primera desde el panel izquierdo.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "preview" && (
        <div className="rounded-2xl border bg-white p-5 space-y-4">
          <h2 className="font-semibold">Calculadora Preview</h2>
          <p className="text-sm text-zinc-600">Comprueba rápidamente qué regla gana y qué precio final se aplicará a un SKU.</p>
          <div className="flex flex-col md:flex-row gap-2">
            <input className="border rounded-xl p-3 flex-1" placeholder="SKU code (ej: NEX-12345)" value={skuCode} onChange={(e) => setSkuCode(e.target.value)} />
            <button className="bg-black text-white rounded-xl px-5 py-3" onClick={runPreview}>Calcular</button>
          </div>
          {previewError && <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 p-3 text-sm">{previewError}</div>}

          {preview && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <StatCard label="Coste" value={`${preview.cost ?? "-"} €`} />
              <StatCard label="Compare-at" value={`${preview.compareAtPrice ?? "-"} €`} />
              <StatCard label="Sale" value={`${preview.salePrice ?? "-"} €`} tone="ok" />
              <StatCard label="Descuento" value={preview.discountPct != null ? `${preview.discountPct}%` : "-"} />
              <StatCard label="Floor" value={`${preview.floor ?? "-"} €`} tone={preview?.warnings?.length ? "warn" : "default"} />
            </div>
          )}

          {preview?.warnings?.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 text-sm">
              <div className="font-medium mb-1">Avisos</div>
              <ul className="list-disc pl-5">
                {preview.warnings.map((warning: string) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === "bulk" && (
        <div className="rounded-2xl border bg-white p-5 space-y-4">
          <h2 className="font-semibold">Bulk Recalculation</h2>
          <p className="text-sm text-zinc-600">Lanza recálculo masivo de precios cacheados (seguro para grandes catálogos).</p>
          <button disabled={recalcRunning} className="bg-black text-white px-4 py-2.5 rounded-xl disabled:opacity-60" onClick={runRecalc}>
            {recalcRunning ? "Recalculando..." : "Recalcular ahora"}
          </button>

          {job && (
            <div className="rounded-xl border border-zinc-200 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Estado del job</span>
                <span className="px-2 py-1 rounded-full bg-zinc-100 text-zinc-700 text-xs">{job.status}</span>
              </div>
              <div className="w-full bg-zinc-200 rounded-full h-2.5 overflow-hidden">
                <div className="h-2.5 bg-black" style={{ width: `${progress}%` }} />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                <StatCard label="Procesados" value={`${job.processed}/${job.total}`} />
                <StatCard label="Actualizados" value={job.updated_count} tone="ok" />
                <StatCard label="Warnings" value={job.warning_count} tone="warn" />
                <StatCard label="Fallidos" value={job.failed_count} tone={job.failed_count ? "danger" : "default"} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
