"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { CategorySearchResult } from "../lib/products";

type Props = {
  item: CategorySearchResult;
  onClick: (slug: string) => void;
  compact?: boolean;
};

export function CategorySearchResultCard({
  item,
  onClick,
  compact = false,
}: Props) {
  const t = useTranslations("nav");

  return (
    <button
      type="button"
      onClick={() => onClick(item.slug)}
      className={`w-full rounded-xl border border-slate-200 bg-white text-left transition-all hover:border-[#0B123A] hover:bg-slate-50 ${
        compact ? "px-4 py-3" : "p-3 shadow-sm hover:-translate-y-0.5"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-800">{item.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {t("levelIndicator", { count: item.depth })}
          </span>
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
        </div>
      </div>
      <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {t("currentPath")}
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{item.path}</p>
    </button>
  );
}
