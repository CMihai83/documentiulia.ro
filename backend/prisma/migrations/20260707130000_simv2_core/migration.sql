-- CreateTable
CREATE TABLE "SimV2Run" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT,
    "scenarioKey" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'practice',
    "status" TEXT NOT NULL DEFAULT 'active',
    "seed" INTEGER NOT NULL,
    "currentTick" INTEGER NOT NULL DEFAULT 0,
    "clockYear" INTEGER NOT NULL DEFAULT 1,
    "clockMonth" INTEGER NOT NULL DEFAULT 1,
    "clockDay" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimV2Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimV2State" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "tick" INTEGER NOT NULL,
    "stateJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimV2State_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SimV2Run_userId_status_idx" ON "SimV2Run"("userId", "status");

-- CreateIndex
CREATE INDEX "SimV2State_runId_idx" ON "SimV2State"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "SimV2State_runId_tick_key" ON "SimV2State"("runId", "tick");

-- AddForeignKey
ALTER TABLE "SimV2State" ADD CONSTRAINT "SimV2State_runId_fkey" FOREIGN KEY ("runId") REFERENCES "SimV2Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

