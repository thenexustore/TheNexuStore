import HomeRenderer from "./HomeRenderer";
import HomeDynamicSections from "./HomeDynamicSections";
import { API_URL } from "../lib/env";

const fallbackData = {
  layout: null,
  sections: [
    {
      id: "fallback-categories",
      type: "CATEGORY_STRIP",
      title: "Top Categories",
      resolved: [],
    },
    {
      id: "fallback-arrivals",
      type: "PRODUCT_CAROUSEL",
      title: "New Arrivals",
      resolved: [],
    },
  ],
};

type HomeResolvedSection = {
  type?: string;
  resolved?: unknown;
};

async function getHome({
  previewLayoutId,
  locale,
}: {
  previewLayoutId?: string;
  locale?: string;
}) {
  const query = new URLSearchParams();
  if (previewLayoutId) query.set("previewLayoutId", previewLayoutId);
  if (locale) query.set("locale", locale);
  const endpoint = `${API_URL}/home${query.toString() ? `?${query.toString()}` : ""}`;

  try {
    const res = await fetch(endpoint, { next: { revalidate: 60 } });
    if (!res.ok) return fallbackData;
    const json = await res.json();
    return json.data || fallbackData;
  } catch {
    return fallbackData;
  }
}

async function getDynamicSections(forceFresh = false) {
  try {
    const res = await fetch(
      `${API_URL}/homepage/sections`,
      forceFresh ? { cache: "no-store" } : { next: { revalidate: 60 } },
    );
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
}

export default async function StorePage({
  searchParams,
  params,
}: {
  searchParams?: Promise<{
    previewLayoutId?: string;
    forceDynamic?: string;
    useLayout?: string;
    highlightSection?: string;
  }>;
  params?: Promise<{
    locale?: string;
  }>;
}) {
  const sp = (await searchParams) || {};
  const routeParams = (await params) || {};

  const data = await getHome({
    previewLayoutId: sp.previewLayoutId,
    locale: routeParams.locale,
  });

  const forceDynamic = sp.forceDynamic === "1";
  // Layout builder becomes the default source of truth.
  // Set useLayout=0 only when we explicitly want to force legacy dynamic sections.
  const useLayout = sp.useLayout !== "0" || Boolean(sp.previewLayoutId);
  const hasLayoutSections =
    Boolean(data?.layout) &&
    Array.isArray(data?.sections) &&
    data.sections.length > 0;

  const hasEmptyHeroInLayout =
    hasLayoutSections &&
    data.sections.some(
      (section: HomeResolvedSection) =>
        section?.type === "HERO_CAROUSEL" &&
        Array.isArray(section?.resolved) &&
        section.resolved.length === 0,
    );

  const allProductSectionsEmpty =
    hasLayoutSections &&
    (() => {
      const productSections = data.sections.filter(
        (section: HomeResolvedSection) => section?.type === "PRODUCT_CAROUSEL",
      );
      if (!productSections.length) return false;
      return productSections.every(
        (section: HomeResolvedSection) =>
          Array.isArray(section?.resolved) && section.resolved.length === 0,
      );
    })();

  // During migration, fallback to legacy dynamic source when layout payload
  // is structurally present but key sections are empty.
  const shouldRenderDynamic =
    forceDynamic ||
    !(useLayout && hasLayoutSections) ||
    hasEmptyHeroInLayout ||
    allProductSectionsEmpty;

  const initialDynamicSections = shouldRenderDynamic
    ? await getDynamicSections(Boolean(sp.highlightSection) || forceDynamic)
    : [];

  return (
    <main className="min-h-screen bg-slate-50 pb-10">
      <div className="mx-auto w-full max-w-[1440px] space-y-8 px-2 sm:px-4">
        {shouldRenderDynamic || !hasLayoutSections ? (
          <HomeDynamicSections initialSections={initialDynamicSections} />
        ) : (
          <HomeRenderer payload={data} />
        )}
      </div>
    </main>
  );
}
