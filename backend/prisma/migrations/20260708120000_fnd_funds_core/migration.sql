-- CreateTable
CREATE TABLE "FundingProgram" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "beneficiaryType" TEXT NOT NULL,
    "sizeEligibility" TEXT[],
    "coFinancingPct" DOUBLE PRECISION,
    "legalBasis" TEXT NOT NULL,
    "gberArticle" TEXT,
    "aidIntensityPct" DOUBLE PRECISION,
    "ceilingEur" DOUBLE PRECISION,
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "caenWhitelist" TEXT[],
    "caenBlacklist" TEXT[],
    "regions" TEXT[],
    "interventionField" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "sourceUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundingProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caenPrimary" TEXT,
    "caenSecondary" TEXT[],
    "foundedDate" TIMESTAMP(3),
    "headcount" INTEGER,
    "turnoverEur" DOUBLE PRECISION,
    "balanceSheetEur" DOUBLE PRECISION,
    "subscribedCapitalEur" DOUBLE PRECISION,
    "accumulatedLossEur" DOUBLE PRECISION,
    "equityEur" DOUBLE PRECISION,
    "partnerLinks" JSONB,
    "anafDebt" BOOLEAN NOT NULL DEFAULT false,
    "insolvent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeMinimisAid" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "grantorProgram" TEXT NOT NULL,
    "amountEur" DOUBLE PRECISION NOT NULL,
    "awardedDate" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'self-declared',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeMinimisAid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingLead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "criteria" JSONB NOT NULL,
    "eligible" BOOLEAN NOT NULL,
    "requestedType" TEXT,
    "requestedCostEur" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FundingLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FundingProgram_status_idx" ON "FundingProgram"("status");

-- CreateIndex
CREATE INDEX "FundingProgram_legalBasis_idx" ON "FundingProgram"("legalBasis");

-- CreateIndex
CREATE UNIQUE INDEX "FundingProfile_organizationId_key" ON "FundingProfile"("organizationId");

-- CreateIndex
CREATE INDEX "FundingProfile_userId_idx" ON "FundingProfile"("userId");

-- CreateIndex
CREATE INDEX "DeMinimisAid_organizationId_idx" ON "DeMinimisAid"("organizationId");

-- CreateIndex
CREATE INDEX "DeMinimisAid_organizationId_awardedDate_idx" ON "DeMinimisAid"("organizationId", "awardedDate");

-- CreateIndex
CREATE INDEX "FundingLead_userId_idx" ON "FundingLead"("userId");

-- CreateIndex
CREATE INDEX "FundingLead_organizationId_idx" ON "FundingLead"("organizationId");

