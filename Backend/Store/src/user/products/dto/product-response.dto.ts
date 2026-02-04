export class ProductImageDto {
  url!: string;
  alt_text?: string;
  type!: string;
  sort_order!: number;
}

export class ProductVariantDto {
  id!: string;
  sku_code!: string;
  variant_name?: string;
  attributes!: Array<{
    key: string;
    value: string;
  }>;
  price!: number;
  compare_at_price?: number;
  stock_quantity!: number;
  stock_status!: string;
  images!: ProductImageDto[];
}

export class ProductAttributeDto {
  key!: string;
  name!: string;
  data_type!: string;
  values!: string[];
}

export class CategoryDto {
  id!: string;
  name!: string;
  slug!: string;
}

export class BrandDto {
  id!: string;
  name!: string;
  slug!: string;
  logo_url?: string;
}

export class ProductReviewDto {
  id!: string;
  customer_name!: string;
  rating!: number;
  title?: string;
  comment?: string;
  created_at!: Date;
}

export class ProductResponseDto {
  id!: string;
  title!: string;
  slug!: string;
  brand!: BrandDto;
  categories!: CategoryDto[];
  main_category?: CategoryDto;
  sku_code!: string;
  sku_id!: string;
  price!: number;
  compare_at_price?: number;
  discount_percentage?: number;
  stock_quantity!: number;
  stock_status!: string;
  description_html?: string;
  short_description?: string;
  images!: ProductImageDto[];
  attributes!: ProductAttributeDto[];
  variants!: ProductVariantDto[];
  rating_avg?: number;
  rating_count!: number;
  is_featured!: boolean;
  created_at!: Date;
  updated_at!: Date;
  reviews?: ProductReviewDto[];
}

export class ProductListItemDto {
  id!: string;
  title!: string;
  slug!: string;
  brand_name!: string;
  brand_slug!: string;
  category_name!: string;
  category_slug!: string;
  sku_code!: string;
  sku_id!: string;
  price!: number;
  compare_at_price?: number;
  discount_percentage?: number;
  stock_quantity!: number;
  stock_status!: string;
  short_description?: string;
  thumbnail!: string;
  rating_avg?: number;
  rating_count!: number;
  is_featured!: boolean;
}

export class ProductsListResponseDto {
  products!: ProductListItemDto[];
  total!: number;
  page!: number;
  limit!: number;
  total_pages!: number;
  filters?: {
    categories: Array<{
      id: string;
      name: string;
      slug: string;
      count: number;
    }>;
    brands: Array<{ id: string; name: string; slug: string; count: number }>;
    price_range: { min: number; max: number };
    attributes: Array<{
      key: string;
      name: string;
      values: Array<{ value: string; count: number }>;
    }>;
  };
}
