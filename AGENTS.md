# AGENTS.md — TheNexuStore

## Project Overview
TheNexuStore is a multi-app ecommerce monorepo:
- **Backend API:** NestJS + Prisma + PostgreSQL (`Backend/Store`)
- **Storefront:** Next.js App Router (`Frontend/Store`)
- **Admin panel:** Next.js App Router (`Frontend/admin`)
- **Ops/Deploy:** PM2 + bash deploy/rollback scripts (`ops/`)

Do not treat WordPress as runtime source-of-truth for core commerce flows.

## Repo Map
- `Backend/Store/` — NestJS API, Prisma schema/migrations, business logic modules.
- `Frontend/Store/` — customer storefront UI + Playwright mobile smoke tests.
- `Frontend/admin/` — admin UI for products/orders/coupons/pricing/home content/settings.
- `docs/` — architecture notes, QA audits, pricing/home-builder docs, runbooks.
- `ops/` — deploy scripts, rollback script, env sync helpers.
- `docker-compose.yml` — local infra (Postgres/Redis/RabbitMQ).

## Main Apps and Responsibilities
- **Backend (`Backend/Store`)**
  - Auth (customer + staff), catalog/products, categories, cart, checkout, coupons, payments (incl. Redsys), shipping tax, chat, homepage builder, branding, imports/infortisa sync.
  - Admin APIs under `src/admin/*`, customer APIs under `src/user/*`.
- **Storefront (`Frontend/Store`)**
  - Public shopping UX: home/store rendering, listing/PDP, cart, checkout, account, order tracking, auth, category navigation.
  - Homepage rendering uses dynamic sections (`app/store/*`, `app/lib/home-cache.ts`).
- **Admin (`Frontend/admin`)**
  - Backoffice UX for products, orders, coupons, pricing, pricing rules, imports, homepage sections/composer, banners, featured products, branding/settings, shipping-tax, RMAs, chat.

## Important Business Modules
When tasks mention these domains, inspect backend + both frontends together:
- Homepage/content composer (`Backend/Store/src/homepage`, `Frontend/admin/.../home-composer`, `Frontend/Store/app/store/*`).
- Pricing and pricing rules (`src/admin/pricing*`, `src/pricing`, admin pricing pages).
- Coupons (`src/admin/coupons`, `src/user/coupon`, storefront checkout/cart).
- Imports/Infortisa (`src/admin/imports`, `src/infortisa`).
- Orders + tracking (`admin orders`, storefront `app/order/*`).
- Categories/navigation (`src/user/categories`, `app/lib/category-navigation.ts`, menu docs).
- Payments/Redsys (`src/user/payment`, redsys DTO/service/specs).
- Branding/logo (`src/branding`, admin branding APIs, logo assets/scripts).
- Shipping tax (`src/shipping-tax`, `src/admin/shipping-tax`).
- RMA (`src/admin/rma`, admin rmas page).

## Commands to Know
Run from each app directory unless noted.

**Backend (`Backend/Store`)**
- `npm run start:dev`
- `npm run build && npm run start:prod`
- `npm run lint`
- `npm run test`
- `npm run test:e2e`
- `npm run config:smoke`
- `npm run smoke:http`
- `npm run prisma:generate`
- `npx prisma migrate deploy`
- `npm run infortisa:backfill-slugs`
- `npm run brands:logo:audit`

**Storefront (`Frontend/Store`)**
- `npm run dev`
- `npm run build && npm run start`
- `npm run lint`
- `npm run test:e2e`

**Admin (`Frontend/admin`)**
- `npm run dev`
- `npm run build && npm run start`
- `npm run lint`
- `npm run typecheck`
- `npm run check:merge-markers`

**Ops (repo root)**
- `docker compose up -d`
- `bash ops/nexus_deploy.sh --dry-run`
- `bash ops/deploy-production.sh`
- `bash ops/nexus_rollback.sh [backup_dir]`
- `node ops/validate-env-sync.mjs`

## Environment and Runtime Notes
Key env examples:
- `Backend/Store/.env.example`
- `Frontend/Store/.env.example`
- `Frontend/admin/.env.example`
- `ops/env.sync.example`

Operational notes:
- Backend requires valid `DATABASE_URL`; Prisma generate/migrate is mandatory after schema changes.
- Deploy scripts assume PM2 process names like `nexus-backend`, `nexus-store`, `nexus-admin`.
- Deploy scripts may overwrite `.env.production` in frontends depending on `SYNC_FRONTEND_ENV`.
- Production behavior can differ from local due to PM2/env/reverse-proxy setup.

## Testing Strategy
- **Backend:** Jest unit/integration (`*.spec.ts`) + e2e (`test/app.e2e-spec.ts`).
- **Storefront:** Playwright e2e/mobile smoke (`tests/mobile-smoke`).
- **Admin:** prioritize lint + typecheck + targeted manual flow checks.
- For cross-surface changes (e.g. homepage/pricing/payments), verify API + admin + storefront in the same task.

## Homepage / CMS / Source-of-Truth warning
Homepage content has multiple moving parts (backend layout/composer entities, admin composer UI, storefront renderer/cache). Before editing, identify:
1) where data is authored,
2) where publish state is stored,
3) where storefront reads/falls back/caches.

## Branding / Assets warning
Branding/logo may come from DB/API, seeded values, static assets, and normalization scripts. Confirm actual runtime asset path and fallback behavior before changing logos or brand visuals.

## Categories / Navigation warning
Category trees can be affected by imports/infortisa mappings, admin edits, and storefront navigation transformations. Do not assume one endpoint/file is canonical.

## Payments / Redsys warning
Redsys logic is security-sensitive (signatures, callbacks, order state transitions). Never “simplify” payment flow without validating DTOs, service logic, and webhook/callback compatibility.

## Safe Change Rules
- Prefer minimal, reversible patches.
- Avoid broad refactors in deploy scripts, payment code, and homepage composer unless explicitly requested.
- Keep API contract compatibility unless migration plan is provided.
- When touching env/deploy/runtime behavior, document blast radius and rollback path.
- If unsure about ownership of a flow, stop and map the source-of-truth first.

## Do not assume
- Do not assume homepage source of truth.
- Do not assume admin publish flow is consistent across modules.
- Do not assume branding changes propagate correctly everywhere.
- Do not assume categories/navigation are canonical in one place.
- Do not assume production/local parity.

## For every task, Codex must
- [ ] Identify source of truth (data + rendering + publish path).
- [ ] Identify all affected files/apps (backend/store/admin/ops/docs).
- [ ] Propose the minimal safe fix first.
- [ ] Run relevant checks (lint/tests/typecheck/smoke as applicable).
- [ ] Before handing off a PR, run merge-readiness checks (`bash ops/check_merge_readiness.sh`) and, for risky cross-app work, `bash ops/check_merge_readiness.sh --with-build`.
- [ ] Explain key risks and non-obvious side effects.
- [ ] Provide manual QA steps covering user-visible behavior.

## Autonomy / Execution Continuity
- Work autonomously until the full task/module is complete.
- Do not stop after one subtask if more planned work remains.
- After finishing each subtask, continue automatically to the next one until the full DoD is satisfied.
- Only stop for a real external blocker: missing credentials, missing access, destructive ambiguity in production, or a requirement conflict that cannot be resolved safely.
- If several valid options exist, choose the safest MVP-compatible option and continue.
- Prefer end-to-end completion over partial delivery.
- When an error appears, debug it, fix it, re-run the relevant checks, and continue.
- Do not ask for confirmation between normal implementation steps.
- Always end with: summary, files changed, checks run, risks, manual QA, and the next immediate task.

## Definition of Done for any Codex task
1. Change is minimal and scoped.
2. Relevant automated checks pass (or failures are explained).
3. Cross-app impact reviewed when domain spans backend/admin/storefront.
4. Env/deploy implications documented if touched.
5. Manual QA steps provided with concrete routes/actions.

## Expected response format from Codex
1. **Summary**: what changed + why.
2. **Files changed**: grouped by app (Backend/Store, Frontend/Store, Frontend/admin, ops/docs).
3. **Checks run**: exact commands + pass/fail.
4. **Risks/Follow-ups**: what still needs validation.
5. **Manual QA**: step-by-step scenario list (include URLs/pages).
