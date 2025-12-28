/*
  Warnings:

  - The primary key for the `InventoryLevel` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `InventoryLevel` table. All the data in the column will be lost.
  - Made the column `warehouse_id` on table `InventoryLevel` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "InventoryLevel" DROP CONSTRAINT "InventoryLevel_warehouse_id_fkey";

-- DropIndex
DROP INDEX "InventoryLevel_sku_id_idx";

-- AlterTable
ALTER TABLE "InventoryLevel" DROP CONSTRAINT "InventoryLevel_pkey",
DROP COLUMN "id",
ALTER COLUMN "warehouse_id" SET NOT NULL,
ADD CONSTRAINT "InventoryLevel_pkey" PRIMARY KEY ("warehouse_id", "sku_id");

-- AddForeignKey
ALTER TABLE "InventoryLevel" ADD CONSTRAINT "InventoryLevel_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
