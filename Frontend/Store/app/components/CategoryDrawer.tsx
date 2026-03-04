"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import { CategorySearchResult, CategoryTreeNode } from "../lib/products";

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
}: Props) {
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

  useEffect(() => {
    if (!open) return;
    setActiveParentId(firstParentWithChildren?.id ?? null);
    setActiveChildId(firstParentWithChildren?.children[0]?.id ?? null);
  }, [open, firstParentWithChildren]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-900/55 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[96vw] max-w-[1180px] bg-white shadow-2xl transition-transform ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">Todas las categorías</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <div className="border-b px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#0B123A] focus:ring-2 focus:ring-[#0B123A]/15"
              placeholder="Buscar categorías, marcas, familias..."
            />
          </div>
        </div>

        <div className="h-[calc(100vh-126px)]">
          {query.trim().length >= 2 ? (
            <div className="h-full overflow-y-auto p-4">
              {searchLoading ? <p className="text-sm text-slate-500">Buscando…</p> : null}
              {!searchLoading && !searchResults.length ? (
                <p className="text-sm text-slate-500">No se encontraron categorías</p>
              ) : null}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.slug)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-left text-sm text-slate-700 hover:border-[#0B123A] hover:bg-[#0B123A] hover:text-white"
                  >
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs opacity-80">{item.path}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid h-full grid-cols-1 md:grid-cols-[280px_320px_1fr]">
              <section className="border-r border-slate-200 bg-slate-50/50 p-3">
                <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Categorías padre
                </p>
                <div className="h-full space-y-1 overflow-y-auto pb-4">
                  {loading ? (
                    <p className="px-2 text-sm text-slate-500">Cargando…</p>
                  ) : (
                    tree.map((parent) => {
                      const isActive = activeParent?.id === parent.id;
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
                              : "text-slate-700 hover:bg-[#0B123A] hover:text-white"
                          }`}
                        >
                          <span className="font-medium">{parent.name}</span>
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="border-r border-slate-200 p-3">
                <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Subcategorías
                </p>
                <div className="h-full space-y-1 overflow-y-auto pb-4">
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
                          <div key={child.id} className="flex items-center gap-1">
                            <button
                              onClick={() => setActiveChildId(child.id)}
                              className={`flex-1 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                                isActive
                                  ? "bg-[#0B123A] text-white"
                                  : "text-slate-700 hover:bg-[#0B123A] hover:text-white"
                              }`}
                            >
                              {child.name}
                            </button>
                            <button
                              onClick={() => onNavigate(child.slug)}
                              className="rounded-lg border border-slate-200 px-2 py-2 text-slate-500 hover:border-[#0B123A] hover:bg-[#0B123A] hover:text-white"
                              aria-label={`Ver ${child.name}`}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <p className="px-2 text-sm text-slate-500">No hay datos disponibles.</p>
                  )}
                </div>
              </section>

              <section className="p-3">
                <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Niveles inferiores
                </p>
                <div className="h-full overflow-y-auto pb-4">
                  {activeChild ? (
                    <>
                      <button
                        onClick={() => onNavigate(activeChild.slug)}
                        className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-[#0B123A] hover:border-[#0B123A] hover:bg-[#0B123A] hover:text-white"
                      >
                        Ver todo en {activeChild.name}
                      </button>

                      <div className="grid gap-2 sm:grid-cols-2">
                        {activeChild.children.map((grandchild) => (
                          <button
                            key={grandchild.id}
                            onClick={() => onNavigate(grandchild.slug)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 hover:border-[#0B123A] hover:bg-[#0B123A] hover:text-white"
                          >
                            {grandchild.name}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
                      Esta subcategoría no tiene niveles inferiores.
                    </p>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
