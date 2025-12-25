-- Add Simulation Enums
CREATE TYPE "SimulationStatus" AS ENUM ('SIM_ACTIVE', 'SIM_PAUSED', 'SIM_COMPLETED', 'SIM_FAILED', 'SIM_ABANDONED');
CREATE TYPE "SimulationDifficulty" AS ENUM ('SIM_TUTORIAL', 'SIM_EASY', 'SIM_NORMAL', 'SIM_HARD', 'SIM_EXPERT');
CREATE TYPE "SimDecisionCategory" AS ENUM ('SIM_FINANCIAL', 'SIM_OPERATIONS', 'SIM_HR', 'SIM_MARKETING', 'SIM_COMPLIANCE', 'SIM_GROWTH', 'SIM_RISK');
CREATE TYPE "SimEventType" AS ENUM ('SIM_MARKET_CHANGE', 'SIM_REGULATION_CHANGE', 'SIM_ECONOMIC_SHOCK', 'SIM_OPPORTUNITY', 'SIM_CRISIS', 'SIM_AUDIT', 'SIM_CUSTOMER_EVENT', 'SIM_EMPLOYEE_EVENT', 'SIM_SUPPLIER_EVENT', 'SIM_COMPETITION');
CREATE TYPE "SimEventSeverity" AS ENUM ('SEVERITY_LOW', 'SEVERITY_MEDIUM', 'SEVERITY_HIGH', 'SEVERITY_CRITICAL');
CREATE TYPE "SimScenarioType" AS ENUM ('SCENARIO_FREEPLAY', 'SCENARIO_TUTORIAL', 'SCENARIO_CHALLENGE', 'SCENARIO_CRISIS_SURVIVAL', 'SCENARIO_GROWTH_RACE', 'SCENARIO_COMPLIANCE_TEST');

-- Create SimulationScenario table
CREATE TABLE "SimulationScenario" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "description" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "difficulty" "SimulationDifficulty" NOT NULL,
    "initialState" JSONB NOT NULL,
    "objectives" JSONB NOT NULL,
    "timeLimit" INTEGER,
    "type" "SimScenarioType" NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 500,
    "badgeId" TEXT,
    "relatedCourseIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SimulationScenario_pkey" PRIMARY KEY ("id")
);

-- Create SimulationGame table
CREATE TABLE "SimulationGame" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currentMonth" INTEGER NOT NULL DEFAULT 1,
    "currentYear" INTEGER NOT NULL DEFAULT 2025,
    "status" "SimulationStatus" NOT NULL DEFAULT 'SIM_ACTIVE',
    "difficulty" "SimulationDifficulty" NOT NULL DEFAULT 'SIM_NORMAL',
    "healthScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "financialScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "operationsScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "complianceScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "growthScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "scenarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SimulationGame_pkey" PRIMARY KEY ("id")
);

-- Create SimulationState table
CREATE TABLE "SimulationState" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "cash" DECIMAL(14,2) NOT NULL DEFAULT 50000,
    "revenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "expenses" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "profit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "receivables" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "payables" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "inventory" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "equipment" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "loans" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "employees" INTEGER NOT NULL DEFAULT 1,
    "capacity" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "utilization" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "quality" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "marketShare" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "customerCount" INTEGER NOT NULL DEFAULT 10,
    "reputation" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "taxOwed" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vatBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "penaltiesRisk" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "auditRisk" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "metricsSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SimulationState_pkey" PRIMARY KEY ("id")
);

-- Create SimulationDecision table
CREATE TABLE "SimulationDecision" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "category" "SimDecisionCategory" NOT NULL,
    "type" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "impactSummary" TEXT,
    "impactMetrics" JSONB,
    "relatedCourseId" TEXT,
    "relatedLessonId" TEXT,
    "aiRecommendation" TEXT,
    "wasSuccessful" BOOLEAN,
    "outcomeNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SimulationDecision_pkey" PRIMARY KEY ("id")
);

-- Create SimulationEvent table
CREATE TABLE "SimulationEvent" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "type" "SimEventType" NOT NULL,
    "severity" "SimEventSeverity" NOT NULL DEFAULT 'SEVERITY_MEDIUM',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impact" JSONB NOT NULL,
    "responseOptions" JSONB,
    "playerChoice" TEXT,
    "outcome" TEXT,
    "outcomeImpact" JSONB,
    "deadline" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SimulationEvent_pkey" PRIMARY KEY ("id")
);

-- Create SimulationAchievement table
CREATE TABLE "SimulationAchievement" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "xpReward" INTEGER NOT NULL DEFAULT 100,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SimulationAchievement_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "SimulationGame_userId_idx" ON "SimulationGame"("userId");
CREATE INDEX "SimulationGame_status_idx" ON "SimulationGame"("status");
CREATE INDEX "SimulationGame_scenarioId_idx" ON "SimulationGame"("scenarioId");
CREATE INDEX "SimulationState_gameId_idx" ON "SimulationState"("gameId");
CREATE UNIQUE INDEX "SimulationState_gameId_month_year_key" ON "SimulationState"("gameId", "month", "year");
CREATE INDEX "SimulationDecision_gameId_idx" ON "SimulationDecision"("gameId");
CREATE INDEX "SimulationDecision_category_idx" ON "SimulationDecision"("category");
CREATE INDEX "SimulationEvent_gameId_idx" ON "SimulationEvent"("gameId");
CREATE INDEX "SimulationEvent_type_idx" ON "SimulationEvent"("type");
CREATE INDEX "SimulationAchievement_gameId_idx" ON "SimulationAchievement"("gameId");
CREATE UNIQUE INDEX "SimulationScenario_slug_key" ON "SimulationScenario"("slug");

-- Add foreign key constraints
ALTER TABLE "SimulationGame" ADD CONSTRAINT "SimulationGame_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "SimulationScenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SimulationState" ADD CONSTRAINT "SimulationState_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "SimulationGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SimulationDecision" ADD CONSTRAINT "SimulationDecision_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "SimulationGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SimulationEvent" ADD CONSTRAINT "SimulationEvent_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "SimulationGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SimulationAchievement" ADD CONSTRAINT "SimulationAchievement_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "SimulationGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;
