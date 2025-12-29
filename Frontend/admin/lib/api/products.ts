import { fetchWithAuth } from "../utils";

export interface Product {
  id: string;
  title: string;
  brand: string;
  categories: string[];
  skusCount: number;
  status: string;
  createdAt: string;
  price: number;
  stock: number;
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
  status?: string
): Promise<ProductsResponse> {
  const params: Record<string, string> = {
    page: page.toString(),
    limit: limit.toString(),
  };

  if (search) params.search = search;
  if (status && status !== "all") params.status = status;

  const queryString = `?${new URLSearchParams(params).toString()}`;
  return fetchWithAuth(`/admin/products${queryString}`);
}

export async function fetchProductById(id: string): Promise<Product> {
  return fetchWithAuth(`/admin/products/${id}`);
}

export async function createProduct(data: any): Promise<Product> {
  const response = await fetchWithAuth(`/admin/products`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return response;
}

export async function updateProduct(id: string, data: any): Promise<Product> {
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

export async function updateProductStatus(id: string, status: string): Promise<Product> {
  const response = await fetchWithAuth(`/admin/products/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
  return response;
}