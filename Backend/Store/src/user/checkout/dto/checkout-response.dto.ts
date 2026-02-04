export class OrderSummaryDto {
  id: string = '';
  order_number: string = '';
  status: string = '';
  total_amount: number = 0;
  currency: string = 'EUR';
  created_at: Date = new Date();
}

export class PaymentIntentDto {
  id: string = '';
  client_secret: string = '';
  amount: number = 0;
  currency: string = 'EUR';
  status: string = '';
}

export class OrderResponseDto {
  order: OrderSummaryDto = new OrderSummaryDto();
  payment_intent: PaymentIntentDto = new PaymentIntentDto();
}
