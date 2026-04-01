CREATE TABLE "AccountReceivable" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "saleItemId" TEXT NOT NULL,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "financedInstallments" INTEGER NOT NULL,
    "nextDueDate" TIMESTAMP(3),
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountReceivable_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountReceivablePayment" (
    "id" TEXT NOT NULL,
    "accountReceivableId" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountReceivablePayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AccountReceivable_patientId_idx" ON "AccountReceivable"("patientId");
CREATE INDEX "AccountReceivable_saleItemId_idx" ON "AccountReceivable"("saleItemId");
CREATE INDEX "AccountReceivable_serviceDate_idx" ON "AccountReceivable"("serviceDate");
CREATE INDEX "AccountReceivable_nextDueDate_idx" ON "AccountReceivable"("nextDueDate");
CREATE INDEX "AccountReceivable_isCompleted_idx" ON "AccountReceivable"("isCompleted");
CREATE INDEX "AccountReceivablePayment_accountReceivableId_idx" ON "AccountReceivablePayment"("accountReceivableId");
CREATE INDEX "AccountReceivablePayment_paidAt_idx" ON "AccountReceivablePayment"("paidAt");

ALTER TABLE "AccountReceivable"
ADD CONSTRAINT "AccountReceivable_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountReceivable"
ADD CONSTRAINT "AccountReceivable_saleItemId_fkey"
FOREIGN KEY ("saleItemId") REFERENCES "SaleItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountReceivablePayment"
ADD CONSTRAINT "AccountReceivablePayment_accountReceivableId_fkey"
FOREIGN KEY ("accountReceivableId") REFERENCES "AccountReceivable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
