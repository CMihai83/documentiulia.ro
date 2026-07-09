import { Body, Controller, ForbiddenException, Get, Header, Param, Patch, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { RequiresTier } from '../auth/tiers.decorator';
import { Tier } from '@prisma/client';
import { GdprExtService } from './gdpr-ext.service';
import { IndustryTemplate, RopaEntryLike } from './ropa.logic';
import { PolicyKind, PolicyLocale } from './policy.logic';

/**
 * GDPR-EXT tenant endpoints. Tier packaging (per the sprint plan):
 *   Gratuit  — banner config + generate/publish policies + basic (controller) RoPA CRUD
 *   PRO      — ERP seeding, industry templates, policy versions + diff, consent CSV export
 *   BUSINESS — processor-role RoPA views/entries (accountant-as-processor)
 * Every mutating action is audit-chained in the service.
 */
@Controller('gdpr-ext')
@UseGuards(JwtAuthGuard, TierGuard)
export class GdprExtController {
  constructor(private readonly svc: GdprExtService) {}

  private userId(req: any): string {
    return req?.user?.id || req?.user?.userId;
  }
  private orgId(req: any): string {
    const fromHeader = req?.headers?.['x-organization-id'];
    const fromUser = req?.user?.activeOrganizationId || req?.user?.organizationMemberships?.[0]?.organizationId;
    return fromHeader || fromUser || `user-${this.userId(req)}`; // personal scope fallback (no public slug)
  }
  private tierRank(req: any): number {
    const order = ['FREE', 'PRO', 'BUSINESS', 'ENTERPRISE'];
    let best = Math.max(0, order.indexOf(req?.user?.tier ?? 'FREE'));
    for (const m of req?.user?.organizationMemberships ?? []) {
      best = Math.max(best, order.indexOf(m?.organization?.tier ?? 'FREE'));
    }
    return best;
  }
  private assertBusinessForProcessor(req: any, role?: string) {
    if (role === 'processor' && this.tierRank(req) < 2) {
      throw new ForbiddenException('Intrările de tip împuternicit (processor) necesită planul BUSINESS.');
    }
  }

  // ---- RoPA (basic = FREE; seed/templates = PRO; processor = BUSINESS) ----
  @Get('ropa')
  listRopa(@Request() req: any) {
    return this.svc.listRopa(this.orgId(req), this.tierRank(req) >= 2);
  }

  @Post('ropa')
  createRopa(@Request() req: any, @Body() dto: RopaEntryLike) {
    this.assertBusinessForProcessor(req, dto.role);
    return this.svc.createRopa(this.orgId(req), this.userId(req), dto);
  }

  @Patch('ropa/:id')
  updateRopa(@Request() req: any, @Param('id') id: string, @Body() dto: Partial<RopaEntryLike>) {
    this.assertBusinessForProcessor(req, dto.role);
    return this.svc.updateRopa(this.orgId(req), this.userId(req), id, dto);
  }

  @Post('ropa/seed')
  @RequiresTier(Tier.PRO)
  seed(@Request() req: any) {
    return this.svc.seedRopa(this.orgId(req), this.userId(req));
  }

  @Post('ropa/template/:name')
  @RequiresTier(Tier.PRO)
  template(@Request() req: any, @Param('name') name: IndustryTemplate) {
    return this.svc.applyTemplate(this.orgId(req), this.userId(req), name, this.tierRank(req) >= 2);
  }

  // ---- Policies (generate/publish = FREE; versions/diff = PRO) ----
  @Post('policy/generate')
  generate(@Request() req: any, @Body() body: { kind: PolicyKind; locale?: PolicyLocale }) {
    return this.svc.generatePolicy(this.orgId(req), this.userId(req), body.kind ?? 'privacy', body.locale ?? 'ro');
  }

  @Post('policy/:id/publish')
  publish(@Request() req: any, @Param('id') id: string) {
    return this.svc.publishPolicy(this.orgId(req), this.userId(req), id);
  }

  @Get('policy/versions')
  @RequiresTier(Tier.PRO)
  versions(@Request() req: any, @Query('kind') kind?: string) {
    return this.svc.listPolicyVersions(this.orgId(req), kind);
  }

  @Get('policy/diff')
  @RequiresTier(Tier.PRO)
  diff(@Request() req: any, @Query('a') a: string, @Query('b') b: string) {
    return this.svc.diffPolicyVersions(this.orgId(req), a, b);
  }

  // ---- CMP (config = FREE; export = PRO) ----
  @Get('cmp/config')
  getCmp(@Request() req: any) {
    return this.svc.getCmpConfig(this.orgId(req));
  }

  @Put('cmp/config')
  putCmp(@Request() req: any, @Body() dto: any) {
    return this.svc.updateCmpConfig(this.orgId(req), this.userId(req), dto);
  }

  @Get('cmp/text-hash')
  textHash(@Request() req: any) {
    return this.svc.currentTextHash(this.orgId(req));
  }

  @Get('cmp/consents.csv')
  @RequiresTier(Tier.PRO)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="proof-of-consent.csv"')
  csv(@Request() req: any) {
    return this.svc.consentCsv(this.orgId(req));
  }
}
