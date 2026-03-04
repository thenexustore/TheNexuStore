-- AlterEnum
ALTER TYPE "RoundingMode" ADD VALUE IF NOT EXISTS 'NEAREST_0_05';
ALTER TYPE "RoundingMode" ADD VALUE IF NOT EXISTS 'CEIL_1';

-- AlterTable PricingRule
ALTER TABLE "PricingRule"
  ADD COLUMN IF NOT EXISTS "discount_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "min_margin_pct" DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS "starts_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "ends_at" TIMESTAMP(3);

-- AlterTable SkuPrice
ALTER TABLE "SkuPrice"
  ADD COLUMN IF NOT EXISTS "cost_price" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "discount_pct" INTEGER,
  ADD COLUMN IF NOT EXISTS "rule_id" TEXT,
  ADD COLUMN IF NOT EXISTS "needs_review" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable PricingRecalculationJob
CREATE TABLE IF NOT EXISTS "PricingRecalculationJob" (
  "id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "scope" TEXT NOT NULL,
  "total" INTEGER NOT NULL DEFAULT 0,
  "processed" INTEGER NOT NULL DEFAULT 0,
  "updated_count" INTEGER NOT NULL DEFAULT 0,
  "warning_count" INTEGER NOT NULL DEFAULT 0,
  "failed_count" INTEGER NOT NULL DEFAULT 0,
  "dry_run" BOOLEAN NOT NULL DEFAULT false,
  "filters_json" JSONB,
  "errors_json" JSONB,
  "last_error" TEXT,
  "started_at" TIMESTAMP(3),
  "finished_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PricingRecalculationJob_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "PricingRule_scope_priority_idx" ON "PricingRule"("scope", "priority");
CREATE INDEX IF NOT EXISTS "PricingRule_category_id_idx" ON "PricingRule"("category_id");
CREATE INDEX IF NOT EXISTS "PricingRule_brand_id_idx" ON "PricingRule"("brand_id");
CREATE INDEX IF NOT EXISTS "PricingRule_sku_id_idx" ON "PricingRule"("sku_id");
CREATE INDEX IF NOT EXISTS "SkuPrice_rule_id_idx" ON "SkuPrice"("rule_id");

-- Default global rule
INSERT INTO "PricingRule" ("id","scope","margin_pct","discount_pct","rounding_mode","is_active","priority","created_at","updated_at")
SELECT '00000000-0000-0000-0000-000000000001', 'GLOBAL', 10.00, 0.00, 'X_99', true, 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "PricingRule" WHERE "scope"='GLOBAL');
