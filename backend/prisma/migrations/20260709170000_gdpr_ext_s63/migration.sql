-- AlterTable
ALTER TABLE "CmpBannerConfig" ADD COLUMN     "consentModeV2" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "geoEuOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scanResult" JSONB,
ADD COLUMN     "scannedAt" TIMESTAMP(3),
ADD COLUMN     "tcfEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "DpiaAssessment" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "ropaEntryId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "screening" JSONB NOT NULL,
    "verdict" TEXT NOT NULL,
    "verdictReasons" TEXT[],
    "risks" JSONB,
    "residualBand" TEXT,
    "wizardRequired" BOOLEAN NOT NULL DEFAULT false,
    "wizard" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "art36Html" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DpiaAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GdprVendor" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'processor',
    "country" TEXT NOT NULL DEFAULT 'RO',
    "isEu" BOOLEAN NOT NULL DEFAULT true,
    "transferMechanism" TEXT,
    "dpfClaimed" BOOLEAN NOT NULL DEFAULT false,
    "dpfEvidenceUrl" TEXT,
    "ropaEntryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contactEmail" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GdprVendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DpaDocument" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ro',
    "version" INTEGER NOT NULL,
    "sccModule" TEXT,
    "html" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DpaDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TiaAssessment" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "answers" JSONB NOT NULL,
    "score" INTEGER NOT NULL,
    "verdict" TEXT NOT NULL,
    "measures" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TiaAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubprocessorObjection" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondDueAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "respondedAt" TIMESTAMP(3),
    "response" TEXT,

    CONSTRAINT "SubprocessorObjection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DpiaAssessment_orgId_idx" ON "DpiaAssessment"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "DpiaAssessment_orgId_ropaEntryId_version_key" ON "DpiaAssessment"("orgId", "ropaEntryId", "version");

-- CreateIndex
CREATE INDEX "GdprVendor_orgId_idx" ON "GdprVendor"("orgId");

-- CreateIndex
CREATE INDEX "GdprVendor_orgId_published_idx" ON "GdprVendor"("orgId", "published");

-- CreateIndex
CREATE INDEX "DpaDocument_orgId_vendorId_idx" ON "DpaDocument"("orgId", "vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "DpaDocument_orgId_vendorId_locale_version_key" ON "DpaDocument"("orgId", "vendorId", "locale", "version");

-- CreateIndex
CREATE INDEX "TiaAssessment_orgId_idx" ON "TiaAssessment"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "TiaAssessment_orgId_vendorId_version_key" ON "TiaAssessment"("orgId", "vendorId", "version");

-- CreateIndex
CREATE INDEX "SubprocessorObjection_orgId_status_idx" ON "SubprocessorObjection"("orgId", "status");

