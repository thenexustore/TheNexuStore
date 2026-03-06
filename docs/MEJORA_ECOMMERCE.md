# Plan de mejora para que el ecommerce funcione de punta a punta

## Diagnóstico rápido del estado actual

Tras revisar el código del backend y frontend, el flujo de compra existe (carrito → checkout → orden), pero hay brechas que impiden operar en producción con fiabilidad:

1. **El checkout crea una intención de pago simulada** y no confirma pagos reales con pasarelas (Redsys/Stripe/PayPal), lo que deja pedidos en estados intermedios.  
2. **No hay cierre robusto del ciclo de pedido** (autorización/captura/webhook/reconciliación), así que stock y estado pueden desalinearse.  
3. **No existe una validación operativa integral de “ecommerce listo”** (catálogo activo + stock + precio + shipping + pago), por lo que el sistema puede levantar “en verde” sin vender realmente.

---

## Mejora propuesta (prioridad alta)

### Implementar un **Order Orchestrator** con pagos reales y reconciliación

Objetivo: convertir el checkout en un flujo transaccional y auditable donde cada pedido avance de forma confiable.

### Alcance funcional

- Integrar pasarela real (empezar con **Redsys** o **Stripe**).
- Crear endpoints de **webhook** firmados para eventos de pago.
- Añadir máquina de estados de pedido/pago con transiciones válidas:
  - `PENDING_PAYMENT -> PAID -> PROCESSING -> SHIPPED -> DELIVERED`
  - Manejo de `FAILED` y `CANCELLED` con liberación de stock.
- Programar job de reconciliación (cada X minutos):
  - reintentar pedidos atascados en `PENDING_PAYMENT`
  - verificar pagos “huérfanos”
  - corregir divergencias de stock reservado.

### Cambios técnicos sugeridos

1. **Backend (checkout/pagos)**
   - Reemplazar `createPaymentIntent` simulado por adaptadores de proveedor:
     - `PaymentGatewayRedsys`
     - `PaymentGatewayStripe`
   - Registrar `provider_payment_id` real, firma, payload y evento en tabla de auditoría.
   - Confirmar el pedido **solo** tras confirmación criptográfica de pasarela.

2. **Inventario**
   - Mantener reserva al crear pedido.
   - Liberar reserva automáticamente en timeout/fallo de pago.
   - Confirmar decremento definitivo al pasar a `PAID/PROCESSING`.

3. **Frontend Store**
   - Pantalla de “pago en proceso” y polling de estado de pedido.
   - Manejo explícito de error de pago con CTA de reintento.

4. **Operación**
   - Añadir smoke test de negocio:
     - crear carrito
     - checkout
     - simular callback
     - validar transición de estado.

---

## Plan por fases (2 semanas)

### Fase 1 (Días 1-3): Base de pagos reales
- Contrato único `PaymentGateway`.
- Integración de un proveedor.
- Webhook firmado y persistencia de eventos.

### Fase 2 (Días 4-7): Orquestación de pedido
- Reglas de transición de estados.
- Timeout de pago + liberación de stock.
- Reconciliador por cron/cola.

### Fase 3 (Días 8-10): Frontend y UX
- UI de estado de pago.
- Recuperación ante fallo y reintento.
- Mensajería transaccional (email/track).

### Fase 4 (Días 11-14): Hardening
- Tests e2e del ciclo completo.
- Métricas (tasa de conversión checkout, pagos fallidos, stock bloqueado).
- Alertas operativas.

---

## KPI de éxito

- >95% pedidos pasan de `PENDING_PAYMENT` a estado final en <10 min.
- <1% divergencia entre stock reservado y stock real.
- 0 pedidos “pagados sin confirmar” o “confirmados sin pago”.
- Conversión checkout +10% tras mejorar UX de pago/reintento.

---

## Riesgos y mitigación

- **Riesgo:** duplicación de callbacks de pasarela.  
  **Mitigación:** idempotencia por `provider_payment_id + event_id`.

- **Riesgo:** carreras en reserva/liberación de stock.  
  **Mitigación:** operaciones atómicas + reconciliación periódica.

- **Riesgo:** discrepancia entre estados de proveedor y pedido local.  
  **Mitigación:** job de reconciliación y tablero de excepciones.

---

## Resultado esperado

Con esta mejora, el ecommerce pasa de “checkout funcional en desarrollo” a “operación real vendible”, con control de pagos, inventario y trazabilidad completa de pedidos.
