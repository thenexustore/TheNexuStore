import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsEnum,
  Matches,
  ValidateIf,
  MaxLength,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateBannerDto {
  @IsOptional()
  @IsString()
  @MaxLength(10 * 1024 * 1024, { message: 'Image must not exceed 10MB' })
  image?: string; // Base64 string

  @IsString()
  overlay!: string;

  @IsEnum(['left', 'center', 'right'])
  align!: string;

  @IsString()
  title_text!: string;

  @IsString()
  title_color!: string;

  @IsString()
  title_size!: string;

  @IsString()
  title_weight!: string;

  @IsString()
  title_font!: string;

  @IsString()
  subtitle_text!: string;

  @IsString()
  subtitle_color!: string;

  @IsString()
  subtitle_size!: string;

  @IsString()
  button_text!: string;

  @ValidateIf((o) => o.button_link && o.button_link.length > 0)
  @Matches(/^(\/[a-zA-Z0-9\-_\.\/]+|https?:\/\/.+)$/, {
    message:
      'Button link must be either a relative path starting with / or a full URL',
  })
  @MaxLength(500, { message: 'Button link must not exceed 500 characters' })
  button_link?: string;

  @IsString()
  button_bg!: string;

  @IsString()
  button_color!: string;

  @IsString()
  button_radius!: string;

  @IsString()
  button_padding!: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsNumber()
  sort_order?: number;
}

export class UpdateBannerDto extends PartialType(CreateBannerDto) {}

export class ReorderBannersDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}
