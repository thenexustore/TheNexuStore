"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { CategorySearchResult, CategoryTreeNode } from "../lib/products";
import {
  canNavigateCategoryDirectly,
  findCategoryTrailBySlug,
} from "../lib/category-navigation";
import { getCategoryIcon } from "../lib/category-icons";
import { CategorySearchResultCard } from "./CategorySearchResultCard";

type Props = {
  open: boolean;
  loading: boolean;
  tree: CategoryTreeNode[];
  query: string;
  searchResults: CategorySearchResult[];
  searchLoading: boolean;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  onNavigate: (slug: string) => void;
  onBrowseAllProducts: () => void;
  activeCategorySlug?: string | null;
};

export function CategoryDrawer({
  open,
  loading,
  tree,
  query,
  searchResults,
  searchLoading,
  onQueryChange,
  onClose,
  onNavigate,
  onBrowseAllProducts,
  activeCategorySlug,
}: Props) {
  const t = useTranslations("nav");
  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const activeCategoryTrail = useMemo(
    () => findCategoryTrailBySlug(tree, activeCategorySlug),
    [tree, activeCategorySlug],
  );

  const firstParentWithChildren = useMemo(
    () => tree.find((item) => item.children.length > 0) ?? tree[0],
    [tree],
  );

  const trailParent = activeCategoryTrail[0];
  const trailChild = activeCategoryTrail[1];

  const activeParent = useMemo(
    () =>
      tree.find((item) => item.id === activeParentId) ??
      trailParent ??
      firstParentWithChildren,
    [tree, activeParentId, trailParent, firstParentWithChildren],
  );

  const activeChild = useMemo(() => {
    const selectedChild = activeParent?.children.find(
      (item) => item.id === activeChildId,
    );

    if (selectedChild) {
      return selectedChild;
    }

    if (trailChild && activeParent?.id === trailParent?.id) {
      return activeParent.children.find((item) => item.id === trailChild.id);
    }

    return activeParent?.children[0];
  }, [activeParent, activeChildId, trailChild, trailParent]);

  const activeParentCanNavigate = activeParent
    ? canNavigateCategoryDirectly(activeParent)
    : false;

  const subcategoryHeading = activeParent?.name ?? t("subcategories");
  const lowerLevelsHeading =
    activeChild?.name ?? activeParent?.name ?? t("lowerLevels");

  const handleTrailSelection = (index: number) => {
    if (index === 0) {
      const parent = activeCategoryTrail[0];
      if (!parent) return;
      setActiveParentId(parent.id);
      setActiveChildId(parent.children[0]?.id ?? null);
      return;
    }

    if (index === 1) {
      const parent = activeCategoryTrail[0];
      const child = activeCategoryTrail[1];
      if (!parent || !child) return;
      setActiveParentId(parent.id);
      setActiveChildId(child.id);
      return;
    }

    const selected = activeCategoryTrail[index];
    if (selected) {
      onNavigate(selected.slug);
    }
  };

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 80);

    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-900/55 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[96vw] max-w-[1180px] flex-col bg-white shadow-2xl transition-transform ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">
            {t("allCategories")}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-slate-100"
            aria-label={t("closeCategories")}
          >
            <X size={20} />
          </button>
        </div>

        <div className="border-b px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-10 text-sm outline-none focus:border-[#0B123A] focus:ring-2 focus:ring-[#0B123A]/15"
              placeholder={t("searchCategories")}
            />
            {query ? (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label={t("clearSearch")}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1">
          {query.trim().length >= 2 ? (
            <div className="h-full overflow-y-auto overscroll-contain p-4">
              {searchLoading ? (
                <p className="text-sm text-slate-500">{t("searching")}</p>
              ) : null}
              {!searchLoading && !searchResults.length ? (
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  {t("searchCategoriesEmptyHint")}
                </div>
              ) : null}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {searchResults.map((item) => (
                  <CategorySearchResultCard
                    key={item.id}
                    item={item}
                    onClick={onNavigate}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col">
              {activeCategoryTrail.length > 0 ? (
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {t("currentPath")}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {
                          activeCategoryTrail[activeCategoryTrail.length - 1]
                            ?.name
                        }
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate(
                          activeCategoryTrail[activeCategoryTrail.length - 1]!
                            .slug,
                        )
                      }
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-[#0B123A] transition-colors hover:border-[#0B123A] hover:bg-[#0B123A] hover:text-white"
                    >
                      {t("openCurrentCategory")}
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeCategoryTrail.map((node, index) => (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => handleTrailSelection(index)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${index === activeCategoryTrail.length - 1 ? "border-indigo-300 bg-indigo-50 text-[#0B123A]" : "border-slate-200 bg-white text-slate-600 hover:border-[#0B123A] hover:text-[#0B123A]"}`}
                      >
                        {node.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[280px_320px_1fr]">
                <section className="min-h-0 border-r border-slate-200 bg-slate-50/50 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2 px-2">
                    <button
                      type="button"
                      onClick={onBrowseAllProducts}
                      className="text-xs font-semibold uppercase tracking-wide text-slate-500 transition-colors hover:text-[#0B123A]"
                    >
                      {t("allYourProducts")}
                    </button>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500">
                      {tree.length}
                    </span>
                  </div>
                  <div className="h-full space-y-1 overflow-y-auto overscroll-contain pb-4">
                    {loading ? (
                      <p className="px-2 text-sm text-slate-500">
                        {t("loadingCategories")}
                      </p>
                    ) : (
                      tree.map((parent) => {
                        const isActive = activeParent?.id === parent.id;
                        const isCurrent = activeCategorySlug === parent.slug;
                        const ParentIcon = getCategoryIcon(parent.slug);
                        return (
                          <button
                            key={parent.id}
                            onClick={() => {
                              setActiveParentId(parent.id);
                              setActiveChildId(parent.children[0]?.id ?? null);
                            }}
                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                              isActive
                                ? "bg-[#0B123A] text-white"
                                : isCurrent
                                  ? "bg-indigo-50 text-[#0B123A] ring-1 ring-indigo-200"
                                  : "text-slate-700 hover:bg-[#0B123A] hover:text-white"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              {ParentIcon && (
                                <ParentIcon className="h-4 w-4 flex-shrink-0" />
                              )}
                              <span className="font-medium">{parent.name}</span>
                            </span>
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        );
                      })
                    )}
                  </div>
                </section>

                <section className="min-h-0 border-r border-slate-200 p-3">
                  <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {subcategoryHeading}
                  </p>
                  {activeParent ? (
                    <div className="mb-3 space-y-2 px-2 text-xs text-slate-500">
                      <div className="flex items-center justify-between gap-2">
                        <p>
                          {t("exploringCurrent", { name: activeParent.name })}
                        </p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                          {activeParent.children.length}
                        </span>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 leading-5 text-slate-600">
                        {t("chooseSubcategoryHint")}
                      </div>
                    </div>
                  ) : null}
                  <div className="h-full space-y-1 overflow-y-auto overscroll-contain pb-4">
                    {activeParent ? (
                      <>
                        <button
                          onClick={() =>
                            activeParentCanNavigate &&
                            onNavigate(activeParent.slug)
                          }
                          disabled={!activeParentCanNavigate}
                          className={`mb-2 w-full rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors ${
                            activeParentCanNavigate
                              ? "border-slate-200 text-[#0B123A] hover:border-[#0B123A] hover:bg-[#0B123A] hover:text-white"
                              : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                          }`}
                        >
                          {activeParentCanNavigate
                            ? t("viewAllInCategory", {
                                name: activeParent.name,
                              })
                            : t("preparingCategory")}
                        </button>

                        {activeParent.children.length === 0 ? (
                          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
                            {t("preparingCategory")}
                          </p>
                        ) : (
                          activeParent.children.map((child) => {
                            const isActive = activeChild?.id === child.id;
                            const isCurrent = activeCategorySlug === child.slug;

                            return (
                              <div
                                key={child.id}
                                className="flex items-center gap-1"
                              >
                                <button
                                  onClick={() => setActiveChildId(child.id)}
                                  className={`flex-1 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                                    isActive
                                      ? "bg-[#0B123A] text-white"
                                      : isCurrent
                                        ? "bg-indigo-50 text-[#0B123A] ring-1 ring-indigo-200"
                                        : "text-slate-700 hover:bg-[#0B123A] hover:text-white"
                                  }`}
                                >
                                  {child.name}
                                </button>
                                <button
                                  onClick={() => onNavigate(child.slug)}
                                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-[#0B123A] hover:bg-[#0B123A] hover:text-white"
                                  aria-label={t("viewProductsOf", {
                                    name: child.name,
                                  })}
                                >
                                  {t("view")}
                                </button>
                              </div>
                            );
                          })
                        )}
                      </>
                    ) : (
                      <p className="px-2 text-sm text-slate-500">
                        {t("noDataAvailable")}
                      </p>
                    )}
                  </div>
                </section>

                <section className="min-h-0 p-3">
                  <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {lowerLevelsHeading}
                  </p>
                  {activeChild ? (
                    <div className="mb-3 space-y-2 px-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveChildId(
                              activeParent?.children[0]?.id ?? null,
                            )
                          }
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-[#0B123A] hover:text-[#0B123A]"
                        >
                          {activeParent?.name}
                        </button>
                        <span className="text-slate-300">/</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {activeChild.name}
                        </span>
                        {activeCategorySlug === activeChild.slug ? (
                          <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-[#0B123A]">
                            {t("currentCategory")}
                          </span>
                        ) : null}
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                        {t("chooseLowerLevelHint")}
                      </div>
                    </div>
                  ) : null}
                  <div className="h-full overflow-y-auto overscroll-contain pb-4">
                    {activeChild ? (
                      <>
                        <button
                          onClick={() => onNavigate(activeChild.slug)}
                          className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-[#0B123A] hover:border-[#0B123A] hover:bg-[#0B123A] hover:text-white"
                        >
                          {t("viewAllInCategory", { name: activeChild.name })}
                        </button>

                        <div className="grid gap-2 sm:grid-cols-2">
                          {activeChild.children.map((grandchild) => {
                            const isCurrent =
                              activeCategorySlug === grandchild.slug;

                            return (
                              <button
                                key={grandchild.id}
                                onClick={() => onNavigate(grandchild.slug)}
                                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                                  isCurrent
                                    ? "border-indigo-300 bg-indigo-50 font-semibold text-[#0B123A]"
                                    : "border-slate-200 text-slate-700 hover:border-[#0B123A] hover:bg-[#0B123A] hover:text-white"
                                }`}
                              >
                                {grandchild.name}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
                        {t("noLowerLevels")}
                      </p>
                    )}
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
