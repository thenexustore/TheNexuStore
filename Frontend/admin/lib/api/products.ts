import { fetchWithAuth } from "../utils";

export interface ProductAttribute {
  key: string;
  value: string;
}

export interface ProductVariant {
  id: string;
  sku_code: string;
  attributes: ProductAttribute[];
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
}

export interface ProductImage {
  url: string;
  alt_text: string | null;
}

export interface Product {
  id: string;
  title: string;

  brand: {
    id: string;
    name: string;
  } | null;

  category: {
    id: string;
    name: string;
  } | null;

  categories: Array<{
    id: string;
    name: string;
  }>;

  sku_code: string;
  price: number;
  discount_price: number | null;
  stock_quantity: number;
  stock_status: string;
  product_description: string;
  short_description?: string;
  product_images: ProductImage[];
  attributes: ProductAttribute[];
  variants: ProductVariant[];
  product_status: string;
  featured_product: boolean;
  created_at: string;
  skusCount?: number;
  stock?: number;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  totalPages: number;
}

export async function fetchProducts(
  page: number = 1,
  limit: number = 20,
  search?: string,
  status?: string,
  category?: string
): Promise<ProductsResponse> {
  const params: Record<string, string> = {
    page: page.toString(),
    limit: limit.toString(),
  };

  if (search) params.search = search;
  if (status && status !== "all") params.status = status;
  if (category) params.category = category;

  const queryString = `?${new URLSearchParams(params).toString()}`;
  return fetchWithAuth(`/admin/products${queryString}`);
}

export async function fetchProductById(id: string): Promise<Product> {
  return fetchWithAuth(`/admin/products/${id}`);
}

export interface CreateProductData {
  title: string;
  brandId: string;
  category?: string;
  categories?: string[];
  sku_code: string;
  sale_price: number;
  compare_at_price?: number;
  qty_on_hand: number;
  stock_status?: string;
  description_html?: string;
  short_description?: string;
  images_base64?: string[];
  attributes?: Array<{ key: string; value: string }>;
  variants?: Array<{
    sku_code: string;
    variant_name?: string;
    attributes: Array<{ key: string; value: string }>;
    sale_price: number;
    compare_at_price?: number;
    qty_on_hand: number;
    images?: string[];
  }>;
  status?: string;
  featured?: boolean;
}

export async function createProduct(data: CreateProductData): Promise<Product> {
  const response = await fetchWithAuth(`/admin/products`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return response;
}

export type UpdateProductData = Partial<CreateProductData>;

export async function updateProduct(
  id: string,
  data: UpdateProductData
): Promise<Product> {
  const response = await fetchWithAuth(`/admin/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return response;
}

export async function deleteProduct(id: string): Promise<void> {
  await fetchWithAuth(`/admin/products/${id}`, {
    method: "DELETE",
  });
}

export async function updateProductStatus(
  id: string,
  status: string
): Promise<Product> {
  const response = await fetchWithAuth(`/admin/products/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
  return response;
}

export async function toggleFeatured(id: string): Promise<Product> {
  const response = await fetchWithAuth(
    `/admin/products/${id}/toggle-featured`,
    {
      method: "PATCH",
    }
  );
  return response;
}
