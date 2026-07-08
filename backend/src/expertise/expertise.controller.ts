import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { RequiresTier } from '../auth/tiers.decorator';
import { Tier } from '@prisma/client';
import { ExpertiseService, EvidenceTier } from './expertise.service';
import { MasteryService } from './mastery.service';
import { CredentialService } from './credential.service';
import { ProfileService } from './profile.service';
import { Difficulty } from './path.logic';

/**
 * EXP-1/2/3/5 — Expertise & Mastery Engine. PRO-gated behind JWT.
 * Base path: /api/v1/expertise
 */
@Controller('expertise')
@UseGuards(JwtAuthGuard, TierGuard)
@RequiresTier(Tier.PRO)
export class ExpertiseController {
  constructor(
    private readonly expertise: ExpertiseService,
    private readonly mastery: MasteryService,
    private readonly credentials: CredentialService,
    private readonly profiles: ProfileService,
  ) {}

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

  // ---- EXP-6 graded practice (S-56) ----
  @Post('mastery/seed')
  seedMastery() {
    return this.mastery.seedMastery();
  }

  @Get('scenario-skills/:scenarioKey')
  scenarioSkills(@Param('scenarioKey') scenarioKey: string) {
    return this.mastery.scenarioSkills(scenarioKey);
  }

  // ---- EXP-7 assessments + peer review (S-56) ----
  @Get('assessments')
  assessments(@Query('skillUri') skillUri?: string) {
    return this.mastery.listAssessments(skillUri);
  }

  @Get('assessments/:id/serve')
  serveAssessment(@Param('id') id: string, @Query('seed') seed?: string, @Query('count') count?: string) {
    return this.mastery.serveAssessment(id, Number(seed ?? 1), Number(count ?? 5));
  }

  @Post('assessments/:id/attempt')
  attempt(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { answers: Record<string, number>; seed?: number; count?: number },
  ) {
    return this.mastery.submitAttempt(this.userId(req), id, body.answers ?? {}, body.seed ?? 1, body.count ?? 5);
  }

  @Get('me/attempts')
  myAttempts(@Request() req: any) {
    return this.mastery.listMyAttempts(this.userId(req));
  }

  @Get('attempts/:id/reviews')
  attemptReviews(@Request() req: any, @Param('id') id: string) {
    return this.mastery.attemptReviews(this.userId(req), id);
  }

  @Post('attempts/:id/peer-review')
  peerReview(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { rubric: Record<string, any>; scorePct: number },
  ) {
    return this.mastery.addPeerReview(this.userId(req), id, body.rubric ?? {}, body.scorePct ?? 0);
  }

  // ---- EXP-8 credentials (S-56; public verify lives in ExpertisePublicController) ----
  @Post('me/credentials/claim')
  claimCredential(@Request() req: any, @Body() body: { skillUri: string }) {
    return this.credentials.claim(this.userId(req), body.skillUri);
  }

  @Get('me/credentials')
  myCredentials(@Request() req: any) {
    return this.credentials.listMine(this.userId(req));
  }

  @Post('me/credentials/:id/revoke')
  revokeCredential(@Request() req: any, @Param('id') id: string) {
    return this.credentials.revoke(this.userId(req), id);
  }

  @Get('me/credentials/:id/europass')
  europass(@Request() req: any, @Param('id') id: string) {
    return this.credentials.europassExport(this.userId(req), id);
  }

  // ---- EXP-10 expert profile (S-56; private by default) ----
  @Get('me/profile')
  myProfile(@Request() req: any) {
    return this.profiles.aggregate(this.userId(req));
  }

  @Post('me/profile')
  upsertProfile(@Request() req: any, @Body() body: { headline?: string; bio?: string }) {
    return this.profiles.upsertProfile(this.userId(req), body);
  }

  @Post('me/profile/visibility')
  setVisibility(@Request() req: any, @Body() body: { isPublic: boolean }) {
    return this.profiles.setVisibility(this.userId(req), !!body.isPublic);
  }

  @Post('endorse')
  endorse(@Request() req: any, @Body() body: { targetUserId: string; skillUri: string; note?: string }) {
    return this.profiles.endorse(this.userId(req), body.targetUserId, body.skillUri, body.note);
  }
}
