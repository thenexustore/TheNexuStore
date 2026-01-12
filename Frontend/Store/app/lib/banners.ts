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
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  console.log("Fetching banners from:", `${API_URL}/admin/banners/active`);

  try {
    const response = await fetch(`${API_URL}/admin/banners/active`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("Response status:", response.status);
    console.log(
      "Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      // Get error text for debugging
      const errorText = await response.text();
      console.error("Error response:", errorText);
      throw new Error(
        `Failed to fetch banners: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("Response data:", data);

    return data.data || [];
  } catch (error) {
    console.error("Fetch error details:", error);
    throw error;
  }
}

export function transformBannerToCarouselConfig(banner: Banner) {
  return {
    id: banner.id,
    image: banner.image,
    overlay: banner.overlay,
    content: {
      align: banner.align,
      padding: "64px",
      gap: "12px",
      title: {
        text: banner.title_text,
        color: banner.title_color,
        size: banner.title_size,
        weight: banner.title_weight,
        family: banner.title_font,
        letterSpacing: "1px",
        lineHeight: "1.1",
        transform: "uppercase",
        shadow: "0 6px 20px rgba(0,0,0,.4)",
      },
      subtitle: {
        text: banner.subtitle_text,
        color: banner.subtitle_color,
        size: banner.subtitle_size,
        family: "Inter, sans-serif",
        letterSpacing: "0.5px",
        lineHeight: "1.4",
        opacity: 0.9,
      },
      button: {
        show: !!banner.button_text,
        text: banner.button_text,
        link: banner.button_link,
        bg: banner.button_bg,
        hoverBg: banner.button_bg.replace(")", ", 0.9)").replace("rgb", "rgba"),
        color: banner.button_color,
        radius: banner.button_radius,
        padding: banner.button_padding,
        fontSize: "16px",
        fontWeight: "600",
        fontFamily: "Inter, sans-serif",
        letterSpacing: "0.5px",
        shadow: "0 10px 25px rgba(0,0,0,.4)",
        border: "none",
      },
    },
  };
}
