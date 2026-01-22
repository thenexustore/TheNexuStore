import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUUID,
} from 'class-validator';

export class CreateFeaturedProductDto {
  @IsUUID()
  product_id!: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  image_url?: string;

  @IsString()
  @IsOptional()
  badge_text?: string;

  @IsString()
  @IsOptional()
  badge_color?: string;

  @IsString()
  @IsOptional()
  button_text?: string;

  @IsString()
  @IsOptional()
  button_link?: string;

  @IsString()
  @IsOptional()
  layout_type?: string;

  @IsNumber()
  @IsOptional()
  sort_order?: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsUUID()
  @IsOptional()
  category_id?: string;
}
