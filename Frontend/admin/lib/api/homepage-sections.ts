import { API_URL } from "../constants";

export interface HomepageSection {
  id: string;
  type: string;
  enabled: boolean;
  position: number;
  title?: string | null;
  config_json: Record<string, any>;
}

export interface HomepageOption {
  id: string;
  label: string;
  subtitle?: string;
}

export interface CategoryMenuTreeNode {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  product_count?: number;
  children: CategoryMenuTreeNode[];
}

export interface CategoryMenuTreeResponse {
  parents: Array<{
    id: string;
    name: string;
    slug: string;
    sort_order: number;
    product_count?: number;
  }>;
  tree: CategoryMenuTreeNode[];
}

export interface HomepageSectionsDiagnostics {
  totals: {
    total: number;
    enabled: number;
    disabled: number;
    duplicatedTypes: number;
    failedPublicSections: number;
    emptyPublicSections: number;
    activeBanners: number;
    heroSections: number;
    heroEnabledSections: number;
    activeFeaturedProducts: number;
    featuredPicksSections: number;
  };
  duplicatedTypes: Array<{ type: string; count: number }>;
  checks: {
    hasVisibleSections: boolean;
    storePayloadOk: boolean;
    bannersLinkedToHome: boolean;
    featuredLinkedToHome: boolean;
  };
}

async function req(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("admin_token");
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || `Request failed: ${res.status}`);
  }
  return json.data;
}

export const homepageSectionsApi = {
  list: (): Promise<HomepageSection[]> => req("/admin/homepage/sections"),
  diagnostics: (): Promise<HomepageSectionsDiagnostics> => req("/admin/homepage/sections/diagnostics"),
  create: (payload: {
    type: string;
    position: number;
    enabled?: boolean;
    title?: string;
    config_json: Record<string, any>;
  }): Promise<HomepageSection> =>
    req("/admin/homepage/sections", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Partial<HomepageSection>) =>
    req(`/admin/homepage/sections/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    req(`/admin/homepage/sections/${id}`, {
      method: "DELETE",
    }),
  reorder: (items: Array<{ id: string; position: number }>) =>
    req("/admin/homepage/sections/reorder", {
      method: "PUT",
      body: JSON.stringify({ items }),
    }),
  menuTree: (): Promise<CategoryMenuTreeResponse> => req("/user/categories/menu-tree"),
  options: (
    type: string,
    q = "",
    limit = 10,
    target?: "products" | "categories" | "brands",
  ): Promise<HomepageOption[]> =>
    req(
      `/admin/homepage/sections/options?type=${encodeURIComponent(type)}&q=${encodeURIComponent(q)}&limit=${limit}${target ? `&target=${encodeURIComponent(target)}` : ""}`,
    ),
};
