# Fullstack validation report (backend + frontend)

Date: 2026-03-06

## Scope checked
- Backend build and tests.
- Frontend (Store/Admin) build and static checks.
- Runtime boot of backend + frontend.
- API smoke for health and products.
- Browser smoke for Store/Admin routes.

## What passed
1. **Backend compiles and unit tests pass** (`npm run build`, `npm test -- --runInBand`).
2. **Both frontends compile** (`Frontend/Store` and `Frontend/admin` with `npm run build`).
3. **Admin typecheck passes** (`npm run typecheck`).
4. **Backend boots successfully with PostgreSQL running** and serves health endpoints.
5. **Products API responds correctly** after creating a demo product in DB (`/user/products` returns the demo SKU with price and stock).
6. **Store and Admin dev servers boot** and respond over HTTP (`/es/store`, `/es/products`, `/es/login`).

## Findings / warnings
1. `npm run smoke:http` in backend fails with: `health: invalid response payload shape`.
   - This suggests a contract mismatch between the smoke script assertion and the current health payload format.
2. Health status reports degraded because Redis and RabbitMQ are not configured/running in this environment.
3. Browser smoke reached Store/Admin pages, but a text assertion for `Demo Product` on `/es/products` was not found in rendered body during that run (needs a dedicated e2e assertion tied to UI selectors/data loading).

## Notes about environment setup performed
- Installed PostgreSQL locally (no Docker binary available in this environment).
- Created `nexu` user + `nexustore` DB.
- Applied Prisma migrations (`npx prisma migrate deploy`).
- Inserted a demo brand/category/product/SKU/price/inventory row set for API validation.

## Recommended next actions
1. Fix/update backend smoke assertion in `scripts/http-smoke.cjs` to current success payload contract.
2. Add a deterministic e2e test for the Store products grid (wait for product-card selector and assert slug/title).
3. Add optional local profile for Redis/RabbitMQ in CI smoke or mark them as optional in health checks for non-infra runs.
