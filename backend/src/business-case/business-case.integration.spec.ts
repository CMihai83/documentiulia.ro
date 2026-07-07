/**
 * BC-101/102/103 integration — runs against a throwaway postgres:15-alpine.
 * Gated by BC_IT=1 so it never runs in the normal unit sweep.
 * Verifies: create FIVE_CASE → questionnaire → answers v1 → patch v2 →
 * versions list + field-level diff; WACC derived rate matches hand math.
 */
import { PrismaService } from '../prisma/prisma.service';
import { BusinessCaseService } from './business-case.service';
import { wacc } from './bc.finance';

const RUN = process.env.BC_IT === '1';
const d = RUN ? describe : describe.skip;

d('BC integration', () => {
  let prisma: PrismaService;
  let svc: BusinessCaseService;
  const userId = 'bc-it-user';

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    svc = new BusinessCaseService(prisma);
    await prisma.bcAssumptionSet.deleteMany({ where: { businessCase: { userId } } });
    await prisma.businessCase.deleteMany({ where: { userId } });
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it('create → questionnaire → v1 → v2 → versions + diff; WACC matches hand math', async () => {
    // create
    const bc = await svc.create(userId, undefined, { title: 'New warehouse', template: 'FIVE_CASE' });
    expect(bc.template).toBe('FIVE_CASE');
    expect(bc.status).toBe('DRAFT');

    // questionnaire (BC-102)
    const q = svc.getQuestionnaire('FIVE_CASE');
    expect(q.maturityStages).toEqual(['SOC', 'OBC', 'FBC']);
    expect(q.sections.some((s) => s.id === 'wacc')).toBe(true);

    // answers v1 (CAPM path)
    const v1Answers = {
      'strategic.problem': 'growth', 'strategic.horizonYears': 10, 'strategic.initialInvestment': 500000,
      'wacc.mode': 'capm', 'wacc.rf': 4, 'wacc.erp': 5, 'wacc.beta': 1.2,
      'wacc.costDebtPre': 6, 'wacc.taxRate': 16, 'wacc.debtWeight': 40,
    };
    const v1 = await svc.submitAnswers(userId, bc.id, v1Answers);
    expect(v1.version).toBe(1);
    // WACC hand math: 0.6×0.10 + 0.4×0.0504 = 0.08016
    const expected = wacc({ rf: 0.04, erp: 0.05, beta: 1.2, costDebtPre: 0.06, taxRate: 0.16, debtWeight: 0.4 });
    expect(Math.round(v1.discountRate.rate * 1e6)).toBe(Math.round(expected * 1e6));
    expect(v1.discountRate.method).toBe('capm');

    // patch → v2 (change beta 1.2 → 1.5)
    const v2 = await svc.submitAnswers(userId, bc.id, { ...v1Answers, 'wacc.beta': 1.5 });
    expect(v2.version).toBe(2);

    // versions list
    const versions = await svc.listVersions(userId, bc.id);
    expect(versions.map((v) => v.version).sort()).toEqual([1, 2]);

    // field-level diff v1 → v2 shows the changed beta
    const diff = await svc.diff(userId, bc.id, 1, 2);
    const betaChange = diff.changes.find((c) => c.field === 'wacc.beta');
    expect(betaChange).toBeTruthy();
    expect(betaChange!.from).toBe(1.2);
    expect(betaChange!.to).toBe(1.5);

    // validation is enforced: an out-of-range horizon is rejected as a new version
    await expect(
      svc.submitAnswers(userId, bc.id, { ...v1Answers, 'strategic.horizonYears': 999 }),
    ).rejects.toThrow(/Validation failed|BadRequest|horizon/i);
  }, 60000);
});
