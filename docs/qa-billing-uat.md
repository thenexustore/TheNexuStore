# Billing & Order Workflow UAT Checklist

## 1) Paid order expected state

- After successful payment capture, order should leave `PAID` automatically and move to:
  - `PROCESSING` when post-payment validation passes, or
  - `ON_HOLD` when validation detects mismatch/stock issues.
- A billing **draft** invoice must exist internally for the order.
- Customer must **not** see/download draft invoices.

## 2) ON_HOLD expected state

- Admin order detail should show order status `ON_HOLD`.
- Timeline/admin notes should include `[AUTO_VALIDATION][ON_HOLD] ...` reason.
- Operator can review and release hold through existing admin actions.

## 3) Delivered => final invoice release

- Final customer-visible invoice is issued only through delivery confirmation path.
- In admin order workflow, use **Mark delivered** (contextual in PROCESSING/SHIPPED) to issue and send final invoice.
- After delivery confirmation, invoice becomes visible to customer download endpoints.

## 4) Manual invoice sequence behavior

- Manual document creation defaults to `DRAFT` and does not consume final invoice sequence.
- Final number assignment occurs only on issue/convert finalization flows.
- Manual-issued and ecommerce-issued final invoices share the same INVOICE sequence.
- Manual number override is restricted (ADMIN-only exceptional path, finalized MANUAL invoices only).

## 5) Historical backfill operation (staging-safe)

- Use one of the controlled triggers:
  - Admin API: `POST /admin/billing/backfill-paid-orders`
  - Backend script: `cd Backend/Store && npm run billing:backfill-paid-orders`
- Backfill is idempotent and should not duplicate billing drafts for the same order.
