const isDevelopment = process.env.NODE_ENV !== "production";

const DEFAULT_PUBLIC_ENV = {
  NEXT_PUBLIC_API_URL: isDevelopment
    ? "http://localhost:4000"
    : "https://api.thenexustore.com",
  NEXT_PUBLIC_SITE_URL: isDevelopment
    ? "http://localhost:3000"
    : "https://www.thenexustore.com",
} as const;

type PublicEnvName = keyof typeof DEFAULT_PUBLIC_ENV;

const isValidAbsoluteUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const readPublicEnv = (name: PublicEnvName): string => {
  const rawValue = process.env[name];
  const fallbackValue = DEFAULT_PUBLIC_ENV[name];

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
    return rawValue;
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
