/**
 * W1-5 — pass-through billing. Cost = runtime × rate-by-kind + platform fee.
 * Pure and deterministic; real metered charging waits on Stripe (the spentEur
 * ledger here is the placeholder that drives the budget cap). Rates are
 * INDICATIVE per-minute estimates, not live cloud prices.
 */

export type WorkspaceKind = 'dev_container' | 'vm' | 'gpu_pod';

/** Indicative EUR/minute compute rate by kind (pass-through basis). */
export const RATE_PER_MINUTE_EUR: Record<WorkspaceKind, number> = {
  dev_container: 0.002, // ~€0.12/h
  vm: 0.01, // ~€0.60/h
  gpu_pod: 0.03, // ~€1.80/h (indicative; live figure comes from RunPod at W-1.5)
};

export const PLATFORM_FEE_PCT = 15;

export interface BillingResult {
  computeEur: number;
  feeEur: number;
  totalEur: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Cost of a runtime window for a kind, including the platform fee. */
export function billRuntime(kind: WorkspaceKind, runtimeMinutes: number): BillingResult {
  const minutes = Math.max(0, runtimeMinutes);
  const rate = RATE_PER_MINUTE_EUR[kind] ?? RATE_PER_MINUTE_EUR.dev_container;
  const compute = round2(minutes * rate);
  const fee = round2(compute * (PLATFORM_FEE_PCT / 100));
  return { computeEur: compute, feeEur: fee, totalEur: round2(compute + fee) };
}

/** Minutes elapsed between two instants (never negative). */
export function minutesBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / 60000);
}

/** True when accumulated spend has reached/exceeded the cap. */
export function isOverBudget(spentEur: number, budgetCapEur: number): boolean {
  return spentEur >= budgetCapEur;
}

/** True when a workspace has been idle past its auto-stop window. */
export function isIdlePastAutoStop(lastActiveAt: Date, autoStopMinutes: number, now: Date): boolean {
  return minutesBetween(lastActiveAt, now) >= autoStopMinutes;
}
