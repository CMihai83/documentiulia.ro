-- AlterTable
ALTER TABLE "User" ADD COLUMN     "anonymizedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "legalHold" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "restrictedAt" TIMESTAMP(3),
ADD COLUMN     "restrictionReason" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "legalHold" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "restrictedAt" TIMESTAMP(3),
ADD COLUMN     "restrictionReason" TEXT;

-- AlterTable
ALTER TABLE "VATReport" ADD COLUMN     "legalHold" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "restrictedAt" TIMESTAMP(3),
ADD COLUMN     "restrictionReason" TEXT;

-- AlterTable
ALTER TABLE "SAFTReport" ADD COLUMN     "legalHold" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "restrictedAt" TIMESTAMP(3),
ADD COLUMN     "restrictionReason" TEXT;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "anonymizedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Payroll" ADD COLUMN     "legalHold" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "restrictedAt" TIMESTAMP(3),
ADD COLUMN     "restrictionReason" TEXT;

-- AlterTable
ALTER TABLE "Partner" ADD COLUMN     "anonymizedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "hash" TEXT,
ADD COLUMN     "previousHash" TEXT,
ADD COLUMN     "sequence" BIGINT;

-- AlterTable
ALTER TABLE "DSRRequest" ADD COLUMN     "erasureReport" JSONB;

-- CreateTable
CREATE TABLE "AuditChainHead" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "lastSequence" BIGINT NOT NULL DEFAULT 0,
    "lastHash" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditChainHead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_sequence_idx" ON "AuditLog"("sequence");

