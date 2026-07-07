-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LMSCourseCategory" ADD VALUE 'FINANCE';
ALTER TYPE "LMSCourseCategory" ADD VALUE 'LEADERSHIP';
ALTER TYPE "LMSCourseCategory" ADD VALUE 'COMPLIANCE';
ALTER TYPE "LMSCourseCategory" ADD VALUE 'TECHNOLOGY';
ALTER TYPE "LMSCourseCategory" ADD VALUE 'HR';
ALTER TYPE "LMSCourseCategory" ADD VALUE 'OPERATIONS';
ALTER TYPE "LMSCourseCategory" ADD VALUE 'MARKETING';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LMSLessonType" ADD VALUE 'ASSIGNMENT';
ALTER TYPE "LMSLessonType" ADD VALUE 'LIVE_SESSION';

-- AlterTable
ALTER TABLE "LMSCourse" ADD COLUMN     "ceuCredits" DOUBLE PRECISION,
ADD COLUMN     "discountPrice" DECIMAL(10,2),
ADD COLUMN     "enrollmentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hrdaEligible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "instructor" JSONB,
ADD COLUMN     "learningOutcomes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "prerequisites" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "previewVideo" TEXT,
ADD COLUMN     "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "reviewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shortDescription" TEXT,
ADD COLUMN     "subcategory" TEXT,
ADD COLUMN     "targetAudience" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "LMSCourseModule" ADD COLUMN     "isFree" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "LMSLesson" ADD COLUMN     "contentJson" JSONB,
ADD COLUMN     "isFree" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPreview" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "LMSEnrollment" ADD COLUMN     "accessType" TEXT NOT NULL DEFAULT 'PURCHASED',
ADD COLUMN     "certificateId" TEXT,
ADD COLUMN     "completedAssessments" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "completedModules" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "currentLessonId" TEXT,
ADD COLUMN     "currentModuleId" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "lastAccessedAt" TIMESTAMP(3),
ADD COLUMN     "longestStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paymentId" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "streakDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalTimeSpent" INTEGER NOT NULL DEFAULT 0;

