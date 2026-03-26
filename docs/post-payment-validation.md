# Post-payment operational validation

After payment capture, backend runs an automatic operational validation step:

- If validation passes, order transitions `PAID -> PROCESSING`.
- If validation fails, order transitions `PAID -> ON_HOLD` and an `[AUTO_VALIDATION]` admin note is stored with reasons.

## Current minimal validation rules

1. **Price mismatch check**: compares order item `unit_price` snapshot vs current SKU sale price.
2. **Stock check**:
   - Internal fulfillment: aggregated available inventory (`qty_on_hand - qty_reserved`) must satisfy quantity.
   - Supplier fulfillment: `supplier_stock.qty_available` must satisfy quantity.
3. **Supplier availability signal**: if `availability_code` exists and is one of known blocking codes
   (`OUT_OF_STOCK`, `NO_STOCK`, `UNAVAILABLE`, `NOT_AVAILABLE`, `SIN_STOCK`), order is held.

## ETA fallback

There is no consistently reliable ETA field in the current model for all fulfillment types.
For safety, availability code is used when present; if ETA is absent, validation relies on stock + price checks.
