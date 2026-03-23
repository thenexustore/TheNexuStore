"use client";

import { useEffect, useRef, useState } from "react";
import {
  ExternalLink,
  Pencil,
  ArrowLeftRight,
  X,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { SITE_URL } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SiteMapEntry = {
  id: string;
  name: string;
  path: string;
  visibleToCustomer: boolean;
  group: "primary" | "secondary";
};

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_ENTRIES: SiteMapEntry[] = [
  { id: "home", name: "Home", path: "/", visibleToCustomer: true, group: "primary" },
  { id: "categories", name: "Categorías", path: "/categories", visibleToCustomer: true, group: "primary" },
  { id: "products", name: "Productos", path: "/products", visibleToCustomer: true, group: "primary" },
  { id: "cart", name: "Carrito", path: "/cart", visibleToCustomer: true, group: "primary" },
  { id: "checkout", name: "Checkout", path: "/checkout", visibleToCustomer: true, group: "primary" },
  { id: "confirmation", name: "Confirmación", path: "/order/confirmation", visibleToCustomer: true, group: "primary" },
  { id: "contact", name: "Contacto", path: "/contact", visibleToCustomer: true, group: "primary" },
  { id: "account", name: "Cuenta", path: "/account", visibleToCustomer: true, group: "primary" },
  { id: "product-tal", name: "Producto: tal", path: "/products/tal", visibleToCustomer: false, group: "secondary" },
  { id: "faq", name: "FAQ", path: "/faq", visibleToCustomer: true, group: "secondary" },
  { id: "legal", name: "Legal", path: "/legal", visibleToCustomer: true, group: "secondary" },
  { id: "returns", name: "Devoluciones", path: "/returns", visibleToCustomer: true, group: "secondary" },
  { id: "blog", name: "Blog", path: "/blog", visibleToCustomer: true, group: "secondary" },
];

const STORAGE_KEY = "admin_site_map_v1";

function loadEntries(): SiteMapEntry[] {
  if (typeof window === "undefined") return DEFAULT_ENTRIES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ENTRIES;
    const parsed = JSON.parse(raw) as SiteMapEntry[];
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // ignore
  }
  return DEFAULT_ENTRIES;
}

function persistEntries(entries: SiteMapEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Edit modal
// ---------------------------------------------------------------------------

type EditModalProps = {
  entry: SiteMapEntry;
  onSave: (updated: SiteMapEntry) => void;
  onClose: () => void;
};

function EditModal({ entry, onSave, onClose }: EditModalProps) {
  const [name, setName] = useState(entry.name);
  const [path, setPath] = useState(entry.path);
  const [visible, setVisible] = useState(entry.visibleToCustomer);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    onSave({ ...entry, name: name.trim() || entry.name, path: path.trim() || entry.path, visibleToCustomer: visible });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-zinc-900">Editar página</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Nombre</label>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition"
              placeholder="Nombre de la página"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Ruta (path)</label>
            <input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition font-mono"
              placeholder="/ruta"
            />
          </div>

          <div
            onClick={() => setVisible(!visible)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-zinc-200 cursor-pointer hover:bg-zinc-50 transition select-none"
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                visible ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400"
              }`}
            >
              {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-800">Visible al cliente</p>
              <p className="text-xs text-zinc-400">{visible ? "Aparece en la tienda" : "No visible en navegación"}</p>
            </div>
            <div
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
                visible ? "border-emerald-500 bg-emerald-500" : "border-zinc-300 bg-white"
              }`}
            >
              {visible && <Check className="w-3 h-3 text-white" />}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-sm font-medium rounded-xl bg-zinc-900 text-white hover:bg-zinc-700 transition"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Entry card
// ---------------------------------------------------------------------------

type EntryCardProps = {
  entry: SiteMapEntry;
  onEdit: () => void;
  onMove: () => void;
};

function EntryCard({ entry, onEdit, onMove }: EntryCardProps) {
  const siteUrl = (SITE_URL ?? "").replace(/\/$/, "");

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-100 bg-white hover:border-zinc-200 hover:shadow-sm transition group">
      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-zinc-800 truncate">{entry.name}</span>
          {entry.visibleToCustomer && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
              <Eye className="w-3 h-3" />
              Visible cliente
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-400 font-mono mt-0.5 truncate">{entry.path}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
        <button
          onClick={() => window.open(`${siteUrl}${entry.path}`, "_blank")}
          title="Abrir en nueva pestaña"
          className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
        <button
          onClick={onEdit}
          title="Editar nombre y ruta"
          className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onMove}
          title={entry.group === "primary" ? "Mover a Secundarias" : "Mover a Principales"}
          className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition"
        >
          <ArrowLeftRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column
// ---------------------------------------------------------------------------

type ColumnProps = {
  title: string;
  subtitle: string;
  entries: SiteMapEntry[];
  onEdit: (entry: SiteMapEntry) => void;
  onMove: (entry: SiteMapEntry) => void;
};

function Column({ title, subtitle, entries, onEdit, onMove }: ColumnProps) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>
      </div>
      <div className="flex flex-col gap-2">
        {entries.length === 0 && (
          <div className="flex items-center justify-center h-20 rounded-xl border border-dashed border-zinc-200 text-xs text-zinc-400">
            Sin páginas en este grupo
          </div>
        )}
        {entries.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            onEdit={() => onEdit(entry)}
            onMove={() => onMove(entry)}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SiteMapPage() {
  const [entries, setEntries] = useState<SiteMapEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<SiteMapEntry | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  const update = (next: SiteMapEntry[]) => {
    setEntries(next);
    persistEntries(next);
  };

  const handleEdit = (entry: SiteMapEntry) => setEditingEntry(entry);

  const handleSave = (updated: SiteMapEntry) => {
    update(entries.map((e) => (e.id === updated.id ? updated : e)));
    setEditingEntry(null);
  };

  const handleMove = (entry: SiteMapEntry) => {
    update(
      entries.map((e) =>
        e.id === entry.id
          ? { ...e, group: e.group === "primary" ? "secondary" : "primary" }
          : e
      )
    );
  };

  const primary = entries.filter((e) => e.group === "primary");
  const secondary = entries.filter((e) => e.group === "secondary");

  return (
    <>
      {editingEntry && (
        <EditModal
          entry={editingEntry}
          onSave={handleSave}
          onClose={() => setEditingEntry(null)}
        />
      )}

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Mapa Web</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Visualiza y gestiona las páginas del ecommerce. Usa{" "}
            <span className="font-mono text-xs bg-zinc-100 px-1.5 py-0.5 rounded">Abrir</span> para
            comprobar que una página carga correctamente, y{" "}
            <span className="font-mono text-xs bg-zinc-100 px-1.5 py-0.5 rounded">Editar</span> para
            ajustar su nombre o ruta.
          </p>
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-zinc-100 p-5 shadow-sm">
            <Column
              title="Principales"
              subtitle="Páginas clave del flujo de compra y navegación del cliente"
              entries={primary}
              onEdit={handleEdit}
              onMove={handleMove}
            />
          </div>

          <div className="bg-white rounded-2xl border border-zinc-100 p-5 shadow-sm">
            <Column
              title="Secundarias"
              subtitle="Páginas de soporte, legales o de nicho con menor tráfico"
              entries={secondary}
              onEdit={handleEdit}
              onMove={handleMove}
            />
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" /> Abrir página
          </span>
          <span className="flex items-center gap-1.5">
            <Pencil className="w-3.5 h-3.5" /> Editar nombre / ruta
          </span>
          <span className="flex items-center gap-1.5">
            <ArrowLeftRight className="w-3.5 h-3.5" /> Mover entre listas
          </span>
        </div>
      </div>
    </>
  );
}
