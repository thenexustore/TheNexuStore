CREATE TABLE "SupplierIntegration" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "api_key_encrypted" TEXT,
    "api_key_last4" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "last_healthcheck_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierIntegration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupplierIntegration_provider_key" ON "SupplierIntegration"("provider");
CREATE INDEX "SupplierIntegration_is_active_idx" ON "SupplierIntegration"("is_active");
