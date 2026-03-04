"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Search, X } from "lucide-react";
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
  const [stack, setStack] = useState<CategoryTreeNode[]>([]);
  const currentItems = stack.length ? stack[stack.length - 1].children : tree;

  const breadcrumb = useMemo(() => stack.map((item) => item.name).join(" / "), [stack]);

  const goDeeper = (node: CategoryTreeNode) => {
    if (!node.children.length) {
      onNavigate(node.slug);
      return;
    }
    setStack((prev) => [...prev, node]);
  };

  const goBack = () => setStack((prev) => prev.slice(0, -1));

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-black/50 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={onClose} />
      <aside className={`fixed top-0 left-0 z-50 h-full w-[92vw] max-w-md bg-white shadow-xl transition-transform ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-semibold">Categories</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="border-b p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(e) => onQueryChange(e.target.value)} className="w-full rounded border py-2 pl-9 pr-3 text-sm" placeholder="Search categories" />
          </div>
        </div>

        <div className="h-[calc(100vh-116px)] overflow-y-auto p-3">
          {query.trim().length >= 2 ? (
            <div className="space-y-2">
              {searchLoading ? <p className="text-sm text-gray-500">Searching…</p> : null}
              {!searchLoading && !searchResults.length ? <p className="text-sm text-gray-500">No categories found</p> : null}
              {searchResults.map((item) => (
                <button key={item.id} onClick={() => onNavigate(item.slug)} className="w-full rounded border p-2 text-left text-sm hover:bg-gray-50">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.path}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {stack.length > 0 ? (
                <div className="space-y-2">
                  <button onClick={goBack} className="inline-flex items-center gap-1 text-sm text-blue-700"><ArrowLeft size={14} />Back</button>
                  <p className="text-xs text-gray-500">{breadcrumb}</p>
                  <button
                    onClick={() => onNavigate(stack[stack.length - 1].slug)}
                    className="w-full rounded bg-gray-100 px-3 py-2 text-left text-sm font-medium"
                  >
                    View all in {stack[stack.length - 1].name}
                  </button>
                </div>
              ) : null}

              {loading ? (
                <p className="text-sm text-gray-500">Loading…</p>
              ) : (
                currentItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => goDeeper(item)}
                    className="flex w-full items-center justify-between rounded border px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    <span>{item.name}</span>
                    {item.children.length ? <span className="text-xs text-gray-400">›</span> : null}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
