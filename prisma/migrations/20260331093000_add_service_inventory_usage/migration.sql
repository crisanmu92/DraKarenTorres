-- CreateTable
CREATE TABLE "SaleItemComponent" (
    "id" TEXT NOT NULL,
    "saleItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleItemComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueInventoryUsage" (
    "id" TEXT NOT NULL,
    "revenueId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitCost" DECIMAL(12,2),
    "totalCost" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueInventoryUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SaleItemComponent_saleItemId_productId_key" ON "SaleItemComponent"("saleItemId", "productId");

-- CreateIndex
CREATE INDEX "SaleItemComponent_saleItemId_idx" ON "SaleItemComponent"("saleItemId");

-- CreateIndex
CREATE INDEX "SaleItemComponent_productId_idx" ON "SaleItemComponent"("productId");

-- CreateIndex
CREATE INDEX "RevenueInventoryUsage_revenueId_idx" ON "RevenueInventoryUsage"("revenueId");

-- CreateIndex
CREATE INDEX "RevenueInventoryUsage_productId_idx" ON "RevenueInventoryUsage"("productId");

-- AddForeignKey
ALTER TABLE "SaleItemComponent" ADD CONSTRAINT "SaleItemComponent_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "SaleItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItemComponent" ADD CONSTRAINT "SaleItemComponent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueInventoryUsage" ADD CONSTRAINT "RevenueInventoryUsage_revenueId_fkey" FOREIGN KEY ("revenueId") REFERENCES "Revenue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueInventoryUsage" ADD CONSTRAINT "RevenueInventoryUsage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
