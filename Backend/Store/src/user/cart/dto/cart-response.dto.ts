export class CartItemDto {
  id: string = '';
  sku_id: string = '';
  product_title: string = '';
  sku_code: string = '';
  variant_name?: string;
  price: number = 0;
  quantity: number = 0;
  line_total: number = 0;
  thumbnail?: string;
  max_quantity: number = 0;
  in_stock: boolean = false;
}

export class AppliedCouponDto {
  code: string = '';
  type: 'PERCENT' | 'FIXED' = 'PERCENT';
  value: number = 0;
  discount_amount: number = 0;
}

export class CartTotalsMetaDto {
  status: 'OK' | 'UNAVAILABLE' = 'OK';
  zone_code: string = '';
  tax_label: 'IVA' | 'VAT' | 'Taxes' = 'Taxes';
  tax_mode: 'VAT' | 'OUTSIDE_VAT' = 'VAT';
  tax_rate: number = 0;
  customs_duty_rate: number = 0;
  customs_duty_amount: number = 0;
  message?: string;
}

export class CartSummaryDto {
  subtotal: number = 0;
  discount: number = 0;
  shipping: number = 0;
  tax: number = 0;
  customs_duty: number = 0;
  total: number = 0;
  item_count: number = 0;
  currency: string = 'EUR';
  checkout_available: boolean = true;
  meta: CartTotalsMetaDto = new CartTotalsMetaDto();
}

export class CartResponseDto {
  id: string = '';
  items: CartItemDto[] = [];
  summary: CartSummaryDto = new CartSummaryDto();
  applied_coupon?: AppliedCouponDto;
}
