import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

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
}
