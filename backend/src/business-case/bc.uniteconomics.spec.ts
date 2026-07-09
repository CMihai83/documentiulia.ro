import { computeUnitEconomics, hasUnitEconomicsInputs, LTV_HORIZON_MONTHS } from './bc.uniteconomics';

/**
 * Hand math (committed reference):
 *  price 100, variable 40 → contribution 60/unit; 2 orders/mo → 120/mo per customer.
 *  Marketing 10,000/mo, 50 new customers → CAC 200.
 *  Churn 5%/mo → LTV = 120/0.05 = 2,400 (< 60-mo horizon 7,200 → uncapped).
 *  LTV/CAC = 12; CAC payback = 200/120 = 1.67 months.
 */
const BASE: Record<string, any> = {
  'ue.pricePerUnit': 100,
  'ue.variableCostPerUnit': 40,
  'ue.ordersPerMonth': 2,
  'ue.monthlyChurnPct': 5,
  'ue.marketingSpendMonthly': 10_000,
  'ue.newCustomersMonthly': 50,
};

describe('BC-210 unit economics', () => {
  it('hand-validated: contribution 60, CAC 200, LTV 2400, LTV/CAC 12, payback 1.67', () => {
    const r = computeUnitEconomics(BASE);
    expect(r.contributionPerUnit).toBe(60);
    expect(r.monthlyContribution).toBe(120);
    expect(r.cac).toBe(200);
    expect(r.ltv).toBe(2400);
    expect(r.ltvCapped).toBe(false);
    expect(r.ltvToCac).toBe(12);
    expect(r.cacPaybackMonths).toBe(1.67);
  });

  it('zero churn → LTV capped at the 60-month horizon and FLAGGED (never Infinity)', () => {
    const r = computeUnitEconomics({ ...BASE, 'ue.monthlyChurnPct': 0 });
    expect(r.ltv).toBe(120 * LTV_HORIZON_MONTHS); // 7,200
    expect(r.ltvCapped).toBe(true);
    expect(Number.isFinite(r.ltv)).toBe(true);
  });

  it('tiny churn (0.5%) also hits the cap: raw 24,000 > horizon 7,200', () => {
    const r = computeUnitEconomics({ ...BASE, 'ue.monthlyChurnPct': 0.5 });
    expect(r.ltv).toBe(7200);
    expect(r.ltvCapped).toBe(true);
  });

  it('missing marketing inputs → CAC/ratios null, contribution still computed', () => {
    const r = computeUnitEconomics({ 'ue.pricePerUnit': 100, 'ue.variableCostPerUnit': 40, 'ue.ordersPerMonth': 2, 'ue.monthlyChurnPct': 5 });
    expect(r.cac).toBeNull();
    expect(r.ltvToCac).toBeNull();
    expect(r.cacPaybackMonths).toBeNull();
    expect(r.monthlyContribution).toBe(120);
  });

  it('gate requires price and orders', () => {
    expect(hasUnitEconomicsInputs(BASE)).toBe(true);
    expect(hasUnitEconomicsInputs({ 'ue.pricePerUnit': 100 })).toBe(false);
  });
});
