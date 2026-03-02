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
  options: (type: string, q = "", limit = 10): Promise<HomepageOption[]> =>
    req(
      `/admin/homepage/sections/options?type=${encodeURIComponent(type)}&q=${encodeURIComponent(q)}&limit=${limit}`,
    ),
};
