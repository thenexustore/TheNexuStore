"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useAuth } from "../app/providers/AuthProvider";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart as clearBackendCart,
  applyCoupon as applyCouponApi,
  removeCoupon as removeCouponApi,
} from "@/app/lib/cart";

interface CartItem {
  id: string;
  sku_id: string;
  product_title: string;
  sku_code: string;
  variant_name?: string;
  price: number;
  quantity: number;
  line_total: number;
  thumbnail?: string;
  max_quantity: number;
  in_stock: boolean;
  product_id?: string;
}

interface CartSummaryMeta {
  status: "OK" | "UNAVAILABLE";
  zone_code: string;
  tax_label: "IVA" | "VAT" | "Taxes";
  tax_mode: "VAT" | "OUTSIDE_VAT";
  tax_rate: number;
  customs_duty_rate: number;
  customs_duty_amount: number;
  message?: string;
}

interface CartSummary {
  subtotal: number;
  discount?: number;
  shipping: number;
  tax: number;
  customs_duty?: number;
  total: number;
  item_count: number;
  currency: string;
  checkout_available?: boolean;
  meta?: CartSummaryMeta;
}

interface AppliedCoupon {
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  discount_amount: number;
}

interface Cart {
  id: string;
  items: CartItem[];
  summary: CartSummary;
  applied_coupon?: AppliedCoupon | null;
}

interface CartContextType {
  cart: Cart | null;
  cartCount: number;
  isLoading: boolean;
  addItem: (skuCode: string, quantity: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  syncLegacyCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};

const convertLegacyToBackendFormat = (legacyItems: any[]): Cart => {
  const items: CartItem[] = legacyItems.map((item, index) => ({
    id: `legacy-${index}`,
    sku_id: item.id,
    product_title: item.name || "Unknown Product",
    sku_code: item.sku_code || `LEGACY-${item.id.substring(0, 8)}`,
    price: item.price || 0,
    quantity: item.quantity || 1,
    line_total: (item.price || 0) * (item.quantity || 1),
    thumbnail: item.image,
    max_quantity: 99,
    in_stock: item.stock_status !== "OUT_OF_STOCK",
    product_id: item.id,
  }));

  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
  const shipping = subtotal > 100 ? 0 : 9.99;
  const tax = subtotal * 0.21;

  return {
    id: "legacy-cart",
    items,
    summary: {
      subtotal,
      shipping,
      tax,
      customs_duty: 0,
      total: subtotal + shipping + tax,
      item_count: items.reduce((sum, item) => sum + item.quantity, 0),
      currency: "EUR",
      checkout_available: true,
      meta: {
        status: "OK",
        zone_code: "ES_PENINSULA_BALEARES",
        tax_label: "IVA",
        tax_mode: "VAT",
        tax_rate: 0.21,
        customs_duty_rate: 0,
        customs_duty_amount: 0,
      },
    },
  };
};

const convertBackendToLegacyFormat = (backendCart: Cart): any[] =>
  backendCart.items.map((item) => ({
    id: item.product_id || item.sku_id,
    name: item.product_title,
    price: item.price,
    quantity: item.quantity,
    image: item.thumbnail,
    sku_code: item.sku_code,
    slug: item.product_title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    brand: "Unknown",
    stock_status: item.in_stock ? "IN_STOCK" : "OUT_OF_STOCK",
  }));

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user, getSessionId } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSynced, setHasSynced] = useState(false);

  const fetchBackendCart = async (): Promise<Cart | null> => {
    try {
      const sessionId = getSessionId();
      if (!sessionId) return null;
      return await getCart(sessionId);
    } catch {
      return null;
    }
  };

  const loadLegacyCart = (): Cart | null => {
    try {
      const stored = localStorage.getItem("cart");
      if (!stored) return null;
      const legacyItems = JSON.parse(stored);
      if (!Array.isArray(legacyItems) || legacyItems.length === 0) return null;
      return convertLegacyToBackendFormat(legacyItems);
    } catch {
      return null;
    }
  };

  const fetchCart = async () => {
    try {
      setIsLoading(true);

      const backendCart = await fetchBackendCart();

      if (backendCart) {
        setCart(backendCart);
        localStorage.setItem(
          "cart",
          JSON.stringify(convertBackendToLegacyFormat(backendCart)),
        );
      } else {
        setCart(loadLegacyCart());
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
    setHasSynced(false);
  }, [user]);

  const addItem = async (skuCode: string, quantity: number) => {
    try {
      const sessionId = getSessionId();
      if (!sessionId) return;

      await addToCart(skuCode, quantity, sessionId);
      await fetchCart();
    } catch {}
  };

  const updateItem = async (itemId: string, quantity: number) => {
    try {
      const sessionId = getSessionId();
      if (!sessionId) return;

      if (quantity < 1) {
        await removeItem(itemId);
        return;
      }

      await updateCartItem(itemId, { quantity }, sessionId);
      await fetchCart();
    } catch {}
  };

  const removeItem = async (itemId: string) => {
    try {
      const sessionId = getSessionId();
      if (!sessionId) return;

      await removeCartItem(itemId, sessionId);
      await fetchCart();
    } catch {}
  };

  const clearCart = async () => {
    try {
      const sessionId = getSessionId();
      if (sessionId) await clearBackendCart(sessionId);
    } catch {}

    localStorage.removeItem("cart");
    setCart(null);
  };

  const syncLegacyCart = async () => {
    const legacyCart = loadLegacyCart();
    if (!legacyCart) return;

    const sessionId = getSessionId();
    if (!sessionId) return;

    const backendCart = await fetchBackendCart();

    for (const item of legacyCart.items) {
      try {
        const existing = backendCart?.items.find(
          (i) => i.sku_code === item.sku_code,
        );

        const existingQty = existing?.quantity || 0;
        const allowed = Math.max(0, item.max_quantity - existingQty);
        if (allowed <= 0) continue;

        const qtyToAdd = Math.min(item.quantity, allowed);

        await addToCart(item.sku_code, qtyToAdd, sessionId);
      } catch {
        continue;
      }
    }

    localStorage.removeItem("cart");
    await fetchCart();
  };

  const applyCoupon = async (code: string) => {
    try {
      const sessionId = getSessionId();
      if (!sessionId) return;
      await applyCouponApi(code, sessionId);
      await fetchCart();
    } catch {
      // swallow for now; UI will handle error via thrown message if needed
    }
  };

  const removeCoupon = async () => {
    try {
      const sessionId = getSessionId();
      if (!sessionId) return;
      await removeCouponApi(sessionId);
      await fetchCart();
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (user && cart?.id === "legacy-cart" && !hasSynced) {
      setHasSynced(true);
      syncLegacyCart();
    }
  }, [user, cart?.id, hasSynced]);

  const cartCount = cart?.summary.item_count || 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        isLoading,
        addItem,
        updateItem,
        removeItem,
        clearCart,
        refreshCart: fetchCart,
        syncLegacyCart,
        applyCoupon,
        removeCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
 