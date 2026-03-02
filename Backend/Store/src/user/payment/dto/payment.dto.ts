import { IsString, IsEnum, IsOptional } from 'class-validator';

export enum PaymentProviderEnum {
  REDSYS = 'REDSYS',
  STRIPE = 'STRIPE',
  PAYPAL = 'PAYPAL',
  COD = 'COD',
}

export class InitiatePaymentDto {
  @IsString()
  order_id: string = '';

  @IsEnum(PaymentProviderEnum)
  provider: PaymentProviderEnum = PaymentProviderEnum.REDSYS;

  @IsOptional()
  @IsString()
  return_url?: string;
}
