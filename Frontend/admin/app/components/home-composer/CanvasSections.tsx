import { HomeSection, HomeSectionType } from "./types";

type Props = {
  sections: HomeSection[];
  selectedSectionId: string | null;
  saving: boolean;
  sectionTypeLabels: Record<HomeSectionType, string>;
  onSelect: (id: string) => void;
  onMove: (section: HomeSection, direction: -1 | 1) => void;
  onToggle: (section: HomeSection) => void;
  onDelete: (id: string) => void;
};

export default function CanvasSections({
  sections,
  selectedSectionId,
  saving,
  sectionTypeLabels,
  onSelect,
  onMove,
  onToggle,
  onDelete,
}: Props) {
  if (!sections.length) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-500">
        Este diseño aún no tiene secciones. Empieza añadiendo un bloque arriba.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {sections.map((section) => {
        const mode = typeof section.config?.mode === "string" ? String(section.config.mode) : null;
        const limit = Number(section.config?.limit || 0);

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
            className={`w-full rounded-xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-zinc-300 ${
              selectedSectionId === section.id
                ? "border-black bg-zinc-50 shadow"
                : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/70"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs text-zinc-500">Posición #{section.position}</div>
                <div className="font-medium text-zinc-900">
                  {section.title || sectionTypeLabels[section.type] || section.type}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
                  <span className="rounded-full border border-zinc-200 px-2 py-0.5">
                    {sectionTypeLabels[section.type] || section.type}
                  </span>
                  {mode ? (
                    <span className="rounded-full border border-zinc-200 px-2 py-0.5">Modo: {mode}</span>
                  ) : null}
                  {Number.isFinite(limit) && limit > 0 ? (
                    <span className="rounded-full border border-zinc-200 px-2 py-0.5">Límite: {limit}</span>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    section.is_enabled
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {section.is_enabled ? "Visible" : "Oculto"}
                </span>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onMove(section, -1);
                  }}
                  disabled={saving || section.position === 1}
                  className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs disabled:opacity-50"
                  title="Mover arriba"
                >
                  ↑
                </button>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onMove(section, 1);
                  }}
                  disabled={saving || section.position === sections.length}
                  className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs disabled:opacity-50"
                  title="Mover abajo"
                >
                  ↓
                </button>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggle(section);
                  }}
                  disabled={saving}
                  className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs disabled:opacity-50"
                >
                  {section.is_enabled ? "Ocultar" : "Mostrar"}
                </button>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(section.id);
                  }}
                  disabled={saving}
                  className="rounded-lg border border-rose-300 bg-rose-50 px-2 py-1 text-xs text-rose-700 disabled:opacity-50"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
