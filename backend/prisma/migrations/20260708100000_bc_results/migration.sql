-- CreateTable
CREATE TABLE "BcResult" (
    "id" TEXT NOT NULL,
    "bcId" TEXT NOT NULL,
    "assumptionVersion" INTEGER NOT NULL,
    "resultsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BcResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BcResult_bcId_idx" ON "BcResult"("bcId");

-- CreateIndex
CREATE UNIQUE INDEX "BcResult_bcId_assumptionVersion_key" ON "BcResult"("bcId", "assumptionVersion");

-- AddForeignKey
ALTER TABLE "BcResult" ADD CONSTRAINT "BcResult_bcId_fkey" FOREIGN KEY ("bcId") REFERENCES "BusinessCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

