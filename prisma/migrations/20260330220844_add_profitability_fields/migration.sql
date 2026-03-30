/*
  Warnings:

  - You are about to drop the column `costPrice` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "costPrice";

-- AlterTable
ALTER TABLE "Revenue" ADD COLUMN     "costAmount" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "baseCost" DECIMAL(12,2);
