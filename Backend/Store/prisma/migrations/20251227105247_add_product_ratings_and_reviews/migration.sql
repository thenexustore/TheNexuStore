-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "rating_avg" DECIMAL(2,1),
ADD COLUMN     "rating_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductReview_product_id_idx" ON "ProductReview"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "ProductReview_product_id_customer_id_key" ON "ProductReview"("product_id", "customer_id");

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
