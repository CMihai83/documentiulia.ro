import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { RequiresTier } from '../auth/tiers.decorator';
import { Tier } from '@prisma/client';
import { BusinessCaseService } from './business-case.service';
import { BcTemplate } from './bc.questionnaire';

/**
 * BC-101/102/103 — Business-Case studio. PRO-gated (TierGuard) behind JWT auth.
 */
@Controller('business-case')
@UseGuards(JwtAuthGuard, TierGuard)
@RequiresTier(Tier.PRO)
export class BusinessCaseController {
  constructor(private readonly svc: BusinessCaseService) {}

  private userId(req: any): string {
    return req.user?.userId ?? req.user?.id ?? req.user?.sub;
  }
  private orgId(req: any): string | undefined {
    return req.user?.organizationId ?? req.user?.orgId ?? undefined;
  }

  @Get('templates')
  templates() {
    return this.svc.listTemplates();
  }

  @Get('templates/:template/questionnaire')
  questionnaire(@Param('template') template: BcTemplate) {
    return this.svc.getQuestionnaire(template);
  }

  @Post()
  create(@Request() req: any, @Body() body: { title: string; template: BcTemplate }) {
    return this.svc.create(this.userId(req), this.orgId(req), body);
  }

  @Get()
  list(@Request() req: any) {
    return this.svc.list(this.userId(req));
  }

  @Get(':id')
  get(@Request() req: any, @Param('id') id: string) {
    return this.svc.get(this.userId(req), id);
  }

  @Post(':id/answers')
  submit(@Request() req: any, @Param('id') id: string, @Body() body: { answers: Record<string, any> }) {
    return this.svc.submitAnswers(this.userId(req), id, body?.answers ?? {});
  }

  /** Patch = save a new version (answers are never mutated in place). */
  @Patch(':id/answers')
  patch(@Request() req: any, @Param('id') id: string, @Body() body: { answers: Record<string, any> }) {
    return this.svc.submitAnswers(this.userId(req), id, body?.answers ?? {});
  }

  @Get(':id/versions')
  versions(@Request() req: any, @Param('id') id: string) {
    return this.svc.listVersions(this.userId(req), id);
  }

  @Get(':id/diff')
  diff(@Request() req: any, @Param('id') id: string, @Query('from') from: string, @Query('to') to: string) {
    return this.svc.diff(this.userId(req), id, Number(from), Number(to));
  }
}
