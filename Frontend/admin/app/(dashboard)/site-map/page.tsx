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
  Trash2,
  Plus,
  RotateCcw,
  Globe,
  LayoutGrid,
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
// Defaults  (bumped to v2 — ~30 realistic ecommerce pages)
// ---------------------------------------------------------------------------

const DEFAULT_ENTRIES: SiteMapEntry[] = [
  // ── Principales ──────────────────────────────────────────────────────────
  { id: "home",             name: "Home",                    path: "/",                      visibleToCustomer: true,  group: "primary" },
  { id: "categories",       name: "Categorías",              path: "/categories",            visibleToCustomer: true,  group: "primary" },
  { id: "products",         name: "Productos",               path: "/products",              visibleToCustomer: true,  group: "primary" },
  { id: "search",           name: "Búsqueda",                path: "/search",                visibleToCustomer: true,  group: "primary" },
  { id: "cart",             name: "Carrito",                 path: "/cart",                  visibleToCustomer: true,  group: "primary" },
  { id: "checkout",         name: "Checkout",                path: "/checkout",              visibleToCustomer: true,  group: "primary" },
  { id: "confirmation",     name: "Confirmación de pedido",  path: "/order/confirmation",    visibleToCustomer: true,  group: "primary" },
  { id: "order-track",      name: "Seguimiento de pedido",   path: "/order/track",           visibleToCustomer: true,  group: "primary" },
  { id: "contact",          name: "Contacto",                path: "/contact",               visibleToCustomer: true,  group: "primary" },
  { id: "account",          name: "Mi cuenta",               path: "/account",               visibleToCustomer: true,  group: "primary" },
  { id: "account-orders",   name: "Mis pedidos",             path: "/account/orders",        visibleToCustomer: true,  group: "primary" },
  { id: "account-profile",  name: "Perfil",                  path: "/account/profile",       visibleToCustomer: true,  group: "primary" },
  { id: "login",            name: "Login",                   path: "/login",                 visibleToCustomer: true,  group: "primary" },
  { id: "register",         name: "Registro",                path: "/register",              visibleToCustomer: true,  group: "primary" },
  { id: "forgot-password",  name: "Recuperar contraseña",    path: "/forgot-password",       visibleToCustomer: true,  group: "primary" },

  // ── Secundarias ──────────────────────────────────────────────────────────
  { id: "product-example",  name: "Producto: [slug]",        path: "/products/[slug]",       visibleToCustomer: false, group: "secondary" },
  { id: "category-example", name: "Categoría: [slug]",       path: "/categories/[slug]",     visibleToCustomer: false, group: "secondary" },
  { id: "order-detail",     name: "Detalle de pedido",       path: "/account/orders/[id]",   visibleToCustomer: false, group: "secondary" },
  { id: "reset-password",   name: "Resetear contraseña",     path: "/reset-password",        visibleToCustomer: false, group: "secondary" },
  { id: "faq",              name: "FAQ",                     path: "/faq",                   visibleToCustomer: true,  group: "secondary" },
  { id: "about",            name: "Sobre nosotros",          path: "/about",                 visibleToCustomer: true,  group: "secondary" },
  { id: "blog",             name: "Blog",                    path: "/blog",                  visibleToCustomer: true,  group: "secondary" },
  { id: "blog-post",        name: "Artículo blog: [slug]",   path: "/blog/[slug]",           visibleToCustomer: false, group: "secondary" },
  { id: "shipping-info",    name: "Información de envíos",   path: "/shipping",              visibleToCustomer: true,  group: "secondary" },
  { id: "returns",          name: "Devoluciones",            path: "/returns",               visibleToCustomer: true,  group: "secondary" },
  { id: "privacy",          name: "Política de privacidad",  path: "/privacy",               visibleToCustomer: true,  group: "secondary" },
  { id: "cookies",          name: "Política de cookies",     path: "/cookies",               visibleToCustomer: true,  group: "secondary" },
  { id: "legal",            name: "Aviso legal",             path: "/legal",                 visibleToCustomer: true,  group: "secondary" },
  { id: "terms",            name: "Términos y condiciones",  path: "/terms",                 visibleToCustomer: true,  group: "secondary" },
  { id: "not-found",        name: "Página 404",              path: "/404",                   visibleToCustomer: false, group: "secondary" },
];

const STORAGE_KEY_V1 = "admin_site_map_v1";
const STORAGE_KEY    = "admin_site_map_v2";

/** Detect Next.js dynamic segments like [slug] or [...slug] */
const DYNAMIC_SEGMENT_RE = /\[.+?\]/;

function loadEntries(): SiteMapEntry[] {
  if (typeof window === "undefined") return DEFAULT_ENTRIES;
  try {
    // Load v2 if present
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SiteMapEntry[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }

    // Migrate from v1: merge user-customised entries into the new defaults
    const rawV1 = localStorage.getItem(STORAGE_KEY_V1);
    if (rawV1) {
      const v1 = JSON.parse(rawV1) as SiteMapEntry[];
      if (Array.isArray(v1) && v1.length > 0) {
        // Keep v1 customisations; append new default entries whose ids don't exist in v1
        const v1Ids = new Set(v1.map((e) => e.id));
        const extra = DEFAULT_ENTRIES.filter((e) => !v1Ids.has(e.id));
        const merged = [...v1, ...extra];
        persistEntries(merged);
        return merged;
      }
    }
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

function generateId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `page-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }
}

// ---------------------------------------------------------------------------
// Add/Edit modal
// ---------------------------------------------------------------------------

type EditModalProps = {
  entry: SiteMapEntry;
  isNew?: boolean;
  onSave: (updated: SiteMapEntry) => void;
  onClose: () => void;
};

function EditModal({ entry, isNew = false, onSave, onClose }: EditModalProps) {
  const [name, setName] = useState(entry.name);
  const [path, setPath] = useState(entry.path);
  const [visible, setVisible] = useState(entry.visibleToCustomer);
  const [group, setGroup] = useState<"primary" | "secondary">(entry.group);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedPath = path.trim();
    if (!trimmedName || !trimmedPath) return;
    onSave({ ...entry, name: trimmedName, path: trimmedPath, visibleToCustomer: visible, group });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-zinc-900">
            {isNew ? "Nueva página" : "Editar página"}
          </h2>
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
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Ruta (path)</label>
            <input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition font-mono"
              placeholder="/ruta"
              required
            />
          </div>

          {/* Group selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Grupo</label>
            <div className="grid grid-cols-2 gap-2">
              {(["primary", "secondary"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGroup(g)}
                  className={`px-3 py-2 text-xs font-medium rounded-xl border transition ${
                    group === g
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  {g === "primary" ? "Principales" : "Secundarias"}
                </button>
              ))}
            </div>
          </div>

          {/* Visible toggle */}
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
              {isNew ? "Añadir" : "Guardar"}
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
  onDelete: () => void;
};

function EntryCard({ entry, onEdit, onMove, onDelete }: EntryCardProps) {
  const siteUrl = (SITE_URL ?? "").replace(/\/$/, "");
  const isDynamic = DYNAMIC_SEGMENT_RE.test(entry.path);

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-100 bg-white hover:border-zinc-200 hover:shadow-sm transition group">
      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-zinc-800 truncate">{entry.name}</span>
          {entry.visibleToCustomer && !isDynamic && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
              <Eye className="w-3 h-3" />
              Visible
            </span>
          )}
          {isDynamic && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-100 shrink-0">
              Dinámica
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-400 font-mono mt-0.5 truncate">{entry.path}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition">
        {!isDynamic && (
          <button
            onClick={() => window.open(`${siteUrl}${entry.path}`, "_blank")}
            title="Abrir en nueva pestaña"
            className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onEdit}
          title="Editar"
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
        <button
          onClick={onDelete}
          title="Eliminar"
          className="p-2 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition"
        >
          <Trash2 className="w-4 h-4" />
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
  count: number;
  entries: SiteMapEntry[];
  onEdit: (entry: SiteMapEntry) => void;
  onMove: (entry: SiteMapEntry) => void;
  onDelete: (entry: SiteMapEntry) => void;
  onAdd: () => void;
};

function Column({ title, subtitle, count, entries, onEdit, onMove, onDelete, onAdd }: ColumnProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Column header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-100 text-zinc-500 text-xs font-medium">
              {count}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>
        </div>
        <button
          onClick={onAdd}
          title={`Añadir página a ${title}`}
          className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Entries */}
      <div className="flex flex-col gap-2">
        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center h-20 rounded-xl border border-dashed border-zinc-200 text-xs text-zinc-400 gap-1">
            <span>Sin páginas en este grupo</span>
            <button
              onClick={onAdd}
              className="text-zinc-500 hover:text-zinc-800 underline underline-offset-2 transition"
            >
              Añadir primera
            </button>
          </div>
        )}
        {entries.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            onEdit={() => onEdit(entry)}
            onMove={() => onMove(entry)}
            onDelete={() => onDelete(entry)}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type ModalState =
  | { type: "edit"; entry: SiteMapEntry }
  | { type: "new"; group: "primary" | "secondary" }
  | null;

export default function SiteMapPage() {
  const [entries, setEntries] = useState<SiteMapEntry[]>([]);
  const [modal, setModal] = useState<ModalState>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  const update = (next: SiteMapEntry[]) => {
    setEntries(next);
    persistEntries(next);
  };

  const handleSave = (updated: SiteMapEntry) => {
    if (modal?.type === "new") {
      update([...entries, updated]);
    } else {
      update(entries.map((e) => (e.id === updated.id ? updated : e)));
    }
    setModal(null);
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

  const handleDelete = (entry: SiteMapEntry) => {
    update(entries.filter((e) => e.id !== entry.id));
  };

  const handleReset = () => {
    update(DEFAULT_ENTRIES);
    setConfirmReset(false);
  };

  const primary   = entries.filter((e) => e.group === "primary");
  const secondary = entries.filter((e) => e.group === "secondary");
  const visibleCount = entries.filter((e) => e.visibleToCustomer && !DYNAMIC_SEGMENT_RE.test(e.path)).length;

  // Build modal entry for "new"
  const modalEntry: SiteMapEntry | null =
    modal?.type === "edit"
      ? modal.entry
      : modal?.type === "new"
      ? { id: generateId(), name: "", path: "/", visibleToCustomer: true, group: modal.group }
      : null;

  return (
    <>
      {modal && modalEntry && (
        <EditModal
          entry={modalEntry}
          isNew={modal.type === "new"}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {/* Reset confirm overlay */}
      {confirmReset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setConfirmReset(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-zinc-900 mb-2">Restaurar valores por defecto</h2>
            <p className="text-sm text-zinc-500 mb-5">
              Se perderán todos los cambios personalizados. ¿Continuar?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-xl bg-red-600 text-white hover:bg-red-700 transition"
              >
                Restaurar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Mapa Web</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Visualiza y gestiona las páginas del ecommerce. Pasa el cursor sobre cada fila para ver las acciones.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setModal({ type: "new", group: "primary" })}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl bg-zinc-900 text-white hover:bg-zinc-700 transition"
            >
              <Plus className="w-4 h-4" />
              Nueva página
            </button>
            <button
              onClick={() => setConfirmReset(true)}
              title="Restaurar valores por defecto"
              className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-500 hover:text-zinc-800 transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-zinc-100 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-zinc-500" />
            </div>
            <div>
              <p className="text-lg font-semibold text-zinc-900 leading-none">{entries.length}</p>
              <p className="text-xs text-zinc-400 mt-0.5">Páginas totales</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-zinc-100 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Eye className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-zinc-900 leading-none">{visibleCount}</p>
              <p className="text-xs text-zinc-400 mt-0.5">Visibles al cliente</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-zinc-100 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <Globe className="w-4 h-4 text-violet-500" />
            </div>
            <div>
              <p className="text-lg font-semibold text-zinc-900 leading-none">
                {entries.filter((e) => DYNAMIC_SEGMENT_RE.test(e.path)).length}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">Rutas dinámicas</p>
            </div>
          </div>
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-zinc-100 p-5 shadow-sm">
            <Column
              title="Principales"
              subtitle="Flujo de compra y navegación principal del cliente"
              count={primary.length}
              entries={primary}
              onEdit={(entry) => setModal({ type: "edit", entry })}
              onMove={handleMove}
              onDelete={handleDelete}
              onAdd={() => setModal({ type: "new", group: "primary" })}
            />
          </div>

          <div className="bg-white rounded-2xl border border-zinc-100 p-5 shadow-sm">
            <Column
              title="Secundarias"
              subtitle="Soporte, legales, rutas dinámicas y páginas de nicho"
              count={secondary.length}
              entries={secondary}
              onEdit={(entry) => setModal({ type: "edit", entry })}
              onMove={handleMove}
              onDelete={handleDelete}
              onAdd={() => setModal({ type: "new", group: "secondary" })}
            />
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> Abrir en nueva pestaña</span>
          <span className="flex items-center gap-1.5"><Pencil className="w-3.5 h-3.5" /> Editar nombre, ruta o grupo</span>
          <span className="flex items-center gap-1.5"><ArrowLeftRight className="w-3.5 h-3.5" /> Mover entre listas</span>
          <span className="flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> Eliminar entrada</span>
        </div>
      </div>
    </>
  );
}
