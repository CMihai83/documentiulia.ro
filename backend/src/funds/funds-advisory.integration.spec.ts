/**
 * FND Advisory integration (S-54) — runs against a throwaway postgres:15-alpine.
 * Gated by FND_IT=1. Verifies: dossier checklist generate + item status + completeness;
 * projection built on the BC engine + exported to a BC deliverable; co-fin/VAT split for
 * both a VAT-payer (VAT ineligible) and a non-payer (eligible); financing instruments
 * ranked to the reimbursement gap; durability calendar with correct 3 vs 5yr horizon +
 * a 30-day-prior alert persisted.
 */
import { PrismaService } from '../prisma/prisma.service';
import { FundsAdvisoryService } from './funds-advisory.service';

const RUN = process.env.FND_IT === '1';
const d = RUN ? describe : describe.skip;

d('FND advisory integration', () => {
  let prisma: PrismaService;
  let adv: FundsAdvisoryService;
  const userId = 'fnd-adv-user';
  const orgId = 'fnd-adv-org';

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    adv = new FundsAdvisoryService(prisma);
    await prisma.organization.upsert({
      where: { id: orgId },
      create: { id: orgId, name: 'FND Adv Org', slug: 'fnd-adv-org', county: 'Cluj' },
      update: {},
    });
    await prisma.fundingProfile.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId, userId, vatPayer: true },
      update: { vatPayer: true },
    });
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it('FND-5: generates a dossier checklist, transitions an item, tracks completeness', async () => {
    const c = await adv.createChecklist(userId, orgId, null);
    expect(c.items.length).toBeGreaterThan(5);
    const before = await adv.getChecklist(c.id);
    expect(before.completeness).toBe(0);
    await adv.setItemStatus(c.items[0].id, 'verified');
    const after = await adv.getChecklist(c.id);
    expect(after.completeness).toBeGreaterThan(0);
  });

  it('FND-6: projection is appraised via the BC engine and exports a deliverable', async () => {
    const proj = await adv.createProjection(userId, orgId, {
      title: 'Grant projection', initialInvestmentEur: 100000,
      implementationYears: 1, durabilityYears: 3,
      cashflows: [{ benefit: 20000, opex: 5000 }, { benefit: 50000, opex: 10000 }, { benefit: 60000, opex: 10000 }, { benefit: 70000, opex: 10000 }],
      discountRatePct: 10,
    });
    const result = proj.resultJson as any;
    expect(result.npv).toBeGreaterThan(0);
    expect(result.cashflows).toHaveLength(5);
    const del = await adv.exportProjectionDeliverable(proj.id, 'ro', 'OBC');
    expect(del.html).toContain('<'); // real HTML
    expect(del.html.length).toBeGreaterThan(100);
  });

  it('FND-7: VAT-registered payer VAT ineligible; non-payer eligible', async () => {
    const payer = await adv.coFinance(orgId, { totalProjectCostEur: 121000, vatRatePct: 21, programCoFinPct: 90, vatRegistered: true });
    expect(payer.vatEligible).toBe(false);
    expect(payer.grantEur).toBeCloseTo(90000, 0);
    const nonPayer = await adv.coFinance(orgId, { totalProjectCostEur: 121000, vatRatePct: 21, programCoFinPct: 90, vatRegistered: false });
    expect(nonPayer.vatEligible).toBe(true);
    expect(nonPayer.grantEur).toBeCloseTo(108900, 0);
  });

  it('FND-8: instruments seed and rank to the reimbursement gap', async () => {
    await adv.seedInstruments();
    const ranked = await adv.rankInstruments(50000);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].instrument.forReimbursementGap).toBe(true);
  });

  it('FND-9: durability calendar has correct 3yr (SME) / 5yr (large) horizon + 30-day alert', async () => {
    const sme = await adv.createDurability(userId, orgId, { title: 'SME grant', finalPaymentDate: '2026-01-15', beneficiaryType: 'sme' });
    expect(sme.durabilityYears).toBe(3);
    const end = sme.events.find((e) => e.kind === 'durability_end')!;
    expect(new Date(end.dueDate).getUTCFullYear()).toBe(2029);
    expect(new Date(end.dueDate).getTime() - new Date(end.alertAt).getTime()).toBe(30 * 86400000);

    const large = await adv.createDurability(userId, orgId, { title: 'Large grant', finalPaymentDate: '2026-01-15', beneficiaryType: 'large' });
    expect(large.durabilityYears).toBe(5);
    expect(new Date(large.events.find((e) => e.kind === 'durability_end')!.dueDate).getUTCFullYear()).toBe(2031);
  });
});
