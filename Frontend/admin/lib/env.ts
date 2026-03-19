const isDevelopment = process.env.NODE_ENV !== "production";

const RAW_PUBLIC_ENV = {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
} as const;

const DEFAULT_PUBLIC_ENV = {
  NEXT_PUBLIC_API_URL: isDevelopment
    ? "http://localhost:4000"
    : "https://api.thenexustore.com",
  NEXT_PUBLIC_SITE_URL: isDevelopment
    ? "http://localhost:3000"
    : "https://www.thenexustore.com",
} as const;

type PublicEnvName = keyof typeof DEFAULT_PUBLIC_ENV;

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);

const isValidAbsoluteUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const isPrivateIpv4Host = (hostname: string): boolean => {
  const segments = hostname.split(".");
  if (segments.length !== 4) {
    return false;
  }

  const octets = segments.map((segment) => Number(segment));
  if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  const [first, second] = octets;
  if (first === 10 || first === 127) {
    return true;
  }

  if (first === 192 && second === 168) {
    return true;
  }

  if (first === 172 && second >= 16 && second <= 31) {
    return true;
  }

  return first === 169 && second === 254;
};

const isLocalDevelopmentHost = (hostname: string): boolean => {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return (
    LOOPBACK_HOSTS.has(normalized) ||
    normalized.endsWith(".local") ||
    isPrivateIpv4Host(normalized)
  );
};

const normalizeAbsoluteUrl = (value: string): string => value.replace(/\/+$/, "");

const adaptLocalUrlToBrowserHost = (value: string): string => {
  if (!isDevelopment || typeof window === "undefined" || !isValidAbsoluteUrl(value)) {
    return normalizeAbsoluteUrl(value);
  }

  const currentHost = window.location.hostname.trim().toLowerCase();
  if (!isLocalDevelopmentHost(currentHost) || LOOPBACK_HOSTS.has(currentHost)) {
    return normalizeAbsoluteUrl(value);
  }

  const parsed = new URL(value);
  if (!LOOPBACK_HOSTS.has(parsed.hostname.toLowerCase())) {
    return normalizeAbsoluteUrl(value);
  }

  parsed.hostname = window.location.hostname;
  return normalizeAbsoluteUrl(parsed.toString());
};

const readPublicEnv = (name: PublicEnvName): string => {
  const rawValue = RAW_PUBLIC_ENV[name];
  const fallbackValue = adaptLocalUrlToBrowserHost(DEFAULT_PUBLIC_ENV[name]);

  if (!rawValue) {
    if (typeof window !== "undefined") {
      console.warn(
        `[env] Missing ${name}. Falling back to ${fallbackValue}. ` +
          "Set this variable in .env.production before running next build.",
      );
    }

    return fallbackValue;
  }

  if (isValidAbsoluteUrl(rawValue)) {
    return adaptLocalUrlToBrowserHost(rawValue);
  }

  if (!isDevelopment) {
    throw new Error(
      `[env] Invalid value for ${name}: \"${rawValue}\". Expected an absolute http(s) URL.`,
    );
  }

  console.warn(
    `[env] Invalid value for ${name}: \"${rawValue}\". Falling back to ${fallbackValue}.`,
  );
  return fallbackValue;
};

export const API_URL = readPublicEnv("NEXT_PUBLIC_API_URL");
export const SITE_URL = readPublicEnv("NEXT_PUBLIC_SITE_URL");
