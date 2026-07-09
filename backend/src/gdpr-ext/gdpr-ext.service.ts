import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditChainService } from '../audit/audit-chain.service';
import {
  proposeFromUsage,
  templateEntries,
  completeness,
  IndustryTemplate,
  RopaEntryLike,
} from './ropa.logic';
import { renderPolicy, diffPolicies, PolicyKind, PolicyLocale } from './policy.logic';
import { buildBannerScript, bannerTextHash, hashPii, DEFAULT_CATEGORIES, CmpConfigLike } from './cmp.logic';

/**
 * GDPR-EXT (S-61) — tenant-facing GDPR tooling (the tenant is the controller;
 * these records concern THEIR data subjects, not our users). Informational
 * tooling only — nu constituie consultanță juridică.
 */
@Injectable()
export class GdprExtService {
  private readonly logger = new Logger(GdprExtService.name);
  private readonly piiSalt = process.env.PEER_REVIEW_HMAC_KEY || 'dgdpr-static-salt';

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditChainService,
  ) {}

  // ------------------------------------------------------------------ RoPA
  /** Probe which data the org actually holds (drives seeding proposals). */
  private async probeUsage(orgId: string, userId: string) {
    const orgOrUser = { OR: [{ organizationId: orgId }, { userId }] };
    const [employees, partners, invoices, documents] = await Promise.all([
      this.prisma.employee.count({ where: orgOrUser }).catch(() => 0),
      this.prisma.partner.count({ where: orgOrUser }).catch(() => 0),
      this.prisma.invoice.count({ where: { userId } }).catch(() => 0),
      this.prisma.document.count({ where: { userId } }).catch(() => 0),
    ]);
    return { employees, partners, invoices, documents };
  }

  async seedRopa(orgId: string, userId: string) {
    const usage = await this.probeUsage(orgId, userId);
    const proposals = proposeFromUsage(usage);
    const existing = await this.prisma.ropaEntry.findMany({ where: { orgId }, select: { processName: true } });
    const have = new Set(existing.map((e) => e.processName));
    const fresh = proposals.filter((p) => !have.has(p.processName));
    for (const p of fresh) await this.createRopa(orgId, userId, p);
    return { usage, proposed: proposals.length, created: fresh.length };
  }

  async applyTemplate(orgId: string, userId: string, template: IndustryTemplate, allowProcessor: boolean) {
    const entries = templateEntries(template);
    if (!allowProcessor && entries.some((e) => e.role === 'processor')) {
      throw new ForbiddenException('Intrările de tip împuternicit (processor) necesită planul BUSINESS.');
    }
    const existing = await this.prisma.ropaEntry.findMany({ where: { orgId }, select: { processName: true } });
    const have = new Set(existing.map((e) => e.processName));
    let created = 0;
    for (const e of entries) if (!have.has(e.processName)) { await this.createRopa(orgId, userId, e); created++; }
    return { template, created };
  }

  async createRopa(orgId: string, userId: string, dto: RopaEntryLike) {
    if (!dto.processName?.trim()) throw new BadRequestException('processName is required');
    const row = await this.prisma.ropaEntry.create({
      data: {
        orgId,
        role: dto.role ?? 'controller',
        processName: dto.processName,
        purposes: dto.purposes ?? [],
        legalBasis: dto.legalBasis ?? null,
        categories: dto.categories ?? [],
        specialCategories: dto.specialCategories ?? [],
        recipients: dto.recipients ?? [],
        transfers: dto.transfers ?? [],
        retentionMonths: dto.retentionMonths ?? null,
        securityMeasures: dto.securityMeasures ?? [],
        status: dto.status ?? 'draft',
      },
    });
    await this.audit.appendAudit({ userId, organizationId: orgId, action: 'gdprext.ropa.create', entity: 'RopaEntry', entityId: row.id });
    return this.withCompleteness(row);
  }

  async updateRopa(orgId: string, userId: string, id: string, dto: Partial<RopaEntryLike>) {
    const row = await this.prisma.ropaEntry.findFirst({ where: { id, orgId } });
    if (!row) throw new NotFoundException('RoPA entry not found');
    const merged: any = { ...row, ...dto };
    // GE-CNP: Law 190/2018 Art 4 gate — legitimate-interest + CNP cannot go `active`
    // until DPO + retention + training + safeguards are all satisfied. Enforced server-side.
    if ((dto as any).status === 'active') {
      const { canActivate } = require('./law190.logic');
      const { allowed, check } = canActivate(merged);
      if (!allowed) {
        const missing = check.conditions.filter((c: any) => !c.ok).map((c: any) => c.remedy);
        throw new BadRequestException({
          message: 'Nu se poate activa: procesarea CNP pe temei de interes legitim necesită garanțiile Legii 190/2018 art. 4.',
          law190: check, missing,
        });
      }
    }
    const updated = await this.prisma.ropaEntry.update({ where: { id }, data: { ...dto, orgId } as any });
    await this.audit.appendAudit({ userId, organizationId: orgId, action: 'gdprext.ropa.update', entity: 'RopaEntry', entityId: id });
    return this.withCompleteness(updated);
  }

  /** Law-190 status for a RoPA entry (surfaced on the UI). */
  async law190(orgId: string, id: string) {
    const row = await this.prisma.ropaEntry.findFirst({ where: { id, orgId } });
    if (!row) throw new NotFoundException('RoPA entry not found');
    const { checkLaw190 } = require('./law190.logic');
    return checkLaw190(row);
  }

  async listRopa(orgId: string, includeProcessor: boolean) {
    const rows = await this.prisma.ropaEntry.findMany({
      where: { orgId, ...(includeProcessor ? {} : { role: 'controller' }) },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => this.withCompleteness(r));
  }

  private withCompleteness(row: any) {
    return { ...row, completeness: completeness(row as RopaEntryLike) };
  }

  // ---------------------------------------------------------------- Policy
  private async orgInfo(orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { name: true, cui: true, email: true, website: true, slug: true } });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async generatePolicy(orgId: string, userId: string, kind: PolicyKind, locale: PolicyLocale) {
    const org = await this.orgInfo(orgId);
    const entries = await this.prisma.ropaEntry.findMany({ where: { orgId, status: { not: 'archived' } }, orderBy: { createdAt: 'asc' } });
    if (entries.length === 0) throw new BadRequestException('Registrul de prelucrări (RoPA) este gol — adăugați sau generați intrări mai întâi.');
    const rendered = renderPolicy(kind, locale, org, entries as any, new Date().toISOString().slice(0, 10));
    const last = await this.prisma.policyDocument.findFirst({ where: { orgId, kind, locale }, orderBy: { version: 'desc' } });
    const doc = await this.prisma.policyDocument.create({
      data: { orgId, kind, locale, version: (last?.version ?? 0) + 1, html: rendered.html, sourceRopaHash: rendered.sourceRopaHash },
    });
    await this.audit.appendAudit({ userId, organizationId: orgId, action: 'gdprext.policy.generate', entity: 'PolicyDocument', entityId: doc.id, details: { kind, locale, version: doc.version } });
    return doc;
  }

  async publishPolicy(orgId: string, userId: string, id: string) {
    const doc = await this.prisma.policyDocument.findFirst({ where: { id, orgId } });
    if (!doc) throw new NotFoundException('Policy version not found');
    const updated = await this.prisma.policyDocument.update({ where: { id }, data: { status: 'published', publishedAt: new Date() } });
    await this.audit.appendAudit({ userId, organizationId: orgId, action: 'gdprext.policy.publish', entity: 'PolicyDocument', entityId: id });
    return updated;
  }

  listPolicyVersions(orgId: string, kind?: string) {
    return this.prisma.policyDocument.findMany({
      where: { orgId, ...(kind ? { kind } : {}) },
      orderBy: [{ kind: 'asc' }, { version: 'desc' }],
      select: { id: true, kind: true, locale: true, version: true, status: true, publishedAt: true, createdAt: true, sourceRopaHash: true },
    });
  }

  async diffPolicyVersions(orgId: string, idA: string, idB: string) {
    const [a, b] = await Promise.all([
      this.prisma.policyDocument.findFirst({ where: { id: idA, orgId } }),
      this.prisma.policyDocument.findFirst({ where: { id: idB, orgId } }),
    ]);
    if (!a || !b) throw new NotFoundException('Policy version not found');
    return { a: { id: a.id, version: a.version }, b: { id: b.id, version: b.version }, diff: diffPolicies(a.html, b.html) };
  }

  /** PUBLIC — latest PUBLISHED policy for an org slug. Drafts are never served. */
  async publicPolicy(orgSlug: string, kind: string, locale?: string) {
    const org = await this.prisma.organization.findUnique({ where: { slug: orgSlug }, select: { id: true } });
    if (!org) throw new NotFoundException();
    const doc = await this.prisma.policyDocument.findFirst({
      where: { orgId: org.id, kind, status: 'published', ...(locale ? { locale } : {}) },
      orderBy: { version: 'desc' },
    });
    if (!doc) throw new NotFoundException();
    return { html: doc.html, version: doc.version, publishedAt: doc.publishedAt };
  }

  // ------------------------------------------------------------------- CMP
  async getCmpConfig(orgId: string) {
    const existing = await this.prisma.cmpBannerConfig.findUnique({ where: { orgId } });
    if (existing) return existing;
    return this.prisma.cmpBannerConfig.create({ data: { orgId, categories: [...DEFAULT_CATEGORIES] } });
  }

  async updateCmpConfig(orgId: string, userId: string, dto: Partial<CmpConfigLike>) {
    const current = await this.getCmpConfig(orgId);
    const updated = await this.prisma.cmpBannerConfig.update({
      where: { orgId },
      data: {
        categories: (dto.categories as any) ?? current.categories,
        colors: (dto.colors as any) ?? current.colors,
        policyUrl: dto.policyUrl ?? current.policyUrl,
        texts: (dto.texts as any) ?? current.texts,
        bannerVersion: String(Number(current.bannerVersion || '1') + 1), // any change = new banner version
      },
    });
    await this.audit.appendAudit({ userId, organizationId: orgId, action: 'gdprext.cmp.config', entity: 'CmpBannerConfig', entityId: updated.id });
    return updated;
  }

  private toCfgLike(row: any): CmpConfigLike {
    return {
      bannerVersion: row.bannerVersion,
      categories: Array.isArray(row.categories) ? row.categories : [...DEFAULT_CATEGORIES],
      colors: row.colors ?? null,
      policyUrl: row.policyUrl ?? null,
      texts: row.texts ?? null,
    };
  }

  /** PUBLIC — the embeddable banner script for an org slug. */
  async bannerScript(orgSlug: string) {
    const org = await this.prisma.organization.findUnique({ where: { slug: orgSlug }, select: { id: true } });
    if (!org) throw new NotFoundException();
    const cfg = this.toCfgLike(await this.getCmpConfig(org.id));
    return buildBannerScript(orgSlug, cfg, '/api/v1');
  }

  /**
   * PUBLIC consent intake. ORG ISOLATION: the target org comes ONLY from the
   * slug in the URL — nothing in the body can redirect the write.
   */
  async recordConsent(orgSlug: string, body: { choices?: Record<string, boolean>; lang?: string; bannerVersion?: string; textHash?: string; ref?: string }, ip?: string, ua?: string) {
    const org = await this.prisma.organization.findUnique({ where: { slug: orgSlug }, select: { id: true } });
    if (!org) throw new NotFoundException();
    const choices = body.choices ?? {};
    if (Object.keys(choices).length === 0) throw new BadRequestException('choices required');
    const ipHash = hashPii(ip, this.piiSalt);
    const uaHash = hashPii(ua, this.piiSalt);
    const dataSubjectRef = body.ref || `anon-${(ipHash ?? 'x').slice(0, 12)}`;
    const rows = await this.prisma.$transaction(
      Object.entries(choices).map(([purpose, granted]) =>
        this.prisma.consentRecord.create({
          data: {
            orgId: org.id, // ← slug-derived only
            dataSubjectRef,
            purpose,
            granted: Boolean(granted),
            method: 'banner',
            bannerVersion: body.bannerVersion ?? null,
            textHash: body.textHash ?? null,
            ipHash,
            uaHash,
          },
        }),
      ),
    );
    return { recorded: rows.length };
  }

  /** Proof-of-consent export (authed, PRO). */
  async consentCsv(orgId: string) {
    const rows = await this.prisma.consentRecord.findMany({ where: { orgId }, orderBy: { createdAt: 'asc' } });
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = 'id,dataSubjectRef,purpose,granted,method,bannerVersion,textHash,createdAt';
    const lines = rows.map((r) => [r.id, r.dataSubjectRef, r.purpose, r.granted, r.method, r.bannerVersion, r.textHash, r.createdAt.toISOString()].map(esc).join(','));
    return [header, ...lines].join('\n');
  }

  /** Verify the current banner text hash (shown in the configurator). */
  async currentTextHash(orgId: string) {
    const cfg = this.toCfgLike(await this.getCmpConfig(orgId));
    return { bannerVersion: cfg.bannerVersion, textHash: bannerTextHash(cfg) };
  }
}
