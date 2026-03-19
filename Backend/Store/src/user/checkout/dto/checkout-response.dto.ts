export class OrderSummaryDto {
  id: string = '';
  order_number: string = '';
  tracking_token: string = '';
  status: string = '';
  total_amount: number = 0;
  currency: string = 'EUR';
  created_at: Date = new Date();
}

export class RedsysFormDataDto {
  Ds_SignatureVersion: string = '';
  Ds_MerchantParameters: string = '';
  Ds_Signature: string = '';
  formUrl: string = '';
}

export class PaymentIntentDto {
  id: string = '';
  client_secret: string = '';
  amount: number = 0;
  currency: string = 'EUR';
  status: string = '';
  provider: string = '';
  redirect_url?: string;
  form_data?: RedsysFormDataDto;
}

export class OrderResponseDto {
  order: OrderSummaryDto = new OrderSummaryDto();
  payment_intent: PaymentIntentDto = new PaymentIntentDto();
}
