import { IsEnum } from 'class-validator';

export class UpdateProductStatusDto {
  @IsEnum(['DRAFT', 'ACTIVE', 'ARCHIVED'])
  status!: string;
}
