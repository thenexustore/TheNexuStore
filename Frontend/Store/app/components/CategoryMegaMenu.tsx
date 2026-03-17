"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import { CategoryTreeNode } from "../lib/products";
import { getCategoryIcon } from "../lib/category-icons";

type Props = {
  open: boolean;
  tree: CategoryTreeNode[];
  onNavigate: (slug: string) => void;
};

export function CategoryMegaMenu({ open, tree, onNavigate }: Props) {
  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);

  const firstParentWithChildren = useMemo(
    () => tree.find((item) => item.children.length > 0) ?? tree[0],
    [tree],
  );

  const activeParent = useMemo(
    () => tree.find((item) => item.id === activeParentId) ?? firstParentWithChildren,
    [tree, activeParentId, firstParentWithChildren],
  );

  const activeChild = useMemo(
    () =>
      activeParent?.children.find((item) => item.id === activeChildId) ??
      activeParent?.children[0],
    [activeParent, activeChildId],
  );

  const featuredGrandchildren = useMemo(
    () => activeChild?.children.slice(0, 12) ?? [],
    [activeChild],
  );

  if (!open) return null;

  return (
    <div className="absolute left-0 top-full z-50 mt-2 grid h-[72vh] max-h-[640px] w-[1140px] grid-cols-[280px_330px_1fr] gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
      <aside className="overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-2">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Categorías padre
        </p>
        <div className="space-y-1">
          {tree.map((parent) => {
            const isActive = activeParent?.id === parent.id;
            return (
              <button
                key={parent.id}
                onMouseEnter={() => {
                  setActiveParentId(parent.id);
                  setActiveChildId(null);
                }}
                onClick={() => onNavigate(parent.slug)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  isActive
                    ? "bg-[#0B123A] text-white shadow-sm"
                    : "text-slate-700 hover:bg-[#0B123A] hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2">
                  {(() => { const Icon = getCategoryIcon(parent.slug); return Icon ? <Icon className="h-4 w-4 flex-shrink-0" /> : null; })()}
                  <span className="font-medium">{parent.name}</span>
                </span>
                <span className="flex items-center gap-1">
                  {parent.children.length > 0 && (
                    <span className="text-xs opacity-60">({parent.children.length})</span>
                  )}
                  <ChevronRight className="h-4 w-4" />
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="overflow-y-auto rounded-xl border border-slate-200 p-3">
        {activeParent ? (
          <>
            <button
              onClick={() => onNavigate(activeParent.slug)}
              className="mb-3 flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-[#0B123A] hover:border-[#0B123A] hover:bg-[#0B123A] hover:text-white"
            >
              <span>Ver todo en {activeParent.name}</span>
              <ChevronRight className="h-4 w-4" />
            </button>

            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Subcategorías
            </p>

            <div className="space-y-1">
              {activeParent.children.map((child) => {
                const isActive = activeChild?.id === child.id;
                return (
                  <button
                    key={child.id}
                    onMouseEnter={() => setActiveChildId(child.id)}
                    onClick={() => onNavigate(child.slug)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                      isActive
                        ? "bg-[#0B123A] text-white"
                        : "text-slate-700 hover:bg-[#0B123A] hover:text-white"
                    }`}
                  >
                    <span>{child.name}</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
      </section>

      <section className="overflow-y-auto rounded-xl border border-slate-200 p-3">
        {activeChild ? (
          <>
            <div className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Selección activa
                </p>
                <p className="text-base font-semibold text-slate-900">{activeChild.name}</p>
              </div>
              <Sparkles className="h-4 w-4 text-[#0B123A]" />
            </div>

            <button
              onClick={() => onNavigate(activeChild.slug)}
              className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-[#0B123A] hover:border-[#0B123A] hover:bg-[#0B123A] hover:text-white"
            >
              Ver todo en {activeChild.name}
            </button>

            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Categorías destacadas
            </p>

            <div className="grid grid-cols-2 gap-2">
              {featuredGrandchildren.map((grandchild) => (
                <button
                  key={grandchild.id}
                  onClick={() => onNavigate(grandchild.slug)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:border-[#0B123A] hover:bg-[#0B123A] hover:text-white"
                >
                  {grandchild.name}
                </button>
              ))}
            </div>

            {featuredGrandchildren.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
                Esta subcategoría no tiene niveles inferiores.
              </p>
            ) : null}
          </>
        ) : (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
            Próximamente: estamos preparando los productos de esta categoría.
          </p>
        )}
      </section>
    </div>
  );
}
