import { PartialType } from '@nestjs/mapped-types';
import { CreateFeaturedProductDto } from './create-featured-product.dto';

export class UpdateFeaturedProductDto extends PartialType(
  CreateFeaturedProductDto,
) {}
