import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsEnum,
} from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  description_html?: string;

  @IsOptional()
  @IsString()
  short_description?: string;

  @IsOptional()
  @IsEnum(['DRAFT', 'ACTIVE', 'ARCHIVED'])
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images_base64?: string[];

  @IsOptional()
  @IsNumber()
  sale_price?: number;

  @IsOptional()
  @IsNumber()
  compare_at_price?: number;

  @IsOptional()
  @IsNumber()
  qty_on_hand?: number;
}
