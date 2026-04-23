-- CreateTable
CREATE TABLE "PatientFollowUp" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "controlDate" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "nextFollowUpAt" TIMESTAMP(3),
    "beforeImageUrl" TEXT,
    "afterImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientFollowUp_patientId_idx" ON "PatientFollowUp"("patientId");

-- CreateIndex
CREATE INDEX "PatientFollowUp_controlDate_idx" ON "PatientFollowUp"("controlDate");

-- CreateIndex
CREATE INDEX "PatientFollowUp_nextFollowUpAt_idx" ON "PatientFollowUp"("nextFollowUpAt");

-- AddForeignKey
ALTER TABLE "PatientFollowUp" ADD CONSTRAINT "PatientFollowUp_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
