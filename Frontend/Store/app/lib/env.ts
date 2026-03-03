const requireEnv = (name: "NEXT_PUBLIC_API_URL" | "NEXT_PUBLIC_SITE_URL"): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const API_URL = requireEnv("NEXT_PUBLIC_API_URL");
export const SITE_URL = requireEnv("NEXT_PUBLIC_SITE_URL");
