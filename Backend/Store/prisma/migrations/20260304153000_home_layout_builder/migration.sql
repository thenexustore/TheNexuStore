-- CreateEnum
CREATE TYPE "HomePageSectionType" AS ENUM ('HERO_CAROUSEL', 'CATEGORY_STRIP', 'PRODUCT_CAROUSEL', 'BRAND_STRIP', 'VALUE_PROPS', 'TRENDING_CHIPS', 'CUSTOM_HTML');

-- CreateEnum
CREATE TYPE "HomePageSectionItemType" AS ENUM ('BANNER', 'CATEGORY', 'BRAND', 'PRODUCT', 'LINK');

-- CreateTable
CREATE TABLE "home_page_layouts" (
    "id" TEXT NOT NULL,
    "locale" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "home_page_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_page_sections" (
    "id" TEXT NOT NULL,
    "layout_id" TEXT NOT NULL,
    "type" "HomePageSectionType" NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "position" INTEGER NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "variant" TEXT,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "home_page_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_page_section_items" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "type" "HomePageSectionItemType" NOT NULL,
    "banner_id" TEXT,
    "category_id" TEXT,
    "brand_id" TEXT,
    "product_id" TEXT,
    "label" TEXT,
    "image_url" TEXT,
    "href" TEXT,
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "home_page_section_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "home_page_layouts_locale_is_active_idx" ON "home_page_layouts"("locale", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "home_page_sections_layout_id_position_key" ON "home_page_sections"("layout_id", "position");

-- CreateIndex
CREATE INDEX "home_page_sections_layout_id_is_enabled_position_idx" ON "home_page_sections"("layout_id", "is_enabled", "position");

-- CreateIndex
CREATE UNIQUE INDEX "home_page_section_items_section_id_position_key" ON "home_page_section_items"("section_id", "position");

-- CreateIndex
CREATE INDEX "home_page_section_items_section_id_type_idx" ON "home_page_section_items"("section_id", "type");

-- AddForeignKey
ALTER TABLE "home_page_sections" ADD CONSTRAINT "home_page_sections_layout_id_fkey" FOREIGN KEY ("layout_id") REFERENCES "home_page_layouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_page_section_items" ADD CONSTRAINT "home_page_section_items_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "home_page_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_page_section_items" ADD CONSTRAINT "home_page_section_items_banner_id_fkey" FOREIGN KEY ("banner_id") REFERENCES "Banner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_page_section_items" ADD CONSTRAINT "home_page_section_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_page_section_items" ADD CONSTRAINT "home_page_section_items_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_page_section_items" ADD CONSTRAINT "home_page_section_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
