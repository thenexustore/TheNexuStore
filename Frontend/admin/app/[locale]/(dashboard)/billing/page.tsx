"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  Plus,
  FileText,
  Settings,
  Download,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Edit2,
  Clock,
  Send,
  AlertTriangle,
  CalendarDays,
  Receipt,
  FileCheck,
  FileClock,
  Trash2,
  Building2,
  User,
  CreditCard,
  Hash,
  ShoppingCart,
  ExternalLink,
  Layers,
  Star,
  ImageIcon,
  Upload,
} from "lucide-react";
import {
  fetchBillingDocuments,
  fetchBillingDocumentById,
  createBillingDocument,
  updateBillingDocument,
  deleteBillingDocument,
  issueBillingDocument,
  convertQuoteToInvoice,
  updateBillingDocumentNumber,
  fetchBillingSettings,
  updateBillingSettings,
  downloadBillingExport,
  downloadBillingDocumentPdf,
  sendBillingDocument,
  fetchProducts,
  fetchBillingTemplates,
  createBillingTemplate,
  updateBillingTemplate,
  deleteBillingTemplate,
  uploadBillingTemplateBackground,
  backfillPaidOrderBillingDocs,
  type BillingDocument,
  type BillingDocumentType,
  type BillingDocumentStatus,
  type BillingPaymentMethod,
  type BillingSettings,
  type BillingNumberAudit,
  type BillingDocumentItem,
  type BillingTemplate,
  type Product,
} from "@/lib/api";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type BillingDocumentWithAudits = BillingDocument & {
  number_audits?: BillingNumberAudit[];
};

type CreateItemState = {
  description: string;
  qty: string;
  unit_price: string;
  tax_rate: string;
};

type CreateFormState = {
  notes: string;
  payment_method: BillingPaymentMethod | "";
  language: "ES" | "EN";
  issue_date: string;
  due_date: string;
  customer_name: string;
  customer_email: string;
  customer_tax_id: string;
  customer_address: string;
  items: CreateItemState[];
  template_id?: string;
};

type InputEv = { target: { value: string } };

// ─── Preview data interface ───────────────────────────────────────────────────

interface BillingPreviewData {
  type: BillingDocumentType;
  document_number?: string | null;
  issue_date?: string | null;
  due_date?: string | null;
  payment_method?: BillingPaymentMethod | null;
  currency?: string | null;
  company_legal_name?: string | null;
  company_trade_name?: string | null;
  company_nif?: string | null;
  company_address?: string | null;
  company_iban_1?: string | null;
  company_iban_2?: string | null;
  customer_name?: string | null;
  customer_tax_id?: string | null;
  customer_email?: string | null;
  customer_address?: string | null;
  subtotal_amount?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  notes?: string | null;
  items: Array<{
    description?: string | null;
    qty: number;
    unit_price: number;
    tax_rate: number;
    line_total?: number | null;
  }>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<BillingDocumentType, string> = {
  INVOICE: "Factura",
  QUOTE: "Presupuesto",
  CREDIT_NOTE: "Nota de crédito",
};

const TYPE_COLORS: Record<BillingDocumentType, string> = {
  INVOICE: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  QUOTE: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  CREDIT_NOTE: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
};

const STATUS_LABELS: Record<BillingDocumentStatus, string> = {
  DRAFT: "Borrador",
  ISSUED: "Emitida",
  SENT: "Enviada",
  PAID: "Pagada",
  VOID: "Anulada",
};

const STATUS_COLORS: Record<BillingDocumentStatus, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200",
  ISSUED: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  SENT: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  PAID: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  VOID: "bg-red-50 text-red-600 ring-1 ring-red-200",
};

const STATUS_ICONS: Record<BillingDocumentStatus, typeof Clock> = {
  DRAFT: FileClock,
  ISSUED: FileCheck,
  SENT: Send,
  PAID: CheckCircle,
  VOID: XCircle,
};

const PAYMENT_METHOD_LABELS: Record<BillingPaymentMethod, string> = {
  REDSYS: "Redsys (tarjeta)",
  STRIPE: "Stripe",
  PAYPAL: "PayPal",
  COD: "Contra reembolso",
  BANK_TRANSFER: "Transferencia bancaria",
  CASH: "Efectivo",
  OTHER: "Otro",
};

const TAB_TYPES: Array<{ key: BillingDocumentType | "ALL"; label: string; icon: typeof FileText }> = [
  { key: "ALL", label: "Todos", icon: FileText },
  { key: "INVOICE", label: "Facturas", icon: Receipt },
  { key: "QUOTE", label: "Presupuestos", icon: FileClock },
  { key: "CREDIT_NOTE", label: "Notas de crédito", icon: FileCheck },
];

const ALL_STATUSES: BillingDocumentStatus[] = [
  "DRAFT",
  "ISSUED",
  "SENT",
  "PAID",
  "VOID",
];

const PAYMENT_METHODS: BillingPaymentMethod[] = [
  "REDSYS",
  "STRIPE",
  "PAYPAL",
  "COD",
  "BANK_TRANSFER",
  "CASH",
  "OTHER",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(val: number | null | undefined): string {
  if (val == null) return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(val);
}

function formatDate(val: string | null | undefined): string {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("es-ES");
}

// ─── BillingPreview ───────────────────────────────────────────────────────────

function BillingPreview({ data }: { data: BillingPreviewData }) {
  const cur = data.currency ?? "EUR";
  const fmt = (v: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: cur }).format(v);
  const fmtDate = (v: string | null | undefined) =>
    v ? new Date(v).toLocaleDateString("es-ES") : "—";

  const typeLabel =
    data.type === "INVOICE" ? "FACTURA" :
    data.type === "QUOTE" ? "PRESUPUESTO" : "NOTA DE CRÉDITO";
  const typeColor =
    data.type === "INVOICE" ? "#1d4ed8" :
    data.type === "QUOTE" ? "#b45309" : "#c2410c";

  // Recompute totals from items when doc doesn't have them (create form)
  const computedSubtotal = data.items.reduce(
    (s, i) => s + i.qty * i.unit_price, 0,
  );
  const computedTax = data.items.reduce(
    (s, i) => s + i.qty * i.unit_price * i.tax_rate, 0,
  );
  const subtotal = data.subtotal_amount ?? computedSubtotal;
  const tax = data.tax_amount ?? computedTax;
  const discount = data.discount_amount ?? 0;
  const total = data.total_amount ?? subtotal + tax - discount;

  return (
    <div
      style={{
        background: "#fff",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        fontSize: "11px",
        color: "#18181b",
        width: "210mm",
        minHeight: "297mm",
        margin: "0 auto",
        padding: "14mm 16mm 14mm 16mm",
        boxSizing: "border-box",
        boxShadow: "0 4px 32px rgba(0,0,0,0.13)",
        position: "relative",
      }}
    >
      {/* ── Top header bar ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `3px solid ${typeColor}`, paddingBottom: "10px", marginBottom: "14px" }}>
        {/* Company block */}
        <div style={{ maxWidth: "55%" }}>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#18181b", lineHeight: 1.2 }}>
            {data.company_legal_name || <span style={{ color: "#a1a1aa" }}>Nombre empresa</span>}
          </div>
          {data.company_trade_name && (
            <div style={{ fontSize: "11px", color: "#71717a", marginTop: "2px" }}>{data.company_trade_name}</div>
          )}
          {data.company_nif && (
            <div style={{ fontSize: "10.5px", color: "#52525b", marginTop: "3px" }}>NIF: {data.company_nif}</div>
          )}
          {data.company_address && (
            <div style={{ fontSize: "10px", color: "#71717a", marginTop: "2px", whiteSpace: "pre-line" }}>{data.company_address}</div>
          )}
        </div>

        {/* Doc type + number block */}
        <div style={{ textAlign: "right", minWidth: "40%" }}>
          <div style={{ fontSize: "18px", fontWeight: 800, color: typeColor, letterSpacing: "0.03em" }}>
            {typeLabel}
          </div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#3f3f46", marginTop: "3px", fontFamily: "monospace" }}>
            {data.document_number || <span style={{ color: "#a1a1aa" }}>Número pendiente de asignar</span>}
          </div>
          <div style={{ fontSize: "10px", color: "#71717a", marginTop: "4px" }}>
            <span>Fecha: </span>
            <span style={{ fontWeight: 600, color: "#18181b" }}>{fmtDate(data.issue_date)}</span>
          </div>
          {data.due_date && (
            <div style={{ fontSize: "10px", color: "#71717a", marginTop: "1px" }}>
              <span>Vencimiento: </span>
              <span style={{ fontWeight: 600, color: "#18181b" }}>{fmtDate(data.due_date)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Two-column: Emisor / Cliente ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
        <div style={{ background: "#f4f4f5", borderRadius: "6px", padding: "10px 12px" }}>
          <div style={{ fontSize: "9px", fontWeight: 700, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>DATOS DEL EMISOR</div>
          <div style={{ fontWeight: 700, fontSize: "11px" }}>{data.company_legal_name || "—"}</div>
          {data.company_nif && <div style={{ fontSize: "10px", color: "#52525b", marginTop: "2px" }}>NIF: {data.company_nif}</div>}
          {data.company_address && <div style={{ fontSize: "10px", color: "#71717a", marginTop: "2px" }}>{data.company_address}</div>}
          {data.company_iban_1 && (
            <div style={{ fontSize: "9.5px", fontFamily: "monospace", color: "#52525b", marginTop: "5px", background: "#e4e4e7", borderRadius: "4px", padding: "2px 6px" }}>
              {data.company_iban_1}
            </div>
          )}
          {data.company_iban_2 && (
            <div style={{ fontSize: "9.5px", fontFamily: "monospace", color: "#52525b", marginTop: "2px", background: "#e4e4e7", borderRadius: "4px", padding: "2px 6px" }}>
              {data.company_iban_2}
            </div>
          )}
        </div>

        <div style={{ background: "#f4f4f5", borderRadius: "6px", padding: "10px 12px" }}>
          <div style={{ fontSize: "9px", fontWeight: 700, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>DATOS DEL CLIENTE</div>
          <div style={{ fontWeight: 700, fontSize: "11px" }}>{data.customer_name || <span style={{ color: "#a1a1aa" }}>Nombre del cliente</span>}</div>
          {data.customer_tax_id && <div style={{ fontSize: "10px", color: "#52525b", marginTop: "2px" }}>NIF/CIF: {data.customer_tax_id}</div>}
          {data.customer_address && <div style={{ fontSize: "10px", color: "#71717a", marginTop: "2px" }}>{data.customer_address}</div>}
          {data.customer_email && <div style={{ fontSize: "10px", color: "#71717a", marginTop: "2px" }}>{data.customer_email}</div>}
        </div>
      </div>

      {/* ── Payment method strip ── */}
      {data.payment_method && (
        <div style={{ display: "flex", gap: "12px", marginBottom: "14px", fontSize: "10px", color: "#52525b" }}>
          <span style={{ fontWeight: 600 }}>Forma de pago:</span>
          <span style={{ color: "#18181b" }}>
            {data.payment_method === "BANK_TRANSFER" ? "Transferencia bancaria" :
             data.payment_method === "CASH" ? "Efectivo" :
             data.payment_method === "COD" ? "Contra reembolso" :
             data.payment_method}
          </span>
        </div>
      )}

      {/* ── Line items table ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", fontSize: "10.5px" }}>
        <thead>
          <tr style={{ background: typeColor }}>
            <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 700, color: "#fff", borderRadius: "3px 0 0 0" }}>Descripción</th>
            <th style={{ textAlign: "center", padding: "6px 8px", fontWeight: 700, color: "#fff", width: "50px" }}>Cant.</th>
            <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 700, color: "#fff", width: "70px" }}>P. unitario</th>
            <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 700, color: "#fff", width: "50px" }}>IVA %</th>
            <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 700, color: "#fff", width: "80px", borderRadius: "0 3px 0 0" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {data.items.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: "center", padding: "18px 8px", color: "#a1a1aa" }}>Sin líneas</td>
            </tr>
          )}
          {data.items.map((item, idx) => {
            const lineBase = item.qty * item.unit_price;
            const lineTotal = item.line_total ?? lineBase + lineBase * item.tax_rate;
            return (
              <tr key={idx} style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "6px 8px", color: "#18181b" }}>{item.description || <span style={{ color: "#a1a1aa" }}>—</span>}</td>
                <td style={{ padding: "6px 8px", textAlign: "center", color: "#3f3f46" }}>{item.qty}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "#3f3f46" }}>{fmt(item.unit_price)}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "#71717a" }}>{(item.tax_rate * 100).toFixed(0)}%</td>
                <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600, color: "#18181b" }}>{fmt(lineTotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── Totals block ── */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
        <div style={{ width: "210px", border: `1px solid ${typeColor}30`, borderRadius: "7px", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 12px", fontSize: "10.5px", color: "#3f3f46", borderBottom: "1px solid #f0f0f0" }}>
            <span>Base imponible</span>
            <span>{fmt(subtotal)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 12px", fontSize: "10.5px", color: "#3f3f46", borderBottom: "1px solid #f0f0f0" }}>
            <span>IVA</span>
            <span>{fmt(tax)}</span>
          </div>
          {discount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 12px", fontSize: "10.5px", color: "#dc2626", borderBottom: "1px solid #f0f0f0" }}>
              <span>Descuento</span>
              <span>-{fmt(discount)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", fontSize: "13px", fontWeight: 800, color: "#fff", background: typeColor }}>
            <span>TOTAL</span>
            <span>{fmt(total)}</span>
          </div>
        </div>
      </div>

      {/* ── Notes ── */}
      {data.notes && (
        <div style={{ background: "#fafafa", border: "1px solid #e4e4e7", borderRadius: "6px", padding: "8px 12px", marginBottom: "12px" }}>
          <div style={{ fontSize: "9px", fontWeight: 700, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>NOTAS</div>
          <div style={{ fontSize: "10.5px", color: "#3f3f46", lineHeight: 1.5 }}>{data.notes}</div>
        </div>
      )}

      {/* ── IBAN footer ── */}
      {(data.company_iban_1 || data.company_iban_2) && (
        <div style={{ position: "absolute", bottom: "14mm", left: "16mm", right: "16mm", borderTop: "1px solid #e4e4e7", paddingTop: "6px", fontSize: "9px", color: "#71717a", display: "flex", gap: "16px" }}>
          {data.company_iban_1 && <span>IBAN: <span style={{ fontFamily: "monospace", color: "#52525b" }}>{data.company_iban_1}</span></span>}
          {data.company_iban_2 && <span>IBAN: <span style={{ fontFamily: "monospace", color: "#52525b" }}>{data.company_iban_2}</span></span>}
        </div>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BillingPage() {
  // List state
  const [tab, setTab] = useState<BillingDocumentType | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<BillingDocumentStatus | "">(
    "",
  );
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [docs, setDocs] = useState<BillingDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Detail slide-over
  const [selectedDoc, setSelectedDoc] =
    useState<BillingDocumentWithAudits | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  // Create form modal
  const [showCreate, setShowCreate] = useState(false);
  const [createType, setCreateType] = useState<BillingDocumentType>("INVOICE");
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>({
    notes: "",
    payment_method: "",
    language: "ES",
    issue_date: "",
    due_date: "",
    customer_name: "",
    customer_email: "",
    customer_tax_id: "",
    customer_address: "",
    items: [{ description: "", qty: "1", unit_price: "", tax_rate: "0.21" }],
  });

  // Edit number modal
  const [editNumberDoc, setEditNumberDoc] = useState<BillingDocument | null>(
    null,
  );
  const [editNumberValue, setEditNumberValue] = useState("");
  const [editNumberReason, setEditNumberReason] = useState("");
  const [savingNumber, setSavingNumber] = useState(false);

  // Settings panel
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<BillingSettings | null>(null);
  const [settingsLoadError, setSettingsLoadError] = useState(false);
  const [settingsForm, setSettingsForm] = useState<Partial<BillingSettings>>(
    {},
  );
  const [savingSettings, setSavingSettings] = useState(false);

  // Templates panel
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<BillingTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<BillingTemplate | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateBgUrl, setTemplateBgUrl] = useState("");
  const [templateConfigJson, setTemplateConfigJson] = useState("{}");
  const [templateIsDefault, setTemplateIsDefault] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [confirmDeleteTemplateId, setConfirmDeleteTemplateId] = useState<string | null>(null);
  const [uploadingBg, setUploadingBg] = useState(false);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  // Action states
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [transitioningId, setTransitioningId] = useState<string | null>(null);
  const [confirmVoidId, setConfirmVoidId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showCreatePreview, setShowCreatePreview] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  // Per-row product search state for line items autocomplete
  type ItemSearchState = { query: string; results: Product[]; open: boolean; loading: boolean };
  const [itemSearches, setItemSearches] = useState<ItemSearchState[]>([
    { query: "", results: [], open: false, loading: false },
  ]);
  const productSearchTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const syncItemSearchCount = useCallback((count: number) => {
    setItemSearches((prev) => {
      if (prev.length === count) return prev;
      if (prev.length < count) {
        return [...prev, ...Array.from({ length: count - prev.length }, () => ({
          query: "", results: [], open: false, loading: false,
        }))];
      }
      return prev.slice(0, count);
    });
  }, []);

  // Keep itemSearches in sync with createForm.items length
  useEffect(() => {
    syncItemSearchCount(createForm.items.length);
  }, [createForm.items.length, syncItemSearchCount]);

  const handleDescriptionChange = useCallback((idx: number, value: string) => {
    // Update the form item description as usual
    setCreateForm((f: CreateFormState) => ({
      ...f,
      items: f.items.map((item: CreateItemState, i: number) =>
        i === idx ? { ...item, description: value } : item,
      ),
    }));

    // Update query in search state and trigger debounced search
    setItemSearches((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], query: value };
      return next;
    });

    if (productSearchTimers.current[idx]) {
      clearTimeout(productSearchTimers.current[idx]);
    }

    if (value.trim().length < 2) {
      setItemSearches((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], results: [], open: false, loading: false };
        return next;
      });
      return;
    }

    setItemSearches((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], loading: true };
      return next;
    });

    productSearchTimers.current[idx] = setTimeout(async () => {
      try {
        const res = await fetchProducts(1, 8, value.trim());
        setItemSearches((prev) => {
          const next = [...prev];
          next[idx] = { ...next[idx], results: res.products ?? [], open: (res.products?.length ?? 0) > 0, loading: false };
          return next;
        });
      } catch {
        setItemSearches((prev) => {
          const next = [...prev];
          next[idx] = { ...next[idx], results: [], open: false, loading: false };
          return next;
        });
      }
    }, 280);
  }, []);

  const selectProduct = useCallback((idx: number, product: Product) => {
    const price = product.discount_price ?? product.price ?? 0;
    setCreateForm((f: CreateFormState) => ({
      ...f,
      items: f.items.map((item: CreateItemState, i: number) =>
        i === idx ? { ...item, description: product.title, unit_price: String(price) } : item,
      ),
    }));
    setItemSearches((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], query: product.title, results: [], open: false, loading: false };
      return next;
    });
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showTemplateForm) { setShowTemplateForm(false); return; }
        if (showCreate) { setShowCreate(false); setShowCreatePreview(false); return; }
        if (editNumberDoc) { setEditNumberDoc(null); return; }
        if (showSettings) { setShowSettings(false); return; }
        if (showTemplates) { setShowTemplates(false); return; }
        if (showDetail) { setShowDetail(false); setSelectedDoc(null); setShowPreview(false); return; }
      }
      // 'n' shortcut → new invoice (only when no modal/panel is open and not in a text input)
      if (
        e.key === "n" &&
        !showCreate && !showDetail && !showSettings && !editNumberDoc &&
        !(document.activeElement instanceof HTMLInputElement) &&
        !(document.activeElement instanceof HTMLTextAreaElement) &&
        !(document.activeElement instanceof HTMLSelectElement)
      ) {
        openCreateForm("INVOICE");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showCreate, editNumberDoc, showSettings, showDetail, showTemplates, showTemplateForm]);

  // ─── Load documents ────────────────────────────────────────────────────────

  const loadDocs = useCallback(
    async (p = page) => {
      setLoading(true);
      try {
        const res = await fetchBillingDocuments({
          page: p,
          limit: 20,
          type: tab === "ALL" ? undefined : tab,
          status: statusFilter || undefined,
          search: search || undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
        });
        setDocs(res.items);
        setTotal(res.total);
        setTotalPages(res.pages);
        setPage(p);
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Error cargando documentos",
        );
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab, statusFilter, search, fromDate, toDate],
  );

  useEffect(() => {
    loadDocs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, statusFilter]);

  // Pre-load templates once on mount so openCreateForm can auto-select the default
  useEffect(() => {
    loadTemplates();
    // Pre-load settings silently on mount so openCreateForm can use the configured default_tax_rate
    if (!settings) {
      fetchBillingSettings().then((s) => {
        setSettings(s);
        setSettingsForm({
          legal_name: s.legal_name,
          trade_name: s.trade_name,
          nif: s.nif,
          address_real: s.address_real,
          address_virtual: s.address_virtual,
          iban_caixabank: s.iban_caixabank,
          iban_bbva: s.iban_bbva,
          website_com: s.website_com,
          website_es: s.website_es,
          default_currency: s.default_currency,
          invoice_prefix: s.invoice_prefix,
          quote_prefix: s.quote_prefix,
          credit_note_prefix: s.credit_note_prefix,
          default_tax_rate: Number(s.default_tax_rate),
        });
      }).catch(() => { /* non-critical — falls back to 21% hardcoded */ });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Open detail ──────────────────────────────────────────────────────────

  const openDetail = async (id: string) => {
    setShowDetail(true);
    setDetailLoading(true);
    setSelectedDoc(null);
    try {
      const doc = await fetchBillingDocumentById(id);
      setSelectedDoc(doc);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error cargando documento",
      );
      // Close the panel so the user doesn't see an empty slide-over
      setShowDetail(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setShowDetail(false);
    setSelectedDoc(null);
    setShowPreview(false);
  };

  // ─── Issue document ────────────────────────────────────────────────────────

  const handleIssue = async (id: string) => {
    setIssuingId(id);
    try {
      const doc = await issueBillingDocument(id);
      toast.success(`Documento emitido: ${doc.document_number}`);
      await loadDocs(page);
      // Refresh the detail panel with full document (including number_audits)
      if (selectedDoc?.id === id) {
        const refreshed = await fetchBillingDocumentById(id);
        setSelectedDoc(refreshed);
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error emitiendo documento",
      );
    } finally {
      setIssuingId(null);
    }
  };

  // ─── Convert quote to invoice ──────────────────────────────────────────────

  const handleConvert = async (quoteId: string) => {
    setConvertingId(quoteId);
    try {
      const invoice = await convertQuoteToInvoice(quoteId);
      toast.success(
        `Presupuesto convertido a factura: ${invoice.document_number}`,
      );
      closeDetail();
      await loadDocs(page);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error convirtiendo presupuesto",
      );
    } finally {
      setConvertingId(null);
    }
  };

  // ─── Delete document ───────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      await deleteBillingDocument(id);
      toast.success("Documento eliminado");
      if (selectedDoc?.id === id) closeDetail();
      await loadDocs(page);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error eliminando documento",
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Update number ─────────────────────────────────────────────────────────

  const openEditNumber = (doc: BillingDocument) => {
    setEditNumberDoc(doc);
    setEditNumberValue(doc.document_number ?? "");
    setEditNumberReason("");
  };

  const handleSaveNumber = async () => {
    if (!editNumberDoc || !editNumberValue.trim()) return;
    setSavingNumber(true);
    try {
      const updated = await updateBillingDocumentNumber(
        editNumberDoc.id,
        editNumberValue.trim(),
        editNumberReason.trim() || undefined,
      );
      toast.success("Número actualizado");
      setEditNumberDoc(null);
      // Fetch full doc with updated number_audits for the detail panel
      if (selectedDoc?.id === updated.id) {
        const refreshed = await fetchBillingDocumentById(updated.id);
        setSelectedDoc(refreshed);
      }
      await loadDocs(page);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error actualizando número",
      );
    } finally {
      setSavingNumber(false);
    }
  };

  // ─── Create document ───────────────────────────────────────────────────────

  const openCreateForm = (type: BillingDocumentType) => {
    const defaultTaxRate = settings?.default_tax_rate != null
      ? String(settings.default_tax_rate)
      : "0.21";
    setCreateType(type);
    setCreateForm({
      notes: "",
      payment_method: "",
      language: "ES",
      issue_date: new Date().toISOString().split("T")[0],
      due_date: "",
      customer_name: "",
      customer_email: "",
      customer_tax_id: "",
      customer_address: "",
      items: [{ description: "", qty: "1", unit_price: "", tax_rate: defaultTaxRate }],
      template_id: templates.find((t) => t.is_default)?.id ?? "",
    });
    setItemSearches([{ query: "", results: [], open: false, loading: false }]);
    if (templates.length === 0) loadTemplates();
    setShowCreate(true);
  };

  const handleCreate = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    const validItems = createForm.items.filter(
      (i: CreateItemState) => i.description.trim() && i.unit_price,
    );
    if (validItems.length === 0) {
      toast.error("Añade al menos una línea con descripción y precio");
      return;
    }
    setCreating(true);
    try {
      await createBillingDocument({
        type: createType,
        language: createForm.language,
        payment_method: createForm.payment_method || undefined,
        notes: createForm.notes || undefined,
        issue_date: createForm.issue_date || undefined,
        due_date: createForm.due_date || undefined,
        customer_name: createForm.customer_name || undefined,
        customer_email: createForm.customer_email || undefined,
        customer_tax_id: createForm.customer_tax_id || undefined,
        customer_address: createForm.customer_address || undefined,
        template_id: createForm.template_id || undefined,
        items: validItems.map((i: CreateItemState, idx: number) => ({
          description: i.description,
          qty: Number(i.qty) || 1,
          unit_price: Number(i.unit_price) || 0,
          tax_rate: i.tax_rate !== "" ? Number(i.tax_rate) : (settings?.default_tax_rate ?? 0.21),
          position: idx,
        })),
      });
      toast.success(
        createType === "INVOICE"
          ? "Factura creada en borrador"
          : createType === "QUOTE"
          ? "Presupuesto creado"
          : "Nota de crédito creada",
      );
      setShowCreate(false);
      setShowCreatePreview(false);
      await loadDocs(1);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error creando documento",
      );
    } finally {
      setCreating(false);
    }
  };

  // ─── Settings ──────────────────────────────────────────────────────────────

  const loadSettings = async () => {
    setSettingsLoadError(false);
    setSettings(null);
    try {
      const s = await fetchBillingSettings();
      setSettings(s);
      setSettingsForm({
        legal_name: s.legal_name,
        trade_name: s.trade_name,
        nif: s.nif,
        address_real: s.address_real,
        address_virtual: s.address_virtual,
        iban_caixabank: s.iban_caixabank,
        iban_bbva: s.iban_bbva,
        website_com: s.website_com,
        website_es: s.website_es,
        default_currency: s.default_currency,
        invoice_prefix: s.invoice_prefix,
        quote_prefix: s.quote_prefix,
        credit_note_prefix: s.credit_note_prefix,
        default_tax_rate: Number(s.default_tax_rate),
      });
    } catch (err: unknown) {
      setSettingsLoadError(true);
      toast.error(
        err instanceof Error ? err.message : "Error cargando ajustes",
      );
    }
  };

  const openSettings = () => {
    setShowSettings(true);
    loadSettings();
  };

  const handleSaveSettings = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const updated = await updateBillingSettings(settingsForm);
      // Refresh settings state so the create-form live preview uses up-to-date company data
      setSettings(updated);
      toast.success("Ajustes guardados");
      setShowSettings(false);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error guardando ajustes",
      );
    } finally {
      setSavingSettings(false);
    }
  };

  // ─── Templates ─────────────────────────────────────────────────────────────

  const loadTemplates = async () => {
    setTemplatesLoading(true);
    setTemplatesError(false);
    try {
      const data = await fetchBillingTemplates();
      setTemplates(data);
    } catch {
      setTemplatesError(true);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleOpenTemplates = () => {
    setShowTemplates(true);
    loadTemplates();
  };

  const openTemplateForm = (template?: BillingTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateName(template.name);
      setTemplateBgUrl(template.background_url ?? "");
      setTemplateConfigJson(
        template.config_json
          ? JSON.stringify(template.config_json, null, 2)
          : "{}",
      );
      setTemplateIsDefault(template.is_default);
    } else {
      setEditingTemplate(null);
      setTemplateName("");
      setTemplateBgUrl("");
      setTemplateConfigJson("{}");
      setTemplateIsDefault(false);
    }
    setShowTemplateForm(true);
  };

  const handleUploadBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so same file can be re-selected
    e.target.value = "";
    if (!file) return;

    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Formato no permitido. Usa PNG, JPEG o WebP.");
      return;
    }
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error("La imagen no puede superar 5 MB.");
      return;
    }

    setUploadingBg(true);
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const result = await uploadBillingTemplateBackground(base64);
      setTemplateBgUrl(result.url);
      toast.success("Imagen subida correctamente");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error al subir la imagen",
      );
    } finally {
      setUploadingBg(false);
    }
  };

  const handleSaveTemplate = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!templateName.trim()) {
      toast.error("El nombre de la plantilla es obligatorio");
      return;
    }
    let parsedConfig: Record<string, unknown> = {};
    try {
      parsedConfig = JSON.parse(templateConfigJson || "{}");
    } catch {
      toast.error("El JSON de configuración no es válido");
      return;
    }
    setSavingTemplate(true);
    try {
      if (editingTemplate) {
        await updateBillingTemplate(editingTemplate.id, {
          name: templateName.trim(),
          // Send null explicitly to clear an existing background_url (undefined would be ignored by the API)
          background_url: templateBgUrl.trim() || null,
          config_json: parsedConfig,
          is_default: templateIsDefault,
        });
        toast.success("Plantilla actualizada");
      } else {
        await createBillingTemplate({
          name: templateName.trim(),
          background_url: templateBgUrl.trim() || undefined,
          config_json: parsedConfig,
          is_default: templateIsDefault,
        });
        toast.success("Plantilla creada");
      }
      setShowTemplateForm(false);
      await loadTemplates();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error guardando plantilla",
      );
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    setDeletingTemplateId(id);
    try {
      await deleteBillingTemplate(id);
      toast.success("Plantilla eliminada");
      setConfirmDeleteTemplateId(null);
      await loadTemplates();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error eliminando plantilla",
      );
    } finally {
      setDeletingTemplateId(null);
    }
  };

  // ─── Export ────────────────────────────────────────────────────────────────

  const handleExport = async () => {
    try {
      await downloadBillingExport({
        type: tab === "ALL" ? undefined : tab,
        status: statusFilter || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      });
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error exportando documentos",
      );
    }
  };

  // ─── Backfill paid orders ──────────────────────────────────────────────────

  const handleBackfillPaidOrders = async () => {
    setBackfilling(true);
    try {
      const result = await backfillPaidOrderBillingDocs();
      if (result.created > 0) {
        toast.success(
          `Backfill completado: ${result.created} factura(s) en borrador creada(s), ${result.skipped} omitida(s).`,
        );
      } else {
        toast.info(`Todos los pedidos pagados ya tenían factura (${result.skipped} omitidos).`);
      }
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} error(es) durante el backfill. Revisa los logs.`);
      }
      // Reload document list to show newly created drafts (also updates totalPages)
      await loadDocs(1);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al ejecutar el backfill");
    } finally {
      setBackfilling(false);
    }
  };

  // ─── PDF download ──────────────────────────────────────────────────────────

  const handleDownloadPdf = async (id: string) => {
    setDownloadingPdfId(id);
    try {
      await downloadBillingDocumentPdf(id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error descargando PDF");
    } finally {
      setDownloadingPdfId(null);
    }
  };

  // ─── Send document ─────────────────────────────────────────────────────────

  const handleSendDocument = async (id: string) => {
    setSendingId(id);
    try {
      const result = await sendBillingDocument(id);
      toast.success(`Documento enviado a ${result.email}`);
      // Refresh the list so status badge updates (ISSUED → SENT)
      await loadDocs(page);
      // Refresh the detail panel to show updated sent_at and status
      if (selectedDoc?.id === id) {
        const refreshed = await fetchBillingDocumentById(id);
        setSelectedDoc(refreshed);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error enviando documento");
    } finally {
      setSendingId(null);
    }
  };

  // ─── Issue + send in one action ────────────────────────────────────────────

  const handleIssueAndSend = async (id: string) => {
    setIssuingId(id);
    try {
      const issuedDoc = await issueBillingDocument(id);
      toast.success(`Documento emitido: ${issuedDoc.document_number}`);
      if (selectedDoc?.id === id) setSelectedDoc(issuedDoc as BillingDocumentWithAudits);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error emitiendo documento");
      setIssuingId(null);
      return;
    }
    setIssuingId(null);
    setSendingId(id);
    try {
      const result = await sendBillingDocument(id);
      toast.success(`Factura enviada por email a ${result.email}`);
      await loadDocs(page);
      if (selectedDoc?.id === id) {
        const refreshed = await fetchBillingDocumentById(id);
        setSelectedDoc(refreshed);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Factura emitida pero error al enviar email");
      // Still reload the list + detail panel to reflect the ISSUED state
      await loadDocs(page);
      if (selectedDoc?.id === id) {
        const refreshed = await fetchBillingDocumentById(id);
        setSelectedDoc(refreshed);
      }
    } finally {
      setSendingId(null);
    }
  };

  // ─── Status transitions ────────────────────────────────────────────────────

  const handleStatusTransition = async (
    id: string,
    newStatus: BillingDocumentStatus,
  ) => {
    setTransitioningId(id);
    try {
      await updateBillingDocument(id, { status: newStatus });
      toast.success(
        newStatus === "SENT"
          ? "Documento marcado como enviado"
          : newStatus === "PAID"
            ? "Documento marcado como pagado"
            : "Documento anulado",
      );
      await loadDocs(page);
      if (selectedDoc?.id === id) {
        const refreshed = await fetchBillingDocumentById(id);
        setSelectedDoc(refreshed);
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error actualizando estado",
      );
    } finally {
      setTransitioningId(null);
      setConfirmVoidId(null);
    }
  };

  // ─── Clear all filters and reload ────────────────────────────────────────

  const handleClearFilters = async () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setStatusFilter("");
    setPage(1);
    setLoading(true);
    try {
      const res = await fetchBillingDocuments({
        page: 1,
        limit: 20,
        type: tab === "ALL" ? undefined : tab,
      });
      setDocs(res.items);
      setTotal(res.total);
      setTotalPages(res.pages);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error cargando documentos",
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Create item helpers ───────────────────────────────────────────────────

  const addCreateItem = () => {
    const defaultTaxRate = settings?.default_tax_rate != null
      ? String(settings.default_tax_rate)
      : "0.21";
    setCreateForm((f: CreateFormState) => ({
      ...f,
      items: [
        ...f.items,
        { description: "", qty: "1", unit_price: "", tax_rate: defaultTaxRate },
      ],
    }));
  };

  const removeCreateItem = (idx: number) => {
    setCreateForm((f: CreateFormState) => ({
      ...f,
      items: f.items.filter((_: CreateItemState, i: number) => i !== idx),
    }));
  };

  const updateCreateItem = (idx: number, field: string, value: string) => {
    setCreateForm((f: CreateFormState) => ({
      ...f,
      items: f.items.map((item: CreateItemState, i: number) =>
        i === idx ? { ...item, [field]: value } : item,
      ),
    }));
  };

  // ─── Live totals ───────────────────────────────────────────────────────────

  const liveSubtotal = createForm.items.reduce((s: number, i: CreateItemState) => {
    return s + Number(i.qty || 1) * Number(i.unit_price || 0);
  }, 0);
  const liveTax = createForm.items.reduce((s: number, i: CreateItemState) => {
    const ls = Number(i.qty || 1) * Number(i.unit_price || 0);
    const taxRate = i.tax_rate !== "" ? Number(i.tax_rate) : (settings?.default_tax_rate ?? 0.21);
    return s + ls * taxRate;
  }, 0);

  // ─── Quick stats from loaded docs ─────────────────────────────────────────

  const draftCount = docs.filter((d: BillingDocument) => d.status === "DRAFT").length;
  const issuedCount = docs.filter((d: BillingDocument) => d.status === "ISSUED" || d.status === "SENT").length;
  const paidCount = docs.filter((d: BillingDocument) => d.status === "PAID").length;
  const totalAmount = docs.reduce((s: number, d: BillingDocument) => s + Number(d.total_amount || 0), 0);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            Facturación
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Gestiona facturas, presupuestos y notas de crédito
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => openCreateForm("QUOTE")}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-zinc-300 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nuevo Presupuesto
          </button>
          <button
            onClick={() => openCreateForm("INVOICE")}
            title="Nueva factura (atajo: N)"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva Factura
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/15 text-white/70 ml-1">N</kbd>
          </button>
          <button
            onClick={() => openCreateForm("CREDIT_NOTE")}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-orange-200 bg-orange-50 text-sm font-medium text-orange-700 hover:bg-orange-100 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nota de crédito</span>
            <span className="sm:hidden">Abono</span>
          </button>
          <button
            onClick={handleExport}
            title="Exportar CSV con los filtros actuales"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-zinc-300 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
          <button
            onClick={handleOpenTemplates}
            title="Gestión de plantillas"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-zinc-300 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition shadow-sm"
          >
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">Plantillas</span>
          </button>
          <button
            onClick={openSettings}
            title="Ajustes de facturación"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-zinc-300 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition shadow-sm"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Ajustes</span>
          </button>
          <button
            onClick={handleBackfillPaidOrders}
            disabled={backfilling}
            title="Crear facturas en borrador para todos los pedidos pagados sin factura"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-amber-300 bg-amber-50 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition shadow-sm"
          >
            {backfilling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Receipt className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">{backfilling ? "Generando..." : "Recuperar pedidos"}</span>
          </button>
        </div>
      </div>

      {/* ── Stats summary (clickable quick-filters) ────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-zinc-100 px-4 py-3 flex items-center gap-3 animate-pulse">
              <div className="w-5 h-5 rounded bg-zinc-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-2.5 w-20 bg-zinc-100 rounded-full" />
                <div className="h-5 w-10 bg-zinc-200 rounded" />
              </div>
            </div>
          ))
        ) : (
          [
            {
              label: "Total documentos",
              value: String(total),
              icon: FileText,
              iconColor: "text-zinc-500",
              bg: "bg-white",
              ring: !statusFilter && tab === "ALL" ? "ring-2 ring-zinc-900" : "",
              action: () => { setStatusFilter(""); setTab("ALL"); },
              hint: "Ver todos",
            },
            {
              label: "Borradores",
              value: String(draftCount),
              icon: FileClock,
              iconColor: "text-zinc-400",
              bg: statusFilter === "DRAFT" ? "bg-zinc-900" : "bg-white",
              ring: statusFilter === "DRAFT" ? "" : "",
              textColor: statusFilter === "DRAFT" ? "text-white" : "text-zinc-900",
              labelColor: statusFilter === "DRAFT" ? "text-zinc-300" : "text-zinc-400",
              action: () => { setStatusFilter(statusFilter === "DRAFT" ? "" : "DRAFT"); setPage(1); },
              hint: "Filtrar borradores",
            },
            {
              label: "Emitidas / Enviadas",
              value: String(issuedCount),
              icon: Send,
              iconColor: statusFilter === "ISSUED" ? "text-white" : "text-blue-500",
              bg: statusFilter === "ISSUED" ? "bg-blue-600" : "bg-white",
              textColor: statusFilter === "ISSUED" ? "text-white" : "text-zinc-900",
              labelColor: statusFilter === "ISSUED" ? "text-blue-100" : "text-zinc-400",
              action: () => { setStatusFilter(statusFilter === "ISSUED" ? "" : "ISSUED"); setPage(1); },
              hint: "Filtrar emitidas",
            },
            {
              label: "Cobradas",
              value: String(paidCount),
              icon: CheckCircle,
              iconColor: statusFilter === "PAID" ? "text-white" : "text-emerald-500",
              bg: statusFilter === "PAID" ? "bg-emerald-600" : "bg-white",
              textColor: statusFilter === "PAID" ? "text-white" : "text-zinc-900",
              labelColor: statusFilter === "PAID" ? "text-emerald-100" : "text-zinc-400",
              action: () => { setStatusFilter(statusFilter === "PAID" ? "" : "PAID"); setPage(1); },
              hint: "Filtrar cobradas",
            },
          ].map(({ label, value, icon: Icon, iconColor, bg, ring = "", textColor = "text-zinc-900", labelColor = "text-zinc-400", action, hint }) => (
            <button
              key={label}
              type="button"
              onClick={action}
              title={hint}
              className={`${bg} ${ring} rounded-xl border border-zinc-100 hover:border-zinc-300 px-4 py-3 flex items-center gap-3 transition cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${iconColor}`} />
              <div className="min-w-0">
                <p className={`text-xs truncate ${labelColor}`}>{label}</p>
                <p className={`text-xl font-bold leading-tight tabular-nums ${textColor}`}>{value}</p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
        {TAB_TYPES.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key as BillingDocumentType | "ALL");
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
                tab === t.key
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-end">
        {/* Search */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 font-medium">Buscar</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Número, cliente, NIF..."
              value={search}
              onChange={(e: InputEv) => setSearch(e.target.value)}
              onKeyDown={(e: { key: string }) => e.key === "Enter" && loadDocs(1)}
              className="pl-9 pr-4 py-2 rounded-lg border border-zinc-300 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
            />
          </div>
        </div>

        {/* Status filter */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 font-medium">Estado</label>
          <select
            value={statusFilter}
            onChange={(e: InputEv) =>
              setStatusFilter(e.target.value as BillingDocumentStatus | "")
            }
            className="px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
          >
            <option value="">Todos</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {/* Date from */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 font-medium">Desde</label>
          <div className="relative">
            <input
              type="date"
              value={fromDate}
              onChange={(e: InputEv) => setFromDate(e.target.value)}
              className="pl-3 pr-8 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
            />
            {fromDate && (
              <button
                onClick={() => setFromDate("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Date to */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 font-medium">Hasta</label>
          <div className="relative">
            <input
              type="date"
              value={toDate}
              onChange={(e: InputEv) => setToDate(e.target.value)}
              className="pl-3 pr-8 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
            />
            {toDate && (
              <button
                onClick={() => setToDate("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Search button */}
        <button
          onClick={() => loadDocs(1)}
          className="self-end px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition shadow-sm"
        >
          Buscar
        </button>

        {/* Clear all filters */}
        {(search || fromDate || toDate || statusFilter) && (
          <button
            onClick={handleClearFilters}
            className="self-end text-sm text-zinc-500 hover:text-zinc-900 flex items-center gap-1 transition"
          >
            <X className="w-3.5 h-3.5" />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-zinc-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Cargando documentos...</span>
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400 gap-3">
            <div className="rounded-full bg-zinc-100 p-4">
              <FileText className="w-8 h-8 text-zinc-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-600">No hay documentos</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {statusFilter || search || fromDate || toDate
                  ? "Prueba a cambiar los filtros de búsqueda"
                  : "Crea tu primera factura o presupuesto"}
              </p>
            </div>
            {!statusFilter && !search && !fromDate && !toDate && (
              <div className="flex flex-wrap gap-2 mt-1 justify-center">
                <button
                  onClick={() => openCreateForm("QUOTE")}
                  className="text-sm text-zinc-600 border border-zinc-300 px-3 py-1.5 rounded-lg hover:bg-zinc-50 transition"
                >
                  Nuevo presupuesto
                </button>
                <button
                  onClick={() => openCreateForm("INVOICE")}
                  className="text-sm text-white bg-zinc-900 px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition"
                >
                  Nueva factura
                </button>
                <button
                  onClick={() => openCreateForm("CREDIT_NOTE")}
                  className="text-sm text-orange-700 border border-orange-200 bg-orange-50 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition"
                >
                  Nota de crédito
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/80">
                  <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                    Número
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                    Tipo
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                    Cliente
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                    Fecha
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                    Total
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide w-[120px]">
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {docs.map((doc: BillingDocument) => {
                  const StatusIcon = STATUS_ICONS[doc.status as BillingDocumentStatus] ?? FileClock;
                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-zinc-50/80 transition-colors cursor-pointer group"
                      onClick={() => openDetail(doc.id)}
                    >
                      <td className="px-4 py-3">
                        {doc.document_number ? (
                          <span className="font-mono text-xs font-semibold text-zinc-800 group-hover:text-zinc-900">
                            {doc.document_number}
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-xs italic">Sin número</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${TYPE_COLORS[doc.type as BillingDocumentType]}`}
                        >
                          {TYPE_LABELS[doc.type as BillingDocumentType]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_COLORS[doc.status as BillingDocumentStatus]}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {STATUS_LABELS[doc.status as BillingDocumentStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-700 max-w-[180px] text-sm">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="truncate">
                            {doc.customer_name ?? doc.customer_email ?? (
                              <span className="text-zinc-400">—</span>
                            )}
                          </span>
                          {doc.order_id && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 font-medium">
                              <ShoppingCart className="w-3 h-3 shrink-0" />
                              Pedido vinculado
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3 text-zinc-400" />
                          {formatDate(doc.issue_date ?? doc.created_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-zinc-800">
                        {formatCurrency(Number(doc.total_amount))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div
                          className={`flex items-center justify-end gap-1 transition-opacity ${
                            confirmDeleteId === doc.id || issuingId === doc.id || convertingId === doc.id
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100"
                          }`}
                          onClick={(e: { stopPropagation(): void }) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => openDetail(doc.id)}
                            className="p-1.5 rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {doc.status === "DRAFT" && (
                            <button
                              onClick={() => handleIssue(doc.id)}
                              disabled={issuingId === doc.id}
                              className="p-1.5 rounded-md hover:bg-blue-50 text-blue-400 hover:text-blue-700 disabled:opacity-40 transition"
                              title="Emitir documento"
                            >
                              {issuingId === doc.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          {doc.type === "QUOTE" && doc.status !== "VOID" && (
                            <button
                              onClick={() => handleConvert(doc.id)}
                              disabled={convertingId === doc.id}
                              className="p-1.5 rounded-md hover:bg-amber-50 text-amber-500 hover:text-amber-700 disabled:opacity-40 transition"
                              title="Convertir a factura"
                            >
                              {convertingId === doc.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <ArrowRight className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          {doc.document_number && (
                            <button
                              onClick={() => openEditNumber(doc)}
                              className="p-1.5 rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition"
                              title="Editar número"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {(doc.status === "DRAFT" || doc.status === "VOID") && (
                            confirmDeleteId === doc.id ? (
                              <span className="flex items-center gap-1 text-xs">
                                <button
                                  onClick={() => handleDelete(doc.id)}
                                  disabled={deletingId === doc.id}
                                  className="px-2 py-1 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-40"
                                >
                                  Confirmar
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 rounded border text-xs text-zinc-600 hover:bg-zinc-50"
                                >
                                  No
                                </button>
                              </span>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(doc.id)}
                                className="p-1.5 rounded-md hover:bg-red-50 text-zinc-400 hover:text-red-600 transition"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Page total row */}
            {docs.length > 0 && (
              <div className="flex justify-end px-4 py-2 bg-zinc-50 border-t border-zinc-100">
                <span className="text-xs text-zinc-500">
                  Total visible:{" "}
                  <span className="font-semibold text-zinc-700">
                    {formatCurrency(totalAmount)}
                  </span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span className="text-xs">
            Página {page} de {totalPages} &middot; {total} documentos en total
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => loadDocs(page - 1)}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm hover:bg-zinc-50 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
            <button
              onClick={() => loadDocs(page + 1)}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm hover:bg-zinc-50 disabled:opacity-40 transition"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── Right slide-over: Document detail ──────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showDetail && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40 transition-opacity"
            onClick={closeDetail}
          />
          {/* Panel */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl flex flex-col border-l border-zinc-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
              {detailLoading ? (
                <div className="flex items-center gap-2 text-zinc-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Cargando...</span>
                </div>
              ) : selectedDoc ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${TYPE_COLORS[selectedDoc.type as BillingDocumentType]}`}>
                    {TYPE_LABELS[selectedDoc.type as BillingDocumentType]}
                  </span>
                  <h2 className="text-base font-bold text-zinc-900 font-mono truncate">
                    {selectedDoc.document_number ?? "Borrador sin número"}
                  </h2>
                </div>
              ) : null}
              <button
                onClick={closeDetail}
                className="ml-2 shrink-0 p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition"
                title="Cerrar (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            {detailLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
              </div>
            ) : selectedDoc ? (
              <div className="flex-1 overflow-y-auto">
                {/* Status badges row */}
                <div className="flex flex-wrap gap-2 px-6 py-4 bg-zinc-50 border-b border-zinc-100">
                  {(() => {
                    const StatusIcon = STATUS_ICONS[selectedDoc.status as BillingDocumentStatus] ?? FileClock;
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold ${STATUS_COLORS[selectedDoc.status as BillingDocumentStatus]}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {STATUS_LABELS[selectedDoc.status as BillingDocumentStatus]}
                      </span>
                    );
                  })()}
                  {selectedDoc.payment_method && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200">
                      <CreditCard className="w-3.5 h-3.5" />
                      {PAYMENT_METHOD_LABELS[selectedDoc.payment_method as BillingPaymentMethod]}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-500">
                    <Hash className="w-3 h-3" />
                    {selectedDoc.language} · {selectedDoc.currency}
                  </span>
                </div>

                {/* Status lifecycle stepper */}
                {(() => {
                  const STEPS: BillingDocumentStatus[] = ["DRAFT", "ISSUED", "SENT", "PAID"];
                  const isVoid = selectedDoc.status === "VOID";
                  const currentIdx = isVoid ? -1 : STEPS.indexOf(selectedDoc.status as BillingDocumentStatus);
                  return (
                    <div className="px-6 py-4 border-b border-zinc-100 bg-white">
                      {isVoid ? (
                        <div className="flex items-center justify-center gap-2 py-0.5">
                          <XCircle className="w-4 h-4 text-red-400" />
                          <span className="text-sm font-medium text-red-500">Documento anulado</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          {STEPS.map((step, idx) => {
                            const isActive = step === selectedDoc.status;
                            const isPast = currentIdx > idx;
                            const StepIcon = STATUS_ICONS[step] ?? FileClock;
                            return (
                              <Fragment key={step}>
                                <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                                    isActive
                                      ? "bg-zinc-900"
                                      : isPast
                                      ? "bg-emerald-500"
                                      : "bg-zinc-100"
                                  }`}>
                                    {isPast ? (
                                      <CheckCircle className="w-3.5 h-3.5 text-white" />
                                    ) : (
                                      <StepIcon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-zinc-300"}`} />
                                    )}
                                  </div>
                                  <span className={`text-xs font-medium truncate max-w-full text-center px-0.5 ${
                                    isActive
                                      ? "text-zinc-900"
                                      : isPast
                                      ? "text-emerald-600"
                                      : "text-zinc-300"
                                  }`}>
                                    {STATUS_LABELS[step]}
                                  </span>
                                </div>
                                {idx < STEPS.length - 1 && (
                                  <div className={`h-0.5 flex-[2] mb-5 mx-1 rounded-full transition-colors ${
                                    isPast ? "bg-emerald-400" : "bg-zinc-100"
                                  }`} />
                                )}
                              </Fragment>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="p-6 space-y-6">

                  {/* Issuer + Customer */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-zinc-200 p-4 space-y-1.5 bg-white">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                        <Building2 className="w-3.5 h-3.5" />
                        Emisor
                      </div>
                      <p className="text-sm font-semibold text-zinc-800">
                        {selectedDoc.company_legal_name}
                      </p>
                      {selectedDoc.company_trade_name && (
                        <p className="text-xs text-zinc-500">{selectedDoc.company_trade_name}</p>
                      )}
                      <p className="text-xs text-zinc-500">NIF: {selectedDoc.company_nif}</p>
                      <p className="text-xs text-zinc-400">{selectedDoc.company_address}</p>
                      {selectedDoc.company_iban_1 && (
                        <p className="text-xs font-mono text-zinc-400 mt-1 bg-zinc-50 px-2 py-1 rounded">
                          {selectedDoc.company_iban_1}
                        </p>
                      )}
                      {selectedDoc.company_iban_2 && (
                        <p className="text-xs font-mono text-zinc-400 bg-zinc-50 px-2 py-1 rounded">
                          {selectedDoc.company_iban_2}
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-zinc-200 p-4 space-y-1.5 bg-white">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                        <User className="w-3.5 h-3.5" />
                        Cliente
                      </div>
                      <p className="text-sm font-semibold text-zinc-800">
                        {selectedDoc.customer_name || "—"}
                      </p>
                      {selectedDoc.customer_tax_id && (
                        <p className="text-xs text-zinc-500">NIF/CIF: {selectedDoc.customer_tax_id}</p>
                      )}
                      {selectedDoc.customer_email && (
                        <p className="text-xs text-zinc-500">{selectedDoc.customer_email}</p>
                      )}
                      {selectedDoc.customer_address && (
                        <p className="text-xs text-zinc-400">{selectedDoc.customer_address}</p>
                      )}
                    </div>

                    {/* Linked order badge */}
                    {selectedDoc.order_id && (
                      <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <ShoppingCart className="w-4 h-4 text-indigo-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-indigo-700">Documento generado desde pedido</p>
                            <p className="text-xs text-indigo-500 font-mono truncate">{selectedDoc.order_id}</p>
                          </div>
                        </div>
                        <Link
                          href="/orders"
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 font-medium hover:underline shrink-0"
                        >
                          Ver pedidos <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: "Emisión", value: formatDate(selectedDoc.issue_date) },
                      { label: "Vencimiento", value: formatDate(selectedDoc.due_date) },
                      { label: "Creado", value: formatDate(selectedDoc.created_at) },
                      { label: "Actualizado", value: formatDate(selectedDoc.updated_at) },
                      ...(selectedDoc.sent_at
                        ? [{ label: "Enviado", value: formatDate(selectedDoc.sent_at) }]
                        : []),
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-lg bg-zinc-50 border border-zinc-100 p-3">
                        <p className="text-xs text-zinc-400 mb-0.5">{label}</p>
                        <p className="text-sm font-semibold text-zinc-700">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Line items */}
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">
                      Líneas del documento
                    </p>
                    <div className="rounded-xl border border-zinc-200 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-zinc-50 border-b border-zinc-100">
                            <th className="text-left px-3 py-2.5 font-semibold text-zinc-500">Descripción</th>
                            <th className="text-right px-3 py-2.5 font-semibold text-zinc-500">Cant.</th>
                            <th className="text-right px-3 py-2.5 font-semibold text-zinc-500">P. unit.</th>
                            <th className="text-right px-3 py-2.5 font-semibold text-zinc-500">IVA</th>
                            <th className="text-right px-3 py-2.5 font-semibold text-zinc-500">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                          {selectedDoc.items?.map((item: BillingDocumentItem) => (
                            <tr key={item.id} className="hover:bg-zinc-50/50">
                              <td className="px-3 py-2.5 text-zinc-800 font-medium">{item.description}</td>
                              <td className="px-3 py-2.5 text-right text-zinc-600">{Number(item.qty)}</td>
                              <td className="px-3 py-2.5 text-right text-zinc-600">{formatCurrency(Number(item.unit_price))}</td>
                              <td className="px-3 py-2.5 text-right text-zinc-500">{(Number(item.tax_rate) * 100).toFixed(0)}%</td>
                              <td className="px-3 py-2.5 text-right font-semibold text-zinc-800">{formatCurrency(Number(item.line_total))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="flex justify-end">
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 w-56 space-y-2">
                      <div className="flex justify-between text-sm text-zinc-600">
                        <span>Base imponible</span>
                        <span>{formatCurrency(Number(selectedDoc.subtotal_amount))}</span>
                      </div>
                      <div className="flex justify-between text-sm text-zinc-600">
                        <span>IVA</span>
                        <span>{formatCurrency(Number(selectedDoc.tax_amount))}</span>
                      </div>
                      {Number(selectedDoc.discount_amount) > 0 && (
                        <div className="flex justify-between text-sm text-red-500">
                          <span>Descuento</span>
                          <span>-{formatCurrency(Number(selectedDoc.discount_amount))}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-bold text-zinc-900 border-t border-zinc-100 pt-2">
                        <span>Total</span>
                        <span>{formatCurrency(Number(selectedDoc.total_amount))}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedDoc.notes && (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Notas</p>
                      <p className="text-sm text-zinc-700 leading-relaxed">{selectedDoc.notes}</p>
                    </div>
                  )}

                  {/* Audit log */}
                  {selectedDoc.number_audits && selectedDoc.number_audits.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">
                        Historial de numeración
                      </p>
                      <div className="space-y-2">
                        {selectedDoc.number_audits.map((audit: BillingNumberAudit) => (
                          <div
                            key={audit.id}
                            className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-600"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span>
                                {audit.old_number ? (
                                  <>
                                    <span className="line-through text-zinc-400">{audit.old_number}</span>
                                    {" → "}
                                    <span className="font-semibold text-zinc-800">{audit.new_number}</span>
                                  </>
                                ) : (
                                  <span className="font-semibold text-zinc-800">Asignado: {audit.new_number}</span>
                                )}
                              </span>
                              <span className="text-zinc-400 whitespace-nowrap">
                                {new Date(audit.created_at).toLocaleString("es-ES")}
                              </span>
                            </div>
                            {(audit.changed_by_email || audit.reason) && (
                              <div className="mt-1 text-zinc-400">
                                {audit.changed_by_email && <span>{audit.changed_by_email}</span>}
                                {audit.reason && <span className="ml-2 italic">· {audit.reason}</span>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Footer actions — grouped by intent */}
            {selectedDoc && (
              <div className="shrink-0 border-t border-zinc-100 bg-white">
                {/* Primary workflow row */}
                <div className="flex flex-wrap gap-2 px-6 py-3 border-b border-zinc-50">
                  {/* Vista previa — always available */}
                  <button
                    onClick={() => setShowPreview(true)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition"
                  >
                    <Eye className="w-4 h-4" />
                    Vista previa
                  </button>
                  {/* PDF download — non-DRAFT */}
                  {selectedDoc.status !== "DRAFT" && (
                    <button
                      onClick={() => handleDownloadPdf(selectedDoc.id)}
                      disabled={downloadingPdfId === selectedDoc.id}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 transition"
                    >
                      {downloadingPdfId === selectedDoc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      PDF
                    </button>
                  )}
                  {/* Send by email */}
                  {selectedDoc.status !== "DRAFT" && selectedDoc.status !== "VOID" && selectedDoc.customer_email && (
                    <button
                      onClick={() => handleSendDocument(selectedDoc.id)}
                      disabled={sendingId === selectedDoc.id}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 disabled:opacity-50 transition"
                    >
                      {sendingId === selectedDoc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Enviar email
                    </button>
                  )}
                  {/* Edit number */}
                  {selectedDoc.document_number && (
                    <button
                      onClick={() => {
                        closeDetail();
                        openEditNumber(selectedDoc);
                      }}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition"
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar nº
                    </button>
                  )}
                </div>

                {/* Status-action row */}
                <div className="flex flex-wrap items-center gap-2 px-6 py-3">
                  {/* Emit draft */}
                  {selectedDoc.status === "DRAFT" && (
                    <button
                      onClick={() => handleIssue(selectedDoc.id)}
                      disabled={issuingId === selectedDoc.id || sendingId === selectedDoc.id}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
                    >
                      {issuingId === selectedDoc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Emitir documento
                    </button>
                  )}
                  {/* Emit + send in one click (only for INVOICE drafts with customer email) */}
                  {selectedDoc.status === "DRAFT" && selectedDoc.type === "INVOICE" && selectedDoc.customer_email && (
                    <button
                      onClick={() => handleIssueAndSend(selectedDoc.id)}
                      disabled={issuingId === selectedDoc.id || sendingId === selectedDoc.id}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
                    >
                      {issuingId === selectedDoc.id || sendingId === selectedDoc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Emitir y enviar factura
                    </button>
                  )}
                  {/* Convert quote to invoice */}
                  {selectedDoc.type === "QUOTE" && selectedDoc.status !== "VOID" && (
                    <button
                      onClick={() => handleConvert(selectedDoc.id)}
                      disabled={convertingId === selectedDoc.id}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition shadow-sm"
                    >
                      {convertingId === selectedDoc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ArrowRight className="w-4 h-4" />
                      )}
                      Convertir a factura
                    </button>
                  )}
                  {/* Mark as Sent */}
                  {selectedDoc.status === "ISSUED" && (
                    <button
                      onClick={() => handleStatusTransition(selectedDoc.id, "SENT")}
                      disabled={transitioningId === selectedDoc.id}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition shadow-sm"
                    >
                      {transitioningId === selectedDoc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Marcar enviada
                    </button>
                  )}
                  {/* Mark as Paid */}
                  {(selectedDoc.status === "ISSUED" || selectedDoc.status === "SENT") && (
                    <button
                      onClick={() => handleStatusTransition(selectedDoc.id, "PAID")}
                      disabled={transitioningId === selectedDoc.id}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
                    >
                      {transitioningId === selectedDoc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Marcar cobrada
                    </button>
                  )}

                  {/* Spacer pushes destructive actions to the right */}
                  <div className="flex-1" />

                  {/* Void document */}
                  {selectedDoc.status !== "VOID" && selectedDoc.status !== "DRAFT" && (
                    confirmVoidId === selectedDoc.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">¿Anular definitivamente?</span>
                        <button
                          onClick={() => handleStatusTransition(selectedDoc.id, "VOID")}
                          disabled={transitioningId === selectedDoc.id}
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                        >
                          Sí, anular
                        </button>
                        <button
                          onClick={() => setConfirmVoidId(null)}
                          className="px-3 py-1.5 rounded-lg border text-xs text-zinc-600 hover:bg-zinc-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmVoidId(selectedDoc.id)}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition"
                      >
                        <XCircle className="w-4 h-4" />
                        Anular
                      </button>
                    )
                  )}
                  {/* Delete draft/void */}
                  {(selectedDoc.status === "DRAFT" || selectedDoc.status === "VOID") && (
                    confirmDeleteId === selectedDoc.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">¿Eliminar definitivamente?</span>
                        <button
                          onClick={() => handleDelete(selectedDoc.id)}
                          disabled={deletingId === selectedDoc.id}
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                        >
                          Sí, eliminar
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-3 py-1.5 rounded-lg border text-xs text-zinc-600 hover:bg-zinc-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(selectedDoc.id)}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                        Eliminar
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── Preview overlay ──────────────────────────────────────────────── */}
      {showPreview && selectedDoc && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-start justify-center py-6 px-4 overflow-y-auto">
          <div className="w-full" style={{ maxWidth: "230mm" }}>
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-white text-sm font-semibold">Vista previa del documento</span>
              <button
                onClick={() => setShowPreview(false)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition"
              >
                <X className="w-4 h-4" />
                Cerrar
              </button>
            </div>
            <BillingPreview data={{
              type: selectedDoc.type as BillingDocumentType,
              document_number: selectedDoc.document_number,
              issue_date: selectedDoc.issue_date,
              due_date: selectedDoc.due_date,
              payment_method: selectedDoc.payment_method as BillingPaymentMethod | null,
              currency: selectedDoc.currency,
              company_legal_name: selectedDoc.company_legal_name,
              company_trade_name: selectedDoc.company_trade_name,
              company_nif: selectedDoc.company_nif,
              company_address: selectedDoc.company_address,
              company_iban_1: selectedDoc.company_iban_1,
              company_iban_2: selectedDoc.company_iban_2,
              customer_name: selectedDoc.customer_name,
              customer_tax_id: selectedDoc.customer_tax_id,
              customer_email: selectedDoc.customer_email,
              customer_address: selectedDoc.customer_address,
              subtotal_amount: Number(selectedDoc.subtotal_amount),
              tax_amount: Number(selectedDoc.tax_amount),
              discount_amount: Number(selectedDoc.discount_amount),
              total_amount: Number(selectedDoc.total_amount),
              notes: selectedDoc.notes,
              items: (selectedDoc.items ?? []).map((it: BillingDocumentItem) => ({
                description: it.description,
                qty: Number(it.qty),
                unit_price: Number(it.unit_price),
                tax_rate: Number(it.tax_rate),
                line_total: Number(it.line_total),
              })),
            }} />
          </div>
        </div>
      )}

      {/* ─── Edit number modal ────────────────────────────────────────────── */}
      {editNumberDoc && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-zinc-200 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-amber-100 p-2">
                  <Edit2 className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="text-base font-bold text-zinc-900">
                  Editar número de documento
                </h3>
              </div>
              <button
                onClick={() => setEditNumberDoc(null)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2 text-xs text-zinc-500">
              Número actual:{" "}
              <span className="font-mono font-semibold text-zinc-800">
                {editNumberDoc.document_number}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-600 block mb-1.5">
                  Nuevo número <span className="text-red-500">*</span>
                </label>
                <input
                  value={editNumberValue}
                  onChange={(e: InputEv) => setEditNumberValue(e.target.value)}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  placeholder="INV_2026_0000001"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-600 block mb-1.5">
                  Motivo del cambio{" "}
                  <span className="text-zinc-400 font-normal">(opcional)</span>
                </label>
                <input
                  value={editNumberReason}
                  onChange={(e: InputEv) => setEditNumberReason(e.target.value)}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  placeholder="Corrección de error, inicio de serie..."
                />
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Este cambio quedará registrado en el historial de auditoría.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditNumberDoc(null)}
                className="px-4 py-2 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveNumber}
                disabled={savingNumber || !editNumberValue.trim()}
                className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-50"
              >
                {savingNumber ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</span>
                ) : "Guardar número"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Create document modal ────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-zinc-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${
                  createType === "INVOICE" ? "bg-blue-50" :
                  createType === "QUOTE" ? "bg-amber-50" : "bg-orange-50"
                }`}>
                  <Receipt className={`w-4 h-4 ${
                    createType === "INVOICE" ? "text-blue-600" :
                    createType === "QUOTE" ? "text-amber-600" : "text-orange-600"
                  }`} />
                </div>
                <h3 className="text-base font-bold text-zinc-900">
                  {createType === "INVOICE" ? "Nueva Factura" :
                   createType === "QUOTE" ? "Nuevo Presupuesto" : "Nueva Nota de Crédito"}
                </h3>
              </div>
              <button
                onClick={() => { setShowCreate(false); setShowCreatePreview(false); }}
                className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview / Form tabs */}
            <div className="flex gap-1 px-6 pt-3 pb-0 border-b border-zinc-100 shrink-0">
              <button
                type="button"
                onClick={() => setShowCreatePreview(false)}
                className={`px-3 py-1.5 text-sm font-medium rounded-t-lg border-b-2 transition ${!showCreatePreview ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400 hover:text-zinc-600"}`}
              >
                Formulario
              </button>
              <button
                type="button"
                onClick={() => setShowCreatePreview(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-t-lg border-b-2 transition ${showCreatePreview ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400 hover:text-zinc-600"}`}
              >
                <Eye className="w-3.5 h-3.5" />
                Vista previa
              </button>
            </div>

            {/* Live preview tab */}
            {showCreatePreview && (
              <div className="flex-1 overflow-y-auto bg-zinc-100 p-4">
                <BillingPreview data={{
                  type: createType,
                  document_number: null,
                  issue_date: createForm.issue_date ? createForm.issue_date : null,
                  due_date: createForm.due_date || null,
                  payment_method: createForm.payment_method as BillingPaymentMethod | null || null,
                  currency: settings?.default_currency ?? "EUR",
                  company_legal_name: settings?.legal_name ?? null,
                  company_trade_name: settings?.trade_name ?? null,
                  company_nif: settings?.nif ?? null,
                  company_address: settings?.address_real ?? null,
                  company_iban_1: settings?.iban_caixabank ?? null,
                  company_iban_2: settings?.iban_bbva ?? null,
                  customer_name: createForm.customer_name || null,
                  customer_tax_id: createForm.customer_tax_id || null,
                  customer_email: createForm.customer_email || null,
                  customer_address: createForm.customer_address || null,
                  notes: createForm.notes || null,
                  items: createForm.items
                    .filter((i: CreateItemState) => i.description || Number(i.unit_price) > 0)
                    .map((i: CreateItemState) => ({
                      description: i.description,
                      qty: Number(i.qty) || 1,
                      unit_price: Number(i.unit_price) || 0,
                      tax_rate: i.tax_rate !== "" ? Number(i.tax_rate) : (settings?.default_tax_rate ?? 0.21),
                    })),
                }} />
              </div>
            )}

            <form
              onSubmit={handleCreate}
              className={`flex-1 overflow-y-auto px-6 py-5 space-y-5${showCreatePreview ? " hidden" : ""}`}
            >
              {/* Type + Language */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-600 block mb-1.5">
                    Tipo de documento
                  </label>
                  <select
                    value={createType}
                    onChange={(e: InputEv) =>
                      setCreateType(e.target.value as BillingDocumentType)
                    }
                    className="w-full border border-zinc-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    <option value="INVOICE">Factura</option>
                    <option value="QUOTE">Presupuesto</option>
                    <option value="CREDIT_NOTE">Nota de crédito</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 block mb-1.5">
                    Idioma del documento
                  </label>
                  <select
                    value={createForm.language}
                    onChange={(e: InputEv) =>
                      setCreateForm((f: CreateFormState) => ({
                        ...f,
                        language: e.target.value as "ES" | "EN",
                      }))
                    }
                    className="w-full border border-zinc-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    <option value="ES">🇪🇸 Español</option>
                    <option value="EN">🇬🇧 English</option>
                  </select>
                </div>
              </div>

              {/* Payment method */}
              <div>
                <label className="text-xs font-semibold text-zinc-600 block mb-1.5">
                  Forma de pago
                </label>
                <select
                  value={createForm.payment_method}
                  onChange={(e: InputEv) =>
                    setCreateForm((f: CreateFormState) => ({
                      ...f,
                      payment_method: e.target.value as BillingPaymentMethod | "",
                    }))
                  }
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="">— Sin especificar —</option>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
                  ))}
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-600 block mb-1.5">
                    Fecha de emisión
                  </label>
                  <input
                    type="date"
                    value={createForm.issue_date}
                    onChange={(e: InputEv) =>
                      setCreateForm((f: CreateFormState) => ({ ...f, issue_date: e.target.value }))
                    }
                    className="w-full border border-zinc-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 block mb-1.5">
                    Fecha de vencimiento <span className="text-zinc-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="date"
                    value={createForm.due_date}
                    onChange={(e: InputEv) =>
                      setCreateForm((f: CreateFormState) => ({ ...f, due_date: e.target.value }))
                    }
                    className="w-full border border-zinc-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
              </div>

              {/* Customer info */}
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">
                    Datos del cliente
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-500 block mb-1">
                      Nombre / Razón social
                    </label>
                    <input
                      value={createForm.customer_name}
                      onChange={(e: InputEv) =>
                        setCreateForm((f: CreateFormState) => ({ ...f, customer_name: e.target.value }))
                      }
                      placeholder="Empresa S.L. o Nombre Apellido"
                      className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 block mb-1">
                      NIF / CIF
                    </label>
                    <input
                      value={createForm.customer_tax_id}
                      onChange={(e: InputEv) =>
                        setCreateForm((f: CreateFormState) => ({ ...f, customer_tax_id: e.target.value }))
                      }
                      placeholder="B12345678"
                      className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 block mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={createForm.customer_email}
                      onChange={(e: InputEv) =>
                        setCreateForm((f: CreateFormState) => ({ ...f, customer_email: e.target.value }))
                      }
                      placeholder="cliente@empresa.com"
                      className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 block mb-1">
                      Dirección fiscal
                    </label>
                    <input
                      value={createForm.customer_address}
                      onChange={(e: InputEv) =>
                        setCreateForm((f: CreateFormState) => ({ ...f, customer_address: e.target.value }))
                      }
                      placeholder="Calle, ciudad, CP, país"
                      className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                </div>
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold text-zinc-600">
                    Líneas del documento <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={addCreateItem}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Añadir línea
                  </button>
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-12 gap-2 mb-1 px-0.5">
                  <span className="col-span-4 text-xs font-medium text-zinc-500">Descripción</span>
                  <span className="col-span-1 text-xs font-medium text-zinc-500 text-center">Cant.</span>
                  <span className="col-span-2 text-xs font-medium text-zinc-500 text-right">Precio unit.</span>
                  <span className="col-span-2 text-xs font-medium text-zinc-500 text-center">IVA %</span>
                  <span className="col-span-2 text-xs font-medium text-zinc-500 text-right">Importe</span>
                  <span className="col-span-1" />
                </div>

                <div className="space-y-2">
                  {createForm.items.map((item: CreateItemState, idx: number) => {
                    const lineBase = Number(item.qty || 1) * Number(item.unit_price || 0);
                    const taxRate = item.tax_rate !== "" ? Number(item.tax_rate) : (settings?.default_tax_rate ?? 0.21);
                    const lineTax = lineBase * taxRate;
                    const lineTotal = lineBase + lineTax;
                    const search = itemSearches[idx] ?? { query: "", results: [], open: false, loading: false };
                    return (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-zinc-50 border border-zinc-100 hover:border-zinc-200 transition"
                      >
                        {/* Description with product autocomplete */}
                        <div className="col-span-4 relative">
                          <input
                            value={item.description}
                            onChange={(e: InputEv) => handleDescriptionChange(idx, e.target.value)}
                            onFocus={() => {
                              if (search.results.length > 0) {
                                setItemSearches((prev) => {
                                  const next = [...prev];
                                  next[idx] = { ...next[idx], open: true };
                                  return next;
                                });
                              }
                            }}
                            onBlur={() => {
                              // Small delay so click on result fires first
                              setTimeout(() => {
                                setItemSearches((prev) => {
                                  const next = [...prev];
                                  if (next[idx]) next[idx] = { ...next[idx], open: false };
                                  return next;
                                });
                              }, 150);
                            }}
                            placeholder="Descripción o producto..."
                            className="w-full border-0 bg-transparent px-1 py-1 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none"
                          />
                          {search.loading && (
                            <span className="absolute right-1 top-1/2 -translate-y-1/2">
                              <Loader2 className="w-3.5 h-3.5 text-zinc-400 animate-spin" />
                            </span>
                          )}
                          {search.open && search.results.length > 0 && (
                            <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg overflow-hidden">
                              {search.results.map((product: Product) => {
                                const price = product.discount_price ?? product.price ?? 0;
                                return (
                                  <button
                                    key={product.id}
                                    type="button"
                                    onMouseDown={() => selectProduct(idx, product)}
                                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-indigo-50 text-left text-xs transition"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <span className="font-medium text-zinc-800 truncate block">{product.title}</span>
                                      {product.sku_code && (
                                        <span className="text-zinc-400 font-mono">{product.sku_code}</span>
                                      )}
                                    </div>
                                    <span className="ml-3 text-indigo-600 font-semibold tabular-nums shrink-0">
                                      {price.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <input
                          value={item.qty}
                          onChange={(e: InputEv) => updateCreateItem(idx, "qty", e.target.value)}
                          type="number"
                          min="0"
                          step="any"
                          className="col-span-1 border border-zinc-200 rounded-md px-2 py-1 text-sm text-center bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                        />
                        <input
                          value={item.unit_price}
                          onChange={(e: InputEv) => updateCreateItem(idx, "unit_price", e.target.value)}
                          placeholder="0.00"
                          type="number"
                          min="0"
                          step="any"
                          className="col-span-2 border border-zinc-200 rounded-md px-2 py-1 text-sm text-right bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                        />
                        {/* IVA % — 2 cols for proper visibility */}
                        <div className="col-span-2 relative">
                          <input
                            value={parseFloat((Number(item.tax_rate) * 100).toFixed(6)).toString()}
                            onChange={(e: InputEv) =>
                              updateCreateItem(idx, "tax_rate", String(Number(e.target.value) / 100))
                            }
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            className="w-full border border-zinc-300 rounded-md px-2 py-1.5 text-sm pr-7 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 font-medium text-zinc-800"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-500 pointer-events-none">%</span>
                        </div>
                        <div className="col-span-2 text-right">
                          <span className="text-xs font-semibold text-zinc-700 tabular-nums">
                            {lineTotal > 0 ? formatCurrency(lineTotal) : <span className="text-zinc-300">—</span>}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCreateItem(idx)}
                          disabled={createForm.items.length === 1}
                          className="col-span-1 p-1.5 rounded-md hover:bg-red-50 text-zinc-300 hover:text-red-500 disabled:opacity-30 transition"
                          title="Eliminar línea"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live totals — always visible */}
              <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">
                  Resumen
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-zinc-600">
                    <span>Base imponible</span>
                    <span>{formatCurrency(liveSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-zinc-600">
                    <span>IVA estimado</span>
                    <span>{formatCurrency(liveTax)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-zinc-900 border-t border-zinc-200 pt-2">
                    <span>Total</span>
                    <span>{formatCurrency(liveSubtotal + liveTax)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-zinc-600 block mb-1.5">
                  Notas <span className="text-zinc-400 font-normal">(visibles en el documento)</span>
                </label>
                <textarea
                  value={createForm.notes}
                  onChange={(e: InputEv) =>
                    setCreateForm((f: CreateFormState) => ({ ...f, notes: e.target.value }))
                  }
                  rows={2}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  placeholder="Notas adicionales para el cliente..."
                />
              </div>

              {/* Template selector */}
              {templates.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Layers className="w-3.5 h-3.5 text-zinc-400" />
                    <label className="text-xs font-semibold text-zinc-600">
                      Plantilla de diseño
                    </label>
                  </div>
                  <select
                    value={createForm.template_id ?? ""}
                    onChange={(e: InputEv) =>
                      setCreateForm((f: CreateFormState) => ({
                        ...f,
                        template_id: e.target.value,
                      }))
                    }
                    className="w-full border border-zinc-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    <option value="">— Sin plantilla —</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}{t.is_default ? " (predeterminada)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setShowCreatePreview(false); }}
                  className="px-4 py-2 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition shadow-sm"
                >
                  {creating ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Creando...
                    </span>
                  ) : (
                    "Crear en borrador"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Templates modal ───────────────────────────────────────────────── */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-zinc-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-indigo-50 p-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="text-base font-bold text-zinc-900">Plantillas de facturación</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openTemplateForm()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nueva plantilla
                </button>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {templatesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
                </div>
              ) : templatesError ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <AlertTriangle className="w-8 h-8 text-amber-400" />
                  <p className="text-sm text-zinc-500">No se pudieron cargar las plantillas</p>
                  <button
                    onClick={loadTemplates}
                    className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition"
                  >
                    Reintentar
                  </button>
                </div>
              ) : templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <div className="rounded-full bg-zinc-100 p-4">
                    <Layers className="w-8 h-8 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-700">Sin plantillas</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Crea una plantilla para personalizar el diseño de tus facturas
                    </p>
                  </div>
                  <button
                    onClick={() => openTemplateForm()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Crear primera plantilla
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="flex items-center gap-4 p-4 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-white transition"
                    >
                      {/* Background preview */}
                      <div className="w-12 h-12 rounded-lg border border-zinc-200 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                        {tpl.background_url ? (
                          <img
                            src={tpl.background_url}
                            alt={tpl.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-zinc-300" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-zinc-900 truncate">{tpl.name}</p>
                          {tpl.is_default && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-semibold">
                              <Star className="w-2.5 h-2.5" />
                              Predeterminada
                            </span>
                          )}
                        </div>
                        {tpl.background_url && (
                          <p className="text-xs text-zinc-400 mt-0.5 truncate">{tpl.background_url}</p>
                        )}
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Creada {new Date(tpl.created_at).toLocaleDateString("es-ES")}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => openTemplateForm(tpl)}
                          className="p-1.5 rounded-lg hover:bg-zinc-200 text-zinc-500 transition"
                          title="Editar plantilla"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {confirmDeleteTemplateId === tpl.id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-zinc-500">¿Eliminar?</span>
                            <button
                              onClick={() => handleDeleteTemplate(tpl.id)}
                              disabled={deletingTemplateId === tpl.id}
                              className="px-2 py-1 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                            >
                              {deletingTemplateId === tpl.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : "Sí"}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteTemplateId(null)}
                              className="px-2 py-1 rounded-lg border text-xs text-zinc-600 hover:bg-zinc-50"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteTemplateId(tpl.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition"
                            title="Eliminar plantilla"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Template form modal ────────────────────────────────────────────── */}
      {showTemplateForm && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-zinc-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-indigo-50 p-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="text-base font-bold text-zinc-900">
                  {editingTemplate ? "Editar plantilla" : "Nueva plantilla"}
                </h3>
              </div>
              <button
                onClick={() => setShowTemplateForm(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveTemplate}
              className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
            >
              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-zinc-600 block mb-1.5">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  value={templateName}
                  onChange={(e: InputEv) => setTemplateName(e.target.value)}
                  required
                  placeholder="Ej: Plantilla estándar"
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              {/* Background image */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
                  <label className="text-xs font-semibold text-zinc-600">
                    Imagen de fondo <span className="text-zinc-400 font-normal">(opcional)</span>
                  </label>
                </div>

                {/* Upload button */}
                <input
                  ref={bgFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleUploadBg}
                />
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => bgFileInputRef.current?.click()}
                    disabled={uploadingBg}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 transition shadow-sm"
                  >
                    {uploadingBg ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Subir imagen
                      </>
                    )}
                  </button>
                  <span className="self-center text-xs text-zinc-400">PNG, JPEG o WebP · máx. 5 MB</span>
                </div>

                {/* Manual URL input */}
                <input
                  value={templateBgUrl}
                  onChange={(e: InputEv) => setTemplateBgUrl(e.target.value)}
                  placeholder="O pega una URL: https://ejemplo.com/fondo.png"
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />

                {/* Preview */}
                {templateBgUrl && (
                  <div className="mt-2 relative w-full h-28 rounded-lg border border-zinc-200 overflow-hidden bg-zinc-100">
                    <img
                      src={templateBgUrl}
                      alt="Vista previa del fondo"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setTemplateBgUrl("")}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
                      title="Eliminar imagen"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Config JSON */}
              <div>
                <label className="text-xs font-semibold text-zinc-600 block mb-1.5">
                  Configuración JSON <span className="text-zinc-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  value={templateConfigJson}
                  onChange={(e: InputEv) => setTemplateConfigJson(e.target.value)}
                  rows={5}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  placeholder="{}"
                  spellCheck={false}
                />
                <p className="text-xs text-zinc-400 mt-1">
                  Objeto JSON con opciones de personalización de la plantilla
                </p>
              </div>

              {/* Is Default */}
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition">
                <input
                  type="checkbox"
                  checked={templateIsDefault}
                  onChange={(e) => setTemplateIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded accent-zinc-900"
                />
                <div>
                  <p className="text-sm font-medium text-zinc-800">Establecer como predeterminada</p>
                  <p className="text-xs text-zinc-400">
                    Se aplicará automáticamente al crear nuevos documentos
                  </p>
                </div>
                <Star className={`w-4 h-4 ml-auto ${templateIsDefault ? "text-amber-500" : "text-zinc-300"}`} />
              </label>

              <div className="flex justify-end gap-2 pt-1 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowTemplateForm(false)}
                  className="px-4 py-2 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTemplate}
                  className="px-5 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition shadow-sm"
                >
                  {savingTemplate ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando...
                    </span>
                  ) : editingTemplate ? "Guardar cambios" : "Crear plantilla"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Settings modal ────────────────────────────────────────────────── */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl border border-zinc-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-zinc-100 p-2">
                  <Settings className="w-4 h-4 text-zinc-600" />
                </div>
                <h3 className="text-base font-bold text-zinc-900">Ajustes de facturación</h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {settings === null ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3">
                {settingsLoadError ? (
                  <>
                    <AlertTriangle className="w-8 h-8 text-amber-400" />
                    <p className="text-sm text-zinc-500">No se pudieron cargar los ajustes</p>
                    <button
                      onClick={loadSettings}
                      className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition"
                    >
                      Reintentar
                    </button>
                  </>
                ) : (
                  <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
                )}
              </div>
            ) : (
              <form
                onSubmit={handleSaveSettings}
                className="flex-1 overflow-y-auto px-6 py-5 space-y-6"
              >
                {/* Company data */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-zinc-400" />
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                      Datos de la empresa
                    </p>
                  </div>
                  <div className="space-y-3">
                    {[
                      { key: "legal_name", label: "Razón social", required: true },
                      { key: "trade_name", label: "Nombre comercial" },
                      { key: "nif", label: "NIF / CIF", required: true },
                      { key: "address_real", label: "Dirección real" },
                      { key: "address_virtual", label: "Dirección virtual" },
                      { key: "iban_caixabank", label: "IBAN CaixaBank" },
                      { key: "iban_bbva", label: "IBAN BBVA" },
                      { key: "website_com", label: "Web .com" },
                      { key: "website_es", label: "Web .es" },
                    ].map(({ key, label, required }) => (
                      <div key={key}>
                        <label className="text-xs font-medium text-zinc-600 block mb-1">
                          {label}
                          {required && <span className="text-red-500 ml-0.5">*</span>}
                        </label>
                        <input
                          value={
                            (settingsForm as Record<string, unknown>)[key] as string ?? ""
                          }
                          onChange={(e: InputEv) =>
                            setSettingsForm((f: Partial<BillingSettings>) => ({
                              ...f,
                              [key]: e.target.value,
                            }))
                          }
                          className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Numbering */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Hash className="w-4 h-4 text-zinc-400" />
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                      Series y numeración
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {[
                      { key: "invoice_prefix", label: "Facturas", placeholder: "INV" },
                      { key: "quote_prefix", label: "Presupuestos", placeholder: "QUOT" },
                      { key: "credit_note_prefix", label: "Abonos", placeholder: "CN" },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <label className="text-xs font-medium text-zinc-600 block mb-1">{label}</label>
                        <input
                          value={
                            (settingsForm as Record<string, unknown>)[key] as string ?? ""
                          }
                          onChange={(e: InputEv) =>
                            setSettingsForm((f: Partial<BillingSettings>) => ({
                              ...f,
                              [key]: e.target.value,
                            }))
                          }
                          className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900"
                          placeholder={placeholder}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-zinc-600 block mb-1">
                        Moneda por defecto
                      </label>
                      <input
                        value={settingsForm.default_currency ?? "EUR"}
                        onChange={(e: InputEv) =>
                          setSettingsForm((f: Partial<BillingSettings>) => ({
                            ...f,
                            default_currency: e.target.value.toUpperCase(),
                          }))
                        }
                        maxLength={3}
                        placeholder="EUR"
                        className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-zinc-600 block mb-1">
                        IVA por defecto
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          value={
                            settingsForm.default_tax_rate != null
                              ? String(Number(settingsForm.default_tax_rate) * 100)
                              : ""
                          }
                          onChange={(e: InputEv) =>
                            setSettingsForm((f: Partial<BillingSettings>) => ({
                              ...f,
                              default_tax_rate: Number(e.target.value) / 100,
                            }))
                          }
                          className="w-full border border-zinc-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                          placeholder="21"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="px-4 py-2 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="px-5 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition shadow-sm"
                  >
                    {savingSettings ? (
                      <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</span>
                    ) : "Guardar ajustes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
