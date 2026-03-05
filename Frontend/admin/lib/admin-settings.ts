export type AdminLanguage = "es" | "en";

export type AdminSettings = {
  brandName: string;
  supportEmail: string;
  adminLanguage: AdminLanguage;
  defaultCurrency: "EUR" | "USD";
  dateFormat: "es-ES" | "en-GB" | "en-US";
  ordersRefreshSeconds: number;
  ordersPageSize: number;
  productsPageSize: number;
  compactSidebar: boolean;
  lowStockThreshold: number;
  emailNotifications: boolean;
  chatSoundEnabled: boolean;
  showAdvancedMetrics: boolean;
};

export const ADMIN_SETTINGS_KEY = "admin_settings";
export const ADMIN_SETTINGS_EVENT = "admin-settings-updated";

export const defaultAdminSettings: AdminSettings = {
  brandName: "The Nexu Store",
  supportEmail: "support@thenexustore.com",
  adminLanguage: "es",
  defaultCurrency: "EUR",
  dateFormat: "es-ES",
  ordersRefreshSeconds: 30,
  ordersPageSize: 10,
  productsPageSize: 25,
  compactSidebar: false,
  lowStockThreshold: 5,
  emailNotifications: true,
  chatSoundEnabled: true,
  showAdvancedMetrics: true,
};

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function normalizeAdminSettings(input: Partial<AdminSettings>): AdminSettings {
  const language = input.adminLanguage === "en" ? "en" : "es";

  return {
    brandName: typeof input.brandName === "string" && input.brandName.trim() ? input.brandName.trim() : defaultAdminSettings.brandName,
    supportEmail:
      typeof input.supportEmail === "string" && input.supportEmail.trim() ? input.supportEmail.trim() : defaultAdminSettings.supportEmail,
    adminLanguage: language,
    defaultCurrency: input.defaultCurrency === "USD" ? "USD" : "EUR",
    dateFormat:
      input.dateFormat === "en-GB" || input.dateFormat === "en-US" || input.dateFormat === "es-ES"
        ? input.dateFormat
        : defaultAdminSettings.dateFormat,
    ordersRefreshSeconds: clampNumber(input.ordersRefreshSeconds, defaultAdminSettings.ordersRefreshSeconds, 10, 300),
    ordersPageSize: clampNumber(input.ordersPageSize, defaultAdminSettings.ordersPageSize, 5, 100),
    productsPageSize: clampNumber(input.productsPageSize, defaultAdminSettings.productsPageSize, 10, 200),
    compactSidebar: Boolean(input.compactSidebar),
    lowStockThreshold: clampNumber(input.lowStockThreshold, defaultAdminSettings.lowStockThreshold, 0, 500),
    emailNotifications: Boolean(input.emailNotifications),
    chatSoundEnabled: Boolean(input.chatSoundEnabled),
    showAdvancedMetrics: Boolean(input.showAdvancedMetrics),
  };
}

export function parseAdminSettings(value: string | null): AdminSettings {
  if (!value) {
    return defaultAdminSettings;
  }

  try {
    const parsed = JSON.parse(value) as Partial<AdminSettings>;
    return normalizeAdminSettings({ ...defaultAdminSettings, ...parsed });
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

  const normalized = normalizeAdminSettings(settings);
  localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(ADMIN_SETTINGS_EVENT, { detail: normalized }));
}

export function subscribeAdminSettings(listener: (settings: AdminSettings) => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const sync = () => listener(loadAdminSettings());

  window.addEventListener("storage", sync);
  window.addEventListener(ADMIN_SETTINGS_EVENT, sync);

  return () => {
    window.removeEventListener("storage", sync);
    window.removeEventListener(ADMIN_SETTINGS_EVENT, sync);
  };
}
