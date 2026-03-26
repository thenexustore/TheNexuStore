import type { MetadataRoute } from "next";
import { fetchAllProductsForSitemap, fetchProductsServer } from "./lib/storefront-server";
import { absoluteUrl, buildLocalizedPath } from "./lib/seo";

export const revalidate = 900;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl(buildLocalizedPath("es", "/store")),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl(buildLocalizedPath("en", "/store")),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl(buildLocalizedPath("es", "/products")),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: absoluteUrl(buildLocalizedPath("en", "/products")),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  try {
    const [products, catalogIndex] = await Promise.all([
      fetchAllProductsForSitemap(),
      fetchProductsServer(
        {
          page: 1,
          limit: 1,
          in_stock_only: true,
        },
        {
          next: { revalidate },
        },
      ).catch(() => null),
    ]);
    const productEntries = products.flatMap((product) => [
      {
        url: absoluteUrl(buildLocalizedPath("es", `/products/${product.slug}`)),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      },
      {
        url: absoluteUrl(buildLocalizedPath("en", `/products/${product.slug}`)),
        changeFrequency: "weekly" as const,
        priority: 0.65,
      },
    ]);
    const categoryEntries =
      catalogIndex?.filters?.categories.flatMap((category) => [
        {
          url: absoluteUrl(buildLocalizedPath("es", `/products?category=${category.slug}`)),
          changeFrequency: "weekly" as const,
          priority: 0.72,
        },
        {
          url: absoluteUrl(buildLocalizedPath("en", `/products?category=${category.slug}`)),
          changeFrequency: "weekly" as const,
          priority: 0.67,
        },
      ]) ?? [];
    const brandEntries =
      catalogIndex?.filters?.brands.flatMap((brand) => [
        {
          url: absoluteUrl(buildLocalizedPath("es", `/products?brand=${brand.slug}`)),
          changeFrequency: "weekly" as const,
          priority: 0.66,
        },
        {
          url: absoluteUrl(buildLocalizedPath("en", `/products?brand=${brand.slug}`)),
          changeFrequency: "weekly" as const,
          priority: 0.61,
        },
      ]) ?? [];

    return [...staticEntries, ...categoryEntries, ...brandEntries, ...productEntries];
  } catch {
    return staticEntries;
  }
}
