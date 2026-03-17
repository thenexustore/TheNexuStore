import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { HomeSectionItemType, HomeSectionType } from '../home-layout.types';

export class CreateLayoutDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  locale?: string;
}

export class UpdateLayoutDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class CreateSectionDto {
  @IsEnum(HomeSectionType)
  type!: HomeSectionType;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsInt()
  @Min(1)
  position!: number;

  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean;

  @IsOptional()
  @IsString()
  variant?: string;

  @IsObject()
  config!: Record<string, any>;
}

export class UpdateSectionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  position?: number;

  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean;

  @IsOptional()
  @IsString()
  variant?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}

export class MoveSectionDto {
  @IsInt()
  @Min(1)
  position!: number;
}

export class MoveSectionEntryDto {
  @IsString()
  id!: string;

  @IsInt()
  @Min(1)
  position!: number;
}

export class ReorderSectionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MoveSectionEntryDto)
  items!: MoveSectionEntryDto[];
}

export class CreateItemDto {
  @IsInt()
  @Min(1)
  position!: number;

  @IsEnum(HomeSectionItemType)
  type!: HomeSectionItemType;

  @IsOptional()
  @IsUUID()
  banner_id?: string;

  @IsOptional()
  @IsUUID()
  category_id?: string;

  @IsOptional()
  @IsUUID()
  brand_id?: string;

  @IsOptional()
  @IsUUID()
  product_id?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsString()
  href?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}

export class UpdateItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  position?: number;

  @IsOptional()
  @IsEnum(HomeSectionItemType)
  type?: HomeSectionItemType;

  @IsOptional()
  @IsUUID()
  banner_id?: string;

  @IsOptional()
  @IsUUID()
  category_id?: string;

  @IsOptional()
  @IsUUID()
  brand_id?: string;

  @IsOptional()
  @IsUUID()
  product_id?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsString()
  href?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}

class ReorderItem {
  @IsUUID()
  id!: string;

  @IsInt()
  @Min(1)
  position!: number;
}

export class ReorderItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItem)
  items!: ReorderItem[];
}
