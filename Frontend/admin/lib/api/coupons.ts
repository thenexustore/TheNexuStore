import { fetchWithAuth } from "../utils";

export type CouponType = "PERCENT" | "FIXED";

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  min_order_amount?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  usage_limit?: number | null;
  usage_count: number;
  is_active: boolean;
  created_at: string;
}

export interface CreateCouponInput {
  code: string;
  type: CouponType;
  value: number;
  min_order_amount?: number;
  starts_at?: string;
  ends_at?: string;
  usage_limit?: number;
}

export interface UpdateCouponInput {
  type?: CouponType;
  value?: number;
  min_order_amount?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  usage_limit?: number | null;
  is_active?: boolean;
}

export async function fetchCoupons(): Promise<Coupon[]> {
  return fetchWithAuth("/admin/coupons");
}

export async function createCoupon(input: CreateCouponInput): Promise<Coupon> {
  return fetchWithAuth("/admin/coupons", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateCoupon(
  id: string,
  input: UpdateCouponInput,
): Promise<Coupon> {
  return fetchWithAuth(`/admin/coupons/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function disableCoupon(id: string): Promise<Coupon> {
  return fetchWithAuth(`/admin/coupons/${id}/disable`, {
    method: "PATCH",
  });
}
