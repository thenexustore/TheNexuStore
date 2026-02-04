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

export class CartSummaryDto {
  subtotal: number = 0;
  shipping: number = 0;
  tax: number = 0;
  total: number = 0;
  item_count: number = 0;
  currency: string = 'EUR';
}

export class CartResponseDto {
  id: string = '';
  items: CartItemDto[] = [];
  summary: CartSummaryDto = new CartSummaryDto();
}
