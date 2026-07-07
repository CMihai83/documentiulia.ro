import { costOfEquity, wacc, resolveDiscountRate } from './bc.finance';

const r4 = (n: number) => Math.round(n * 10000) / 10000;

describe('BC-103 WACC / CAPM', () => {
  it('CAPM cost of equity: Re = Rf + β·ERP', () => {
    // 4% + 1.2 × 5% = 10%
    expect(r4(costOfEquity(0.04, 1.2, 0.05))).toBe(0.1);
  });

  it('WACC blends after-tax debt and equity by weight', () => {
    // E=60%, D=40%; Re = 4% + 1.2×5% = 10%; Rd(1-T) = 6%×(1-16%) = 5.04%
    // WACC = 0.6×0.10 + 0.4×0.0504 = 0.06 + 0.02016 = 0.08016
    const w = wacc({ rf: 0.04, erp: 0.05, beta: 1.2, costDebtPre: 0.06, taxRate: 0.16, debtWeight: 0.4 });
    expect(r4(w)).toBe(0.0802);
  });

  it('all-equity firm: WACC == cost of equity', () => {
    const w = wacc({ rf: 0.03, erp: 0.06, beta: 1.0, costDebtPre: 0.05, taxRate: 0.16, debtWeight: 0 });
    expect(r4(w)).toBe(r4(costOfEquity(0.03, 1.0, 0.06)));
  });

  it('resolveDiscountRate reads whole-percent answers via CAPM path', () => {
    const { rate, method } = resolveDiscountRate({
      'wacc.mode': 'capm', 'wacc.rf': 4, 'wacc.erp': 5, 'wacc.beta': 1.2,
      'wacc.costDebtPre': 6, 'wacc.taxRate': 16, 'wacc.debtWeight': 40,
    });
    expect(method).toBe('capm');
    expect(r4(rate)).toBe(0.0802);
  });

  it('resolveDiscountRate honours the simple hurdle path', () => {
    const { rate, method } = resolveDiscountRate({ 'wacc.mode': 'hurdle', 'wacc.hurdle': 12 });
    expect(method).toBe('hurdle');
    expect(r4(rate)).toBe(0.12);
  });
});
