import {
  IsString,
  IsEmail,
  IsOptional,
  IsObject,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ShippingAddressDto {
  @IsString()
  full_name: string = '';

  @IsOptional()
  @IsString()
  company?: string = '';

  @IsString()
  address_line1: string = '';

  @IsOptional()
  @IsString()
  address_line2?: string = '';

  @IsString()
  city: string = '';

  @IsString()
  postal_code: string = '';

  @IsString()
  region: string = '';

  @IsString()
  country: string = 'Spain';

  @IsOptional()
  @IsString()
  phone?: string = '';
}

export class BillingAddressDto extends ShippingAddressDto {
  @IsOptional()
  @IsString()
  vat_id?: string = '';
}

export class CreateOrderDto {
  @IsEmail()
  email: string = '';

  @IsObject()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shipping_address: ShippingAddressDto = new ShippingAddressDto();

  @IsObject()
  @ValidateNested()
  @Type(() => BillingAddressDto)
  billing_address: BillingAddressDto = new BillingAddressDto();

  @IsOptional()
  @IsString()
  notes?: string = '';

  @IsOptional()
  @IsIn(['REDSYS', 'COD', 'STRIPE', 'PAYPAL'])
  payment_method?: 'REDSYS' | 'COD' | 'STRIPE' | 'PAYPAL' = 'REDSYS';
}
