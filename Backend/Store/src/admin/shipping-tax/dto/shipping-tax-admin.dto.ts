import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpsertShippingZoneDto {
  @IsString()
  code!: string;

  @IsBoolean()
  enabled!: boolean;

  @IsString()
  description!: string;

  @IsArray()
  @IsString({ each: true })
  country_codes!: string[];

  @IsArray()
  @IsString({ each: true })
  region_matchers!: string[];
}

export class ReplaceShippingRuleDto {
  @IsString()
  zone_code!: string;

  @IsNumber()
  @Min(0)
  min_base_excl_tax!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  max_base_excl_tax?: number | null;

  @IsNumber()
  @Min(0)
  shipping_base_excl_tax!: number;

  @IsString()
  currency!: string;

  @IsInt()
  priority!: number;
}

export class UpsertTaxZoneDto {
  @IsString()
  code!: string;

  @IsBoolean()
  enabled!: boolean;

  @IsEnum(['VAT', 'OUTSIDE_VAT'])
  mode!: 'VAT' | 'OUTSIDE_VAT';

  @IsNumber()
  @Min(0)
  standard_rate!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  customs_duty_rate?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
