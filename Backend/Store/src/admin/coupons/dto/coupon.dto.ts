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
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';


@ValidatorConstraint({ name: 'percentCouponValueMax', async: false })
class PercentCouponValueMaxConstraint implements ValidatorConstraintInterface {
  validate(value: number | undefined, args: ValidationArguments): boolean {
    const dto = args.object as { type?: CouponType };

    if (dto.type !== CouponType.PERCENT || value === undefined || value === null) {
      return true;
    }

    return value <= 100;
  }

  defaultMessage(): string {
    return 'value must not be greater than 100 for percent coupons';
  }
}

export class CreateCouponDto {
  @IsString()
  @IsNotEmpty()
  code: string = '';

  @IsEnum(CouponType)
  type: CouponType = CouponType.PERCENT;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Validate(PercentCouponValueMaxConstraint)
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
  @Validate(PercentCouponValueMaxConstraint)
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
