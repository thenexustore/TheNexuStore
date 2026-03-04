import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

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
  NEAREST_0_05 = 'NEAREST_0_05',
  CEIL_1 = 'CEIL_1',
}

export class RulePayloadDto {
  @IsEnum(PricingRuleScope)
  scope!: PricingRuleScope;

  @IsOptional() @IsString() category_id?: string | null;
  @IsOptional() @IsString() brand_id?: string | null;
  @IsOptional() @IsString() sku_id?: string | null;
  @IsOptional() @IsString() sku_code?: string | null;

  @IsNumber() @Min(0) @Max(500) margin_pct!: number;
  @IsOptional() @IsNumber() @Min(0) @Max(90) discount_pct?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(500) min_margin_pct?: number | null;
  @IsOptional() @IsNumber() @Min(0) @Max(1000000) min_margin_amount?: number | null;

  @IsOptional() @IsEnum(RoundingMode) rounding_mode?: RoundingMode;

  @IsInt() @Min(-999) @Max(999) priority!: number;
  @IsOptional() @IsBoolean() is_active?: boolean;

  @IsOptional() @IsDateString() starts_at?: string | null;
  @IsOptional() @IsDateString() ends_at?: string | null;
}

export class RulesQueryDto {
  @IsOptional() @IsEnum(PricingRuleScope) scope?: PricingRuleScope;
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  active?: boolean;

  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() brandId?: string;
  @IsOptional() @IsString() skuId?: string;
}

export class PreviewDto {
  @IsOptional() @IsString() skuId?: string;
  @IsOptional() @IsString() skuCode?: string;
  @IsOptional() @IsNumber() costOverride?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => RulePayloadDto)
  ruleOverride?: RulePayloadDto;
}

export class RecalculateDto {
  @IsOptional() @IsIn(['all', 'sku', 'brand', 'category']) scope?: 'all' | 'sku' | 'brand' | 'category';
  @IsOptional() @IsArray() @IsString({ each: true }) skuIds?: string[];
  @IsOptional() @IsString() brandId?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return value === true || value === 'true';
  })
  @IsBoolean()
  dryRun?: boolean;
}
