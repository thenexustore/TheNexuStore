import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ImportHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsString()
  type?: string;
}

export class TriggerImportDto {
  @IsIn(['full', 'stock', 'images'])
  mode!: 'full' | 'stock' | 'images';
}

export class RetryImportDto extends TriggerImportDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  reason!: string;
}
