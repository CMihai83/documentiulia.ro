import {
  round2,
  varianceStatus,
  variance,
  contributionMargin,
  allocationShares,
  allocateAmount,
} from './controlling.math';

describe('ControllingMath', () => {
  describe('round2', () => {
    it('rounds to 2 decimals', () => {
      expect(round2(1.005)).toBe(1.01);
      expect(round2(74300.005)).toBe(74300.01);
      expect(round2(2.675)).toBe(2.68);
    });
  });

  describe('varianceStatus', () => {
    it('favorable when under budget', () => {
      expect(varianceStatus(100, 90)).toBe('favorable');
      expect(varianceStatus(100, 100)).toBe('favorable');
    });
    it('on_track within warn threshold', () => {
      expect(varianceStatus(100, 105)).toBe('on_track');
    });
    it('warning between warn and crit', () => {
      expect(varianceStatus(100, 110)).toBe('warning');
    });
    it('critical beyond crit threshold', () => {
      expect(varianceStatus(100, 130)).toBe('critical'); // marketing 18000->24500 style
    });
    it('handles zero plan', () => {
      expect(varianceStatus(0, 0)).toBe('on_track');
      expect(varianceStatus(0, 50)).toBe('critical');
    });
  });

  describe('variance', () => {
    it('positive amount = under budget', () => {
      expect(variance(100, 80)).toEqual({ amount: 20, percent: 20 });
    });
    it('negative amount = over budget', () => {
      // sales marketing: planned 18000, actual 24500
      expect(variance(18000, 24500)).toEqual({ amount: -6500, percent: -36.11 });
    });
    it('zero plan yields 0 percent', () => {
      expect(variance(0, 100).percent).toBe(0);
    });
  });

  describe('contributionMargin (CO-PA)', () => {
    it('computes CM1 and operating result', () => {
      // SaaS Pro seed figures
      const r = contributionMargin({ revenue: 420000, cogs: 63000, directCosts: 28000, allocatedFixedCosts: 110000 });
      expect(r.variableCosts).toBe(91000);
      expect(r.contributionMargin1).toBe(329000);
      expect(r.cm1Percent).toBe(78.33);
      expect(r.operatingResult).toBe(219000);
      expect(r.operatingMarginPercent).toBe(52.14);
    });
    it('handles zero revenue safely', () => {
      const r = contributionMargin({ revenue: 0, cogs: 0, directCosts: 0, allocatedFixedCosts: 10 });
      expect(r.cm1Percent).toBe(0);
      expect(r.operatingResult).toBe(-10);
    });
  });

  describe('allocationShares', () => {
    it('normalizes to sum 1', () => {
      const s = allocationShares([1, 1, 2]);
      expect(round2(s.reduce((a, b) => a + b, 0))).toBe(1);
      expect(s[2]).toBe(0.5);
    });
    it('equal split when all weights zero', () => {
      expect(allocationShares([0, 0])).toEqual([0.5, 0.5]);
    });
  });

  describe('allocateAmount (no cent leaks)', () => {
    it('receivers sum exactly to the allocated amount', () => {
      const parts = allocateAmount(1000, [1, 1, 1]); // 333.33 x3 -> drift fixed
      expect(round2(parts.reduce((a, b) => a + b, 0))).toBe(1000);
    });
    it('weights split proportionally', () => {
      const parts = allocateAmount(90000, [1, 2]);
      expect(round2(parts.reduce((a, b) => a + b, 0))).toBe(90000);
      expect(parts[1]).toBeGreaterThan(parts[0]);
    });
    it('handles a single receiver', () => {
      expect(allocateAmount(500, [5])).toEqual([500]);
    });
  });
});
