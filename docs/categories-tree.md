# Categories Tree

## Backend API

- `GET /user/categories/tree?maxDepth=5`
  - Returns hierarchical categories (`items`) with `children` recursively.
  - Sorted by `sort_order ASC`, then `name ASC`.
  - Uses only active categories (`is_active=true`).
  - Missing or invalid parent categories are promoted to top level.
  - Cycles are detected and skipped with a warning log.
  - Cached in-memory for 5 minutes per query key.

- `GET /user/categories/search?q=cpu&maxDepth=5`
  - Returns matching categories with path and ancestor metadata for drawer search UX.

## Cache invalidation

- Category tree cache is invalidated from admin category creation (`POST /admin/categories`).
- For any future category update/delete endpoints, call `CategoriesService.invalidateTreeCache()`.

## Store UX

- Mobile: `CategoryDrawer` supports drilldown, back, breadcrumb and "View all" links.
- Desktop: `CategoryMegaMenu` exposes a 3-column hierarchy (parent / child / grandchild).
- PLP filters: `CategoryTreeFilter` renders category checkboxes in collapsible tree form.
