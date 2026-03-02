-- CreateEnum
CREATE TYPE "HomepageSectionType" AS ENUM (
  'HERO_BANNER_SLIDER',
  'TOP_CATEGORIES_GRID',
  'BEST_DEALS',
  'NEW_ARRIVALS',
  'FEATURED_PICKS',
  'BRANDS_STRIP',
  'TRUST_BAR'
);

-- CreateTable
CREATE TABLE "homepage_sections" (
  "id" TEXT NOT NULL,
  "type" "HomepageSectionType" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "position" INTEGER NOT NULL,
  "title" TEXT,
  "config_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "homepage_sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "homepage_sections_type_key" ON "homepage_sections"("type");

-- CreateIndex
CREATE INDEX "homepage_sections_enabled_position_idx" ON "homepage_sections"("enabled", "position");
