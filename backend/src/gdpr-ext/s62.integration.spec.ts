/**
 * S-62 GDPR-EXT MUSTs integration — gated by GEXT_IT=1 against a throwaway postgres.
 * Proves: DSAR intake org-isolation + Art-12 clock; discovery scoped to the org;
 * erasure RESTRICTS a fiscal record (keeps it) + writes ErasureLedger; breach
 * 72h + ENISA + ANSPDCP draft + register with non-notified justification; the
 * Law-190 activation gate; and that the breach path makes NO outbound HTTP.
 */
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AuditChainService } from '../audit/audit-chain.service';
import { GdprExtService } from './gdpr-ext.service';
import { GdprTrainExportService } from './gdpr-train-export.service';
import { GdprDsarService } from './gdpr-dsar.service';
import { GdprBreachService } from './gdpr-breach.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import * as http from 'http';

const RUN = process.env.GEXT_IT === '1';
const d = RUN ? describe : describe.skip;

d('S-62 GDPR-EXT MUSTs integration', () => {
  let prisma: PrismaService, svc: GdprExtService, dsar: GdprDsarService, breach: GdprBreachService;
  let orgA: any, orgB: any;
  const userId = 's62-user';
  const subjectEmail = `subject-${Date.now()}@person.ro`;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [PrismaService, AuditChainService, GdprTrainExportService, GdprExtService, GdprDsarService, GdprBreachService],
    }).compile();
    prisma = mod.get(PrismaService); svc = mod.get(GdprExtService);
    dsar = mod.get(GdprDsarService); breach = mod.get(GdprBreachService);
    await prisma.$connect();
    orgA = await prisma.organization.create({ data: { name: 'S62 A', slug: `s62a-${Date.now()}`, cui: `RA${Date.now()%1e7}` } });
    orgB = await prisma.organization.create({ data: { name: 'S62 B', slug: `s62b-${Date.now()}`, cui: `RB${Date.now()%1e7}` } });
    await prisma.user.upsert({ where: { id: userId }, create: { id: userId, email: `s62-${Date.now()}@it.ro`, password: 'x', name: 'S62' }, update: {} });
    // subject data in org A: a partner (with email) + an invoice bearing that partner's name
    await prisma.partner.create({ data: { userId, organizationId: orgA.id, name: 'Ion Subject', email: subjectEmail } });
    await prisma.invoice.create({ data: { userId, organizationId: orgA.id, invoiceNumber: `S62-${Date.now()}`, partnerName: 'Ion Subject', netAmount: 100, vatRate: 21, vatAmount: 21, grossAmount: 121, invoiceDate: new Date() } as any });
  }, 60000);

  afterAll(async () => {
    if (!RUN) return;
    for (const o of [orgA, orgB]) {
      await prisma.erasureLedger.deleteMany({ where: { orgId: o.id } }).catch(() => {});
      await prisma.breachIncident.deleteMany({ where: { orgId: o.id } }).catch(() => {});
      await prisma.dsarRequest.deleteMany({ where: { orgId: o.id } }).catch(() => {});
      await prisma.invoice.deleteMany({ where: { organizationId: o.id } }).catch(() => {});
      await prisma.partner.deleteMany({ where: { organizationId: o.id } }).catch(() => {});
      await prisma.organization.delete({ where: { id: o.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  }, 60000);

  it('DSAR intake resolves org from slug ONLY; unknown slug 404 + nothing written', async () => {
    const before = await prisma.dsarRequest.count();
    await expect(dsar.publicIntake('no-such-slug', { type: 'access', email: subjectEmail })).rejects.toThrow(NotFoundException);
    expect(await prisma.dsarRequest.count()).toBe(before);
    const r = await dsar.publicIntake(orgA.slug, { type: 'access', email: subjectEmail });
    const row = await prisma.dsarRequest.findUnique({ where: { id: r.id } });
    expect(row!.orgId).toBe(orgA.id);
    // Art-12: dueAt = receivedAt + 1 month
    expect(new Date(row!.dueAt).getUTCMonth()).toBe((new Date(row!.receivedAt).getUTCMonth() + 1) % 12);
    expect((await prisma.dsarRequest.count({ where: { orgId: orgB.id } }))).toBe(0);
  });

  it('discovery is org-scoped (org B sees nothing for this subject)', async () => {
    const inA = await dsar.discover(orgA.id, subjectEmail);
    expect(inA.partners.length).toBe(1);
    expect(inA.invoices.length).toBe(1);
    const inB = await dsar.discover(orgB.id, subjectEmail);
    expect(inB.partners.length).toBe(0);
    expect(inB.invoices.length).toBe(0);
  });

  it('erasure RESTRICTS the fiscal invoice (keeps it) + writes ErasureLedger', async () => {
    const req = await dsar.publicIntake(orgA.slug, { type: 'erasure', email: subjectEmail });
    await prisma.dsarRequest.update({ where: { id: req.id }, data: { verified: true } });
    const res: any = await dsar.erase(orgA.id, userId, req.id);
    expect(res.restricted.invoices).toBe(1);
    // invoice still exists but is restricted
    const inv = await prisma.invoice.findFirst({ where: { organizationId: orgA.id, partnerName: 'Ion Subject' } });
    expect(inv).toBeTruthy();
    expect(inv!.restrictedAt).not.toBeNull();
    const ledger = await prisma.erasureLedger.findFirst({ where: { orgId: orgA.id, dsarRequestId: req.id } });
    expect(ledger).toBeTruthy();
    expect(ledger!.backupExpiryAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('breach: 72h dueAt + deterministic severity + ANSPDCP draft; register keeps non-notified w/ reason; NO outbound HTTP', async () => {
    // trip a network tripwire — any http.request during the breach path fails the test
    const orig = http.request;
    let called = false;
    (http as any).request = (...a: any[]) => { called = true; return (orig as any)(...a); };
    try {
      const inc = await breach.create(orgA.id, userId, {
        description: 'Laptop pierdut cu CNP-uri', categories: ['CNP', 'nume'], affectedCount: 40,
        enisa: { dpc: 4, ei: 1, lossOfConfidentiality: true },
      });
      expect(new Date(inc.notifyDueAt).getTime() - new Date(inc.detectedAt).getTime()).toBe(72 * 3600 * 1000);
      expect(inc.severity).toBe('very_high');
      expect((inc.ansdpcDraft as any).operator).toBe('S62 A');
      await breach.markNotNotified(orgA.id, userId, inc.id, 'Date criptate, risc scăzut efectiv');
      const reg = await breach.register(orgA.id);
      const found = reg.incidents.find((x: any) => x.id === inc.id);
      expect(found.notified).toBe(false);
      expect(found.notNotifiedReason).toContain('criptate');
    } finally {
      (http as any).request = orig;
    }
    expect(called).toBe(false);
  });

  it('Law-190 gate blocks activating a legit-interest+CNP RoPA entry until remedied', async () => {
    const entry = await svc.createRopa(orgA.id, userId, {
      processName: 'Marketing CNP', purposes: ['marketing'], legalBasis: 'legitimate_interest',
      categories: ['CNP', 'nume'], role: 'controller',
    } as any);
    await expect(svc.updateRopa(orgA.id, userId, entry.id, { status: 'active' } as any)).rejects.toThrow(BadRequestException);
    // satisfy all four, then it activates
    const ok = await svc.updateRopa(orgA.id, userId, entry.id, {
      dpoDesignated: true, retentionMonths: 24, staffTrainingAttested: true, documentedSafeguards: true,
    } as any);
    const activated = await svc.updateRopa(orgA.id, userId, entry.id, { status: 'active' } as any);
    expect(activated.status).toBe('active');
  });
});
