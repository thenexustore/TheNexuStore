-- Add ON_HOLD to order lifecycle
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'ON_HOLD';

-- Track billing document origin (ecommerce vs manual)
CREATE TYPE "BillingDocumentSource" AS ENUM ('ECOMMERCE', 'MANUAL');

ALTER TABLE "billing_documents"
  ADD COLUMN "source" "BillingDocumentSource" NOT NULL DEFAULT 'ECOMMERCE';

CREATE INDEX "billing_documents_source_status_created_at_idx"
  ON "billing_documents"("source", "status", "created_at" DESC);
