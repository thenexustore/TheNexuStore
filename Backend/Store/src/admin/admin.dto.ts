import {
  IsString,
  IsOptional,
  IsUrl,
  IsNumber,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

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
