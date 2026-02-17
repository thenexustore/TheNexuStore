"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const { user } = useAuth();
  const { cart, isLoading: cartLoading } = useCart();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasRedirected, setHasRedirected] = useState(false);

  const [formData, setFormData] = useState({
    email: user?.email || "",
    shipping_address: {
      full_name: user ? `${user.first_name} ${user.last_name}` : "",
      address_line1: "",
      city: "",
      postal_code: "",
      region: "",
      country: "Spain",
      phone: "",
    },
    billing_address: {
      full_name: user ? `${user.first_name} ${user.last_name}` : "",
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

      const response = await createOrder(orderData);
      router.push(`/order/${response.order.id}`);
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
          <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
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
    <div className="min-h-screen bg-gray-50 py-8 text-black">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-6">
                  Contact Information
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
                <h2 className="text-xl font-semibold mb-6">Shipping Address</h2>
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
                  <label className="flex items-center">
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
                    <span className="text-sm">Same as shipping address</span>
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
                disabled={loading}
                className="w-full bg-[#0B123A] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#1a245a] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? "Processing..." : "Place Order"}
              </button>

              {errors.submit && (
                <p className="text-red-500 text-center">{errors.submit}</p>
              )}
            </form>
          </div>

          <div>
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-8">
              <h2 className="text-xl font-bold mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                {cart.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-start"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{item.product_title}</p>
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
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    {cart.summary.shipping === 0
                      ? "FREE"
                      : formatCurrency(cart.summary.shipping)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium">
                    {formatCurrency(cart.summary.tax)}
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-300 pt-4">
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span className="text-[#0B123A]">
                    {formatCurrency(cart.summary.total)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {cart.summary.shipping === 0
                    ? "Free shipping applied"
                    : `Add €${Math.max(0, 100 - cart.summary.subtotal).toFixed(
                        2,
                      )} for free shipping`}
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Secure checkout · Free returns · 30-day warranty
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
