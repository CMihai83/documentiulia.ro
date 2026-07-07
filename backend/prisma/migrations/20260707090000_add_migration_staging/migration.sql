-- CreateTable
CREATE TABLE "MigrationStaging" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "rawData" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "errors" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MigrationStaging_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MigrationStaging_organizationId_batchId_idx" ON "MigrationStaging"("organizationId", "batchId");

-- CreateIndex
CREATE INDEX "MigrationStaging_batchId_status_idx" ON "MigrationStaging"("batchId", "status");

