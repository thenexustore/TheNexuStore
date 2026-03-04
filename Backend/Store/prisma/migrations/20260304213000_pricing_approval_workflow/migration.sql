-- CreateEnum
CREATE TYPE "PricingApprovalStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'PUBLISHED');

-- AlterTable
ALTER TABLE "PricingRule"
ADD COLUMN "approval_status" "PricingApprovalStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "created_by_actor_id" TEXT,
ADD COLUMN "submitted_by_actor_id" TEXT,
ADD COLUMN "approved_by_actor_id" TEXT,
ADD COLUMN "published_by_actor_id" TEXT,
ADD COLUMN "submitted_at" TIMESTAMP(3),
ADD COLUMN "approved_at" TIMESTAMP(3),
ADD COLUMN "published_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PricingRule_approval_status_updated_at_idx" ON "PricingRule"("approval_status", "updated_at");
