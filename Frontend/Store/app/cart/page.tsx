"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  slug: string;
  brand: string;
  stock_status: string;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const loadCart = () => {
      const stored = localStorage.getItem("cart");
      if (stored) {
        try {
          const parsedCart = JSON.parse(stored);
          setCart(parsedCart);
          setCartCount(
            parsedCart.reduce(
              (sum: number, item: CartItem) => sum + item.quantity,
              0
            )
          );
        } catch (e) {
          console.error("Error loading cart:", e);
        }
      }
      setIsLoaded(true);
    };

    loadCart();

    const handleCartUpdate = () => {
      loadCart();
    };

    window.addEventListener("cart-update", handleCartUpdate);
    return () => window.removeEventListener("cart-update", handleCartUpdate);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("cart", JSON.stringify(cart));
      const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
      setCartCount(totalItems);

      const event = new CustomEvent("cart-count-update", {
        detail: totalItems,
      });
      window.dispatchEvent(event);
    }
  }, [cart, isLoaded]);

  const updateQty = (id: string, qty: number) => {
    if (qty < 1) {
      removeItem(id);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: qty } : item))
    );
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem("cart");
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const shipping = subtotal > 100 ? 0 : 9.99;
  const tax = subtotal * 0.21;
  const total = subtotal + shipping + tax;

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B123A]"></div>
      </div>
    );
  }

  if (cart.length === 0) {
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
        <header className="mb-8">
          <h1 className="text-4xl font-black tracking-tighter">
            SHOPPING CART
          </h1>
          <p className="text-gray-500 mt-2">
            {totalItems} item{totalItems !== 1 ? "s" : ""} in your cart
          </p>
        </header>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-2/3">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-100">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex gap-4">
                      <div className="relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
                        <img
                          src={
                            item.image ||
                            "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=400"
                          }
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                        {item.stock_status === "OUT_OF_STOCK" && (
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
                              {item.name}
                            </h3>
                            <p className="text-gray-500 text-sm mb-2">
                              {item.brand}
                            </p>
                            <p className="text-xl font-bold text-[#0B123A]">
                              {formatCurrency(item.price)}
                            </p>
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
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
                                updateQty(item.id, item.quantity - 1)
                              }
                              className="px-3 py-1 hover:bg-gray-100 transition-colors"
                            >
                              -
                            </button>
                            <span className="px-4 py-1 font-medium">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQty(item.id, item.quantity + 1)
                              }
                              className="px-3 py-1 hover:bg-gray-100 transition-colors"
                            >
                              +
                            </button>
                          </div>
                          <p className="text-xl font-bold">
                            {formatCurrency(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 border-t border-gray-200">
                <button
                  onClick={clearCart}
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
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    {shipping === 0 ? "FREE" : formatCurrency(shipping)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium">{formatCurrency(tax)}</span>
                </div>
              </div>

              <div className="border-t border-gray-300 pt-4 mb-6">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-[#0B123A]">
                    {formatCurrency(total)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {shipping === 0
                    ? "Free shipping on orders over €100"
                    : "Add €" +
                      (100 - subtotal).toFixed(2) +
                      " for free shipping"}
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
