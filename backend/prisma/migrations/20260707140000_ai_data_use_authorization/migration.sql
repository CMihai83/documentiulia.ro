-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "aiTrainingAuthorized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aiTrainingAuthorizedAt" TIMESTAMP(3),
ADD COLUMN     "aiTrainingAuthorizedBy" TEXT;

