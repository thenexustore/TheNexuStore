"use client";

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Save, Trash2, Truck, Landmark } from 'lucide-react';
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

const ZONE_ORDER = [
  'ES_PENINSULA_BALEARES',
  'PT',
  'AD',
  'CANARY_ISLANDS',
  'CEUTA',
  'MELILLA',
  'OTHER',
];

export default function ShippingTaxPage() {
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [shippingRules, setShippingRules] = useState<ShippingRule[]>([]);
  const [taxZones, setTaxZones] = useState<TaxZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingShipping, setSavingShipping] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [savingTax, setSavingTax] = useState(false);

  const sortedZones = useMemo(
    () =>
      [...shippingZones].sort(
        (a, b) => ZONE_ORDER.indexOf(a.code) - ZONE_ORDER.indexOf(b.code),
      ),
    [shippingZones],
  );

  const rulesByZone = useMemo(() => {
    const groups = new Map<string, ShippingRule[]>();
    for (const z of ZONE_ORDER) groups.set(z, []);
    for (const r of shippingRules) {
      const list = groups.get(r.zone_code) ?? [];
      list.push(r);
      groups.set(r.zone_code, list);
    }

    for (const [, list] of groups.entries()) {
      list.sort((a, b) => a.priority - b.priority);
    }

    return groups;
  }, [shippingRules]);

  const load = async () => {
    try {
      setLoading(true);
      const [sz, sr, tz] = await Promise.all([
        fetchShippingZones(),
        fetchShippingRules(),
        fetchTaxZones(),
      ]);
      setShippingZones(sz);
      setShippingRules(
        sr.map((r) => ({
          ...r,
          min_base_excl_tax: Number(r.min_base_excl_tax),
          max_base_excl_tax:
            r.max_base_excl_tax === null || r.max_base_excl_tax === undefined
              ? null
              : Number(r.max_base_excl_tax),
          shipping_base_excl_tax: Number(r.shipping_base_excl_tax),
          priority: Number(r.priority),
        })),
      );
      setTaxZones(
        tz.map((z) => ({
          ...z,
          standard_rate: Number(z.standard_rate),
          customs_duty_rate: Number(z.customs_duty_rate || 0),
        })),
      );
    } catch (err: any) {
      toast.error(err.message || 'No se pudieron cargar los valores de shipping/tax');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveShipping = async () => {
    try {
      setSavingShipping(true);
      const updated = await updateShippingZones(sortedZones);
      setShippingZones(updated);
      toast.success('Destinos de envío guardados');
    } catch (err: any) {
      toast.error(err.message || 'No se pudieron guardar zonas de envío');
    } finally {
      setSavingShipping(false);
    }
  };

  const saveRules = async () => {
    try {
      setSavingRules(true);
      const prepared = shippingRules
        .map((r) => ({
          ...r,
          min_base_excl_tax: Number(r.min_base_excl_tax),
          max_base_excl_tax:
            r.max_base_excl_tax === null || r.max_base_excl_tax === undefined
              ? null
              : Number(r.max_base_excl_tax),
          shipping_base_excl_tax: Number(r.shipping_base_excl_tax),
          priority: Number(r.priority),
        }))
        .sort((a, b) =>
          a.zone_code === b.zone_code
            ? a.priority - b.priority
            : a.zone_code.localeCompare(b.zone_code),
        );

      const updated = await updateShippingRules(prepared);
      setShippingRules(
        updated.map((r) => ({
          ...r,
          min_base_excl_tax: Number(r.min_base_excl_tax),
          max_base_excl_tax:
            r.max_base_excl_tax === null || r.max_base_excl_tax === undefined
              ? null
              : Number(r.max_base_excl_tax),
          shipping_base_excl_tax: Number(r.shipping_base_excl_tax),
          priority: Number(r.priority),
        })),
      );
      toast.success('Tramos de envío guardados');
    } catch (err: any) {
      toast.error(err.message || 'No se pudieron guardar los tramos de envío');
    } finally {
      setSavingRules(false);
    }
  };

  const saveTax = async () => {
    try {
      setSavingTax(true);
      const updated = await updateTaxZones(
        taxZones.map((z) => ({
          ...z,
          standard_rate: Number(z.standard_rate),
          customs_duty_rate: Number(z.customs_duty_rate || 0),
        })),
      );
      setTaxZones(
        updated.map((z) => ({
          ...z,
          standard_rate: Number(z.standard_rate),
          customs_duty_rate: Number(z.customs_duty_rate || 0),
        })),
      );
      toast.success('Zonas fiscales y aduanas guardadas');
    } catch (err: any) {
      toast.error(err.message || 'No se pudieron guardar zonas fiscales');
    } finally {
      setSavingTax(false);
    }
  };

  const addRule = (zoneCode: string) => {
    const zoneRules = shippingRules.filter((r) => r.zone_code === zoneCode);
    const maxPriority = zoneRules.length
      ? Math.max(...zoneRules.map((r) => r.priority))
      : 0;
    setShippingRules((prev) => [
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
    setShippingRules((prev) =>
      prev.filter((r) => !(r.zone_code === zoneCode && r.priority === priority)),
    );
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
          Ahora puedes ver, editar y guardar zonas, tramos de envío y tasas/adunas.
        </p>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-zinc-500" />
            <h2 className="text-base font-semibold">Disponibilidad de envío por destino</h2>
          </div>
          <button
            onClick={saveShipping}
            disabled={savingShipping}
            className="inline-flex items-center gap-2 rounded-lg bg-black text-white text-sm px-4 py-2 disabled:opacity-60"
          >
            {savingShipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar zonas
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-zinc-50">
                <th className="px-3 py-2 text-left">Zona</th>
                <th className="px-3 py-2 text-left">Descripción</th>
                <th className="px-3 py-2 text-left">Envío habilitado</th>
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
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setShippingZones((prev) =>
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
          <h2 className="text-base font-semibold">Tramos de envío (editable)</h2>
          <button
            onClick={saveRules}
            disabled={savingRules}
            className="inline-flex items-center gap-2 rounded-lg bg-black text-white text-sm px-4 py-2 disabled:opacity-60"
          >
            {savingRules ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar tramos
          </button>
        </div>

        <div className="space-y-5">
          {ZONE_ORDER.map((zoneCode) => {
            const zoneRules = rulesByZone.get(zoneCode) || [];
            return (
              <div key={zoneCode} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">{zoneCode}</h3>
                  <button
                    onClick={() => addRule(zoneCode)}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border hover:bg-zinc-50"
                  >
                    <Plus className="w-3 h-3" /> Añadir tramo
                  </button>
                </div>

                {zoneRules.length === 0 ? (
                  <p className="text-xs text-zinc-500">Sin tramos definidos.</p>
                ) : (
                  <div className="space-y-2">
                    {zoneRules.map((rule, idx) => (
                      <div key={`${zoneCode}-${idx}`} className="grid grid-cols-12 gap-2 items-center">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={rule.min_base_excl_tax}
                          onChange={(e) => {
                            const value = Number(e.target.value || 0);
                            setShippingRules((prev) =>
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
                          value={rule.max_base_excl_tax ?? ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const value = raw === '' ? null : Number(raw);
                            setShippingRules((prev) =>
                              prev.map((r) =>
                                r.zone_code === zoneCode && r.priority === rule.priority
                                  ? { ...r, max_base_excl_tax: value }
                                  : r,
                              ),
                            );
                          }}
                          className="col-span-2 border rounded px-2 py-1 text-sm"
                          placeholder="Max (vacío = infinito)"
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={rule.shipping_base_excl_tax}
                          onChange={(e) => {
                            const value = Number(e.target.value || 0);
                            setShippingRules((prev) =>
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
                          value={rule.priority}
                          onChange={(e) => {
                            const value = Number(e.target.value || 1);
                            setShippingRules((prev) =>
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
                          value={rule.currency}
                          onChange={(e) => {
                            const value = e.target.value;
                            setShippingRules((prev) =>
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
                          className="col-span-2 inline-flex items-center justify-center gap-1 text-xs px-2 py-1 rounded border text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" /> Borrar
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
            <h2 className="text-base font-semibold">Impuestos y aduanas por destino</h2>
          </div>
          <button
            onClick={saveTax}
            disabled={savingTax}
            className="inline-flex items-center gap-2 rounded-lg bg-black text-white text-sm px-4 py-2 disabled:opacity-60"
          >
            {savingTax ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar impuestos
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-zinc-50">
                <th className="px-3 py-2 text-left">Zona</th>
                <th className="px-3 py-2 text-left">Enabled</th>
                <th className="px-3 py-2 text-left">Modo</th>
                <th className="px-3 py-2 text-left">Tax rate (%)</th>
                <th className="px-3 py-2 text-left">Customs duty (%)</th>
                <th className="px-3 py-2 text-left">Notas</th>
              </tr>
            </thead>
            <tbody>
              {taxZones.map((zone, idx) => (
                <tr key={zone.code} className={idx % 2 ? 'bg-zinc-50/40' : ''}>
                  <td className="px-3 py-2 font-medium">{zone.code}</td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={zone.enabled}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setTaxZones((prev) =>
                          prev.map((z) => (z.code === zone.code ? { ...z, enabled: checked } : z)),
                        );
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={zone.mode}
                      onChange={(e) => {
                        const mode = e.target.value as 'VAT' | 'OUTSIDE_VAT';
                        setTaxZones((prev) =>
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
                      value={zone.standard_rate * 100}
                      onChange={(e) => {
                        const value = Number(e.target.value || 0) / 100;
                        setTaxZones((prev) =>
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
                      value={zone.customs_duty_rate * 100}
                      onChange={(e) => {
                        const value = Number(e.target.value || 0) / 100;
                        setTaxZones((prev) =>
                          prev.map((z) => (z.code === zone.code ? { ...z, customs_duty_rate: value } : z)),
                        );
                      }}
                      className="border rounded px-2 py-1 w-24"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={zone.notes || ''}
                      onChange={(e) => {
                        const notes = e.target.value;
                        setTaxZones((prev) =>
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
