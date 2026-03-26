import type { MetadataRoute } from "next";
import { SITE_URL } from "./lib/env";

const PRIVATE_PATHS = [
  "/account",
  "/cart",
  "/checkout",
  "/chat",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/order",
] as const;

export default function robots(): MetadataRoute.Robots {
  const localePaths = ["es", "en"].flatMap((locale) =>
    PRIVATE_PATHS.map((path) => `/${locale}${path}`),
  );

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...PRIVATE_PATHS, ...localePaths],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
