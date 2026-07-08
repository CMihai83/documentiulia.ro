import { Body, Controller, Get, Param, Patch, Post, Query, Request, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { RequiresTier } from '../auth/tiers.decorator';
import { Tier } from '@prisma/client';
import { BusinessCaseService } from './business-case.service';
import { BcTemplate } from './bc.questionnaire';
import { Maturity } from './bc.deliverable';

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

  /** BC-106 — run the appraisal on the latest version and persist a snapshot. */
  @Post(':id/compute')
  compute(@Request() req: any, @Param('id') id: string, @Body() body?: { seed?: number; iterations?: number }) {
    return this.svc.compute(this.userId(req), id, body);
  }

  /** BC-106 — latest persisted appraisal snapshot. */
  @Post(':id/goalseek')
  goalSeek(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.goalSeek(this.userId(req), id, body);
  }

  @Get(':id/results')
  results(@Request() req: any, @Param('id') id: string) {
    return this.svc.getResults(this.userId(req), id);
  }

  @Get(':id/versions')
  versions(@Request() req: any, @Param('id') id: string) {
    return this.svc.listVersions(this.userId(req), id);
  }

  @Get(':id/diff')
  diff(@Request() req: any, @Param('id') id: string, @Query('from') from: string, @Query('to') to: string) {
    return this.svc.diff(this.userId(req), id, Number(from), Number(to));
  }

  /** BC-107 — stream the SOC/OBC/FBC deliverable as a PDF. */
  @Get(':id/deliverable')
  async deliverable(
    @Request() req: any,
    @Param('id') id: string,
    @Res() res: Response,
    @Query('maturity') maturity?: string,
    @Query('locale') locale?: string,
  ) {
    const m: Maturity = ['SOC', 'OBC', 'FBC'].includes(String(maturity)) ? (maturity as Maturity) : 'SOC';
    const loc: 'ro' | 'en' = locale === 'en' ? 'en' : 'ro';
    const out = await this.svc.generateDeliverable(this.userId(req), id, m, loc);
    const buf = Buffer.from(out.content, 'utf8');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${out.filename.replace(/[^\w.\-]/g, '_')}"`);
    res.setHeader('Content-Length', String(buf.length));
    res.end(buf);
  }
}
