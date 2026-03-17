# Categories Tree

## Backend API

- `GET /user/categories/tree?maxDepth=5`
  - Returns hierarchical categories (`items`) with `children` recursively.
  - Sorted by `sort_order ASC`, then `name ASC`.
  - Uses only active categories (`is_active=true`).
  - Missing or invalid parent categories are promoted to top level.
  - Cycles are detected and skipped with a warning log.
  - Cached in-memory for 5 minutes per query key.
  - **Seeded parent categories with no children are included** (with `children: []`).

- `GET /user/categories/search?q=cpu&maxDepth=5`
  - Returns matching categories with path and ancestor metadata for drawer search UX.

- `GET /admin/categories/taxonomy-status` (admin auth required)
  - Returns taxonomy health: parents status, orphaned categories, and aggregate stats.
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

## Store UX

- Mobile: `CategoryDrawer` supports drilldown, back, breadcrumb and "View all" links.
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
