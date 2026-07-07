-- CreateTable
CREATE TABLE "ConsultingBooking" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "package" JSONB NOT NULL,
    "consultantId" TEXT,
    "consultantName" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "notes" TEXT,
    "meetingLink" TEXT,
    "attachments" JSONB,
    "feedback" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultingBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsultingBooking_organizationId_idx" ON "ConsultingBooking"("organizationId");

-- CreateIndex
CREATE INDEX "ConsultingBooking_organizationId_status_idx" ON "ConsultingBooking"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ConsultingBooking_organizationId_scheduledAt_idx" ON "ConsultingBooking"("organizationId", "scheduledAt");

