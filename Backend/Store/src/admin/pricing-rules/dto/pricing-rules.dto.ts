import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export enum PricingRuleScope {
  GLOBAL = 'GLOBAL',
  CATEGORY = 'CATEGORY',
  BRAND = 'BRAND',
  SKU = 'SKU',
}

export enum RoundingMode {
  NONE = 'NONE',
  X_99 = 'X_99',
  X_95 = 'X_95',
}

export class CreatePricingRuleDto {
  @IsEnum(PricingRuleScope)
  scope!: PricingRuleScope;

  @IsOptional()
  @IsString()
  category_id?: string | null;

  @IsOptional()
  @IsString()
  brand_id?: string | null;

  @IsOptional()
  @IsString()
  sku_id?: string | null;

  @IsOptional()
  @IsString()
  sku_code?: string | null;

  @IsNumber()
  @Min(0)
  @Max(1000)
  margin_pct!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000000)
  min_margin_amount?: number | null;

  @IsOptional()
  @IsEnum(RoundingMode)
  rounding_mode?: RoundingMode;

  @IsInt()
  @Min(-100000)
  @Max(100000)
  priority!: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdatePricingRuleDto {
  @IsOptional()
  @IsEnum(PricingRuleScope)
  scope?: PricingRuleScope;

  @IsOptional()
  @IsString()
  category_id?: string | null;

  @IsOptional()
  @IsString()
  brand_id?: string | null;

  @IsOptional()
  @IsString()
  sku_id?: string | null;

  @IsOptional()
  @IsString()
  sku_code?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  margin_pct?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000000)
  min_margin_amount?: number | null;

  @IsOptional()
  @IsEnum(RoundingMode)
  rounding_mode?: RoundingMode;

  @IsOptional()
  @IsInt()
  @Min(-100000)
  @Max(100000)
  priority?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class TogglePricingRuleDto {
  @IsBoolean()
  is_active!: boolean;
}

export class PreviewPricingDto {
  @IsString()
  sku_code!: string;
}
