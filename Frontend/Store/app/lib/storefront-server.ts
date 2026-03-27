import type { Product, ProductDetail, ProductFilters, ProductResponse } from "./products";
import { API_URL } from "./env";

export type FooterSettings = {
  logoUrl: string;
  logoAlt: string;
  newsletterEnabled: boolean;
  newsletterTitle: string;
  newsletterText: string;
  newsletterPlaceholder: string;
  newsletterButtonText: string;
  contactEmail: string;
  contactPhone: string;
  contactWhatsapp: string;
  contactAddress: string;
  contactHours: string;
  contactMapsUrl: string;
  legalLinks: Array<{ label: string; url: string }>;
  paymentsEnabled: boolean;
  paymentMethods: Array<{ label: string; iconUrl: string }>;
  socialEnabled: boolean;
  socialLinks: Array<{ platform: string; label: string; url: string }>;
  trustEnabled: boolean;
  trustItems: Array<{ icon: string; text: string }>;
  copyrightText: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: unknown;
  error?: unknown;
};

type FetchStorefrontOptions = RequestInit & {
  next?: {
    revalidate?: number;
  };
};

const DEFAULT_REVALIDATE_SECONDS = 300;

function isApiEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  return typeof value === "object" && value !== null && "success" in value;
}

function toMessage(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => toMessage(item))
      .filter((item): item is string => Boolean(item));
    return parts.length > 0 ? parts.join(", ") : null;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      toMessage(record.message) ||
      toMessage(record.error) ||
      toMessage(record.detail) ||
      toMessage(record.title) ||
      null
    );
  }

  return null;
}

function buildProductFiltersSearchParams(filters: ProductFilters = {}): URLSearchParams {
  const normalizedFilters: ProductFilters = {
    ...filters,
    in_stock_only: filters.in_stock_only ?? true,
  };
  const params = new URLSearchParams();

  Object.entries(normalizedFilters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return;
      params.append(key, value.join(","));
      return;
    }

    if (typeof value === "boolean") {
      params.append(key, value.toString());
      return;
    }

    params.append(key, String(value));
  });

  return params;
}

async function fetchStorefrontApi<T>(
  endpoint: string,
  init: FetchStorefrontOptions = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    next: init.next ?? { revalidate: DEFAULT_REVALIDATE_SECONDS },
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      toMessage(payload) || `Storefront API request failed for ${endpoint}`,
    );
  }

  if (isApiEnvelope<T>(payload)) {
    if (!payload.success) {
      throw new Error(toMessage(payload.message) || toMessage(payload.error) || "Unknown API error");
    }

    return payload.data as T;
  }

  return payload as T;
}

export async function fetchProductsServer(
  filters: ProductFilters = {},
  init?: FetchStorefrontOptions,
): Promise<ProductResponse> {
  const params = buildProductFiltersSearchParams(filters);
  const endpoint = `/user/products${params.toString() ? `?${params.toString()}` : ""}`;
  return fetchStorefrontApi<ProductResponse>(endpoint, init);
}

export async function fetchProductBySlugServer(
  slug: string,
  init?: FetchStorefrontOptions,
): Promise<ProductDetail> {
  return fetchStorefrontApi<ProductDetail>(`/user/products/slug/${encodeURIComponent(slug)}`, init);
}

export async function fetchRelatedProductsServer(
  productId: string,
  limit: number = 4,
  init?: FetchStorefrontOptions,
): Promise<Product[]> {
  return fetchStorefrontApi<Product[]>(
    `/user/products/${encodeURIComponent(productId)}/related?limit=${limit}`,
    init,
  );
}

export async function fetchAllProductsForSitemap(): Promise<Product[]> {
  const firstPage = await fetchProductsServer(
    {
      page: 1,
      limit: 250,
      in_stock_only: false,
    },
    {
      next: { revalidate: 900 },
    },
  );

  const totalPages = Math.max(firstPage.total_pages ?? 1, 1);
  const pages =
    totalPages > 1
      ? await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) =>
            fetchProductsServer(
              {
                page: index + 2,
                limit: 250,
                in_stock_only: false,
              },
              {
                next: { revalidate: 900 },
              },
            ),
          ),
        )
      : [];

  return [firstPage, ...pages].flatMap((page) => page.products ?? []);
}

export async function fetchFooterSettingsServer(
  init?: FetchStorefrontOptions,
): Promise<FooterSettings> {
  return fetchStorefrontApi<FooterSettings>("/footer/settings", init);
}
