// Frontend/admin/app/lib/api/banners.ts
import { API_URL } from "../constants";
import { fetchWithAuth } from "../utils";

export interface Banner {
  id: string;
  image: string;
  overlay: string;
  align: "left" | "right" | "center";
  title_text: string;
  title_color: string;
  title_size: string;
  title_weight: string;
  title_font: string;
  subtitle_text: string;
  subtitle_color: string;
  subtitle_size: string;
  button_text: string;
  button_link: string;
  button_bg: string;
  button_color: string;
  button_radius: string;
  button_padding: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBannerData {
  image: string;
  overlay: string;
  align: "left" | "right" | "center";
  title_text: string;
  title_color: string;
  title_size: string;
  title_weight: string;
  title_font: string;
  subtitle_text: string;
  subtitle_color: string;
  subtitle_size: string;
  button_text: string;
  button_link: string;
  button_bg: string;
  button_color: string;
  button_radius: string;
  button_padding: string;
  is_active?: boolean;
}

export async function getBanners(): Promise<Banner[]> {
  return fetchWithAuth<Banner[]>("/admin/banners");
}

export async function getActiveBanners(): Promise<Banner[]> {
  const response = await fetch(`${API_URL}/admin/banners/active`);

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch active banners");
  }

  return data.data;
}

export async function getBanner(id: string): Promise<Banner> {
  return fetchWithAuth<Banner>(`/admin/banners/${id}`);
}

export async function createBanner(
  bannerData: CreateBannerData
): Promise<Banner> {
  return fetchWithAuth<Banner>("/admin/banners", {
    method: "POST",
    body: JSON.stringify(bannerData),
  });
}

export async function updateBanner(
  id: string,
  bannerData: Partial<CreateBannerData>
): Promise<Banner> {
  return fetchWithAuth<Banner>(`/admin/banners/${id}`, {
    method: "PATCH",
    body: JSON.stringify(bannerData),
  });
}

export async function deleteBanner(id: string): Promise<void> {
  await fetchWithAuth<void>(`/admin/banners/${id}`, { method: "DELETE" });
}

export async function toggleBannerStatus(id: string): Promise<Banner> {
  return fetchWithAuth<Banner>(`/admin/banners/${id}/toggle-status`, {
    method: "PATCH",
  });
}

export async function reorderBanners(ids: string[]): Promise<void> {
  await fetchWithAuth<void>("/admin/banners/reorder", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}
