import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { ExpertiseController } from './expertise.controller';
import { ExpertiseService } from './expertise.service';

/**
 * EXP-1/2/3/5 — Expertise & Mastery Engine (S-55 EXP Foundations).
 * ESCO taxonomy, user evidence tiers, gap analysis, mastery paths.
 * Orchestrates existing assets (LMS, Simulator, MatchingService); persists to Prisma.
 */
@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ExpertiseController],
  providers: [ExpertiseService],
  exports: [ExpertiseService],
})
export class ExpertiseModule {}
