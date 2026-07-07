/**
 * SIM-12 — composite run score (pure, deterministic; unit-tested).
 *
 * Scores a KPI basket, not profit alone (research 04 §4), so a run can't be gamed
 * by maximizing one number: profitability + solvency + growth + resilience +
 * compliance, each 0..100, averaged into a 0..100 composite.
 */
import { SimV2StateData } from './simv2.types';

export interface ScoreBreakdown {
  profitability: number;
  solvency: number;
  growth: number;
  resilience: number;
  compliance: number;
  composite: number;
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Compute the composite from the full per-tick history (first..last state). */
export function computeScore(states: SimV2StateData[]): ScoreBreakdown {
  if (!states.length) {
    return { profitability: 0, solvency: 0, growth: 0, resilience: 0, compliance: 0, composite: 0 };
  }
  const first = states[0];
  const last = states[states.length - 1];

  // Profitability — average operating margin (revenue vs cogs+opex) across the run.
  let marginSum = 0, marginN = 0;
  for (const s of states) {
    const rev = s.flows.revenue;
    if (rev > 0) { marginSum += (rev - s.flows.cogs - s.flows.opex) / rev; marginN += 1; }
  }
  const avgMargin = marginN ? marginSum / marginN : 0;
  const profitability = clamp(50 + avgMargin * 250); // 20% margin -> 100

  // Solvency — ended with positive cash & equity; penalise time spent cash-negative.
  const negTicks = states.filter((s) => s.stocks.cash < 0).length;
  const solvency = clamp(
    (last.stocks.cash > 0 ? 55 : 15) +
    (last.stocks.equity > 0 ? 30 : 0) -
    (negTicks / states.length) * 60 + 15,
  );

  // Growth — customer base + brand equity change vs start.
  const custGrow = first.stocks.customerBase > 0
    ? (last.stocks.customerBase - first.stocks.customerBase) / first.stocks.customerBase : 0;
  const brandGrow = first.stocks.brandEquity > 0
    ? (last.stocks.brandEquity - first.stocks.brandEquity) / first.stocks.brandEquity : 0;
  const growth = clamp(50 + (custGrow * 120) + (brandGrow * 80));

  // Resilience — survived downturns / events with equity intact; morale held up.
  const sawRecession = states.some((s) => s.cycle.phase === 'RECESSION' || s.cycle.phase === 'TROUGH');
  const avgMorale = states.reduce((a, s) => a + (s.aux.morale ?? 0), 0) / states.length;
  const resilience = clamp(
    (last.stocks.equity > 0 ? 45 : 10) +
    (sawRecession && last.stocks.equity > 0 ? 25 : 0) +
    avgMorale * 0.3,
  );

  // Compliance — proxy: no prolonged insolvency (guardrail breaches) during the run.
  const compliance = clamp(100 - (negTicks / states.length) * 100);

  const composite = round1((profitability + solvency + growth + resilience + compliance) / 5);
  return {
    profitability: round1(profitability),
    solvency: round1(solvency),
    growth: round1(growth),
    resilience: round1(resilience),
    compliance: round1(compliance),
    composite,
  };
}

/**
 * Behavioral badges (research 04 §4: reward the habit, not just the outcome).
 * Returns the catalog badge ids earned by this run's history.
 */
export function earnedBadges(states: SimV2StateData[]): string[] {
  if (!states.length) return [];
  const badges: string[] = [];
  const last = states[states.length - 1];

  // cash-buffer: held ≥ ~3 months (90 days) of opex in cash going into a downturn.
  const buffered = states.some((s, i) => {
    const next = states[i + 1];
    const enteringDownturn = next && next.cycle.phase !== s.cycle.phase &&
      (next.cycle.phase === 'RECESSION' || next.cycle.phase === 'PEAK');
    const runwayDays = s.flows.opex > 0 ? s.stocks.cash / s.flows.opex : Infinity;
    return enteringDownturn && runwayDays >= 90;
  });
  if (buffered) badges.push('sim-cash-buffer');

  // delegator: ≥3 DELEGATE decisions across the run log.
  const delegates = states.reduce(
    (n, s) => n + (s.lastTickLog?.filter((l: any) => l.kind === 'decision' && String(l.message ?? '').toUpperCase().includes('DELEGATE')).length ?? 0),
    0,
  );
  if (delegates >= 3) badges.push('sim-delegator');

  // survivor: run included a RECESSION phase and ended with positive equity.
  const sawRecession = states.some((s) => s.cycle.phase === 'RECESSION');
  if (sawRecession && last.stocks.equity > 0) badges.push('sim-survivor');

  return badges;
}
