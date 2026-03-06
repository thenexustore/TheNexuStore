import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

const SUPPORTED_PAYMENT_PROVIDERS = ['REDSYS', 'COD'] as const;
export type SupportedPaymentProvider =
  (typeof SUPPORTED_PAYMENT_PROVIDERS)[number];

export class InitiatePaymentDto {
  @IsUUID()
  order_id: string = '';

  @IsIn(SUPPORTED_PAYMENT_PROVIDERS)
  provider: SupportedPaymentProvider = 'REDSYS';

  @IsOptional()
  @IsString()
  return_url?: string;
}
