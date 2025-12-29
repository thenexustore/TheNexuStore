import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsEnum,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ProductAttributeDto {
  @IsString()
  key!: string;

  @IsString()
  value!: string;
}

class ProductVariantDto {
  @IsOptional()
  @IsString()
  sku_code?: string;

  @IsOptional()
  @IsString()
  variant_name?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeDto)
  attributes!: ProductAttributeDto[];

  @IsNumber()
  sale_price!: number;

  @IsOptional()
  @IsNumber()
  compare_at_price?: number;

  @IsNumber()
  qty_on_hand!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

export class CreateProductDto {
  @IsString()
  title!: string;

  @IsString()
  brandId!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsString()
  sku_code?: string;

  @IsOptional()
  @IsNumber()
  sale_price?: number;

  @IsOptional()
  @IsNumber()
  compare_at_price?: number;

  @IsOptional()
  @IsNumber()
  qty_on_hand?: number;

  @IsOptional()
  @IsEnum(['IN_STOCK', 'OUT_OF_STOCK', 'LOW_STOCK', 'PREORDER'])
  stock_status?: string;

  @IsOptional()
  @IsString()
  description_html?: string;

  @IsOptional()
  @IsString()
  short_description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images_base64?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeDto)
  attributes?: ProductAttributeDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];

  @IsOptional()
  @IsEnum(['DRAFT', 'ACTIVE', 'ARCHIVED'])
  status?: string;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;
}
