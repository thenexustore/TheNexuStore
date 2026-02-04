import { apiRequest, apiRequestWithSession } from "./api";

export interface CartItem {
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

export interface CartSummary {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  item_count: number;
  currency: string;
}

export interface CartResponse {
  id: string;
  items: CartItem[];
  summary: CartSummary;
}

export const getCart = async (sessionId?: string): Promise<CartResponse> => {
  return apiRequestWithSession("/cart", { method: "GET" }, sessionId);
};

export const addToCart = async (
  skuCode: string,
  quantity: number,
  sessionId?: string,
): Promise<CartResponse> => {
  return apiRequestWithSession(
    "/cart/add",
    {
      method: "POST",
      body: JSON.stringify({ sku_code: skuCode, quantity }),
    },
    sessionId,
  );
};

export const updateCartItem = async (
  itemId: string,
  data: { quantity: number },
  sessionId?: string,
): Promise<CartResponse> => {
  return apiRequestWithSession(
    `/cart/item/${itemId}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
    sessionId,
  );
};

export const removeCartItem = async (
  itemId: string,
  sessionId?: string,
): Promise<CartResponse> => {
  return apiRequestWithSession(
    `/cart/item/${itemId}`,
    {
      method: "DELETE",
    },
    sessionId,
  );
};

export const clearCart = async (sessionId?: string): Promise<CartResponse> => {
  return apiRequestWithSession(
    "/cart/clear",
    {
      method: "DELETE",
    },
    sessionId,
  );
};

export const mergeCarts = async (
  sessionCartId: string,
  sessionId?: string,
): Promise<CartResponse> => {
  return apiRequestWithSession(
    "/cart/merge",
    {
      method: "POST",
      body: JSON.stringify({ session_cart_id: sessionCartId }),
    },
    sessionId,
  );
};
