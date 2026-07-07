import { buildCashflows, npv, irr, payback, discountedPayback, bcr, roi, appraise } from './bc.model';

/** Standard project: 1000 capex, 5 years of 500 benefit / 200 opex (net 300), 10% rate. */
const STD = {
  'strategic.initialInvestment': 1000,
  'strategic.horizonYears': 5,
  'economic.cashflows': Array.from({ length: 5 }, () => ({ benefit: 500, opex: 200 })),
  'wacc.mode': 'hurdle',
  'wacc.hurdle': 10, // 10%
};

describe('BC-104 cashflow model', () => {
  it('builds year 0 capex + one net row per year', () => {
    const cf = buildCashflows(STD);
    expect(cf).toHaveLength(6);
    expect(cf[0]).toEqual({ year: 0, capex: 1000, benefit: 0, opex: 0, net: -1000 });
    expect(cf[3]).toEqual({ year: 3, capex: 0, benefit: 500, opex: 200, net: 300 });
  });

  it('NPV matches the annuity hand-calculation (137.2360)', () => {
    const cf = buildCashflows(STD);
    expect(npv(0.1, cf)).toBeCloseTo(137.236, 3);
  });

  it('IRR ≈ 15.24% for a 300/yr, 5-yr, 1000-cost project (single root)', () => {
    const cf = buildCashflows(STD);
    const r = irr(cf);
    expect(r.multipleRoots).toBe(false);
    expect(r.irr).toBeCloseTo(0.1524, 3);
  });

  it('simple payback = 3.3333 yr; discounted payback ≈ 4.2633 yr @10%', () => {
    const cf = buildCashflows(STD);
    expect(payback(cf)).toBeCloseTo(3.3333, 4);
    expect(discountedPayback(0.1, cf)).toBeCloseTo(4.2633, 3);
  });

  it('BCR ≈ 1.0781 and ROI = 0.5', () => {
    const cf = buildCashflows(STD);
    expect(bcr(0.1, cf)).toBeCloseTo(1.0781, 3);
    expect(roi(cf)).toBeCloseTo(0.5, 6);
  });

  it('appraise() wires the hurdle rate through end-to-end', () => {
    const a = appraise(STD);
    expect(a.discountMethod).toBe('hurdle');
    expect(a.discountRate).toBeCloseTo(0.1, 6);
    expect(a.npv).toBeCloseTo(137.236, 2);
    expect(a.irr).toBeCloseTo(0.1524, 3);
  });

  it('returns null IRR (no crash) when NPV never crosses zero', () => {
    const noRoot = buildCashflows({
      'strategic.initialInvestment': 0,
      'strategic.horizonYears': 3,
      'economic.cashflows': [{ benefit: 100, opex: 0 }, { benefit: 100, opex: 0 }, { benefit: 100, opex: 0 }],
    });
    const r = irr(noRoot);
    expect(r.irr).toBeNull();
    expect(r.multipleRoots).toBe(false);
  });

  it('flags multiple IRR roots on a non-conventional cashflow (mining: −1000,+2500,−1560)', () => {
    const cf = buildCashflows({
      'strategic.initialInvestment': 1000,
      'strategic.horizonYears': 2,
      'economic.cashflows': [{ benefit: 2500, opex: 0 }, { benefit: 0, opex: 1560 }],
    });
    expect(cf.map((r) => r.net)).toEqual([-1000, 2500, -1560]);
    const r = irr(cf);
    expect(r.multipleRoots).toBe(true);
    expect(r.irr).toBeCloseTo(0.2, 2); // first of the two roots (0.20 and 0.30)
  });
});
