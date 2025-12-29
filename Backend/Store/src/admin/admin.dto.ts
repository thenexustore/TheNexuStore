export class CreateProductDto {
  title!: string;
  brandId!: string;
  description_html?: string;
  short_description?: string;
  status?: string;
  categories?: string[];
  images_base64?: string[];
  sale_price!: number;
  compare_at_price?: number;
  qty_on_hand!: number;
}

export class UpdateProductDto {
  title?: string;
  brandId?: string;
  description_html?: string;
  short_description?: string;
  status?: string;
  categories?: string[];
  images_base64?: string[];
  sale_price?: number;
  compare_at_price?: number;
  qty_on_hand?: number;
}

export class UpdateProductStatusDto {
  status!: string;
}

export class CreateBrandDto {
  name!: string;
  logo_url?: string;
}

export class CreateCategoryDto {
  name!: string;
  parent_id?: string;
  sort_order?: number;
}