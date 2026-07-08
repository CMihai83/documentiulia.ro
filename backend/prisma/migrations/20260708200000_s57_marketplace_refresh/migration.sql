-- AlterTable
ALTER TABLE "ExpertProfile" ADD COLUMN     "hourlyRateEur" DOUBLE PRECISION,
ADD COLUMN     "marketplaceOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sessionTypes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "ExpertEngagement" (
    "id" TEXT NOT NULL,
    "expertUserId" TEXT NOT NULL,
    "clientUserId" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 60,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending_hold',
    "rating" INTEGER,
    "ratingComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpertEngagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingProgramRevision" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceUrl" TEXT NOT NULL,
    "rawExcerpt" TEXT NOT NULL DEFAULT '',
    "proposedChanges" JSONB NOT NULL DEFAULT '[]',
    "contentHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FundingProgramRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpertEngagement_expertUserId_idx" ON "ExpertEngagement"("expertUserId");

-- CreateIndex
CREATE INDEX "ExpertEngagement_clientUserId_idx" ON "ExpertEngagement"("clientUserId");

-- CreateIndex
CREATE INDEX "ExpertEngagement_status_idx" ON "ExpertEngagement"("status");

-- CreateIndex
CREATE INDEX "FundingProgramRevision_status_idx" ON "FundingProgramRevision"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FundingProgramRevision_programId_contentHash_key" ON "FundingProgramRevision"("programId", "contentHash");

