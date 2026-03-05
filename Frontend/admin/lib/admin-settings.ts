export type AdminSettings = {
  brandName: string;
  supportEmail: string;
  defaultCurrency: "EUR" | "USD";
  dateFormat: "es-ES" | "en-GB" | "en-US";
  ordersRefreshSeconds: number;
  productsPageSize: number;
  compactSidebar: boolean;
  lowStockThreshold: number;
  emailNotifications: boolean;
  chatSoundEnabled: boolean;
  showAdvancedMetrics: boolean;
};

export const ADMIN_SETTINGS_KEY = "admin_settings";

export const defaultAdminSettings: AdminSettings = {
  brandName: "The Nexu Store",
  supportEmail: "support@thenexustore.com",
  defaultCurrency: "EUR",
  dateFormat: "es-ES",
  ordersRefreshSeconds: 30,
  productsPageSize: 25,
  compactSidebar: false,
  lowStockThreshold: 5,
  emailNotifications: true,
  chatSoundEnabled: true,
  showAdvancedMetrics: true,
};

export function parseAdminSettings(value: string | null): AdminSettings {
  if (!value) {
    return defaultAdminSettings;
  }

  try {
    const parsed = JSON.parse(value) as Partial<AdminSettings>;

    return {
      ...defaultAdminSettings,
      ...parsed,
    };
  } catch {
    return defaultAdminSettings;
  }
}

export function loadAdminSettings(): AdminSettings {
  if (typeof window === "undefined") {
    return defaultAdminSettings;
  }

  return parseAdminSettings(localStorage.getItem(ADMIN_SETTINGS_KEY));
}

export function saveAdminSettings(settings: AdminSettings): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(settings));
}
