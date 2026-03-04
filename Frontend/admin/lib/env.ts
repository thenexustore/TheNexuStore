const DEFAULT_PUBLIC_ENV = {
  NEXT_PUBLIC_API_URL: "https://api.thenexustore.com",
  NEXT_PUBLIC_SITE_URL: "https://www.thenexustore.com",
} as const;

type PublicEnvName = keyof typeof DEFAULT_PUBLIC_ENV;

const readPublicEnv = (name: PublicEnvName): string => {
  const value = process.env[name];
  if (value) {
    return value;
  }

  const fallbackValue = DEFAULT_PUBLIC_ENV[name];
  if (typeof window !== "undefined") {
    console.warn(
      `[env] Missing ${name}. Falling back to ${fallbackValue}. ` +
        "Set this variable in .env.production before running next build.",
    );
  }

  return fallbackValue;
};

export const API_URL = readPublicEnv("NEXT_PUBLIC_API_URL");
export const SITE_URL = readPublicEnv("NEXT_PUBLIC_SITE_URL");
