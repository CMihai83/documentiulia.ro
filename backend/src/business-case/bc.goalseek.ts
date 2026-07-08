import { appraise, AppraisalResult } from './bc.model';

/**
 * BC-208 — break-even & goal-seek (pure, deterministic).
 *
 * Goal-seek reverse-solves ONE driver for a target NPV or IRR by bisection on a
 * multiplier (price/volume/capex) or on the absolute rate (discountRate).
 * Driver semantics on the stored answer set:
 *  - price:  scales every year's benefit (revenue price effect, costs fixed)
 *  - volume: scales every year's benefit AND opex proportionally
 *  - capex:  scales strategic.initialInvestment
 *  - discountRate: absolute rate in [0.1%, 60%] (hurdle override)
 *
 * Convergence: relative 0.1% on the target (absolute 1e-4 for IRR targets and
 * near-zero NPV targets); hard cap of 200 iterations — never hangs.
 */

export type GoalDriver = 'price' | 'volume' | 'capex' | 'discountRate';
export type GoalMetric = 'npv' | 'irr';

export interface GoalSeekResult {
  solution: number | null;      // multiplier (price/volume/capex) or absolute rate
  changePct: number | null;     // human delta: (multiplier − 1) × 100, or rate − base rate in pp
  reason?: string;              // set when solution is null
  achieved?: number;            // metric value at the solution
  message?: string;             // "price must change by −16.31% to reach NPV 0"
  iterations?: number;
}

const MAX_ITER = 200;
const MULT_LO = 0.01;
const MULT_HI = 10;

function applyDriver(answers: Record<string, any>, driver: GoalDriver, x: number): Record<string, any> {
  const a: Record<string, any> = JSON.parse(JSON.stringify(answers));
  const rows: Array<{ benefit: number; opex: number }> = Array.isArray(a['economic.cashflows'])
    ? a['economic.cashflows'] : [];
  if (driver === 'price') {
    a['economic.cashflows'] = rows.map((r) => ({ ...r, benefit: Number(r.benefit ?? 0) * x }));
  } else if (driver === 'volume') {
    a['economic.cashflows'] = rows.map((r) => ({
      ...r, benefit: Number(r.benefit ?? 0) * x, opex: Number(r.opex ?? 0) * x,
    }));
  } else if (driver === 'capex') {
    a['strategic.initialInvestment'] = Number(a['strategic.initialInvestment'] ?? 0) * x;
  } else {
    // absolute discount rate: force hurdle mode
    a['wacc.mode'] = 'hurdle';
    a['wacc.hurdle'] = x * 100; // DSL stores whole percent
  }
  return a;
}

function metricAt(answers: Record<string, any>, driver: GoalDriver, x: number, metric: GoalMetric): number | null {
  const appr: AppraisalResult = appraise(applyDriver(answers, driver, x));
  return metric === 'npv' ? appr.npv : appr.irr;
}

export function goalSeek(
  answers: Record<string, any>,
  driver: GoalDriver,
  metric: GoalMetric,
  target: number,
): GoalSeekResult {
  const isRate = driver === 'discountRate';
  let lo = isRate ? 0.001 : MULT_LO;
  let hi = isRate ? 0.6 : MULT_HI;

  const f = (x: number): number | null => {
    const v = metricAt(answers, driver, x, metric);
    return v === null ? null : v - target;
  };

  // Coarse grid scan first: IRR can be undefined over part of the interval
  // (e.g. tiny price multipliers make every cashflow negative), so find a
  // bracket with DEFINED values and a sign change before bisecting.
  const GRID = 32;
  let bracket: { lo: number; fLo: number; hi: number; fHi: number } | null = null;
  let prevX: number | null = null;
  let prevF: number | null = null;
  for (let g = 0; g <= GRID; g++) {
    const x = lo + ((hi - lo) * g) / GRID;
    const fx = f(x);
    if (fx === null) { prevX = null; prevF = null; continue; }
    if (prevF !== null && prevX !== null && prevF * fx <= 0) {
      bracket = { lo: prevX, fLo: prevF, hi: x, fHi: fx };
      break;
    }
    prevX = x; prevF = fx;
  }
  if (!bracket) {
    return {
      solution: null, changePct: null,
      reason: `Target ${metric.toUpperCase()} ${target} is not reachable by varying ${driver} within ` +
        (isRate ? '0.1%–60%' : `${MULT_LO}×–${MULT_HI}×`) + ' (no sign change with a defined metric).',
    };
  }
  lo = bracket.lo; hi = bracket.hi;
  let fLo: number | null = bracket.fLo;
  let fHi: number | null = bracket.fHi;

  const tol = metric === 'irr' || Math.abs(target) < 1 ? 1e-4 : Math.abs(target) * 0.001;
  let mid = lo, fMid: number | null = fLo, i = 0;
  for (; i < MAX_ITER; i++) {
    mid = (lo + hi) / 2;
    fMid = f(mid);
    if (fMid === null) {
      // IRR vanished mid-interval — shrink toward the side that had a value
      hi = mid; fHi = fHi ?? 0; continue;
    }
    if (Math.abs(fMid) <= tol) break;
    if (fLo! * fMid < 0) { hi = mid; fHi = fMid; } else { lo = mid; fLo = fMid; }
  }
  if (fMid === null || Math.abs(fMid) > Math.max(tol, 1e-9) * 10) {
    return { solution: null, changePct: null, reason: 'Bisection did not converge within 200 iterations.', iterations: i };
  }

  const base = isRate ? (appraise(answers).discountRate) : 1;
  const changePct = isRate ? Number(((mid - base) * 100).toFixed(2)) : Number(((mid - 1) * 100).toFixed(2));
  const achieved = fMid + target;
  const metricLabel = metric === 'irr' ? `IRR ${(target * 100).toFixed(1)}%` : `NPV ${target}`;
  const message = isRate
    ? `discount rate of ${(mid * 100).toFixed(2)}% reaches ${metricLabel}`
    : `${driver} must change by ${changePct >= 0 ? '+' : ''}${changePct}% to reach ${metricLabel}`;
  return {
    solution: Number(mid.toFixed(6)),
    changePct,
    achieved: Number(achieved.toFixed(metric === 'irr' ? 6 : 2)),
    message,
    iterations: i,
  };
}

// ---------------------------------------------------------------------------
// Break-even (BC-208)
// ---------------------------------------------------------------------------

export interface BreakEvenResult {
  /** Accounting: units/month where contribution covers fixed costs (needs ue.* inputs). */
  accounting: { unitsPerMonth: number; revenuePerMonth: number } | null;
  /** Financial: revenue (price) multiplier where NPV = 0, from the appraisal model. */
  financial: { priceMultiplier: number; changePct: number; message: string } | null;
}

const num = (v: any, d = 0): number => (Number.isFinite(Number(v)) ? Number(v) : d);

export function breakEven(answers: Record<string, any>): BreakEvenResult {
  // Accounting break-even from the optional unit-economics inputs
  const price = num(answers['ue.pricePerUnit']);
  const varCost = num(answers['ue.variableCostPerUnit']);
  const fixed = num(answers['ue.fixedCostsMonthly']);
  let accounting: BreakEvenResult['accounting'] = null;
  const contribution = price - varCost;
  if (fixed > 0 && contribution > 0) {
    const units = fixed / contribution;
    accounting = {
      unitsPerMonth: Number(units.toFixed(2)),
      revenuePerMonth: Number((units * price).toFixed(2)),
    };
  }

  // Financial break-even: price multiplier for NPV = 0
  let financial: BreakEvenResult['financial'] = null;
  const gs = goalSeek(answers, 'price', 'npv', 0);
  if (gs.solution !== null) {
    financial = {
      priceMultiplier: gs.solution,
      changePct: gs.changePct as number,
      message: gs.message as string,
    };
  }
  return { accounting, financial };
}
