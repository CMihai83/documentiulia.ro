import { goalSeek, breakEven } from './bc.goalseek';

/**
 * Hand-math reference (30-digit decimal, committed):
 * capex 100,000; 3 years; benefits 60,000/yr; opex 10,000/yr; hurdle 10%.
 * annuity(3,10%) = (1 − 1.1⁻³)/0.1 = 2.486851991...
 * NPV = −100,000 + 50,000 × 2.486852 = 24,342.60
 *
 * Price break-even (NPV = 0): 60,000·m − 10,000 = 100,000/2.486852 = 40,211.48
 *   → m = 50,211.48/60,000 = 0.836858  (price −16.31%)
 * Goal-seek IRR 15%: annuity(3,15%) = 2.283225
 *   60,000·m − 10,000 = 100,000/2.283225 = 43,797.93 → m = 0.896632 (−10.34%)
 */
const ANSWERS: Record<string, any> = {
  'strategic.horizonYears': 3,
  'strategic.initialInvestment': 100_000,
  'wacc.mode': 'hurdle',
  'wacc.hurdle': 10,
  'economic.cashflows': [
    { benefit: 60_000, opex: 10_000 },
    { benefit: 60_000, opex: 10_000 },
    { benefit: 60_000, opex: 10_000 },
  ],
};

describe('BC-208 goal-seek & break-even', () => {
  it('solves the price multiplier for NPV = 0 within 0.1% of hand math', () => {
    const r = goalSeek(ANSWERS, 'price', 'npv', 0);
    expect(r.solution).not.toBeNull();
    expect(Math.abs((r.solution as number) - 0.836858)).toBeLessThan(0.001);
    expect(r.changePct).toBeCloseTo(-16.31, 1);
    expect(r.message).toContain('price');
  });

  it('solves the price multiplier for a target IRR of 15%', () => {
    const r = goalSeek(ANSWERS, 'price', 'irr', 0.15);
    expect(r.solution).not.toBeNull();
    expect(Math.abs((r.solution as number) - 0.896632)).toBeLessThan(0.001);
    expect(r.achieved).toBeCloseTo(0.15, 3);
  });

  it('solves capex for a target NPV (scales the other way)', () => {
    // NPV(m) = −100,000·m + 124,342.60 = 50,000 → m = 74,342.60/100,000 = 0.743426
    const r = goalSeek(ANSWERS, 'capex', 'npv', 50_000);
    expect(r.solution).not.toBeNull();
    expect(Math.abs((r.solution as number) - 0.743426)).toBeLessThan(0.001);
  });

  it('solves the discount rate for NPV = 0 (== IRR)', () => {
    const r = goalSeek(ANSWERS, 'discountRate', 'npv', 0);
    expect(r.solution).not.toBeNull();
    // IRR of (−100k, 50k×3): between 23% and 24% (annuity(3,r)=2 → r≈23.375%)
    expect(r.solution as number).toBeGreaterThan(0.23);
    expect(r.solution as number).toBeLessThan(0.24);
  });

  it('returns null+reason for an unreachable target (never hangs)', () => {
    const r = goalSeek(ANSWERS, 'price', 'npv', 100_000_000);
    expect(r.solution).toBeNull();
    expect(r.reason).toMatch(/not reachable/i);
  });

  it('break-even: accounting (units & revenue) + financial (price multiplier) hand-validated', () => {
    const a = {
      ...ANSWERS,
      'ue.pricePerUnit': 100,
      'ue.variableCostPerUnit': 40,
      'ue.fixedCostsMonthly': 12_000,
    };
    const be = breakEven(a);
    // 12,000 / 60 = 200 units → 20,000 RON revenue
    expect(be.accounting).toEqual({ unitsPerMonth: 200, revenuePerMonth: 20_000 });
    expect(be.financial).not.toBeNull();
    expect(be.financial!.priceMultiplier).toBeCloseTo(0.836858, 3);
  });

  it('break-even accounting is null without unit inputs; financial still computed', () => {
    const be = breakEven(ANSWERS);
    expect(be.accounting).toBeNull();
    expect(be.financial).not.toBeNull();
  });
});
