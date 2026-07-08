import { tornado, monteCarlo } from './bc.sensitivity';

const STD = {
  'strategic.initialInvestment': 1000,
  'strategic.horizonYears': 5,
  'economic.cashflows': Array.from({ length: 5 }, () => ({ benefit: 500, opex: 200 })),
  'wacc.mode': 'hurdle',
  'wacc.hurdle': 10,
};

describe('BC-105 sensitivity (tornado)', () => {
  it('ranks drivers by |ΔNPV| and swings each ±10%', () => {
    const bars = tornado(STD);
    expect(bars.length).toBeGreaterThan(0);
    // sorted descending by swing
    for (let i = 1; i < bars.length; i++) expect(bars[i - 1].swing).toBeGreaterThanOrEqual(bars[i].swing);
    // benefits (gross 500/yr) swing more than opex (200/yr)
    const b = bars.find((x) => x.key === 'benefits')!;
    const o = bars.find((x) => x.key === 'opex')!;
    expect(b.swing).toBeGreaterThan(o.swing);
    // all bars share the same base NPV
    expect(new Set(bars.map((x) => x.baseNpv)).size).toBe(1);
  });

  it('drops drivers with no exposure', () => {
    const noOpex = { ...STD, 'economic.cashflows': Array.from({ length: 5 }, () => ({ benefit: 500, opex: 0 })) };
    expect(tornado(noOpex).some((b) => b.key === 'opex')).toBe(false);
  });
});

describe('BC-105 Monte-Carlo', () => {
  const withDist = {
    ...STD,
    'economic.dist.benefits': { dist: 'triangular', min: 0.8, mode: 1.0, max: 1.3 },
    'economic.dist.opex': { dist: 'pert', min: 0.9, mode: 1.0, max: 1.2 },
    'economic.dist.capex': { dist: 'normal', mean: 1.0, sd: 0.05 },
  };

  it('is deterministic for a fixed seed (identical P50 across runs)', () => {
    const a = monteCarlo(withDist, { iterations: 3000, seed: 42 });
    const b = monteCarlo(withDist, { iterations: 3000, seed: 42 });
    expect(a.p50).toBe(b.p50);
    expect(a).toEqual(b);
  });

  it('a different seed changes the result', () => {
    const a = monteCarlo(withDist, { iterations: 3000, seed: 42 });
    const b = monteCarlo(withDist, { iterations: 3000, seed: 43 });
    expect(a.p50).not.toBe(b.p50);
  });

  it('percentiles are monotonic and probabilities are in [0,1]', () => {
    const r = monteCarlo(withDist, { iterations: 4000, seed: 7 });
    expect(r.p10).toBeLessThanOrEqual(r.p50);
    expect(r.p50).toBeLessThanOrEqual(r.p90);
    expect(r.probNpvPositive).toBeGreaterThanOrEqual(0);
    expect(r.probNpvPositive).toBeLessThanOrEqual(1);
    expect(r.probIrrAboveHurdle).toBeGreaterThanOrEqual(0);
    expect(r.probIrrAboveHurdle).toBeLessThanOrEqual(1);
    // histogram counts sum to the iteration count
    expect(r.histogram.reduce((s, h) => s + h.count, 0)).toBe(r.iterations);
  });

  it('mean sits near the deterministic base NPV (137.24) for symmetric-ish inputs', () => {
    const r = monteCarlo(withDist, { iterations: 5000, seed: 99 });
    expect(r.mean).toBeGreaterThan(80);
    expect(r.mean).toBeLessThan(200);
  });
});
