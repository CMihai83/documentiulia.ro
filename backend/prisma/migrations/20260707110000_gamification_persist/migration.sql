-- CreateTable
CREATE TABLE "GamificationUserPoints" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "levelProgress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pointsToNextLevel" INTEGER NOT NULL DEFAULT 100,
    "weeklyPoints" INTEGER NOT NULL DEFAULT 0,
    "monthlyPoints" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GamificationUserPoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamificationPointsTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GamificationPointsTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamificationUserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "isNew" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GamificationUserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamificationUserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "currentTier" INTEGER NOT NULL DEFAULT 0,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "unlockedTiers" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GamificationUserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamificationStreak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActivityDate" TIMESTAMP(3),
    "streakFreezeAvailable" INTEGER NOT NULL DEFAULT 2,
    "streakFreezeUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GamificationStreak_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GamificationUserPoints_userId_key" ON "GamificationUserPoints"("userId");

-- CreateIndex
CREATE INDEX "GamificationUserPoints_totalPoints_idx" ON "GamificationUserPoints"("totalPoints");

-- CreateIndex
CREATE INDEX "GamificationPointsTransaction_userId_createdAt_idx" ON "GamificationPointsTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GamificationPointsTransaction_userId_action_idx" ON "GamificationPointsTransaction"("userId", "action");

-- CreateIndex
CREATE INDEX "GamificationUserBadge_userId_idx" ON "GamificationUserBadge"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GamificationUserBadge_userId_badgeId_key" ON "GamificationUserBadge"("userId", "badgeId");

-- CreateIndex
CREATE INDEX "GamificationUserAchievement_userId_idx" ON "GamificationUserAchievement"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GamificationUserAchievement_userId_achievementId_key" ON "GamificationUserAchievement"("userId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "GamificationStreak_userId_key" ON "GamificationStreak"("userId");

