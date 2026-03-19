import { API_URL } from '../constants';

export class HomeBuilderApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'HomeBuilderApiError';
    this.status = status;
  }
}

async function req(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('admin_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    cache: 'no-store',
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new HomeBuilderApiError(
      json?.message || `Request failed: ${res.status}`,
      res.status,
    );
  }
  return json.data;
}

export const homeBuilderApi = {
  layouts: () => req('/admin/home/layouts'),
  createLayout: (payload: { name: string; locale?: string }) => req('/admin/home/layouts', { method: 'POST', body: JSON.stringify(payload) }),
  updateLayout: (id: string, payload: Record<string, any>) => req(`/admin/home/layouts/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  cloneLayout: (id: string) => req(`/admin/home/layouts/${id}/clone`, { method: 'POST' }),
  deleteLayout: (id: string, force = false) => req(`/admin/home/layouts/${id}?force=${force}`, { method: 'DELETE' }),
  sections: (layoutId: string) => req(`/admin/home/layouts/${layoutId}/sections`),
  createSection: (layoutId: string, payload: Record<string, any>) => req(`/admin/home/layouts/${layoutId}/sections`, { method: 'POST', body: JSON.stringify(payload) }),
  updateSection: (id: string, payload: Record<string, any>) => req(`/admin/home/sections/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteSection: (id: string) => req(`/admin/home/sections/${id}`, { method: 'DELETE' }),
  moveSection: (id: string, position: number) => req(`/admin/home/sections/${id}/move`, { method: 'POST', body: JSON.stringify({ position }) }),
  reorderSections: (items: Array<{ id: string; position: number }>) => req('/admin/home/sections/reorder', { method: 'POST', body: JSON.stringify({ items: items.map((item) => ({ id: item.id, position: Math.floor(Number(item.position) || 0) })) }) }),

  listItems: (sectionId: string) => req(`/admin/home/sections/${sectionId}/items`),
  createItem: (sectionId: string, payload: Record<string, any>) => req(`/admin/home/sections/${sectionId}/items`, { method: 'POST', body: JSON.stringify(payload) }),
  updateItem: (itemId: string, payload: Record<string, any>) => req(`/admin/home/items/${itemId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteItem: (itemId: string) => req(`/admin/home/items/${itemId}`, { method: 'DELETE' }),
  reorderItems: (items: Array<{ id: string; position: number }>) => req('/admin/home/items/reorder', { method: 'POST', body: JSON.stringify({ items }) }),
  uploadItemImage: (dataUrl: string) => req('/admin/home/items/upload-image', { method: 'POST', body: JSON.stringify({ dataUrl }) }) as Promise<{ url: string }>,
  preview: (layoutId: string) => req(`/admin/home/preview?layoutId=${layoutId}`),
  activeDiagnostics: (locale?: string) =>
    req(`/admin/home/diagnostics/active${locale ? `?locale=${encodeURIComponent(locale)}` : ''}`),
  integratedSummary: (limit = 8) =>
    req(`/admin/home/integrated-summary?limit=${encodeURIComponent(String(limit))}`),
  options: (target: 'products' | 'categories' | 'brands' | 'banners', q = '', limit = 12) =>
    req(`/admin/home/options?target=${encodeURIComponent(target)}&q=${encodeURIComponent(q)}&limit=${limit}`),
};
