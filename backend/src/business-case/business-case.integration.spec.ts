/**
 * BC integration — runs against a throwaway postgres:15-alpine.
 * Gated by BC_IT=1 so it never runs in the normal unit sweep.
 * Verifies: create FIVE_CASE → questionnaire → answers v1 → patch v2 →
 * versions list + field-level diff (WACC hand math); BC-106 compute → persist
 * keyed to version → recompute a new version → new snapshot; Monte-Carlo
 * determinism; BC-107 deliverable per maturity (%PDF + SOC omits a FBC section).
 */
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessCaseService } from './business-case.service';
import { PDFGeneratorService } from '../document-generation/pdf-generator.service';
import { wacc } from './bc.finance';

const RUN = process.env.BC_IT === '1';
const d = RUN ? describe : describe.skip;

// Stub chart renderer — keeps the native canvas out of the test; section-omission
// and %PDF assertions don't depend on the embedded images.
const chartsStub: any = {
  barConfig: () => ({}), lineConfig: () => ({}), tornadoConfig: () => ({}),
  renderToDataUri: async () => 'data:image/png;base64,AAAA',
};

const HORIZON = 10;
const V1 = {
  'strategic.problem': 'growth', 'strategic.horizonYears': HORIZON, 'strategic.initialInvestment': 500000,
  'economic.cashflows': Array.from({ length: HORIZON }, () => ({ benefit: 120000, opex: 45000 })),
  'economic.dist.benefits': { dist: 'triangular', min: 0.85, mode: 1.0, max: 1.2 },
  'wacc.mode': 'capm', 'wacc.rf': 4, 'wacc.erp': 5, 'wacc.beta': 1.2,
  'wacc.costDebtPre': 6, 'wacc.taxRate': 16, 'wacc.debtWeight': 40,
};

d('BC integration', () => {
  let prisma: PrismaService;
  let svc: BusinessCaseService;
  const userId = 'bc-it-user';

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    svc = new BusinessCaseService(prisma, chartsStub, new PDFGeneratorService(new EventEmitter2()));
    await prisma.bcResult.deleteMany({ where: { businessCase: { userId } } });
    await prisma.bcAssumptionSet.deleteMany({ where: { businessCase: { userId } } });
    await prisma.businessCase.deleteMany({ where: { userId } });
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it('create → v1 → v2 → versions + diff; WACC matches hand math', async () => {
    const bc = await svc.create(userId, undefined, { title: 'New warehouse', template: 'FIVE_CASE' });
    expect(bc.status).toBe('DRAFT');

    const q = svc.getQuestionnaire('FIVE_CASE');
    expect(q.maturityStages).toEqual(['SOC', 'OBC', 'FBC']);
    expect(q.sections.some((s) => s.id === 'economic')).toBe(true); // BC-104 section present

    const v1 = await svc.submitAnswers(userId, bc.id, V1);
    expect(v1.version).toBe(1);
    const expected = wacc({ rf: 0.04, erp: 0.05, beta: 1.2, costDebtPre: 0.06, taxRate: 0.16, debtWeight: 0.4 });
    expect(Math.round(v1.discountRate.rate * 1e6)).toBe(Math.round(expected * 1e6)); // 0.08016
    expect(v1.discountRate.method).toBe('capm');

    const v2 = await svc.submitAnswers(userId, bc.id, { ...V1, 'wacc.beta': 1.5 });
    expect(v2.version).toBe(2);
    const diff = await svc.diff(userId, bc.id, 1, 2);
    expect(diff.changes.find((c) => c.field === 'wacc.beta')?.to).toBe(1.5);

    await expect(svc.submitAnswers(userId, bc.id, { ...V1, 'strategic.horizonYears': 999 }))
      .rejects.toThrow(/Validation failed|horizon/i);
  }, 60000);

  it('BC-106: compute persists a snapshot keyed to the latest version; a new version yields a NEW snapshot', async () => {
    const bc = await svc.create(userId, undefined, { title: 'Compute case', template: 'FIVE_CASE' });
    await svc.submitAnswers(userId, bc.id, V1); // v1

    const r1 = await svc.compute(userId, bc.id, { seed: 12345, iterations: 1500 });
    expect(r1.assumptionVersion).toBe(1);
    expect(typeof r1.appraisal.npv).toBe('number');
    expect(r1.appraisal.irr).not.toBeNull();

    // persisted + keyed to version 1
    const got = await svc.getResults(userId, bc.id);
    expect(got.assumptionVersion).toBe(1);
    expect(got.appraisal.npv).toBe(r1.appraisal.npv);
    expect(await prisma.bcResult.count({ where: { bcId: bc.id } })).toBe(1);

    // recompute same version → still one row (upsert)
    await svc.compute(userId, bc.id, { seed: 12345, iterations: 1500 });
    expect(await prisma.bcResult.count({ where: { bcId: bc.id } })).toBe(1);

    // new answer version → new snapshot row
    await svc.submitAnswers(userId, bc.id, { ...V1, 'strategic.initialInvestment': 600000 }); // v2
    const r2 = await svc.compute(userId, bc.id, { seed: 12345, iterations: 1500 });
    expect(r2.assumptionVersion).toBe(2);
    expect(await prisma.bcResult.count({ where: { bcId: bc.id } })).toBe(2);
    expect(r2.appraisal.npv).not.toBe(r1.appraisal.npv); // different capex → different NPV
  }, 60000);

  it('BC-105: Monte-Carlo is deterministic across two computes with the same seed', async () => {
    const bc = await svc.create(userId, undefined, { title: 'MC case', template: 'FIVE_CASE' });
    await svc.submitAnswers(userId, bc.id, V1);
    const a = await svc.compute(userId, bc.id, { seed: 777, iterations: 2000 });
    const b = await svc.compute(userId, bc.id, { seed: 777, iterations: 2000 });
    expect(a.monteCarlo.p50).toBe(b.monteCarlo.p50);
    expect(a.monteCarlo.p10).toBe(b.monteCarlo.p10);
    expect(a.monteCarlo.p90).toBe(b.monteCarlo.p90);
    expect(a.monteCarlo.p10).toBeLessThanOrEqual(a.monteCarlo.p50);
    expect(a.monteCarlo.p50).toBeLessThanOrEqual(a.monteCarlo.p90);
  }, 60000);

  it('BC-107: generates a %PDF per maturity; SOC omits a section FBC includes; status is stamped', async () => {
    const bc = await svc.create(userId, undefined, { title: 'Deliverable case', template: 'FIVE_CASE' });
    await svc.submitAnswers(userId, bc.id, V1);

    const soc = await svc.generateDeliverable(userId, bc.id, 'SOC', 'en');
    const fbc = await svc.generateDeliverable(userId, bc.id, 'FBC', 'en');

    for (const out of [soc, fbc]) {
      expect(out.content.startsWith('%PDF')).toBe(true);
      expect(out.size).toBeGreaterThan(0);
    }
    // maturity-gated content (asserted on the assembled HTML)
    expect(fbc.html).toContain('<h2>Management</h2>');
    expect(soc.html).not.toContain('<h2>Management</h2>');

    // status stamped to the last-generated maturity
    const after = await prisma.businessCase.findUnique({ where: { id: bc.id } });
    expect(after?.status).toBe('FBC');
  }, 60000);
});
