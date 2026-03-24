# Home Builder

## Overview
The homepage is now controlled by **Home Layouts** and **Sections**.

## Publish flow
1. Go to Admin → Contenido Home → Home Builder.
2. Create a layout.
3. Add sections and configure each section JSON config.
4. Click **Publish layout** to activate it for that locale.

## Supported section types
- HERO_CAROUSEL
- CATEGORY_STRIP
- PRODUCT_CAROUSEL
- BRAND_STRIP
- VALUE_PROPS
- CUSTOM_HTML

## API
- `GET /home`
- `GET /admin/home/layouts`
- `POST /admin/home/layouts`
- `PUT /admin/home/layouts/:id`
- `POST /admin/home/layouts/:id/clone`
- `DELETE /admin/home/layouts/:id`
- `GET /admin/home/layouts/:id/sections`
- `POST /admin/home/layouts/:id/sections`
- `PUT /admin/home/sections/:sectionId`
- `DELETE /admin/home/sections/:sectionId`
- `POST /admin/home/sections/:sectionId/move`
- `GET /admin/home/sections/:sectionId/items`
- `POST /admin/home/sections/:sectionId/items`
- `PUT /admin/home/items/:itemId`
- `DELETE /admin/home/items/:itemId`
- `POST /admin/home/items/reorder`
- `GET /admin/home/preview?layoutId=...`


## Section config: rows

`PRODUCT_CAROUSEL` and `BRAND_STRIP` support multi-row grid layout via:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `rows_desktop` | int 1–4 | 1 | Rows visible on desktop. 1 = horizontal carousel. 2+ = responsive grid. |
| `rows_mobile`  | int 1–4 | 1 | Rows visible on mobile.  1 = horizontal carousel. 2+ = responsive grid. |

When `rows > 1`, the section switches from a horizontal scroll carousel to a CSS grid showing `cols × rows` items.

- Open `/store?previewLayoutId=<layout-id>` to preview a draft layout without publishing.

## Utilities added
- **Add starter pack**: creates a ready-to-use section set (hero, categories, deals, arrivals, brands, value props, chips).
- **Clone layout**: duplicates layouts including section ordering.
- **Delete layout**: removes obsolete drafts quickly.
- **Admin options endpoint**: `GET /admin/home/options?target=products|categories|brands|banners&q=...&limit=...` to support searchable pickers.
