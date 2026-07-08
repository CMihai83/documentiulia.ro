/**
 * FND integration — runs against a throwaway postgres:15-alpine.
 * Gated by FND_IT=1 so it never runs in the normal unit sweep.
 * Verifies: seed catalog → create profile → match returns ranked eligible calls
 * with per-filter reasons + est grant → de minimis over-ceiling BLOCKS a match →
 * precheck saves a FundingLead → firm-in-difficulty rejected → București-Ilfov
 * medium enterprise gets the reduced intensity.
 */
import { PrismaService } from '../prisma/prisma.service';
import { FundsService } from './funds.service';
import { DeMinimisService } from './deminimis.service';

const RUN = process.env.FND_IT === '1';
const d = RUN ? describe : describe.skip;

d('FND integration', () => {
  let prisma: PrismaService;
  let funds: FundsService;
  let deMinimis: DeMinimisService;
  const userId = 'fnd-it-user';
  const orgId = 'fnd-it-org';

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    deMinimis = new DeMinimisService(prisma);
    funds = new FundsService(prisma, deMinimis);
    // ensure the org exists (match reads its county)
    await prisma.organization.upsert({
      where: { id: orgId },
      create: { id: orgId, name: 'FND IT Org', slug: 'fnd-it-org', county: 'Cluj' },
      update: { county: 'Cluj' },
    });
    for (const m of ['deMinimisAid', 'fundingLead', 'fundingProfile'] as const) {
      await (prisma as any)[m].deleteMany({ where: { OR: [{ userId }, { organizationId: orgId }] } }).catch(() => {});
    }
    await prisma.fundingProgram.deleteMany({});
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it('seeds the catalog (PNRR digitalizare excluded)', async () => {
    const r = await funds.seed();
    expect(r.seeded).toBeGreaterThan(0);
    const all = await funds.listPrograms();
    expect(all.length).toBe(r.total);
    expect(all.find((p) => /PNRR/i.test(p.name) && /digital/i.test(p.name))).toBeUndefined();
  });

  it('rejects a program with overlapping white/blacklist CAEN', async () => {
    await expect(funds.createProgram({
      name: 'Bad', authority: 'x', purpose: 'x', beneficiaryType: 'SMEs', legalBasis: 'de_minimis',
      caenWhitelist: ['6201'], caenBlacklist: ['6201'], sourceUrl: 'http://x',
    })).rejects.toThrow(/both white and blacklist/i);
  });

  it('creates a profile and matches → ranked eligible calls with per-filter reasons + est grant', async () => {
    await funds.upsertProfile(userId, orgId, {
      caenPrimary: '6201', headcount: 8, turnoverEur: 1_000_000, foundedDate: '2022-01-01',
      subscribedCapitalEur: 50_000, accumulatedLossEur: 0, equityEur: 200_000,
    });
    const res = await funds.match(orgId, { requestedCostEur: 100_000, projectType: 'digitalization' });
    expect(res.matches.length).toBeGreaterThan(0);
    expect(res.eligibleCount).toBeGreaterThan(0);
    const top = res.matches[0];
    expect(top.eligible).toBe(true);
    expect(top.perFilter.length).toBe(7);
    expect(top.estMaxGrantEur).toBeGreaterThan(0);
    expect(res.deMinimisHeadroomEur).toBe(300_000);
  });

  it('de minimis over-ceiling BLOCKS a de minimis match (filter 6 fails)', async () => {
    // burn most of the headroom
    await deMinimis.record(orgId, { grantorProgram: 'prior aid', amountEur: 290_000, awardedDate: '2025-01-01' });
    const status = await deMinimis.status(orgId);
    expect(status.headroomEur).toBe(10_000);
    expect(status.alert).toBe(true);
    const res = await funds.match(orgId, { requestedCostEur: 100_000, projectType: 'digitalization' });
    const startup = res.matches.find((m) => /Start-Up Nation/i.test(m.programName))!;
    const dm = startup.perFilter.find((f) => f.filter === 'deMinimis')!;
    expect(dm.pass).toBe(false);
    expect(startup.eligible).toBe(false);
  });

  it('rolling-3yr total ignores aid older than 3 years (date boundary)', async () => {
    await deMinimis.record(orgId, { grantorProgram: 'old aid', amountEur: 100_000, awardedDate: '2020-01-01' });
    const total = await deMinimis.rollingTotal(orgId, new Date('2026-07-01'));
    expect(total).toBe(290_000); // the 2020 aid is outside the window
  });

  it('precheck saves a FundingLead and flags firm-in-difficulty', async () => {
    await funds.upsertProfile(userId, orgId, {
      caenPrimary: '6201', headcount: 5, turnoverEur: 500_000, foundedDate: '2022-01-01',
      subscribedCapitalEur: 100_000, accumulatedLossEur: 70_000, equityEur: 20_000, // FID
    });
    const pc = await funds.precheck(userId, orgId, { requestedType: 'digitalization', requestedCostEur: 50_000 });
    expect(pc.leadId).toBeTruthy();
    expect(pc.criteria.find((c) => c.criterion === 'firm_in_difficulty')!.pass).toBe(false);
    expect(pc.eligible).toBe(false);
    const leads = await funds.listLeads(userId);
    expect(leads.length).toBeGreaterThan(0);
  });

  it('București-Ilfov medium enterprise gets the reduced GBER intensity', async () => {
    await prisma.organization.update({ where: { id: orgId }, data: { county: 'București' } });
    await funds.createProgram({
      name: 'GBER Regional Test', authority: 'ADR', purpose: 'x', beneficiaryType: 'SMEs',
      legalBasis: 'gber_14', aidIntensityPct: 60, sizeEligibility: ['medium'],
      caenWhitelist: [], caenBlacklist: [], regions: [], sourceUrl: 'http://x', status: 'open',
    });
    await funds.upsertProfile(userId, orgId, {
      caenPrimary: '6201', headcount: 120, turnoverEur: 30_000_000, balanceSheetEur: 20_000_000, foundedDate: '2018-01-01',
    });
    const res = await funds.match(orgId, { requestedCostEur: 1_000_000, projectType: '' });
    const gber = res.matches.find((m) => m.programName === 'GBER Regional Test')!;
    expect(gber.nuts2).toBe('RO32');
    expect(gber.effectiveIntensityPct).toBe(50); // 40 (BI) + 10 (medium)
  });
});
