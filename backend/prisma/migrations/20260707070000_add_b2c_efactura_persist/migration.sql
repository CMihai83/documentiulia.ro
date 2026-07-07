-- CreateTable
CREATE TABLE "B2CInvoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL DEFAULT 'demo-org',
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "invoiceType" TEXT NOT NULL,
    "seller" JSONB NOT NULL,
    "buyer" JSONB NOT NULL,
    "items" JSONB NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "netTotal" DECIMAL(14,2) NOT NULL,
    "vatTotal" DECIMAL(14,2) NOT NULL,
    "grossTotal" DECIMAL(14,2) NOT NULL,
    "paymentMethod" TEXT,
    "paymentTerms" TEXT,
    "dueDate" TIMESTAMP(3),
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "uploadIndex" TEXT,
    "efacturaStatus" TEXT,
    "submittedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "B2CInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "B2CSubmission" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL DEFAULT 'demo-org',
    "invoiceId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "uploadIndex" TEXT,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "xmlGenerated" BOOLEAN NOT NULL DEFAULT false,
    "xml" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retentionExpiresAt" TIMESTAMP(3),

    CONSTRAINT "B2CSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "B2CInvoice_organizationId_idx" ON "B2CInvoice"("organizationId");

-- CreateIndex
CREATE INDEX "B2CInvoice_organizationId_invoiceNumber_idx" ON "B2CInvoice"("organizationId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "B2CSubmission_organizationId_invoiceId_idx" ON "B2CSubmission"("organizationId", "invoiceId");

-- CreateIndex
CREATE INDEX "B2CSubmission_invoiceId_idx" ON "B2CSubmission"("invoiceId");

