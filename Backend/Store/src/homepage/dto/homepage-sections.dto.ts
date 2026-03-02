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
import { Type } from 'class-transformer';
import { HomepageSectionType } from '../homepage-section.types';

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
  config_json!: Record<string, any>;
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
  config_json?: Record<string, any>;
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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
