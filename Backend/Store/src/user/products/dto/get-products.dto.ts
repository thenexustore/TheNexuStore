import {
  IsOptional,
  IsInt,
  Min,
  IsString,
  IsEnum,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum ProductSortBy {
  NEWEST = 'newest',
  PRICE_LOW_TO_HIGH = 'price_low_to_high',
  PRICE_HIGH_TO_LOW = 'price_high_to_low',
  BEST_SELLING = 'best_selling',
  MOST_REVIEWED = 'most_reviewed',
  HIGHEST_RATED = 'highest_rated',
  NAME_A_TO_Z = 'name_a_to_z',
  NAME_Z_TO_A = 'name_z_to_a',
}

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  ALL = 'ALL',
}

export class GetProductsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  categories?: string[];

  @IsOptional()
  @IsEnum(ProductSortBy)
  sort_by?: ProductSortBy = ProductSortBy.NEWEST;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value, 10))
  min_price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value, 10))
  max_price?: number;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus = ProductStatus.ACTIVE;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  in_stock_only?: boolean = false;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  featured_only?: boolean = false;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  attributes?: string[];
}
