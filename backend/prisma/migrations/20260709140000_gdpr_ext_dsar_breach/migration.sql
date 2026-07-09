-- AlterTable
ALTER TABLE "RopaEntry" ADD COLUMN     "documentedSafeguards" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dpoDesignated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "staffTrainingAttested" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "DsarRequest" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "dataSubjectRef" TEXT NOT NULL,
    "subjectEmailHash" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "extendedTo" TIMESTAMP(3),
    "extensionReason" TEXT,
    "verificationTier" TEXT NOT NULL DEFAULT 'low',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "statusToken" TEXT NOT NULL,
    "responsePayload" JSONB,
    "refusalReason" TEXT,
    "overdue" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DsarRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DsarEvent" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DsarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErasureLedger" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "dsarRequestId" TEXT,
    "dataSubjectRef" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "scope" JSONB NOT NULL,
    "backupExpiryAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErasureLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreachIncident" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categories" TEXT[],
    "affectedCount" INTEGER NOT NULL DEFAULT 0,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "notifyDueAt" TIMESTAMP(3) NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'low',
    "enisaScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'triage',
    "ansdpcDraft" JSONB,
    "subjectDraft" JSONB,
    "dpaNotifiedAt" TIMESTAMP(3),
    "subjectsNotifiedAt" TIMESTAMP(3),
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "notNotifiedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BreachIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreachAction" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BreachAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DsarRequest_statusToken_key" ON "DsarRequest"("statusToken");

-- CreateIndex
CREATE INDEX "DsarRequest_orgId_status_idx" ON "DsarRequest"("orgId", "status");

-- CreateIndex
CREATE INDEX "DsarRequest_orgId_dueAt_idx" ON "DsarRequest"("orgId", "dueAt");

-- CreateIndex
CREATE INDEX "DsarEvent_requestId_idx" ON "DsarEvent"("requestId");

-- CreateIndex
CREATE INDEX "ErasureLedger_orgId_idx" ON "ErasureLedger"("orgId");

-- CreateIndex
CREATE INDEX "BreachIncident_orgId_status_idx" ON "BreachIncident"("orgId", "status");

-- CreateIndex
CREATE INDEX "BreachIncident_orgId_notifyDueAt_idx" ON "BreachIncident"("orgId", "notifyDueAt");

-- CreateIndex
CREATE INDEX "BreachAction_incidentId_idx" ON "BreachAction"("incidentId");

-- AddForeignKey
ALTER TABLE "DsarEvent" ADD CONSTRAINT "DsarEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "DsarRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreachAction" ADD CONSTRAINT "BreachAction_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "BreachIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

