import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { ExpertiseController } from './expertise.controller';
import { ExpertiseService } from './expertise.service';
import { MasteryService } from './mastery.service';
import { CredentialService } from './credential.service';
import { ProfileService } from './profile.service';
import { MarketplaceService } from './marketplace.service';
import { ExpertisePublicController } from './expertise-public.controller';

/**
 * EXP-1/2/3/5 — Expertise & Mastery Engine (S-55 EXP Foundations).
 * ESCO taxonomy, user evidence tiers, gap analysis, mastery paths.
 * Orchestrates existing assets (LMS, Simulator, MatchingService); persists to Prisma.
 */
@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ExpertiseController, ExpertisePublicController],
  providers: [ExpertiseService, MasteryService, CredentialService, ProfileService, MarketplaceService],
  exports: [ExpertiseService, MasteryService, CredentialService, ProfileService],
})
export class ExpertiseModule {}
