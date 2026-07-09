import { applyTick, rngNext } from './simv2.engine';
import { SimV2StateData } from './simv2.types';

/**
 * SIM-11 — Monte-Carlo stress test of the real budget (pure, deterministic).
 *
 * Takes a calibrated baseline state (S-49 mirror path — service delivery,
 * scrubbed aggregates) and runs N seeded iterations, each perturbing three
 * factors before replaying `horizonMonths` month-ticks through the EXISTING
 * engine reducer (no decisions — the "do nothing different" stress):
 *   demand  ~ U(0.70, 1.30) on params.baseDailyDemand
 *   cost    ~ U(0.90, 1.25) on params.unitCost
 *   collect ~ U(0.60, 1.10) on params.collectionRatePerDay (receivable delay)
 *
 * The engine keeps `stocks.equity` static and its solvency guardrail pins cash
 * via emergency borrowing, so this module computes NET WORTH itself each month:
 *   netWorth = cash + receivables + inventoryUnits × unitCost − debt
 *
 * Randomness: EXCLUSIVELY the engine's mulberry32 (`rngNext`) chained from the
 * caller's seed — same seed → bit-identical results. No Date.now(), no Math.random().
 *
 * Insolvency definition: final NET WORTH < 0 (emergency-credit draws are
 * reported separately via flags.emergencyCreditPct).
 */

export interface StressOptions {
  seed: number;
  iterations: number;     // >= 500 enforced by the service
  horizonMonths: number;  // 1..24
}

export interface StressPercentiles {
  month: number;          // 1-based month index
  cashP10: number; cashP50: number; cashP90: number;
  netWorthP10: number; netWorthP50: number; netWorthP90: number;
}

export interface StressFactorBreakdown {
  factor: 'demand' | 'cost' | 'collection';
  variedPct: number;      // share of final-equity variance attributed (r², normalised)
}

export interface StressResult {
  iterations: number;
  horizonMonths: number;
  seed: number;
  trajectory: StressPercentiles[];
  flags: {
    insolvencyProbabilityPct: number;
    minCashMonthP50: number;        // month where the P50 cash trajectory bottoms
    emergencyCreditPct: number;     // share of iterations that drew emergency credit
  };
  factorBreakdown: StressFactorBreakdown[];
  recommendations: string[];
  calendarSuggestions: Array<{ month: number; title: string }>;
}

interface IterationOutcome {
  factors: { demand: number; cost: number; collect: number };
  cashByMonth: number[];
  netWorthByMonth: number[];
  finalNetWorth: number;
  emergencyCredit: boolean;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const frac = idx - lo;
  return sorted[lo] + (sorted[hi] - sorted[lo]) * frac;
}

function uniform(rngState: number, lo: number, hi: number): { value: number; state: number } {
  const r = rngNext(rngState);
  return { value: lo + r.value * (hi - lo), state: r.state };
}

/** Pearson r² between a factor vector and outcomes, share-normalised across factors. */
function varianceShares(outcomes: IterationOutcome[]): StressFactorBreakdown[] {
  const y = outcomes.map((o) => o.finalNetWorth);
  const meanY = y.reduce((a, b) => a + b, 0) / y.length;
  const sdY = Math.sqrt(y.reduce((a, b) => a + (b - meanY) ** 2, 0) / y.length) || 1;
  const r2 = (xs: number[]): number => {
    const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
    const sdX = Math.sqrt(xs.reduce((a, b) => a + (b - meanX) ** 2, 0) / xs.length) || 1;
    const cov = xs.reduce((a, x, i) => a + (x - meanX) * (y[i] - meanY), 0) / xs.length;
    const r = cov / (sdX * sdY);
    return r * r;
  };
  const raw: Array<[StressFactorBreakdown['factor'], number]> = [
    ['demand', r2(outcomes.map((o) => o.factors.demand))],
    ['cost', r2(outcomes.map((o) => o.factors.cost))],
    ['collection', r2(outcomes.map((o) => o.factors.collect))],
  ];
  const sum = raw.reduce((a, [, v]) => a + v, 0) || 1;
  return raw
    .map(([factor, v]) => ({ factor, variedPct: Math.round((v / sum) * 1000) / 10 }))
    .sort((a, b) => b.variedPct - a.variedPct);
}

export function runStress(baseline: SimV2StateData, opts: StressOptions): StressResult {
  const { seed, iterations, horizonMonths } = opts;
  let rngState = seed >>> 0;
  const outcomes: IterationOutcome[] = [];

  for (let i = 0; i < iterations; i++) {
    // Perturbation factors from the engine RNG chain (deterministic per seed).
    const d = uniform(rngState, 0.7, 1.3); rngState = d.state;
    const c = uniform(rngState, 0.9, 1.25); rngState = c.state;
    const k = uniform(rngState, 0.6, 1.1); rngState = k.state;
    // Per-iteration engine seed also from the chain — never Date.now().
    const s = rngNext(rngState); rngState = s.state;

    const state: SimV2StateData = JSON.parse(JSON.stringify(baseline));
    state.rngState = Math.floor(s.value * 0xffffffff) >>> 0;
    state.params.baseDailyDemand = Math.max(1, state.params.baseDailyDemand * d.value);
    state.params.unitCost = state.params.unitCost * c.value;
    state.params.collectionRatePerDay = Math.min(1, Math.max(0.005, state.params.collectionRatePerDay * k.value));

    const cashByMonth: number[] = [];
    const netWorthByMonth: number[] = [];
    let emergencyCredit = false;
    let cur = state;
    for (let m = 0; m < horizonMonths; m++) {
      const res = applyTick(cur, [], 'month');
      cur = res.state;
      cashByMonth.push(cur.stocks.cash);
      const st: any = cur.stocks;
      const netWorth =
        st.cash + (st.receivables ?? 0) + (st.inventoryUnits ?? 0) * cur.params.unitCost - (st.debt ?? 0);
      netWorthByMonth.push(netWorth);
      if (res.log.some((l) => l.kind === 'guardrail')) emergencyCredit = true;
    }
    outcomes.push({
      factors: { demand: d.value, cost: c.value, collect: k.value },
      cashByMonth,
      netWorthByMonth,
      finalNetWorth: netWorthByMonth[netWorthByMonth.length - 1],
      emergencyCredit,
    });
  }

  // Percentile trajectories (per-month sort → P10 ≤ P50 ≤ P90 by construction).
  const trajectory: StressPercentiles[] = [];
  for (let m = 0; m < horizonMonths; m++) {
    const cash = outcomes.map((o) => o.cashByMonth[m]).sort((a, b) => a - b);
    const nw = outcomes.map((o) => o.netWorthByMonth[m]).sort((a, b) => a - b);
    trajectory.push({
      month: m + 1,
      cashP10: Math.round(percentile(cash, 0.1)),
      cashP50: Math.round(percentile(cash, 0.5)),
      cashP90: Math.round(percentile(cash, 0.9)),
      netWorthP10: Math.round(percentile(nw, 0.1)),
      netWorthP50: Math.round(percentile(nw, 0.5)),
      netWorthP90: Math.round(percentile(nw, 0.9)),
    });
  }

  const insolvent = outcomes.filter((o) => o.finalNetWorth < 0).length;
  const emergency = outcomes.filter((o) => o.emergencyCredit).length;
  const p50Cash = trajectory.map((t) => t.cashP50);
  const minCashMonth = p50Cash.indexOf(Math.min(...p50Cash)) + 1;
  const factorBreakdown = varianceShares(outcomes);

  const insolvencyPct = Math.round((insolvent / iterations) * 1000) / 10;
  const emergencyPct = Math.round((emergency / iterations) * 1000) / 10;

  // Plain-language, rule-based recommendations (deterministic).
  const recommendations: string[] = [];
  const calendarSuggestions: Array<{ month: number; title: string }> = [];
  if (insolvencyPct >= 20) {
    recommendations.push(
      `Insolvency risk is material (${insolvencyPct}% of scenarios). Secure a credit line or defer discretionary capex before month ${minCashMonth}.`,
    );
    calendarSuggestions.push({ month: Math.max(1, minCashMonth - 1), title: 'Review liquidity buffer / credit line (stress-test flag)' });
  }
  const dominant = factorBreakdown[0];
  if (dominant.factor === 'demand') {
    recommendations.push('Demand swings dominate the downside — diversify the client base or add a retainer revenue layer.');
  } else if (dominant.factor === 'cost') {
    recommendations.push('Unit-cost inflation dominates the downside — lock supplier framework prices for the horizon.');
  } else {
    recommendations.push('Receivable collection dominates the downside — tighten payment terms (reduce DSO) or factor receivables.');
    calendarSuggestions.push({ month: Math.max(1, minCashMonth - 1), title: 'DSO review: chase receivables ahead of the projected cash trough' });
  }
  recommendations.push(
    `Cash trough lands in month ${minCashMonth} (P50). Hold a buffer of at least the P10-P50 gap at that point.`,
  );
  calendarSuggestions.push({ month: minCashMonth, title: 'Projected cash trough (stress P50) — monitor closely' });

  return {
    iterations,
    horizonMonths,
    seed,
    trajectory,
    flags: {
      insolvencyProbabilityPct: insolvencyPct,
      minCashMonthP50: minCashMonth,
      emergencyCreditPct: emergencyPct,
    },
    factorBreakdown,
    recommendations,
    calendarSuggestions,
  };
}
