import { apiRequest, apiRequestWithSession } from "./api";

export interface ShippingAddress {
  full_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  postal_code: string;
  region?: string;
  country: string;
  phone?: string;
}

export interface BillingAddress extends ShippingAddress {
  vat_id?: string;
}

export interface CreateOrderData {
  email: string;
  shipping_address: ShippingAddress;
  billing_address: BillingAddress;
  notes?: string;
  payment_method?: "REDSYS" | "BIZUM" | "COD";
}

export interface OrderItem {
  id: string;
  title?: string;
  title_snapshot?: string;
  sku_code?: string;
  quantity?: number;
  qty?: number;
  unit_price: number;
  line_total: number;
}

export interface OrderPayment {
  id: string;
  provider: "REDSYS" | "BIZUM" | "COD" | "STRIPE" | "PAYPAL";
  status: string;
  amount: number;
  currency: string;
  created_at?: string;
}

export interface Shipment {
  id: string;
  carrier: string;
  service_level?: string | null;
  status: string;
  tracking_number?: string | null;
  tracking_url?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  tracking_events?: Array<{
    id: string;
    event_time: string;
    status: string;
    location?: string | null;
    details?: string | null;
  }>;
}

export interface BillingDocumentRef {
  id: string;
  document_number: string | null;
  status: string;
  issue_date: string | null;
  total_amount: number;
  currency: string;
}

export interface Order {
  id: string;
  order_number: string;
  tracking_token?: string;
  status: string;
  subtotal_amount: number;
  shipping_amount: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  created_at: string;
  items?: OrderItem[];
  payments?: OrderPayment[];
  shipments?: Shipment[];
  shipping_address: ShippingAddress;
  billing_address: BillingAddress;
  billing_documents?: BillingDocumentRef[];
}

export interface PaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: string;
  provider?: "REDSYS" | "BIZUM" | "COD";
  redirect_url?: string;
  form_data?: {
    Ds_SignatureVersion: string;
    Ds_MerchantParameters: string;
    Ds_Signature: string;
    formUrl: string;
  };
}

export interface RedsysCreateResponse {
  payment_id: string;
  order_id: string;
  provider: "REDSYS" | "BIZUM" | "COD";
  formUrl?: string;
  Ds_SignatureVersion?: string;
  Ds_MerchantParameters?: string;
  Ds_Signature?: string;
  formData?: {
    Ds_SignatureVersion: string;
    Ds_MerchantParameters: string;
    Ds_Signature: string;
    formUrl: string;
  };
}

export interface CreateOrderResponse {
  order: Order;
  payment_intent: PaymentIntent;
}

export const createOrder = async (
  orderData: CreateOrderData,
  sessionId?: string,
): Promise<CreateOrderResponse> => {
  return apiRequestWithSession(
    "/checkout/create-order",
    {
      method: "POST",
      body: JSON.stringify(orderData),
    },
    sessionId,
  );
};

export const createRedsysPayment = async (
  payload: {
    order_id: string;
    payment_method?: "REDSYS" | "BIZUM";
    tracking_token?: string;
    phone?: string;
  },
  sessionId?: string,
): Promise<RedsysCreateResponse> => {
  return apiRequestWithSession(
    "/payments/redsys/create",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    sessionId,
  );
};

export const getOrder = async (orderId: string): Promise<Order> => {
  return apiRequest(`/checkout/order/${orderId}`);
};

export const getOrders = async (): Promise<Order[]> => {
  return apiRequest("/checkout/orders");
};

export const getOrderByTrackingToken = async (
  token: string,
): Promise<Order> => {
  return apiRequest(`/checkout/track/${token}`);
};

export const createPaymentIntent = async (
  orderId: string,
): Promise<PaymentIntent> => {
  return apiRequest(`/checkout/order/${orderId}/payment-intent`, {
    method: "POST",
  });
};

export const confirmPayment = async (
  paymentIntentId: string,
  paymentMethodId: string,
): Promise<unknown> => {
  return apiRequest("/checkout/confirm-payment", {
    method: "POST",
    body: JSON.stringify({
      payment_intent_id: paymentIntentId,
      payment_method_id: paymentMethodId,
    }),
  });
};

export const downloadInvoicePdf = async (docId: string): Promise<void> => {
  const { API_URL: apiUrl } = await import("./env");
  const response = await fetch(`${apiUrl}/checkout/documents/${docId}/pdf`, {
    method: "GET",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("No se pudo descargar la factura");
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `factura-${docId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};
