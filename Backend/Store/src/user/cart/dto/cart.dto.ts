// dto/cart.dto
import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  Min,
  IsNotEmpty,
} from 'class-validator';

export class AddToCartDto {
  @IsString()
  @IsNotEmpty()
  sku_code!: string;

  @IsNumber()
  @IsPositive()
  @Min(1)
  quantity: number = 1;
}

export class UpdateCartItemDto {
  @IsNumber()
  @IsPositive()
  @Min(0)
  quantity: number = 0;
}

export class ApplyCouponDto {
  @IsString()
  coupon_code: string = '';
}

export class CartQueryDto {
  @IsOptional()
  @IsString()
  session_id?: string;
}

export class CartTotalsQueryDto extends CartQueryDto {
  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  postal_code?: string;
}
