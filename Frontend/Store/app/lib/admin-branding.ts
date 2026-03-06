export const ADMIN_SETTINGS_KEY = "admin_settings";
export const ADMIN_SETTINGS_EVENT = "admin-settings-updated";
export const BRANDING_COOKIE_KEY = "tns_branding";

type BrandingSettings = {
  brandLogoMode?: "custom";
  brandLogoUrl?: string;
  brandLogoDarkUrl?: string;
  brandLogoFit?: "contain" | "cover";
  brandLogoHeight?: number;
  brandLogoVersion?: number;
  brandLogoBrightness?: number;
  brandLogoSaturation?: number;
};

export type StoreBranding = {
  srcCandidates: string[];
  darkSrcCandidates: string[];
  fit: "contain" | "cover";
  height: number;
  brightness: number;
  saturation: number;
};

function withVersion(src: string, version: number): string {
  if (!src || src.startsWith("data:")) return src;
  return `${src}${src.includes("?") ? "&" : "?"}v=${version}`;
}

function buildCandidates(raw: BrandingSettings, dark = false): string[] {
  const version = Number(raw.brandLogoVersion) || 1;
  const out: string[] = [];

  if (dark && raw.brandLogoDarkUrl) out.push(raw.brandLogoDarkUrl);
  if (raw.brandLogoUrl) out.push(raw.brandLogoUrl);
  out.push("/logo.png", "/favicon.ico");

  return Array.from(new Set(out.filter(Boolean))).map((src) => withVersion(src, version));
}

function decodeCookieBranding(documentCookie: string): BrandingSettings {
  const cookie = documentCookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${BRANDING_COOKIE_KEY}=`));

  if (!cookie) return {};

  try {
    const raw = decodeURIComponent(cookie.slice(`${BRANDING_COOKIE_KEY}=`.length));
    const decoded = decodeURIComponent(escape(atob(raw)));
    return JSON.parse(decoded) as BrandingSettings;
  } catch {
    return {};
  }
}

export function loadStoreBranding(): StoreBranding {
  if (typeof window === "undefined") {
    return {
      srcCandidates: ["/logo.png?v=1", "/favicon.ico?v=1"],
      darkSrcCandidates: ["/logo.png?v=1", "/favicon.ico?v=1"],
      fit: "contain",
      height: 32,
      brightness: 100,
      saturation: 100,
    };
  }

  let raw: BrandingSettings = {};
  try {
    raw = JSON.parse(localStorage.getItem(ADMIN_SETTINGS_KEY) || "{}") as BrandingSettings;
  } catch {
    raw = {};
  }

  const cookieRaw = decodeCookieBranding(document.cookie);
  const merged: BrandingSettings = {
    ...cookieRaw,
    ...raw,
  };

  return {
    srcCandidates: buildCandidates(merged, false),
    darkSrcCandidates: buildCandidates(merged, true),
    fit: merged.brandLogoFit === "cover" ? "cover" : "contain",
    height: Math.max(20, Math.min(64, Number(merged.brandLogoHeight) || 32)),
    brightness: Math.max(60, Math.min(140, Number(merged.brandLogoBrightness) || 100)),
    saturation: Math.max(60, Math.min(140, Number(merged.brandLogoSaturation) || 100)),
  };
}

export function subscribeStoreBranding(listener: (branding: StoreBranding) => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  const sync = () => listener(loadStoreBranding());
  window.addEventListener("storage", sync);
  window.addEventListener(ADMIN_SETTINGS_EVENT, sync);

  return () => {
    window.removeEventListener("storage", sync);
    window.removeEventListener(ADMIN_SETTINGS_EVENT, sync);
  };
}
