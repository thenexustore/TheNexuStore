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
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus, ShipmentStatus } from '@prisma/client';

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

export class CreateOrderShipmentDto {
  @IsString()
  @MaxLength(120)
  carrier!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  service_level?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  tracking_number?: string;

  @IsOptional()
  @IsUrl()
  tracking_url?: string;

  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;
}

export class UpdateOrderShipmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  carrier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  service_level?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  tracking_number?: string;

  @IsOptional()
  @IsUrl()
  tracking_url?: string;

  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;
}

export class SyncOrderTrackingDto {
  @IsUUID()
  order_id!: string;
}
