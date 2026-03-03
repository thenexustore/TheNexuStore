import { API_URL } from "./env";

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
}

export async function getActiveBanners(): Promise<Banner[]> {
  const response = await fetch(`${API_URL}/admin/banners/active`);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch banners: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  return data.data || [];
}

export function transformBannerToCarouselConfig(banner: Banner) {
  return banner;
}
