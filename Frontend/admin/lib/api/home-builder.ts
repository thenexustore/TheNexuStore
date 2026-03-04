import { API_URL } from '../constants';

async function req(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('admin_token');
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
    cache: 'no-store',
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || `Request failed: ${res.status}`);
  return json.data;
}

export const homeBuilderApi = {
  layouts: () => req('/admin/home/layouts'),
  createLayout: (payload: { name: string; locale?: string }) => req('/admin/home/layouts', { method: 'POST', body: JSON.stringify(payload) }),
  updateLayout: (id: string, payload: Record<string, any>) => req(`/admin/home/layouts/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  cloneLayout: (id: string) => req(`/admin/home/layouts/${id}/clone`, { method: 'POST' }),
  sections: (layoutId: string) => req(`/admin/home/layouts/${layoutId}/sections`),
  createSection: (layoutId: string, payload: Record<string, any>) => req(`/admin/home/layouts/${layoutId}/sections`, { method: 'POST', body: JSON.stringify(payload) }),
  updateSection: (id: string, payload: Record<string, any>) => req(`/admin/home/sections/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteSection: (id: string) => req(`/admin/home/sections/${id}`, { method: 'DELETE' }),
  moveSection: (id: string, position: number) => req(`/admin/home/sections/${id}/move`, { method: 'POST', body: JSON.stringify({ position }) }),
  preview: (layoutId: string) => req(`/admin/home/preview?layoutId=${layoutId}`),
};
