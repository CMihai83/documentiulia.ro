-- AlterTable
ALTER TABLE "FundingProfile" ADD COLUMN     "vatPayer" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "DossierChecklist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "programId" TEXT,
    "legalBasis" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DossierChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DossierItem" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "labelRo" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'missing',
    "documentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DossierItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingProjection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "programId" TEXT,
    "title" TEXT NOT NULL,
    "implementationYears" INTEGER NOT NULL DEFAULT 1,
    "durabilityYears" INTEGER NOT NULL DEFAULT 3,
    "answers" JSONB NOT NULL,
    "resultJson" JSONB NOT NULL,
    "indicatorTargets" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundingProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancingInstrument" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameRo" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT,
    "maxCoveragePct" DOUBLE PRECISION,
    "minAmountEur" DOUBLE PRECISION,
    "maxAmountEur" DOUBLE PRECISION,
    "forReimbursementGap" BOOLEAN NOT NULL DEFAULT false,
    "eligibilitySnippet" TEXT NOT NULL,
    "eligibilitySnippetRo" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancingInstrument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DurabilityObligation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "programId" TEXT,
    "title" TEXT NOT NULL,
    "finalPaymentDate" TIMESTAMP(3) NOT NULL,
    "beneficiaryType" TEXT NOT NULL DEFAULT 'sme',
    "durabilityYears" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DurabilityObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DurabilityEvent" (
    "id" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "descriptionRo" TEXT NOT NULL,
    "alertAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DurabilityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DossierChecklist_userId_idx" ON "DossierChecklist"("userId");

-- CreateIndex
CREATE INDEX "DossierChecklist_organizationId_idx" ON "DossierChecklist"("organizationId");

-- CreateIndex
CREATE INDEX "DossierItem_checklistId_idx" ON "DossierItem"("checklistId");

-- CreateIndex
CREATE INDEX "FundingProjection_userId_idx" ON "FundingProjection"("userId");

-- CreateIndex
CREATE INDEX "FundingProjection_organizationId_idx" ON "FundingProjection"("organizationId");

-- CreateIndex
CREATE INDEX "DurabilityObligation_userId_idx" ON "DurabilityObligation"("userId");

-- CreateIndex
CREATE INDEX "DurabilityObligation_organizationId_idx" ON "DurabilityObligation"("organizationId");

-- CreateIndex
CREATE INDEX "DurabilityEvent_obligationId_idx" ON "DurabilityEvent"("obligationId");

-- AddForeignKey
ALTER TABLE "DossierItem" ADD CONSTRAINT "DossierItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "DossierChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DurabilityEvent" ADD CONSTRAINT "DurabilityEvent_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "DurabilityObligation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

