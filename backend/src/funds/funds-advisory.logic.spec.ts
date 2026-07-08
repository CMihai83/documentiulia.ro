import { coFinance, rankInstruments, appraiseProjection, InstrumentLike } from './funds-advisory.logic';
import { buildDurabilityCalendar, durabilityYearsFor } from './durability.logic';

describe('FND-6 projection (reuses BC engine)', () => {
  it('appraises a projection over implementation + durability horizon', () => {
    const r = appraiseProjection({
      initialInvestmentEur: 100000,
      implementationYears: 1,
      durabilityYears: 3, // horizon = 4 years
      cashflows: [
        { benefit: 20000, opex: 5000 },
        { benefit: 50000, opex: 10000 },
        { benefit: 60000, opex: 10000 },
        { benefit: 70000, opex: 10000 },
      ],
      discountRatePct: 10,
    });
    expect(r.cashflows).toHaveLength(5); // year 0 + 4
    expect(r.npv).toBeGreaterThan(0);
    expect(r.irr).not.toBeNull();
  });
});

describe('FND-7 co-financing / VAT eligibility', () => {
  it('VAT-registered payer: deductible VAT is INELIGIBLE even if unclaimed', () => {
    const r = coFinance({
      totalProjectCostEur: 121000, // 100k net + 21% VAT
      vatRatePct: 21,
      programCoFinPct: 90,
      vatRegistered: true,
    });
    expect(r.vatEligible).toBe(false);
    expect(r.vatEur).toBeCloseTo(21000, 0);
    expect(r.eligibleTotalEur).toBeCloseTo(100000, 0); // VAT excluded from eligible
    expect(r.ineligibleEur).toBeCloseTo(21000, 0);     // VAT falls to ineligible
    expect(r.grantEur).toBeCloseTo(90000, 0);          // 90% of 100k net
    expect(r.notes.join(' ')).toMatch(/INELIGIBLE/);
  });

  it('non-VAT-payer: genuinely-borne VAT is eligible', () => {
    const r = coFinance({
      totalProjectCostEur: 121000,
      vatRatePct: 21,
      programCoFinPct: 90,
      vatRegistered: false,
    });
    expect(r.vatEligible).toBe(true);
    expect(r.eligibleTotalEur).toBeCloseTo(121000, 0); // VAT included
    expect(r.grantEur).toBeCloseTo(108900, 0);         // 90% of 121k
  });

  it('caps co-financing at 90%', () => {
    const r = coFinance({ totalProjectCostEur: 100000, vatRatePct: 0, programCoFinPct: 100, vatRegistered: false });
    expect(r.grantEur).toBeCloseTo(90000, 0);
    expect(r.notes.join(' ')).toMatch(/capped at 90/);
  });
});

describe('FND-8 instrument ranking', () => {
  const instruments: InstrumentLike[] = [
    { id: '1', name: 'Bridge credit', type: 'grant_bridge', maxCoveragePct: 100, forReimbursementGap: true, eligibilitySnippet: 'x' },
    { id: '2', name: 'FNGCIMM guarantee', type: 'guarantee', maxCoveragePct: 80, forReimbursementGap: true, eligibilitySnippet: 'x' },
    { id: '3', name: 'Leasing', type: 'leasing', maxCoveragePct: 100, forReimbursementGap: false, eligibilitySnippet: 'x' },
  ];
  it('ranks reimbursement-gap instruments first', () => {
    const ranked = rankInstruments(instruments, 50000);
    expect(ranked[0].instrument.forReimbursementGap).toBe(true);
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[ranked.length - 1].score);
  });
  it('guarantee covers only up to its coverage %', () => {
    const ranked = rankInstruments(instruments, 100000);
    const g = ranked.find((r) => r.instrument.id === '2')!;
    expect(g.coversEur).toBeCloseTo(80000, 0);
  });
});

describe('FND-9 durability horizon', () => {
  it('3 years for SME, 5 for large & public', () => {
    expect(durabilityYearsFor('sme')).toBe(3);
    expect(durabilityYearsFor('large')).toBe(5);
    expect(durabilityYearsFor('public')).toBe(5);
  });
  it('SME calendar spans 3 years with annual reports + a 30-day-prior alert', () => {
    const fp = new Date('2026-01-15T00:00:00Z');
    const { durabilityYears, events } = buildDurabilityCalendar(fp, 'sme');
    expect(durabilityYears).toBe(3);
    expect(events.filter((e) => e.kind === 'reporting')).toHaveLength(3);
    expect(events.filter((e) => e.kind === 'durability_end')).toHaveLength(1);
    expect(events.some((e) => e.kind === 'procurement')).toBe(true);
    const end = events.find((e) => e.kind === 'durability_end')!;
    expect(end.dueDate.getUTCFullYear()).toBe(2029); // 2026 + 3
    expect(end.dueDate.getTime() - end.alertAt.getTime()).toBe(30 * 86400000);
  });
  it('large beneficiary spans 5 years', () => {
    const { durabilityYears, events } = buildDurabilityCalendar(new Date('2026-01-15T00:00:00Z'), 'large');
    expect(durabilityYears).toBe(5);
    expect(events.find((e) => e.kind === 'durability_end')!.dueDate.getUTCFullYear()).toBe(2031);
  });
});
