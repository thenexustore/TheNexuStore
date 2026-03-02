/*
  Warnings:

  - Added the required column `updated_at` to the `Coupon` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'COD';

-- AlterTable
ALTER TABLE "Cart" ADD COLUMN     "coupon_id" TEXT;

-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "usage_count" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
