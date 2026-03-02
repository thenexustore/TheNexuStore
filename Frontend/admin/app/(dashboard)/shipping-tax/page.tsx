"use client";

import { useEffect, useState } from 'react';
import { Loader2, Save, Truck, Landmark } from 'lucide-react';
import {
  fetchShippingZones,
  updateShippingZones,
  fetchTaxZones,
  updateTaxZones,
  type ShippingZone,
  type TaxZone,
} from '@/lib/api';
import { toast } from 'sonner';

export default function ShippingTaxPage() {
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [taxZones, setTaxZones] = useState<TaxZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingShipping, setSavingShipping] = useState(false);
  const [savingTax, setSavingTax] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [sz, tz] = await Promise.all([fetchShippingZones(), fetchTaxZones()]);
      setShippingZones(sz);
      setTaxZones(
        tz.map((z) => ({
          ...z,
          standard_rate: Number(z.standard_rate),
          customs_duty_rate: Number(z.customs_duty_rate || 0),
        })),
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to load shipping/tax zones');
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
      const updated = await updateShippingZones(shippingZones);
      setShippingZones(updated);
      toast.success('Shipping zones updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save shipping zones');
    } finally {
      setSavingShipping(false);
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
      toast.success('Tax/customs zones updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save tax zones');
    } finally {
      setSavingTax(false);
    }
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
          Enable/disable destinations for shipping and configure VAT + customs duty per zone.
        </p>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-zinc-500" />
            <h2 className="text-base font-semibold">Shipping destination availability</h2>
          </div>
          <button
            onClick={saveShipping}
            disabled={savingShipping}
            className="inline-flex items-center gap-2 rounded-lg bg-black text-white text-sm px-4 py-2 disabled:opacity-60"
          >
            {savingShipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save shipping zones
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-zinc-50">
                <th className="px-3 py-2 text-left">Zone</th>
                <th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-left">Shipping enabled</th>
              </tr>
            </thead>
            <tbody>
              {shippingZones.map((zone, idx) => (
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
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-zinc-500" />
            <h2 className="text-base font-semibold">Tax and customs by destination</h2>
          </div>
          <button
            onClick={saveTax}
            disabled={savingTax}
            className="inline-flex items-center gap-2 rounded-lg bg-black text-white text-sm px-4 py-2 disabled:opacity-60"
          >
            {savingTax ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save tax/customs zones
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-zinc-50">
                <th className="px-3 py-2 text-left">Zone</th>
                <th className="px-3 py-2 text-left">Enabled</th>
                <th className="px-3 py-2 text-left">Mode</th>
                <th className="px-3 py-2 text-left">Tax rate (%)</th>
                <th className="px-3 py-2 text-left">Customs duty (%)</th>
                <th className="px-3 py-2 text-left">Notes</th>
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
