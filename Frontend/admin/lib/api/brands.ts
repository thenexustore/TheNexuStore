import { fetchWithAuth } from "../utils";

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  is_active: boolean;
}

export async function fetchBrands(): Promise<Brand[]> {
  return fetchWithAuth("/admin/brands");
}

export async function createBrand(data: { name: string; logo_url?: string }): Promise<Brand> {
  const response = await fetchWithAuth("/admin/brands", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return response;
}