import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

const REDSYS_PAYMENT_METHODS = ['REDSYS', 'BIZUM'] as const;

export class CreateRedsysPaymentDto {
  @IsUUID()
  order_id: string = '';

  @IsOptional()
  @IsIn(REDSYS_PAYMENT_METHODS)
  payment_method?: (typeof REDSYS_PAYMENT_METHODS)[number] = 'REDSYS';

  @IsOptional()
  @IsString()
  return_url?: string;

  @IsOptional()
  @IsString()
  tracking_token?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
