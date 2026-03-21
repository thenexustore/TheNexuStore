import { fetchWithAuth } from "../utils";
import { API_URL } from "../env";

export type BillingDocumentType = "INVOICE" | "QUOTE" | "CREDIT_NOTE";
export type BillingDocumentStatus = "DRAFT" | "ISSUED" | "SENT" | "PAID" | "VOID";
export type BillingLanguage = "ES" | "EN";
export type BillingPaymentMethod =
  | "REDSYS"
  | "STRIPE"
  | "PAYPAL"
  | "COD"
  | "BANK_TRANSFER"
  | "CASH"
  | "OTHER";

export interface BillingDocumentItem {
  id: string;
  description: string;
  qty: number;
  unit_price: number;
  tax_rate: number;
  line_subtotal: number;
  tax_amount: number;
  line_total: number;
  position: number;
}

export interface BillingDocument {
  id: string;
  type: BillingDocumentType;
  status: BillingDocumentStatus;
  document_number: string | null;
  order_id: string | null;
  customer_id: string | null;
  language: BillingLanguage;
  currency: string;
  issue_date: string | null;
  due_date: string | null;
  payment_method: BillingPaymentMethod | null;
  pdf_url: string | null;
  source_document_id: string | null;
  company_legal_name: string | null;
  company_trade_name: string | null;
  company_nif: string | null;
  company_address: string | null;
  company_iban_1: string | null;
  company_iban_2: string | null;
  customer_name: string | null;
  customer_tax_id: string | null;
  customer_email: string | null;
  customer_address: string | null;
  subtotal_amount: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  notes: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  issued_at: string | null;
  items: BillingDocumentItem[];
}

export interface BillingDocumentsResponse {
  items: BillingDocument[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface BillingTemplate {
  id: string;
  name: string;
  background_url: string | null;
  config_json: Record<string, unknown>;
  is_default: boolean;
  created_at: string;
}

export interface BillingSettings {
  id: string;
  legal_name: string;
  trade_name: string;
  nif: string;
  address_real: string;
  address_virtual: string;
  iban_caixabank: string;
  iban_bbva: string;
  website_com: string;
  website_es: string;
  default_language: BillingLanguage;
  default_currency: string;
  invoice_prefix: string;
  quote_prefix: string;
  credit_note_prefix: string;
  default_tax_rate: number;
}

export interface BillingNumberAudit {
  id: string;
  document_id: string;
  old_number: string | null;
  new_number: string;
  changed_by: string;
  changed_by_email: string | null;
  reason: string | null;
  created_at: string;
}

export interface CreateBillingDocumentInput {
  type: BillingDocumentType;
  status?: BillingDocumentStatus;
  order_id?: string;
  customer_id?: string;
  language?: BillingLanguage;
  payment_method?: BillingPaymentMethod;
  issue_date?: string;
  due_date?: string;
  notes?: string;
  internal_notes?: string;
  template_id?: string;
  items?: Array<{
    description: string;
    qty: number;
    unit_price: number;
    tax_rate?: number;
    position?: number;
  }>;
}

export interface UpdateBillingDocumentInput {
  status?: BillingDocumentStatus;
  language?: BillingLanguage;
  payment_method?: BillingPaymentMethod;
  issue_date?: string;
  due_date?: string;
  notes?: string;
  internal_notes?: string;
  template_id?: string;
  items?: Array<{
    description: string;
    qty: number;
    unit_price: number;
    tax_rate?: number;
    position?: number;
  }>;
}

export async function fetchBillingDocuments(params: {
  page?: number;
  limit?: number;
  type?: BillingDocumentType;
  status?: BillingDocumentStatus;
  search?: string;
  from?: string;
  to?: string;
}): Promise<BillingDocumentsResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.type) query.set("type", params.type);
  if (params.status) query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  return fetchWithAuth(`/admin/billing/documents?${query.toString()}`);
}

export async function fetchBillingDocumentById(
  id: string,
): Promise<BillingDocument & { number_audits: BillingNumberAudit[] }> {
  return fetchWithAuth(`/admin/billing/documents/${id}`);
}

export async function createBillingDocument(
  input: CreateBillingDocumentInput,
): Promise<BillingDocument> {
  return fetchWithAuth("/admin/billing/documents", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateBillingDocument(
  id: string,
  input: UpdateBillingDocumentInput,
): Promise<BillingDocument> {
  return fetchWithAuth(`/admin/billing/documents/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteBillingDocument(
  id: string,
): Promise<{ deleted: boolean; id: string }> {
  return fetchWithAuth(`/admin/billing/documents/${id}`, {
    method: "DELETE",
  });
}

export async function issueBillingDocument(
  id: string,
  input?: { payment_method?: BillingPaymentMethod; issue_date?: string },
): Promise<BillingDocument> {
  return fetchWithAuth(`/admin/billing/documents/${id}/issue`, {
    method: "POST",
    body: JSON.stringify(input ?? {}),
  });
}

export async function convertQuoteToInvoice(
  quoteId: string,
  input?: { issue_date?: string; payment_method?: BillingPaymentMethod },
): Promise<BillingDocument> {
  return fetchWithAuth(
    `/admin/billing/documents/${quoteId}/convert-to-invoice`,
    {
      method: "POST",
      body: JSON.stringify(input ?? {}),
    },
  );
}

export async function updateBillingDocumentNumber(
  id: string,
  new_number: string,
  reason?: string,
): Promise<BillingDocument> {
  return fetchWithAuth(`/admin/billing/documents/${id}/number`, {
    method: "PUT",
    body: JSON.stringify({ new_number, reason }),
  });
}

export async function fetchBillingSettings(): Promise<BillingSettings> {
  return fetchWithAuth("/admin/billing/settings");
}

export async function updateBillingSettings(
  input: Partial<BillingSettings>,
): Promise<BillingSettings> {
  return fetchWithAuth("/admin/billing/settings", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function fetchBillingTemplates(): Promise<BillingTemplate[]> {
  return fetchWithAuth("/admin/billing/templates");
}

export async function createBillingTemplate(input: {
  name: string;
  background_url?: string;
  config_json: Record<string, unknown>;
  is_default?: boolean;
}): Promise<BillingTemplate> {
  return fetchWithAuth("/admin/billing/templates", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateBillingTemplate(
  id: string,
  input: Partial<{
    name: string;
    background_url: string;
    config_json: Record<string, unknown>;
    is_default: boolean;
  }>,
): Promise<BillingTemplate> {
  return fetchWithAuth(`/admin/billing/templates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteBillingTemplate(
  id: string,
): Promise<{ deleted: boolean }> {
  return fetchWithAuth(`/admin/billing/templates/${id}`, {
    method: "DELETE",
  });
}

export async function markOrderDelivered(
  orderId: string,
  tracking_url?: string,
): Promise<{ order_status: string; billing_document: BillingDocument }> {
  return fetchWithAuth(`/admin/billing/orders/${orderId}/deliver`, {
    method: "POST",
    body: JSON.stringify({ tracking_url }),
  });
}

export function getBillingExportUrl(params: {
  type?: BillingDocumentType;
  status?: BillingDocumentStatus;
  from?: string;
  to?: string;
}): string {
  const query = new URLSearchParams();
  if (params.type) query.set("type", params.type);
  if (params.status) query.set("status", params.status);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  const baseUrl = API_URL;
  return `${baseUrl}/admin/billing/export?${query.toString()}`;
}

export async function downloadBillingExport(params: {
  type?: BillingDocumentType;
  status?: BillingDocumentStatus;
  from?: string;
  to?: string;
}): Promise<void> {
  const query = new URLSearchParams();
  if (params.type) query.set("type", params.type);
  if (params.status) query.set("status", params.status);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  const token = localStorage.getItem("admin_token") ?? "";
  const baseUrl = API_URL;
  const response = await fetch(
    `${baseUrl}/admin/billing/export?${query.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw new Error(`Export failed (${response.status})`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "billing-export.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Brief delay so the browser can initiate the download before the URL is revoked
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
