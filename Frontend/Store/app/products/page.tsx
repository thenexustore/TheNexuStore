import { Suspense } from "react";
import type { Metadata } from "next";
import ProductsClient from "./ProductsClient";
import { buildFiltersFromSearchParams } from "../lib/product-listing";
import { fetchFooterSettingsServer, fetchProductsServer } from "../lib/storefront-server";
import {
  buildPageMetadata,
  buildProductsSeoState,
  createCollectionBreadcrumbSchema,
  createCollectionPageSchema,
  createOrganizationSchema,
  createWebsiteSchema,
  resolveStoreLocale,
  serializeJsonLd,
  type StoreLocale,
} from "../lib/seo";

export const revalidate = 300;

type ProductsPageParams = Promise<{
  locale?: string;
}>;

type ProductsSearchParams = Promise<Record<string, string | string[] | undefined>>;

async function getProductsPageContext({
  params,
  searchParams,
}: {
  params?: ProductsPageParams;
  searchParams?: ProductsSearchParams;
}) {
  const routeParams = (await params) || {};
  const queryParams = (await searchParams) || {};
  const locale = resolveStoreLocale(routeParams.locale);
  const indexable = Boolean(routeParams.locale);
  const filters = buildFiltersFromSearchParams(queryParams);
  const [productsResponse, footerSettings] = await Promise.all([
    fetchProductsServer(filters, {
      next: { revalidate },
    }).catch(() => null),
    fetchFooterSettingsServer({
      next: { revalidate: 900 },
    }).catch(() => null),
  ]);
  const seoState = buildProductsSeoState(filters, locale, productsResponse);

  return {
    locale,
    filters,
    productsResponse,
    footerSettings,
    seoState,
    indexable: seoState.indexable && indexable,
  };
}

function buildProductsMetadata({
  locale,
  seoState,
  indexable,
}: {
  locale: StoreLocale;
  seoState: ReturnType<typeof buildProductsSeoState>;
  indexable: boolean;
}): Metadata {
  return buildPageMetadata({
    locale,
    routePath: "/products",
    title: seoState.title,
    description: seoState.description,
    indexable,
    query: seoState.indexable ? seoState.canonicalQuery : undefined,
    keywords: ["products", "technology", "gaming", "electronics", seoState.heading],
  });
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params?: ProductsPageParams;
  searchParams?: ProductsSearchParams;
}): Promise<Metadata> {
  const context = await getProductsPageContext({ params, searchParams });
  return buildProductsMetadata(context);
}

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params?: ProductsPageParams;
  searchParams?: ProductsSearchParams;
}) {
  const { locale, productsResponse, footerSettings, seoState, indexable } =
    await getProductsPageContext({ params, searchParams });
  const schemas: unknown[] = [
    createOrganizationSchema(locale, footerSettings),
    createWebsiteSchema(locale),
    createCollectionBreadcrumbSchema({
      locale,
      name: seoState.heading,
      routePath: "/products",
      query: indexable ? seoState.canonicalQuery : undefined,
    }),
  ];
  const collectionSchema =
    productsResponse && productsResponse.products.length > 0
      ? createCollectionPageSchema({
          locale,
          name: seoState.heading,
          description: seoState.description,
          routePath: "/products",
          query: indexable ? seoState.canonicalQuery : undefined,
          products: productsResponse.products,
        })
      : null;

  if (collectionSchema) {
    schemas.push(collectionSchema);
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(schemas) }}
      />
      <Suspense fallback={<div className="p-8">Loading products...</div>}>
        <ProductsClient initialProductsResponse={productsResponse} />
      </Suspense>
    </>
  );
}
