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

interface CartSummary {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  item_count: number;
  currency: string;
}

interface Cart {
  id: string;
  items: CartItem[];
  summary: CartSummary;
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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
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
  const total = subtotal + shipping + tax;

  return {
    id: "legacy-cart",
    items,
    summary: {
      subtotal,
      shipping,
      tax,
      total,
      item_count: items.reduce((sum, item) => sum + item.quantity, 0),
      currency: "EUR",
    },
  };
};

const convertBackendToLegacyFormat = (backendCart: Cart): any[] => {
  return backendCart.items.map((item) => ({
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
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user, getSessionId } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBackendCart = async (): Promise<Cart | null> => {
    try {
      const sessionId = getSessionId();
      const cartData = await getCart(sessionId);
      return cartData;
    } catch (error) {
      console.error("Failed to fetch backend cart:", error);
      return null;
    }
  };

  const loadLegacyCart = (): Cart | null => {
    try {
      const stored = localStorage.getItem("cart");
      if (stored) {
        const legacyItems = JSON.parse(stored);
        if (Array.isArray(legacyItems) && legacyItems.length > 0) {
          return convertLegacyToBackendFormat(legacyItems);
        }
      }
    } catch (e) {
      console.error("Error loading legacy cart:", e);
    }
    return null;
  };

  const fetchCart = async () => {
    try {
      setIsLoading(true);

      let backendCart = await fetchBackendCart();

      if (backendCart) {
        setCart(backendCart);
        const legacyItems = convertBackendToLegacyFormat(backendCart);
        localStorage.setItem("cart", JSON.stringify(legacyItems));
      } else {
        const legacyCart = loadLegacyCart();
        setCart(legacyCart);
      }

      const event = new CustomEvent("cart-update");
      window.dispatchEvent(event);
    } catch (error) {
      console.error("Failed to fetch cart:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, [user]);

  const addItem = async (skuCode: string, quantity: number) => {
    try {
      const sessionId = getSessionId();
      await addToCart(skuCode, quantity, sessionId);
      await fetchCart();

      const event = new CustomEvent("cart-update");
      window.dispatchEvent(event);
    } catch (error) {
      console.error("Failed to add item:", error);

      const legacyCart = loadLegacyCart();
      const currentItems = legacyCart?.items || [];

      const updatedItems = [...currentItems];
      const existingItemIndex = updatedItems.findIndex(
        (item) => item.sku_code === skuCode,
      );

      if (existingItemIndex >= 0) {
        updatedItems[existingItemIndex].quantity += quantity;
      } else {
        updatedItems.push({
          id: `legacy-${Date.now()}`,
          sku_id: `sku-${skuCode}`,
          product_title: `Product ${skuCode}`,
          sku_code: skuCode,
          price: 0,
          quantity,
          line_total: 0,
          thumbnail: "",
          max_quantity: 99,
          in_stock: true,
        });
      }

      const newCart = {
        id: "legacy-cart",
        items: updatedItems,
        summary: {
          subtotal: updatedItems.reduce(
            (sum, item) => sum + item.line_total,
            0,
          ),
          shipping: 9.99,
          tax:
            updatedItems.reduce((sum, item) => sum + item.line_total, 0) * 0.21,
          total:
            updatedItems.reduce((sum, item) => sum + item.line_total, 0) +
            9.99 +
            updatedItems.reduce((sum, item) => sum + item.line_total, 0) * 0.21,
          item_count: updatedItems.reduce(
            (sum, item) => sum + item.quantity,
            0,
          ),
          currency: "EUR",
        },
      };

      setCart(newCart);
      localStorage.setItem(
        "cart",
        JSON.stringify(convertBackendToLegacyFormat(newCart)),
      );

      const event = new CustomEvent("cart-update");
      window.dispatchEvent(event);
    }
  };

  const updateItem = async (itemId: string, quantity: number) => {
    try {
      const sessionId = getSessionId();
      if (quantity < 1) {
        await removeItem(itemId);
      } else {
        await updateCartItem(itemId, { quantity }, sessionId);
        await fetchCart();
      }

      const event = new CustomEvent("cart-update");
      window.dispatchEvent(event);
    } catch (error) {
      console.error("Failed to update item:", error);
      const legacyCart = loadLegacyCart();
      if (legacyCart) {
        const updatedItems = legacyCart.items.map((item) =>
          item.id === itemId ? { ...item, quantity } : item,
        );
        localStorage.setItem(
          "cart",
          JSON.stringify(
            convertBackendToLegacyFormat({
              ...legacyCart,
              items: updatedItems,
            }),
          ),
        );
        setCart({ ...legacyCart, items: updatedItems });

        const event = new CustomEvent("cart-update");
        window.dispatchEvent(event);
      }
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const sessionId = getSessionId();
      await removeCartItem(itemId, sessionId);
      await fetchCart();

      const event = new CustomEvent("cart-update");
      window.dispatchEvent(event);
    } catch (error) {
      console.error("Failed to remove item:", error);
      const legacyCart = loadLegacyCart();
      if (legacyCart) {
        const updatedItems = legacyCart.items.filter(
          (item) => item.id !== itemId,
        );
        localStorage.setItem(
          "cart",
          JSON.stringify(
            convertBackendToLegacyFormat({
              ...legacyCart,
              items: updatedItems,
            }),
          ),
        );
        setCart({ ...legacyCart, items: updatedItems });

        const event = new CustomEvent("cart-update");
        window.dispatchEvent(event);
      }
    }
  };

  const clearCart = async () => {
    try {
      const sessionId = getSessionId();
      await clearBackendCart(sessionId);
    } catch (error) {
      console.error("Failed to clear backend cart:", error);
    }

    localStorage.removeItem("cart");
    setCart(null);

    const event = new CustomEvent("cart-update");
    window.dispatchEvent(event);
    const countEvent = new CustomEvent("cart-count-update", { detail: 0 });
    window.dispatchEvent(countEvent);
  };

  const syncLegacyCart = async () => {
    const legacyCart = loadLegacyCart();
    if (legacyCart && legacyCart.items.length > 0) {
      try {
        const sessionId = getSessionId();
        for (const item of legacyCart.items) {
          try {
            await addToCart(item.sku_code, item.quantity, sessionId);
          } catch (e) {
            console.error("Failed to sync item:", e);
          }
        }
        localStorage.removeItem("cart");
        await fetchCart();
      } catch (error) {
        console.error("Failed to sync legacy cart:", error);
      }
    }
  };

  useEffect(() => {
    if (user && cart?.id === "legacy-cart") {
      syncLegacyCart();
    }
  }, [user, cart?.id]);

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
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
