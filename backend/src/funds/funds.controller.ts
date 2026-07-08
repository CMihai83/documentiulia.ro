import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { RequiresTier } from '../auth/tiers.decorator';
import { Tier } from '@prisma/client';
import { FundsService, CreateProgramDto, ProfileDto } from './funds.service';
import { DeMinimisService } from './deminimis.service';

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
}
