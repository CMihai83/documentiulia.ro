/**
 * S-58 integration — gated by S58_IT=1 against a throwaway Postgres.
 * Proves: the debt-financed 24-month case computes and persists the EXTENDED
 * results keyed to the assumption version (additive shape), DSCR warning
 * present, FCFF ≠ FCFE labelled, TV separable, recompute after an answer
 * change produces a new snapshot, and g ≥ r is rejected as a BadRequest.
 */
import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { PDFGeneratorService } from '../document-generation/pdf-generator.service';
import { BusinessCaseService } from './business-case.service';

const RUN = process.env.S58_IT === '1';
const d = RUN ? describe : describe.skip;

const chartsStub: any = { renderToDataUri: async () => 'data:image/png;base64,' };

const ANSWERS: Record<string, any> = {
  'strategic.problem': 'growth',
  'strategic.horizonYears': 2,
  'strategic.initialInvestment': 300_000,
  'wacc.mode': 'hurdle', 'wacc.hurdle': 10,
  'economic.cashflows': [
    { benefit: 500_000, opex: 200_000 },
    { benefit: 600_000, opex: 210_000 },
  ],
  'economic.pnl.revenueYear1': 1_200_000,
  'economic.pnl.revenueGrowthPct': 12,
  'economic.pnl.cogsPct': 40,
  'economic.pnl.opexMonthly': 30_000,
  'economic.pnl.daMonthly': 5_000,
  'economic.pnl.taxRatePct': 16,
  'economic.wc.dsoDays': 60, 'economic.wc.dpoDays': 30, 'economic.wc.dioDays': 45,
  'economic.debt.amount': 300_000, 'economic.debt.ratePct': 12,
  'economic.debt.tenorMonths': 24, 'economic.debt.shape': 'amortizing',
  'economic.tv.method': 'gordon', 'economic.tv.growthPct': 2,
};

d('S-58 extended BC engine (integration)', () => {
  let prisma: PrismaService;
  let svc: BusinessCaseService;
  const userId = 's58-it-user';
  let bcId: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    svc = new BusinessCaseService(prisma, chartsStub, new PDFGeneratorService(new EventEmitter2()));
    await prisma.bcResult.deleteMany({ where: { businessCase: { userId } } });
    await prisma.bcAssumptionSet.deleteMany({ where: { businessCase: { userId } } });
    await prisma.businessCase.deleteMany({ where: { userId } });
    const bc = await svc.create(userId, undefined, { title: 'S-58 debt-financed case', template: 'FIVE_CASE' });
    bcId = bc.id;
    await svc.submitAnswers(userId, bcId, ANSWERS);
  });

  afterAll(async () => {
    await prisma.bcResult.deleteMany({ where: { businessCase: { userId } } });
    await prisma.bcAssumptionSet.deleteMany({ where: { businessCase: { userId } } });
    await prisma.businessCase.deleteMany({ where: { userId } });
    await prisma.$disconnect();
  });

  it('computes and persists the extended results keyed to the version (additive shape)', async () => {
    const res: any = await svc.compute(userId, bcId, { seed: 42, iterations: 500 });
    // pre-existing keys untouched (additive proof)
    expect(res.appraisal?.npv).toBeDefined();
    expect(res.tornado).toBeDefined();
    expect(res.monteCarlo).toBeDefined();
    // new keys
    expect(res.extras.mirr).not.toBeNull();
    expect(res.extras.eac).toBeDefined();
    expect(res.extended.months.length).toBe(25);
    expect(res.extended.annual.length).toBe(3);
    // persisted keyed to version 1
    const snap = await prisma.bcResult.findFirst({ where: { bcId } });
    expect(snap!.assumptionVersion).toBe(1);
    expect((snap!.resultsJson as any).extended.months.length).toBe(25);
  });

  it('DSCR warning present; FCFF ≠ FCFE and both labelled; TV separable', async () => {
    const res: any = await svc.compute(userId, bcId, { seed: 42, iterations: 200 });
    expect(res.extended.dscrWarning).toBe(true);
    expect(res.extended.coverage.minDscr).toBeLessThan(1);
    const m1 = res.extended.months[1];
    expect(m1.fcff).not.toBe(m1.fcfe);
    expect(m1.fcff).toBe(-194_000); // committed reference vector
    expect(m1.fcfe).toBe(-207_642.04);
    const tv = res.extended.terminalValue;
    expect(tv.method).toBe('gordon');
    expect(tv.npvWithTv).not.toBe(tv.npvWithoutTv);
    expect(Math.round((tv.npvWithTv - tv.npvWithoutTv - tv.pvTv) * 100)).toBe(0);
  });

  it('a new answer version yields a NEW snapshot; g ≥ r rejected as BadRequest', async () => {
    await svc.submitAnswers(userId, bcId, { ...ANSWERS, 'economic.pnl.revenueGrowthPct': 15 });
    const res: any = await svc.compute(userId, bcId, { seed: 42, iterations: 200 });
    expect(res.assumptionVersion).toBe(2);
    const snaps = await prisma.bcResult.findMany({ where: { bcId } });
    expect(snaps.length).toBe(2);

    // g (8%) within DSL bounds but ≥ the 6% hurdle → TvValidationError → BadRequest at compute
    await svc.submitAnswers(userId, bcId, { ...ANSWERS, 'wacc.hurdle': 6, 'economic.tv.growthPct': 8 });
    await expect(svc.compute(userId, bcId, { seed: 1, iterations: 100 })).rejects.toThrow(BadRequestException);
  });
});
