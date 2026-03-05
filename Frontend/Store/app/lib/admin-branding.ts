export const ADMIN_SETTINGS_KEY = "admin_settings";
export const ADMIN_SETTINGS_EVENT = "admin-settings-updated";

type BrandingSettings = {
  brandLogoMode?: "default" | "favicon" | "custom";
  brandLogoUrl?: string;
  brandLogoDarkUrl?: string;
  brandLogoFit?: "contain" | "cover";
  brandLogoHeight?: number;
  brandLogoVersion?: number;
};

export type StoreBranding = {
  srcCandidates: string[];
  darkSrcCandidates: string[];
  fit: "contain" | "cover";
  height: number;
};

function withVersion(src: string, version: number): string {
  if (!src || src.startsWith("data:")) return src;
  return `${src}${src.includes("?") ? "&" : "?"}v=${version}`;
}

function buildCandidates(raw: BrandingSettings, dark = false): string[] {
  const version = Number(raw.brandLogoVersion) || 1;
  const out: string[] = [];

  if (raw.brandLogoMode === "custom") {
    if (dark && raw.brandLogoDarkUrl) out.push(raw.brandLogoDarkUrl);
    if (raw.brandLogoUrl) out.push(raw.brandLogoUrl);
  }

  if (raw.brandLogoMode === "favicon") out.push("/favicon.ico");
  out.push("/logo.png", "/favicon.ico");

  return Array.from(new Set(out.filter(Boolean))).map((src) => withVersion(src, version));
}

export function loadStoreBranding(): StoreBranding {
  if (typeof window === "undefined") {
    return {
      srcCandidates: ["/logo.png", "/favicon.ico"],
      darkSrcCandidates: ["/logo.png", "/favicon.ico"],
      fit: "contain",
      height: 32,
    };
  }

  let raw: BrandingSettings = {};
  try {
    raw = JSON.parse(localStorage.getItem(ADMIN_SETTINGS_KEY) || "{}") as BrandingSettings;
  } catch {
    raw = {};
  }

  return {
    srcCandidates: buildCandidates(raw, false),
    darkSrcCandidates: buildCandidates(raw, true),
    fit: raw.brandLogoFit === "cover" ? "cover" : "contain",
    height: Math.max(20, Math.min(64, Number(raw.brandLogoHeight) || 32)),
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
