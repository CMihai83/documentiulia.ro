import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditChainService } from '../audit/audit-chain.service';
import { artifactStamp } from './legal-terms';
import { screen, assessRisks, monitoringWizard, art36Draft, ScreeningAnswers, RiskItem, MonitoringWizardAnswers } from './dpia.logic';
import { decideTransfer, assessTia, buildDpaHtml, PartyRole, TiaAnswers } from './vendor.logic';

/**
 * GE-DPIA + GE-VENDOR service. All org-scoped; every generated artifact carries
 * artifactStamp() (lawyerReviewed:false). Nothing auto-submits anywhere.
 */
@Injectable()
export class GdprDpiaVendorService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditChainService) {}

  private async audited(orgId: string, userId: string, action: string, entity: string, entityId: string) {
    await this.audit.appendAudit({ userId, organizationId: orgId, action, entity, entityId });
  }

  // ---- GE-DPIA ----
  async screenRopa(orgId: string, userId: string, ropaEntryId: string, answers: ScreeningAnswers) {
    const ropa = await this.prisma.ropaEntry.findFirst({ where: { id: ropaEntryId, orgId } });
    if (!ropa) throw new NotFoundException('RoPA entry not found');
    const s = screen(answers ?? {});
    const last = await this.prisma.dpiaAssessment.findFirst({ where: { orgId, ropaEntryId }, orderBy: { version: 'desc' } });
    const version = (last?.version ?? 0) + 1;
    const row = await this.prisma.dpiaAssessment.create({
      data: {
        orgId, ropaEntryId, version, screening: answers as any,
        verdict: s.verdict, verdictReasons: s.reasons,
        wizardRequired: s.employeeMonitoringWizardRequired,
        status: 'draft',
      },
    });
    await this.audited(orgId, userId, 'gdprext.dpia.screen', 'DpiaAssessment', row.id);
    return { ...row, screening: s, stamp: artifactStamp() };
  }

  async assessDpiaRisks(orgId: string, userId: string, id: string, risks: RiskItem[]) {
    const row = await this.prisma.dpiaAssessment.findFirst({ where: { id, orgId } });
    if (!row) throw new NotFoundException();
    const ra = assessRisks(risks ?? []);
    const updated = await this.prisma.dpiaAssessment.update({
      where: { id }, data: { risks: ra.items as any, residualBand: ra.overallResidual },
    });
    await this.audited(orgId, userId, 'gdprext.dpia.risks', 'DpiaAssessment', id);
    return { ...updated, assessment: ra, stamp: artifactStamp() };
  }

  /** Sign-off: blocked when the Art-5 wizard is required and its gates don't all pass. */
  async signOffDpia(orgId: string, userId: string, id: string, wizard?: MonitoringWizardAnswers) {
    const row = await this.prisma.dpiaAssessment.findFirst({ where: { id, orgId } });
    if (!row) throw new NotFoundException();
    if (row.wizardRequired) {
      const w = monitoringWizard(wizard ?? {});
      if (!w.passed) {
        await this.prisma.dpiaAssessment.update({ where: { id }, data: { status: 'blocked', wizard: w as any } });
        throw new BadRequestException({
          message: 'Sign-off blocat: cerințele Legii 190/2018 art. 5 (monitorizarea angajaților) nu sunt îndeplinite.',
          gates: w.gates.filter((g) => !g.ok),
        });
      }
      await this.prisma.dpiaAssessment.update({ where: { id }, data: { wizard: w as any } });
    }
    // Art 36 draft when residual risk stays high.
    let art36Html: string | undefined;
    const ropa = await this.prisma.ropaEntry.findFirst({ where: { id: row.ropaEntryId, orgId } });
    if (row.residualBand === 'high' || row.residualBand === 'very_high') {
      const ra = assessRisks((row.risks as any) ?? []);
      art36Html = art36Draft(ropa?.processName ?? 'processing', screen(row.screening as any), ra);
    }
    const updated = await this.prisma.dpiaAssessment.update({
      where: { id }, data: { status: 'signed_off', art36Html: art36Html ?? null },
    });
    await this.audited(orgId, userId, 'gdprext.dpia.signoff', 'DpiaAssessment', id);
    return { ...updated, art36Required: !!art36Html, stamp: artifactStamp() };
  }

  async listDpia(orgId: string) {
    return this.prisma.dpiaAssessment.findMany({ where: { orgId }, orderBy: { createdAt: 'desc' } });
  }

  // ---- GE-VENDOR ----
  async createVendor(orgId: string, userId: string, dto: any) {
    const isEu = dto.isEu ?? true;
    const row = await this.prisma.gdprVendor.create({
      data: {
        orgId, name: dto.name, role: dto.role ?? 'processor', country: (dto.country ?? 'RO').toUpperCase(),
        isEu, transferMechanism: dto.transferMechanism ?? null, dpfClaimed: !!dto.dpfClaimed,
        dpfEvidenceUrl: dto.dpfEvidenceUrl ?? null, ropaEntryIds: dto.ropaEntryIds ?? [],
        contactEmail: dto.contactEmail ?? null,
      },
    });
    await this.audited(orgId, userId, 'gdprext.vendor.create', 'GdprVendor', row.id);
    return row;
  }

  async listVendors(orgId: string) {
    return this.prisma.gdprVendor.findMany({ where: { orgId }, orderBy: { createdAt: 'asc' } });
  }

  /** Transfer decision (SCC module / adequacy / DPF-verify) for a vendor, given the exporter role. */
  async transferDecision(orgId: string, vendorId: string, exporterRole: PartyRole = 'controller') {
    const v = await this.prisma.gdprVendor.findFirst({ where: { id: vendorId, orgId } });
    if (!v) throw new NotFoundException();
    return decideTransfer({
      importerCountry: v.country, importerIsEu: v.isEu, dpfClaimed: v.dpfClaimed,
      exporterRole, importerRole: (v.role === 'controller' ? 'controller' : 'processor'),
    });
  }

  async saveTia(orgId: string, userId: string, vendorId: string, answers: TiaAnswers) {
    const v = await this.prisma.gdprVendor.findFirst({ where: { id: vendorId, orgId } });
    if (!v) throw new NotFoundException();
    const t = assessTia(answers ?? {});
    const last = await this.prisma.tiaAssessment.findFirst({ where: { orgId, vendorId }, orderBy: { version: 'desc' } });
    const row = await this.prisma.tiaAssessment.create({
      data: { orgId, vendorId, version: (last?.version ?? 0) + 1, answers: answers as any, score: t.score, verdict: t.verdict, measures: t.measures },
    });
    await this.audited(orgId, userId, 'gdprext.tia.save', 'TiaAssessment', row.id);
    return { ...row, assessment: t, stamp: artifactStamp() };
  }

  /** Generate an Art-28 DPA from the vendor + the org's linked RoPA entries. */
  async generateDpa(orgId: string, userId: string, vendorId: string, locale: 'ro' | 'en' = 'ro') {
    const v = await this.prisma.gdprVendor.findFirst({ where: { id: vendorId, orgId } });
    if (!v) throw new NotFoundException();
    const org = await this.prisma.organization.findFirst({ where: { id: orgId }, select: { name: true } }).catch(() => null);
    const ropas = v.ropaEntryIds.length
      ? await this.prisma.ropaEntry.findMany({ where: { orgId, id: { in: v.ropaEntryIds } } })
      : await this.prisma.ropaEntry.findMany({ where: { orgId } });
    const purposes = [...new Set(ropas.flatMap((r) => r.purposes))];
    const categories = [...new Set(ropas.flatMap((r) => r.categories))];
    const retentionMonths = ropas.map((r) => r.retentionMonths ?? 0).reduce((a, b) => Math.max(a, b), 0) || null;
    const transfer = decideTransfer({ importerCountry: v.country, importerIsEu: v.isEu, dpfClaimed: v.dpfClaimed, exporterRole: 'controller', importerRole: v.role === 'controller' ? 'controller' : 'processor' });
    const html = buildDpaHtml({
      controllerName: org?.name ?? 'Operator', processorName: v.name,
      purposes, categories, retentionMonths, sccModule: transfer.sccModule ?? null, locale,
    });
    const last = await this.prisma.dpaDocument.findFirst({ where: { orgId, vendorId, locale }, orderBy: { version: 'desc' } });
    const row = await this.prisma.dpaDocument.create({
      data: { orgId, vendorId, locale, version: (last?.version ?? 0) + 1, sccModule: transfer.sccModule ?? null, html, status: 'draft' },
    });
    await this.audited(orgId, userId, 'gdprext.dpa.generate', 'DpaDocument', row.id);
    return { ...row, transfer, stamp: artifactStamp(locale) };
  }

  async publishVendor(orgId: string, userId: string, vendorId: string, published: boolean) {
    const v = await this.prisma.gdprVendor.findFirst({ where: { id: vendorId, orgId } });
    if (!v) throw new NotFoundException();
    const row = await this.prisma.gdprVendor.update({ where: { id: vendorId }, data: { published } });
    await this.audited(orgId, userId, 'gdprext.vendor.publish', 'GdprVendor', vendorId);
    return row;
  }

  // ---- public sub-processor list + objections ----
  async publicSubprocessors(orgSlug: string) {
    const org = await this.prisma.organization.findUnique({ where: { slug: orgSlug }, select: { id: true, name: true } });
    if (!org) throw new NotFoundException();
    const vendors = await this.prisma.gdprVendor.findMany({
      where: { orgId: org.id, published: true },
      select: { name: true, role: true, country: true, transferMechanism: true },
      orderBy: { name: 'asc' },
    });
    return { organization: org.name, subprocessors: vendors, stamp: artifactStamp() };
  }

  async recordObjection(orgSlug: string, body: { vendorId?: string; contactEmail?: string; reason?: string }) {
    const org = await this.prisma.organization.findUnique({ where: { slug: orgSlug }, select: { id: true } });
    if (!org) throw new NotFoundException();
    if (!body.contactEmail || !body.reason) throw new BadRequestException('contactEmail and reason required');
    // objection response clock: 30 days
    const respondDueAt = new Date(Date.now() + 30 * 86_400_000);
    const row = await this.prisma.subprocessorObjection.create({
      data: { orgId: org.id, vendorId: body.vendorId ?? '', contactEmail: body.contactEmail, reason: body.reason, respondDueAt },
    });
    return { id: row.id, respondDueAt: row.respondDueAt, status: row.status };
  }

  async listObjections(orgId: string) {
    return this.prisma.subprocessorObjection.findMany({ where: { orgId }, orderBy: { receivedAt: 'desc' } });
  }
}
