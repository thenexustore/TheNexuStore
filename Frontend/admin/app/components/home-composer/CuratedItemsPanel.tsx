import { HomeOption, HomeSectionItem } from "./types";

type CuratedTarget = "products" | "brands" | "categories" | "banners";

const TARGET_LABEL: Record<CuratedTarget, string> = {
  products: "productos",
  brands: "marcas",
  categories: "categorías",
  banners: "banners",
};

const TARGET_ICON: Record<CuratedTarget, string> = {
  products: "🛍️",
  brands: "🏷️",
  categories: "🗂️",
  banners: "🖼️",
};

type Props = {
  currentTarget: CuratedTarget;
  items: HomeSectionItem[];
  itemsLoading: boolean;
  optionsLoading: boolean;
  searchQuery: string;
  searchOptions: HomeOption[];
  saving: boolean;
  curatedLimit: number;
  curatedRemaining: number;
  onSearchChange: (value: string) => void;
  onAdd: (option: HomeOption) => void;
  onMove: (item: HomeSectionItem, direction: -1 | 1) => void;
  onDelete: (itemId: string) => void;
  onEditImage?: (item: HomeSectionItem) => void;
  onUploadImage?: (item: HomeSectionItem) => void;
  onEditLink?: (item: HomeSectionItem) => void;
};

export default function CuratedItemsPanel({
  currentTarget,
  items,
  itemsLoading,
  optionsLoading,
  searchQuery,
  searchOptions,
  saving,
  curatedLimit,
  curatedRemaining,
  onSearchChange,
  onAdd,
  onMove,
  onDelete,
  onEditImage,
  onUploadImage,
  onEditLink,
}: Props) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-base">{TARGET_ICON[currentTarget]}</span>
        <span className="text-sm font-medium">Selección manual ({TARGET_LABEL[currentTarget]})</span>
      </div>
      <p className="mb-3 text-xs text-zinc-500">
        Añade elementos y ordénalos. El orden aquí será el orden de visualización en tienda.
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-zinc-100 border border-zinc-200 px-2 py-1 text-zinc-700">
          {items.length} / {curatedLimit} añadidos
        </span>
        <span
          className={`rounded-full px-2 py-1 border ${
            curatedRemaining === 0
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-700"
          }`}
        >
          {curatedRemaining === 0 ? "⚠️ Límite alcanzado" : `${curatedRemaining} disponibles`}
        </span>
      </div>

      <div className="mb-3 grid gap-2">
        <input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={`Buscar ${TARGET_LABEL[currentTarget]}...`}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
        />
        <div className="max-h-48 space-y-1 overflow-auto rounded-lg border border-zinc-200 bg-white p-2">
          {optionsLoading ? (
            <div className="py-2 text-center text-xs text-zinc-500">Buscando...</div>
          ) : searchOptions.length ? (
            searchOptions.map((option) => {
              const alreadyAdded = items.some((item) => {
                if (currentTarget === "products") return item.product_id === option.id;
                if (currentTarget === "brands") return item.brand_id === option.id;
                if (currentTarget === "categories") return item.category_id === option.id;
                return item.banner_id === option.id;
              });

              return (
                <button
                  key={option.id}
                  disabled={saving || alreadyAdded || curatedRemaining === 0}
                  onClick={() => onAdd(option)}
                  className={`flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-left text-xs transition ${
                    alreadyAdded
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-zinc-200 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="truncate font-medium">{option.label}</div>
                    {option.subtitle ? (
                      <div className="truncate text-zinc-400">{option.subtitle}</div>
                    ) : null}
                  </div>
                  <span className={`flex-shrink-0 text-[11px] ${alreadyAdded ? "text-emerald-600" : "text-zinc-500"}`}>
                    {alreadyAdded ? "✓ Añadido" : "+ Añadir"}
                  </span>
                </button>
              );
            })
          ) : searchQuery ? (
            <div className="py-2 text-center text-xs text-zinc-500">Sin resultados para &quot;{searchQuery}&quot;</div>
          ) : (
            <div className="py-2 text-center text-xs text-zinc-400">Escribe para buscar {TARGET_LABEL[currentTarget]}</div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-2">
        <div className="mb-2 text-xs font-medium text-zinc-500">
          Orden actual ({items.length} elemento{items.length !== 1 ? "s" : ""})
        </div>
        {itemsLoading ? (
          <div className="py-2 text-center text-xs text-zinc-500">Cargando ítems...</div>
        ) : items.length ? (
          <div className="space-y-1.5">
            {items.map((item, index) => {
              const displayName = item.label || item.product_id || item.brand_id || item.category_id || item.banner_id || item.id;
              return (
                <div
                  key={item.id}
                  className="rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-zinc-200 px-1 py-0.5 text-[10px] font-mono text-zinc-600">#{index + 1}</span>
                        <span className="truncate font-medium text-zinc-900">{displayName}</span>
                      </div>
                      {item.href ? (
                        <div className="mt-0.5 truncate text-[11px] text-zinc-400">
                          🔗 {item.href}
                        </div>
                      ) : null}
                      {item.image_url ? (
                        <div className="mt-0.5 flex items-center gap-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.image_url}
                            alt=""
                            className="h-6 w-6 rounded object-cover border border-zinc-200"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                          />
                          <span className="truncate text-[11px] text-zinc-400 max-w-[140px]">{item.image_url}</span>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1">
                      <button
                        disabled={saving || index === 0}
                        onClick={() => onMove(item, -1)}
                        className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 disabled:opacity-40 hover:bg-zinc-50"
                        title="Subir"
                        aria-label="Subir"
                      >
                        ↑
                      </button>
                      <button
                        disabled={saving || index === items.length - 1}
                        onClick={() => onMove(item, 1)}
                        className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 disabled:opacity-40 hover:bg-zinc-50"
                        title="Bajar"
                        aria-label="Bajar"
                      >
                        ↓
                      </button>
                      {onEditImage ? (
                        <button
                          disabled={saving}
                          onClick={() => onEditImage(item)}
                          className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-zinc-600 disabled:opacity-40 hover:bg-zinc-50"
                          title="Editar URL de imagen"
                          aria-label="Editar URL de imagen"
                        >
                          🖼 URL
                        </button>
                      ) : null}
                      {onUploadImage ? (
                        <button
                          disabled={saving}
                          onClick={() => onUploadImage(item)}
                          className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-zinc-600 disabled:opacity-40 hover:bg-zinc-50"
                          title="Subir imagen"
                          aria-label="Subir imagen"
                        >
                          📤 Img
                        </button>
                      ) : null}
                      {onEditLink ? (
                        <button
                          disabled={saving}
                          onClick={() => onEditLink(item)}
                          className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-zinc-600 disabled:opacity-40 hover:bg-zinc-50"
                          title="Editar enlace"
                          aria-label="Editar enlace"
                        >
                          🔗 Link
                        </button>
                      ) : null}
                      <button
                        disabled={saving}
                        onClick={() => onDelete(item.id)}
                        className="rounded border border-rose-300 bg-rose-50 px-1.5 py-0.5 text-rose-700 disabled:opacity-40 hover:bg-rose-100"
                        title="Eliminar ítem"
                        aria-label="Eliminar ítem"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-3 text-center text-xs text-zinc-500">No hay ítems curados todavía.</div>
        )}
      </div>

      {!itemsLoading && items.length === 0 ? (
        <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          ⚠️ Este bloque no tiene contenido curado; añade elementos antes de publicar.
        </div>
      ) : null}
    </div>
  );
}
