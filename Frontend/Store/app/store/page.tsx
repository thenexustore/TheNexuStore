import HomeRenderer from './HomeRenderer';
import HomeDynamicSections from './HomeDynamicSections';
import { API_URL } from '../lib/env';

const fallbackData = {
  layout: null,
  sections: [
    {
      id: 'fallback-categories',
      type: 'CATEGORY_STRIP',
      title: 'Top Categories',
      resolved: [],
    },
    {
      id: 'fallback-arrivals',
      type: 'PRODUCT_CAROUSEL',
      title: 'New Arrivals',
      resolved: [],
    },
  ],
};

async function getHome(previewLayoutId?: string) {
  const query = new URLSearchParams();
  if (previewLayoutId) query.set('previewLayoutId', previewLayoutId);
  const endpoint = `${API_URL}/home${query.toString() ? `?${query.toString()}` : ''}`;

  try {
    const res = await fetch(endpoint, { next: { revalidate: 60 } });
    if (!res.ok) return fallbackData;
    const json = await res.json();
    return json.data || fallbackData;
  } catch {
    return fallbackData;
  }
}

async function getDynamicSections() {
  try {
    const res = await fetch(`${API_URL}/homepage/sections`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
}

export default async function StorePage({
  searchParams,
}: {
  searchParams?: Promise<{ previewLayoutId?: string; forceDynamic?: string; useLayout?: string }>;
}) {
  const sp = (await searchParams) || {};
  const [data, initialDynamicSections] = await Promise.all([
    getHome(sp.previewLayoutId),
    getDynamicSections(),
  ]);
  const forceDynamic = sp.forceDynamic === "1";
  const useLayout = sp.useLayout === "1" || Boolean(sp.previewLayoutId);
  const hasLayoutSections = Boolean(data?.layout) && Array.isArray(data?.sections) && data.sections.length > 0;
  const shouldRenderDynamic = forceDynamic || !useLayout;

  return (
    <main className="min-h-screen bg-slate-50 pb-10">
      <div className="mx-auto w-full max-w-[1440px] space-y-8 px-2 sm:px-4">
        {shouldRenderDynamic || !hasLayoutSections ? <HomeDynamicSections initialSections={initialDynamicSections} /> : <HomeRenderer payload={data} />}
      </div>
    </main>
  );
}
