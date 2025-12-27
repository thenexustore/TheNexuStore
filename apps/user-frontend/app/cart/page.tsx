"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("cart");
    if (stored) {
      try {
        setCart(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("cart", JSON.stringify(cart));
    }
  }, [cart, isLoaded]);

  const updateQty = (id: string, qty: number) => {
    if (qty < 1) return;
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: qty } : item))
    );
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  if (!isLoaded) return <div className="min-h-screen bg-white" />;

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
        <div className="w-full max-w-sm text-center">
          <div className="relative w-full aspect-square mb-8">
            <img
              src="https://www.svgrepo.com/show/17356/empty-cart.svg"
              alt="Empty Cart"
              className="w-full h-full object-cover rounded-3xl"
            />
          </div>
          <h2 className="text-3xl font-bold text-black mb-3">Empty Cart</h2>
          <p className="text-gray-400 mb-10 text-lg">
            Your shopping bag is waiting for its first item.
          </p>
          <button
            onClick={() => router.push("/")}
            className="w-full bg-black text-white py-5 rounded-2xl font-bold cursor-pointer hover:bg-zinc-800 active:scale-95 transition-all shadow-lg"
          >
            Explore Shop
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black selection:bg-black selection:text-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <header className="flex items-end justify-between mb-12">
          <h1 className="text-4xl font-black tracking-tighter">YOUR CART</h1>
          <p className="text-sm font-bold text-gray-400 mb-1 tracking-widest uppercase">
            {cart.length} {cart.length === 1 ? "Item" : "Items"}
          </p>
        </header>

        <div className="space-y-10">
          {cart.map((item) => (
            <div
              key={item.id}
              className="group relative flex gap-6 items-start"
            >
              <div className="relative h-32 w-28 sm:h-40 sm:w-32 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-50 border border-gray-100">
                <img
                  src={
                    item.image ||
                    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=400"
                  }
                  alt={item.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>

              <div className="flex flex-1 flex-col h-32 sm:h-40 justify-between py-1">
                <div className="flex justify-between items-start">
                  <div className="max-w-[80%]">
                    <h3 className="text-lg font-bold leading-tight line-clamp-2 uppercase tracking-tight">
                      {item.name}
                    </h3>
                    <p className="text-gray-400 font-medium mt-1">
                      {formatCurrency(item.price)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="cursor-pointer p-1 text-gray-300 hover:text-black active:scale-90 transition-all"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-100">
                    <button
                      onClick={() => updateQty(item.id, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center cursor-pointer hover:bg-white rounded-lg transition-colors active:scale-90 font-bold"
                    >
                      −
                    </button>
                    <span className="w-10 text-center font-bold text-sm">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(item.id, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center cursor-pointer hover:bg-white rounded-lg transition-colors active:scale-90 font-bold"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-xl font-black">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <footer className="mt-16 pt-10 border-t-2 border-black">
          <div className="flex items-center justify-between mb-10">
            <span className="font-bold text-gray-400 uppercase tracking-widest text-sm">
              Total Amount
            </span>
            <span className="text-3xl font-black tracking-tighter">
              {formatCurrency(total)}
            </span>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => router.push("/checkout")}
              className="w-full bg-black text-white py-6 rounded-2xl font-black text-xl cursor-pointer hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-xl shadow-zinc-200 uppercase tracking-tight"
            >
              Secure Checkout
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full text-gray-400 font-bold py-2 cursor-pointer hover:text-black transition-colors uppercase tracking-widest text-xs"
            >
              ← Back to store
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
