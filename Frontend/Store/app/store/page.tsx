import { Suspense } from "react";
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

type HomeRenderDecision = {
  shouldRenderDynamic: boolean;
  reason:
    | "force_dynamic"
    | "legacy_forced_by_query"
    | "layout_preview"
    | "layout_active"
    | "layout_missing";
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
    const res = await fetch(endpoint, { cache: 'no-store' });
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
  // Source-of-truth rules for homepage rendering:
  // 1) Home Layout is the default source of truth whenever a layout exists.
  // 2) Legacy dynamic sections are only used when no layout exists (or explicit forced flags).
  // 3) Keep opt-in query overrides for safe rollback/debug (`forceDynamic=1` / `useLayout=0`).
  const useLayout = sp.useLayout !== "0" || Boolean(sp.previewLayoutId);
  const layoutSections: HomeResolvedSection[] = Array.isArray(data?.sections)
    ? data.sections
    : [];

  const hasLayoutSections =
    Boolean(data?.layout) &&
    layoutSections.length > 0;

  const heroSections = layoutSections.filter(
    (section: HomeResolvedSection) => section?.type === "HERO_CAROUSEL",
  );
  const productSections = layoutSections.filter(
    (section: HomeResolvedSection) => section?.type === "PRODUCT_CAROUSEL",
  );

  const heroSectionsEmpty =
    heroSections.length > 0 &&
    heroSections.every(
      (section: HomeResolvedSection) =>
        Array.isArray(section?.resolved) && section.resolved.length === 0,
    );

  const productSectionsAllEmpty =
    productSections.length > 0 &&
    productSections.every(
      (section: HomeResolvedSection) =>
        Array.isArray(section?.resolved) && section.resolved.length === 0,
    );

  const hasAnyResolvedContent = layoutSections.some((section: HomeResolvedSection) => {
    if (Array.isArray(section?.resolved)) return section.resolved.length > 0;
    return Boolean(section?.resolved);
  });

  const resolveRenderDecision = (): HomeRenderDecision => {
    if (forceDynamic) {
      return { shouldRenderDynamic: true, reason: "force_dynamic" };
    }

    if (!useLayout && !sp.previewLayoutId) {
      return { shouldRenderDynamic: true, reason: "legacy_forced_by_query" };
    }

    if (Boolean(sp.previewLayoutId)) {
      return { shouldRenderDynamic: false, reason: "layout_preview" };
    }

    if (hasLayoutSections || data?.layout) {
      return { shouldRenderDynamic: false, reason: "layout_active" };
    }

    return { shouldRenderDynamic: true, reason: "layout_missing" };
  };

  const renderDecision = resolveRenderDecision();
  const shouldRenderDynamic = renderDecision.shouldRenderDynamic;

  const initialDynamicSections = shouldRenderDynamic
    ? await getDynamicSections(Boolean(sp.highlightSection) || forceDynamic)
    : [];

  if (shouldRenderDynamic) {
    console.warn("[store-home] Rendering legacy homepage sections", {
      reason: renderDecision.reason,
      hasLayout: Boolean(data?.layout),
      hasLayoutSections,
      hasAnyResolvedContent,
      heroSectionsEmpty,
      productSectionsAllEmpty,
    });
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-8 pt-8 sm:pb-12 sm:pt-10 lg:pb-16 lg:pt-12">
      <div className="mx-auto w-full max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8 sm:space-y-12 lg:space-y-16">
        {shouldRenderDynamic ? (
          <Suspense>
            <HomeDynamicSections initialSections={initialDynamicSections} />
          </Suspense>
        ) : (
          <HomeRenderer payload={data} />
        )}
      </div>
    </main>
  );
}
