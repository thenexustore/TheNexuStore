// Frontend/admin/app/lib/api/banners.ts
import { API_URL } from "../constants";

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
  const response = await fetch(`${API_URL}/admin/banners`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
    },
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch banners");
  }

  return data.data;
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
  const response = await fetch(`${API_URL}/admin/banners/${id}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
    },
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch banner");
  }

  return data.data;
}

export async function createBanner(
  bannerData: CreateBannerData
): Promise<Banner> {
  const response = await fetch(`${API_URL}/admin/banners`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
    },
    body: JSON.stringify(bannerData),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to create banner");
  }

  return data.data;
}

export async function updateBanner(
  id: string,
  bannerData: Partial<CreateBannerData>
): Promise<Banner> {
  const response = await fetch(`${API_URL}/admin/banners/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
    },
    body: JSON.stringify(bannerData),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to update banner");
  }

  return data.data;
}

export async function deleteBanner(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/admin/banners/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
    },
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to delete banner");
  }
}

export async function toggleBannerStatus(id: string): Promise<Banner> {
  const response = await fetch(`${API_URL}/admin/banners/${id}/toggle-status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
    },
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to toggle banner status");
  }

  return data.data;
}

export async function reorderBanners(ids: string[]): Promise<void> {
  const response = await fetch(`${API_URL}/admin/banners/reorder`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
    },
    body: JSON.stringify({ ids }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to reorder banners");
  }
}
