CREATE TABLE "AccountPayable" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT,
    "creditorName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "debtDate" TIMESTAMP(3) NOT NULL,
    "nextPaymentDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountPayable_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AccountPayable_supplierId_idx" ON "AccountPayable"("supplierId");
CREATE INDEX "AccountPayable_debtDate_idx" ON "AccountPayable"("debtDate");
CREATE INDEX "AccountPayable_nextPaymentDate_idx" ON "AccountPayable"("nextPaymentDate");
CREATE INDEX "AccountPayable_isCompleted_idx" ON "AccountPayable"("isCompleted");

ALTER TABLE "AccountPayable"
ADD CONSTRAINT "AccountPayable_supplierId_fkey"
FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
