"use client";

import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CreditCard,
  Headset,
  RefreshCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { API_URL } from "../../lib/env";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  shield: ShieldCheck,
  truck: Truck,
  "refresh-ccw": RefreshCcw,
  headset: Headset,
  card: CreditCard,
  payment: CreditCard,
  badge: BadgeCheck,
};

interface TrustItem {
  icon?: string;
  text?: string;
  label?: string;
  description?: string;
}

function parseTrustItems(payload: unknown): TrustItem[] {
  if (!payload || typeof payload !== "object") return [];
  const data = payload as Record<string, unknown>;

  if (Array.isArray(data.items)) return data.items as TrustItem[];

  if (data.data && typeof data.data === "object") {
    const nested = data.data as Record<string, unknown>;
    if (Array.isArray(nested.items)) return nested.items as TrustItem[];
  }

  return [];
}

export default function TrustBar({ items }: { items: TrustItem[] }) {
  const [remoteItems, setRemoteItems] = useState<TrustItem[]>([]);

  useEffect(() => {
    if (items.length > 0) return;

    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/trust-items`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const payload = await res.json().catch(() => null);
        setRemoteItems(parseTrustItems(payload));
      } catch {
        setRemoteItems([]);
      }
    };

    load();
  }, [items]);

  const sourceItems = useMemo(
    () => (items.length ? items : remoteItems),
    [items, remoteItems],
  );

  if (!sourceItems.length) return null;

  return (
    <section className="w-full px-4 sm:px-6" aria-label="Elementos de confianza">
      <div className="flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-3">
        {sourceItems.map((item, idx) => {
          const Icon = ICONS[item.icon || "shield"] || ShieldCheck;
          const label = item.label || item.text || "Confianza";
          return (
            <article
              key={`${label}-${idx}`}
              className="flex min-w-[220px] items-center gap-2 rounded-lg bg-slate-50 px-3 py-2"
            >
              <Icon className="h-4 w-4 shrink-0 text-slate-700" />
              <div>
                <p className="text-sm font-semibold text-slate-800">{label}</p>
                {item.description ? (
                  <p className="text-xs text-slate-500">{item.description}</p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
