/**
 * S-59 integration — BC-208/209/210 + SIM-11, gated by S59_IT=1 against a
 * throwaway Postgres (DATABASE_URL). Verifies: goal-seek on a stored case,
 * RFQ compute persists costSheet+bidScore additively, unit-economics present,
 * stress deterministic same-seed + monotonic percentiles + ZERO DB mutation
 * (ERP row counts and SimV2Run count unchanged).
 */
import { PrismaClient } from '@prisma/client';
import { BusinessCaseService } from './business-case.service';
import { SimV2Service } from '../simulation/v2/simv2.service';
import { SimV2CalibrationService } from '../simulation/v2/simv2.calibration';
import { DataUseGuardService } from '../ai/data-use-guard.service';

const RUN = process.env.S59_IT === '1';
const d = RUN ? describe : describe.skip;

d('S-59 integration', () => {
  const prisma = new PrismaClient();
  let bc: BusinessCaseService;
  let sim: SimV2Service;
  const userId = 's59-user';

  const BASE_ANSWERS: Record<string, any> = {
    'strategic.problem': 'growth',
    'strategic.horizonYears': 3,
    'strategic.initialInvestment': 100_000,
    'wacc.mode': 'hurdle',
    'wacc.hurdle': 10,
    'economic.cashflows': [
      { benefit: 60_000, opex: 10_000 },
      { benefit: 60_000, opex: 10_000 },
      { benefit: 60_000, opex: 10_000 },
    ],
    'ue.pricePerUnit': 100,
    'ue.variableCostPerUnit': 40,
    'ue.ordersPerMonth': 2,
    'ue.monthlyChurnPct': 5,
    'ue.marketingSpendMonthly': 10_000,
    'ue.newCustomersMonthly': 50,
    'ue.fixedCostsMonthly': 12_000,
  };

  beforeAll(async () => {
    await prisma.user.upsert({
      where: { id: userId },
      create: { id: userId, email: 's59@it.ro', password: 'x', name: 'S59' },
      update: {},
    });
    const guard = new DataUseGuardService(prisma as any);
    const calibration = new SimV2CalibrationService(prisma as any, guard);
    bc = new BusinessCaseService(prisma as any, null as any, null as any); // charts/pdf unused by these paths
    sim = new SimV2Service(prisma as any, calibration, null as any); // gamification unused (no runs ended)
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('goal-seek on a stored case converges; non-solvable is safe', async () => {
    const c = await bc.create(userId, undefined, { title: 'S59 GS', template: 'FIVE_CASE' });
    await bc.submitAnswers(userId, c.id, BASE_ANSWERS);
    const r = await bc.goalSeek(userId, c.id, { driver: 'price', metric: 'npv', target: 0 });
    expect(r.solution).toBeCloseTo(0.836858, 3);
    const bad = await bc.goalSeek(userId, c.id, { driver: 'price', metric: 'npv', target: 1e9 });
    expect(bad.solution).toBeNull();
    expect(bad.reason).toBeTruthy();
  }, 60_000);

  it('RFQ compute persists costSheet + bid score (additive shape) + UE + break-even', async () => {
    const c = await bc.create(userId, undefined, { title: 'S59 RFQ', template: 'RFQ' });
    await bc.submitAnswers(userId, c.id, {
      'rfq.method': 'cost-plus',
      'rfq.directMaterial': 400,
      'rfq.directLabour': 300,
      'rfq.overheadPct': 50,
      'rfq.markupPct': 20,
      'rfq.shouldCostBenchmark': 1000,
    });
    const res = await bc.compute(userId, c.id, { seed: 1, iterations: 100 });
    expect(res.rfq.costSheet.fullCost).toBe(1050);
    expect(res.rfq.pricing.price).toBe(1260);
    expect(res.rfq.bid.recommendation).toBe('bid');
    // legacy keys intact (additive proof)
    expect(res.appraisal).toBeDefined();
    expect(res.tornado).toBeDefined();

    const snap = await prisma.bcResult.findFirst({ where: { bcId: c.id } });
    expect((snap!.resultsJson as any).rfq.bid.score).toBe(81);

    // UE + break-even on the FIVE_CASE case
    const c2 = await bc.create(userId, undefined, { title: 'S59 UE', template: 'FIVE_CASE' });
    await bc.submitAnswers(userId, c2.id, BASE_ANSWERS);
    const res2 = await bc.compute(userId, c2.id, { seed: 1, iterations: 100 });
    expect(res2.unitEconomics.cac).toBe(200);
    expect(res2.unitEconomics.ltvToCac).toBe(12);
    expect(res2.breakEven.accounting.unitsPerMonth).toBe(200);
    expect(res2.rfq).toBeNull(); // no RFQ inputs on this case
  }, 60_000);

  it('SIM-11: stress deterministic same-seed, monotonic, and ZERO DB mutation', async () => {
    const counts = async () => ({
      runs: await prisma.simV2Run.count(),
      invoices: await prisma.invoice.count(),
      partners: await prisma.partner.count(),
      employees: await prisma.employee.count(),
    });
    const before = await counts();

    const a = await sim.stressTest(userId, undefined, { seed: 42, iterations: 500, horizonMonths: 6 });
    const b = await sim.stressTest(userId, undefined, { seed: 42, iterations: 500, horizonMonths: 6 });
    expect(JSON.stringify(a.trajectory)).toBe(JSON.stringify(b.trajectory));
    expect(JSON.stringify(a.flags)).toBe(JSON.stringify(b.flags));
    for (const t of a.trajectory) {
      expect(t.cashP10).toBeLessThanOrEqual(t.cashP50);
      expect(t.cashP50).toBeLessThanOrEqual(t.cashP90);
      expect(t.netWorthP10).toBeLessThanOrEqual(t.netWorthP50);
      expect(t.netWorthP50).toBeLessThanOrEqual(t.netWorthP90);
    }
    expect(a.factorBreakdown).toHaveLength(3);
    expect(a.recommendations.length).toBeGreaterThanOrEqual(2);

    const after = await counts();
    expect(after).toEqual(before); // no runs written, no ERP mutation
  }, 120_000);
});
