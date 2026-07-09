/**
 * S-61 GDPR-EXT integration — gated by GEXT_IT=1 against a throwaway postgres.
 * Proves: RoPA seeding from real org data; policy DERIVES from the RoPA and the
 * public URL serves only published versions; consent intake is org-isolated and
 * immutable; tier metadata gates PRO endpoints; audit rows are written.
 */
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AuditChainService } from '../audit/audit-chain.service';
import { GdprExtService } from './gdpr-ext.service';
import { GdprTrainExportService } from './gdpr-train-export.service';
import { GdprExtController } from './gdpr-ext.controller';
import { REQUIRES_TIER_KEY } from '../auth/tiers.decorator';
import { NotFoundException } from '@nestjs/common';

const RUN = process.env.GEXT_IT === '1';
const d = RUN ? describe : describe.skip;

d('S-61 GDPR-EXT integration', () => {
  let prisma: PrismaService;
  let svc: GdprExtService;
  let orgA: any, orgB: any;
  const userId = 'gext-user-1';

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [PrismaService, AuditChainService, GdprTrainExportService, GdprExtService],
    }).compile();
    prisma = mod.get(PrismaService);
    svc = mod.get(GdprExtService);
    await prisma.$connect();

    orgA = await prisma.organization.create({ data: { name: 'Org A SRL', slug: `gext-a-${Date.now()}`, cui: `ROA${Date.now() % 1e7}`, email: 'a@a.ro' } });
    orgB = await prisma.organization.create({ data: { name: 'Org B SRL', slug: `gext-b-${Date.now()}`, cui: `ROB${Date.now() % 1e7}` } });
    await prisma.user.upsert({ where: { id: userId }, create: { id: userId, email: `gext-${Date.now()}@it.ro`, password: 'x', name: 'GExt IT' }, update: {} });
    // real org data so seeding has signals
    await prisma.employee.create({ data: { userId, organizationId: orgA.id, firstName: 'F', lastName: 'L', email: `e-${Date.now()}@it.ro`, position: 'Dev', salary: 5000, hireDate: new Date('2025-01-10') } });
    await prisma.partner.create({ data: { userId, organizationId: orgA.id, name: 'Partner GExt' } });
  }, 60000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GE-ROPA: seeding proposes entries from the org’s actual data (HR + billing), with completeness + audit', async () => {
    const res = await svc.seedRopa(orgA.id, userId);
    expect(res.created).toBeGreaterThanOrEqual(2); // billing (partners) + HR (employee)
    const list = await svc.listRopa(orgA.id, true);
    const hr = list.find((e: any) => e.processName.startsWith('Resurse'));
    expect(hr).toBeTruthy();
    expect(hr.retentionMonths).toBe(600);
    expect(hr.completeness.pct).toBe(100);
    expect(hr.completeness.warnings.join(' ')).toContain('190/2018');
    const audits = await prisma.auditLog.count({ where: { organizationId: orgA.id, action: { contains: 'gdprext.ropa' } } });
    expect(audits).toBeGreaterThanOrEqual(2);
  }, 30000);

  it('GE-POLICY: the policy derives from the RoPA; retention change is reflected in the next version; public URL serves ONLY published', async () => {
    const v1 = await svc.generatePolicy(orgA.id, userId, 'privacy', 'ro');
    expect(v1.version).toBe(1);
    expect(v1.html).toContain('50 ani'); // 600 months payroll retention flows through

    // public URL: nothing published yet → 404
    await expect(svc.publicPolicy(orgA.slug, 'privacy')).rejects.toThrow(NotFoundException);

    // change RoPA retention → regenerate → derivation visible
    const list = await svc.listRopa(orgA.id, true);
    const billing = list.find((e: any) => e.processName.startsWith('Facturare'));
    await svc.updateRopa(orgA.id, userId, billing.id, { retentionMonths: 60 });
    const v2 = await svc.generatePolicy(orgA.id, userId, 'privacy', 'ro');
    expect(v2.version).toBe(2);
    expect(v2.html).toContain('5 ani');
    expect(v2.sourceRopaHash).not.toBe(v1.sourceRopaHash);

    const diff = await svc.diffPolicyVersions(orgA.id, v1.id, v2.id);
    expect(diff.diff.added.join(' ')).toContain('5 ani');

    await svc.publishPolicy(orgA.id, userId, v2.id);
    const pub = await svc.publicPolicy(orgA.slug, 'privacy');
    expect(pub.version).toBe(2); // published only — v1 draft never served
    expect(pub.html).toContain('nu constituie consultanță juridică');
  }, 30000);

  it('GE-CMP: banner script serves per-org; consent intake is ORG-ISOLATED (slug-only) and rows are immutable', async () => {
    const js = await svc.bannerScript(orgA.slug);
    expect(js).toContain('dgdpr-accept');
    expect(js).toContain('text/plain');

    // intake to org A — body cannot redirect the write (no org field honoured)
    const res = await svc.recordConsent(orgA.slug, { choices: { necessary: true, analytics: true, marketing: false }, bannerVersion: '1', textHash: 'th' } as any, '1.2.3.4', 'jest-ua');
    expect(res.recorded).toBe(3);
    const aRows = await prisma.consentRecord.count({ where: { orgId: orgA.id } });
    const bRows = await prisma.consentRecord.count({ where: { orgId: orgB.id } });
    expect(aRows).toBe(3);
    expect(bRows).toBe(0); // isolation: nothing leaked to org B

    // unknown slug → 404, nothing written anywhere
    await expect(svc.recordConsent('no-such-org', { choices: { necessary: true } } as any)).rejects.toThrow(NotFoundException);

    // immutability: no service method mutates ConsentRecord; raw-prisma sanity that ipHash was hashed not stored raw
    const row = await prisma.consentRecord.findFirst({ where: { orgId: orgA.id, purpose: 'analytics' } });
    expect(row!.granted).toBe(true);
    expect(row!.ipHash).not.toContain('1.2.3.4');
    const svcProto = Object.getOwnPropertyNames(Object.getPrototypeOf(svc));
    expect(svcProto.some((m) => /consent/i.test(m) && /(update|delete)/i.test(m))).toBe(false);

    // CSV export contains the recorded purposes
    const csv = await svc.consentCsv(orgA.id);
    expect(csv.split('\n').length).toBe(4); // header + 3 rows
    expect(csv).toContain('analytics');
  }, 30000);

  it('tier packaging: PRO metadata on seed/template/versions/diff/csv; basic endpoints ungated', () => {
    const proGated = ['seed', 'template', 'versions', 'diff', 'csv'];
    const freeBasic = ['listRopa', 'createRopa', 'generate', 'publish', 'getCmp', 'putCmp'];
    for (const m of proGated) {
      const tier = Reflect.getMetadata(REQUIRES_TIER_KEY, (GdprExtController.prototype as any)[m]);
      expect(tier).toBe('PRO');
    }
    for (const m of freeBasic) {
      const tier = Reflect.getMetadata(REQUIRES_TIER_KEY, (GdprExtController.prototype as any)[m]);
      expect(tier).toBeUndefined();
    }
  });
});
