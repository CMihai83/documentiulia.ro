-- CreateEnum
CREATE TYPE "CostCenterCategory" AS ENUM ('production', 'sales', 'administration', 'rd', 'logistics', 'it', 'management');

-- CreateEnum
CREATE TYPE "CostElementCategory" AS ENUM ('personnel', 'materials', 'services', 'depreciation', 'rent_utilities', 'marketing', 'travel', 'it_software', 'financial', 'other');

-- CreateEnum
CREATE TYPE "InternalOrderType" AS ENUM ('project', 'event', 'capex', 'maintenance', 'marketing_campaign');

-- CreateEnum
CREATE TYPE "InternalOrderStatus" AS ENUM ('open', 'released', 'technically_closed', 'closed');

-- CreateEnum
CREATE TYPE "AllocationMethod" AS ENUM ('distribution', 'assessment');

-- CreateEnum
CREATE TYPE "AllocationDriver" AS ENUM ('headcount', 'area_sqm', 'revenue_share', 'machine_hours', 'fixed_percentage');

-- CreateTable
CREATE TABLE "CostCenter" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameRo" TEXT NOT NULL,
    "category" "CostCenterCategory" NOT NULL,
    "parentId" TEXT,
    "managerName" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfitCenter" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameRo" TEXT NOT NULL,
    "responsible" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfitCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostElement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "CostElementCategory" NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'primary',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostLine" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "costCenterId" TEXT NOT NULL,
    "costElementId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "planned" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "actual" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalOrder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "InternalOrderType" NOT NULL DEFAULT 'project',
    "responsibleCostCenterId" TEXT NOT NULL,
    "budget" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "actual" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "status" "InternalOrderStatus" NOT NULL DEFAULT 'open',
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationCycle" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "method" "AllocationMethod" NOT NULL DEFAULT 'assessment',
    "driver" "AllocationDriver" NOT NULL DEFAULT 'headcount',
    "senderCostCenterId" TEXT NOT NULL,
    "receiverCostCenterIds" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllocationCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfitabilitySegment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "profitCenterId" TEXT NOT NULL,
    "revenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cogs" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "directCosts" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "allocatedFixedCosts" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfitabilitySegment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CostCenter_organizationId_idx" ON "CostCenter"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CostCenter_organizationId_code_key" ON "CostCenter"("organizationId", "code");

-- CreateIndex
CREATE INDEX "ProfitCenter_organizationId_idx" ON "ProfitCenter"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfitCenter_organizationId_code_key" ON "ProfitCenter"("organizationId", "code");

-- CreateIndex
CREATE INDEX "CostElement_organizationId_idx" ON "CostElement"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CostElement_organizationId_code_key" ON "CostElement"("organizationId", "code");

-- CreateIndex
CREATE INDEX "CostLine_organizationId_period_idx" ON "CostLine"("organizationId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "CostLine_organizationId_costCenterId_costElementId_period_key" ON "CostLine"("organizationId", "costCenterId", "costElementId", "period");

-- CreateIndex
CREATE INDEX "InternalOrder_organizationId_idx" ON "InternalOrder"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "InternalOrder_organizationId_code_key" ON "InternalOrder"("organizationId", "code");

-- CreateIndex
CREATE INDEX "AllocationCycle_organizationId_idx" ON "AllocationCycle"("organizationId");

-- CreateIndex
CREATE INDEX "ProfitabilitySegment_organizationId_idx" ON "ProfitabilitySegment"("organizationId");

