"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "../providers/AuthProvider";
import { useCart } from "../../context/CartContext";
import { createOrder, createRedsysPayment } from "../lib/checkout";
import { formatCurrency } from "../lib/currency";

const CHECKOUT_FORM_ID = "checkout-form";

type RedsysRedirectFormData = {
  Ds_SignatureVersion: string;
  Ds_MerchantParameters: string;
  Ds_Signature: string;
  formUrl: string;
};

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const locale = useLocale();
  const router = useRouter();
  const { user, getSessionId } = useAuth();
  const { cart, isLoading: cartLoading, refreshCartWithDestination } = useCart();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasRedirected, setHasRedirected] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"REDSYS" | "BIZUM" | "COD">("REDSYS");
  const checkoutFormRef = useRef<HTMLFormElement>(null);
  const redsysRedirectFormRef = useRef<HTMLFormElement>(null);
  const [redsysRedirectForm, setRedsysRedirectForm] =
    useState<RedsysRedirectFormData | null>(null);

  const freeShippingRemaining = useMemo(
    () => Math.max(0, 100 - (cart?.summary.subtotal || 0)),
    [cart?.summary.subtotal],
  );

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


  useEffect(() => {
    const destination = {
      country: formData.shipping_address.country,
      region: formData.shipping_address.region,
      postal_code: formData.shipping_address.postal_code,
    };

    const timer = setTimeout(() => {
      refreshCartWithDestination(destination);
    }, 250);

    return () => clearTimeout(timer);
  }, [
    formData.shipping_address.country,
    formData.shipping_address.region,
    formData.shipping_address.postal_code,
    refreshCartWithDestination,
  ]);

  useEffect(() => {
    if (!redsysRedirectForm) return;
    redsysRedirectFormRef.current?.submit();
  }, [redsysRedirectForm]);

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

      if (!formData.email) newErrors.email = t("emailRequired");
      if (!formData.shipping_address.full_name)
        newErrors.shipping_full_name = t("fullNameRequired");
      if (!formData.shipping_address.address_line1)
        newErrors.shipping_address_line1 = t("addressRequired");
      if (!formData.shipping_address.city)
        newErrors.shipping_city = t("cityRequired");
      if (!formData.shipping_address.postal_code)
        newErrors.shipping_postal_code = t("postalCodeRequired");
      if (!formData.shipping_address.phone)
        newErrors.shipping_phone = t("phoneRequired");

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
        payment_method: paymentMethod,
        notes: formData.notes || undefined,
        locale,
      };

      const response = await createOrder(orderData, getSessionId());
      if (paymentMethod === "REDSYS" || paymentMethod === "BIZUM") {
        let redsysForm: RedsysRedirectFormData | null =
          response.payment_intent?.form_data || null;

        // Keep a backward-compatible fallback for flows that still need
        // an explicit payment creation call outside checkout order creation.
        if (!redsysForm?.formUrl) {
          const redsysIntent = await createRedsysPayment(
            {
              order_id: response.order.id,
              payment_method: paymentMethod,
              tracking_token: response.order.tracking_token || response.order.id,
              phone: formData.shipping_address.phone || undefined,
            },
            getSessionId(),
          );

          redsysForm = redsysIntent?.formData || {
            Ds_SignatureVersion: redsysIntent?.Ds_SignatureVersion || "",
            Ds_MerchantParameters: redsysIntent?.Ds_MerchantParameters || "",
            Ds_Signature: redsysIntent?.Ds_Signature || "",
            formUrl: redsysIntent?.formUrl || "",
          };
        }

        if (
          redsysForm?.formUrl &&
          redsysForm.Ds_MerchantParameters &&
          redsysForm.Ds_Signature &&
          redsysForm.Ds_SignatureVersion
        ) {
          setRedsysRedirectForm(redsysForm);
          return;
        }

        throw new Error("Redsys payment form was not generated");
      }

      const trackingToken =
        response.order.tracking_token || response.order.id;
      router.push(`/order/track/${trackingToken}`);
    } catch (error: unknown) {
      console.error("Checkout error:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to create order. Please try again.";
      setErrors({
        submit: message || t("createOrderFailed"),
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
            {t("browse")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white py-6 pb-28 text-black sm:py-8 sm:pb-8">
      <div className="mx-auto w-full max-w-6xl px-3 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:mb-8 sm:p-6">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{t("title")}</h1>
          <p className="mt-2 text-sm text-slate-600">{t("secureNote")}</p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-8">
          <div>
            <form
              id={CHECKOUT_FORM_ID}
              ref={checkoutFormRef}
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-6">
                  {t("contact")}
                </h2>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t("email")} *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full rounded-xl border px-4 py-3 transition focus:outline-none focus:ring-1 focus:ring-[#0B123A] ${
                      errors.email ? "border-red-500" : "border-slate-200 focus:border-[#0B123A]"
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
                      {t("fullName")} *
                    </label>
                    <input
                      type="text"
                      name="shipping_full_name"
                      value={formData.shipping_address.full_name}
                      onChange={handleChange}
                      className={`w-full rounded-xl border px-4 py-3 transition focus:outline-none focus:ring-1 focus:ring-[#0B123A] ${
                        errors.shipping_full_name
                          ? "border-red-500"
                          : "border-slate-200 focus:border-[#0B123A]"
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
                      {t("addressLine1")} *
                    </label>
                    <input
                      type="text"
                      name="shipping_address_line1"
                      value={formData.shipping_address.address_line1}
                      onChange={handleChange}
                      className={`w-full rounded-xl border px-4 py-3 transition focus:outline-none focus:ring-1 focus:ring-[#0B123A] ${
                        errors.shipping_address_line1
                          ? "border-red-500"
                          : "border-slate-200 focus:border-[#0B123A]"
                      }`}
                    />
                    {errors.shipping_address_line1 && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.shipping_address_line1}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        {t("city")} *
                      </label>
                      <input
                        type="text"
                        name="shipping_city"
                        value={formData.shipping_address.city}
                        onChange={handleChange}
                        className={`w-full rounded-xl border px-4 py-3 transition focus:outline-none focus:ring-1 focus:ring-[#0B123A] ${
                          errors.shipping_city
                            ? "border-red-500"
                            : "border-slate-200 focus:border-[#0B123A]"
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
                        {t("postalCode")} *
                      </label>
                      <input
                        type="text"
                        name="shipping_postal_code"
                        value={formData.shipping_address.postal_code}
                        onChange={handleChange}
                        className={`w-full rounded-xl border px-4 py-3 transition focus:outline-none focus:ring-1 focus:ring-[#0B123A] ${
                          errors.shipping_postal_code
                            ? "border-red-500"
                            : "border-slate-200 focus:border-[#0B123A]"
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
                      {t("phone")} *
                    </label>
                    <input
                      type="tel"
                      name="shipping_phone"
                      value={formData.shipping_address.phone}
                      onChange={handleChange}
                      className={`w-full rounded-xl border px-4 py-3 transition focus:outline-none focus:ring-1 focus:ring-[#0B123A] ${
                        errors.shipping_phone
                          ? "border-red-500"
                          : "border-slate-200 focus:border-[#0B123A]"
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
                  <h2 className="text-xl font-semibold">{t("billingAddress")}</h2>
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
                    <span className="text-sm leading-5">{t("sameAsShipping")}</span>
                  </label>
                </div>

                {!formData.billing_address.use_same && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        {t("fullName")}
                      </label>
                      <input
                        type="text"
                        name="billing_full_name"
                        value={formData.billing_address.full_name}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 transition focus:border-[#0B123A] focus:outline-none focus:ring-1 focus:ring-[#0B123A]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        {t("vatOptional")}
                      </label>
                      <input
                        type="text"
                        name="billing_vat_id"
                        value={formData.billing_address.vat_id}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 transition focus:border-[#0B123A] focus:outline-none focus:ring-1 focus:ring-[#0B123A]"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">{t("paymentMethod")}</h2>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 transition-colors has-[:checked]:border-[#0B123A] has-[:checked]:bg-[#0B123A]/5">
                    <input
                      type="radio"
                      name="payment_method"
                      value="REDSYS"
                      checked={paymentMethod === "REDSYS"}
                      onChange={() => setPaymentMethod("REDSYS")}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium">{t("payByCard")}</p>
                      <p className="text-sm text-gray-500">{t("payByCardHint")}</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 transition-colors has-[:checked]:border-[#0B123A] has-[:checked]:bg-[#0B123A]/5">
                    <input
                      type="radio"
                      name="payment_method"
                      value="BIZUM"
                      checked={paymentMethod === "BIZUM"}
                      onChange={() => setPaymentMethod("BIZUM")}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium">{t("payByBizum")}</p>
                      <p className="text-sm text-gray-500">{t("payByBizumHint")}</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 transition-colors has-[:checked]:border-[#0B123A] has-[:checked]:bg-[#0B123A]/5">
                    <input
                      type="radio"
                      name="payment_method"
                      value="COD"
                      checked={paymentMethod === "COD"}
                      onChange={() => setPaymentMethod("COD")}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium">{t("payOnDelivery")}</p>
                      <p className="text-sm text-gray-500">{t("payOnDeliveryHint")}</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-6">
                  {t("additionalInfo")}
                </h2>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t("orderNotes")}
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 transition focus:border-[#0B123A] focus:outline-none focus:ring-1 focus:ring-[#0B123A]"
                    placeholder={t("orderNotesPlaceholder")}
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
            <div className="rounded-xl bg-white p-4 shadow-sm sm:p-6 lg:sticky lg:top-8">
              <h2 className="text-xl font-bold mb-6">{t("orderSummary")}</h2>

              <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50 p-3 sm:p-4">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-indigo-700">
                  <span>{t("freeShippingProgress")}</span>
                  <span>{freeShippingRemaining === 0 ? t("freeShippingUnlocked") : t("freeShippingLeft", {amount: formatCurrency(freeShippingRemaining)})}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-100">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all"
                    style={{ width: `${Math.min(100, ((cart.summary.subtotal || 0) / 100) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {cart.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="flex-1">
                      <p className="font-medium break-words">{item.product_title}</p>
                      <p className="text-sm text-gray-500">
                        {t("qty")}: {item.quantity} × {formatCurrency(item.price)}
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
                  <span className="text-gray-600">{t("subtotal")}</span>
                  <span className="font-medium">
                    {formatCurrency(cart.summary.subtotal)}
                  </span>
                </div>
                {cart.summary.discount && cart.summary.discount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span className="text-gray-600">{t("discount")}</span>
                    <span className="font-medium">
                      -{formatCurrency(cart.summary.discount)}
                    </span>
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <span className="text-gray-600 break-words">{t("shipping")}</span>
                  <span className="font-medium">
                    {cart.summary.shipping === 0
                      ? t("free")
                      : formatCurrency(cart.summary.shipping)}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-gray-600 break-words">{cart.summary.meta?.tax_label || t("tax")}</span>
                  <span className="font-medium">
                    {formatCurrency(cart.summary.tax)}
                  </span>
                </div>
                {(cart.summary.customs_duty || 0) > 0 && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-gray-600 break-words">{t("customsDuty")}</span>
                    <span className="font-medium">
                      {formatCurrency(cart.summary.customs_duty || 0)}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-300 pt-4">
                <div className="flex items-start justify-between gap-3 text-xl font-bold">
                  <span>{t("total")}</span>
                  <span className="text-[#0B123A]">
                    {formatCurrency(cart.summary.total)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {cart.summary.shipping === 0
                    ? t("freeShippingApplied")
                    : t("addForFreeShipping", {
                        amount: formatCurrency(freeShippingRemaining),
                      })}
                </p>
              </div>

              {cart.summary.checkout_available === false && (
                <p className="text-sm text-red-600 mb-3">
                  {cart.summary.meta?.message || t("shippingUnavailable")}
                </p>
              )}

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  {t("secureNote")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 fixed-bottom-bar backdrop-blur lg:hidden">
        <button
          type="submit"
          form={CHECKOUT_FORM_ID}
          disabled={loading || cart.summary.checkout_available === false}
          className="w-full rounded-xl bg-[#0B123A] py-3 font-bold text-white transition-all hover:bg-[#1a245a] disabled:opacity-50"
        >
          {loading ? t("processing") : `${t("placeOrder")} · ${formatCurrency(cart.summary.total)}`}
        </button>
      </div>

      <form
        ref={redsysRedirectFormRef}
        method="POST"
        action={redsysRedirectForm?.formUrl || ""}
        className="hidden"
      >
        <input
          type="hidden"
          name="Ds_SignatureVersion"
          value={redsysRedirectForm?.Ds_SignatureVersion || ""}
        />
        <input
          type="hidden"
          name="Ds_MerchantParameters"
          value={redsysRedirectForm?.Ds_MerchantParameters || ""}
        />
        <input
          type="hidden"
          name="Ds_Signature"
          value={redsysRedirectForm?.Ds_Signature || ""}
        />
      </form>

    </div>
  );
}
