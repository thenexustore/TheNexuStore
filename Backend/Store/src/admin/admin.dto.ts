import {
  IsString,
  IsOptional,
  IsUrl,
  IsNumber,
  IsInt,
  Min,
  MaxLength,
  IsArray,
  ArrayNotEmpty,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';

export class CreateBrandDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsUrl()
  logo_url?: string;
}

export class CreateCategoryDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  parent_id?: string;

  @IsOptional()
  @IsNumber()
  sort_order?: number;
}

export class AdminOrdersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 10;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

export class AddOrderNoteDto {
  @IsString()
  @MaxLength(2000)
  note!: string;
}

export class BulkUpdateOrderStatusDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids!: string[];

  @IsEnum(OrderStatus)
  status!: OrderStatus;
}
