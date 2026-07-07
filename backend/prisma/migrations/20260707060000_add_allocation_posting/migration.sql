-- CreateTable
CREATE TABLE "AllocationPosting" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "costCenterId" TEXT NOT NULL,
    "costElementId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "reversed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllocationPosting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AllocationPosting_organizationId_cycleId_period_idx" ON "AllocationPosting"("organizationId", "cycleId", "period");

-- CreateIndex
CREATE INDEX "AllocationPosting_runId_idx" ON "AllocationPosting"("runId");

