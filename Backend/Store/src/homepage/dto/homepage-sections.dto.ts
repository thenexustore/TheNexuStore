import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { HomepageSectionType } from '../homepage-section.types';

export enum HomepageQueryType {
  PRODUCTS = 'products',
  CATEGORIES = 'categories',
  BRANDS = 'brands',
}

export enum HomepageQuerySortBy {
  NEWEST = 'newest',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  DISCOUNT_DESC = 'discount_desc',
}

export class HomepageQueryConfigDto {
  @IsEnum(HomepageQueryType)
  type!: HomepageQueryType;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceMax?: number;

  @IsOptional()
  @IsEnum(HomepageQuerySortBy)
  sortBy?: HomepageQuerySortBy;

  @IsOptional()
  @IsBoolean()
  inStockOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  featuredOnly?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

export class HomepageSectionConfigDto {
  @IsOptional()
  @IsIn(['manual', 'query'])
  source?: 'manual' | 'query';

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsArray()
  ids?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => HomepageQueryConfigDto)
  query?: HomepageQueryConfigDto;

  @IsOptional()
  @IsArray()
  items?: Array<{ icon?: string; text: string }>;

  @IsOptional()
  @IsString()
  sort_by?: string;
}

export class CreateHomepageSectionDto {
  @IsEnum(HomepageSectionType)
  type!: HomepageSectionType;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsInt()
  @Min(1)
  position!: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => HomepageSectionConfigDto)
  config_json!: HomepageSectionConfigDto;
}

export class UpdateHomepageSectionDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  position?: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => HomepageSectionConfigDto)
  config_json?: HomepageSectionConfigDto;
}

export class ReorderItemDto {
  @IsUUID()
  id!: string;

  @IsInt()
  @Min(1)
  position!: number;
}

export class ReorderHomepageSectionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items!: ReorderItemDto[];
}

export class HomepageSectionOptionsQueryDto {
  @IsEnum(HomepageSectionType)
  type!: HomepageSectionType;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(['products', 'categories', 'brands'])
  target?: 'products' | 'categories' | 'brands';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  brandId?: string;

  @IsOptional()
  @IsIn(['newest', 'price_asc', 'price_desc', 'discount_desc'])
  sortBy?: HomepageQuerySortBy;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMax?: number;

  @IsOptional()
  @IsIn(['true', 'false'])
  inStockOnly?: 'true' | 'false';

  @IsOptional()
  @IsIn(['true', 'false'])
  featuredOnly?: 'true' | 'false';
}
