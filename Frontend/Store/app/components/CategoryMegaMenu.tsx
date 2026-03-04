"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { CategoryTreeNode } from "../lib/products";

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

  if (!open) return null;

  return (
    <div className="absolute left-0 top-full z-50 mt-2 grid h-[72vh] max-h-[620px] w-[1120px] grid-cols-[290px_330px_1fr] gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
      <div className="space-y-1 overflow-y-auto border-r border-slate-200 pr-3">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Categorías padre
        </p>
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
              <span className="font-medium">{parent.name}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          );
        })}
      </div>

      <div className="space-y-1 overflow-y-auto border-r border-slate-200 pr-3">
        {activeParent ? (
          <>
            <button
              onClick={() => onNavigate(activeParent.slug)}
              className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-[#0B123A] hover:border-[#0B123A] hover:bg-[#0B123A] hover:text-white"
            >
              Ver todo en {activeParent.name}
            </button>
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
          </>
        ) : null}
      </div>

      <div className="space-y-2 overflow-y-auto pr-1">
        {activeChild ? (
          <>
            <button
              onClick={() => onNavigate(activeChild.slug)}
              className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-[#0B123A] hover:border-[#0B123A] hover:bg-[#0B123A] hover:text-white"
            >
              Ver todo en {activeChild.name}
            </button>
            <div className="grid grid-cols-2 gap-2">
              {activeChild.children.map((grandchild) => (
                <button
                  key={grandchild.id}
                  onClick={() => onNavigate(grandchild.slug)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:border-[#0B123A] hover:bg-[#0B123A] hover:text-white"
                >
                  {grandchild.name}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
            Esta categoría no tiene subcategorías.
          </p>
        )}
      </div>
    </div>
  );
}
