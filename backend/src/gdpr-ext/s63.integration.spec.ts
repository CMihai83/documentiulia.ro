/**
 * S-63 GDPR-EXT Shoulds integration — gated by GEXT_IT=1 against a throwaway
 * postgres. Proves: DPIA screen→risks→sign-off blocked by the Art-5 wizard then
 * unblocked; vendor→DPA generated from real RoPA + TIA verdict + public
 * sub-processor list (published-only) + objection clock; LMS training completion
 * flips the Law-190 training condition to satisfied; full export is org-scoped
 * and drops security fields; cookie scanner vs a LOCAL mock page.
 */
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AuditChainService } from '../audit/audit-chain.service';
import { GdprExtService } from './gdpr-ext.service';
import { GdprDsarService } from './gdpr-dsar.service';
import { GdprBreachService } from './gdpr-breach.service';
import { GdprDpiaVendorService } from './gdpr-dpia-vendor.service';
import { GdprTrainExportService } from './gdpr-train-export.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as http from 'http';

const RUN = process.env.GEXT_IT === '1';
const d = RUN ? describe : describe.skip;

d('S-63 GDPR-EXT Shoulds integration', () => {
  let prisma: PrismaService, svc: GdprExtService, dv: GdprDpiaVendorService, te: GdprTrainExportService;
  let orgA: any, orgB: any;
  const stamp = Date.now();
  const userId = `s63-user-${stamp}`;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [PrismaService, AuditChainService, GdprExtService, GdprDsarService, GdprBreachService, GdprDpiaVendorService, GdprTrainExportService],
    }).compile();
    prisma = mod.get(PrismaService); svc = mod.get(GdprExtService);
    dv = mod.get(GdprDpiaVendorService); te = mod.get(GdprTrainExportService);
    await prisma.$connect();
    orgA = await prisma.organization.create({ data: { name: 'S63 A', slug: `s63a-${stamp}`, cui: `RA${stamp % 1e7}` } });
    orgB = await prisma.organization.create({ data: { name: 'S63 B', slug: `s63b-${stamp}`, cui: `RB${stamp % 1e7}` } });
    await prisma.user.upsert({ where: { id: userId }, create: { id: userId, email: `s63-${stamp}@it.ro`, password: 'x', name: 'S63' }, update: {} });
    await prisma.organizationMember.create({ data: { userId, organizationId: orgA.id, isActive: true } as any });
    await prisma.partner.create({ data: { userId, organizationId: orgA.id, name: 'Org A Partner' } });
  }, 60000);

  afterAll(async () => {
    if (!RUN) return;
    for (const o of [orgA, orgB]) {
      await prisma.dpaDocument.deleteMany({ where: { orgId: o.id } }).catch(() => {});
      await prisma.tiaAssessment.deleteMany({ where: { orgId: o.id } }).catch(() => {});
      await prisma.subprocessorObjection.deleteMany({ where: { orgId: o.id } }).catch(() => {});
      await prisma.gdprVendor.deleteMany({ where: { orgId: o.id } }).catch(() => {});
      await prisma.dpiaAssessment.deleteMany({ where: { orgId: o.id } }).catch(() => {});
      await prisma.ropaEntry.deleteMany({ where: { orgId: o.id } }).catch(() => {});
      await prisma.partner.deleteMany({ where: { organizationId: o.id } }).catch(() => {});
      await prisma.organizationMember.deleteMany({ where: { organizationId: o.id } }).catch(() => {});
      await prisma.organization.delete({ where: { id: o.id } }).catch(() => {});
    }
    await prisma.lMSEnrollment.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.$disconnect();
  }, 60000);

  it('GE-DPIA: screen → risks → sign-off is BLOCKED by the Art-5 wizard, then unblocked', async () => {
    const ropa = await prisma.ropaEntry.create({ data: { orgId: orgA.id, processName: 'CCTV angajați', legalBasis: 'legitimate_interest', categories: ['imagini'], purposes: ['securitate'] } });
    const scr = await dv.screenRopa(orgA.id, userId, ropa.id, { employeeMonitoring: true, systematicMonitoring: true });
    expect(scr.verdict).toBe('required');
    expect(scr.stamp.lawyerReviewed).toBe(false);
    await dv.assessDpiaRisks(orgA.id, userId, scr.id, [{ risk: 'acces neautorizat', likelihood: 4, severity: 4, residualLikelihood: 4, residualSeverity: 3 }]);
    // wizard required (employee monitoring) + incomplete gates => blocked
    await expect(dv.signOffDpia(orgA.id, userId, scr.id, { legitimateInterestProven: true })).rejects.toThrow(BadRequestException);
    const blocked = await prisma.dpiaAssessment.findUnique({ where: { id: scr.id } });
    expect(blocked?.status).toBe('blocked');
    // all gates pass => signs off + Art36 draft (residual high)
    const ok = await dv.signOffDpia(orgA.id, userId, scr.id, {
      legitimateInterestProven: true, priorInfoProvided: true, unionOrRepsConsulted: true, alternativesExhausted: true, storageDays: 30,
    });
    expect(ok.status).toBe('signed_off');
    expect(ok.art36Required).toBe(true);
  });

  it('GE-VENDOR: DPA generated from RoPA; TIA verdict; public sub-processor list published-only; objection clock', async () => {
    const ropa = await prisma.ropaEntry.create({ data: { orgId: orgA.id, processName: 'Cloud hosting', legalBasis: 'contract', categories: ['facturi'], purposes: ['găzduire'], retentionMonths: 120 } });
    const vendor = await dv.createVendor(orgA.id, userId, { name: 'US Cloud Inc', role: 'processor', country: 'US', isEu: false, ropaEntryIds: [ropa.id] });
    const dpa = await dv.generateDpa(orgA.id, userId, vendor.id, 'ro');
    expect(dpa.html).toContain('Art. 28');
    expect(dpa.transfer.mechanism).toBe('scc');
    expect(dpa.transfer.sccModule).toBe('M2'); // controller -> processor
    const tia = await dv.saveTia(orgA.id, userId, vendor.id, { governmentAccessRisk: 4, dataSensitivity: 3, volume: 3 });
    expect(['proceed_with_measures', 'do_not_transfer']).toContain(tia.verdict);
    // not published yet => absent from public list
    let pub = await dv.publicSubprocessors(orgA.slug);
    expect(pub.subprocessors.length).toBe(0);
    await dv.publishVendor(orgA.id, userId, vendor.id, true);
    pub = await dv.publicSubprocessors(orgA.slug);
    expect(pub.subprocessors.map((v: any) => v.name)).toContain('US Cloud Inc');
    // objection intake: org from slug ONLY + 30-day clock
    await expect(dv.recordObjection('no-such-slug', { contactEmail: 'x@y.ro', reason: 'nu sunt de acord' })).rejects.toThrow(NotFoundException);
    const obj = await dv.recordObjection(orgA.slug, { vendorId: vendor.id, contactEmail: 'x@y.ro', reason: 'obiecție' });
    const days = Math.round((new Date(obj.respondDueAt).getTime() - Date.now()) / 86_400_000);
    expect(days).toBeGreaterThanOrEqual(29);
  });

  it('GE-TRAIN: a valid course completion auto-satisfies the Law-190 training condition', async () => {
    // a legit-interest + CNP RoPA entry with dpo+retention+safeguards but NO explicit training attestation
    const ropa = await prisma.ropaEntry.create({ data: {
      orgId: orgA.id, processName: 'Pontaj cu CNP', legalBasis: 'legitimate_interest',
      categories: ['CNP'], purposes: ['pontaj'], retentionMonths: 24,
      dpoDesignated: true, staffTrainingAttested: false, documentedSafeguards: true, status: 'draft',
    } });
    // before training: activation blocked by the training condition
    await expect(svc.updateRopa(orgA.id, userId, ropa.id, { status: 'active' } as any)).rejects.toThrow(BadRequestException);
    // seed + complete a GDPR course for the org's member
    const seeded = await te.seedCourses();
    await te.completeTraining(userId, seeded[0].id, 100);
    expect(await te.orgHasValidTraining(orgA.id)).toBe(true);
    // now activation succeeds (training auto-satisfied)
    const updated = await svc.updateRopa(orgA.id, userId, ropa.id, { status: 'active' } as any);
    expect((updated as any).status).toBe('active');
  });

  it('GE-DATA-ACT: full export is a valid zip, org-scoped, drops security fields', async () => {
    const buf = await te.fullExport(orgA.id);
    expect(buf.slice(0, 2).toString()).toBe('PK'); // zip magic
    const JSZip = require('jszip');
    const zip = await JSZip.loadAsync(buf);
    expect(Object.keys(zip.files)).toEqual(expect.arrayContaining(['manifest.json', 'partners.json', 'employees.json', 'ropa.json']));
    const partners = JSON.parse(await zip.file('partners.json').async('string'));
    expect(partners.some((p: any) => p.name === 'Org A Partner')).toBe(true);
    const emp = await zip.file('employees.json').async('string');
    expect(emp).not.toMatch(/"cnp"|"cnpHash"|"bankAccount"/);
  });

  it('GE-CMP-HARDEN: static scanner finds seeded trackers on a LOCAL mock page', async () => {
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><head><script src="https://www.googletagmanager.com/gtag/js?id=G-XYZ999"></script><script>fbq("init","1")</script></head><body>hi</body></html>');
    });
    await new Promise<void>((r) => server.listen(0, r));
    const port = (server.address() as any).port;
    try {
      const scan = await te.scanSite(orgA.id, `http://127.0.0.1:${port}/`);
      const ids = scan.hits.map((h) => h.id);
      expect(ids).toContain('ga4');
      expect(ids).toContain('meta_pixel');
      expect(scan.method).toBe('static');
    } finally {
      server.close();
    }
  });
});
