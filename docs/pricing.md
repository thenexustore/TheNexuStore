# Pricing / PVP module

## Overview
This module introduces deterministic admin-controlled pricing with cached SKU prices for fast storefront reads.

## Features
- Pricing rules CRUD with scope: `GLOBAL`, `CATEGORY`, `BRAND`, `SKU`.
- Rule precedence: priority desc, then specificity (`SKU > BRAND > CATEGORY > GLOBAL`), then updated time.
- Formula:
  - Compare-at = `cost * (1 + margin%)` then rounded.
  - Sale = `compare-at * (1 - discount%)` then rounded.
- Floor protection with `min_margin_pct` and/or `min_margin_amount`.
- Rounding modes: `NONE`, `X_99`, `X_95`, `NEAREST_0_05`, `CEIL_1`.
- Async bulk recalculation with progress and error tracking.

## API
- `GET /admin/pricing/rules`
- `POST /admin/pricing/rules`
- `PUT /admin/pricing/rules/:id`
- `DELETE /admin/pricing/rules/:id`
- `POST /admin/pricing/preview`
- `POST /admin/pricing/recalculate`
- `GET /admin/pricing/recalculate/:jobId`
- `GET /admin/pricing/sku/:skuId`

## Operational notes
- Prices are persisted in `SkuPrice` to avoid runtime-heavy rule evaluation on storefront requests.
- Rule changes trigger recalculation jobs.
- Infortisa upserts now invoke pricing recomputation using imported cost.
