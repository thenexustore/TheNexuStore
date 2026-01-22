import { IsArray, ValidateNested, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class FeaturedProductOrderDto {
  @IsString()
  id!: string;

  @IsNumber()
  sort_order!: number;
}

export class UpdateFeaturedProductOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeaturedProductOrderDto)
  items!: FeaturedProductOrderDto[];
}
