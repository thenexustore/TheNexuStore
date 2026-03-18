# Categories Tree

## Backend API

- `GET /user/categories/tree?maxDepth=5`
  - Returns hierarchical categories (`items`) with `children` recursively.
  - The normalized hierarchy now aims for `abuelo → padre → hijo` in browsing terms:
    - **abuelo**: canonical top-level taxonomy buckets (existing parent categories / `virtual:*` roots),
    - **padre**: level-2 grouping categories inferred from the catalog domain (persisted on write for new imports/creations, synthesized only as fallback for legacy rows),
    - **hijo**: imported/store categories that keep the direct product relationship.
  - Sorted by `sort_order ASC`, then `name ASC`.
  - Uses only active categories (`is_active=true`).
  - Missing or invalid parent categories are promoted to top level.
  - Canonical parent aliases may be merged, missing canonical parents may be synthesized as `virtual:*` nodes, and synthetic level-2 parent buckets may be inserted before tree construction.
  - Cycles are detected and skipped with a warning log.
  - Cached in-memory for 5 minutes per query key.
  - **Seeded parent categories with no children are included** (with `children: []`).
  - `meta.normalization` exposes lightweight diagnostics for debugging deployed taxonomy issues:
    - `normalized_rows`
    - `root_nodes`
    - `virtual_parents`

- `GET /user/categories/search?q=cpu&maxDepth=5`
  - Returns matching categories with path and ancestor metadata for drawer search UX.

- `GET /admin/categories/taxonomy-status` (admin auth required)
  - Returns taxonomy health: parents status, orphaned categories, direct hijos colgando del abuelo, mismatched padre inference, redundant navigation candidates, aggregate stats, and summary groupings by padre actual/esperado to prioritize fixes.
  - Useful for auditing after bulk imports.

## Cache invalidation

- Category tree cache is invalidated from admin category creation (`POST /admin/categories`).
- For any future category update/delete endpoints, call `CategoriesService.invalidateTreeCache()`.

## Seeding canonical parent categories

To guarantee the 10 canonical parent categories exist in the database before any imports run:

```bash
cd Backend/Store
npm run seed:categories
```

The script uses `upsert` by slug so it is safe to run multiple times.

## Backfill legacy level-2 parents

If you already have legacy categories hanging directly from the canonical parent (or orphaned roots that are only normalized at read time), run:

```bash
cd Backend/Store
npm run categories:backfill-level2
```

- Default mode is **dry-run**.
- Add `--json` if you want a machine-readable audit report of the affected categorías hijo.
- Add `--output ./ruta/reporte.json` if you want to persist that audit payload to a file for later review.
- To persist changes for real:

```bash
cd Backend/Store
npm run categories:backfill-level2 -- --apply
```

The backfill will:
- ensure the canonical abuelo category exists,
- create the inferred padre category with the `*-familia-*` slug pattern if missing,
- and reparent the legacy hijo category under that padre.
- In non-JSON mode it also prints a preview of affected categories; in JSON mode it emits the full audit payload.
- With `--output`, it writes that same audit payload to disk.

## Targeted smoke before deploy

For the category normalization rollout, run this focused backend smoke before deploying changes that touch taxonomy inference, imports, or the admin taxonomy audit:

```bash
cd Backend/Store
npm run smoke:taxonomy-admin
```

This smoke intentionally covers:
- canonical parent inference and slug mapping (`infortisa-category-mapping.util.spec.ts`),
- admin taxonomy audit summaries (`admin-categories.service.spec.ts`),
- manual import/retry audit logging (`imports.controller.spec.ts`),
- and category/product filtering against the normalized hierarchy (`products.service.spec.ts`).

For local parity with CI on taxonomy/navigation changes, also run the TypeScript checks explicitly in both apps:

```bash
cd Backend/Store
npm run typecheck

cd ../../Frontend/Store
npm run typecheck
```

## Store UX

- Mobile: `CategoryDrawer` supports drilldown, back, breadcrumb and "View all" links.
- The drawer and desktop navigation consume the normalized 3-level taxonomy directly, so selecting an inferred level-2 parent slug still expands to the real descendant categories/products in PLP filters.
  - Parent categories display a Lucide icon matching their taxonomy key.
  - When a parent has no children yet (freshly seeded), shows: *"Próximamente: estamos preparando los productos de esta categoría."*
- Desktop: `CategoryMegaMenu` exposes a 3-column hierarchy (parent / child / grandchild).
  - Parent entries show a Lucide icon to the left of the name.
  - A subtle child count badge `(N)` is displayed next to the chevron when children exist.
  - When no subcategories are available, shows the "Próximamente" message.
- PLP filters: `CategoryTreeFilter` renders category checkboxes in collapsible tree form.

## Category icon mapping

Defined in `Frontend/Store/app/lib/category-icons.ts`. Maps parent category slug to a Lucide icon component:

| Slug | Icon |
|------|------|
| `ordenadores-portatiles` | `Laptop` |
| `componentes-almacenamiento` | `Cpu` |
| `monitores-perifericos` | `Monitor` |
| `impresion-escaneado` | `Printer` |
| `redes-servidores` | `Server` |
| `telefonia-movilidad` | `Smartphone` |
| `tv-audio-video` | `Tv` |
| `software-seguridad` | `Shield` |
| `gaming-smart-home` | `Gamepad2` |
| `accesorios-consumibles` | `Package` |

Use `getCategoryIcon(slug)` to get the component or `null` if no icon is mapped.
