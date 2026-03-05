export type AdminLanguage = "es" | "en";
export type AdminLogoMode = "custom";
export type AdminLogoFit = "contain" | "cover";

export type AdminSettings = {
  supportEmail: string;
  adminLanguage: AdminLanguage;
  defaultCurrency: "EUR" | "USD";
  dateFormat: "es-ES" | "en-GB" | "en-US";
  brandLogoMode: AdminLogoMode;
  brandLogoUrl: string;
  brandLogoDarkUrl: string;
  brandLogoFit: AdminLogoFit;
  brandLogoHeight: number;
  brandLogoVersion: number;
  brandLogoBrightness: number;
  brandLogoSaturation: number;
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
export const BRANDING_COOKIE_KEY = "tns_branding";

export const defaultAdminSettings: AdminSettings = {
  supportEmail: "support@thenexustore.com",
  adminLanguage: "es",
  defaultCurrency: "EUR",
  dateFormat: "es-ES",
  brandLogoMode: "custom",
  brandLogoUrl: "",
  brandLogoDarkUrl: "",
  brandLogoFit: "contain",
  brandLogoHeight: 32,
  brandLogoVersion: 1,
  brandLogoBrightness: 100,
  brandLogoSaturation: 100,
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

function normalizeLogoUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function applyVersion(src: string, version: number): string {
  if (!src || src.startsWith("data:")) return src;
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}v=${version}`;
}


function getCookieDomain(hostname: string): string | null {
  if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null;
  }
  const parts = hostname.split(".");
  if (parts.length < 2) return null;
  return `.${parts.slice(-2).join(".")}`;
}

function toBrandingCookiePayload(settings: AdminSettings): string {
  const payload = {
    brandLogoMode: settings.brandLogoMode,
    brandLogoUrl: settings.brandLogoUrl,
    brandLogoDarkUrl: settings.brandLogoDarkUrl,
    brandLogoFit: settings.brandLogoFit,
    brandLogoHeight: settings.brandLogoHeight,
    brandLogoVersion: settings.brandLogoVersion,
    brandLogoBrightness: settings.brandLogoBrightness,
    brandLogoSaturation: settings.brandLogoSaturation,
  };
  return encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(payload)))));
}

function writeBrandingCookie(settings: AdminSettings): void {
  if (typeof document === "undefined") return;
  const domain = getCookieDomain(window.location.hostname);
  const maxAge = 60 * 60 * 24 * 365;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const domainPart = domain ? `; Domain=${domain}` : "";
  document.cookie = `${BRANDING_COOKIE_KEY}=${toBrandingCookiePayload(settings)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${domainPart}${secure}`;
}
function normalizeAdminSettings(input: Partial<AdminSettings>): AdminSettings {
  const language = input.adminLanguage === "en" ? "en" : "es";
  const logoMode: AdminLogoMode = "custom";

  return {
    supportEmail:
      typeof input.supportEmail === "string" && input.supportEmail.trim() ? input.supportEmail.trim() : defaultAdminSettings.supportEmail,
    adminLanguage: language,
    defaultCurrency: input.defaultCurrency === "USD" ? "USD" : "EUR",
    dateFormat:
      input.dateFormat === "en-GB" || input.dateFormat === "en-US" || input.dateFormat === "es-ES"
        ? input.dateFormat
        : defaultAdminSettings.dateFormat,
    brandLogoMode: logoMode,
    brandLogoUrl: normalizeLogoUrl(input.brandLogoUrl),
    brandLogoDarkUrl: normalizeLogoUrl(input.brandLogoDarkUrl),
    brandLogoFit: input.brandLogoFit === "cover" ? "cover" : "contain",
    brandLogoHeight: clampNumber(input.brandLogoHeight, defaultAdminSettings.brandLogoHeight, 20, 64),
    brandLogoVersion: clampNumber(input.brandLogoVersion, defaultAdminSettings.brandLogoVersion, 1, 999999),
    brandLogoBrightness: clampNumber(input.brandLogoBrightness, defaultAdminSettings.brandLogoBrightness, 60, 140),
    brandLogoSaturation: clampNumber(input.brandLogoSaturation, defaultAdminSettings.brandLogoSaturation, 60, 140),
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

export function resolveAdminLogoCandidates(settings: AdminSettings, variant: "light" | "dark" = "light"): string[] {
  const list: string[] = [];
  if (variant === "dark" && settings.brandLogoDarkUrl) list.push(settings.brandLogoDarkUrl);
  if (settings.brandLogoUrl) list.push(settings.brandLogoUrl);
  list.push("/logo.png", "/favicon.ico");

  const unique = Array.from(new Set(list.filter(Boolean)));
  return unique.map((src) => applyVersion(src, settings.brandLogoVersion));
}

export function resolveAdminLogoSrc(settings: AdminSettings): string {
  return resolveAdminLogoCandidates(settings)[0] || "/logo.png";
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
  writeBrandingCookie(normalized);
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
