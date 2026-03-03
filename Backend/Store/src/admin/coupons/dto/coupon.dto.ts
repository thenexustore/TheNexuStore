import { CouponType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateCouponDto {
  @IsString()
  @IsNotEmpty()
  code: string = '';

  @IsEnum(CouponType)
  type: CouponType = CouponType.PERCENT;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @ValidateIf((dto: CreateCouponDto) => dto.type === CouponType.PERCENT)
  @Max(100)
  value: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  min_order_amount?: number;

  @IsOptional()
  @IsDateString()
  starts_at?: string;

  @IsOptional()
  @IsDateString()
  ends_at?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usage_limit?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateCouponDto {
  @IsOptional()
  @IsEnum(CouponType)
  type?: CouponType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @ValidateIf((dto: UpdateCouponDto) => dto.type === CouponType.PERCENT)
  @Max(100)
  value?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  min_order_amount?: number | null;

  @IsOptional()
  @IsDateString()
  starts_at?: string | null;

  @IsOptional()
  @IsDateString()
  ends_at?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usage_limit?: number | null;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
