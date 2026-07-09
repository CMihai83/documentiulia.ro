import { Body, Controller, ForbiddenException, Get, Header, Param, Patch, Post, Put, Query, Request, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { RequiresTier } from '../auth/tiers.decorator';
import { Tier } from '@prisma/client';
import { GdprExtService } from './gdpr-ext.service';
import { GdprDsarService } from './gdpr-dsar.service';
import { GdprBreachService } from './gdpr-breach.service';
import { GdprDpiaVendorService } from './gdpr-dpia-vendor.service';
import { GdprTrainExportService } from './gdpr-train-export.service';
import { LEGAL_TERMS } from './legal-terms';
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
  constructor(
    private readonly svc: GdprExtService,
    private readonly dsar: GdprDsarService,
    private readonly breach: GdprBreachService,
    private readonly dv: GdprDpiaVendorService,
    private readonly te: GdprTrainExportService,
  ) {}

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

  private assertPro(req: any) {
    if (this.tierRank(req) < 1) throw new ForbiddenException('This feature requires the PRO plan. Upgrade at /dashboard/settings/subscription.');
  }
  private assertBusiness(req: any) {
    if (this.tierRank(req) < 2) throw new ForbiddenException('This feature requires the BUSINESS plan. Upgrade at /dashboard/settings/subscription.');
  }

  // ---- GE-CNP: Law 190/2018 check for a RoPA entry (BUSINESS) ----
  @Get('ropa/:id/law190')
  law190(@Request() req: any, @Param('id') id: string) {
    this.assertBusiness(req);
    return this.svc.law190(this.orgId(req), id);
  }

  // ---- GE-DSAR management (PRO) ----
  @Get('dsar')
  dsarList(@Request() req: any) { this.assertPro(req); return this.dsar.list(this.orgId(req)); }

  @Get('dsar/:id')
  dsarGet(@Request() req: any, @Param('id') id: string) { this.assertPro(req); return this.dsar.get(this.orgId(req), id); }

  @Post('dsar/:id/verify')
  dsarVerify(@Request() req: any, @Param('id') id: string, @Body() b: { providedTier: 'low'|'medium'|'high' }) {
    this.assertPro(req); return this.dsar.verify(this.orgId(req), this.userId(req), id, b?.providedTier ?? 'low');
  }

  @Post('dsar/:id/extend')
  dsarExtend(@Request() req: any, @Param('id') id: string, @Body() b: { reason?: string }) {
    this.assertPro(req); return this.dsar.extend(this.orgId(req), this.userId(req), id, b?.reason ?? '');
  }

  @Post('dsar/:id/export')
  dsarExport(@Request() req: any, @Param('id') id: string) {
    this.assertPro(req); return this.dsar.exportData(this.orgId(req), this.userId(req), id);
  }

  @Post('dsar/:id/erase')
  dsarErase(@Request() req: any, @Param('id') id: string) {
    this.assertPro(req); return this.dsar.erase(this.orgId(req), this.userId(req), id);
  }

  // ---- GE-BREACH (BUSINESS) ----
  @Get('breach')
  breachList(@Request() req: any) { this.assertBusiness(req); return this.breach.list(this.orgId(req)); }

  @Post('breach')
  breachCreate(@Request() req: any, @Body() dto: any) { this.assertBusiness(req); return this.breach.create(this.orgId(req), this.userId(req), dto); }

  @Get('breach/register')
  breachRegister(@Request() req: any) { this.assertBusiness(req); return this.breach.register(this.orgId(req)); }

  @Get('breach/:id')
  breachGet(@Request() req: any, @Param('id') id: string) { this.assertBusiness(req); return this.breach.get(this.orgId(req), id); }

  @Post('breach/:id/notified')
  breachNotified(@Request() req: any, @Param('id') id: string) { this.assertBusiness(req); return this.breach.markNotified(this.orgId(req), this.userId(req), id); }

  @Post('breach/:id/not-notified')
  breachNotNotified(@Request() req: any, @Param('id') id: string, @Body() b: { reason?: string }) {
    this.assertBusiness(req); return this.breach.markNotNotified(this.orgId(req), this.userId(req), id, b?.reason ?? '');
  }

  // ==== S-63 GE-DPIA (BUSINESS) ====
  @Get('dpia')
  dpiaList(@Request() req: any) { this.assertBusiness(req); return this.dv.listDpia(this.orgId(req)); }

  @Post('ropa/:id/dpia/screen')
  dpiaScreen(@Request() req: any, @Param('id') id: string, @Body() b: any) {
    this.assertBusiness(req); return this.dv.screenRopa(this.orgId(req), this.userId(req), id, b ?? {});
  }

  @Post('dpia/:id/risks')
  dpiaRisks(@Request() req: any, @Param('id') id: string, @Body() b: { risks: any[] }) {
    this.assertBusiness(req); return this.dv.assessDpiaRisks(this.orgId(req), this.userId(req), id, b?.risks ?? []);
  }

  @Post('dpia/:id/signoff')
  dpiaSignoff(@Request() req: any, @Param('id') id: string, @Body() b: { wizard?: any }) {
    this.assertBusiness(req); return this.dv.signOffDpia(this.orgId(req), this.userId(req), id, b?.wizard);
  }

  // ==== S-63 GE-VENDOR (BUSINESS) ====
  @Get('vendors')
  vendorList(@Request() req: any) { this.assertBusiness(req); return this.dv.listVendors(this.orgId(req)); }

  @Post('vendors')
  vendorCreate(@Request() req: any, @Body() dto: any) { this.assertBusiness(req); return this.dv.createVendor(this.orgId(req), this.userId(req), dto); }

  @Get('vendors/:id/transfer')
  vendorTransfer(@Request() req: any, @Param('id') id: string, @Query('exporterRole') role?: string) {
    this.assertBusiness(req); return this.dv.transferDecision(this.orgId(req), id, (role as any) ?? 'controller');
  }

  @Post('vendors/:id/tia')
  vendorTia(@Request() req: any, @Param('id') id: string, @Body() b: any) {
    this.assertBusiness(req); return this.dv.saveTia(this.orgId(req), this.userId(req), id, b ?? {});
  }

  @Post('vendors/:id/dpa')
  vendorDpa(@Request() req: any, @Param('id') id: string, @Body() b: { locale?: 'ro' | 'en' }) {
    this.assertBusiness(req); return this.dv.generateDpa(this.orgId(req), this.userId(req), id, b?.locale ?? 'ro');
  }

  @Post('vendors/:id/publish')
  vendorPublish(@Request() req: any, @Param('id') id: string, @Body() b: { published?: boolean }) {
    this.assertBusiness(req); return this.dv.publishVendor(this.orgId(req), this.userId(req), id, b?.published ?? true);
  }

  @Get('objections')
  objectionsList(@Request() req: any) { this.assertBusiness(req); return this.dv.listObjections(this.orgId(req)); }

  // ==== S-63 GE-TRAIN (PRO) ====
  @Post('training/seed')
  trainingSeed(@Request() req: any) { this.assertPro(req); return this.te.seedCourses(); }

  @Post('training/complete')
  trainingComplete(@Request() req: any, @Body() b: { courseId: string; score?: number }) {
    this.assertPro(req); return this.te.completeTraining(this.userId(req), b.courseId, b?.score ?? 100);
  }

  @Get('training/valid')
  trainingValid(@Request() req: any) { this.assertPro(req); return this.te.orgHasValidTraining(this.orgId(req)).then((v) => ({ orgHasValidTraining: v })); }

  @Get('training/evidence.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="gdpr-training-evidence.csv"')
  trainingEvidence(@Request() req: any) { this.assertPro(req); return this.te.evidenceCsv(this.orgId(req)); }

  // ==== S-63 GE-DATA-ACT (PRO) ====
  @Get('export/full')
  async fullExport(@Request() req: any, @Res() res: Response) {
    this.assertPro(req);
    const buf = await this.te.fullExport(this.orgId(req));
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="documentiulia-full-export.zip"');
    res.end(buf);
  }

  // ==== S-63 GE-CMP-HARDEN (PRO) ====
  @Post('cmp/scan')
  cmpScan(@Request() req: any, @Body() b: { url: string }) {
    this.assertPro(req); return this.te.scanSite(this.orgId(req), b.url);
  }

  // ---- Liability ToS (any tier) ----
  @Get('legal-terms')
  legalTerms() { return LEGAL_TERMS; }
}
