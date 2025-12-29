-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('INVOICE', 'RECEIPT', 'CONTRACT', 'OTHER');

-- CreateTable
CREATE TABLE "OCRTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "documentType" "DocumentType" NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'ro',
    "zones" JSONB NOT NULL,
    "aiPrompt" TEXT,
    "matchPatterns" JSONB,
    "createdById" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OCRTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractedField" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "templateId" TEXT,
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "partnerName" TEXT,
    "partnerCui" TEXT,
    "partnerAddress" TEXT,
    "netAmount" DECIMAL(12,2),
    "vatRate" DECIMAL(5,2),
    "vatAmount" DECIMAL(12,2),
    "grossAmount" DECIMAL(12,2),
    "currency" TEXT,
    "receiptNumber" TEXT,
    "cashRegisterNo" TEXT,
    "contractNumber" TEXT,
    "parties" JSONB,
    "effectiveDate" TIMESTAMP(3),
    "confidences" JSONB NOT NULL,
    "overallConfidence" DOUBLE PRECISION NOT NULL,
    "rawText" TEXT,
    "boundingBoxes" JSONB,
    "wasManuallyEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractedField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OCRTemplate_documentType_idx" ON "OCRTemplate"("documentType");

-- CreateIndex
CREATE INDEX "OCRTemplate_language_idx" ON "OCRTemplate"("language");

-- CreateIndex
CREATE INDEX "ExtractedField_documentId_idx" ON "ExtractedField"("documentId");

-- CreateIndex
CREATE INDEX "ExtractedField_templateId_idx" ON "ExtractedField"("templateId");

-- CreateIndex
CREATE INDEX "ExtractedField_overallConfidence_idx" ON "ExtractedField"("overallConfidence");

-- AddForeignKey
ALTER TABLE "ExtractedField" ADD CONSTRAINT "ExtractedField_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedField" ADD CONSTRAINT "ExtractedField_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OCRTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
