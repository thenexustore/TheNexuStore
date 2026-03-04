-- CreateEnum
CREATE TYPE "AdminAuditStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "actor_email" TEXT,
    "actor_role" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "method" TEXT,
    "path" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "status" "AdminAuditStatus" NOT NULL DEFAULT 'SUCCESS',
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAuditLog_created_at_idx" ON "AdminAuditLog"("created_at");

-- CreateIndex
CREATE INDEX "AdminAuditLog_actor_email_idx" ON "AdminAuditLog"("actor_email");

-- CreateIndex
CREATE INDEX "AdminAuditLog_resource_resource_id_idx" ON "AdminAuditLog"("resource", "resource_id");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_created_at_idx" ON "AdminAuditLog"("action", "created_at");
