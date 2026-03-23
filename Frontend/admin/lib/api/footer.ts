import { API_URL } from "../constants";
import { fetchWithAuth } from "../utils";

export type FooterLegalLink = {
  label: string;
  url: string;
};

export type FooterPaymentMethod = {
  label: string;
  iconUrl: string;
};

export type FooterSocialLink = {
  platform: string;
  label: string;
  url: string;
};

export type FooterTrustItem = {
  icon: string;
  text: string;
};

export type FooterSettings = {
  logoUrl: string;
  logoAlt: string;
  newsletterEnabled: boolean;
  newsletterTitle: string;
  newsletterText: string;
  newsletterPlaceholder: string;
  newsletterButtonText: string;
  contactEmail: string;
  contactPhone: string;
  contactWhatsapp: string;
  contactAddress: string;
  contactHours: string;
  contactMapsUrl: string;
  legalLinks: FooterLegalLink[];
  paymentsEnabled: boolean;
  paymentMethods: FooterPaymentMethod[];
  socialEnabled: boolean;
  socialLinks: FooterSocialLink[];
  trustEnabled: boolean;
  trustItems: FooterTrustItem[];
  copyrightText: string;
};

export async function fetchFooterSettings(): Promise<FooterSettings> {
  const response = await fetch(`${API_URL}/footer/settings`, {
    cache: "no-store",
  });
  const payload = await response.json();
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Could not fetch footer settings");
  }
  return payload.data as FooterSettings;
}

export async function saveFooterSettings(
  settings: FooterSettings
): Promise<FooterSettings> {
  return fetchWithAuth<FooterSettings>("/admin/footer/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

export async function resetFooterSettings(): Promise<FooterSettings> {
  return fetchWithAuth<FooterSettings>("/admin/footer/settings", {
    method: "DELETE",
  });
}
