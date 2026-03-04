import { ArrayNotEmpty, IsArray, IsEnum, IsString } from 'class-validator';

export class BulkUpdateProductStatusDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids!: string[];

  @IsEnum(['DRAFT', 'ACTIVE', 'ARCHIVED'])
  status!: string;
}

export class BulkDeleteProductsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids!: string[];
}
