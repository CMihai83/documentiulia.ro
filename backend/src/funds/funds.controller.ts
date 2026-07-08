import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { RequiresTier } from '../auth/tiers.decorator';
import { Tier } from '@prisma/client';
import { FundsService, CreateProgramDto, ProfileDto } from './funds.service';
import { DeMinimisService } from './deminimis.service';
import { FundsAdvisoryService } from './funds-advisory.service';
import { CoFinInput, ProjectionInput } from './funds-advisory.logic';
import { BeneficiaryType } from './durability.logic';

/**
 * FND-1/2/3/4 — Funds & Financing Advisory. PRO-gated behind JWT.
 * Base path: /api/v1/funds
 */
@Controller('funds')
@UseGuards(JwtAuthGuard, TierGuard)
@RequiresTier(Tier.PRO)
export class FundsController {
  constructor(
    private readonly funds: FundsService,
    private readonly deMinimis: DeMinimisService,
    private readonly advisory: FundsAdvisoryService,
  ) {}

  private userId(req: any): string {
    return req.user?.userId ?? req.user?.id ?? req.user?.sub;
  }
  private orgId(req: any): string | undefined {
    return req.user?.organizationId ?? req.user?.orgId ?? req.headers?.['x-organization-id'];
  }

  // ---- FND-1 catalog ----
  @Get('programs')
  listPrograms(@Query('status') status?: string) { return this.funds.listPrograms(status); }

  @Get('programs/:id')
  getProgram(@Param('id') id: string) { return this.funds.getProgram(id); }

  @Post('programs')
  createProgram(@Body() dto: CreateProgramDto) { return this.funds.createProgram(dto); }

  @Patch('programs/:id')
  updateProgram(@Param('id') id: string, @Body() dto: Partial<CreateProgramDto>) { return this.funds.updateProgram(id, dto); }

  @Delete('programs/:id')
  closeProgram(@Param('id') id: string) { return this.funds.closeProgram(id); }

  @Post('seed')
  seed() { return this.funds.seed(); }

  // ---- FND-2 profile + match ----
  @Get('profile')
  getProfile(@Request() req: any) {
    const org = this.orgId(req);
    return org ? this.funds.getProfile(org) : null;
  }

  @Post('profile')
  upsertProfile(@Request() req: any, @Body() dto: ProfileDto) {
    const org = this.orgId(req);
    if (!org) return { error: 'No organization context.' };
    return this.funds.upsertProfile(this.userId(req), org, dto);
  }

  @Post('match')
  match(@Request() req: any, @Body() body: { requestedCostEur?: number; projectType?: string }) {
    const org = this.orgId(req);
    if (!org) return { error: 'No organization context.' };
    return this.funds.match(org, body);
  }

  // ---- FND-3 de minimis ledger ----
  @Get('deminimis')
  deMinimisStatus(@Request() req: any) {
    const org = this.orgId(req);
    return org ? this.deMinimis.status(org) : null;
  }

  @Get('deminimis/aids')
  deMinimisList(@Request() req: any) {
    const org = this.orgId(req);
    return org ? this.deMinimis.list(org) : [];
  }

  @Post('deminimis')
  recordAid(@Request() req: any, @Body() dto: { grantorProgram: string; amountEur: number; awardedDate: string; source?: string }) {
    const org = this.orgId(req);
    if (!org) return { error: 'No organization context.' };
    return this.deMinimis.record(org, dto);
  }

  // ---- FND-4 pre-check ----
  @Post('precheck')
  precheck(@Request() req: any, @Body() body: { requestedType?: string; requestedCostEur?: number }) {
    return this.funds.precheck(this.userId(req), this.orgId(req), body);
  }

  @Get('leads')
  leads(@Request() req: any) { return this.funds.listLeads(this.userId(req)); }

  // ---- FND-5 dossier checklist ----
  @Post('checklist')
  createChecklist(@Request() req: any, @Body() body: { programId?: string }) {
    return this.advisory.createChecklist(this.userId(req), this.orgId(req) ?? null, body?.programId ?? null);
  }

  @Get('checklist/:id')
  getChecklist(@Param('id') id: string) { return this.advisory.getChecklist(id); }

  @Patch('checklist/item/:itemId')
  setItem(@Param('itemId') itemId: string, @Body() body: { status: 'missing' | 'uploaded' | 'verified'; documentId?: string }) {
    return this.advisory.setItemStatus(itemId, body.status, body.documentId);
  }

  // ---- FND-6 business-plan projection ----
  @Post('projection')
  createProjection(@Request() req: any, @Body() dto: ProjectionInput & { title: string; programId?: string; indicatorTargets?: any }) {
    return this.advisory.createProjection(this.userId(req), this.orgId(req) ?? null, dto);
  }

  @Get('projection/:id/deliverable')
  exportProjection(@Param('id') id: string, @Query('locale') locale?: 'ro' | 'en', @Query('maturity') maturity?: 'SOC' | 'OBC' | 'FBC') {
    return this.advisory.exportProjectionDeliverable(id, locale ?? 'ro', maturity ?? 'OBC');
  }

  // ---- FND-7 co-financing / VAT ----
  @Post('cofinance')
  coFinance(@Request() req: any, @Body() input: CoFinInput) {
    return this.advisory.coFinance(this.orgId(req) ?? null, input);
  }

  // ---- FND-8 financing marketplace ----
  @Post('instruments/seed')
  seedInstruments() { return this.advisory.seedInstruments(); }

  @Get('instruments')
  rankInstruments(@Query('gap') gap?: string) {
    return this.advisory.rankInstruments(Number(gap ?? 0));
  }

  // ---- FND-9 durability tracker ----
  @Post('durability')
  createDurability(@Request() req: any, @Body() dto: { title: string; finalPaymentDate: string; beneficiaryType: BeneficiaryType; programId?: string }) {
    return this.advisory.createDurability(this.userId(req), this.orgId(req) ?? null, dto);
  }

  @Get('durability')
  listDurability(@Request() req: any) { return this.advisory.listDurability(this.userId(req)); }
}
