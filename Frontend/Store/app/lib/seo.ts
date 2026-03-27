import type { Metadata } from "next";
import type { Product, ProductDetail, ProductFilters, ProductResponse } from "./products";
import type { FooterSettings } from "./storefront-server";
import { SITE_URL } from "./env";

export type StoreLocale = "es" | "en";

export const DEFAULT_STORE_LOCALE: StoreLocale = "es";
export const SUPPORTED_STORE_LOCALES: readonly StoreLocale[] = ["es", "en"];
export const STORE_SITE_NAME = "TheNexuStore";
export const DEFAULT_OG_IMAGE_PATH = "/logo.png";
export const DEFAULT_SITE_ICON_PATH = "/icon.svg";
export const TARGET_SEO_MARKETS = ["ES", "GB", "US", "IN"] as const;

const REGIONAL_HREFLANG_LOCALES: ReadonlyArray<{
  code: string;
  locale: StoreLocale;
}> = [
  { code: "es", locale: "es" },
  { code: "es-ES", locale: "es" },
  { code: "en", locale: "en" },
  { code: "en-US", locale: "en" },
  { code: "en-GB", locale: "en" },
  { code: "en-IN", locale: "en" },
];

const SEO_COPY: Record<
  StoreLocale,
  {
    siteDescription: string;
    productsTitle: string;
    productsDescription: string;
    categoryDescription: (name: string, count?: number) => string;
    brandDescription: (name: string, count?: number) => string;
    searchDescription: (query: string, count?: number) => string;
    homeTitle: string;
    homeDescription: string;
    productFallbackDescription: (title: string, brand?: string, category?: string) => string;
  }
> = {
  es: {
    siteDescription:
      "Compra tecnología, gaming, componentes, accesorios y electrónica con stock real, precios competitivos y envío rápido en TheNexuStore.",
    productsTitle: "Todos los productos",
    productsDescription:
      "Explora el catálogo completo de tecnología, gaming, componentes, accesorios y electrónica disponible en TheNexuStore.",
    categoryDescription: (name, count) =>
      count && count > 0
        ? `Descubre ${count} productos de ${name} con precios actualizados, stock real y envío rápido en TheNexuStore.`
        : `Descubre productos de ${name} con precios actualizados, stock real y envío rápido en TheNexuStore.`,
    brandDescription: (name, count) =>
      count && count > 0
        ? `Compra ${count} productos de ${name} en TheNexuStore con stock real, precios competitivos y entrega rápida.`
        : `Compra productos de ${name} en TheNexuStore con stock real, precios competitivos y entrega rápida.`,
    searchDescription: (query, count) =>
      count && count > 0
        ? `Consulta ${count} resultados para “${query}” en TheNexuStore y encuentra tecnología, gaming y electrónica con disponibilidad real.`
        : `Consulta resultados para “${query}” en TheNexuStore y encuentra tecnología, gaming y electrónica con disponibilidad real.`,
    homeTitle: "Tienda de tecnología, gaming y electrónica",
    homeDescription:
      "Descubre ofertas, novedades y productos destacados de tecnología, gaming, componentes y electrónica en TheNexuStore.",
    productFallbackDescription: (title, brand, category) => {
      const parts = [title];
      if (brand) parts.push(`de ${brand}`);
      if (category) parts.push(`en ${category}`);
      return `${parts.join(" ")} con precio actualizado, stock real, especificaciones y opiniones en TheNexuStore.`;
    },
  },
  en: {
    siteDescription:
      "Shop tech, gaming gear, components, accessories, and electronics with real stock, competitive pricing, and fast shipping at TheNexuStore.",
    productsTitle: "All products",
    productsDescription:
      "Explore the full TheNexuStore catalog for tech, gaming, components, accessories, and electronics.",
    categoryDescription: (name, count) =>
      count && count > 0
        ? `Browse ${count} ${name} products with live pricing, real stock, and fast shipping at TheNexuStore.`
        : `Browse ${name} products with live pricing, real stock, and fast shipping at TheNexuStore.`,
    brandDescription: (name, count) =>
      count && count > 0
        ? `Shop ${count} ${name} products at TheNexuStore with live stock, competitive pricing, and fast delivery.`
        : `Shop ${name} products at TheNexuStore with live stock, competitive pricing, and fast delivery.`,
    searchDescription: (query, count) =>
      count && count > 0
        ? `See ${count} results for “${query}” on TheNexuStore and find tech, gaming, and electronics with live availability.`
        : `See results for “${query}” on TheNexuStore and find tech, gaming, and electronics with live availability.`,
    homeTitle: "Technology, gaming, and electronics store",
    homeDescription:
      "Discover deals, new arrivals, and featured technology, gaming, component, and electronics products at TheNexuStore.",
    productFallbackDescription: (title, brand, category) => {
      const parts = [title];
      if (brand) parts.push(`by ${brand}`);
      if (category) parts.push(`in ${category}`);
      return `${parts.join(" ")} with live pricing, stock status, specifications, and customer reviews at TheNexuStore.`;
    },
  },
};

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function isNonEmptyString(value?: string | null): value is string {
  return Boolean(value && value.trim());
}

function normalizePath(pathname: string): string {
  if (!pathname.trim()) return "/";
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return normalized.replace(/\/+$/, "") || "/";
}

function normalizeQuery(query?: string): string {
  if (!query) return "";
  return query.startsWith("?") ? query : `?${query}`;
}

export function resolveStoreLocale(locale?: string | null): StoreLocale {
  return locale === "en" ? "en" : DEFAULT_STORE_LOCALE;
}

export function getHtmlLanguageTag(locale: StoreLocale): string {
  return locale === "es" ? "es-ES" : "en";
}

export function absoluteUrl(pathname: string = "/"): string {
  if (isAbsoluteUrl(pathname)) {
    return pathname;
  }

  return new URL(pathname, `${SITE_URL}/`).toString();
}

export function buildLocalizedPath(locale: StoreLocale, routePath: string): string {
  const normalized = normalizePath(routePath);
  return normalized === "/" ? `/${locale}` : `/${locale}${normalized}`;
}

export function buildRouteWithQuery(routePath: string, query?: string): string {
  return `${normalizePath(routePath)}${normalizeQuery(query)}`;
}

export function buildLanguageAlternates(
  routePath: string,
  query?: string,
): NonNullable<NonNullable<Metadata["alternates"]>["languages"]> {
  const localizedRoute = buildRouteWithQuery(routePath, query);
  const languages = REGIONAL_HREFLANG_LOCALES.reduce<Record<string, string>>((acc, item) => {
    acc[item.code] = buildLocalizedPath(item.locale, localizedRoute);
    return acc;
  }, {});

  languages["x-default"] = buildLocalizedPath(DEFAULT_STORE_LOCALE, localizedRoute);
  return languages;
}

export function buildSitemapLanguageAlternates(
  routePath: string,
  query?: string,
): Record<string, string> {
  const localizedRoute = buildRouteWithQuery(routePath, query);
  return REGIONAL_HREFLANG_LOCALES.reduce<Record<string, string>>((acc, item) => {
    acc[item.code] = absoluteUrl(buildLocalizedPath(item.locale, localizedRoute));
    return acc;
  }, {});
}

export function buildLocaleAlternates(
  routePath: string,
  locale: StoreLocale,
  query?: string,
): NonNullable<Metadata["alternates"]> {
  const localizedRoute = buildRouteWithQuery(routePath, query);

  return {
    canonical: buildLocalizedPath(locale, localizedRoute),
    languages: buildLanguageAlternates(routePath, query),
  };
}

export function stripHtml(value?: string | null): string {
  if (!value) return "";
  return value
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  const truncated = value.slice(0, maxLength - 1).trim();
  return `${truncated}\u2026`;
}

export function humanizeSlug(value?: string | null): string {
  if (!value) return "";
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function getCopy(locale: StoreLocale) {
  return SEO_COPY[locale];
}

function getOpenGraphLocale(locale: StoreLocale): string {
  return locale === "es" ? "es_ES" : "en_US";
}

function getOpenGraphAlternateLocales(locale: StoreLocale): string[] {
  return locale === "es" ? ["en_US", "en_GB", "en_IN"] : ["es_ES"];
}

function getOrganizationSchemaId(): string {
  return absoluteUrl("/#organization");
}

function getWebsiteSchemaId(): string {
  return absoluteUrl("/#website");
}

function getBusinessLogoUrl(businessProfile?: FooterSettings | null): string {
  return absoluteUrl(
    isNonEmptyString(businessProfile?.logoUrl)
      ? businessProfile.logoUrl
      : DEFAULT_OG_IMAGE_PATH,
  );
}

function getBusinessAddress(businessProfile?: FooterSettings | null) {
  if (!isNonEmptyString(businessProfile?.contactAddress)) {
    return undefined;
  }

  return {
    "@type": "PostalAddress",
    streetAddress: businessProfile.contactAddress,
    addressCountry: "ES",
  };
}

function getBusinessSocialLinks(businessProfile?: FooterSettings | null): string[] {
  return (businessProfile?.socialLinks ?? [])
    .map((item) => item.url?.trim())
    .filter((value): value is string => Boolean(value && isAbsoluteUrl(value)));
}

function getBusinessContactPoints(businessProfile?: FooterSettings | null) {
  const email = businessProfile?.contactEmail?.trim();
  const phone = businessProfile?.contactPhone?.trim();

  if (!email && !phone) {
    return undefined;
  }

  return [
    {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: email || undefined,
      telephone: phone || undefined,
      availableLanguage: SUPPORTED_STORE_LOCALES,
      areaServed: [...TARGET_SEO_MARKETS],
    },
  ];
}

function toImageObject(image: string | { url: string; alt?: string }) {
  if (typeof image === "string") {
    return {
      url: absoluteUrl(image),
      alt: STORE_SITE_NAME,
    };
  }

  return {
    url: absoluteUrl(image.url),
    alt: image.alt ?? STORE_SITE_NAME,
  };
}

export function buildRobots(indexable: boolean): Metadata["robots"] {
  return {
    index: indexable,
    follow: true,
    googleBot: {
      index: indexable,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  };
}

export function buildPageMetadata({
  locale,
  routePath,
  title,
  description,
  keywords = [],
  indexable = true,
  query,
  images,
}: {
  locale: StoreLocale;
  routePath: string;
  title: string;
  description: string;
  keywords?: string[];
  indexable?: boolean;
  query?: string;
  images?: Array<string | { url: string; alt?: string }>;
}): Metadata {
  const imageObjects =
    images && images.length > 0
      ? images.map(toImageObject)
      : [toImageObject(DEFAULT_OG_IMAGE_PATH)];
  const routeWithQuery = buildRouteWithQuery(routePath, query);

  return {
    title,
    description,
    keywords,
    alternates: buildLocaleAlternates(routePath, locale, query),
    robots: buildRobots(indexable),
    openGraph: {
      title,
      description,
      url: absoluteUrl(buildLocalizedPath(locale, routeWithQuery)),
      siteName: STORE_SITE_NAME,
      locale: getOpenGraphLocale(locale),
      alternateLocale: getOpenGraphAlternateLocales(locale),
      type: "website",
      images: imageObjects,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageObjects.map((image) => image.url),
    },
  };
}

export function getPrimaryProductImage(product: ProductDetail | Product): string {
  if ("images" in product && Array.isArray(product.images) && product.images.length > 0) {
    return product.images[0]?.url || DEFAULT_OG_IMAGE_PATH;
  }

  return product.thumbnail || DEFAULT_OG_IMAGE_PATH;
}

export function getProductSeoDescription(
  product: ProductDetail,
  locale: StoreLocale,
): string {
  const cleaned = stripHtml(product.short_description || product.description_html);
  if (cleaned) {
    return truncateText(cleaned, 160);
  }

  return truncateText(
    getCopy(locale).productFallbackDescription(
      product.title,
      product.brand?.name ?? product.brand_name,
      product.main_category?.name ?? product.category_name,
    ),
    160,
  );
}

export function buildProductMetadata(
  product: ProductDetail,
  locale: StoreLocale,
  indexable: boolean,
): Metadata {
  const description = getProductSeoDescription(product, locale);
  const category = product.main_category?.name ?? product.category_name;
  const keywords = [
    product.title,
    product.brand?.name ?? product.brand_name,
    category,
    product.sku_code,
    STORE_SITE_NAME,
  ].filter((value): value is string => Boolean(value && value.trim()));

  return buildPageMetadata({
    locale,
    routePath: `/products/${product.slug}`,
    title: `${product.title} | ${STORE_SITE_NAME}`,
    description,
    indexable,
    images: [
      {
        url: getPrimaryProductImage(product),
        alt: product.title,
      },
    ],
    keywords,
  });
}

function mapSchemaAvailability(stockStatus?: string): string {
  switch (stockStatus) {
    case "IN_STOCK":
      return "https://schema.org/InStock";
    case "LOW_STOCK":
      return "https://schema.org/LimitedAvailability";
    default:
      return "https://schema.org/OutOfStock";
  }
}

export function createOrganizationSchema(
  locale: StoreLocale,
  businessProfile?: FooterSettings | null,
) {
  const socialLinks = getBusinessSocialLinks(businessProfile);
  const address = getBusinessAddress(businessProfile);
  const contactPoints = getBusinessContactPoints(businessProfile);

  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    "@id": getOrganizationSchemaId(),
    name: STORE_SITE_NAME,
    url: absoluteUrl(buildLocalizedPath(locale, "/store")),
    logo: getBusinessLogoUrl(businessProfile),
    image: getBusinessLogoUrl(businessProfile),
    email: businessProfile?.contactEmail?.trim() || undefined,
    telephone: businessProfile?.contactPhone?.trim() || undefined,
    address,
    sameAs: socialLinks,
    contactPoint: contactPoints,
    areaServed: [...TARGET_SEO_MARKETS],
    availableLanguage: SUPPORTED_STORE_LOCALES,
  };
}

export function createWebsiteSchema(locale: StoreLocale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": getWebsiteSchemaId(),
    name: STORE_SITE_NAME,
    url: absoluteUrl(buildLocalizedPath(locale, "/store")),
    inLanguage: getHtmlLanguageTag(locale),
    publisher: {
      "@id": getOrganizationSchemaId(),
    },
    potentialAction: {
      "@type": "SearchAction",
      target: absoluteUrl(buildLocalizedPath(locale, "/products?search={search_term_string}")),
      "query-input": "required name=search_term_string",
    },
  };
}

export function createProductSchema(product: ProductDetail, locale: StoreLocale) {
  const canonicalUrl = absoluteUrl(buildLocalizedPath(locale, `/products/${product.slug}`));
  const images = (product.images ?? [])
    .map((image) => image.url)
    .filter((image): image is string => Boolean(image));
  const description = getProductSeoDescription(product, locale);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description,
    image: images.length > 0 ? images : [absoluteUrl(DEFAULT_OG_IMAGE_PATH)],
    sku: product.sku_code,
    mpn: product.sku_code,
    brand: {
      "@type": "Brand",
      name: product.brand?.name ?? product.brand_name,
    },
    category: product.main_category?.name ?? product.category_name,
    inLanguage: getHtmlLanguageTag(locale),
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
    offers:
      product.price > 0
        ? {
            "@type": "Offer",
            priceCurrency: "EUR",
            price: product.price,
            availability: mapSchemaAvailability(product.stock_status),
            url: canonicalUrl,
            itemCondition: "https://schema.org/NewCondition",
            seller: {
              "@id": getOrganizationSchemaId(),
            },
          }
        : undefined,
    aggregateRating:
      product.rating_avg && product.rating_count > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: product.rating_avg,
            reviewCount: product.rating_count,
          }
        : undefined,
    review:
      product.reviews?.slice(0, 3).map((review) => ({
        "@type": "Review",
        reviewRating: {
          "@type": "Rating",
          ratingValue: review.rating,
          bestRating: 5,
        },
        author: {
          "@type": "Person",
          name: review.customer_name,
        },
        name: review.title,
        reviewBody: review.comment,
        datePublished: review.created_at,
      })) ?? [],
  };
}

export function createProductBreadcrumbSchema(
  product: ProductDetail,
  locale: StoreLocale,
) {
  const items = [
    {
      "@type": "ListItem",
      position: 1,
      name: locale === "es" ? "Inicio" : "Home",
      item: absoluteUrl(buildLocalizedPath(locale, "/store")),
    },
    {
      "@type": "ListItem",
      position: 2,
      name: getCopy(locale).productsTitle,
      item: absoluteUrl(buildLocalizedPath(locale, "/products")),
    },
  ];

  if (product.main_category?.name && product.main_category.slug) {
    items.push({
      "@type": "ListItem",
      position: 3,
      name: product.main_category.name,
      item: absoluteUrl(
        buildLocalizedPath(locale, `/products?category=${product.main_category.slug}`),
      ),
    });
  }

  items.push({
    "@type": "ListItem",
    position: items.length + 1,
    name: product.title,
    item: absoluteUrl(buildLocalizedPath(locale, `/products/${product.slug}`)),
  });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

export function createCollectionPageSchema({
  locale,
  name,
  description,
  routePath,
  query,
  products,
}: {
  locale: StoreLocale;
  name: string;
  description: string;
  routePath: string;
  query?: string;
  products: Product[];
}) {
  const localizedPath = buildLocalizedPath(locale, buildRouteWithQuery(routePath, query));

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: absoluteUrl(localizedPath),
    inLanguage: getHtmlLanguageTag(locale),
    isPartOf: {
      "@id": getWebsiteSchemaId(),
    },
    about: {
      "@id": getOrganizationSchemaId(),
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: products.slice(0, 20).map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(buildLocalizedPath(locale, `/products/${product.slug}`)),
        name: product.title,
      })),
    },
  };
}

export function createCollectionBreadcrumbSchema({
  locale,
  name,
  routePath,
  query,
}: {
  locale: StoreLocale;
  name: string;
  routePath: string;
  query?: string;
}) {
  const productsTitle = getCopy(locale).productsTitle;
  const collectionUrl = absoluteUrl(
    buildLocalizedPath(locale, buildRouteWithQuery(routePath, query)),
  );
  const items = [
    {
      "@type": "ListItem",
      position: 1,
      name: locale === "es" ? "Inicio" : "Home",
      item: absoluteUrl(buildLocalizedPath(locale, "/store")),
    },
    {
      "@type": "ListItem",
      position: 2,
      name: productsTitle,
      item: absoluteUrl(buildLocalizedPath(locale, "/products")),
    },
  ];

  if (query && name.trim() && name.trim() !== productsTitle) {
    items.push({
      "@type": "ListItem",
      position: 3,
      name,
      item: collectionUrl,
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

export function buildProductsSeoCopy(locale: StoreLocale) {
  return getCopy(locale);
}

export function buildHomeMetadata(locale: StoreLocale, indexable: boolean): Metadata {
  const copy = getCopy(locale);

  return buildPageMetadata({
    locale,
    routePath: "/store",
    title: `${copy.homeTitle} | ${STORE_SITE_NAME}`,
    description: copy.homeDescription,
    indexable,
    keywords: [
      STORE_SITE_NAME,
      locale === "es" ? "tienda online tecnología" : "online tech store",
      locale === "es" ? "gaming" : "gaming",
      locale === "es" ? "electrónica" : "electronics",
      locale === "es" ? "componentes" : "components",
    ],
  });
}

export function getDefaultSiteMetadata(): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    applicationName: STORE_SITE_NAME,
    title: STORE_SITE_NAME,
    description: SEO_COPY[DEFAULT_STORE_LOCALE].siteDescription,
    keywords: [
      STORE_SITE_NAME,
      "technology",
      "gaming",
      "electronics",
      "components",
      "accessories",
    ],
    authors: [{ name: STORE_SITE_NAME }],
    creator: STORE_SITE_NAME,
    publisher: STORE_SITE_NAME,
    category: "technology",
    referrer: "origin-when-cross-origin",
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [{ url: DEFAULT_SITE_ICON_PATH, type: "image/svg+xml" }],
      shortcut: [{ url: DEFAULT_SITE_ICON_PATH, type: "image/svg+xml" }],
      apple: [{ url: DEFAULT_OG_IMAGE_PATH, type: "image/png" }],
    },
    openGraph: {
      title: STORE_SITE_NAME,
      description: SEO_COPY[DEFAULT_STORE_LOCALE].siteDescription,
      url: absoluteUrl(buildLocalizedPath(DEFAULT_STORE_LOCALE, "/store")),
      siteName: STORE_SITE_NAME,
      locale: "es_ES",
      alternateLocale: ["en_US"],
      type: "website",
      images: [
        {
          url: absoluteUrl(DEFAULT_OG_IMAGE_PATH),
          alt: STORE_SITE_NAME,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: STORE_SITE_NAME,
      description: SEO_COPY[DEFAULT_STORE_LOCALE].siteDescription,
      images: [absoluteUrl(DEFAULT_OG_IMAGE_PATH)],
    },
    robots: buildRobots(true),
    other: {
      google: "notranslate",
    },
  };
}

export type ProductsSeoState = {
  title: string;
  description: string;
  heading: string;
  indexable: boolean;
  canonicalQuery?: string;
};

function getMatchedCategoryName(response: ProductResponse | null, slug?: string): string | undefined {
  if (!response?.filters?.categories || !slug) return undefined;
  return response.filters.categories.find((category) => category.slug === slug)?.display_name
    || response.filters.categories.find((category) => category.slug === slug)?.name;
}

function getMatchedBrandName(response: ProductResponse | null, slug?: string): string | undefined {
  if (!response?.filters?.brands || !slug) return undefined;
  return response.filters.brands.find((brand) => brand.slug === slug)?.name;
}

export function buildProductsSeoState(
  filters: ProductFilters,
  locale: StoreLocale,
  response: ProductResponse | null,
): ProductsSeoState {
  const copy = getCopy(locale);
  const searchTerm = filters.search?.trim();
  const hasAdvancedFilters =
    Boolean(filters.categories?.length) ||
    Boolean(filters.attributes?.length) ||
    typeof filters.min_price === "number" ||
    typeof filters.max_price === "number" ||
    Boolean(filters.featured_only) ||
    (filters.sort_by && filters.sort_by !== "newest") ||
    (filters.page ?? 1) > 1 ||
    filters.in_stock_only === false;

  const categoryName =
    getMatchedCategoryName(response, filters.category) ||
    response?.products.find((product) => product.category_slug === filters.category)?.category_name ||
    humanizeSlug(filters.category);
  const brandName =
    getMatchedBrandName(response, filters.brand) ||
    response?.products.find((product) => product.brand_slug === filters.brand)?.brand_name ||
    humanizeSlug(filters.brand);
  const resultCount = response?.total;

  if (searchTerm) {
    const heading =
      locale === "es"
        ? `Resultados para “${searchTerm}”`
        : `Results for “${searchTerm}”`;

    return {
      title: `${heading} | ${STORE_SITE_NAME}`,
      description: copy.searchDescription(searchTerm, resultCount),
      heading,
      indexable: false,
    };
  }

  if (filters.category && !filters.brand && !hasAdvancedFilters) {
    return {
      title: `${categoryName} | ${STORE_SITE_NAME}`,
      description: copy.categoryDescription(categoryName, resultCount),
      heading: categoryName,
      indexable: true,
      canonicalQuery: `category=${encodeURIComponent(filters.category)}`,
    };
  }

  if (filters.brand && !filters.category && !hasAdvancedFilters) {
    const heading =
      locale === "es" ? `Productos de ${brandName}` : `${brandName} products`;

    return {
      title:
        locale === "es"
          ? `${brandName} | Productos de marca | ${STORE_SITE_NAME}`
          : `${brandName} | Brand products | ${STORE_SITE_NAME}`,
      description: copy.brandDescription(brandName, resultCount),
      heading,
      indexable: true,
      canonicalQuery: `brand=${encodeURIComponent(filters.brand)}`,
    };
  }

  return {
    title: `${copy.productsTitle} | ${STORE_SITE_NAME}`,
    description: copy.productsDescription,
    heading: copy.productsTitle,
    indexable: !hasAdvancedFilters,
  };
}
