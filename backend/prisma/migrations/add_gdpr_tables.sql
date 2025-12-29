-- CreateEnum for DSR Types
CREATE TYPE "DsrType" AS ENUM ('DATA_EXPORT', 'DATA_DELETION', 'DATA_ACCESS', 'DATA_RECTIFICATION', 'CONSENT_WITHDRAWAL');

-- CreateEnum for DSR Status
CREATE TYPE "DsrStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'APPROVED', 'COMPLETED', 'REJECTED');

-- CreateEnum for Consent Purpose
CREATE TYPE "ConsentPurpose" AS ENUM ('ESSENTIAL', 'ANALYTICS', 'MARKETING', 'PERSONALIZATION', 'THIRD_PARTY_SHARING');

-- CreateTable for DSR Requests
CREATE TABLE "DsrRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "DsrType" NOT NULL,
    "status" "DsrStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "additionalDetails" TEXT,
    "adminNotes" TEXT,
    "rejectionReason" TEXT,
    "processedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DsrRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable for Consents
CREATE TABLE "Consent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "ConsentPurpose" NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DsrRequest_userId_idx" ON "DsrRequest"("userId");
CREATE INDEX "DsrRequest_status_idx" ON "DsrRequest"("status");
CREATE INDEX "DsrRequest_type_idx" ON "DsrRequest"("type");
CREATE INDEX "DsrRequest_createdAt_idx" ON "DsrRequest"("createdAt");

-- CreateIndex
CREATE INDEX "Consent_userId_idx" ON "Consent"("userId");
CREATE INDEX "Consent_purpose_idx" ON "Consent"("purpose");
CREATE UNIQUE INDEX "Consent_userId_purpose_key" ON "Consent"("userId", "purpose");

-- AddForeignKey
ALTER TABLE "DsrRequest" ADD CONSTRAINT "DsrRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
