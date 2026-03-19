-- CreateEnum
CREATE TYPE "ImportRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL_SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "ImportRun" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "status" "ImportRunStatus" NOT NULL DEFAULT 'RUNNING',
    "source_items_received" INTEGER NOT NULL DEFAULT 0,
    "processed_count" INTEGER NOT NULL DEFAULT 0,
    "persisted_count" INTEGER NOT NULL DEFAULT 0,
    "validation_skipped_count" INTEGER NOT NULL DEFAULT 0,
    "created_count" INTEGER NOT NULL DEFAULT 0,
    "updated_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "archived_count" INTEGER NOT NULL DEFAULT 0,
    "request_meta_json" JSONB,
    "result_meta_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRunError" (
    "id" TEXT NOT NULL,
    "import_run_id" TEXT NOT NULL,
    "sku" TEXT,
    "stage" TEXT,
    "message" TEXT NOT NULL,
    "raw_payload_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportRunError_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportRun_provider_started_at_idx" ON "ImportRun"("provider", "started_at" DESC);
CREATE INDEX "ImportRun_mode_started_at_idx" ON "ImportRun"("mode", "started_at" DESC);
CREATE INDEX "ImportRun_status_started_at_idx" ON "ImportRun"("status", "started_at" DESC);
CREATE INDEX "ImportRunError_import_run_id_created_at_idx" ON "ImportRunError"("import_run_id", "created_at" DESC);
CREATE INDEX "ImportRunError_sku_created_at_idx" ON "ImportRunError"("sku", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "ImportRunError" ADD CONSTRAINT "ImportRunError_import_run_id_fkey" FOREIGN KEY ("import_run_id") REFERENCES "ImportRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
