-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "cnpHash" TEXT;

-- CreateTable
CREATE TABLE "EncryptionKeyStore" (
    "id" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "wrappedKey" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'aes-256-gcm',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotatedAt" TIMESTAMP(3),

    CONSTRAINT "EncryptionKeyStore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EncryptionKeyStore_keyId_key" ON "EncryptionKeyStore"("keyId");

-- CreateIndex
CREATE INDEX "EncryptionKeyStore_status_idx" ON "EncryptionKeyStore"("status");

-- CreateIndex
CREATE INDEX "Employee_cnpHash_idx" ON "Employee"("cnpHash");

