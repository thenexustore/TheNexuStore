"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  // per-entry icons
  Home,
  Layers,
  Package,
  Search,
  ShoppingCart,
  CreditCard,
  ClipboardList,
  MessageSquare,
  User,
  LogIn,
  UserPlus,
  KeyRound,
  HelpCircle,
  Info,
  BookOpen,
  Truck,
  Shield,
  AlertTriangle,
  FileText,
  Copy,
  CheckCheck,
  Map,
  Sparkles,
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
// Route-to-icon mapping
// ---------------------------------------------------------------------------

type LucideIcon = React.ComponentType<{ className?: string }>;

function iconForPath(path: string): LucideIcon {
  if (path === "/") return Home;
  if (path.startsWith("/categories")) return Layers;
  if (path.startsWith("/products")) return Package;
  if (path.startsWith("/search")) return Search;
  if (path.startsWith("/cart")) return ShoppingCart;
  if (path.startsWith("/checkout")) return CreditCard;
  if (path.startsWith("/order") || path.startsWith("/account/orders")) return ClipboardList;
  if (path.startsWith("/contact")) return MessageSquare;
  if (path.startsWith("/account")) return User;
  if (path.startsWith("/login")) return LogIn;
  if (path.startsWith("/register")) return UserPlus;
  if (path.startsWith("/forgot-password") || path.startsWith("/reset-password")) return KeyRound;
  if (path.startsWith("/faq")) return HelpCircle;
  if (path.startsWith("/about")) return Info;
  if (path.startsWith("/blog")) return BookOpen;
  if (path.startsWith("/shipping")) return Truck;
  if (path.startsWith("/returns")) return RotateCcw;
  if (path.startsWith("/privacy") || path.startsWith("/cookies") || path.startsWith("/legal") || path.startsWith("/terms")) return Shield;
  if (path === "/404") return AlertTriangle;
  return FileText;
}

/** Icon background color by group */
function iconBgForGroup(group: "primary" | "secondary"): string {
  return group === "primary"
    ? "bg-blue-50 text-blue-600"
    : "bg-violet-50 text-violet-600";
}

// ---------------------------------------------------------------------------
// Toast helper
// ---------------------------------------------------------------------------

type Toast = { id: string; message: string; type: "success" | "info" };

function ToastList({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${
            t.type === "success" ? "bg-zinc-900" : "bg-zinc-700"
          }`}
        >
          <CheckCheck className="w-4 h-4 shrink-0" />
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add/Edit modal  (polished)
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
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedPath = path.trim();
    if (!trimmedName || !trimmedPath) return;
    onSave({ ...entry, name: trimmedName, path: trimmedPath, visibleToCustomer: visible, group });
  };

  const PreviewIcon = iconForPath(path);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md mx-0 sm:mx-4 overflow-hidden">
        {/* Modal header with gradient top strip */}
        <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-violet-500 to-indigo-500" />

        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBgForGroup(group)}`}>
              <PreviewIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-zinc-900 leading-tight">
                {isNew ? "Nueva página" : "Editar página"}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">{name.trim() || "Sin nombre"}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                Nombre
              </label>
              <input
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-zinc-50 focus:bg-white"
                placeholder="Nombre de la página"
                required
              />
            </div>

            {/* Path */}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                Ruta (path)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-mono select-none pointer-events-none">
                  {(SITE_URL ?? "").replace(/\/$/, "")}
                </span>
                <input
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  className="w-full pl-[calc(0.75rem+var(--site-prefix-len,0px))] pr-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition font-mono bg-zinc-50 focus:bg-white"
                  style={{ paddingLeft: `${(SITE_URL ?? "").replace(/\/$/, "").length * 6.5 + 12}px` }}
                  placeholder="/ruta"
                  required
                />
              </div>
              {path.trim() && (
                <p className="text-xs text-zinc-400 font-mono mt-1 truncate">
                  → {(SITE_URL ?? "").replace(/\/$/, "")}{path.trim()}
                </p>
              )}
            </div>

            {/* Group selector */}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                Grupo
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["primary", "secondary"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGroup(g)}
                    className={`px-3 py-2.5 text-xs font-semibold rounded-xl border transition flex items-center justify-center gap-1.5 ${
                      group === g
                        ? g === "primary"
                          ? "border-blue-500 bg-blue-500 text-white"
                          : "border-violet-500 bg-violet-500 text-white"
                        : "border-zinc-200 text-zinc-500 hover:bg-zinc-50 bg-zinc-50"
                    }`}
                  >
                    {g === "primary" ? (
                      <><span className="w-2 h-2 rounded-full bg-current opacity-80" />Principales</>
                    ) : (
                      <><span className="w-2 h-2 rounded-full bg-current opacity-80" />Secundarias</>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Visible toggle */}
            <button
              type="button"
              onClick={() => setVisible(!visible)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition select-none ${
                visible
                  ? "border-emerald-200 bg-emerald-50/60"
                  : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100/70"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition shrink-0 ${
                  visible ? "bg-emerald-100 text-emerald-600" : "bg-zinc-200 text-zinc-400"
                }`}
              >
                {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className={`text-sm font-semibold ${visible ? "text-emerald-800" : "text-zinc-600"}`}>
                  {visible ? "Visible al cliente" : "Oculta al cliente"}
                </p>
                <p className={`text-xs mt-0.5 ${visible ? "text-emerald-600" : "text-zinc-400"}`}>
                  {visible ? "Aparece en la navegación de la tienda" : "No aparece en la navegación pública"}
                </p>
              </div>
              <div
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition shrink-0 ${
                  visible ? "border-emerald-500 bg-emerald-500" : "border-zinc-300 bg-white"
                }`}
              >
                {visible && <Check className="w-3.5 h-3.5 text-white" />}
              </div>
            </button>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl text-white transition ${
                  group === "primary"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-violet-600 hover:bg-violet-700"
                }`}
              >
                {isNew ? "Añadir página" : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Entry card  (modern, with icon, copy-path, left accent)
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
  const [copied, setCopied] = useState(false);
  const EntryIcon = iconForPath(entry.path);

  const handleCopy = (e: { stopPropagation(): void }) => {
    e.stopPropagation();
    navigator.clipboard.writeText(entry.path).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  const accentColor = entry.group === "primary" ? "bg-blue-400" : "bg-violet-400";
  const iconBg = entry.group === "primary" ? "bg-blue-50 text-blue-500" : "bg-violet-50 text-violet-500";
  const dimmed = !entry.visibleToCustomer && !isDynamic;

  return (
    <div
      className={`relative flex items-center gap-3 pl-3 pr-4 py-3 rounded-xl border bg-white transition-all group hover:shadow-md hover:-translate-y-px ${
        dimmed
          ? "border-zinc-100 hover:border-zinc-200"
          : entry.group === "primary"
          ? "border-blue-100 hover:border-blue-200"
          : "border-violet-100 hover:border-violet-200"
      }`}
    >
      {/* Left accent strip */}
      <div className={`absolute left-0 top-2 bottom-2 w-1 rounded-full ${accentColor} opacity-60`} />

      {/* Icon */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg} ${dimmed ? "opacity-50" : ""}`}>
        <EntryIcon className="w-4 h-4" />
      </div>

      {/* Text */}
      <div className={`flex-1 min-w-0 ${dimmed ? "opacity-60" : ""}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-zinc-800 truncate">{entry.name}</span>
          {entry.visibleToCustomer && !isDynamic && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0 uppercase tracking-wide">
              <Eye className="w-2.5 h-2.5" />
              Pública
            </span>
          )}
          {!entry.visibleToCustomer && !isDynamic && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-100 text-zinc-500 border border-zinc-200 shrink-0 uppercase tracking-wide">
              <EyeOff className="w-2.5 h-2.5" />
              Oculta
            </span>
          )}
          {isDynamic && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100 shrink-0 uppercase tracking-wide">
              Dinámica
            </span>
          )}
        </div>
        <p className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate">{entry.path}</p>
      </div>

      {/* Actions — visible on hover */}
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleCopy}
          title="Copiar ruta"
          className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition"
        >
          {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        {!isDynamic && (
          <button
            onClick={() => window.open(`${siteUrl}${entry.path}`, "_blank")}
            title="Abrir en nueva pestaña"
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={onEdit}
          title="Editar"
          className="p-1.5 rounded-lg hover:bg-blue-50 text-zinc-400 hover:text-blue-600 transition"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onMove}
          title={entry.group === "primary" ? "Mover a Secundarias" : "Mover a Principales"}
          className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          title="Eliminar"
          className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column  (colored theme per group)
// ---------------------------------------------------------------------------

type ColumnProps = {
  title: string;
  subtitle: string;
  count: number;
  colorTheme: "blue" | "violet";
  entries: SiteMapEntry[];
  onEdit: (entry: SiteMapEntry) => void;
  onMove: (entry: SiteMapEntry) => void;
  onDelete: (entry: SiteMapEntry) => void;
  onAdd: () => void;
};

function Column({ title, subtitle, count, colorTheme, entries, onEdit, onMove, onDelete, onAdd }: ColumnProps) {
  const headerBg   = colorTheme === "blue"   ? "bg-blue-50 border-blue-100"   : "bg-violet-50 border-violet-100";
  const headerText = colorTheme === "blue"   ? "text-blue-800"                : "text-violet-800";
  const countBg    = colorTheme === "blue"   ? "bg-blue-100 text-blue-700"    : "bg-violet-100 text-violet-700";
  const btnHover   = colorTheme === "blue"   ? "hover:bg-blue-100 hover:text-blue-700" : "hover:bg-violet-100 hover:text-violet-700";
  const dotColor   = colorTheme === "blue"   ? "bg-blue-400"                  : "bg-violet-400";

  return (
    <div className="flex flex-col gap-0">
      {/* Column header */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-t-xl border ${headerBg}`}>
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-sm font-bold ${headerText}`}>{title}</h2>
              <span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-bold ${countBg}`}>
                {count}
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-tight mt-0.5">{subtitle}</p>
          </div>
        </div>
        <button
          onClick={onAdd}
          title={`Añadir página a ${title}`}
          className={`p-1.5 rounded-lg text-zinc-400 transition ${btnHover}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Entries list */}
      <div className="flex flex-col gap-1.5 p-3 rounded-b-xl border border-t-0 border-zinc-100 bg-zinc-50/40 min-h-[4rem]">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-zinc-300" />
            </div>
            <p className="text-xs text-zinc-400">Sin páginas en este grupo</p>
            <button
              onClick={onAdd}
              className={`text-xs font-medium underline underline-offset-2 transition ${
                colorTheme === "blue" ? "text-blue-500 hover:text-blue-700" : "text-violet-500 hover:text-violet-700"
              }`}
            >
              Añadir la primera
            </button>
          </div>
        ) : (
          entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onEdit={() => onEdit(entry)}
              onMove={() => onMove(entry)}
              onDelete={() => onDelete(entry)}
            />
          ))
        )}
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

type FilterTab = "all" | "visible" | "hidden" | "dynamic";

export default function SiteMapPage() {
  const [entries, setEntries] = useState<SiteMapEntry[]>([]);
  const [modal, setModal]     = useState<ModalState>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [query, setQuery]     = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [toasts, setToasts]   = useState<Toast[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  // Keyboard shortcuts: N = new page, / = focus search, Escape = close modals
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const editing = tag === "INPUT" || tag === "TEXTAREA";
      if (e.key === "Escape") {
        if (modal) { setModal(null); return; }
        if (confirmReset) { setConfirmReset(false); return; }
      }
      if (!editing && e.key === "n") { e.preventDefault(); setModal({ type: "new", group: "primary" }); }
      if (!editing && e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, confirmReset]);

  const addToast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2800);
  }, []);

  const update = (next: SiteMapEntry[]) => {
    setEntries(next);
    persistEntries(next);
  };

  const handleSave = (updated: SiteMapEntry) => {
    if (modal?.type === "new") {
      update([...entries, updated]);
      addToast(`"${updated.name}" añadida`);
    } else {
      update(entries.map((e) => (e.id === updated.id ? updated : e)));
      addToast(`"${updated.name}" actualizada`);
    }
    setModal(null);
  };

  const handleMove = (entry: SiteMapEntry) => {
    const dest = entry.group === "primary" ? "Secundarias" : "Principales";
    update(
      entries.map((e) =>
        e.id === entry.id
          ? { ...e, group: e.group === "primary" ? "secondary" : "primary" }
          : e
      )
    );
    addToast(`"${entry.name}" movida a ${dest}`, "info");
  };

  const handleDelete = (entry: SiteMapEntry) => {
    update(entries.filter((e) => e.id !== entry.id));
    addToast(`"${entry.name}" eliminada`, "info");
  };

  const handleReset = () => {
    update(DEFAULT_ENTRIES);
    setConfirmReset(false);
    setQuery("");
    setFilterTab("all");
    addToast("Mapa web restaurado a valores por defecto");
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const dynamicCount = entries.filter((e) => DYNAMIC_SEGMENT_RE.test(e.path)).length;
  const visibleCount = entries.filter((e) => e.visibleToCustomer && !DYNAMIC_SEGMENT_RE.test(e.path)).length;
  const hiddenCount  = entries.filter((e) => !e.visibleToCustomer && !DYNAMIC_SEGMENT_RE.test(e.path)).length;

  const applyFilter = (list: SiteMapEntry[]) => {
    let result = list;
    if (filterTab === "visible")  result = result.filter((e) => e.visibleToCustomer && !DYNAMIC_SEGMENT_RE.test(e.path));
    if (filterTab === "hidden")   result = result.filter((e) => !e.visibleToCustomer && !DYNAMIC_SEGMENT_RE.test(e.path));
    if (filterTab === "dynamic")  result = result.filter((e) => DYNAMIC_SEGMENT_RE.test(e.path));
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter((e) => e.name.toLowerCase().includes(q) || e.path.toLowerCase().includes(q));
    }
    return result;
  };

  const primary   = applyFilter(entries.filter((e) => e.group === "primary"));
  const secondary = applyFilter(entries.filter((e) => e.group === "secondary"));

  // Modal template for "new"
  const modalEntry: SiteMapEntry | null =
    modal?.type === "edit"
      ? modal.entry
      : modal?.type === "new"
      ? { id: generateId(), name: "", path: "/", visibleToCustomer: true, group: modal.group }
      : null;

  const TABS: { key: FilterTab; label: string; count: number | null }[] = [
    { key: "all",     label: "Todas",     count: entries.length },
    { key: "visible", label: "Públicas",  count: visibleCount },
    { key: "hidden",  label: "Ocultas",   count: hiddenCount },
    { key: "dynamic", label: "Dinámicas", count: dynamicCount },
  ];

  return (
    <>
      <ToastList toasts={toasts} />

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setConfirmReset(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1 w-full bg-gradient-to-r from-red-400 via-orange-400 to-red-500" />
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-zinc-900">Restaurar valores por defecto</h2>
                  <p className="text-sm text-zinc-500 mt-1">
                    Se perderán todos los cambios personalizados. Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmReset(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 transition"
                >
                  Sí, restaurar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Hero header ─────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 shadow-lg">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "radial-gradient(circle at 30% 50%, white 1px, transparent 1px), radial-gradient(circle at 70% 50%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }}
          />
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-500/20 to-transparent rounded-full translate-x-16 -translate-y-16" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-violet-500/15 to-transparent rounded-full -translate-x-8 translate-y-8" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                <Map className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold text-white">Mapa Web</h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white/80 border border-white/20">
                    <Sparkles className="w-3 h-3" />
                    {entries.length} páginas
                  </span>
                </div>
                <p className="text-sm text-white/60">
                  Gestiona y visualiza todas las rutas del ecommerce. Pulsa{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-xs text-white/80">N</kbd>{" "}
                  para añadir,{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-xs text-white/80">/</kbd>{" "}
                  para buscar.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setModal({ type: "new", group: "primary" })}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-white text-slate-900 hover:bg-zinc-100 transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Nueva página
              </button>
              <button
                onClick={() => setConfirmReset(true)}
                title="Restaurar valores por defecto"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white border border-white/10 transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats bar ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: LayoutGrid, label: "Total páginas",      value: entries.length,  bg: "bg-slate-50",  iconCls: "text-slate-500",   border: "border-slate-200" },
            { icon: Eye,        label: "Públicas",           value: visibleCount,    bg: "bg-emerald-50",iconCls: "text-emerald-600",  border: "border-emerald-200" },
            { icon: EyeOff,     label: "Ocultas",            value: hiddenCount,     bg: "bg-zinc-50",   iconCls: "text-zinc-400",    border: "border-zinc-200" },
            { icon: Globe,      label: "Rutas dinámicas",    value: dynamicCount,    bg: "bg-amber-50",  iconCls: "text-amber-600",   border: "border-amber-200" },
          ].map(({ icon: Icon, label, value, bg, iconCls, border }) => (
            <div key={label} className={`bg-white rounded-xl border ${border} px-4 py-3.5 flex items-center gap-3 shadow-sm`}>
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${iconCls}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-zinc-900 tabular-nums leading-none">{value}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Search + filter tabs ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o ruta…"
              className="w-full pl-9 pr-9 py-2.5 text-sm border border-zinc-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-zinc-400 hover:text-zinc-700 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-zinc-100 rounded-xl p-1 shrink-0">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterTab(tab.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                  filterTab === tab.key
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className={`text-[10px] font-bold tabular-nums ${
                    filterTab === tab.key ? "text-zinc-500" : "text-zinc-400"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Two-column grid ──────────────────────────────────────────────── */}
        {primary.length === 0 && secondary.length === 0 && (query || filterTab !== "all") ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/40">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center">
              <Search className="w-5 h-5 text-zinc-300" />
            </div>
            <p className="text-sm font-medium text-zinc-500">Sin resultados para &quot;{query}&quot;</p>
            <button
              onClick={() => { setQuery(""); setFilterTab("all"); }}
              className="text-xs text-blue-500 hover:text-blue-700 underline underline-offset-2 transition"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl shadow-sm overflow-hidden">
              <Column
                title="Principales"
                subtitle="Flujo de compra y navegación del cliente"
                count={primary.length}
                colorTheme="blue"
                entries={primary}
                onEdit={(entry) => setModal({ type: "edit", entry })}
                onMove={handleMove}
                onDelete={handleDelete}
                onAdd={() => setModal({ type: "new", group: "primary" })}
              />
            </div>
            <div className="rounded-2xl shadow-sm overflow-hidden">
              <Column
                title="Secundarias"
                subtitle="Soporte, legales, dinámicas y páginas de nicho"
                count={secondary.length}
                colorTheme="violet"
                entries={secondary}
                onEdit={(entry) => setModal({ type: "edit", entry })}
                onMove={handleMove}
                onDelete={handleDelete}
                onAdd={() => setModal({ type: "new", group: "secondary" })}
              />
            </div>
          </div>
        )}

        {/* ── Legend / tips ────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-zinc-400 border-t border-zinc-100 pt-4">
          <span className="flex items-center gap-1.5"><Copy className="w-3.5 h-3.5" /> Copiar ruta</span>
          <span className="flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> Abrir en nueva pestaña</span>
          <span className="flex items-center gap-1.5"><Pencil className="w-3.5 h-3.5" /> Editar</span>
          <span className="flex items-center gap-1.5"><ArrowLeftRight className="w-3.5 h-3.5" /> Mover entre grupos</span>
          <span className="flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> Eliminar</span>
          <span className="ml-auto flex items-center gap-1.5 opacity-60">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 font-mono text-[10px]">N</kbd> nueva ·{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 font-mono text-[10px]">/</kbd> buscar
          </span>
        </div>
      </div>
    </>
  );
}
