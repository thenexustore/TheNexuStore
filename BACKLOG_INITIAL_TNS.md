# BACKLOG_INITIAL_TNS — Initial Product/Technical Backlog

> Scope analyzed: backend (NestJS + Prisma), storefront (Next.js), admin (Next.js), docs, CI/CD, ops scripts, tests.
> Focus: execution-ready backlog for production eCommerce readiness.

---

## P0 — Critical stability / source-of-truth / production blockers

### TNS-P0-01 — Unify homepage architecture into one source-of-truth
- **Area/Module:** Home (Store + Admin + Backend)
- **Why it matters:** There are two active homepage systems (`home-layout` and `homepage-sections`) with separate models, endpoints and admin UIs, increasing regressions and content inconsistency.
- **Current status:** **legacy-risk**
- **Recommended action:** Define canonical homepage engine (recommended: layout-based `home/*` with curated item model), deprecate the other path with read-only compatibility layer and migration script.
- **Acceptance criteria:**
  - Single public store endpoint for homepage rendering.
  - Single admin composer UI in production nav.
  - Legacy endpoints marked deprecated and mapped or removed after data migration.
  - Existing published homepage renders identically pre/post migration.
- **Risk level:** **CRITICAL**

### TNS-P0-02 — Close security gap on Infortisa admin endpoints
- **Area/Module:** Integrations / Admin API / Infortisa
- **Why it matters:** `admin/infortisa/*` routes are exposed without guard-level protection, including destructive operations (e.g., clean DB, full sync trigger).
- **Current status:** **existing (unsafe)**
- **Recommended action:** Enforce `AdminGuard` + role/permission checks on entire controller; add route-level restrictions for dangerous operations and explicit audit logs.
- **Acceptance criteria:**
  - All `admin/infortisa/*` endpoints require authenticated staff token.
  - High-risk endpoints require admin role + dedicated permission.
  - Access attempts are audit logged (allowed/denied).
- **Risk level:** **CRITICAL**

### TNS-P0-03 — Fix order timeline and notes persistence (post-sale traceability)
- **Area/Module:** Orders / Admin timeline / Auditability
- **Why it matters:** Admin order notes currently return success without persisting data, breaking support workflows and compliance-grade traceability.
- **Current status:** **partial**
- **Recommended action:** Persist order notes (new table or structured audit events), surface in order timeline, and include actor metadata.
- **Acceptance criteria:**
  - Adding a note creates durable DB record.
  - Notes visible in order timeline and survive reload/restart.
  - Notes include actor, timestamp, and content.
- **Risk level:** **HIGH**

### TNS-P0-04 — Rationalize duplicated payment routes (`/payment` vs `/payments`)
- **Area/Module:** Checkout / Payments / Redsys callbacks
- **Why it matters:** Duplicate controller namespaces for same Redsys operations increase callback/config errors and operational confusion.
- **Current status:** **legacy-risk**
- **Recommended action:** Choose canonical namespace (recommended `/payments`), keep short-term aliases with deprecation warnings and metrics, then remove duplicates.
- **Acceptance criteria:**
  - One canonical endpoint set documented and used by env vars/deploy scripts.
  - Callback URLs configured to canonical path only.
  - Alias usage observable and near-zero before removal.
- **Risk level:** **HIGH**

### TNS-P0-05 — Enforce permission model end-to-end (RBAC hardening)
- **Area/Module:** Admin auth/authorization
- **Why it matters:** Permission decorators exist, but fine-grained permission governance is incomplete and inconsistent across modules.
- **Current status:** **partial**
- **Recommended action:** Define permission matrix by module/action, enforce by guard everywhere, and align UI controls to effective permissions.
- **Acceptance criteria:**
  - Permission matrix approved and versioned.
  - Protected endpoints have explicit permission checks.
  - Admin UI hides/disables actions without entitlement.
  - Automated tests for deny/allow scenarios.
- **Risk level:** **HIGH**

### TNS-P0-06 — Standardize eCommerce state machine (order/payment/refund/RMA)
- **Area/Module:** Orders lifecycle / Payments / RMAs / Refunds
- **Why it matters:** Core entities exist in schema, but operational transitions and reconciliation are not consistently orchestrated across all flows.
- **Current status:** **partial**
- **Recommended action:** Implement explicit transition rules and idempotent orchestration for payment confirmation, stock reserve/release, refunds, and RMA closure.
- **Acceptance criteria:**
  - Invalid transitions rejected consistently.
  - Idempotent processing for duplicate provider events.
  - Timeout/recovery job for stuck `PENDING_PAYMENT` orders.
  - Dashboard counters for stuck/failed transitions.
- **Risk level:** **CRITICAL**

### TNS-P0-07 — Add production-grade business smoke tests (cart → checkout → payment callback)
- **Area/Module:** QA / Playwright / API smoke
- **Why it matters:** Existing test coverage is mostly backend unit tests plus a single storefront mobile smoke; no deterministic end-to-end purchase reliability gate.
- **Current status:** **missing**
- **Recommended action:** Add API + browser e2e smoke suite for purchase happy path and payment failure path (including Redsys callback simulation).
- **Acceptance criteria:**
  - CI gate for smoke:ecommerce runs on PR and main.
  - Test covers cart creation, coupon apply, checkout, payment callback, order status update.
  - Artifacts captured on failure (trace/screenshots/logs).
- **Risk level:** **CRITICAL**

### TNS-P0-08 — Make CI release-quality (build + tests + contract checks mandatory)
- **Area/Module:** CI/CD / Delivery governance
- **Why it matters:** Current CI marks lint as advisory and does not enforce full build+test matrix for backend/store/admin release confidence.
- **Current status:** **partial**
- **Recommended action:** Harden pipeline with required build and test jobs, non-advisory lint baseline (phased), and minimum quality thresholds.
- **Acceptance criteria:**
  - Backend build + unit tests + critical e2e are required checks.
  - Store/admin build and typecheck are required checks.
  - Merge blocked when required checks fail.
- **Risk level:** **HIGH**

### TNS-P0-09 — Define canonical environment/runtime contract across apps
- **Area/Module:** Env management / Deploy / Ops
- **Why it matters:** Env fallbacks avoid crashes but can mask misconfiguration and lead to wrong-domain runtime behavior in production.
- **Current status:** **partial**
- **Recommended action:** Split strict prod env validation from dev fallback behavior; fail fast on invalid/missing production variables for all services.
- **Acceptance criteria:**
  - Production startup fails on invalid required public URLs and payment config.
  - `.env.example` contract aligned with runtime validation and deploy scripts.
  - Pre-deploy validation command executed in CI and deploy script.
- **Risk level:** **HIGH**

### TNS-P0-10 — Secure and version branding asset propagation
- **Area/Module:** Branding / Settings / Asset delivery
- **Why it matters:** Branding storage is file-based and propagated via localStorage/cookie snapshots; drift across Store/Admin and environments is likely.
- **Current status:** **partial**
- **Recommended action:** Move branding to DB-backed config with versioning and signed asset delivery strategy; keep file fallback only for migration period.
- **Acceptance criteria:**
  - Single persisted branding source with version history.
  - Store/admin consume same branding payload and cache-busting key.
  - Rollback path for branding changes.
- **Risk level:** **HIGH**

---

## P1 — Conversion / UX / admin productivity / commercial readiness

### TNS-P1-01 — Finalize homepage composer UX and remove overlapping admin paths
- **Area/Module:** Admin UX / Home composer
- **Why it matters:** `home-builder`, `home-composer`, and `homepage-sections` coexist and confuse operational users.
- **Current status:** **legacy-risk**
- **Recommended action:** Keep only one editor in nav, create migration helper, and add publish workflow with clear preview state.
- **Acceptance criteria:** single editor path, publish status indicator, no duplicated menu entries.
- **Risk level:** **HIGH**

### TNS-P1-02 — Taxonomy governance: category lifecycle (edit/move/disable) and nav consistency
- **Area/Module:** Categories / Navigation / Taxonomy
- **Why it matters:** Tree/search APIs are present, but category operations and governance are limited, risking menu/catalog drift.
- **Current status:** **partial**
- **Recommended action:** Add admin CRUD for category hierarchy changes with guardrails, reindex/cache invalidation and impact preview.
- **Acceptance criteria:** category move/disable updates storefront menu and filters deterministically.
- **Risk level:** **HIGH**

### TNS-P1-03 — Pricing + coupons transparency on PDP/PLP/cart/checkout
- **Area/Module:** Pricing / Promotions / Storefront
- **Why it matters:** Pricing engine and coupon backend exist; conversion depends on consistent discount display and explainability across pages.
- **Current status:** **partial**
- **Recommended action:** Normalize price components (base/sale/discount source) and UI labels end-to-end.
- **Acceptance criteria:** same discount math on PDP, listing, cart and checkout totals; no rounding mismatch.
- **Risk level:** **HIGH**

### TNS-P1-04 — Checkout UX hardening for payment failures/retries (Redsys/Bizum/COD)
- **Area/Module:** Checkout / Payments UX
- **Why it matters:** Payment integrations exist, but recovery UX and failure messaging directly impact conversion.
- **Current status:** **partial**
- **Recommended action:** Add explicit payment pending/failure screens, retry CTA, and clear tracking token recovery for guest orders.
- **Acceptance criteria:** failed payment path leads to guided retry without cart/order loss.
- **Risk level:** **HIGH**

### TNS-P1-05 — Orders operations: shipment updates, invoice issuance controls, refund actions
- **Area/Module:** Admin orders / Invoice / Refunds
- **Why it matters:** Schema includes invoice/shipment/refund entities, but admin operational controls appear incomplete.
- **Current status:** **partial**
- **Recommended action:** Add admin actions to create shipment events, trigger invoice generation, and execute/refund with audit trails.
- **Acceptance criteria:** support agent can complete core post-payment operations from admin order detail.
- **Risk level:** **HIGH**

### TNS-P1-06 — RMA workflow completion (customer request + SLA-driven handling)
- **Area/Module:** RMA / Post-sale
- **Why it matters:** Admin can list/update RMA status, but full customer-facing initiation and policy workflow is incomplete.
- **Current status:** **partial**
- **Recommended action:** Implement customer RMA creation path, item-level reason capture, and status communication templates.
- **Acceptance criteria:** customer can submit RMA from order, admin processes with traceable milestones.
- **Risk level:** **MEDIUM**

### TNS-P1-07 — Import center usability and safety rails (Infortisa)
- **Area/Module:** Imports / Supplier sync
- **Why it matters:** Manual run/retry/history exists, but safe operations for destructive/sensitive sync jobs need better UX and controls.
- **Current status:** **partial**
- **Recommended action:** Add dry-run mode, diff preview, anomaly alerts (price spikes/stock drops), and scoped re-sync.
- **Acceptance criteria:** operator can review sync impact before applying; anomalies flagged.
- **Risk level:** **HIGH**

### TNS-P1-08 — Admin productivity: bulk actions + saved filters + table performance
- **Area/Module:** Admin UX
- **Why it matters:** Operational teams need faster workflows for products/orders/coupons at scale.
- **Current status:** **partial**
- **Recommended action:** Implement reusable data-table patterns with server-side filtering/sorting and preset views.
- **Acceptance criteria:** bulk actions for top 3 admin modules and user-level saved views available.
- **Risk level:** **MEDIUM**

---

## P2 — Scale / robustness / governance / observability

### TNS-P2-01 — Structured observability baseline (logs, metrics, traces, correlation)
- **Area/Module:** Platform / Observability
- **Why it matters:** Request IDs and health checks exist, but no full telemetry baseline for production incident response.
- **Current status:** **partial**
- **Recommended action:** Add centralized log shipping, RED metrics, and trace propagation across API + async jobs.
- **Acceptance criteria:** dashboard with API latency/errors, payment callback failures, sync failures, checkout funnel drop.
- **Risk level:** **HIGH**

### TNS-P2-02 — Event-driven job reliability for imports and pricing recalculation
- **Area/Module:** Async processing / Reliability
- **Why it matters:** Job entities exist but resilience patterns (retry policies, DLQ, idempotency keys) are not fully explicit.
- **Current status:** **partial**
- **Recommended action:** Formalize job runner semantics, retries with jitter, dead-letter handling and replay tooling.
- **Acceptance criteria:** failed jobs recover predictably; duplicate processing avoided.
- **Risk level:** **MEDIUM**

### TNS-P2-03 — Data governance and migration discipline for dual legacy models
- **Area/Module:** Data model / Prisma migrations
- **Why it matters:** Parallel models (e.g., homepage variants) increase migration debt and data inconsistency risk.
- **Current status:** **legacy-risk**
- **Recommended action:** Document deprecation matrix, ownership, and migration windows; add schema ADRs for major model shifts.
- **Acceptance criteria:** all legacy models marked with deprecation plan and removal target release.
- **Risk level:** **MEDIUM**

### TNS-P2-04 — Security hardening pack (rate limits, CSRF consistency, secret hygiene)
- **Area/Module:** Security / API gateway behavior
- **Why it matters:** Some protections exist, but coverage consistency and secret-rotation policies need formalization.
- **Current status:** **partial**
- **Recommended action:** Endpoint-classified security baseline + periodic automated security checks.
- **Acceptance criteria:** security checklist enforced in CI and documented in runbook.
- **Risk level:** **MEDIUM**

### TNS-P2-05 — Disaster recovery & backup validation drills
- **Area/Module:** Ops / Business continuity
- **Why it matters:** Deploy/rollback scripts exist, but restore rehearsal and RPO/RTO evidence is typically missing.
- **Current status:** **partial**
- **Recommended action:** Define backup cadence and monthly restore drill including DB + branding assets + env snapshots.
- **Acceptance criteria:** validated restore procedure with timing report and owner signoff.
- **Risk level:** **MEDIUM**

---

## P3 — Nice-to-have

### TNS-P3-01 — Merchandising experimentation framework (home section A/B)
- **Area/Module:** Growth / Homepage
- **Why it matters:** Enables iterative conversion improvements once baseline stability is achieved.
- **Current status:** **missing**
- **Recommended action:** Introduce feature-flagged section variants and basic experiment reporting.
- **Acceptance criteria:** 1 controlled experiment can run end-to-end without redeploy.
- **Risk level:** **LOW**

### TNS-P3-02 — Advanced support tooling (macros, canned responses, SLA timers)
- **Area/Module:** Admin support / Chat / Orders
- **Why it matters:** Improves support throughput after core post-sale workflows are stabilized.
- **Current status:** **missing**
- **Recommended action:** Add agent macros and SLA indicators tied to order/RMA context.
- **Acceptance criteria:** measurable reduction in first response time.
- **Risk level:** **LOW**

---

## Recommended execution order (next 4 weeks)

### Week 1 — Stabilize security + architecture decisions
1. **TNS-P0-02** (secure Infortisa endpoints).
2. **TNS-P0-04** (payment route unification decision + deprecation).
3. **TNS-P0-01** (homepage source-of-truth ADR and migration plan).
4. **TNS-P0-09** (strict production env contract).

### Week 2 — Core operational correctness
1. **TNS-P0-03** (persist order notes/timeline).
2. **TNS-P0-06** (state machine rules + idempotency baseline).
3. **TNS-P1-05** (minimum viable admin shipment/invoice/refund actions).

### Week 3 — Quality gates + conversion-critical UX
1. **TNS-P0-07** (business smoke tests).
2. **TNS-P0-08** (CI required checks).
3. **TNS-P1-04** (checkout failure/retry UX).
4. **TNS-P1-03** (pricing/discount display consistency).

### Week 4 — Admin efficiency + observability
1. **TNS-P1-01** (single homepage editor UX).
2. **TNS-P1-07** (import safety rails).
3. **TNS-P2-01** (observability baseline dashboard).
4. **TNS-P1-08** (bulk actions + saved filters in top admin tables).

---

## What should NOT be touched aggressively yet

1. **Pricing engine calculation core** (`pricing.engine`) unless backed by regression suite; pricing drift can silently break margin.
2. **Redsys cryptographic/signature verification internals** without provider-certified test vectors.
3. **Prisma historical migrations**; do not rewrite existing migrations in-place.
4. **Deploy/rollback script flow** except for additive hardening; keep rollback path stable during core refactors.
5. **Multi-locale route wrappers** until homepage/source-of-truth consolidation is completed (to avoid routing regressions).

---

## Notes from repository signals used to classify status

- Strong existing foundations: schema coverage (orders/payments/invoices/refunds/RMA), pricing rules workflow, category tree APIs, deploy scripts, env sync check.
- High-risk duplication/legacy: dual homepage systems + dual payment route namespaces + mixed docs/legacy paths.
- Gaps likely to block production excellence: complete e2e business smoke, strict permission governance, post-sale operational completeness, telemetry depth.
