"use client";

import { useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  Plus,
  Save,
  Trash2,
  Truck,
  Landmark,
  Pencil,
  X,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import {
  fetchShippingZones,
  updateShippingZones,
  fetchShippingRules,
  updateShippingRules,
  fetchTaxZones,
  updateTaxZones,
  type ShippingZone,
  type ShippingRule,
  type TaxZone,
} from '@/lib/api';
import { toast } from 'sonner';
import { useLocale } from 'next-intl';

const ZONE_ORDER = [
  'ES_PENINSULA_BALEARES',
  'PT',
  'AD',
  'CANARY_ISLANDS',
  'CEUTA',
  'MELILLA',
  'OTHER',
];

type EditableShippingZone = ShippingZone;
type EditableShippingRule = ShippingRule;
type EditableTaxZone = TaxZone;

export default function ShippingTaxPage() {
  const locale = useLocale();
  const isEn = locale === 'en';
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [shippingRules, setShippingRules] = useState<ShippingRule[]>([]);
  const [taxZones, setTaxZones] = useState<TaxZone[]>([]);

  const [draftShippingZones, setDraftShippingZones] = useState<EditableShippingZone[]>([]);
  const [draftShippingRules, setDraftShippingRules] = useState<EditableShippingRule[]>([]);
  const [draftTaxZones, setDraftTaxZones] = useState<EditableTaxZone[]>([]);

  const [editingZones, setEditingZones] = useState(false);
  const [editingRules, setEditingRules] = useState(false);
  const [editingTax, setEditingTax] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingShipping, setSavingShipping] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [savingTax, setSavingTax] = useState(false);

  const hasZoneChanges = useMemo(
    () => JSON.stringify(draftShippingZones) !== JSON.stringify(shippingZones),
    [draftShippingZones, shippingZones],
  );
  const hasRuleChanges = useMemo(
    () => JSON.stringify(draftShippingRules) !== JSON.stringify(shippingRules),
    [draftShippingRules, shippingRules],
  );
  const hasTaxChanges = useMemo(
    () => JSON.stringify(draftTaxZones) !== JSON.stringify(taxZones),
    [draftTaxZones, taxZones],
  );

  const load = async () => {
    try {
      setLoading(true);
      const [sz, sr, tz] = await Promise.all([
        fetchShippingZones(),
        fetchShippingRules(),
        fetchTaxZones(),
      ]);

      const normalizedRules = sr.map((r) => ({
        ...r,
        min_base_excl_tax: Number(r.min_base_excl_tax),
        max_base_excl_tax:
          r.max_base_excl_tax === null || r.max_base_excl_tax === undefined
            ? null
            : Number(r.max_base_excl_tax),
        shipping_base_excl_tax: Number(r.shipping_base_excl_tax),
        priority: Number(r.priority),
      }));

      const normalizedTax = tz.map((z) => ({
        ...z,
        standard_rate: Number(z.standard_rate),
        customs_duty_rate: Number(z.customs_duty_rate || 0),
      }));

      setShippingZones(sz);
      setShippingRules(normalizedRules);
      setTaxZones(normalizedTax);

      setDraftShippingZones(sz);
      setDraftShippingRules(normalizedRules);
      setDraftTaxZones(normalizedTax);
    } catch (err: any) {
      toast.error(err.message || (isEn ? 'Could not load shipping/tax values' : 'No se pudieron cargar los valores de shipping/tax'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sortedZones = useMemo(
    () =>
      [...draftShippingZones].sort(
        (a, b) => ZONE_ORDER.indexOf(a.code) - ZONE_ORDER.indexOf(b.code),
      ),
    [draftShippingZones],
  );

  const rulesByZone = useMemo(() => {
    const groups = new Map<string, EditableShippingRule[]>();
    for (const z of ZONE_ORDER) groups.set(z, []);

    for (const r of draftShippingRules) {
      const list = groups.get(r.zone_code) ?? [];
      list.push(r);
      groups.set(r.zone_code, list);
    }

    for (const [, list] of groups.entries()) {
      list.sort((a, b) => a.priority - b.priority);
    }

    return groups;
  }, [draftShippingRules]);

  const validateRules = (rules: EditableShippingRule[]): string | null => {
    for (const zoneCode of ZONE_ORDER) {
      const zoneRules = rules
        .filter((r) => r.zone_code === zoneCode)
        .sort((a, b) => a.priority - b.priority);

      const priorities = new Set<number>();
      for (const r of zoneRules) {
        if (r.max_base_excl_tax != null && r.max_base_excl_tax <= r.min_base_excl_tax) {
          return isEn
            ? `In ${zoneCode}, max must be greater than min.`
            : `En ${zoneCode}, el máximo debe ser mayor que el mínimo.`;
        }

        if (priorities.has(r.priority)) {
          return isEn
            ? `In ${zoneCode}, there are duplicated priorities.`
            : `En ${zoneCode}, hay prioridades duplicadas.`;
        }
        priorities.add(r.priority);
      }

      for (let i = 0; i < zoneRules.length; i++) {
        for (let j = i + 1; j < zoneRules.length; j++) {
          const a = zoneRules[i];
          const b = zoneRules[j];
          const aMax = a.max_base_excl_tax ?? Number.POSITIVE_INFINITY;
          const bMax = b.max_base_excl_tax ?? Number.POSITIVE_INFINITY;

          const overlap = a.min_base_excl_tax < bMax && b.min_base_excl_tax < aMax;
          if (overlap) {
            return isEn
              ? `In ${zoneCode}, there are overlapping ranges.`
              : `En ${zoneCode}, hay tramos solapados.`;
          }
        }
      }
    }

    return null;
  };

  const startEditZones = () => {
    setDraftShippingZones(shippingZones);
    setEditingZones(true);
  };

  const cancelEditZones = () => {
    setDraftShippingZones(shippingZones);
    setEditingZones(false);
  };

  const saveShipping = async () => {
    try {
      setSavingShipping(true);
      const updated = await updateShippingZones(sortedZones);
      setShippingZones(updated);
      setDraftShippingZones(updated);
      setEditingZones(false);
      toast.success(isEn ? 'Shipping destinations saved' : 'Destinos de envío guardados');
    } catch (err: any) {
      toast.error(err.message || (isEn ? 'Could not save shipping zones' : 'No se pudieron guardar zonas de envío'));
    } finally {
      setSavingShipping(false);
    }
  };

  const startEditRules = () => {
    setDraftShippingRules(shippingRules);
    setEditingRules(true);
  };

  const cancelEditRules = () => {
    setDraftShippingRules(shippingRules);
    setEditingRules(false);
  };

  const saveRules = async () => {
    const validationError = validateRules(draftShippingRules);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setSavingRules(true);
      const prepared = draftShippingRules
        .map((r) => ({
          ...r,
          min_base_excl_tax: Number(r.min_base_excl_tax),
          max_base_excl_tax:
            r.max_base_excl_tax === null || r.max_base_excl_tax === undefined
              ? null
              : Number(r.max_base_excl_tax),
          shipping_base_excl_tax: Number(r.shipping_base_excl_tax),
          priority: Number(r.priority),
          currency: (r.currency || 'EUR').toUpperCase(),
        }))
        .sort((a, b) =>
          a.zone_code === b.zone_code
            ? a.priority - b.priority
            : a.zone_code.localeCompare(b.zone_code),
        );

      const updated = await updateShippingRules(prepared);
      const normalized = updated.map((r) => ({
        ...r,
        min_base_excl_tax: Number(r.min_base_excl_tax),
        max_base_excl_tax:
          r.max_base_excl_tax === null || r.max_base_excl_tax === undefined
            ? null
            : Number(r.max_base_excl_tax),
        shipping_base_excl_tax: Number(r.shipping_base_excl_tax),
        priority: Number(r.priority),
      }));

      setShippingRules(normalized);
      setDraftShippingRules(normalized);
      setEditingRules(false);
      toast.success(isEn ? 'Shipping ranges saved' : 'Tramos de envío guardados');
    } catch (err: any) {
      toast.error(err.message || (isEn ? 'Could not save shipping ranges' : 'No se pudieron guardar los tramos de envío'));
    } finally {
      setSavingRules(false);
    }
  };

  const startEditTax = () => {
    setDraftTaxZones(taxZones);
    setEditingTax(true);
  };

  const cancelEditTax = () => {
    setDraftTaxZones(taxZones);
    setEditingTax(false);
  };

  const saveTax = async () => {
    try {
      setSavingTax(true);
      const payload = draftTaxZones.map((z) => ({
        ...z,
        standard_rate: Number(z.standard_rate),
        customs_duty_rate: Number(z.customs_duty_rate || 0),
      }));

      const updated = await updateTaxZones(payload);
      const normalized = updated.map((z) => ({
        ...z,
        standard_rate: Number(z.standard_rate),
        customs_duty_rate: Number(z.customs_duty_rate || 0),
      }));
      setTaxZones(normalized);
      setDraftTaxZones(normalized);
      setEditingTax(false);
      toast.success(isEn ? 'Tax and customs zones saved' : 'Zonas fiscales y aduanas guardadas');
    } catch (err: any) {
      toast.error(err.message || (isEn ? 'Could not save tax zones' : 'No se pudieron guardar zonas fiscales'));
    } finally {
      setSavingTax(false);
    }
  };

  const addRule = (zoneCode: string) => {
    const zoneRules = draftShippingRules.filter((r) => r.zone_code === zoneCode);
    const maxPriority = zoneRules.length
      ? Math.max(...zoneRules.map((r) => r.priority))
      : 0;
    setDraftShippingRules((prev) => [
      ...prev,
      {
        zone_code: zoneCode,
        min_base_excl_tax: 0,
        max_base_excl_tax: null,
        shipping_base_excl_tax: 0,
        currency: 'EUR',
        priority: maxPriority + 1,
      },
    ]);
  };

  const removeRule = (zoneCode: string, priority: number) => {
    if (!confirm(isEn ? 'Delete this shipping range?' : '¿Eliminar este tramo de envío?')) return;
    setDraftShippingRules((prev) =>
      prev.filter((r) => !(r.zone_code === zoneCode && r.priority === priority)),
    );
  };

  const removeAllZoneRules = (zoneCode: string) => {
    if (!confirm(isEn ? `Delete all ranges for ${zoneCode}?` : `¿Eliminar todos los tramos de ${zoneCode}?`)) return;
    setDraftShippingRules((prev) => prev.filter((r) => r.zone_code !== zoneCode));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-7 h-7 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Shipping & Tax Regimes</h1>
        <p className="text-sm text-zinc-500">
          {isEn
            ? 'Full ecommerce management: edit, save, cancel and delete ranges.'
            : 'Gestión completa ecommerce: editar, guardar, cancelar y eliminar tramos.'}
        </p>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-zinc-500" />
            <h2 className="text-base font-semibold">{isEn ? 'Shipping availability by destination' : 'Disponibilidad de envío por destino'}</h2>
          </div>

          {!editingZones ? (
            <button
              onClick={startEditZones}
              className="inline-flex items-center gap-2 rounded-lg border text-sm px-4 py-2 hover:bg-zinc-50"
            >
              <Pencil className="w-4 h-4" /> {isEn ? 'Edit' : 'Editar'}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={cancelEditZones}
                className="inline-flex items-center gap-2 rounded-lg border text-sm px-4 py-2 hover:bg-zinc-50"
              >
                <X className="w-4 h-4" /> {isEn ? 'Cancel' : 'Cancelar'}
              </button>
              <button
                onClick={saveShipping}
                disabled={!hasZoneChanges || savingShipping}
                className="inline-flex items-center gap-2 rounded-lg bg-black text-white text-sm px-4 py-2 disabled:opacity-60"
              >
                {savingShipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isEn ? 'Save' : 'Guardar'}
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-zinc-50">
                <th className="px-3 py-2 text-left">{isEn ? "Zone" : "Zona"}</th>
                <th className="px-3 py-2 text-left">{isEn ? 'Description' : 'Descripción'}</th>
                <th className="px-3 py-2 text-left">{isEn ? 'Shipping enabled' : 'Envío habilitado'}</th>
              </tr>
            </thead>
            <tbody>
              {sortedZones.map((zone, idx) => (
                <tr key={zone.code} className={idx % 2 ? 'bg-zinc-50/40' : ''}>
                  <td className="px-3 py-2 font-medium">{zone.code}</td>
                  <td className="px-3 py-2">{zone.description}</td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={zone.enabled}
                      disabled={!editingZones}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setDraftShippingZones((prev) =>
                          prev.map((z) => (z.code === zone.code ? { ...z, enabled: checked } : z)),
                        );
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{isEn ? 'Shipping ranges' : 'Tramos de envío'}</h2>

          {!editingRules ? (
            <button
              onClick={startEditRules}
              className="inline-flex items-center gap-2 rounded-lg border text-sm px-4 py-2 hover:bg-zinc-50"
            >
              <Pencil className="w-4 h-4" /> {isEn ? 'Edit' : 'Editar'}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={cancelEditRules}
                className="inline-flex items-center gap-2 rounded-lg border text-sm px-4 py-2 hover:bg-zinc-50"
              >
                <RotateCcw className="w-4 h-4" /> Reset
              </button>
              <button
                onClick={saveRules}
                disabled={!hasRuleChanges || savingRules}
                className="inline-flex items-center gap-2 rounded-lg bg-black text-white text-sm px-4 py-2 disabled:opacity-60"
              >
                {savingRules ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isEn ? 'Save' : 'Guardar'}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
          <AlertTriangle className="w-4 h-4" />
          {isEn ? 'We validate overlapping ranges and duplicated priorities before saving.' : 'Validamos solapes de tramos y prioridades duplicadas antes de guardar.'}
        </div>

        <div className="space-y-5">
          {ZONE_ORDER.map((zoneCode) => {
            const zoneRules = rulesByZone.get(zoneCode) || [];
            return (
              <div key={zoneCode} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">{zoneCode}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => removeAllZoneRules(zoneCode)}
                      disabled={!editingRules || zoneRules.length === 0}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" /> {isEn ? 'Delete all' : 'Eliminar todos'}
                    </button>
                    <button
                      onClick={() => addRule(zoneCode)}
                      disabled={!editingRules}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border hover:bg-zinc-50 disabled:opacity-50"
                    >
                      <Plus className="w-3 h-3" /> {isEn ? "Add range" : "Añadir tramo"}
                    </button>
                  </div>
                </div>

                {zoneRules.length === 0 ? (
                  <p className="text-xs text-zinc-500">{isEn ? 'No ranges defined.' : 'Sin tramos definidos.'}</p>
                ) : (
                  <div className="space-y-2">
                    {zoneRules.map((rule, idx) => (
                      <div key={`${zoneCode}-${idx}`} className="grid grid-cols-12 gap-2 items-center">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          disabled={!editingRules}
                          value={rule.min_base_excl_tax}
                          onChange={(e) => {
                            const value = Number(e.target.value || 0);
                            setDraftShippingRules((prev) =>
                              prev.map((r) =>
                                r.zone_code === zoneCode && r.priority === rule.priority
                                  ? { ...r, min_base_excl_tax: value }
                                  : r,
                              ),
                            );
                          }}
                          className="col-span-2 border rounded px-2 py-1 text-sm"
                          placeholder="Min"
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          disabled={!editingRules}
                          value={rule.max_base_excl_tax ?? ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const value = raw === '' ? null : Number(raw);
                            setDraftShippingRules((prev) =>
                              prev.map((r) =>
                                r.zone_code === zoneCode && r.priority === rule.priority
                                  ? { ...r, max_base_excl_tax: value }
                                  : r,
                              ),
                            );
                          }}
                          className="col-span-2 border rounded px-2 py-1 text-sm"
                          placeholder={isEn ? 'Max (empty = infinite)' : 'Max (vacío = infinito)'}
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          disabled={!editingRules}
                          value={rule.shipping_base_excl_tax}
                          onChange={(e) => {
                            const value = Number(e.target.value || 0);
                            setDraftShippingRules((prev) =>
                              prev.map((r) =>
                                r.zone_code === zoneCode && r.priority === rule.priority
                                  ? { ...r, shipping_base_excl_tax: value }
                                  : r,
                              ),
                            );
                          }}
                          className="col-span-2 border rounded px-2 py-1 text-sm"
                          placeholder="Coste"
                        />
                        <input
                          type="number"
                          min={1}
                          step={1}
                          disabled={!editingRules}
                          value={rule.priority}
                          onChange={(e) => {
                            const value = Number(e.target.value || 1);
                            setDraftShippingRules((prev) =>
                              prev.map((r) =>
                                r.zone_code === zoneCode && r.priority === rule.priority
                                  ? { ...r, priority: value }
                                  : r,
                              ),
                            );
                          }}
                          className="col-span-2 border rounded px-2 py-1 text-sm"
                          placeholder="Prioridad"
                        />
                        <input
                          type="text"
                          disabled={!editingRules}
                          value={rule.currency}
                          onChange={(e) => {
                            const value = e.target.value;
                            setDraftShippingRules((prev) =>
                              prev.map((r) =>
                                r.zone_code === zoneCode && r.priority === rule.priority
                                  ? { ...r, currency: value }
                                  : r,
                              ),
                            );
                          }}
                          className="col-span-2 border rounded px-2 py-1 text-sm"
                        />
                        <button
                          onClick={() => removeRule(zoneCode, rule.priority)}
                          disabled={!editingRules}
                          className="col-span-2 inline-flex items-center justify-center gap-1 text-xs px-2 py-1 rounded border text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="w-3 h-3" /> {isEn ? 'Delete' : 'Borrar'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-zinc-500" />
            <h2 className="text-base font-semibold">{isEn ? 'Taxes and customs by destination' : 'Impuestos y aduanas por destino'}</h2>
          </div>

          {!editingTax ? (
            <button
              onClick={startEditTax}
              className="inline-flex items-center gap-2 rounded-lg border text-sm px-4 py-2 hover:bg-zinc-50"
            >
              <Pencil className="w-4 h-4" /> {isEn ? 'Edit' : 'Editar'}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={cancelEditTax}
                className="inline-flex items-center gap-2 rounded-lg border text-sm px-4 py-2 hover:bg-zinc-50"
              >
                <X className="w-4 h-4" /> {isEn ? 'Cancel' : 'Cancelar'}
              </button>
              <button
                onClick={saveTax}
                disabled={!hasTaxChanges || savingTax}
                className="inline-flex items-center gap-2 rounded-lg bg-black text-white text-sm px-4 py-2 disabled:opacity-60"
              >
                {savingTax ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isEn ? 'Save' : 'Guardar'}
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-zinc-50">
                <th className="px-3 py-2 text-left">{isEn ? "Zone" : "Zona"}</th>
                <th className="px-3 py-2 text-left">Enabled</th>
                <th className="px-3 py-2 text-left">{isEn ? 'Mode' : 'Modo'}</th>
                <th className="px-3 py-2 text-left">Tax rate (%)</th>
                <th className="px-3 py-2 text-left">Customs duty (%)</th>
                <th className="px-3 py-2 text-left">{isEn ? 'Notes' : 'Notas'}</th>
              </tr>
            </thead>
            <tbody>
              {draftTaxZones.map((zone, idx) => (
                <tr key={zone.code} className={idx % 2 ? 'bg-zinc-50/40' : ''}>
                  <td className="px-3 py-2 font-medium">{zone.code}</td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={zone.enabled}
                      disabled={!editingTax}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setDraftTaxZones((prev) =>
                          prev.map((z) => (z.code === zone.code ? { ...z, enabled: checked } : z)),
                        );
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={zone.mode}
                      disabled={!editingTax}
                      onChange={(e) => {
                        const mode = e.target.value as 'VAT' | 'OUTSIDE_VAT';
                        setDraftTaxZones((prev) =>
                          prev.map((z) => (z.code === zone.code ? { ...z, mode } : z)),
                        );
                      }}
                      className="border rounded px-2 py-1"
                    >
                      <option value="VAT">VAT</option>
                      <option value="OUTSIDE_VAT">OUTSIDE_VAT</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      disabled={!editingTax}
                      value={zone.standard_rate * 100}
                      onChange={(e) => {
                        const value = Number(e.target.value || 0) / 100;
                        setDraftTaxZones((prev) =>
                          prev.map((z) => (z.code === zone.code ? { ...z, standard_rate: value } : z)),
                        );
                      }}
                      className="border rounded px-2 py-1 w-24"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      disabled={!editingTax}
                      value={zone.customs_duty_rate * 100}
                      onChange={(e) => {
                        const value = Number(e.target.value || 0) / 100;
                        setDraftTaxZones((prev) =>
                          prev.map((z) => (z.code === zone.code ? { ...z, customs_duty_rate: value } : z)),
                        );
                      }}
                      className="border rounded px-2 py-1 w-24"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      disabled={!editingTax}
                      value={zone.notes || ''}
                      onChange={(e) => {
                        const notes = e.target.value;
                        setDraftTaxZones((prev) =>
                          prev.map((z) => (z.code === zone.code ? { ...z, notes } : z)),
                        );
                      }}
                      className="border rounded px-2 py-1 w-full"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
