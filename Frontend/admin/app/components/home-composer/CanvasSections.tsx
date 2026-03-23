import { HomeSection, HomeSectionType } from "./types";

const SECTION_TYPE_ICONS: Record<HomeSectionType, string> = {
  HERO_CAROUSEL: "🖼️",
  CATEGORY_STRIP: "🗂️",
  PRODUCT_CAROUSEL: "🛍️",
  BRAND_STRIP: "🏷️",
  VALUE_PROPS: "✅",
  TRENDING_CHIPS: "🔥",
  CUSTOM_HTML: "💻",
};

type Props = {
  sections: HomeSection[];
  allSections?: HomeSection[];
  selectedSectionId: string | null;
  saving: boolean;
  sectionTypeLabels: Record<HomeSectionType, string>;
  onSelect: (id: string) => void;
  onMove: (section: HomeSection, direction: -1 | 1) => void;
  onToggle: (section: HomeSection) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (section: HomeSection) => void;
};

const byPosition = (a: HomeSection, b: HomeSection) => a.position - b.position;

export default function CanvasSections({
  sections,
  allSections,
  selectedSectionId,
  saving,
  sectionTypeLabels,
  onSelect,
  onMove,
  onToggle,
  onDelete,
  onDuplicate,
}: Props) {
  const orderedSections = [...(allSections ?? sections)].sort(byPosition);
  const enabledCount = orderedSections.filter((s) => s.is_enabled).length;

  if (!sections.length) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
        <div className="text-2xl mb-2">📋</div>
        <div>Este diseño aún no tiene secciones. / This layout has no sections yet.</div>
        <div className="mt-1 text-xs text-zinc-400">Empieza añadiendo un bloque desde el panel superior. / Start by adding a block from the panel above.</div>
      </div>
    );
  }

  return (
    <>
      <div className="mt-3 mb-3 flex items-center gap-2 text-xs text-zinc-500">
        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-emerald-700">
          {enabledCount} visible{enabledCount !== 1 ? "s" : ""} / visible
        </span>
        <span className="rounded-full bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-zinc-600">
          {orderedSections.length - enabledCount} oculta{orderedSections.length - enabledCount !== 1 ? "s" : ""} / hidden
        </span>
        <span className="text-zinc-400">· {orderedSections.length} total / total</span>
      </div>
      <div className="space-y-2">
        {sections.map((section, index) => {
          const mode = typeof section.config?.mode === "string" ? String(section.config.mode) : null;
          const limit = Number(section.config?.limit || 0);
          const subtitle = section.subtitle;
          const variant = section.variant;
          const icon = SECTION_TYPE_ICONS[section.type] || "📦";
          const currentIndex = orderedSections.findIndex((entry) => entry.id === section.id);
          const displayIndex = currentIndex >= 0 ? currentIndex + 1 : index + 1;
          const isFirst = currentIndex <= 0;
          const isLast = currentIndex === orderedSections.length - 1;

          return (
            <div
              key={section.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(section.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(section.id);
                }
              }}
              className={`w-full rounded-xl border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-zinc-300 ${
                selectedSectionId === section.id
                  ? "border-black bg-zinc-50 shadow-sm"
                  : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/70"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <div className="mt-0.5 flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-base">
                    {icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-zinc-400">#{displayIndex}</span>
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                          section.is_enabled ? "bg-emerald-400" : "bg-zinc-300"
                        }`}
                      />
                    </div>
                    <div className="font-medium text-zinc-900 text-sm truncate">
                      {section.title || sectionTypeLabels[section.type] || section.type}
                    </div>
                    {subtitle ? (
                      <div className="text-xs text-zinc-500 truncate">{subtitle}</div>
                    ) : null}
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-zinc-500">
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px]">
                        {sectionTypeLabels[section.type] || section.type}
                      </span>
                      {mode ? (
                        <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px]">
                          {mode === "curated" ? "✋ Curado / Curated" : mode === "auto" ? "🤖 Auto" : mode}
                        </span>
                      ) : null}
                      {Number.isFinite(limit) && limit > 0 ? (
                        <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px]">
                          Límite: {limit}
                        </span>
                      ) : null}
                      {variant ? (
                        <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] text-violet-700">
                          {variant}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1 md:justify-end flex-shrink-0">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onMove(section, -1);
                    }}
                    disabled={saving || isFirst}
                    className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-xs disabled:opacity-40 hover:bg-zinc-50"
                    title="Mover arriba / Move up"
                    aria-label="Mover arriba / Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onMove(section, 1);
                    }}
                    disabled={saving || isLast}
                    className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-xs disabled:opacity-40 hover:bg-zinc-50"
                    title="Mover abajo / Move down"
                    aria-label="Mover abajo / Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggle(section);
                    }}
                    disabled={saving}
                    className={`rounded border px-1.5 py-0.5 text-xs disabled:opacity-40 ${
                      section.is_enabled
                        ? "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                        : "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                    title={section.is_enabled ? "Ocultar sección / Hide section" : "Mostrar sección / Show section"}
                  >
                    {section.is_enabled ? "Ocultar / Hide" : "Mostrar / Show"}
                  </button>
                  {onDuplicate ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDuplicate(section);
                      }}
                      disabled={saving}
                      className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700 disabled:opacity-40 hover:bg-blue-100"
                      title="Duplicar sección / Duplicate section"
                      aria-label="Duplicar sección / Duplicate section"
                    >
                      Duplicar / Duplicate
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(section.id);
                    }}
                    disabled={saving}
                    className="rounded border border-rose-300 bg-rose-50 px-1.5 py-0.5 text-xs text-rose-700 disabled:opacity-40 hover:bg-rose-100"
                    title="Eliminar sección / Delete section"
                  >
                    Eliminar / Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}