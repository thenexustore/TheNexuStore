-- CreateEnum
CREATE TYPE "TaxMode" AS ENUM ('VAT', 'OUTSIDE_VAT');

-- CreateTable
CREATE TABLE "ShippingZone" (
    "code" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL,
    "country_codes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "region_matchers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingZone_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "ShippingRule" (
    "id" TEXT NOT NULL,
    "zone_code" TEXT NOT NULL,
    "min_base_excl_tax" DECIMAL(12,2) NOT NULL,
    "max_base_excl_tax" DECIMAL(12,2),
    "shipping_base_excl_tax" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxZone" (
    "code" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "mode" "TaxMode" NOT NULL,
    "standard_rate" DECIMAL(5,4) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxZone_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE INDEX "ShippingRule_zone_code_priority_idx" ON "ShippingRule"("zone_code", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingRule_zone_code_min_base_excl_tax_max_base_excl_tax_prior_key" ON "ShippingRule"("zone_code", "min_base_excl_tax", "max_base_excl_tax", "priority");

-- AddForeignKey
ALTER TABLE "ShippingRule" ADD CONSTRAINT "ShippingRule_zone_code_fkey" FOREIGN KEY ("zone_code") REFERENCES "ShippingZone"("code") ON DELETE CASCADE ON UPDATE CASCADE;
