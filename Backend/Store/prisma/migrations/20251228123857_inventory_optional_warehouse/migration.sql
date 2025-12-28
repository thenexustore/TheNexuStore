/*
  Warnings:

  - The primary key for the `InventoryLevel` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The required column `id` was added to the `InventoryLevel` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- DropForeignKey
ALTER TABLE "InventoryLevel" DROP CONSTRAINT "InventoryLevel_warehouse_id_fkey";

-- AlterTable
ALTER TABLE "InventoryLevel" DROP CONSTRAINT "InventoryLevel_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ALTER COLUMN "warehouse_id" DROP NOT NULL,
ADD CONSTRAINT "InventoryLevel_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "InventoryLevel_sku_id_idx" ON "InventoryLevel"("sku_id");

-- AddForeignKey
ALTER TABLE "InventoryLevel" ADD CONSTRAINT "InventoryLevel_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
