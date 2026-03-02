# Infortisa taxonomy recommendation for menu

Recommended parent categories for the storefront menu (more intuitive and commercial):

1. Ordenadores y portátiles
2. Componentes y almacenamiento
3. Monitores y periféricos
4. Impresión y escaneado
5. Redes y servidores
6. Telefonía y movilidad
7. TV, audio y vídeo
8. Software y seguridad
9. Gaming y smart home
10. Accesorios y consumibles (fallback)

## Automatic import strategy

During each Infortisa product import:

1. Read `TITULO_FAMILIA` and `TITULOSUBFAMILIA` from the Infortisa payload.
2. Score every parent category with weighted keyword matching:
   - family keyword matches add higher weight
   - subfamily keyword matches add medium weight
   - in ties, keep the most business-relevant top-level menu order
3. Upsert the parent category (`parent_id = null`) with a stable `sort_order`.
4. Upsert the Infortisa subfamily as a child category (`parent_id = parent.id`) using a deterministic slug.
5. Assign that child as `main_category` and ensure it is attached in `product_categories`.

This gives users a predictable, attractive menu while still preserving Infortisa granularity at subcategory level.
