import { createInitialState } from './simv2.engine';
import { runStress } from './simv2.stress';

describe('SIM-11 stress (pure)', () => {
  const baseline = createInitialState('services', 4242);

  it('same seed → bit-identical result (deterministic, engine RNG only)', () => {
    const a = runStress(baseline, { seed: 99, iterations: 60, horizonMonths: 6 });
    const b = runStress(baseline, { seed: 99, iterations: 60, horizonMonths: 6 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const c = runStress(baseline, { seed: 100, iterations: 60, horizonMonths: 6 });
    expect(JSON.stringify(c)).not.toBe(JSON.stringify(a));
  });

  it('percentiles are monotonic per month (P10 ≤ P50 ≤ P90)', () => {
    const r = runStress(baseline, { seed: 7, iterations: 80, horizonMonths: 8 });
    for (const t of r.trajectory) {
      expect(t.cashP10).toBeLessThanOrEqual(t.cashP50);
      expect(t.cashP50).toBeLessThanOrEqual(t.cashP90);
      expect(t.netWorthP10).toBeLessThanOrEqual(t.netWorthP50);
      expect(t.netWorthP50).toBeLessThanOrEqual(t.netWorthP90);
    }
    expect(r.trajectory).toHaveLength(8);
  });

  it('risk-factor breakdown sums to ~100% and is sorted descending', () => {
    const r = runStress(baseline, { seed: 7, iterations: 80, horizonMonths: 6 });
    const sum = r.factorBreakdown.reduce((a, f) => a + f.variedPct, 0);
    expect(sum).toBeGreaterThan(99);
    expect(sum).toBeLessThan(101);
    expect(r.factorBreakdown[0].variedPct).toBeGreaterThanOrEqual(r.factorBreakdown[1].variedPct);
  });

  it('flags + recommendations + calendar suggestions are present and coherent', () => {
    const r = runStress(baseline, { seed: 11, iterations: 60, horizonMonths: 6 });
    expect(r.flags.minCashMonthP50).toBeGreaterThanOrEqual(1);
    expect(r.flags.minCashMonthP50).toBeLessThanOrEqual(6);
    expect(r.flags.insolvencyProbabilityPct).toBeGreaterThanOrEqual(0);
    expect(r.recommendations.length).toBeGreaterThanOrEqual(2);
    expect(r.calendarSuggestions.length).toBeGreaterThanOrEqual(1);
    expect(r.calendarSuggestions.every((c) => c.month >= 1 && c.month <= 6)).toBe(true);
  });

  it('500 iterations × 6 months completes in reasonable time', () => {
    const t0 = process.hrtime.bigint();
    const r = runStress(baseline, { seed: 3, iterations: 500, horizonMonths: 6 });
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    expect(r.iterations).toBe(500);
    expect(ms).toBeLessThan(60_000);
  });
});
