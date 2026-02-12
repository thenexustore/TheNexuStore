"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../providers/AuthProvider";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    cart,
    cartCount,
    isLoading,
    updateItem,
    removeItem,
    clearCart,
    syncLegacyCart,
  } = useCart();

  const [isLegacyCart, setIsLegacyCart] = useState(false);

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
    if (confirm("Are you sure you want to clear your cart?")) {
      await clearCart();
    }
  };

  const handleSyncCart = async () => {
    if (confirm("Sync your cart with your account to save items?")) {
      await syncLegacyCart();
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
            Your Cart is Empty
          </h2>
          <p className="text-gray-400 mb-10 text-lg">
            Add some products to get started!
          </p>
          <button
            onClick={() => router.push("/products")}
            className="w-full bg-[#0B123A] text-white py-4 rounded-xl font-bold cursor-pointer hover:bg-[#1a245a] active:scale-95 transition-all shadow-lg"
          >
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black py-8">
      <div className="container mx-auto px-4 max-w-6xl">
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
          <h1 className="text-4xl font-black tracking-tighter">
            SHOPPING CART
          </h1>
          <p className="text-gray-500 mt-2">
            {cart.summary.item_count} item
            {cart.summary.item_count !== 1 ? "s" : ""} in your cart
            {isLegacyCart && " (Local Storage)"}
          </p>
        </header>

        <div className="flex flex-col lg:flex-row gap-8">
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
                      className="p-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex gap-4">
                        <div className="relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
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
                                Out of Stock
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex justify-between">
                            <div>
                              <h3 className="text-lg font-bold mb-1">
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

                          <div className="flex items-center justify-between mt-4">
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
                            <p className="text-xl font-bold">
                              {formatCurrency(item.line_total)}
                            </p>
                          </div>

                          {!item.in_stock && (
                            <p className="text-red-500 text-sm mt-2">
                              This item is out of stock
                            </p>
                          )}

                          {item.quantity > item.max_quantity && (
                            <p className="text-yellow-500 text-sm mt-2">
                              Only {item.max_quantity} available
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
                  Clear All Items
                </button>
              </div>
            </div>
          </div>

          <div className="lg:w-1/3">
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 sticky top-8">
              <h2 className="text-xl font-bold mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
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

              <div className="border-t border-gray-300 pt-4 mb-6">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-[#0B123A]">
                    {formatCurrency(cart.summary.total)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {cart.summary.shipping === 0
                    ? "Free shipping on orders over €100"
                    : `Add €${Math.max(0, 100 - cart.summary.subtotal).toFixed(2)} for free shipping`}
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => router.push("/checkout")}
                  className="w-full bg-[#0B123A] text-white py-4 rounded-xl font-bold hover:bg-[#1a245a] active:scale-[0.98] transition-all"
                >
                  Proceed to Checkout
                </button>

                <button
                  onClick={() => router.push("/products")}
                  className="w-full border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-medium hover:border-[#0B123A] hover:text-[#0B123A] transition-all"
                >
                  Continue Shopping
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
