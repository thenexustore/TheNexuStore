import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetailsClient from "./ProductDetailsClient";
import {
  buildProductMetadata,
  createOrganizationSchema,
  createProductBreadcrumbSchema,
  createProductSchema,
  createWebsiteSchema,
  resolveStoreLocale,
  serializeJsonLd,
  type StoreLocale,
} from "@/app/lib/seo";
import {
  fetchFooterSettingsServer,
  fetchProductBySlugServer,
  fetchRelatedProductsServer,
} from "@/app/lib/storefront-server";

export const revalidate = 300;

type ProductPageParams = Promise<{
  slug: string;
  locale?: string;
}>;

async function getProductPageData(slug: string) {
  const product = await fetchProductBySlugServer(slug, {
    next: { revalidate },
  });
  const relatedProducts = await fetchRelatedProductsServer(product.id, 4, {
    next: { revalidate },
  }).catch(() => []);

  return { product, relatedProducts };
}

function resolveMetadataLocale(locale?: string): {
  locale: StoreLocale;
  indexable: boolean;
} {
  if (locale) {
    return {
      locale: resolveStoreLocale(locale),
      indexable: true,
    };
  }

  return {
    locale: resolveStoreLocale(undefined),
    indexable: false,
  };
}

export async function generateMetadata({
  params,
}: {
  params: ProductPageParams;
}): Promise<Metadata> {
  const { slug, locale: routeLocale } = await params;
  const { locale, indexable } = resolveMetadataLocale(routeLocale);

  try {
    const product = await fetchProductBySlugServer(slug, {
      next: { revalidate },
    });
    return buildProductMetadata(product, locale, indexable);
  } catch {
    return {
      title: `Product not found | TheNexuStore`,
      robots: {
        index: false,
        follow: true,
      },
    };
  }
}

export default async function ProductPage({
  params,
}: {
  params: ProductPageParams;
}) {
  const { slug, locale: routeLocale } = await params;
  const { locale } = resolveMetadataLocale(routeLocale);
  const [data, footerSettings] = await Promise.all([
    getProductPageData(slug).catch(() => null),
    fetchFooterSettingsServer({
      next: { revalidate: 900 },
    }).catch(() => null),
  ]);

  if (!data) {
    notFound();
  }

  const schemas = [
    createOrganizationSchema(locale, footerSettings),
    createWebsiteSchema(locale),
    createProductSchema(data.product, locale),
    createProductBreadcrumbSchema(data.product, locale),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(schemas) }}
      />
      <ProductDetailsClient
        product={data.product}
        relatedProducts={data.relatedProducts}
      />
    </>
  );
}
