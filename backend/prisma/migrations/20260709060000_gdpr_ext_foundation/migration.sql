-- CreateTable
CREATE TABLE "DataSubjectRecord" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "externalRef" TEXT NOT NULL,
    "emailHash" TEXT,
    "sourceModule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataSubjectRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "dataSubjectRef" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'banner',
    "bannerVersion" TEXT,
    "textHash" TEXT,
    "ipHash" TEXT,
    "uaHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RopaEntry" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'controller',
    "processName" TEXT NOT NULL,
    "purposes" TEXT[],
    "legalBasis" TEXT,
    "categories" TEXT[],
    "specialCategories" TEXT[],
    "recipients" TEXT[],
    "transfers" TEXT[],
    "retentionMonths" INTEGER,
    "securityMeasures" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RopaEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyDocument" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ro',
    "version" INTEGER NOT NULL,
    "html" TEXT NOT NULL,
    "sourceRopaHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmpBannerConfig" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "bannerVersion" TEXT NOT NULL DEFAULT '1',
    "categories" JSONB NOT NULL DEFAULT '["necessary","analytics","marketing"]',
    "colors" JSONB,
    "policyUrl" TEXT,
    "texts" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CmpBannerConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DataSubjectRecord_orgId_idx" ON "DataSubjectRecord"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "DataSubjectRecord_orgId_externalRef_key" ON "DataSubjectRecord"("orgId", "externalRef");

-- CreateIndex
CREATE INDEX "ConsentRecord_orgId_dataSubjectRef_idx" ON "ConsentRecord"("orgId", "dataSubjectRef");

-- CreateIndex
CREATE INDEX "ConsentRecord_orgId_purpose_idx" ON "ConsentRecord"("orgId", "purpose");

-- CreateIndex
CREATE INDEX "ConsentRecord_orgId_createdAt_idx" ON "ConsentRecord"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "RopaEntry_orgId_idx" ON "RopaEntry"("orgId");

-- CreateIndex
CREATE INDEX "RopaEntry_orgId_role_idx" ON "RopaEntry"("orgId", "role");

-- CreateIndex
CREATE INDEX "PolicyDocument_orgId_kind_status_idx" ON "PolicyDocument"("orgId", "kind", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyDocument_orgId_kind_locale_version_key" ON "PolicyDocument"("orgId", "kind", "locale", "version");

-- CreateIndex
CREATE UNIQUE INDEX "CmpBannerConfig_orgId_key" ON "CmpBannerConfig"("orgId");

