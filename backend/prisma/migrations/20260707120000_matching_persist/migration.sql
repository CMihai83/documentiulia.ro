-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FreelancerAvailability" ADD VALUE 'BUSY';
ALTER TYPE "FreelancerAvailability" ADD VALUE 'ON_VACATION';

-- AlterTable
ALTER TABLE "FreelancerProfile" ADD COLUMN     "country" TEXT,
ADD COLUMN     "profileData" JSONB,
ADD COLUMN     "profileStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "skillsDetailed" JSONB;

-- CreateTable
CREATE TABLE "AtsJobPosting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "responsibilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skills" JSONB NOT NULL DEFAULT '[]',
    "salary" JSONB,
    "jobType" TEXT NOT NULL DEFAULT 'FULL_TIME',
    "experienceLevel" TEXT NOT NULL DEFAULT 'MID',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedChannels" JSONB NOT NULL DEFAULT '[]',
    "applicationDeadline" TIMESTAMP(3),
    "hiringManagerId" TEXT,
    "recruiterId" TEXT,
    "applicantCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AtsJobPosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtsCandidate" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "linkedInUrl" TEXT,
    "portfolioUrl" TEXT,
    "currentPosition" TEXT,
    "currentCompany" TEXT,
    "location" TEXT,
    "yearsOfExperience" INTEGER NOT NULL DEFAULT 0,
    "skills" JSONB NOT NULL DEFAULT '[]',
    "education" JSONB NOT NULL DEFAULT '[]',
    "workExperience" JSONB NOT NULL DEFAULT '[]',
    "languages" JSONB NOT NULL DEFAULT '[]',
    "cvUrl" TEXT,
    "coverLetterUrl" TEXT,
    "source" TEXT NOT NULL DEFAULT 'DIRECT',
    "referredBy" TEXT,
    "gdprConsent" BOOLEAN NOT NULL DEFAULT false,
    "gdprConsentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AtsCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtsApplication" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'DIRECT',
    "matchScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "skillsMatch" JSONB NOT NULL DEFAULT '[]',
    "experienceMatch" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "educationMatch" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cultureMatch" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" JSONB NOT NULL DEFAULT '[]',
    "interviews" JSONB NOT NULL DEFAULT '[]',
    "assessments" JSONB NOT NULL DEFAULT '[]',
    "offer" JSONB,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AtsApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreelancerProject" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requiredSkills" JSONB NOT NULL DEFAULT '[]',
    "budgetType" TEXT NOT NULL DEFAULT 'HOURLY',
    "budgetMin" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "budgetMax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "estimatedDuration" INTEGER NOT NULL DEFAULT 0,
    "locationType" TEXT NOT NULL DEFAULT 'REMOTE',
    "location" TEXT,
    "country" TEXT NOT NULL DEFAULT 'RO',
    "experienceLevel" TEXT NOT NULL DEFAULT 'INTERMEDIATE',
    "contractTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languagesRequired" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "applicationsCount" INTEGER NOT NULL DEFAULT 0,
    "shortlistedCount" INTEGER NOT NULL DEFAULT 0,
    "maxApplicants" INTEGER,
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreelancerProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreelancerProjectApplication" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "coverLetter" TEXT NOT NULL,
    "proposedRate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "proposedDuration" INTEGER NOT NULL DEFAULT 0,
    "proposedStartDate" TIMESTAMP(3) NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "skillMatchScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "experienceMatchScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rateMatchScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "availabilityMatchScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "interviewScheduledAt" TIMESTAMP(3),
    "interviewNotes" TEXT,
    "interviewRating" DOUBLE PRECISION,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreelancerProjectApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AtsJobPosting_status_idx" ON "AtsJobPosting"("status");

-- CreateIndex
CREATE INDEX "AtsJobPosting_department_idx" ON "AtsJobPosting"("department");

-- CreateIndex
CREATE UNIQUE INDEX "AtsCandidate_email_key" ON "AtsCandidate"("email");

-- CreateIndex
CREATE INDEX "AtsCandidate_source_idx" ON "AtsCandidate"("source");

-- CreateIndex
CREATE INDEX "AtsApplication_jobId_status_idx" ON "AtsApplication"("jobId", "status");

-- CreateIndex
CREATE INDEX "AtsApplication_candidateId_idx" ON "AtsApplication"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "AtsApplication_jobId_candidateId_key" ON "AtsApplication"("jobId", "candidateId");

-- CreateIndex
CREATE INDEX "FreelancerProject_status_idx" ON "FreelancerProject"("status");

-- CreateIndex
CREATE INDEX "FreelancerProject_clientId_idx" ON "FreelancerProject"("clientId");

-- CreateIndex
CREATE INDEX "FreelancerProjectApplication_projectId_status_idx" ON "FreelancerProjectApplication"("projectId", "status");

-- CreateIndex
CREATE INDEX "FreelancerProjectApplication_freelancerId_idx" ON "FreelancerProjectApplication"("freelancerId");

-- CreateIndex
CREATE UNIQUE INDEX "FreelancerProjectApplication_projectId_freelancerId_key" ON "FreelancerProjectApplication"("projectId", "freelancerId");

-- CreateIndex
CREATE INDEX "FreelancerProfile_profileStatus_idx" ON "FreelancerProfile"("profileStatus");

-- AddForeignKey
ALTER TABLE "AtsApplication" ADD CONSTRAINT "AtsApplication_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AtsJobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtsApplication" ADD CONSTRAINT "AtsApplication_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "AtsCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelancerProjectApplication" ADD CONSTRAINT "FreelancerProjectApplication_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "FreelancerProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelancerProjectApplication" ADD CONSTRAINT "FreelancerProjectApplication_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "FreelancerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

