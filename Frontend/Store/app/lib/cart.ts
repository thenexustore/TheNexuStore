import { apiRequestWithSession } from "./api";

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

export interface CartSummaryMeta {
  status: "OK" | "UNAVAILABLE";
  zone_code: string;
  tax_label: "IVA" | "VAT" | "Taxes";
  tax_mode: "VAT" | "OUTSIDE_VAT";
  tax_rate: number;
  customs_duty_rate: number;
  customs_duty_amount: number;
  message?: string;
}

export interface CartSummary {
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

export interface AppliedCoupon {
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  discount_amount: number;
}


export interface DestinationQuoteInput {
  country?: string;
  region?: string;
  postal_code?: string;
}

export interface CartResponse {
  id: string;
  items: CartItem[];
  summary: CartSummary;
  applied_coupon?: AppliedCoupon;
}

export const getCart = async (
  sessionId?: string,
  destination?: DestinationQuoteInput,
): Promise<CartResponse> => {
  const params = new URLSearchParams();
  if (destination?.country) params.set("country", destination.country);
  if (destination?.region) params.set("region", destination.region);
  if (destination?.postal_code) params.set("postal_code", destination.postal_code);
  const path = params.toString() ? `/cart?${params.toString()}` : "/cart";
  return apiRequestWithSession(path, { method: "GET" }, sessionId);
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

export const applyCoupon = async (
  couponCode: string,
  sessionId?: string,
): Promise<CartResponse> => {
  return apiRequestWithSession(
    "/cart/coupon/apply",
    {
      method: "POST",
      body: JSON.stringify({ coupon_code: couponCode }),
    },
    sessionId,
  );
};

export const removeCoupon = async (
  sessionId?: string,
): Promise<CartResponse> => {
  return apiRequestWithSession(
    "/cart/coupon",
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
