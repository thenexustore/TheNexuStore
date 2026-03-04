"use client";

import { useMemo, useState } from "react";
import { CategoryTreeNode } from "../lib/products";

type Props = {
  open: boolean;
  tree: CategoryTreeNode[];
  onNavigate: (slug: string) => void;
};

export function CategoryMegaMenu({ open, tree, onNavigate }: Props) {
  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);

  const activeParent = useMemo(() => tree.find((item) => item.id === activeParentId) ?? tree[0], [tree, activeParentId]);
  const activeChild = useMemo(() => activeParent?.children.find((item) => item.id === activeChildId) ?? activeParent?.children[0], [activeParent, activeChildId]);

  if (!open) return null;

  return (
    <div className="absolute left-0 top-full z-50 mt-2 grid w-[840px] grid-cols-3 gap-4 rounded-lg border bg-white p-4 shadow-xl">
      <div className="space-y-1 border-r pr-3">
        {tree.map((parent) => (
          <button key={parent.id} onMouseEnter={() => { setActiveParentId(parent.id); setActiveChildId(null); }} onClick={() => onNavigate(parent.slug)} className={`w-full rounded px-2 py-2 text-left text-sm ${activeParent?.id === parent.id ? "bg-gray-100 font-medium" : "hover:bg-gray-50"}`}>
            {parent.name}
          </button>
        ))}
      </div>
      <div className="space-y-1 border-r pr-3">
        {activeParent ? (
          <>
            <button onClick={() => onNavigate(activeParent.slug)} className="mb-1 text-sm font-semibold text-blue-700">View all in {activeParent.name}</button>
            {activeParent.children.map((child) => (
              <button key={child.id} onMouseEnter={() => setActiveChildId(child.id)} onClick={() => onNavigate(child.slug)} className={`w-full rounded px-2 py-2 text-left text-sm ${activeChild?.id === child.id ? "bg-gray-100 font-medium" : "hover:bg-gray-50"}`}>
                {child.name}
              </button>
            ))}
          </>
        ) : null}
      </div>
      <div className="space-y-1">
        {activeChild ? (
          <>
            <button onClick={() => onNavigate(activeChild.slug)} className="mb-1 text-sm font-semibold text-blue-700">View all in {activeChild.name}</button>
            {activeChild.children.map((grandchild) => (
              <button key={grandchild.id} onClick={() => onNavigate(grandchild.slug)} className="block w-full rounded px-2 py-2 text-left text-sm hover:bg-gray-50">
                {grandchild.name}
              </button>
            ))}
          </>
        ) : (
          <p className="text-sm text-gray-500">No subcategories</p>
        )}
      </div>
    </div>
  );
}
