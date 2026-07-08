-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "escoUri" TEXT NOT NULL,
    "preferredLabel" TEXT NOT NULL,
    "altLabels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT NOT NULL DEFAULT '',
    "skillType" TEXT NOT NULL DEFAULT 'skill',
    "reuseLevel" TEXT NOT NULL DEFAULT '',
    "parentUri" TEXT,
    "sfiaCode" TEXT,
    "taxonomyVersion" TEXT NOT NULL DEFAULT 'ESCO-1.2',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Occupation" (
    "id" TEXT NOT NULL,
    "escoUri" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "iscoGroup" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "taxonomyVersion" TEXT NOT NULL DEFAULT 'ESCO-1.2',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Occupation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OccupationSkill" (
    "id" TEXT NOT NULL,
    "occupationId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "relation" TEXT NOT NULL DEFAULT 'essential',
    "level" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "OccupationSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSkill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "proficiency" INTEGER NOT NULL DEFAULT 0,
    "evidenceTier" TEXT NOT NULL DEFAULT 'self_declared',
    "evidence" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningPath" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetOccupationId" TEXT,
    "title" TEXT NOT NULL DEFAULT 'Mastery path',
    "difficulty" TEXT NOT NULL DEFAULT 'standard',
    "status" TEXT NOT NULL DEFAULT 'active',
    "estTotalMinutes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningPathStep" (
    "id" TEXT NOT NULL,
    "pathId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'course',
    "refId" TEXT,
    "skillId" TEXT,
    "title" TEXT NOT NULL DEFAULT '',
    "estMinutes" INTEGER NOT NULL DEFAULT 0,
    "prerequisiteStepId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "LearningPathStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Skill_escoUri_key" ON "Skill"("escoUri");

-- CreateIndex
CREATE INDEX "Skill_parentUri_idx" ON "Skill"("parentUri");

-- CreateIndex
CREATE INDEX "Skill_skillType_idx" ON "Skill"("skillType");

-- CreateIndex
CREATE INDEX "Skill_preferredLabel_idx" ON "Skill"("preferredLabel");

-- CreateIndex
CREATE UNIQUE INDEX "Occupation_escoUri_key" ON "Occupation"("escoUri");

-- CreateIndex
CREATE INDEX "Occupation_iscoGroup_idx" ON "Occupation"("iscoGroup");

-- CreateIndex
CREATE INDEX "Occupation_label_idx" ON "Occupation"("label");

-- CreateIndex
CREATE INDEX "OccupationSkill_skillId_idx" ON "OccupationSkill"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "OccupationSkill_occupationId_skillId_key" ON "OccupationSkill"("occupationId", "skillId");

-- CreateIndex
CREATE INDEX "UserSkill_userId_idx" ON "UserSkill"("userId");

-- CreateIndex
CREATE INDEX "UserSkill_skillId_idx" ON "UserSkill"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSkill_userId_skillId_key" ON "UserSkill"("userId", "skillId");

-- CreateIndex
CREATE INDEX "LearningPath_userId_idx" ON "LearningPath"("userId");

-- CreateIndex
CREATE INDEX "LearningPathStep_pathId_idx" ON "LearningPathStep"("pathId");

-- AddForeignKey
ALTER TABLE "OccupationSkill" ADD CONSTRAINT "OccupationSkill_occupationId_fkey" FOREIGN KEY ("occupationId") REFERENCES "Occupation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccupationSkill" ADD CONSTRAINT "OccupationSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPath" ADD CONSTRAINT "LearningPath_targetOccupationId_fkey" FOREIGN KEY ("targetOccupationId") REFERENCES "Occupation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPathStep" ADD CONSTRAINT "LearningPathStep_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "LearningPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;

