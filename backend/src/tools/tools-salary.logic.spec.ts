import {
  personalDeduction,
  salaryFromGross,
  salaryFromNet,
} from './tools-salary.logic';

describe('DOC-W0-3 salary math (to the leu)', () => {
  const MW = 4050;

  it('matches the committed reference example: gross 5000, 0 dependents', () => {
    const r = salaryFromGross(5000, 0, MW);
    expect(r.cas).toBe(1250);
    expect(r.cass).toBe(500);
    // k = ceil(950/50) = 19 → 20% × (1 − 19/40) = 10.5% × 4050 = 425.25 → ceil 426
    expect(r.personalDeduction).toBe(426);
    expect(r.taxable).toBe(2824);
    expect(r.incomeTax).toBe(282);
    expect(r.net).toBe(2968);
  });

  it('at minimum wage the full base deduction applies (20% of MW, 0 dep)', () => {
    expect(personalDeduction(MW, 0, MW)).toBe(Math.ceil(0.2 * MW)); // 810
    const r = salaryFromGross(MW, 0, MW);
    expect(r.net).toBe(MW - Math.round(MW * 0.25) - Math.round(MW * 0.1) - r.incomeTax);
  });

  it('dependents raise the deduction (45% band at 4+)', () => {
    expect(personalDeduction(MW, 4, MW)).toBe(Math.ceil(0.45 * MW)); // 1823
    expect(personalDeduction(MW, 7, MW)).toBe(personalDeduction(MW, 4, MW)); // capped band
  });

  it('deduction phases out to exactly 0 above MW + 2000', () => {
    expect(personalDeduction(MW + 2000, 0, MW)).toBe(Math.ceil(0.2 * MW * (1 - 40 / 40))); // 0
    expect(personalDeduction(MW + 2001, 0, MW)).toBe(0);
    expect(personalDeduction(MW + 5000, 4, MW)).toBe(0);
  });

  it('net→gross inverts gross→net exactly to the leu', () => {
    for (const gross of [MW, 4800, 5000, 6100, 9999, 20000]) {
      const fwd = salaryFromGross(gross, 1, MW);
      const inv = salaryFromNet(fwd.net, 1, MW);
      expect(inv.net).toBeGreaterThanOrEqual(fwd.net);
      // the found gross yields the target net, and gross-1 does not
      expect(salaryFromGross(inv.gross, 1, MW).net).toBeGreaterThanOrEqual(fwd.net);
      expect(salaryFromGross(inv.gross - 1, 1, MW).net).toBeLessThan(fwd.net);
    }
  });

  it('degenerate: tiny gross never yields negative taxable/net', () => {
    const r = salaryFromGross(100, 0, MW);
    expect(r.taxable).toBe(0);
    expect(r.incomeTax).toBe(0);
    expect(r.net).toBe(100 - 25 - 10);
  });
});
