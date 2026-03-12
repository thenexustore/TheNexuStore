import { API_URL } from "../constants";
import { fetchWithAuth } from "../utils";

export type RemoteBrandingSettings = {
  brandLogoUrl?: string;
  brandLogoDarkUrl?: string;
  brandLogoFit?: "contain" | "cover";
  brandLogoHeight?: number;
  brandLogoVersion?: number;
  brandLogoBrightness?: number;
  brandLogoSaturation?: number;
};

export async function fetchRemoteBrandingSettings(): Promise<RemoteBrandingSettings> {
  const response = await fetch(`${API_URL}/branding/settings`, { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Could not fetch branding settings");
  }
  return payload.data || {};
}

export async function saveRemoteBrandingSettings(settings: RemoteBrandingSettings): Promise<RemoteBrandingSettings> {
  return fetchWithAuth("/admin/branding/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

export async function uploadBrandingLogo(variant: "light" | "dark", dataUrl: string): Promise<string> {
  const data = await fetchWithAuth<{ url: string }>("/admin/branding/upload-logo", {
    method: "POST",
    body: JSON.stringify({ variant, dataUrl, apiBaseUrl: API_URL }),
  });

  return data.url;
}
