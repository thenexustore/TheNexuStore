"use client";

import { useCallback, useEffect, useState } from "react";
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
} from "lucide-react";
import {
  fetchBillingDocuments,
  fetchBillingDocumentById,
  createBillingDocument,
  deleteBillingDocument,
  issueBillingDocument,
  convertQuoteToInvoice,
  updateBillingDocumentNumber,
  fetchBillingSettings,
  updateBillingSettings,
  downloadBillingExport,
  type BillingDocument,
  type BillingDocumentType,
  type BillingDocumentStatus,
  type BillingPaymentMethod,
  type BillingSettings,
  type BillingNumberAudit,
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
  items: CreateItemState[];
};

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<BillingDocumentType, string> = {
  INVOICE: "Factura",
  QUOTE: "Presupuesto",
  CREDIT_NOTE: "Nota de crédito",
};

const TYPE_COLORS: Record<BillingDocumentType, string> = {
  INVOICE: "bg-blue-100 text-blue-800",
  QUOTE: "bg-yellow-100 text-yellow-800",
  CREDIT_NOTE: "bg-orange-100 text-orange-800",
};

const STATUS_LABELS: Record<BillingDocumentStatus, string> = {
  DRAFT: "Borrador",
  ISSUED: "Emitida",
  SENT: "Enviada",
  PAID: "Pagada",
  VOID: "Anulada",
};

const STATUS_COLORS: Record<BillingDocumentStatus, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700",
  ISSUED: "bg-blue-100 text-blue-700",
  SENT: "bg-purple-100 text-purple-700",
  PAID: "bg-emerald-100 text-emerald-700",
  VOID: "bg-red-100 text-red-700",
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

const TAB_TYPES: Array<{ key: BillingDocumentType | "ALL"; label: string }> = [
  { key: "ALL", label: "Todos" },
  { key: "INVOICE", label: "Facturas" },
  { key: "QUOTE", label: "Presupuestos" },
  { key: "CREDIT_NOTE", label: "Notas de crédito" },
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

  // Detail modal
  const [selectedDoc, setSelectedDoc] =
    useState<BillingDocumentWithAudits | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create form modal
  const [showCreate, setShowCreate] = useState(false);
  const [createType, setCreateType] = useState<BillingDocumentType>("INVOICE");
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    notes: "",
    payment_method: "" as BillingPaymentMethod | "",
    language: "ES" as "ES" | "EN",
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
  const [settingsForm, setSettingsForm] = useState<Partial<BillingSettings>>(
    {},
  );
  const [savingSettings, setSavingSettings] = useState(false);

  // Action states
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  // ─── Open detail ──────────────────────────────────────────────────────────

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setSelectedDoc(null);
    try {
      const doc = await fetchBillingDocumentById(id);
      setSelectedDoc(doc);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error cargando documento",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  // ─── Issue document ────────────────────────────────────────────────────────

  const handleIssue = async (id: string) => {
    setIssuingId(id);
    try {
      const doc = await issueBillingDocument(id);
      toast.success(`Documento emitido: ${doc.document_number}`);
      if (selectedDoc?.id === id) setSelectedDoc(doc as BillingDocumentWithAudits);
      await loadDocs(page);
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
      setSelectedDoc(null);
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
    if (!confirm("¿Eliminar este documento borrador?")) return;
    setDeletingId(id);
    try {
      await deleteBillingDocument(id);
      toast.success("Documento eliminado");
      if (selectedDoc?.id === id) setSelectedDoc(null);
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
      if (selectedDoc?.id === updated.id)
        setSelectedDoc(updated as BillingDocumentWithAudits);
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
    setCreateType(type);
    setCreateForm({
      notes: "",
      payment_method: "",
      language: "ES",
      items: [{ description: "", qty: "1", unit_price: "", tax_rate: "0.21" }],
    });
    setShowCreate(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = createForm.items.filter(
      (i) => i.description.trim() && i.unit_price,
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
        items: validItems.map((i, idx) => ({
          description: i.description,
          qty: Number(i.qty) || 1,
          unit_price: Number(i.unit_price) || 0,
          tax_rate: Number(i.tax_rate) ?? 0.21,
          position: idx,
        })),
      });
      toast.success(
        createType === "INVOICE"
          ? "Factura creada en borrador"
          : "Presupuesto creado",
      );
      setShowCreate(false);
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

  const openSettings = async () => {
    setShowSettings(true);
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
        invoice_prefix: s.invoice_prefix,
        quote_prefix: s.quote_prefix,
        credit_note_prefix: s.credit_note_prefix,
        default_tax_rate: s.default_tax_rate,
      });
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error cargando ajustes",
      );
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await updateBillingSettings(settingsForm);
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

  // ─── Create item helpers ───────────────────────────────────────────────────

  const addCreateItem = () => {
    setCreateForm((f) => ({
      ...f,
      items: [
        ...f.items,
        { description: "", qty: "1", unit_price: "", tax_rate: "0.21" },
      ],
    }));
  };

  const removeCreateItem = (idx: number) => {
    setCreateForm((f) => ({
      ...f,
      items: f.items.filter((_, i) => i !== idx),
    }));
  };

  const updateCreateItem = (idx: number, field: string, value: string) => {
    setCreateForm((f) => ({
      ...f,
      items: f.items.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item,
      ),
    }));
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            Facturación y Presupuestos
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {total} documento{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => openCreateForm("QUOTE")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm font-medium hover:bg-zinc-50 transition"
          >
            <Plus className="w-4 h-4" />
            Nuevo Presupuesto
          </button>
          <button
            onClick={() => openCreateForm("INVOICE")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white text-sm font-medium hover:bg-zinc-800 transition"
          >
            <Plus className="w-4 h-4" />
            Nueva Factura
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm font-medium hover:bg-zinc-50 transition"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
          <button
            onClick={openSettings}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm font-medium hover:bg-zinc-50 transition"
          >
            <Settings className="w-4 h-4" />
            Ajustes
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 p-1 rounded-lg w-fit">
        {TAB_TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key as BillingDocumentType | "ALL");
              setPage(1);
            }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              tab === t.key
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar número, cliente, NIF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadDocs(1)}
            className="pl-9 pr-4 py-2 rounded-lg border border-zinc-300 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as BillingDocumentStatus | "")
          }
          className="px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
        >
          <option value="">Todos los estados</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          title="Fecha desde"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          title="Fecha hasta"
        />
        <button
          onClick={() => loadDocs(1)}
          className="px-3 py-2 rounded-lg bg-zinc-900 text-white text-sm hover:bg-zinc-700 transition"
        >
          Buscar
        </button>
        {(search || fromDate || toDate || statusFilter) && (
          <button
            onClick={() => {
              setSearch("");
              setFromDate("");
              setToDate("");
              setStatusFilter("");
            }}
            className="text-sm text-zinc-500 hover:text-zinc-900 underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando...
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            <FileText className="w-12 h-12 mb-3" />
            <p className="text-sm">No hay documentos</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">
                    Número
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">
                    Tipo
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">
                    Cliente
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">
                    Fecha emisión
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-zinc-600">
                    Total
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-zinc-600">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {docs.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-zinc-50 transition cursor-pointer"
                    onClick={() => openDetail(doc.id)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-zinc-800">
                      {doc.document_number ?? (
                        <span className="text-zinc-400 italic">Sin número</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[doc.type]}`}
                      >
                        {TYPE_LABELS[doc.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[doc.status]}`}
                      >
                        {STATUS_LABELS[doc.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-700 max-w-[160px] truncate">
                      {doc.customer_name ?? doc.customer_email ?? (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {formatDate(doc.issue_date ?? doc.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-800">
                      {formatCurrency(Number(doc.total_amount))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => openDetail(doc.id)}
                          className="p-1.5 rounded hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {doc.status === "DRAFT" && (
                          <button
                            onClick={() => handleIssue(doc.id)}
                            disabled={issuingId === doc.id}
                            className="p-1.5 rounded hover:bg-blue-50 text-blue-500 hover:text-blue-700 disabled:opacity-50"
                            title="Emitir"
                          >
                            {issuingId === doc.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        {doc.type === "QUOTE" && doc.status !== "VOID" && (
                          <button
                            onClick={() => handleConvert(doc.id)}
                            disabled={convertingId === doc.id}
                            className="p-1.5 rounded hover:bg-yellow-50 text-yellow-600 hover:text-yellow-800 disabled:opacity-50"
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
                            className="p-1.5 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700"
                            title="Editar número"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(doc.status === "DRAFT" || doc.status === "VOID") && (
                          <button
                            onClick={() => handleDelete(doc.id)}
                            disabled={deletingId === doc.id}
                            className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600 disabled:opacity-50"
                            title="Eliminar"
                          >
                            {deletingId === doc.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span>
            Página {page} de {totalPages} · {total} documentos
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => loadDocs(page - 1)}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded border hover:bg-zinc-50 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
            <button
              onClick={() => loadDocs(page + 1)}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded border hover:bg-zinc-50 disabled:opacity-50"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Detail modal ──────────────────────────────────────────────────── */}
      {(selectedDoc || detailLoading) && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl border">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold text-zinc-900">
                {selectedDoc
                  ? `${TYPE_LABELS[selectedDoc.type]} · ${selectedDoc.document_number ?? "Borrador"}`
                  : "Cargando..."}
              </h2>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
              </div>
            ) : selectedDoc ? (
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${TYPE_COLORS[selectedDoc.type]}`}
                  >
                    {TYPE_LABELS[selectedDoc.type]}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[selectedDoc.status]}`}
                  >
                    {STATUS_LABELS[selectedDoc.status]}
                  </span>
                  {selectedDoc.payment_method && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
                      {PAYMENT_METHOD_LABELS[selectedDoc.payment_method]}
                    </span>
                  )}
                </div>

                {/* Two column: company + customer */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4 space-y-1">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                      Emisor
                    </p>
                    <p className="text-sm font-medium">
                      {selectedDoc.company_legal_name}
                    </p>
                    {selectedDoc.company_trade_name && (
                      <p className="text-xs text-zinc-500">
                        {selectedDoc.company_trade_name}
                      </p>
                    )}
                    <p className="text-xs text-zinc-500">
                      NIF: {selectedDoc.company_nif}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {selectedDoc.company_address}
                    </p>
                    {selectedDoc.company_iban_1 && (
                      <p className="text-xs font-mono text-zinc-400 mt-1">
                        IBAN: {selectedDoc.company_iban_1}
                      </p>
                    )}
                    {selectedDoc.company_iban_2 && (
                      <p className="text-xs font-mono text-zinc-400">
                        IBAN: {selectedDoc.company_iban_2}
                      </p>
                    )}
                  </div>

                  <div className="rounded-lg border p-4 space-y-1">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                      Cliente
                    </p>
                    <p className="text-sm font-medium">
                      {selectedDoc.customer_name || "—"}
                    </p>
                    {selectedDoc.customer_tax_id && (
                      <p className="text-xs text-zinc-500">
                        NIF/CIF: {selectedDoc.customer_tax_id}
                      </p>
                    )}
                    {selectedDoc.customer_email && (
                      <p className="text-xs text-zinc-500">
                        {selectedDoc.customer_email}
                      </p>
                    )}
                    {selectedDoc.customer_address && (
                      <p className="text-xs text-zinc-500">
                        {selectedDoc.customer_address}
                      </p>
                    )}
                  </div>
                </div>

                {/* Dates / meta */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      label: "Fecha emisión",
                      value: formatDate(selectedDoc.issue_date),
                    },
                    {
                      label: "Fecha vencimiento",
                      value: formatDate(selectedDoc.due_date),
                    },
                    { label: "Idioma", value: selectedDoc.language },
                    { label: "Moneda", value: selectedDoc.currency },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs text-zinc-400">{label}</p>
                      <p className="text-sm font-medium text-zinc-800 mt-0.5">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Items table */}
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                    Líneas
                  </p>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-zinc-50 border-b">
                          <th className="text-left px-3 py-2 font-medium text-zinc-600">
                            Descripción
                          </th>
                          <th className="text-right px-3 py-2 font-medium text-zinc-600">
                            Cant.
                          </th>
                          <th className="text-right px-3 py-2 font-medium text-zinc-600">
                            Precio unit.
                          </th>
                          <th className="text-right px-3 py-2 font-medium text-zinc-600">
                            IVA
                          </th>
                          <th className="text-right px-3 py-2 font-medium text-zinc-600">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50">
                        {selectedDoc.items?.map((item) => (
                          <tr key={item.id}>
                            <td className="px-3 py-2 text-zinc-800">
                              {item.description}
                            </td>
                            <td className="px-3 py-2 text-right text-zinc-600">
                              {Number(item.qty)}
                            </td>
                            <td className="px-3 py-2 text-right text-zinc-600">
                              {formatCurrency(Number(item.unit_price))}
                            </td>
                            <td className="px-3 py-2 text-right text-zinc-500">
                              {(Number(item.tax_rate) * 100).toFixed(0)}%
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-zinc-800">
                              {formatCurrency(Number(item.line_total))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="rounded-lg border p-4 w-64 space-y-2">
                    <div className="flex justify-between text-sm text-zinc-600">
                      <span>Base imponible</span>
                      <span>
                        {formatCurrency(Number(selectedDoc.subtotal_amount))}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-zinc-600">
                      <span>IVA</span>
                      <span>
                        {formatCurrency(Number(selectedDoc.tax_amount))}
                      </span>
                    </div>
                    {Number(selectedDoc.discount_amount) > 0 && (
                      <div className="flex justify-between text-sm text-red-500">
                        <span>Descuento</span>
                        <span>
                          -{formatCurrency(Number(selectedDoc.discount_amount))}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold text-zinc-900 border-t pt-2">
                      <span>Total</span>
                      <span>
                        {formatCurrency(Number(selectedDoc.total_amount))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedDoc.notes && (
                  <div className="rounded-lg border p-4">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">
                      Notas
                    </p>
                    <p className="text-sm text-zinc-700">{selectedDoc.notes}</p>
                  </div>
                )}

                {/* Audit log */}
                {selectedDoc.number_audits &&
                  selectedDoc.number_audits.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                        Historial de numeración
                      </p>
                      <div className="space-y-2">
                        {selectedDoc.number_audits.map((audit) => (
                          <div
                            key={audit.id}
                            className="rounded-lg border bg-zinc-50 px-4 py-2 text-xs text-zinc-600"
                          >
                            <div className="flex items-center justify-between">
                              <span>
                                {audit.old_number ? (
                                  <>
                                    <span className="line-through text-zinc-400">
                                      {audit.old_number}
                                    </span>
                                    {" → "}
                                    <span className="font-medium text-zinc-800">
                                      {audit.new_number}
                                    </span>
                                  </>
                                ) : (
                                  <span className="font-medium text-zinc-800">
                                    Asignado: {audit.new_number}
                                  </span>
                                )}
                              </span>
                              <span className="text-zinc-400">
                                {new Date(audit.created_at).toLocaleString(
                                  "es-ES",
                                )}
                              </span>
                            </div>
                            <div className="mt-0.5">
                              {audit.changed_by_email && (
                                <span className="text-zinc-400">
                                  {audit.changed_by_email}
                                </span>
                              )}
                              {audit.reason && (
                                <span className="text-zinc-500 ml-2">
                                  · {audit.reason}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  {selectedDoc.status === "DRAFT" && (
                    <button
                      onClick={() => handleIssue(selectedDoc.id)}
                      disabled={issuingId === selectedDoc.id}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      {issuingId === selectedDoc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Emitir documento
                    </button>
                  )}
                  {selectedDoc.type === "QUOTE" &&
                    selectedDoc.status !== "VOID" && (
                      <button
                        onClick={() => handleConvert(selectedDoc.id)}
                        disabled={convertingId === selectedDoc.id}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500 text-white text-sm font-medium hover:bg-yellow-600 disabled:opacity-50 transition"
                      >
                        {convertingId === selectedDoc.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ArrowRight className="w-4 h-4" />
                        )}
                        Convertir a factura
                      </button>
                    )}
                  {selectedDoc.document_number && (
                    <button
                      onClick={() => {
                        setSelectedDoc(null);
                        openEditNumber(selectedDoc);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-300 text-sm font-medium hover:bg-zinc-50 transition"
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar número
                    </button>
                  )}
                  {selectedDoc.pdf_url && (
                    <a
                      href={selectedDoc.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-300 text-sm font-medium hover:bg-zinc-50 transition"
                    >
                      <Download className="w-4 h-4" />
                      Descargar PDF
                    </a>
                  )}
                  {(selectedDoc.status === "DRAFT" ||
                    selectedDoc.status === "VOID") && (
                    <button
                      onClick={() => handleDelete(selectedDoc.id)}
                      disabled={deletingId === selectedDoc.id}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition"
                    >
                      {deletingId === selectedDoc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Edit number modal ────────────────────────────────────────────── */}
      {editNumberDoc && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                Editar número de documento
              </h3>
              <button
                onClick={() => setEditNumberDoc(null)}
                className="p-1.5 rounded-lg hover:bg-zinc-100"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
            <p className="text-sm text-zinc-500">
              Número actual:{" "}
              <span className="font-mono font-medium text-zinc-800">
                {editNumberDoc.document_number}
              </span>
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-600 block mb-1">
                  Nuevo número *
                </label>
                <input
                  value={editNumberValue}
                  onChange={(e) => setEditNumberValue(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  placeholder="INV_2026_0000001"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600 block mb-1">
                  Motivo del cambio
                </label>
                <input
                  value={editNumberReason}
                  onChange={(e) => setEditNumberReason(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  placeholder="Corrección de error, inicio de serie..."
                />
              </div>
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3">
              ⚠️ Este cambio quedará registrado en el historial de auditoría.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditNumberDoc(null)}
                className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-zinc-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveNumber}
                disabled={savingNumber || !editNumberValue.trim()}
                className="px-4 py-2 rounded-lg bg-black text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
              >
                {savingNumber ? "Guardando..." : "Guardar número"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create document modal ────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl border">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-bold">
                Nuevo{" "}
                {createType === "INVOICE"
                  ? "Factura"
                  : createType === "QUOTE"
                    ? "Presupuesto"
                    : "Nota de crédito"}
              </h3>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <form
              onSubmit={handleCreate}
              className="flex-1 overflow-y-auto p-5 space-y-4"
            >
              {/* Type and language */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-600 block mb-1">
                    Tipo
                  </label>
                  <select
                    value={createType}
                    onChange={(e) =>
                      setCreateType(e.target.value as BillingDocumentType)
                    }
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    <option value="INVOICE">Factura</option>
                    <option value="QUOTE">Presupuesto</option>
                    <option value="CREDIT_NOTE">Nota de crédito</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600 block mb-1">
                    Idioma
                  </label>
                  <select
                    value={createForm.language}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        language: e.target.value as "ES" | "EN",
                      }))
                    }
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    <option value="ES">Español</option>
                    <option value="EN">English</option>
                  </select>
                </div>
              </div>

              {/* Payment method */}
              <div>
                <label className="text-xs font-medium text-zinc-600 block mb-1">
                  Forma de pago
                </label>
                <select
                  value={createForm.payment_method}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      payment_method: e.target.value as
                        | BillingPaymentMethod
                        | "",
                    }))
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="">— Sin especificar —</option>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {PAYMENT_METHOD_LABELS[m]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-zinc-600 block mb-1">
                  Notas
                </label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  placeholder="Notas visibles en el documento..."
                />
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-zinc-600">
                    Líneas del documento *
                  </label>
                  <button
                    type="button"
                    onClick={addCreateItem}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + Añadir línea
                  </button>
                </div>
                <div className="space-y-2">
                  {createForm.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-start"
                    >
                      <input
                        value={item.description}
                        onChange={(e) =>
                          updateCreateItem(idx, "description", e.target.value)
                        }
                        placeholder="Descripción del producto/servicio"
                        className="col-span-5 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                      />
                      <input
                        value={item.qty}
                        onChange={(e) =>
                          updateCreateItem(idx, "qty", e.target.value)
                        }
                        placeholder="Cant."
                        type="number"
                        min="0"
                        step="any"
                        className="col-span-2 border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-zinc-900"
                      />
                      <input
                        value={item.unit_price}
                        onChange={(e) =>
                          updateCreateItem(idx, "unit_price", e.target.value)
                        }
                        placeholder="Precio €"
                        type="number"
                        min="0"
                        step="any"
                        className="col-span-2 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                      />
                      <div className="col-span-2 relative">
                        <input
                          value={String(Number(item.tax_rate) * 100)}
                          onChange={(e) =>
                            updateCreateItem(
                              idx,
                              "tax_rate",
                              String(Number(e.target.value) / 100),
                            )
                          }
                          placeholder="IVA%"
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          className="w-full border rounded-lg px-2 py-1.5 text-sm pr-5 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                          %
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCreateItem(idx)}
                        className="col-span-1 p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
                        title="Eliminar línea"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total preview */}
              {createForm.items.some((i) => i.unit_price) && (
                <div className="rounded-lg bg-zinc-50 p-3 text-sm text-right">
                  {(() => {
                    const subtotal = createForm.items.reduce((s, i) => {
                      const ls =
                        Number(i.qty || 1) * Number(i.unit_price || 0);
                      return s + ls;
                    }, 0);
                    const tax = createForm.items.reduce((s, i) => {
                      const ls =
                        Number(i.qty || 1) * Number(i.unit_price || 0);
                      return s + ls * Number(i.tax_rate || 0.21);
                    }, 0);
                    return (
                      <div className="space-y-1">
                        <div className="flex justify-between text-zinc-500">
                          <span>Base</span>
                          <span>{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-zinc-500">
                          <span>IVA</span>
                          <span>{formatCurrency(tax)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-zinc-900 border-t pt-1">
                          <span>Total</span>
                          <span>{formatCurrency(subtotal + tax)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
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

      {/* ── Settings modal ────────────────────────────────────────────────── */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-xl border">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-bold">Ajustes de facturación</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            {settings === null ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
              </div>
            ) : (
              <form
                onSubmit={handleSaveSettings}
                className="flex-1 overflow-y-auto p-5 space-y-4"
              >
                {/* Company */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Datos empresa
                  </p>
                  {[
                    { key: "legal_name", label: "Razón social" },
                    { key: "trade_name", label: "Nombre comercial" },
                    { key: "nif", label: "NIF/CIF" },
                    { key: "address_real", label: "Dirección real" },
                    { key: "address_virtual", label: "Dirección virtual" },
                    { key: "iban_caixabank", label: "IBAN CaixaBank" },
                    { key: "iban_bbva", label: "IBAN BBVA" },
                    { key: "website_com", label: "Web .com" },
                    { key: "website_es", label: "Web .es" },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="text-xs font-medium text-zinc-600 block mb-1">
                        {label}
                      </label>
                      <input
                        value={
                          (settingsForm as Record<string, unknown>)[key] as string ?? ""
                        }
                        onChange={(e) =>
                          setSettingsForm((f) => ({
                            ...f,
                            [key]: e.target.value,
                          }))
                        }
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                      />
                    </div>
                  ))}
                </div>

                {/* Numbering */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Numeración
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: "invoice_prefix", label: "Prefijo facturas" },
                      { key: "quote_prefix", label: "Prefijo presupuestos" },
                      { key: "credit_note_prefix", label: "Prefijo abonos" },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="text-xs font-medium text-zinc-600 block mb-1">
                          {label}
                        </label>
                        <input
                          value={
                            (settingsForm as Record<string, unknown>)[key] as string ?? ""
                          }
                          onChange={(e) =>
                            setSettingsForm((f) => ({
                              ...f,
                              [key]: e.target.value,
                            }))
                          }
                          className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900"
                          placeholder="INV"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="max-w-xs">
                    <label className="text-xs font-medium text-zinc-600 block mb-1">
                      IVA por defecto (%)
                    </label>
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
                      onChange={(e) =>
                        setSettingsForm((f) => ({
                          ...f,
                          default_tax_rate: Number(e.target.value) / 100,
                        }))
                      }
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                      placeholder="21"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-zinc-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="px-4 py-2 rounded-lg bg-black text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {savingSettings ? "Guardando..." : "Guardar ajustes"}
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
