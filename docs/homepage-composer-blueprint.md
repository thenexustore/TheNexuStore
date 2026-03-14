# Blueprint técnico — Home Composer (Página principal)

## 1) Objetivo
Construir una pestaña de **Página principal** que permita a negocio/marketing:
- Crear múltiples layouts de home (por locale/campaña).
- Componer la home por bloques reordenables (drag & drop).
- Configurar carruseles de todo tipo (marcas, categorías, novedades, ofertas, etc.).
- Publicar con validaciones y preview en tiempo real.

Este blueprint está pensado para que sea útil a nivel producto y directamente ejecutable por desarrollo.

---

## 2) Estado actual (base sobre la que apoyarnos)

### 2.1 Lo que ya existe y podemos reutilizar
1. **Builder por layouts en backend**
   - Endpoints CRUD de layouts, secciones, items, move/reorder y preview.
   - Endpoint público `GET /home` para resolver layout activo.
2. **Sistema de secciones dinámicas legacy**
   - Admin en `/homepage-sections` con tipos de bloque y configs avanzadas.
   - Rendering dinámico en Store (`HomeDynamicSections`) para banners/carruseles/etc.
3. **Search options**
   - Endpoints para buscar productos/categorías/marcas/banners en pickers.

### 2.2 Riesgo actual
Tenemos dos enfoques conviviendo (layouts + homepage-sections legacy). Esto genera deuda y confusión.

**Decisión propuesta:** unificar en **Home Composer (layouts)** y dejar el sistema legacy como fallback temporal.

---

## 3) Arquitectura funcional objetivo

## 3.1 IA de la pantalla Admin: `Página principal`

### A. Header de contexto
- Selector de locale.
- Selector de layout activo/borrador.
- Estado: `Draft` / `Active` / `Scheduled`.
- Acciones: `Preview`, `Guardar`, `Publicar`, `Clonar`, `Eliminar`.

### B. Columna izquierda: Biblioteca de bloques
- Botones para crear bloque:
  - Hero Carousel
  - Product Carousel
  - Brand Carousel
  - Category Carousel/Grid
  - New Arrivals
  - Best Deals
  - Featured Picks
  - Trust Bar
  - Newsletter
  - Custom HTML (opcional en fase posterior)

### C. Centro: Canvas (orden y composición)
- Lista de bloques con drag & drop.
- Cada bloque muestra:
  - Tipo + título
  - Estado habilitado
  - Badges de data source (`Auto`, `Rule`, `Curated`)
  - Botones rápidos: Duplicar, Mover, Deshabilitar, Eliminar
- Posibilidad de colapsar/expandir bloque.

### D. Derecha: Inspector del bloque seleccionado
- Formulario según tipo de bloque.
- Secciones estándar:
  1. Contenido (title/subtitle/CTA)
  2. Fuente de datos
  3. Comportamiento visual (autoplay, items per viewport)
  4. Reglas/filtros
  5. Estado + métricas básicas del bloque

---

## 4) Modelo de bloques (contrato técnico)

## 4.1 Estructura común (sección)
```ts
interface HomeComposerSection {
  id: string;
  type: HomeSectionType;
  title?: string;
  subtitle?: string;
  position: number;
  is_enabled: boolean;
  variant?: string;
  config: Record<string, unknown>;
}
```

## 4.2 Tipos de bloque + config sugerida

### HERO_CAROUSEL
```json
{
  "autoplay": true,
  "interval_ms": 5000,
  "height": "lg",
  "overlay": "dark"
}
```
Data via `items` de tipo `BANNER`.

### PRODUCT_CAROUSEL (base para nuevas variantes)
```json
{
  "mode": "rule",      // rule | curated
  "source": "NEW_ARRIVALS", // NEW_ARRIVALS | BEST_DEALS | FEATURED | CATEGORY | BRAND
  "limit": 12,
  "inStockOnly": true,
  "featuredOnly": false,
  "categoryId": null,
  "brandId": null,
  "priceMin": null,
  "priceMax": null,
  "sortBy": "newest",
  "autoplay": true,
  "interval_ms": 4500,
  "items_mobile": 2,
  "items_tablet": 3,
  "items_desktop": 4,
  "show_view_all": true,
  "view_all_href": "/products"
}
```
Data:
- `mode=rule`: query automática.
- `mode=curated`: usar `items` tipo `PRODUCT` y mantener orden manual.

### BRAND_STRIP
```json
{
  "mode": "auto",      // auto | curated
  "limit": 12,
  "autoplay": true,
  "interval_ms": 4500,
  "items_mobile": 2,
  "items_desktop": 6
}
```

### CATEGORY_STRIP
```json
{
  "mode": "auto",      // auto | curated
  "limit": 10,
  "show_product_count": true,
  "items_mobile": 2,
  "items_desktop": 6
}
```

### VALUE_PROPS / TRUST_BAR
```json
{
  "items": [
    { "icon": "truck", "text": "Entrega 24/48h" },
    { "icon": "shield", "text": "Pago seguro" }
  ]
}
```

### NEWSLETTER
```json
{
  "title": "Suscríbete a nuestra newsletter",
  "subtitle": "Recibe ofertas y novedades.",
  "placeholder": "Tu email",
  "button_text": "Suscribirme",
  "button_link": "/register"
}
```

---

## 5) UX operativa (cómo lo usará negocio)

1. Crear layout borrador por locale/campaña.
2. Añadir bloques desde biblioteca.
3. Reordenar con drag & drop.
4. Configurar cada bloque desde inspector.
5. Previsualizar en Store con enlace compartible.
6. Pasar validaciones.
7. Publicar (activando layout para locale).

---

## 6) Validaciones (Publish Guardrails)

## 6.1 Bloqueantes (impiden publicar)
- No existe bloque Hero visible.
- Hay secciones habilitadas sin datos (excepto tipos permitidos).
- Configuración inválida (limit <= 0, items inválidos, UUID incorrecto).
- Más de 1 layout activo por locale.

## 6.2 Advertencias (permiten publicar)
- Solape alto entre carruseles de producto (>60% repetición).
- Carrusel de marcas con logos faltantes.
- Sección sin título.
- Más de N bloques above-the-fold (riesgo de performance/UX).

---

## 7) Plan de implementación por fases

## Fase 1 — MVP funcional (rápida)
**Objetivo:** entregar Home Composer usable con mínimo riesgo.

- Crear nueva ruta admin: `/home-composer`.
- Reusar APIs de `homeBuilderApi` existentes.
- Implementar:
  - selector layout + locale
  - listado de secciones con reordenación
  - creación/edición de bloques básicos
  - preview link
  - publish layout
- Mantener `/homepage-sections` como legacy sin romper.

**Criterio de salida:** negocio puede montar home con bloques y publicar por locale.

## Fase 2 — Experiencia avanzada
- Drag & drop completo con UX pulida.
- Inspector contextual completo por tipo.
- Curación de items con buscadores + reorder in-block.
- Duplicar bloque.
- Presets de home (Electrónica, Gaming, etc.).

## Fase 3 — Calidad y escalado
- Diagnósticos avanzados y health score.
- Programación de publicación (start/end).
- Métricas por bloque (CTR, conversion asistida, revenue share).
- A/B variants por sección (variant A/B).

---

## 8) Mapeo técnico con backend actual

## 8.1 Endpoints a usar (ya disponibles)
- `GET /admin/home/layouts`
- `POST /admin/home/layouts`
- `PUT /admin/home/layouts/:id`
- `POST /admin/home/layouts/:id/clone`
- `DELETE /admin/home/layouts/:id`
- `GET /admin/home/layouts/:id/sections`
- `POST /admin/home/layouts/:id/sections`
- `PUT /admin/home/sections/:sectionId`
- `POST /admin/home/sections/:sectionId/move`
- `GET /admin/home/sections/:sectionId/items`
- `POST /admin/home/sections/:sectionId/items`
- `PUT /admin/home/items/:itemId`
- `POST /admin/home/items/reorder`
- `GET /admin/home/preview?layoutId=...`

## 8.2 Decisiones de compatibilidad
- Mantener `GET /home` como fuente principal para Store.
- Mantener legacy (`/homepage/sections`) solo durante transición.
- Añadir feature flag admin: `HOME_COMPOSER_ENABLED` para roll-out progresivo.

---

## 9) Estructura de frontend propuesta

```txt
Frontend/admin/app/(dashboard)/home-composer/page.tsx
Frontend/admin/app/components/home-composer/
  ├─ HomeComposerShell.tsx
  ├─ LayoutSelector.tsx
  ├─ BlockLibrary.tsx
  ├─ CanvasSectionList.tsx
  ├─ SectionCard.tsx
  ├─ SectionInspector/
  │   ├─ SectionInspector.tsx
  │   ├─ ProductCarouselInspector.tsx
  │   ├─ HeroInspector.tsx
  │   ├─ BrandStripInspector.tsx
  │   ├─ CategoryStripInspector.tsx
  │   └─ NewsletterInspector.tsx
  └─ PublishChecklist.tsx
Frontend/admin/lib/api/home-builder.ts (reuso + extensiones mínimas)
```

---

## 10) Definiciones importantes para negocio (lenguaje común)

- **Layout:** versión completa de home para un locale.
- **Bloque/Sección:** módulo visual (hero, carrusel, newsletter...)
- **Auto:** se llena automáticamente según reglas por defecto.
- **Rule:** se llena por filtros (categoría, marca, precio, stock...).
- **Curated:** selección manual de elementos con orden fijo.
- **Publish:** activar layout para que se vea en producción.

---

## 11) Próxima acción recomendada (concreta)

1. Implementar **Fase 1** en una PR:
   - crear `/home-composer`
   - reusar `homeBuilderApi`
   - mover redirect de `/home-builder` al nuevo composer
2. Dejar botón “Volver a legacy” durante transición.
3. Validar con negocio 3 plantillas iniciales:
   - Home General
   - Home Gaming
   - Home Networking

Con esto tendremos base sólida para evolucionar sin rehacer backend.


---

## 12) Verificación visual en entorno de desarrollo (Playwright)

Para evitar falsos negativos en capturas/QA visual del Home Composer:

1. Arrancar Admin en `:3000` con:
   - `npm --prefix Frontend/admin run dev -- --hostname 0.0.0.0 --port 3000`
2. Confirmar respuesta antes de Playwright:
   - `curl -I http://127.0.0.1:3000/home-composer`
3. Solo entonces ejecutar screenshot/UI checks.

Referencia operativa detallada:
- `docs/home-composer-playwright-checklist.md`
