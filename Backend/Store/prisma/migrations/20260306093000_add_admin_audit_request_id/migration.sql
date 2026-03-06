ALTER TABLE "AdminAuditLog"
ADD COLUMN "request_id" TEXT;

CREATE INDEX "AdminAuditLog_request_id_idx" ON "AdminAuditLog"("request_id");
