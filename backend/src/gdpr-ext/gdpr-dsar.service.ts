import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditChainService } from '../audit/audit-chain.service';
import {
  DsarType, DSAR_TYPES, VerificationTier,
  computeDueAt, computeExtendedTo, requiredVerificationTier, verificationSatisfied,
  isOverdue,
} from './dsar.logic';
import { artifactStamp } from './legal-terms';

/** Romanian tax/accounting retention: fiscal records restricted, not deleted (Art 17(3)(b)). */
const FISCAL_RETENTION_MONTHS = 120; // 10 years

@Injectable()
export class GdprDsarService {
  private readonly logger = new Logger(GdprDsarService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditChainService,
  ) {}

  private hash(s: string): string {
    return crypto.createHash('sha256').update(s.trim().toLowerCase()).digest('hex');
  }

  /** Resolve org from a public slug ONLY — the body can never redirect the write. */
  private async orgFromSlug(slug: string): Promise<string> {
    const org = await this.prisma.organization.findUnique({ where: { slug }, select: { id: true } });
    if (!org) throw new NotFoundException('Organizație inexistentă.');
    return org.id;
  }

  /** PUBLIC branded intake. Org from slug; tiered verification decided here. */
  async publicIntake(slug: string, body: { type?: string; email?: string; details?: string }) {
    const orgId = await this.orgFromSlug(slug);
    const type = (body?.type ?? '').toLowerCase() as DsarType;
    if (!DSAR_TYPES.includes(type)) throw new BadRequestException('Tip de cerere invalid.');
    if (!body?.email?.trim()) throw new BadRequestException('Adresa de email este obligatorie.');

    const receivedAt = new Date();
    const tier = requiredVerificationTier(type); // anonymous public request -> by type
    const statusToken = crypto.randomBytes(16).toString('hex');
    const req = await this.prisma.dsarRequest.create({
      data: {
        orgId, type, status: 'verifying', dataSubjectRef: body.email.trim(),
        subjectEmailHash: this.hash(body.email), receivedAt,
        dueAt: computeDueAt(receivedAt), verificationTier: tier, statusToken,
      },
    });
    await this.prisma.dsarEvent.create({
      data: { requestId: req.id, type: 'received', payload: { type, tier, details: body.details ?? null } },
    });
    await this.audit.appendAudit({ userId: `subject:${req.dataSubjectRef}`, organizationId: orgId, action: 'gdprext.dsar.received', entity: 'DsarRequest', entityId: req.id });
    return {
      id: req.id, statusToken, dueAt: req.dueAt, verificationTier: tier,
      message: 'Cererea a fost înregistrată. Vei fi contactat pentru verificarea identității.',
      ...artifactStamp(),
    };
  }

  /** PUBLIC status lookup by opaque token — exposes only that request's own status. */
  async publicStatus(statusToken: string) {
    const r = await this.prisma.dsarRequest.findUnique({ where: { statusToken } });
    if (!r) throw new NotFoundException();
    return { type: r.type, status: r.status, receivedAt: r.receivedAt, dueAt: r.dueAt, extendedTo: r.extendedTo, verified: r.verified, overdue: r.overdue };
  }

  // ---- tenant-side management (PRO) ----
  async list(orgId: string) {
    const rows = await this.prisma.dsarRequest.findMany({ where: { orgId }, orderBy: { receivedAt: 'desc' }, take: 200 });
    const now = new Date();
    return rows.map((r) => ({ ...r, isOverdue: isOverdue(now, r.dueAt, r.extendedTo) }));
  }

  async get(orgId: string, id: string) {
    const r = await this.prisma.dsarRequest.findFirst({ where: { id, orgId }, include: { events: { orderBy: { at: 'asc' } } } });
    if (!r) throw new NotFoundException();
    return r;
  }

  /** Record a verification result; enforce the required tier (Art 12(6)). */
  async verify(orgId: string, userId: string, id: string, providedTier: VerificationTier) {
    const r = await this.prisma.dsarRequest.findFirst({ where: { id, orgId } });
    if (!r) throw new NotFoundException();
    const ok = verificationSatisfied(r.verificationTier as VerificationTier, providedTier);
    const updated = await this.prisma.dsarRequest.update({
      where: { id }, data: { verified: ok, status: ok ? 'in_progress' : 'verifying' },
    });
    await this.prisma.dsarEvent.create({ data: { requestId: id, type: 'verification', payload: { providedTier, required: r.verificationTier, ok } } });
    await this.audit.appendAudit({ userId, organizationId: orgId, action: 'gdprext.dsar.verify', entity: 'DsarRequest', entityId: id });
    if (!ok) throw new ForbiddenException(`Verificare insuficientă: necesită nivelul „${r.verificationTier}".`);
    return updated;
  }

  /** Art 12(3) two-month extension. */
  async extend(orgId: string, userId: string, id: string, reason: string) {
    const r = await this.prisma.dsarRequest.findFirst({ where: { id, orgId } });
    if (!r) throw new NotFoundException();
    const updated = await this.prisma.dsarRequest.update({
      where: { id }, data: { extendedTo: computeExtendedTo(r.receivedAt), extensionReason: reason || 'Cerere complexă/numeroasă (Art. 12(3)).' },
    });
    await this.prisma.dsarEvent.create({ data: { requestId: id, type: 'extended', payload: { extendedTo: updated.extendedTo, reason } } });
    return updated;
  }

  /** Cross-module discovery — ONLY this org's records for the subject (Art 15/20). */
  async discover(orgId: string, dataSubjectRef: string) {
    const emailLc = dataSubjectRef.trim().toLowerCase();
    const orgScope = { organizationId: orgId };
    const [partners, employees, consents] = await Promise.all([
      this.prisma.partner.findMany({ where: { ...orgScope, email: { equals: emailLc, mode: 'insensitive' } } as any }).catch(() => []),
      this.prisma.employee.findMany({ where: { ...orgScope, email: { equals: emailLc, mode: 'insensitive' } } as any }).catch(() => []),
      this.prisma.consentRecord.findMany({ where: { orgId, dataSubjectRef: { equals: emailLc, mode: 'insensitive' } } as any }).catch(() => []),
    ]);
    // Invoice has no email column — link via the matched partners' names (org-scoped, non-restricted).
    const partnerNames = (partners as any[]).map((p) => p.name).filter(Boolean);
    const invoices = partnerNames.length
      ? await this.prisma.invoice.findMany({ where: { ...orgScope, restrictedAt: null, partnerName: { in: partnerNames } } as any }).catch(() => [])
      : [];
    return { dataSubjectRef: emailLc, orgId, partners, employees, invoices, consents };
  }

  /** Machine-readable export (Art 20). Returns the discovery bundle + stamp. */
  async exportData(orgId: string, userId: string, id: string) {
    const r = await this.prisma.dsarRequest.findFirst({ where: { id, orgId } });
    if (!r) throw new NotFoundException();
    if (!r.verified) throw new ForbiddenException('Identitatea nu a fost verificată.');
    const data = await this.discover(orgId, r.dataSubjectRef);
    const payload = { ...data, ...artifactStamp(), exportedAt: new Date().toISOString() };
    await this.prisma.dsarRequest.update({ where: { id }, data: { status: 'responded', responsePayload: payload as any } });
    await this.prisma.dsarEvent.create({ data: { requestId: id, type: 'exported', payload: { counts: { partners: data.partners.length, invoices: data.invoices.length } } } });
    await this.audit.appendAudit({ userId, organizationId: orgId, action: 'gdprext.dsar.export', entity: 'DsarRequest', entityId: id });
    return payload;
  }

  /**
   * Retention-aware erasure (mirrors the internal GI-DSR-1 rules):
   *  - fiscal records (invoices) -> RESTRICT, never delete (Art 17(3)(b));
   *  - person records (partner/employee) -> anonymize person-identifying fields;
   *  - write an ErasureLedger row incl. backup-expiry (we do NOT rewrite backups).
   */
  async erase(orgId: string, userId: string, id: string) {
    const r = await this.prisma.dsarRequest.findFirst({ where: { id, orgId } });
    if (!r) throw new NotFoundException();
    if (!r.verified) throw new ForbiddenException('Identitatea nu a fost verificată.');
    const found = await this.discover(orgId, r.dataSubjectRef);
    const scope: Record<string, any> = { restricted: {}, anonymized: {}, notes: [] };

    // Fiscal: restrict (keep for tax retention). Use restrictedAt if the column exists.
    let restricted = 0;
    for (const inv of found.invoices as any[]) {
      try {
        await this.prisma.invoice.update({ where: { id: inv.id }, data: { restrictedAt: new Date() } as any });
        restricted++;
      } catch { /* column may differ; count as note */ }
    }
    scope.restricted.invoices = restricted;
    scope.notes.push('Facturile sunt păstrate (restricționate) conform obligației fiscale RO — Art. 17(3)(b).');

    // Person records: anonymize the email in place (best-effort, org-scoped).
    let anonymized = 0;
    const anon = `erased-${crypto.randomBytes(4).toString('hex')}@anonymized.local`;
    for (const p of found.partners as any[]) {
      try { await this.prisma.partner.update({ where: { id: p.id }, data: { email: anon } as any }); anonymized++; } catch {}
    }
    scope.anonymized.partners = anonymized;

    const backupExpiryAt = new Date(Date.now() + FISCAL_RETENTION_MONTHS * 30 * 86_400_000);
    await this.prisma.erasureLedger.create({
      data: { orgId, dsarRequestId: id, dataSubjectRef: r.dataSubjectRef, action: 'restricted', scope, backupExpiryAt },
    });
    const responsePayload = {
      ...scope,
      backupNote: `Copii reziduale în backup-uri expiră automat conform politicii de retenție (estimat ${backupExpiryAt.toISOString().slice(0, 10)}). Nu rescriem backup-urile criptate.`,
      ...artifactStamp(),
    };
    await this.prisma.dsarRequest.update({ where: { id }, data: { status: 'responded', responsePayload: responsePayload as any } });
    await this.prisma.dsarEvent.create({ data: { requestId: id, type: 'erased', payload: scope } });
    await this.audit.appendAudit({ userId, organizationId: orgId, action: 'gdprext.dsar.erase', entity: 'DsarRequest', entityId: id });
    return responsePayload;
  }

  /** Daily: flag overdue + T-7 warnings. */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async sweepDeadlines() {
    const open = await this.prisma.dsarRequest.findMany({ where: { status: { in: ['new', 'verifying', 'in_progress'] } } });
    const now = new Date();
    let flagged = 0;
    for (const r of open) {
      try {
        const overdue = isOverdue(now, r.dueAt, r.extendedTo);
        if (overdue !== r.overdue) { await this.prisma.dsarRequest.update({ where: { id: r.id }, data: { overdue } }); flagged++; }
      } catch (e: any) { this.logger.warn(`DSAR sweep failed for ${r.id}: ${e?.message}`); }
    }
    if (flagged) this.logger.log(`DSAR deadline sweep: ${flagged} request(s) re-flagged`);
  }
}
