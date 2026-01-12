-- CreateTable
CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "overlay" TEXT NOT NULL,
    "align" TEXT NOT NULL,
    "title_text" TEXT NOT NULL,
    "title_color" TEXT NOT NULL,
    "title_size" TEXT NOT NULL,
    "title_weight" TEXT NOT NULL,
    "title_font" TEXT NOT NULL,
    "subtitle_text" TEXT NOT NULL,
    "subtitle_color" TEXT NOT NULL,
    "subtitle_size" TEXT NOT NULL,
    "button_text" TEXT NOT NULL,
    "button_link" TEXT NOT NULL,
    "button_bg" TEXT NOT NULL,
    "button_color" TEXT NOT NULL,
    "button_radius" TEXT NOT NULL,
    "button_padding" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Banner_is_active_sort_order_idx" ON "Banner"("is_active", "sort_order");
