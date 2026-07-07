-- AlterTable
ALTER TABLE "SimV2Run" ADD COLUMN     "rewindCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scoreJson" JSONB;

-- CreateTable
CREATE TABLE "BusinessCase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "title" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BcAssumptionSet" (
    "id" TEXT NOT NULL,
    "bcId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BcAssumptionSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessCase_userId_idx" ON "BusinessCase"("userId");

-- CreateIndex
CREATE INDEX "BusinessCase_organizationId_idx" ON "BusinessCase"("organizationId");

-- CreateIndex
CREATE INDEX "BcAssumptionSet_bcId_idx" ON "BcAssumptionSet"("bcId");

-- CreateIndex
CREATE UNIQUE INDEX "BcAssumptionSet_bcId_version_key" ON "BcAssumptionSet"("bcId", "version");

-- AddForeignKey
ALTER TABLE "BcAssumptionSet" ADD CONSTRAINT "BcAssumptionSet_bcId_fkey" FOREIGN KEY ("bcId") REFERENCES "BusinessCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

