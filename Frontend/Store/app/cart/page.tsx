"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../providers/AuthProvider";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

export default function CartPage() {
  const router = useRouter();
  const t = useTranslations("cart");
  const { user } = useAuth();
  const {
    cart,
    cartCount,
    isLoading,
    updateItem,
    removeItem,
    clearCart,
    syncLegacyCart,
    applyCoupon,
    removeCoupon,
  } = useCart();

  const [isLegacyCart, setIsLegacyCart] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  useEffect(() => {
    const handleLegacyUpdate = () => {
      window.location.reload(); 
    };

    window.addEventListener("cart-update", handleLegacyUpdate);
    return () => window.removeEventListener("cart-update", handleLegacyUpdate);
  }, []);

  useEffect(() => {
    if (cart) {
      setIsLegacyCart(cart.id === "legacy-cart");

      // Update legacy cart count event
      const event = new CustomEvent("cart-count-update", {
        detail: cart.summary.item_count,
      });
      window.dispatchEvent(event);
    }
  }, [cart]);

  const handleUpdateQty = async (
    itemId: string,
    currentQty: number,
    newQty: number,
  ) => {
    if (newQty < 1) {
      await removeItem(itemId);
      return;
    }
    await updateItem(itemId, newQty);
  };

  const handleRemoveItem = async (itemId: string) => {
    await removeItem(itemId);
  };

  const handleClearCart = async () => {
    if (confirm(t("confirmClear"))) {
      await clearCart();
    }
  };

  const handleSyncCart = async () => {
    if (confirm(t("confirmSync"))) {
      await syncLegacyCart();
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError(t("couponRequired"));
      return;
    }

    setIsApplyingCoupon(true);
    setCouponError(null);
    try {
      await applyCoupon(couponCode.trim());
      setCouponCode("");
    } catch (error: any) {
      setCouponError(
        error?.message || t("couponApplyFailed"),
      );
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    setIsApplyingCoupon(true);
    setCouponError(null);
    try {
      await removeCoupon();
    } catch (error: any) {
      setCouponError(
        error?.message || t("couponRemoveFailed"),
      );
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  useEffect(() => {
    if (cart) {
      console.log("Cart Data:", cart);
      console.log("Cart Items:", cart.items);
      console.log("Cart Summary:", cart.summary);

      // Check for duplicate items
      const skuMap = new Map();
      cart.items.forEach((item, index) => {
        if (skuMap.has(item.sku_code)) {
          console.warn(
            `Duplicate SKU found: ${item.sku_code} at positions ${skuMap.get(item.sku_code)} and ${index}`,
          );
        } else {
          skuMap.set(item.sku_code, index);
        }
      });
    }
  }, [cart]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B123A]"></div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
        <div className="w-full max-w-sm text-center">
          <div className="relative w-full aspect-square mb-8">
            <img
              src="https://www.svgrepo.com/show/17356/empty-cart.svg"
              alt="Empty Cart"
              className="w-full h-full object-cover rounded-3xl opacity-80"
            />
          </div>
          <h2 className="text-3xl font-bold text-black mb-3">
            {t("emptyTitle")}
          </h2>
          <p className="text-gray-400 mb-10 text-lg">
            {t("emptyText")}
          </p>
          <button
            onClick={() => router.push("/products")}
            className="w-full bg-[#0B123A] text-white py-4 rounded-xl font-bold cursor-pointer hover:bg-[#1a245a] active:scale-95 transition-all shadow-lg"
          >
            {t("browse")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-6 text-black sm:py-8">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        {isLegacyCart && user && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-yellow-800">
                  You have items in your local cart. Sync them with your
                  account?
                </p>
                <p className="text-sm text-yellow-600 mt-1">
                  This will save your cart items across devices.
                </p>
              </div>
              <button
                onClick={handleSyncCart}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium"
              >
                Sync Cart
              </button>
            </div>
          </div>
        )}

        {isLegacyCart && !user && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-blue-800">
                  Want to save your cart? Login or create an account.
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  Your cart items will be saved across devices.
                </p>
              </div>
              <button
                onClick={() => router.push("/login")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                Login
              </button>
            </div>
          </div>
        )}

        <header className="mb-8">
          <h1 className="text-3xl font-black tracking-tighter sm:text-4xl">
            {t("title")}
          </h1>
          <p className="text-gray-500 mt-2">
            {cart.summary.item_count} item
            {cart.summary.item_count !== 1 ? "s" : ""} in your cart
            {isLegacyCart && " (Local Storage)"}
          </p>
        </header>

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <div className="lg:w-2/3">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-100">
                {cart.items.map((item) => {
                  const isOutOfStock = !item.in_stock;
                  const maxQty = Math.min(
                    item.max_quantity,
                    isOutOfStock ? 0 : 99,
                  );

                  return (
                    <div
                      key={item.id}
                      className="p-4 transition-colors hover:bg-gray-50 sm:p-6"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row">
                        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:h-32 sm:w-32">
                          <img
                            src={
                              item.thumbnail?.trim() ||
                              "/No_Image_Available.png"
                            }
                            alt={item.product_title}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = "/No_Image_Available.png";
                            }}
                          />

                          {isOutOfStock && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="text-white text-xs font-bold bg-red-500 px-2 py-1 rounded">
                                {t("outOfStock")}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="mb-1 break-words text-base font-bold sm:text-lg">
                                {item.product_title}
                              </h3>
                              <p className="text-gray-500 text-sm mb-2">
                                SKU: {item.sku_code}
                              </p>
                              <p className="text-xl font-bold text-[#0B123A]">
                                {formatCurrency(item.price)}
                              </p>
                            </div>
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                            >
                              <svg
                                className="w-5 h-5 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center border border-gray-200 rounded-lg">
                              <button
                                onClick={() =>
                                  handleUpdateQty(
                                    item.id,
                                    item.quantity,
                                    item.quantity - 1,
                                  )
                                }
                                disabled={item.quantity <= 1}
                                className="px-3 py-1 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                -
                              </button>
                              <span className="px-4 py-1 font-medium">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  handleUpdateQty(
                                    item.id,
                                    item.quantity,
                                    item.quantity + 1,
                                  )
                                }
                                disabled={item.quantity >= maxQty}
                                className="px-3 py-1 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                +
                              </button>
                            </div>
                            <p className="text-lg font-bold sm:text-xl">
                              {formatCurrency(item.line_total)}
                            </p>
                          </div>

                          {!item.in_stock && (
                            <p className="text-red-500 text-sm mt-2">
                              {t("itemOut")}
                            </p>
                          )}

                          {item.quantity > item.max_quantity && (
                            <p className="text-yellow-500 text-sm mt-2">
                              {t("available", {count: item.max_quantity})}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-6 border-t border-gray-200">
                <button
                  onClick={handleClearCart}
                  className="text-red-500 hover:text-red-700 font-medium text-sm"
                >
                  {t("clearAll")}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:w-1/3 lg:min-w-[300px]">
            <div className="sticky bottom-0 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-6 lg:top-8">
              <h2 className="text-xl font-bold mb-6">{t("orderSummary")}</h2>

              <div className="space-y-4 mb-6">
                <div className="flex items-start justify-between gap-3">
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
                  <span className="text-gray-600">{t("shipping")}</span>
                  <span className="font-medium">
                    {cart.summary.shipping === 0
                      ? t("free")
                      : formatCurrency(cart.summary.shipping)}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-gray-600">{t("tax")}</span>
                  <span className="font-medium">
                    {formatCurrency(cart.summary.tax)}
                  </span>
                </div>
              </div>

              <div className="mb-6">
                {cart.applied_coupon ? (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        Coupon "{cart.applied_coupon.code}" applied
                      </p>
                      <p className="text-xs text-green-700">
                        You saved{" "}
                        {formatCurrency(
                          cart.applied_coupon.discount_amount ||
                            cart.summary.discount ||
                            0,
                        )}
                      </p>
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      disabled={isApplyingCoupon}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t("coupon")}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder={t("enterCoupon")}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={isApplyingCoupon}
                        className="px-4 py-2 rounded-lg bg-[#0B123A] text-white text-sm font-semibold hover:bg-[#1a245a] disabled:opacity-50"
                      >
                        {isApplyingCoupon ? t("applying") : t("apply")}
                      </button>
                    </div>
                    {couponError && (
                      <p className="text-xs text-red-500 mt-1">
                        {couponError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-300 pt-4 mb-6">
                {(cart.summary.customs_duty || 0) > 0 && (
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <span className="text-gray-600 break-words">Customs duty</span>
                    <span className="font-medium">
                      {formatCurrency(cart.summary.customs_duty || 0)}
                    </span>
                  </div>
                )}
                <div className="flex items-start justify-between gap-3 text-lg font-bold">
                  <span>{t("total")}</span>
                  <span className="text-[#0B123A]">
                    {formatCurrency(cart.summary.total)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {cart.summary.meta?.message ||
                    (cart.summary.shipping === 0
                      ? "Free shipping applied"
                      : "Shipping rates depend on destination")}
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => router.push("/checkout")}
                  disabled={cart.summary.checkout_available === false}
                  className="w-full bg-[#0B123A] text-white py-4 rounded-xl font-bold hover:bg-[#1a245a] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cart.summary.checkout_available === false
                    ? "Shipping not available"
                    : t("proceed")}
                </button>

                <button
                  onClick={() => router.push("/products")}
                  className="w-full border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-medium hover:border-[#0B123A] hover:text-[#0B123A] transition-all"
                >
                  {t("continue")}
                </button>
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
