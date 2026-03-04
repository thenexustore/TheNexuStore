import { API_URL } from '../constants';

export type HomeLayout = {
  id: string;
  name: string;
  locale: string | null;
  is_active: boolean;
  updated_at: string;
};

export type HomeSection = {
  id: string;
  layout_id: string;
  type: string;
  title?: string | null;
  subtitle?: string | null;
  position: number;
  is_enabled: boolean;
  variant?: string | null;
  config: Record<string, unknown>;
};

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
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
  return json.data as T;
}

export const homeBuilderApi = {
  layouts: () => req<HomeLayout[]>('/admin/home/layouts'),
  createLayout: (payload: { name: string; locale?: string }) => req<HomeLayout>('/admin/home/layouts', { method: 'POST', body: JSON.stringify(payload) }),
  updateLayout: (id: string, payload: Partial<Pick<HomeLayout, 'name' | 'locale' | 'is_active'>>) => req<HomeLayout>(`/admin/home/layouts/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  cloneLayout: (id: string) => req<HomeLayout>(`/admin/home/layouts/${id}/clone`, { method: 'POST' }),
  deleteLayout: (id: string) => req<{ success: true }>(`/admin/home/layouts/${id}`, { method: 'DELETE' }),
  sections: (layoutId: string) => req<HomeSection[]>(`/admin/home/layouts/${layoutId}/sections`),
  createSection: (layoutId: string, payload: Omit<HomeSection, 'id' | 'layout_id'>) => req<HomeSection>(`/admin/home/layouts/${layoutId}/sections`, { method: 'POST', body: JSON.stringify(payload) }),
  updateSection: (id: string, payload: Partial<Omit<HomeSection, 'id' | 'layout_id'>>) => req<HomeSection>(`/admin/home/sections/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteSection: (id: string) => req<{ success: true }>(`/admin/home/sections/${id}`, { method: 'DELETE' }),
  moveSection: (id: string, position: number) => req<HomeSection[]>(`/admin/home/sections/${id}/move`, { method: 'POST', body: JSON.stringify({ position }) }),
};
