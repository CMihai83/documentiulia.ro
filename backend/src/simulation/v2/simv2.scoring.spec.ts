import { computeScore, earnedBadges } from './simv2.scoring';
import { createInitialState } from './simv2.engine';
import { SimV2StateData } from './simv2.types';

// Build a minimal state list by cloning a real initial state and mutating fields.
function seq(mutate: (s: SimV2StateData, i: number) => void, n = 10): SimV2StateData[] {
  const out: SimV2StateData[] = [];
  for (let i = 0; i < n; i++) {
    const s = JSON.parse(JSON.stringify(createInitialState('services', 42))) as SimV2StateData;
    s.tick = i;
    mutate(s, i);
    out.push(s);
  }
  return out;
}

describe('SIM-12 scoring', () => {
  it('returns a zeroed breakdown for an empty history', () => {
    expect(computeScore([]).composite).toBe(0);
  });

  it('composite is the mean of the five sub-scores, each clamped 0..100', () => {
    const states = seq((s) => {
      s.flows.revenue = 1000; s.flows.cogs = 600; s.flows.opex = 200; // 20% margin
      s.stocks.cash = 5000; s.stocks.equity = 4000;
    });
    const sc = computeScore(states);
    for (const k of ['profitability', 'solvency', 'growth', 'resilience', 'compliance'] as const) {
      expect(sc[k]).toBeGreaterThanOrEqual(0);
      expect(sc[k]).toBeLessThanOrEqual(100);
    }
    const mean = (sc.profitability + sc.solvency + sc.growth + sc.resilience + sc.compliance) / 5;
    expect(sc.composite).toBeCloseTo(Math.round(mean * 10) / 10, 5);
  });

  it('penalises time spent cash-negative (solvency + compliance drop)', () => {
    const healthy = computeScore(seq((s) => { s.stocks.cash = 5000; s.stocks.equity = 4000; }));
    const broke = computeScore(seq((s) => { s.stocks.cash = -1000; s.stocks.equity = -500; }));
    expect(broke.solvency).toBeLessThan(healthy.solvency);
    expect(broke.compliance).toBeLessThan(healthy.compliance);
  });

  it('survivor badge: recession phase + positive final equity', () => {
    const states = seq((s, i) => { s.stocks.equity = 1000; if (i === 5) s.cycle.phase = 'RECESSION' as any; });
    expect(earnedBadges(states)).toContain('sim-survivor');
    const noEquity = seq((s, i) => { s.stocks.equity = -100; if (i === 5) s.cycle.phase = 'RECESSION' as any; });
    expect(earnedBadges(noEquity)).not.toContain('sim-survivor');
  });

  it('delegator badge: >= 3 DELEGATE decisions across the run', () => {
    const states = seq((s, i) => { s.lastTickLog = i < 3 ? [{ tick: i, kind: 'decision', message: 'Delegated: DELEGATE ops' } as any] : []; });
    expect(earnedBadges(states)).toContain('sim-delegator');
  });
});
