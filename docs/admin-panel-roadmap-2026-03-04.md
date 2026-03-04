# Roadmap de mejoras para el panel de administración

Fecha: 2026-03-04

## Contexto actual observado

El panel ya incluye módulos operativos importantes (dashboard, productos, pedidos, cupones, pricing, chat y gestión de contenido home), pero todavía hay oportunidades claras para subir nivel en control operativo, seguridad y productividad del equipo interno.

## Propuesta priorizada

### P0 — Impacto inmediato (2–4 semanas)

1. **RBAC real por permisos finos**
   - Definir permisos por recurso/acción (`products:write`, `orders:refund`, `pricing:approve`, etc.).
   - Añadir perfiles base: `super-admin`, `ops`, `marketing`, `read-only`.
   - Mostrar/ocultar acciones en UI según permisos efectivos.

2. **Bitácora de auditoría (quién, qué, cuándo, antes/después)**
   - Registrar cambios sensibles: precios, cupones, estados de pedido, banners, featured products.
   - Incluir metadata mínima: usuario, fecha/hora, IP, payload diff, resultado.
   - Añadir buscador por entidad, usuario y rango de fechas.

3. **Acciones masivas en tablas**
   - Productos: activar/desactivar, cambiar categorías, exportar CSV.
   - Pedidos: actualización masiva de estados internos, export de picking.
   - Cupones: activar/pausar por lote.

4. **Dashboard con alertas accionables**
   - Alertas visibles con severidad (`error`, `warning`, `info`).
   - Ejemplos: subida anómala de pagos fallidos, productos sin stock top ventas, errores de importación.
   - Cada alerta con CTA directo a la pantalla de resolución.

### P1 — Eficiencia operativa (1–2 meses)

5. **Centro de operaciones de importación/sincronización**
   - Historial unificado de jobs (catálogo, stock, precios, imágenes).
   - Reintentos manuales y automáticos con motivo.
   - Vista diff: altas, bajas y cambios de precio relevantes.

6. **Flujos de aprobación para cambios sensibles**
   - Cambios en pricing y promociones con estado `draft -> pending -> approved -> published`.
   - Regla de 4 ojos para descuentos agresivos o márgenes bajos.

7. **Filtros guardados y vistas personalizadas**
   - Guardar búsquedas frecuentes por usuario/equipo.
   - Vistas tipo “Pedidos pendientes de hoy”, “Productos sin imagen”, “Cupones que caducan en 7 días”.

8. **Mejoras de soporte postventa**
   - Timeline técnico por pedido (eventos de pago, fulfillment, emails enviados).
   - Notas internas y etiquetas para incidencias.
   - Reenvío controlado de emails transaccionales.

### P2 — Escalado y gobernanza (2–3 meses)

9. **Módulo de devoluciones (RMA) completo**
   - Estados estándar (`requested`, `approved`, `received`, `refunded`).
   - Plantillas de comunicación y trazabilidad por item.

10. **Observabilidad operativa integrada**
   - Widgets de salud de API/colas/webhooks.
   - Enlaces profundos a errores de backend por correlación de `requestId`.

11. **Centro de configuración y cumplimiento**
   - Gestión de plantillas de email, textos legales/versionado y parámetros globales.
   - Historial de cambios de configuración con rollback básico.

12. **KPIs comerciales avanzados**
   - Evolución de margen, ratio de descuentos, eficacia de cupones, top categorías por contribución.
   - Segmentación por canal/campaña cuando aplique.

## Quick wins de UX recomendados

- Atajos de teclado para crear producto/cupón/pedido manual.
- Confirmaciones con contexto en acciones destructivas.
- Estados vacíos con CTA concretos.
- Mejor feedback de carga/error por tabla y por acción.
- Consistencia de traducciones ES/EN en navegación y títulos.

## Métricas para medir mejora

- Tiempo medio para resolver incidencias operativas (MTTR interno).
- Tiempo de gestión por pedido (creación de envío, actualización de estado, soporte).
- Reducción de errores manuales en pricing/promociones.
- Adopción de acciones masivas y filtros guardados.
- % de cambios sensibles con trazabilidad completa en auditoría.
