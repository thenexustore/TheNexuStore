import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const emptyStringToUndefined = ({ value }: { value: unknown }) =>
  value === '' ? undefined : value;

export class UpdateImportIntegrationConfigDto {
  @IsString()
  @MaxLength(120)
  @Transform(trimString)
  display_name!: string;

  @IsString()
  @MaxLength(500)
  @Transform(trimString)
  base_url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(trimString)
  api_key?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trimString)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  stock_sync_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  incremental_sync_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  full_sync_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  images_sync_enabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(trimString)
  stock_sync_cron?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(trimString)
  incremental_sync_cron?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(trimString)
  full_sync_cron?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(trimString)
  images_sync_cron?: string;

  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsInt()
  @Min(1)
  @Max(5000)
  stock_batch_size?: number;

  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsInt()
  @Min(1)
  @Max(10000)
  full_sync_batch_size?: number;

  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsInt()
  @Min(0)
  @Max(60000)
  full_sync_batch_delay_ms?: number;

  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsInt()
  @Min(1)
  @Max(5000)
  image_sync_take?: number;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsInt()
  @Min(1)
  @Max(10000)
  catalog_page_size?: number | null;
}
