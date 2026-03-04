"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "../providers/AuthProvider";
import { useCart } from "../../context/CartContext";
import { createOrder } from "../lib/checkout";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const router = useRouter();
  const { user, getSessionId } = useAuth();
  const { cart, isLoading: cartLoading } = useCart();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasRedirected, setHasRedirected] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    shipping_address: {
      full_name: "",
      address_line1: "",
      city: "",
      postal_code: "",
      region: "",
      country: "Spain",
      phone: "",
    },
    billing_address: {
      full_name: "",
      address_line1: "",
      city: "",
      postal_code: "",
      region: "",
      country: "Spain",
      vat_id: "",
      use_same: true,
    },
    notes: "",
  });

  useEffect(() => {
    if (!user) return;

    const fullName =
      user.address?.full_name ||
      [user.firstName, user.lastName].filter(Boolean).join(" ");

    setFormData((prev) => ({
      ...prev,
      email: user.email || "",

      shipping_address: {
        ...prev.shipping_address,
        full_name: fullName || "",
        address_line1: user.address?.address_line1 || "",
        city: user.address?.city || "",
        postal_code: user.address?.postal_code || "",
        region: user.address?.region || "",
        country: user.address?.country || "Spain",
        phone: user.address?.phone || "",
      },

      billing_address: {
        ...prev.billing_address,
        full_name: fullName || "",
        address_line1: user.address?.address_line1 || "",
        city: user.address?.city || "",
        postal_code: user.address?.postal_code || "",
        region: user.address?.region || "",
        country: user.address?.country || "Spain",
        vat_id: user.address?.vat_id || "",
      },
    }));
  }, [user]);

  useEffect(() => {
    if (cartLoading || hasRedirected) return;

    if (cart && cart.items.length === 0) {
      setHasRedirected(true);
      router.push("/cart");
    }
  }, [cart, cartLoading, router, hasRedirected]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    if (name.startsWith("shipping_")) {
      const field = name.replace("shipping_", "");
      setFormData((prev) => ({
        ...prev,
        shipping_address: {
          ...prev.shipping_address,
          [field]: value,
        },
        billing_address: formData.billing_address.use_same
          ? {
              ...prev.billing_address,
              [field]: field === "vat_id" ? prev.billing_address.vat_id : value,
            }
          : prev.billing_address,
      }));
    } else if (name.startsWith("billing_")) {
      const field = name.replace("billing_", "");
      setFormData((prev) => ({
        ...prev,
        billing_address: {
          ...prev.billing_address,
          [field]: value,
        },
      }));
    } else if (name === "email") {
      setFormData((prev) => ({
        ...prev,
        email: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const newErrors: Record<string, string> = {};

      if (!formData.email) newErrors.email = "Email is required";
      if (!formData.shipping_address.full_name)
        newErrors.shipping_full_name = "Full name is required";
      if (!formData.shipping_address.address_line1)
        newErrors.shipping_address_line1 = "Address is required";
      if (!formData.shipping_address.city)
        newErrors.shipping_city = "City is required";
      if (!formData.shipping_address.postal_code)
        newErrors.shipping_postal_code = "Postal code is required";
      if (!formData.shipping_address.phone)
        newErrors.shipping_phone = "Phone is required";

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setLoading(false);
        return;
      }

      const orderData = {
        email: formData.email,
        shipping_address: formData.shipping_address,
        billing_address: formData.billing_address.use_same
          ? formData.shipping_address
          : {
              ...formData.billing_address,
              vat_id: formData.billing_address.vat_id || undefined,
            },
        notes: formData.notes || undefined,
      };

      const response = await createOrder(orderData, getSessionId());
      const trackingToken =
        response.order.tracking_token || response.order.id;
      router.push(`/order/track/${trackingToken}`);
    } catch (error: any) {
      console.error("Checkout error:", error);
      setErrors({
        submit: error.message || "Failed to create order. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (cartLoading || !cart) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B123A]"></div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{t("empty")}</h2>
          <button
            onClick={() => router.push("/products")}
            className="bg-[#0B123A] text-white px-6 py-3 rounded-lg hover:bg-[#1a245a]"
          >
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 text-black sm:py-8">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <h1 className="mb-6 text-2xl font-bold sm:mb-8 sm:text-3xl">{t("title")}</h1>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          <div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-6">
                  {t("contact")}
                </h2>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full border rounded-lg px-4 py-3 ${
                      errors.email ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-6">{t("shippingAddress")}</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="shipping_full_name"
                      value={formData.shipping_address.full_name}
                      onChange={handleChange}
                      className={`w-full border rounded-lg px-4 py-3 ${
                        errors.shipping_full_name
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    {errors.shipping_full_name && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.shipping_full_name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Address Line 1 *
                    </label>
                    <input
                      type="text"
                      name="shipping_address_line1"
                      value={formData.shipping_address.address_line1}
                      onChange={handleChange}
                      className={`w-full border rounded-lg px-4 py-3 ${
                        errors.shipping_address_line1
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    {errors.shipping_address_line1 && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.shipping_address_line1}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        name="shipping_city"
                        value={formData.shipping_address.city}
                        onChange={handleChange}
                        className={`w-full border rounded-lg px-4 py-3 ${
                          errors.shipping_city
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      {errors.shipping_city && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.shipping_city}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Postal Code *
                      </label>
                      <input
                        type="text"
                        name="shipping_postal_code"
                        value={formData.shipping_address.postal_code}
                        onChange={handleChange}
                        className={`w-full border rounded-lg px-4 py-3 ${
                          errors.shipping_postal_code
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      {errors.shipping_postal_code && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.shipping_postal_code}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      name="shipping_phone"
                      value={formData.shipping_address.phone}
                      onChange={handleChange}
                      className={`w-full border rounded-lg px-4 py-3 ${
                        errors.shipping_phone
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    {errors.shipping_phone && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.shipping_phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">Billing Address</h2>
                  <label className="flex items-start gap-2 text-sm sm:items-center">
                    <input
                      type="checkbox"
                      checked={formData.billing_address.use_same}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          billing_address: {
                            ...prev.billing_address,
                            use_same: e.target.checked,
                          },
                        }))
                      }
                      className="mr-2 h-5 w-5"
                    />
                    <span className="text-sm leading-5">Same as shipping address</span>
                  </label>
                </div>

                {!formData.billing_address.use_same && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        name="billing_full_name"
                        value={formData.billing_address.full_name}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        VAT ID (optional)
                      </label>
                      <input
                        type="text"
                        name="billing_vat_id"
                        value={formData.billing_address.vat_id}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-6">
                  Additional Information
                </h2>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Order Notes (optional)
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    placeholder="Any special instructions for your order..."
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || cart.summary.checkout_available === false}
                className="hidden w-full rounded-xl bg-[#0B123A] py-4 text-lg font-bold text-white transition-all hover:bg-[#1a245a] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 md:block"
              >
                {loading ? t("processing") : t("placeOrder")}
              </button>

              {errors.submit && (
                <p className="text-red-500 text-center">{errors.submit}</p>
              )}
            </form>
          </div>

          <div>
            <div className="sticky bottom-0 rounded-xl bg-white p-4 shadow-sm sm:p-6 lg:top-8">
              <h2 className="text-xl font-bold mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                {cart.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="flex-1">
                      <p className="font-medium break-words">{item.product_title}</p>
                      <p className="text-sm text-gray-500">
                        Qty: {item.quantity} × {formatCurrency(item.price)}
                      </p>
                    </div>
                    <p className="font-semibold">
                      {formatCurrency(item.line_total)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 border-t border-gray-200 pt-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">
                    {formatCurrency(cart.summary.subtotal)}
                  </span>
                </div>
                {cart.summary.discount && cart.summary.discount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span className="text-gray-600">Discount</span>
                    <span className="font-medium">
                      -{formatCurrency(cart.summary.discount)}
                    </span>
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <span className="text-gray-600 break-words">Shipping</span>
                  <span className="font-medium">
                    {cart.summary.shipping === 0
                      ? "FREE"
                      : formatCurrency(cart.summary.shipping)}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-gray-600 break-words">{cart.summary.meta?.tax_label || "Tax"}</span>
                  <span className="font-medium">
                    {formatCurrency(cart.summary.tax)}
                  </span>
                </div>
                {(cart.summary.customs_duty || 0) > 0 && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-gray-600 break-words">Customs duty</span>
                    <span className="font-medium">
                      {formatCurrency(cart.summary.customs_duty || 0)}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-300 pt-4">
                <div className="flex items-start justify-between gap-3 text-xl font-bold">
                  <span>Total</span>
                  <span className="text-[#0B123A]">
                    {formatCurrency(cart.summary.total)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {cart.summary.meta?.message || "Shipping rates depend on destination"}
                </p>
              </div>

              {cart.summary.checkout_available === false && (
                <p className="text-sm text-red-600 mb-3">
                  Shipping not available for this destination. Contact support.
                </p>
              )}
              {cart.summary.meta?.message && (
                <p className="text-sm text-amber-700 mb-3">
                  {cart.summary.meta.message}
                </p>
              )}

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Secure checkout · Free returns · 30-day warranty
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 p-3 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => (document.querySelector("form") as HTMLFormElement | null)?.requestSubmit()}
          disabled={loading || cart.summary.checkout_available === false}
          className="w-full rounded-xl bg-[#0B123A] py-3 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? t("processing") : t("placeOrder")}
        </button>
      </div>
    </div>
  );
}
