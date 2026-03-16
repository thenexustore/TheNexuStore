# Home Admin Panel Refactor - Estado actual

## Alcance completado

- Conexión Admin → Store estabilizada con fallback entre `/homepage/sections` y `/api/carousels/config`.
- Endpoints de soporte para carruseles/datos dinámicos en backend:
  - `GET /api/carousels/config`
  - `GET /api/products`
  - `GET /api/categories`
  - `GET /api/brands`
  - `GET /api/admin/trust-items`
- Modularización en Store:
  - `GenericCarousel`
  - `BrandCarousel`
  - `TrustBar`
- Admin con CRUD/reorder/preview para secciones de homepage.
- Preview en tiempo real para edición de homepage con stream SSE (`/homepage/sections/stream`) y fallback polling.
- Acción de admin “Aplicar flujo recomendado” para crear secuencia base de bloques.
- Soporte de sección opcional `NEWSLETTER` en backend, admin y store dinámico.
- Tests unitarios añadidos para `CarouselsController`.

## Estado

- ✅ No quedan pendientes funcionales del alcance original de refactorización de Home Admin Panel.
- ℹ️ Siguientes mejoras (opcionales): métricas de conversión para newsletter y analítica por sección.

## Nota de fuente de verdad (2026-03)

- **Storefront usa `GET /home` (Home Layout Builder) como fuente principal**.
- `GET /homepage/sections` y `GET /api/carousels/config` permanecen como **legacy/fallback de transición**.
- El panel legacy `/homepage-sections` debe usarse solo para migración controlada o rollback, no como flujo editorial principal.
