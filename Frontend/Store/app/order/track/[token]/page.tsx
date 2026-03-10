"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getOrderByTrackingToken } from "@/app/lib/checkout";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

export default function OrderTrackingPage() {
  const params = useParams();
  const token = params.token as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await getOrderByTrackingToken(token);
        setOrder(data);
      } catch (err: any) {
        setError(err.message || "Failed to fetch order");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchOrder();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B123A]"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-red-600">Error</h2>
          <p className="text-gray-600 mb-6">{error || "Order not found"}</p>
          <Link
            href="/"
            className="bg-[#0B123A] text-white px-6 py-3 rounded-lg hover:bg-[#1a245a]"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Track Your Order</h1>
          <p className="text-gray-600">
            Order <span className="font-semibold">#{order.order_number}</span>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Current status:{" "}
            <span className="font-semibold">
              {order.status.replace("_", " ")}
            </span>
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Order Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Shipping Address</h3>
              <div className="text-gray-600">
                <p>{order.shipping_address.full_name}</p>
                <p>{order.shipping_address.address_line1}</p>
                <p>
                  {order.shipping_address.city},{" "}
                  {order.shipping_address.postal_code}
                </p>
                <p>{order.shipping_address.country}</p>
                {order.shipping_address.phone && (
                  <p>Phone: {order.shipping_address.phone}</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Order Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{new Date(order.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(order.subtotal_amount)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Discount:</span>
                    <span>-{formatCurrency(order.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Shipping:</span>
                  <span>
                    {order.shipping_amount === 0
                      ? "FREE"
                      : formatCurrency(order.shipping_amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>{formatCurrency(order.tax_amount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                  <span>Total:</span>
                  <span>{formatCurrency(order.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Order Items</h2>
          <div className="space-y-4">
            {order.items?.map((item: any) => (
              <div
                key={item.id}
                className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0"
              >
                <div className="flex-1">
                  <p className="font-medium">
                    {item.title_snapshot || item.title}
                  </p>
                  <p className="text-sm text-gray-500">
                    Qty: {item.qty} × {formatCurrency(item.unit_price)}
                  </p>
                </div>
                <p className="font-semibold">
                  {formatCurrency(item.line_total)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Shipping & Tracking</h2>
          {order.shipments && order.shipments.length > 0 ? (
            <div className="space-y-4">
              {order.shipments.map((shipment: any) => (
                <div
                  key={shipment.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <p className="font-semibold mb-1">
                    Carrier: {shipment.carrier}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    Status: {shipment.status}
                  </p>
                  {shipment.tracking_number && (
                    <p className="text-sm text-gray-600 mb-1">
                      Tracking Number: {shipment.tracking_number}
                    </p>
                  )}
                  {shipment.tracking_url && (
                    <a
                      href={shipment.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View carrier tracking
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">
              Your order has not been shipped yet. You will receive an email
              when tracking information is available.
            </p>
          )}
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="bg-[#0B123A] text-white px-6 py-3 rounded-lg hover:bg-[#1a245a]"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

