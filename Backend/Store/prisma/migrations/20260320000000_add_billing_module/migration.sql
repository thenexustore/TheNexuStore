-- CreateEnum
CREATE TYPE "BillingDocumentType" AS ENUM ('INVOICE', 'QUOTE', 'CREDIT_NOTE');

-- CreateEnum
CREATE TYPE "BillingDocumentStatus" AS ENUM ('DRAFT', 'ISSUED', 'SENT', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "BillingLanguage" AS ENUM ('ES', 'EN');

-- CreateEnum
CREATE TYPE "BillingPaymentMethod" AS ENUM ('REDSYS', 'STRIPE', 'PAYPAL', 'COD', 'BANK_TRANSFER', 'CASH', 'OTHER');

-- CreateTable
CREATE TABLE "billing_series" (
    "id" TEXT NOT NULL,
    "type" "BillingDocumentType" NOT NULL,
    "prefix" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "last_counter" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_settings" (
    "id" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL DEFAULT 'Sánchez Peinado Solutions S.L.U.',
    "trade_name" TEXT NOT NULL DEFAULT 'NEXUS SP Solutions',
    "nif" TEXT NOT NULL DEFAULT 'B75818237',
    "address_real" TEXT NOT NULL DEFAULT 'Avenida España nº32, 2ºB, 51001 Ceuta',
    "address_virtual" TEXT NOT NULL DEFAULT 'Calle la Sierra nº48, 13680 Fuente el Fresno',
    "iban_caixabank" TEXT NOT NULL DEFAULT 'ES78 2100 8511 0102 0023 5243',
    "iban_bbva" TEXT NOT NULL DEFAULT 'ES92 0182 0390 5902 0187 3003',
    "website_com" TEXT NOT NULL DEFAULT 'thenexustore.com',
    "website_es" TEXT NOT NULL DEFAULT 'thenexustore.es',
    "default_language" "BillingLanguage" NOT NULL DEFAULT 'ES',
    "default_currency" TEXT NOT NULL DEFAULT 'EUR',
    "invoice_prefix" TEXT NOT NULL DEFAULT 'INV',
    "quote_prefix" TEXT NOT NULL DEFAULT 'PRE',
    "credit_note_prefix" TEXT NOT NULL DEFAULT 'ABO',
    "default_tax_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.21,
    "extra_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "background_url" TEXT,
    "config_json" JSONB NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_fiscal_profiles" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "company_name" TEXT,
    "tax_id" TEXT,
    "fiscal_address" TEXT,
    "fiscal_city" TEXT,
    "fiscal_postal" TEXT,
    "fiscal_country" TEXT NOT NULL DEFAULT 'ES',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_fiscal_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_documents" (
    "id" TEXT NOT NULL,
    "type" "BillingDocumentType" NOT NULL,
    "status" "BillingDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "document_number" TEXT,
    "series_id" TEXT,
    "order_id" TEXT,
    "customer_id" TEXT,
    "language" "BillingLanguage" NOT NULL DEFAULT 'ES',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "issue_date" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "payment_method" "BillingPaymentMethod",
    "pdf_url" TEXT,
    "source_document_id" TEXT,
    "company_legal_name" TEXT,
    "company_trade_name" TEXT,
    "company_nif" TEXT,
    "company_address" TEXT,
    "company_iban_1" TEXT,
    "company_iban_2" TEXT,
    "customer_name" TEXT,
    "customer_tax_id" TEXT,
    "customer_email" TEXT,
    "customer_address" TEXT,
    "subtotal_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "internal_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "issued_at" TIMESTAMP(3),
    "template_id" TEXT,

    CONSTRAINT "billing_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_document_items" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "qty" DECIMAL(12,4) NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "tax_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.21,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "line_subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_document_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_number_audits" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "old_number" TEXT,
    "new_number" TEXT NOT NULL,
    "changed_by" TEXT NOT NULL,
    "changed_by_email" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_number_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_series_type_year_key" ON "billing_series"("type", "year");

-- CreateIndex
CREATE INDEX "billing_series_type_year_idx" ON "billing_series"("type", "year");

-- CreateIndex
CREATE INDEX "billing_templates_is_default_idx" ON "billing_templates"("is_default");

-- CreateIndex
CREATE UNIQUE INDEX "customer_fiscal_profiles_customer_id_key" ON "customer_fiscal_profiles"("customer_id");

-- CreateIndex
CREATE INDEX "customer_fiscal_profiles_customer_id_idx" ON "customer_fiscal_profiles"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_documents_document_number_key" ON "billing_documents"("document_number");

-- CreateIndex
CREATE UNIQUE INDEX "billing_documents_order_id_key" ON "billing_documents"("order_id");

-- CreateIndex
CREATE INDEX "billing_documents_type_status_created_at_idx" ON "billing_documents"("type", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "billing_documents_order_id_idx" ON "billing_documents"("order_id");

-- CreateIndex
CREATE INDEX "billing_documents_customer_id_idx" ON "billing_documents"("customer_id");

-- CreateIndex
CREATE INDEX "billing_documents_document_number_idx" ON "billing_documents"("document_number");

-- CreateIndex
CREATE INDEX "billing_documents_issue_date_idx" ON "billing_documents"("issue_date");

-- CreateIndex
CREATE INDEX "billing_document_items_document_id_position_idx" ON "billing_document_items"("document_id", "position");

-- CreateIndex
CREATE INDEX "billing_number_audits_document_id_idx" ON "billing_number_audits"("document_id");

-- AddForeignKey
ALTER TABLE "customer_fiscal_profiles" ADD CONSTRAINT "customer_fiscal_profiles_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_documents" ADD CONSTRAINT "billing_documents_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "billing_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_documents" ADD CONSTRAINT "billing_documents_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_documents" ADD CONSTRAINT "billing_documents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_documents" ADD CONSTRAINT "billing_documents_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "billing_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_documents" ADD CONSTRAINT "billing_documents_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "billing_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_document_items" ADD CONSTRAINT "billing_document_items_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "billing_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_number_audits" ADD CONSTRAINT "billing_number_audits_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "billing_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
