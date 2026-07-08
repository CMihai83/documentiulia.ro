import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { RequiresTier } from '../auth/tiers.decorator';
import { Tier } from '@prisma/client';
import { ExpertiseService, EvidenceTier } from './expertise.service';
import { Difficulty } from './path.logic';

/**
 * EXP-1/2/3/5 — Expertise & Mastery Engine. PRO-gated behind JWT.
 * Base path: /api/v1/expertise
 */
@Controller('expertise')
@UseGuards(JwtAuthGuard, TierGuard)
@RequiresTier(Tier.PRO)
export class ExpertiseController {
  constructor(private readonly expertise: ExpertiseService) {}

  private userId(req: any): string {
    return req.user?.userId ?? req.user?.id ?? req.user?.sub;
  }

  // ---- EXP-1 taxonomy ----
  @Post('seed')
  seed() {
    return this.expertise.seed();
  }

  @Post('import')
  import(@Body() body: { skills: any[]; occupations: any[]; version?: string }) {
    return this.expertise.importGraph(body.skills ?? [], body.occupations ?? [], body.version);
  }

  @Get('skills')
  searchSkills(@Query('q') q?: string, @Query('root') root?: string) {
    return this.expertise.searchSkills(q, root);
  }

  // ---- EXP-2 user skills ----
  @Get('me/skills')
  mySkills(@Request() req: any) {
    return this.expertise.listUserSkills(this.userId(req));
  }

  @Post('me/skills')
  setSkill(@Request() req: any, @Body() body: { skillId: string; proficiency: number; tier?: EvidenceTier; evidence?: Record<string, any>; validUntil?: string }) {
    return this.expertise.setUserSkill(
      this.userId(req), body.skillId, body.proficiency, body.tier ?? 'self_declared', body.evidence,
      body.validUntil ? new Date(body.validUntil) : null,
    );
  }

  @Post('me/evidence/lms-completion')
  lmsCompletion(@Request() req: any, @Body() body: { courseId: string }) {
    return this.expertise.inferFromLmsCompletion(this.userId(req), body.courseId);
  }

  @Post('me/evidence/sim-run')
  simRun(@Request() req: any, @Body() body: { runId: string; skillUris: string[]; compositeScore: number }) {
    return this.expertise.inferFromSimRun(this.userId(req), body.runId, body.skillUris ?? [], body.compositeScore ?? 0);
  }

  // ---- EXP-3 gap ----
  @Post('gap')
  gap(@Request() req: any, @Body() body: { occupationUri: string }) {
    return this.expertise.analyseGapForOccupation(this.userId(req), body.occupationUri);
  }

  // ---- EXP-5 mastery path ----
  @Post('path')
  buildPath(@Request() req: any, @Body() body: { occupationUri: string; difficulty?: Difficulty }) {
    return this.expertise.buildMasteryPath(this.userId(req), body.occupationUri, body.difficulty ?? 'standard');
  }

  @Get('paths')
  paths(@Request() req: any) {
    return this.expertise.listPaths(this.userId(req));
  }
}
