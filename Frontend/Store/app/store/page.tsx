import HomeRenderer from './HomeRenderer';
import { API_URL } from '../lib/env';

type HomeSection = {
  id: string;
  type: string;
  title?: string;
  subtitle?: string;
  resolved: unknown[];
};

type LegacySection = {
  id: string;
  type: string;
  title?: string | null;
  enabled?: boolean;
  failed?: boolean;
  data?: unknown;
};

const fallbackData = {
  layout: null,
  sections: [
    { id: 'fallback-categories', type: 'CATEGORY_STRIP', title: 'Top Categories', resolved: [] },
    { id: 'fallback-arrivals', type: 'PRODUCT_CAROUSEL', title: 'New Arrivals', resolved: [] },
  ] as HomeSection[],
};

function mapLegacySectionType(type: string): string {
  switch (type) {
    case 'HERO_BANNER_SLIDER':
      return 'HERO_CAROUSEL';
    case 'TOP_CATEGORIES_GRID':
      return 'CATEGORY_STRIP';
    case 'BRANDS_STRIP':
      return 'BRAND_STRIP';
    case 'BEST_DEALS':
    case 'NEW_ARRIVALS':
    case 'FEATURED_PICKS':
      return 'PRODUCT_CAROUSEL';
    case 'TRUST_BAR':
      return 'VALUE_PROPS';
    default:
      return type;
  }
}

async function getLegacyHomeSections(): Promise<HomeSection[]> {
  const res = await fetch(`${API_URL}/homepage/sections`, { next: { revalidate: 120 } });
  if (!res.ok) return [];

  const json = await res.json();
  const sections = Array.isArray(json?.data) ? (json.data as LegacySection[]) : [];

  return sections
    .filter((section) => !section.failed && section.enabled !== false)
    .map((section) => ({
      id: section.id,
      type: mapLegacySectionType(section.type),
      title: section.title || undefined,
      subtitle: undefined,
      resolved: Array.isArray(section.data) ? section.data : [],
    }));
}

async function getHome(previewLayoutId?: string) {
  const query = new URLSearchParams();
  if (previewLayoutId) query.set('previewLayoutId', previewLayoutId);
  const endpoint = `${API_URL}/home${query.toString() ? `?${query.toString()}` : ''}`;

  try {
    const res = await fetch(endpoint, { next: { revalidate: 300 } });
    if (res.ok) {
      const json = await res.json();
      const data = json?.data;
      if (data?.layout || (Array.isArray(data?.sections) && data.sections.length > 0)) {
        return data;
      }
    }

    const legacySections = await getLegacyHomeSections();
    if (legacySections.length) {
      return { layout: null, sections: legacySections };
    }

    return fallbackData;
  } catch {
    return fallbackData;
  }
}

export default async function StorePage({ searchParams }: { searchParams?: Promise<{ previewLayoutId?: string }> }) {
  const sp = (await searchParams) || {};
  const data = await getHome(sp.previewLayoutId);

  return (
    <main className="min-h-screen bg-slate-50 pb-10">
      <div className="mx-auto flex w-full flex-col items-center gap-8">
        <HomeRenderer payload={data} />
      </div>
    </main>
  );
}
