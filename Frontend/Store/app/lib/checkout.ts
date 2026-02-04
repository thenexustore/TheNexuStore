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
}

export interface OrderItem {
  id: string;
  title: string;
  sku_code: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  items?: OrderItem[];
  shipping_address: ShippingAddress;
  billing_address: BillingAddress;
}

export interface PaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: string;
}

export interface CreateOrderResponse {
  order: Order;
  payment_intent: PaymentIntent;
}

export const createOrder = async (
  orderData: CreateOrderData,
): Promise<CreateOrderResponse> => {
  return apiRequest("/checkout/create-order", {
    method: "POST",
    body: JSON.stringify(orderData),
  });
};

export const getOrder = async (orderId: string): Promise<Order> => {
  return apiRequest(`/checkout/order/${orderId}`);
};

export const getOrders = async (): Promise<Order[]> => {
  return apiRequest("/checkout/orders");
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
): Promise<any> => {
  return apiRequest("/checkout/confirm-payment", {
    method: "POST",
    body: JSON.stringify({
      payment_intent_id: paymentIntentId,
      payment_method_id: paymentMethodId,
    }),
  });
};
