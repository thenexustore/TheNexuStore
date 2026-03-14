import { HomeOption, HomeSectionItem } from "./types";

type CuratedTarget = "products" | "brands" | "categories";

const TARGET_LABEL: Record<CuratedTarget, string> = {
  products: "productos",
  brands: "marcas",
  categories: "categorías",
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
}: Props) {
  return (
    <div className="rounded-xl border border-zinc-200 p-3">
      <div className="mb-1 text-sm font-medium">Selección manual ({TARGET_LABEL[currentTarget]})</div>
      <p className="mb-3 text-xs text-zinc-500">
        Añade elementos y ordénalos. El orden aquí será el orden de visualización en tienda.
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-700">Añadidos: {items.length}</span>
        <span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-700">Límite: {curatedLimit}</span>
        <span
          className={`rounded-full px-2 py-1 ${
            curatedRemaining === 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {curatedRemaining === 0 ? "Límite alcanzado" : `Disponibles: ${curatedRemaining}`}
        </span>
      </div>

      <div className="mb-3 grid gap-2">
        <input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={`Buscar ${TARGET_LABEL[currentTarget]}...`}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <div className="max-h-40 space-y-1 overflow-auto rounded-lg border border-zinc-200 p-2">
          {optionsLoading ? (
            <div className="text-xs text-zinc-500">Buscando...</div>
          ) : searchOptions.length ? (
            searchOptions.map((option) => {
              const alreadyAdded = items.some((item) => {
                if (currentTarget === "products") return item.product_id === option.id;
                if (currentTarget === "brands") return item.brand_id === option.id;
                return item.category_id === option.id;
              });

              return (
                <button
                  key={option.id}
                  disabled={saving || alreadyAdded || curatedRemaining === 0}
                  onClick={() => onAdd(option)}
                  className="flex w-full items-center justify-between rounded-md border border-zinc-200 px-2 py-1 text-left text-xs hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="truncate pr-2">{option.label}</span>
                  <span>{alreadyAdded ? "Añadido" : "Añadir"}</span>
                </button>
              );
            })
          ) : (
            <div className="text-xs text-zinc-500">Sin resultados</div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 p-2">
        <div className="mb-2 text-xs font-medium text-zinc-500">Orden actual</div>
        {itemsLoading ? (
          <div className="text-xs text-zinc-500">Cargando ítems...</div>
        ) : items.length ? (
          <div className="space-y-1">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-md border border-zinc-200 px-2 py-1 text-xs"
              >
                <span className="truncate pr-2">
                  {item.label || item.product_id || item.brand_id || item.category_id || item.id}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={saving || index === 0}
                    onClick={() => onMove(item, -1)}
                    className="rounded border border-zinc-300 px-1 disabled:opacity-50"
                    title="Subir"
                  >
                    ↑
                  </button>
                  <button
                    disabled={saving || index === items.length - 1}
                    onClick={() => onMove(item, 1)}
                    className="rounded border border-zinc-300 px-1 disabled:opacity-50"
                    title="Bajar"
                  >
                    ↓
                  </button>
                  <button
                    disabled={saving}
                    onClick={() => onDelete(item.id)}
                    className="rounded border border-rose-300 px-1 text-rose-700 disabled:opacity-50"
                    title="Eliminar"
                  >
                    x
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-zinc-500">No hay ítems curados todavía.</div>
        )}
      </div>

      {!itemsLoading && items.length === 0 ? (
        <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-800">
          Este bloque está en modo curado pero no tiene contenido; añade elementos antes de publicar.
        </div>
      ) : null}
    </div>
  );
}
