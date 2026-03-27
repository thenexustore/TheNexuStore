"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import {
  Search,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  FileText,
  ExternalLink,
  Loader2,
  Receipt,
} from "lucide-react";
import {
  addOrderNote,
  createOrderShipment,
  fetchOrderById,
  fetchOrders,
  fetchOrderTimeline,
  performOrderAction,
  markOrderDelivered,
  updateOrderShipment,
  fetchBillingDocumentsByOrder,
  createBillingDocumentFromOrder,
  downloadBillingDocumentPdf,
  type Order,
  type OrderDetail,
  type OrderShipment,
  type OrderTimelineEntry,
  type BillingDocument,
} from "@/lib/api";
import { toast } from "sonner";
import { loadAdminSettings, subscribeAdminSettings } from "@/lib/admin-settings";
import { formatCurrency as formatCurrencyValue } from "@/lib/currency";

const statusColors: Record<string, string> = {
  PENDING_PAYMENT: "bg-blue-100 text-blue-800",
  ON_HOLD: "bg-amber-100 text-amber-800",
  PROCESSING: "bg-yellow-100 text-yellow-800",
  PAID: "bg-green-100 text-green-800",
  SHIPPED: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-800",
  REFUNDED: "bg-zinc-200 text-zinc-800",
  FAILED: "bg-rose-100 text-rose-800",
};

const statusIcons: Record<string, any> = {
  PAID: CheckCircle,
  DELIVERED: CheckCircle,
  CANCELLED: XCircle,
  REFUNDED: XCircle,
};

const SHIPMENT_STATUS_OPTIONS = [
  "PENDING",
  "SHIPPED",
  "IN_TRANSIT",
  "DELIVERED",
  "EXCEPTION",
];

type ShipmentDraft = {
  carrier: string;
  service_level: string;
  tracking_number: string;
  tracking_url: string;
  status: string;
};

const createEmptyShipmentDraft = (): ShipmentDraft => ({
  carrier: "Infortisa",
  service_level: "",
  tracking_number: "",
  tracking_url: "",
  status: "PENDING",
});

const toShipmentDraft = (shipment: OrderShipment): ShipmentDraft => ({
  carrier: shipment.carrier || "",
  service_level: shipment.service_level || "",
  tracking_number: shipment.tracking_number || "",
  tracking_url: shipment.tracking_url || "",
  status: shipment.status || "PENDING",
});

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [timeline, setTimeline] = useState<OrderTimelineEntry[]>([]);
  const [note, setNote] = useState("");
  const [shipmentDraft, setShipmentDraft] = useState<ShipmentDraft>(() =>
    createEmptyShipmentDraft(),
  );
  const [shipmentEdits, setShipmentEdits] = useState<
    Record<string, ShipmentDraft>
  >({});
  const [shipmentBusyKey, setShipmentBusyKey] = useState<string | null>(null);
  const [deliverTrackingUrl, setDeliverTrackingUrl] = useState("");
  const [markingDelivered, setMarkingDelivered] = useState(false);
  const [adminSettings, setAdminSettings] = useState(() => loadAdminSettings());

  // Billing state for selected order
  const [orderBillingDocs, setOrderBillingDocs] = useState<BillingDocument[]>([]);
  const [billingDocsLoading, setBillingDocsLoading] = useState(false);
  const [generatingBillingDoc, setGeneratingBillingDoc] = useState(false);
  const [downloadingBillingDocId, setDownloadingBillingDocId] = useState<string | null>(null);

  useEffect(() => subscribeAdminSettings(setAdminSettings), []);
  const isEn = adminSettings.adminLanguage === "en";
  const t = (en: string, es: string) => (isEn ? en : es);

  const formatMoney = (amount: number) =>
    formatCurrencyValue(Number(amount || 0), adminSettings.dateFormat, adminSettings.defaultCurrency);

  const formatDate = (date: string) => new Date(date).toLocaleString(adminSettings.dateFormat);

  const loadOrders = useCallback(async (targetPage = page) => {
    try {
      setLoading(true);
      const data = await fetchOrders(targetPage, adminSettings.ordersPageSize, status, search);
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
      setPage(targetPage);
    } catch (error: any) {
      toast.error(error.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [adminSettings.ordersPageSize, page, search, status]);

  const refreshOrderDetail = useCallback(async (orderId: string) => {
    const [detail, timelineData] = await Promise.all([
      fetchOrderById(orderId),
      fetchOrderTimeline(orderId),
    ]);
    setOrderDetail(detail);
    setTimeline(timelineData);
    setShipmentDraft(createEmptyShipmentDraft());
    setShipmentEdits(
      Object.fromEntries(
        (detail.shipments || []).map((shipment) => [
          shipment.id,
          toShipmentDraft(shipment),
        ]),
      ),
    );
  }, []);

  const openOrderDetail = async (orderId: string) => {
    try {
      setSelectedOrderId(orderId);
      setDetailLoading(true);
      setOrderBillingDocs([]);
      await refreshOrderDetail(orderId);
      // Load billing docs in background
      setBillingDocsLoading(true);
      try {
        const billingData = await fetchBillingDocumentsByOrder(orderId);
        setOrderBillingDocs(billingData.documents ?? []);
      } catch {
        // non-critical
      } finally {
        setBillingDocsLoading(false);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load order detail");
      setSelectedOrderId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const submitNote = async () => {
    if (!selectedOrderId) return;
    const trimmed = note.trim();
    if (!trimmed) return;

    try {
      await addOrderNote(selectedOrderId, trimmed);
      setNote("");
      toast.success("Internal note added");
      await refreshOrderDetail(selectedOrderId);
    } catch (error: any) {
      toast.error(error.message || "Failed to add note");
    }
  };

  const submitShipmentCreate = async () => {
    if (!selectedOrderId) return;
    const carrier = shipmentDraft.carrier.trim();
    if (!carrier) {
      toast.error("Carrier is required");
      return;
    }

    try {
      setShipmentBusyKey("new");
      await createOrderShipment(selectedOrderId, {
        carrier,
        service_level: shipmentDraft.service_level.trim() || undefined,
        tracking_number: shipmentDraft.tracking_number.trim() || undefined,
        tracking_url: shipmentDraft.tracking_url.trim() || undefined,
        status: shipmentDraft.status,
      });
      toast.success("Shipment created");
      setShipmentDraft(createEmptyShipmentDraft());
      await refreshOrderDetail(selectedOrderId);
    } catch (error: any) {
      toast.error(error.message || "Failed to create shipment");
    } finally {
      setShipmentBusyKey(null);
    }
  };

  const submitShipmentUpdate = async (shipmentId: string) => {
    if (!selectedOrderId) return;
    const draft = shipmentEdits[shipmentId];
    if (!draft?.carrier.trim()) {
      toast.error("Carrier is required");
      return;
    }

    try {
      setShipmentBusyKey(shipmentId);
      await updateOrderShipment(selectedOrderId, shipmentId, {
        carrier: draft.carrier.trim(),
        service_level: draft.service_level.trim() || undefined,
        tracking_number: draft.tracking_number.trim() || undefined,
        tracking_url: draft.tracking_url.trim() || undefined,
        status: draft.status,
      });
      toast.success("Shipment updated");
      await refreshOrderDetail(selectedOrderId);
    } catch (error: any) {
      toast.error(error.message || "Failed to update shipment");
    } finally {
      setShipmentBusyKey(null);
    }
  };

  const handleMarkDelivered = async () => {
    if (!selectedOrderId) return;
    setMarkingDelivered(true);
    try {
      const result = await markOrderDelivered(selectedOrderId, deliverTrackingUrl || undefined);
      toast.success("Pedido marcado como entregado. Factura emitida y enviada al cliente.");
      setDeliverTrackingUrl("");
      const updated = await fetchOrderById(selectedOrderId);
      setOrderDetail(updated);
      const tl = await fetchOrderTimeline(selectedOrderId);
      setTimeline(tl);
      // Reload billing docs to reflect the newly created doc
      const billingData = await fetchBillingDocumentsByOrder(selectedOrderId);
      setOrderBillingDocs(billingData.documents ?? []);
    } catch (err: any) {
      toast.error(err.message || "Error al marcar como entregado");
    } finally {
      setMarkingDelivered(false);
    }
  };

  const handleOrderAction = async (
    action: "PUT_ON_HOLD" | "RELEASE_HOLD" | "CANCEL" | "MARK_SHIPPED",
  ) => {
    if (!selectedOrderId) return;
    try {
      await performOrderAction(selectedOrderId, {
        action,
        tracking_number:
          action === "MARK_SHIPPED"
            ? shipmentDraft.tracking_number.trim() || undefined
            : undefined,
        tracking_url:
          action === "MARK_SHIPPED"
            ? shipmentDraft.tracking_url.trim() || undefined
            : undefined,
      });
      toast.success("Order action completed");
      await refreshOrderDetail(selectedOrderId);
      await loadOrders(page);
    } catch (error: any) {
      toast.error(error.message || "Failed to apply order action");
    }
  };

  const handleGenerateBillingDoc = async () => {
    if (!selectedOrderId) return;
    setGeneratingBillingDoc(true);
    try {
      const result = await createBillingDocumentFromOrder(selectedOrderId);
      if (result.created) {
        toast.success("Factura en borrador creada correctamente.");
      } else {
        toast.info("Ya existe una factura activa para este pedido.");
      }
      // Always reload to get the authoritative state from the server
      const billingData = await fetchBillingDocumentsByOrder(selectedOrderId);
      setOrderBillingDocs(billingData.documents ?? []);
    } catch (err: any) {
      toast.error(err.message || "Error al generar factura");
    } finally {
      setGeneratingBillingDoc(false);
    }
  };

  const handleDownloadBillingDocPdf = async (docId: string) => {
    setDownloadingBillingDocId(docId);
    try {
      await downloadBillingDocumentPdf(docId);
    } catch (err: any) {
      toast.error(err.message || "Error al descargar el PDF");
    } finally {
      setDownloadingBillingDocId(null);
    }
  };

  useEffect(() => {
    loadOrders(1);
  }, [loadOrders]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadOrders(page);
    }, Math.max(10, adminSettings.ordersRefreshSeconds) * 1000);

    return () => window.clearInterval(timer);
  }, [adminSettings.ordersRefreshSeconds, loadOrders, page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("Orders Management", "Gestión de pedidos")}</h1>
        <p className="text-gray-500 text-sm mt-1">
          {t("Track order lifecycle, customer info and post-sales operations.", "Sigue el ciclo de vida del pedido, datos del cliente y operaciones postventa.")}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Auto-refresh cada {adminSettings.ordersRefreshSeconds}s · {adminSettings.ordersPageSize} filas por página
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order number or email"
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="PENDING_PAYMENT">Pending Payment</option>
              <option value="PROCESSING">Processing</option>
              <option value="PAID">Paid</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REFUNDED">Refunded</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => loadOrders(1)}
            className="flex items-center justify-center px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="py-16 flex items-center justify-center text-sm text-gray-500">
            Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 flex items-center justify-center text-sm text-gray-500">
            No orders found.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order) => {
                    const statusKey = order.status;
                    const StatusIcon = statusIcons[statusKey] || Clock;
                    const statusClass = statusColors[statusKey] || "bg-zinc-100 text-zinc-700";

                    return (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-blue-600">{order.orderNumber}</span>
                            <span className="text-xs text-gray-500">#{order.id.slice(0, 8)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium">{order.customerName || "Guest"}</span>
                            <span className="text-xs text-gray-500">{order.customer}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-sm">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-6 py-4 font-medium">{formatMoney(Number(order.amount))}</td>
                        <td className="px-6 py-4 text-xs text-gray-600">
                          <div className="space-y-1">
                            <p>
                              <span className="font-medium text-gray-800">Provider:</span>{" "}
                              {order.paymentProvider || "-"}
                            </p>
                            <p>
                              <span className="font-medium text-gray-800">Status:</span>{" "}
                              {order.paymentStatus || "-"}
                            </p>
                            {order.redsysResponseCode && (
                              <p>
                                <span className="font-medium text-gray-800">Redsys:</span>{" "}
                                {order.redsysResponseCode}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {order.status.replace("_", " ")}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => openOrderDetail(order.id)}
                            className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t flex items-center justify-between text-sm">
              <div className="text-gray-500">Page {page} of {totalPages}</div>
              <div className="flex items-center space-x-2">
                <button
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                  disabled={page <= 1}
                  onClick={() => loadOrders(page - 1)}
                >
                  Previous
                </button>
                <button
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                  disabled={page >= totalPages}
                  onClick={() => loadOrders(page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedOrderId && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden border shadow-lg flex flex-col">
            <div className="p-4 border-b flex items-center justify-between shrink-0">
              <h2 className="text-lg font-semibold">Order detail & support timeline</h2>
              <button onClick={() => setSelectedOrderId(null)} className="text-gray-500">✕</button>
            </div>

            {detailLoading ? (
              <div className="p-6 text-sm text-gray-500">Loading order detail...</div>
            ) : (
              <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                <div className="p-4 border-r space-y-3">
                  <h3 className="font-semibold">Order summary</h3>
                  {orderDetail && (
                    <>
                      <p className="text-sm"><span className="font-medium">Order:</span> {orderDetail.order_number}</p>
                      <p className="text-sm"><span className="font-medium">Email:</span> {orderDetail.email}</p>
                      <p className="text-sm"><span className="font-medium">Status:</span> {orderDetail.status}</p>
                      {orderDetail.billing_state && (
                        <>
                          <p className="text-sm">
                            <span className="font-medium">Billing:</span>{" "}
                            {orderDetail.billing_state.has_issued_invoice
                              ? "Final invoice issued"
                              : orderDetail.billing_state.has_draft_invoice
                                ? "Draft exists (internal)"
                                : "No billing doc yet"}
                          </p>
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">Final issuance path:</span>{" "}
                            {orderDetail.billing_state.delivery_confirmation_required
                              ? orderDetail.billing_state.can_issue_via_delivery_confirmation
                                ? "Use “Mark delivered” to issue/send final invoice."
                                : "Waiting for shipment progress before delivery confirmation."
                              : "Delivery already confirmed."}
                          </p>
                        </>
                      )}
                      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-xs">
                        <p className="font-semibold text-indigo-800 mb-1">{t("Next step", "Siguiente paso")}</p>
                        <p className="text-indigo-700">
                          {orderDetail.status === "PAID" && (!orderDetail.shipments || orderDetail.shipments.length === 0)
                            ? t("Create shipment to continue fulfillment.", "Crear envío para continuar la preparación.")
                            : orderDetail.status === "PROCESSING" && (orderDetail.shipments?.length ?? 0) > 0
                              ? t("Mark the order as shipped.", "Marcar el pedido como enviado.")
                              : orderDetail.status === "SHIPPED"
                                ? t("Mark the order as delivered.", "Marcar el pedido como entregado.")
                                : orderDetail.status === "ON_HOLD"
                                  ? t("Review hold reason and release when safe.", "Revisar motivo de bloqueo y liberar cuando sea seguro.")
                                  : t("Review timeline and keep advancing the workflow.", "Revisar timeline y avanzar el flujo operativo.")}
                        </p>
                      </div>
                      <p className="text-sm"><span className="font-medium">Total:</span> {formatMoney(Number(orderDetail.total_amount))}</p>
                      <p className="text-sm"><span className="font-medium">Created:</span> {new Date(orderDetail.created_at).toLocaleString()}</p>

                      <div className="pt-2">
                        <h4 className="text-sm font-semibold mb-2">Items</h4>
                        <div className="space-y-2">
                          {orderDetail.items.map((item) => (
                            <div key={item.id} className="text-xs border rounded p-2 bg-gray-50">
                              <p className="font-medium">{item.sku?.product?.title || "Product"}</p>
                              <p>SKU: {item.sku?.sku_code || "-"}</p>
                              <p>Qty: {item.qty}</p>
                              <p>{t("Unit:", "Unidad:")} {formatMoney(Number((item.unit_price ?? item.unit_price_snapshot) || 0))}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2">
                        <h4 className="text-sm font-semibold mb-2">Payments</h4>
                        <div className="space-y-3">
                          {orderDetail.payments?.length ? (
                            orderDetail.payments.map((payment) => (
                              <div key={payment.id} className="rounded border bg-gray-50 p-3 text-xs">
                                <p><span className="font-medium">Provider:</span> {payment.provider}</p>
                                <p><span className="font-medium">Status:</span> {payment.status}</p>
                                <p><span className="font-medium">Amount:</span> {formatMoney(Number(payment.amount || 0))}</p>
                                <p><span className="font-medium">Currency:</span> {payment.currency}</p>
                                <p><span className="font-medium">Redsys Response:</span> {payment.redsys_response_code || "-"}</p>
                                <p><span className="font-medium">Authorization:</span> {payment.redsys_authorization_code || "-"}</p>
                                <p><span className="font-medium">Method:</span> {payment.redsys_payment_method || payment.provider}</p>
                                <p className="mt-2 font-medium">Gateway payload</p>
                                <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded border bg-white p-2 text-[11px]">
                                  {JSON.stringify(payment.raw_response ?? {}, null, 2)}
                                </pre>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-gray-500">No payment records yet.</p>
                          )}
                        </div>
                      </div>

                      <div className="pt-2">
                        <h4 className="text-sm font-semibold mb-2">Shipments & Live Tracking</h4>
                        <div className="space-y-3">
                          {orderDetail.shipments?.length ? (
                            orderDetail.shipments.map((shipment) => {
                              const draft = shipmentEdits[shipment.id] || toShipmentDraft(shipment);
                              const isBusy = shipmentBusyKey === shipment.id;

                              return (
                                <div key={shipment.id} className="rounded border bg-gray-50 p-3 text-xs space-y-2">
                                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                    <input
                                      value={draft.carrier}
                                      onChange={(e) =>
                                        setShipmentEdits((current) => ({
                                          ...current,
                                          [shipment.id]: {
                                            ...draft,
                                            carrier: e.target.value,
                                          },
                                        }))
                                      }
                                      placeholder="Carrier"
                                      className="rounded border px-2 py-1.5"
                                    />
                                    <select
                                      value={draft.status}
                                      onChange={(e) =>
                                        setShipmentEdits((current) => ({
                                          ...current,
                                          [shipment.id]: {
                                            ...draft,
                                            status: e.target.value,
                                          },
                                        }))
                                      }
                                      className="rounded border px-2 py-1.5"
                                    >
                                      {SHIPMENT_STATUS_OPTIONS.map((status) => (
                                        <option key={status} value={status}>
                                          {status}
                                        </option>
                                      ))}
                                    </select>
                                    <input
                                      value={draft.service_level}
                                      onChange={(e) =>
                                        setShipmentEdits((current) => ({
                                          ...current,
                                          [shipment.id]: {
                                            ...draft,
                                            service_level: e.target.value,
                                          },
                                        }))
                                      }
                                      placeholder="Service level"
                                      className="rounded border px-2 py-1.5"
                                    />
                                    <input
                                      value={draft.tracking_number}
                                      onChange={(e) =>
                                        setShipmentEdits((current) => ({
                                          ...current,
                                          [shipment.id]: {
                                            ...draft,
                                            tracking_number: e.target.value,
                                          },
                                        }))
                                      }
                                      placeholder="Tracking number"
                                      className="rounded border px-2 py-1.5"
                                    />
                                    <input
                                      value={draft.tracking_url}
                                      onChange={(e) =>
                                        setShipmentEdits((current) => ({
                                          ...current,
                                          [shipment.id]: {
                                            ...draft,
                                            tracking_url: e.target.value,
                                          },
                                        }))
                                      }
                                      placeholder="Tracking URL"
                                      className="rounded border px-2 py-1.5 md:col-span-2"
                                    />
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-[11px] text-gray-500">
                                      Last update: {new Date(shipment.updated_at || shipment.created_at || Date.now()).toLocaleString()}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => submitShipmentUpdate(shipment.id)}
                                      disabled={Boolean(shipmentBusyKey)}
                                      className="rounded bg-black px-3 py-1.5 text-white disabled:opacity-50"
                                    >
                                      {isBusy ? "Saving..." : "Save shipment"}
                                    </button>
                                  </div>
                                  {shipment.tracking_events?.length ? (
                                    <div className="rounded border bg-white p-2">
                                      <p className="font-medium text-gray-700">Tracking events</p>
                                      <div className="mt-2 space-y-2">
                                        {shipment.tracking_events.map((event) => (
                                          <div key={event.id} className="rounded border p-2">
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="font-medium">{event.status}</span>
                                              <span className="text-[11px] text-gray-500">
                                                {new Date(event.event_time).toLocaleString()}
                                              </span>
                                            </div>
                                            {event.details && (
                                              <p className="mt-1 text-[11px] text-gray-600">
                                                {event.details}
                                              </p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-xs text-gray-500">No shipments created yet.</p>
                          )}

                          <div className="rounded border border-dashed bg-white p-3 text-xs space-y-2">
                            <p className="font-medium text-gray-700">Create shipment</p>
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                              <input
                                value={shipmentDraft.carrier}
                                onChange={(e) =>
                                  setShipmentDraft((current) => ({
                                    ...current,
                                    carrier: e.target.value,
                                  }))
                                }
                                placeholder="Carrier"
                                className="rounded border px-2 py-1.5"
                              />
                              <select
                                value={shipmentDraft.status}
                                onChange={(e) =>
                                  setShipmentDraft((current) => ({
                                    ...current,
                                    status: e.target.value,
                                  }))
                                }
                                className="rounded border px-2 py-1.5"
                              >
                                {SHIPMENT_STATUS_OPTIONS.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                              <input
                                value={shipmentDraft.service_level}
                                onChange={(e) =>
                                  setShipmentDraft((current) => ({
                                    ...current,
                                    service_level: e.target.value,
                                  }))
                                }
                                placeholder="Service level"
                                className="rounded border px-2 py-1.5"
                              />
                              <input
                                value={shipmentDraft.tracking_number}
                                onChange={(e) =>
                                  setShipmentDraft((current) => ({
                                    ...current,
                                    tracking_number: e.target.value,
                                  }))
                                }
                                placeholder="Tracking number"
                                className="rounded border px-2 py-1.5"
                              />
                              <input
                                value={shipmentDraft.tracking_url}
                                onChange={(e) =>
                                  setShipmentDraft((current) => ({
                                    ...current,
                                    tracking_url: e.target.value,
                                  }))
                                }
                                placeholder="Tracking URL"
                                className="rounded border px-2 py-1.5 md:col-span-2"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={submitShipmentCreate}
                              disabled={Boolean(shipmentBusyKey)}
                              className="rounded bg-blue-600 px-3 py-1.5 text-white disabled:opacity-50"
                            >
                              {shipmentBusyKey === "new" ? "Creating..." : "Create shipment"}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2">
                        <h4 className="text-sm font-semibold mb-2">Operational actions</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {orderDetail.status !== "ON_HOLD" && orderDetail.status !== "CANCELLED" && orderDetail.status !== "DELIVERED" && (
                            <button
                              type="button"
                              onClick={() => handleOrderAction("PUT_ON_HOLD")}
                              className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100"
                            >
                              Put on hold
                            </button>
                          )}
                          {orderDetail.status === "ON_HOLD" && (
                            <button
                              type="button"
                              onClick={() => handleOrderAction("RELEASE_HOLD")}
                              className="rounded border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800 hover:bg-blue-100"
                            >
                              Release hold (to processing)
                            </button>
                          )}
                          {orderDetail.status !== "CANCELLED" && orderDetail.status !== "DELIVERED" && orderDetail.status !== "REFUNDED" && (
                            <button
                              type="button"
                              onClick={() => handleOrderAction("CANCEL")}
                              className="rounded border border-red-300 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100"
                            >
                              Cancel order
                            </button>
                          )}
                          {(orderDetail.status === "PAID" || orderDetail.status === "PROCESSING" || orderDetail.status === "ON_HOLD") && (
                            <button
                              type="button"
                              onClick={() => handleOrderAction("MARK_SHIPPED")}
                              className="rounded border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                            >
                              Mark shipped
                            </button>
                          )}
                        </div>
                        <p className="mt-2 text-[11px] text-gray-500">
                          Final invoice remains customer-visible only when marked delivered.
                        </p>
                      </div>

                      {/* Mark as delivered */}
                      {orderDetail.status !== "DELIVERED" &&
                        orderDetail.status !== "CANCELLED" &&
                        (orderDetail.status === "SHIPPED" ||
                          orderDetail.status === "PROCESSING") && (
                        <div className="pt-2">
                          <h4 className="text-sm font-semibold mb-2 text-emerald-700">Marcar como entregado</h4>
                          <div className="rounded border border-emerald-200 bg-emerald-50 p-3 space-y-2">
                            <input
                              value={deliverTrackingUrl}
                              onChange={(e) => setDeliverTrackingUrl(e.target.value)}
                              placeholder="URL de seguimiento (opcional, Infortisa)"
                              className="w-full rounded border px-2 py-1.5 text-xs"
                            />
                            <button
                              type="button"
                              onClick={handleMarkDelivered}
                              disabled={markingDelivered}
                              className="w-full rounded bg-emerald-600 px-3 py-2 text-white text-xs font-medium disabled:opacity-50 hover:bg-emerald-700"
                            >
                              {markingDelivered ? "Procesando..." : "✓ Marcar como entregado y enviar factura"}
                            </button>
                          </div>
                        </div>
                      )}
                      {orderDetail.status !== "DELIVERED" &&
                        orderDetail.status !== "CANCELLED" &&
                        orderDetail.status !== "PROCESSING" &&
                        orderDetail.status !== "SHIPPED" && (
                          <p className="pt-2 text-[11px] text-gray-500">
                            “Marcar como entregado” se habilita cuando el pedido está en PROCESSING o SHIPPED.
                          </p>
                        )}

                      {/* ── Billing documents ───────────────────────────────── */}
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-zinc-700 flex items-center gap-1.5">
                            <Receipt className="w-4 h-4 text-zinc-400" />
                            Facturación
                          </h4>
                          <div className="flex items-center gap-2">
                            <Link
                              href="/billing"
                              className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                            >
                              Ver en facturación <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>

                        {billingDocsLoading ? (
                          <div className="flex items-center gap-2 text-xs text-zinc-400 py-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Cargando documentos...
                          </div>
                        ) : orderBillingDocs.length > 0 ? (
                          <div className="space-y-1.5">
                            {orderBillingDocs.map((doc) => (
                              <div
                                key={doc.id}
                                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                  <div className="min-w-0">
                                    <span className="font-semibold text-zinc-700 truncate block">
                                      {doc.document_number ?? `Borrador (${doc.id.slice(0, 8)})`}
                                    </span>
                                    <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                                      doc.status === "PAID" ? "bg-emerald-100 text-emerald-700" :
                                      doc.status === "ISSUED" || doc.status === "SENT" ? "bg-blue-100 text-blue-700" :
                                      doc.status === "DRAFT" ? "bg-zinc-100 text-zinc-600" :
                                      "bg-red-100 text-red-600"
                                    }`}>
                                      {doc.status === "DRAFT" ? "Borrador" :
                                       doc.status === "ISSUED" ? "Emitida" :
                                       doc.status === "SENT" ? "Enviada" :
                                       doc.status === "PAID" ? t("Payment captured", "Pago capturado") :
                                       doc.status === "VOID" ? "Anulada" : doc.status}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {doc.status === "DRAFT" && (
                                    <Link
                                      href={`/billing?editDraft=${doc.id}`}
                                      className="text-[11px] font-medium text-indigo-600 hover:underline"
                                    >
                                      {t("Edit draft", "Editar borrador")}
                                    </Link>
                                  )}
                                  <span className="text-zinc-500 font-medium tabular-nums">
                                    {Number(doc.total_amount ?? 0).toLocaleString("es-ES", { style: "currency", currency: doc.currency ?? "EUR" })}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadBillingDocPdf(doc.id)}
                                    disabled={downloadingBillingDocId === doc.id}
                                    className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 disabled:opacity-50 transition"
                                    title="Descargar PDF"
                                  >
                                    {downloadingBillingDocId === doc.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Download className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-400 py-1">No hay documentos de facturación para este pedido.</p>
                        )}

                        {/* Generate billing doc button */}
                        {orderBillingDocs.filter((d) => d.type === "INVOICE" && d.status !== "VOID").length === 0 && (
                          <button
                            type="button"
                            onClick={handleGenerateBillingDoc}
                            disabled={generatingBillingDoc}
                            className="mt-2 w-full rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-indigo-700 text-xs font-medium hover:bg-indigo-100 disabled:opacity-50 flex items-center justify-center gap-1.5 transition"
                          >
                            {generatingBillingDoc ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <FileText className="w-3.5 h-3.5" />
                            )}
                            {generatingBillingDoc ? "Generando..." : "Generar factura en borrador"}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  <h3 className="font-semibold">Support timeline</h3>

                  <div className="flex gap-2">
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add internal note..."
                      className="flex-1 border rounded px-3 py-2 text-sm"
                    />
                    <button
                      onClick={submitNote}
                      className="px-3 py-2 rounded bg-black text-white text-sm inline-flex items-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" /> Add
                    </button>
                  </div>

                  <div className="max-h-[56vh] overflow-auto space-y-2">
                    {timeline.length === 0 ? (
                      <p className="text-sm text-gray-500">No timeline events yet.</p>
                    ) : (
                      timeline.map((entry) => (
                        <div key={entry.id} className="border rounded p-3 bg-gray-50">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-gray-800">{entry.action}</p>
                            <p className="text-xs text-gray-500">{new Date(entry.createdAt).toLocaleString()}</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{entry.actorEmail || "Unknown actor"}</p>
                          {entry.metadata?.note && (
                            <p className="text-sm text-gray-700 mt-2">{entry.metadata.note}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
