# Infortisa taxonomy recommendation for menu

Canonical taxonomy source-of-truth is the backend category tree (`/user/categories/tree`) and the category table hierarchy (`parent_id`, `sort_order`, `slug`).

The single source of truth for the taxonomy is `MENU_PARENT_TAXONOMY` constant in `src/infortisa/infortisa-category-mapping.util.ts`. Both the seed script and the import logic read from there.

## Canonical parent categories

| # | Name | Slug | sort_order |
|---|------|------|-----------|
| 1 | Ordenadores y portátiles | `ordenadores-portatiles` | 10 |
| 2 | Componentes y almacenamiento | `componentes-almacenamiento` | 20 |
| 3 | Monitores y periféricos | `monitores-perifericos` | 30 |
| 4 | Impresión y escaneado | `impresion-escaneado` | 40 |
| 5 | Redes y servidores | `redes-servidores` | 50 |
| 6 | Telefonía y movilidad | `telefonia-movilidad` | 60 |
| 7 | TV, audio y vídeo | `tv-audio-video` | 65 |
| 8 | Software y seguridad | `software-seguridad` | 70 |
| 9 | Gaming y smart home | `gaming-smart-home` | 80 |
| 10 | Accesorios y consumibles | `accesorios-consumibles` | 90 (fallback) |

## Seeding canonical parent categories

Run the following command to ensure all 10 canonical parent categories exist in the database (idempotent — safe to run multiple times):

```bash
cd Backend/Store
npm run seed:categories
```

This script (`prisma/seed-parent-categories.ts`) uses Prisma `upsert` by slug, sets `parent_id: null`, `is_active: true`, and `parent_locked: true` so that imports cannot re-parent them.

## Automatic import strategy

During each Infortisa product import (both `user/products` and `admin/products` flows):

1. Read `FamilyName`/`TITULO_FAMILIA` and `SubfamilyName`/`TITULOSUBFAMILIA` from the Infortisa payload.
2. Score every parent category with weighted keyword matching:
   - family keyword matches add +3 score
   - subfamily keyword matches add +2 score
   - in ties, keep the most business-relevant top-level menu order (lower `sort_order` wins)
3. Upsert the parent category (`parent_id = null`) using a stable taxonomy key slug and stable `sort_order`.
4. Upsert the Infortisa subfamily as a child category (`parent_id = parent.id`) using deterministic slug `${parentSlug}-${subfamilySlug}`.
5. Respect `parent_locked` and only re-parent unlocked categories when the current parent is not a known canonical parent.
6. Assign that child as `main_category` and ensure it is attached in `product_categories`.

This ensures repeated import/export cycles keep a deterministic hierarchy with stable slug identity.

## Admin taxonomy status endpoint

`GET /admin/categories/taxonomy-status` (requires admin auth) returns:

```json
{
  "parents": [
    {
      "slug": "ordenadores-portatiles",
      "name": "Ordenadores y portátiles",
      "is_active": true,
      "child_count": 15,
      "product_count": 230,
      "is_seeded": true
    }
  ],
  "orphaned_categories": [
    { "id": "...", "name": "...", "slug": "...", "parent_id": null, "product_count": 5 }
  ],
  "stats": {
    "total_categories": 150,
    "total_parents": 10,
    "total_children": 120,
    "total_orphaned": 20,
    "total_with_products": 80
  }
}
```

Use this endpoint to audit the health of the category taxonomy after imports.

## Notes for future provider integrations

- Add provider-specific keyword mapping to `MENU_PARENT_TAXONOMY` entries in `infortisa-category-mapping.util.ts`.
- The admin import flow (`admin/products/products.service.ts`) now uses the same taxonomy system as the user flow.
- The `DEFAULT_PARENT_CATEGORY` (Accesorios y consumibles) is the safe fallback for any product whose family/subfamily does not match any keyword.
