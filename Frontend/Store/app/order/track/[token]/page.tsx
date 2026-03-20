"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getOrderByTrackingToken, type Order, type OrderItem } from "@/app/lib/checkout";
import { useOrderTrackingSocket } from "@/app/hooks/useOrderTrackingSocket";
import {
  CheckCircle2,
  Clock3,
  CreditCard,
  MapPin,
  Package,
  RefreshCw,
  Truck,
  XCircle,
} from "lucide-react";

type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

type ProgressStep = {
  key: Exclude<OrderStatus, "FAILED" | "CANCELLED" | "REFUNDED">;
  label: string;
  subtitle: string;
  Icon: typeof Clock3;
};

const PROGRESS_STEPS: ProgressStep[] = [
  {
    key: "PENDING_PAYMENT",
    label: "Payment Pending",
    subtitle: "Bank confirmation in progress",
    Icon: CreditCard,
  },
  {
    key: "PAID",
    label: "Payment Confirmed",
    subtitle: "Transaction approved",
    Icon: CheckCircle2,
  },
  {
    key: "PROCESSING",
    label: "Preparing Order",
    subtitle: "Packing started",
    Icon: Package,
  },
  {
    key: "SHIPPED",
    label: "Shipped",
    subtitle: "Handed to carrier",
    Icon: Truck,
  },
  {
    key: "DELIVERED",
    label: "Delivered",
    subtitle: "Order completed",
    Icon: CheckCircle2,
  },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

const formatStatus = (status: string) => {
  return status
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
};

const normalizeStatus = (status: string | undefined): OrderStatus => {
  const normalized = (status || "").toUpperCase();
  const validStatuses: OrderStatus[] = [
    "PENDING_PAYMENT",
    "PAID",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "FAILED",
    "CANCELLED",
    "REFUNDED",
  ];
  return validStatuses.includes(normalized as OrderStatus)
    ? (normalized as OrderStatus)
    : "PENDING_PAYMENT";
};

const statusBadgeClass = (status: OrderStatus) => {
  switch (status) {
    case "DELIVERED":
    case "PAID":
    case "PROCESSING":
    case "SHIPPED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "FAILED":
    case "CANCELLED":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "REFUNDED":
      return "border-slate-300 bg-slate-100 text-slate-700";
    case "PENDING_PAYMENT":
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
};

const itemQuantity = (item: OrderItem): number => item.qty ?? item.quantity ?? 1;

export default function OrderTrackingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const paymentStatus = searchParams.get("payment");

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const hasLoadedRef = useRef(false);

  const { connected } = useOrderTrackingSocket({
    trackingToken: token || null,
    enabled: Boolean(token),
    onUpdate: () => {
      setRefreshKey((value) => value + 1);
    },
  });

  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    const fetchOrder = async () => {
      if (!isMounted) return;
      if (hasLoadedRef.current) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const data = await getOrderByTrackingToken(token);
        if (!isMounted) return;
        setOrder(data);
        setError(null);
        hasLoadedRef.current = true;
      } catch (err: unknown) {
        if (!isMounted) return;
        const message =
          err instanceof Error ? err.message : "Failed to fetch order";
        setError(message);
      } finally {
        if (!isMounted) return;
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchOrder();
    return () => {
      isMounted = false;
    };
  }, [token, refreshKey]);

  const normalizedOrderStatus = normalizeStatus(order?.status);
  const isOrderFailed =
    normalizedOrderStatus === "FAILED" || normalizedOrderStatus === "CANCELLED";
  const isOrderPaid =
    normalizedOrderStatus === "PAID" ||
    normalizedOrderStatus === "PROCESSING" ||
    normalizedOrderStatus === "SHIPPED" ||
    normalizedOrderStatus === "DELIVERED";
  const isPaymentPending =
    normalizedOrderStatus === "PENDING_PAYMENT" ||
    paymentStatus === "pending" ||
    (paymentStatus === "success" && !isOrderPaid && !isOrderFailed);

  useEffect(() => {
    if (!token || !order || connected) return;
    const refreshDelay =
      isPaymentPending && !isOrderFailed ? 3500 : 15000;
    const timer = setTimeout(() => {
      setRefreshKey((value) => value + 1);
    }, refreshDelay);
    return () => clearTimeout(timer);
  }, [token, order, isPaymentPending, isOrderFailed, connected]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 shadow-sm">
          <RefreshCw className="h-5 w-5 animate-spin text-[#0B123A]" />
          <p className="text-sm font-medium text-slate-600">Loading order status...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-7 text-center shadow-sm">
          <XCircle className="mx-auto mb-3 h-10 w-10 text-rose-500" />
          <h2 className="text-2xl font-bold text-slate-900">Order Not Found</h2>
          <p className="mt-2 text-slate-600">{error || "Unable to load this order."}</p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl bg-[#0B123A] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#1a245a]"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  const statusIndex = PROGRESS_STEPS.findIndex(
    (step) => step.key === normalizedOrderStatus,
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbe8ff_0%,_#f8fafc_34%,_#f8fafc_100%)] py-8">
      <div className="mx-auto w-full max-w-5xl px-4">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-[#0B123A] via-[#142a68] to-[#1f3c8c] p-6 text-white sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
                  Order Tracking
                </p>
                <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                  {order.order_number}
                </h1>
                <p className="mt-3 text-sm text-blue-100">
                  Track payment, packing, and shipment updates in real time.
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/80">
                  {connected ? "Live updates connected" : "Auto-refresh fallback active"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusBadgeClass(
                    normalizedOrderStatus,
                  )}`}
                >
                  {formatStatus(normalizedOrderStatus)}
                </span>
                <button
                  type="button"
                  onClick={() => setRefreshKey((value) => value + 1)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/25"
                  disabled={refreshing}
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-5 sm:p-6">
            {isPaymentPending && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
                <Clock3 className="mt-0.5 h-4 w-4 flex-none" />
                <p className="text-sm">
                  Bank return received. Waiting for secure server confirmation from Redsys.
                </p>
              </div>
            )}
            {!isPaymentPending && (paymentStatus === "success" || isOrderPaid) && (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" />
                <p className="text-sm">Payment confirmed successfully.</p>
              </div>
            )}
            {(paymentStatus === "failed" || isOrderFailed) && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800">
                <XCircle className="mt-0.5 h-4 w-4 flex-none" />
                <p className="text-sm">
                  Payment was declined or canceled. Please retry from support/admin.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">Order Progress</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {PROGRESS_STEPS.map((step, index) => {
              const reached = !isOrderFailed && statusIndex >= index;
              const current = !isOrderFailed && statusIndex === index;
              return (
                <div
                  key={step.key}
                  className={`rounded-xl border p-3 transition-colors ${
                    reached
                      ? "border-[#204198] bg-blue-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <step.Icon
                      className={`h-4 w-4 ${
                        reached ? "text-[#204198]" : "text-slate-400"
                      }`}
                    />
                    {current && (
                      <span className="rounded-full bg-[#0B123A] px-2 py-0.5 text-[10px] font-semibold text-white">
                        Current
                      </span>
                    )}
                  </div>
                  <p
                    className={`mt-2 text-sm font-semibold ${
                      reached ? "text-slate-900" : "text-slate-500"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{step.subtitle}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Shipping Address</h2>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-slate-700">
                <MapPin className="h-4 w-4" />
                <span className="text-sm font-semibold">
                  {order.shipping_address.full_name}
                </span>
              </div>
              <p className="text-sm text-slate-600">{order.shipping_address.address_line1}</p>
              <p className="text-sm text-slate-600">
                {order.shipping_address.city}, {order.shipping_address.postal_code}
              </p>
              <p className="text-sm text-slate-600">{order.shipping_address.country}</p>
              {order.shipping_address.phone && (
                <p className="mt-2 text-sm font-medium text-slate-700">
                  Phone: {order.shipping_address.phone}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Order Summary</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between text-slate-600">
                <span>Order Date</span>
                <span>{new Date(order.created_at).toLocaleString("en-GB")}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal_amount)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex items-center justify-between text-emerald-700">
                  <span>Discount</span>
                  <span>-{formatCurrency(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-slate-600">
                <span>Shipping</span>
                <span>
                  {order.shipping_amount === 0
                    ? "Free"
                    : formatCurrency(order.shipping_amount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Tax</span>
                <span>{formatCurrency(order.tax_amount)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
                <span>Total</span>
                <span>{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Order Items</h2>
          <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {order.items?.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {item.title_snapshot || item.title || "Item"}
                  </p>
                  <p className="text-slate-500">
                    Qty: {itemQuantity(item)} x {formatCurrency(item.unit_price)}
                  </p>
                </div>
                <p className="font-semibold text-slate-900">
                  {formatCurrency(item.line_total)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Shipping & Tracking</h2>
          {order.shipments && order.shipments.length > 0 ? (
            <div className="mt-4 space-y-3">
              {order.shipments.map((shipment) => (
                <div
                  key={shipment.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold text-slate-900">
                      Carrier: {shipment.carrier}
                    </span>
                    {shipment.service_level && (
                      <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {shipment.service_level}
                      </span>
                    )}
                    <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                      {formatStatus(shipment.status)}
                    </span>
                  </div>
                  {shipment.tracking_number && (
                    <p className="mt-2 text-sm text-slate-600">
                      Tracking Number: {shipment.tracking_number}
                    </p>
                  )}
                  {shipment.tracking_url && (
                    <a
                      href={shipment.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#0B123A] hover:text-[#1a245a]"
                    >
                      <Truck className="h-4 w-4" />
                      View carrier tracking
                    </a>
                  )}
                  {shipment.tracking_events && shipment.tracking_events.length > 0 && (
                    <div className="mt-4 space-y-2 border-t border-slate-200 pt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Live Tracking Events
                      </p>
                      {shipment.tracking_events.map((event) => (
                        <div key={event.id} className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-slate-800">
                              {formatStatus(event.status)}
                            </span>
                            <span>{new Date(event.event_time).toLocaleString("en-GB")}</span>
                          </div>
                          {event.location && <p className="mt-1">{event.location}</p>}
                          {event.details && <p className="mt-1">{event.details}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Shipment is not created yet. You will receive email updates as soon as your
              package is dispatched.
            </div>
          )}
        </section>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-xl bg-[#0B123A] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#1a245a]"
          >
            Continue Shopping
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
