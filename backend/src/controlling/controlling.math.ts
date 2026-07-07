/**
 * Pure, dependency-free management-accounting math for the Controlling module.
 * Extracted so it can be unit-tested to the cent without a database (DOC-42-2).
 */

export type VarianceStatus = 'favorable' | 'on_track' | 'warning' | 'critical';

/** Round to 2 decimals (money). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * RAG status for a cost figure. For costs, actual under plan is favorable.
 * warnPct / critPct are the % over budget that trip warning / critical.
 */
export function varianceStatus(
  planned: number,
  actual: number,
  warnPct = 5,
  critPct = 15,
): VarianceStatus {
  if (planned <= 0) return actual <= 0 ? 'on_track' : 'critical';
  const overPct = ((actual - planned) / planned) * 100;
  if (overPct <= 0) return 'favorable';
  if (overPct <= warnPct) return 'on_track';
  if (overPct <= critPct) return 'warning';
  return 'critical';
}

/** Variance amount (positive = under budget) and its percent of plan. */
export function variance(planned: number, actual: number): { amount: number; percent: number } {
  const amount = round2(planned - actual);
  return { amount, percent: planned ? round2((amount / planned) * 100) : 0 };
}

/** CO-PA contribution margin for a profitability segment. */
export function contributionMargin(seg: {
  revenue: number;
  cogs: number;
  directCosts: number;
  allocatedFixedCosts: number;
}): {
  variableCosts: number;
  contributionMargin1: number;
  cm1Percent: number;
  operatingResult: number;
  operatingMarginPercent: number;
} {
  const variableCosts = seg.cogs + seg.directCosts;
  const cm1 = seg.revenue - variableCosts;
  const operatingResult = cm1 - seg.allocatedFixedCosts;
  return {
    variableCosts: round2(variableCosts),
    contributionMargin1: round2(cm1),
    cm1Percent: seg.revenue ? round2((cm1 / seg.revenue) * 100) : 0,
    operatingResult: round2(operatingResult),
    operatingMarginPercent: seg.revenue ? round2((operatingResult / seg.revenue) * 100) : 0,
  };
}

/**
 * Normalize driver weights into shares that sum to exactly 1 (last share
 * absorbs rounding so the allocation never leaks or duplicates a cent).
 */
export function allocationShares(weights: number[]): number[] {
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) {
    // equal split fallback
    return weights.map(() => (weights.length ? 1 / weights.length : 0));
  }
  return weights.map((w) => w / total);
}

export type InternalOrderStatus = 'open' | 'released' | 'technically_closed' | 'closed';

const IO_TRANSITIONS: Record<InternalOrderStatus, InternalOrderStatus[]> = {
  open: ['released', 'closed'],
  released: ['technically_closed', 'closed'],
  technically_closed: ['closed'],
  closed: [],
};

/** Whether an internal order may move from `from` to `to` (same status = no-op). */
export function canTransitionInternalOrder(from: InternalOrderStatus, to: InternalOrderStatus): boolean {
  if (from === to) return true;
  return IO_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Split an amount across receivers by weight; receivers sum == amount (to the cent). */
export function allocateAmount(amount: number, weights: number[]): number[] {
  const shares = allocationShares(weights);
  const raw = shares.map((s) => round2(amount * s));
  // fix rounding drift on the largest receiver
  const drift = round2(amount - raw.reduce((s, v) => s + v, 0));
  if (drift !== 0 && raw.length) {
    let idx = 0;
    for (let i = 1; i < raw.length; i++) if (raw[i] > raw[idx]) idx = i;
    raw[idx] = round2(raw[idx] + drift);
  }
  return raw;
}
