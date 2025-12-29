import { fetchWithAuth } from "../utils";

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string;
  sort_order: number;
  is_active: boolean;
}

export async function fetchCategories(): Promise<Category[]> {
  return fetchWithAuth("/admin/categories");
}

export async function createCategory(data: {
  name: string;
  parent_id?: string;
  sort_order?: number;
}): Promise<Category> {
  const response = await fetchWithAuth("/admin/categories", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return response;
}