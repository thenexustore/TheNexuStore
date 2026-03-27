import type { MetadataRoute } from "next";
import { fetchAllProductsForSitemap, fetchProductsServer } from "./lib/storefront-server";
import {
  absoluteUrl,
  buildLocalizedPath,
  buildRouteWithQuery,
  buildSitemapLanguageAlternates,
  type StoreLocale,
} from "./lib/seo";

export const revalidate = 900;

function createSitemapEntry({
  locale,
  routePath,
  query,
  lastModified = new Date(),
  changeFrequency,
  priority,
}: {
  locale: StoreLocale;
  routePath: string;
  query?: string;
  lastModified?: Date;
  changeFrequency: "daily" | "weekly";
  priority: number;
}): MetadataRoute.Sitemap[number] {
  const localizedRoute = buildLocalizedPath(locale, buildRouteWithQuery(routePath, query));

  return {
    url: absoluteUrl(localizedRoute),
    lastModified,
    changeFrequency,
    priority,
    alternates: {
      languages: buildSitemapLanguageAlternates(routePath, query),
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    createSitemapEntry({
      locale: "es",
      routePath: "/store",
      changeFrequency: "daily",
      priority: 1,
    }),
    createSitemapEntry({
      locale: "en",
      routePath: "/store",
      changeFrequency: "daily",
      priority: 0.9,
    }),
    createSitemapEntry({
      locale: "es",
      routePath: "/products",
      changeFrequency: "daily",
      priority: 0.85,
    }),
    createSitemapEntry({
      locale: "en",
      routePath: "/products",
      changeFrequency: "daily",
      priority: 0.8,
    }),
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
      createSitemapEntry({
        locale: "es",
        routePath: `/products/${product.slug}`,
        changeFrequency: "weekly",
        priority: 0.7,
      }),
      createSitemapEntry({
        locale: "en",
        routePath: `/products/${product.slug}`,
        changeFrequency: "weekly",
        priority: 0.65,
      }),
    ]);
    const categoryEntries =
      catalogIndex?.filters?.categories.flatMap((category) => [
        createSitemapEntry({
          locale: "es",
          routePath: "/products",
          query: new URLSearchParams({ category: category.slug }).toString(),
          changeFrequency: "weekly",
          priority: 0.72,
        }),
        createSitemapEntry({
          locale: "en",
          routePath: "/products",
          query: new URLSearchParams({ category: category.slug }).toString(),
          changeFrequency: "weekly",
          priority: 0.67,
        }),
      ]) ?? [];
    const brandEntries =
      catalogIndex?.filters?.brands.flatMap((brand) => [
        createSitemapEntry({
          locale: "es",
          routePath: "/products",
          query: new URLSearchParams({ brand: brand.slug }).toString(),
          changeFrequency: "weekly",
          priority: 0.66,
        }),
        createSitemapEntry({
          locale: "en",
          routePath: "/products",
          query: new URLSearchParams({ brand: brand.slug }).toString(),
          changeFrequency: "weekly",
          priority: 0.61,
        }),
      ]) ?? [];

    return [...staticEntries, ...categoryEntries, ...brandEntries, ...productEntries];
  } catch {
    return staticEntries;
  }
}
