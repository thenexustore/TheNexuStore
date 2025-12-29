import {
  IsString,
  IsOptional,
  IsUrl,
  IsNumber,
} from 'class-validator';

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
