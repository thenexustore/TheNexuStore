export class CreateBrandDto {
  name!: string;
  logo_url?: string;
}

export class CreateCategoryDto {
  name!: string;
  parent_id?: string;
  sort_order?: number;
}