/**
 * BC-104 — economic-case cashflow model. Pure & deterministic so the numbers a
 * user sees on screen match an exported spreadsheet to the cent (research 02 §A1).
 *
 * Cashflow convention: year 0 holds the initial capex as a negative net; years
 * 1..N hold (benefit − opex). Everything downstream (NPV/IRR/payback, the BC-105
 * sensitivity + Monte-Carlo, the BC-107 deliverable) consumes `buildCashflows`.
 */
import { resolveDiscountRate } from './bc.finance';

export interface CashflowRow {
  year: number;    // 0 = today (capex outlay)
  capex: number;   // outflow at year 0
  benefit: number;
  opex: number;
  net: number;     // benefit − opex − capex
}

export interface AppraisalResult {
  discountRate: number;
  discountMethod: 'capm' | 'hurdle';
  cashflows: CashflowRow[];
  npv: number;
  irr: number | null;
  multipleRoots: boolean;
  paybackYears: number | null;
  discountedPaybackYears: number | null;
  bcr: number;         // benefit-cost ratio: PV(inflows) / PV(outflows)
  roi: number;         // (Σ net years≥1 − capex0) / capex0
}

/** Percent answers are whole numbers (4 == 4%). */
const num = (v: any, d = 0): number => (Number.isFinite(Number(v)) ? Number(v) : d);

/**
 * Build the cashflow series from a stored assumption set. Reads
 * `strategic.initialInvestment` (capex0), `strategic.horizonYears`, and the
 * `economic.cashflows` driver-table ([{benefit,opex}] per year).
 */
export function buildCashflows(answers: Record<string, any>): CashflowRow[] {
  const capex0 = num(answers['strategic.initialInvestment'] ?? answers['model.capex0']);
  const years = Math.max(0, Math.round(num(answers['strategic.horizonYears'] ?? answers['model.years'])));
  const table: any[] = Array.isArray(answers['economic.cashflows']) ? answers['economic.cashflows'] : [];

  const rows: CashflowRow[] = [{ year: 0, capex: capex0, benefit: 0, opex: 0, net: -capex0 }];
  for (let y = 1; y <= years; y++) {
    const cell = table[y - 1] ?? {};
    const benefit = num(cell.benefit);
    const opex = num(cell.opex);
    rows.push({ year: y, capex: 0, benefit, opex, net: benefit - opex });
  }
  return rows;
}

/** Net present value at a decimal `rate`. */
export function npv(rate: number, cashflows: CashflowRow[]): number {
  return cashflows.reduce((acc, r) => acc + r.net / Math.pow(1 + rate, r.year), 0);
}

/**
 * Internal rate of return. Robust to the classic traps:
 *  - scans [-0.99, 10] for sign changes of NPV(rate),
 *  - bisects the FIRST bracket to a root,
 *  - flags `multipleRoots` when more than one sign change exists,
 *  - returns null (never throws) when NPV never crosses zero.
 */
export function irr(cashflows: CashflowRow[]): { irr: number | null; multipleRoots: boolean } {
  const f = (r: number) => npv(r, cashflows);
  const lo = -0.99, hi = 10, step = 0.01;
  const brackets: Array<[number, number]> = [];
  let prev = f(lo);
  for (let r = lo + step; r <= hi + 1e-9; r += step) {
    const cur = f(r);
    if (Number.isFinite(prev) && Number.isFinite(cur) && prev === 0) {
      brackets.push([r - step, r - step]);
    } else if (prev * cur < 0) {
      brackets.push([r - step, r]);
    }
    prev = cur;
  }
  if (brackets.length === 0) return { irr: null, multipleRoots: false };

  const [a0, b0] = brackets[0];
  let a = a0, b = b0, fa = f(a);
  for (let i = 0; i < 200; i++) {
    const m = (a + b) / 2;
    const fm = f(m);
    if (Math.abs(fm) < 1e-9 || (b - a) / 2 < 1e-10) return { irr: m, multipleRoots: brackets.length > 1 };
    if (fa * fm < 0) { b = m; } else { a = m; fa = fm; }
  }
  return { irr: (a + b) / 2, multipleRoots: brackets.length > 1 };
}

/** Simple (undiscounted) payback in fractional years, or null if never recovered. */
export function payback(cashflows: CashflowRow[]): number | null {
  return crossZero(cashflows.map((r) => r.net));
}

/** Discounted payback in fractional years at `rate`, or null. */
export function discountedPayback(rate: number, cashflows: CashflowRow[]): number | null {
  return crossZero(cashflows.map((r) => r.net / Math.pow(1 + rate, r.year)));
}

/** Year at which the running cumulative of `flows` first reaches ≥ 0 (fractional). */
function crossZero(flows: number[]): number | null {
  let cum = 0;
  for (let i = 0; i < flows.length; i++) {
    const before = cum;
    cum += flows[i];
    if (cum >= 0 && before < 0) {
      const frac = flows[i] === 0 ? 0 : -before / flows[i];
      return (i - 1) + frac; // year index i corresponds to project year i
    }
    if (cum >= 0 && i === 0) return 0;
  }
  return null;
}

/** Benefit-cost ratio: PV of inflows ÷ PV of outflows (>1 ⇒ value-creating). */
export function bcr(rate: number, cashflows: CashflowRow[]): number {
  let pvIn = 0, pvOut = 0;
  for (const r of cashflows) {
    const inflow = r.benefit;
    const outflow = r.opex + r.capex;
    pvIn += inflow / Math.pow(1 + rate, r.year);
    pvOut += outflow / Math.pow(1 + rate, r.year);
  }
  return pvOut === 0 ? Infinity : pvIn / pvOut;
}

/** Undiscounted return on investment: (Σ net for years≥1 − capex0) / capex0. */
export function roi(cashflows: CashflowRow[]): number {
  const capex0 = cashflows.find((r) => r.year === 0)?.capex ?? 0;
  const netAfter = cashflows.filter((r) => r.year >= 1).reduce((a, r) => a + r.net, 0);
  return capex0 === 0 ? Infinity : (netAfter - capex0) / capex0;
}

/** One-shot appraisal: resolves the discount rate and computes every metric. */
export function appraise(answers: Record<string, any>): AppraisalResult {
  const { rate, method } = resolveDiscountRate(answers);
  const cashflows = buildCashflows(answers);
  const irrRes = irr(cashflows);
  return {
    discountRate: rate,
    discountMethod: method,
    cashflows,
    npv: round(npv(rate, cashflows)),
    irr: irrRes.irr === null ? null : round(irrRes.irr, 6),
    multipleRoots: irrRes.multipleRoots,
    paybackYears: roundN(payback(cashflows)),
    discountedPaybackYears: roundN(discountedPayback(rate, cashflows)),
    bcr: round(bcr(rate, cashflows), 4),
    roi: round(roi(cashflows), 4),
  };
}

const round = (n: number, dp = 4): number => (Number.isFinite(n) ? Number(n.toFixed(dp)) : n);
const roundN = (n: number | null, dp = 4): number | null => (n === null ? null : round(n, dp));

/**
 * BC-202 — MIRR with Excel MIRR() semantics: negative flows discounted to t0 at
 * `financeRate`, positive flows compounded to t_n at `reinvestRate`;
 * MIRR = (FV⁺ / −PV⁻)^(1/n) − 1 where n = last period index.
 * Returns null (like Excel's #DIV/0!) when either sign is absent.
 */
export function mirr(cashflows: CashflowRow[], financeRate: number, reinvestRate: number): number | null {
  if (cashflows.length < 2) return null;
  const n = cashflows[cashflows.length - 1].year;
  let fvPos = 0, pvNeg = 0;
  for (const r of cashflows) {
    if (r.net > 0) fvPos += r.net * Math.pow(1 + reinvestRate, n - r.year);
    else if (r.net < 0) pvNeg += r.net / Math.pow(1 + financeRate, r.year);
  }
  if (fvPos === 0 || pvNeg === 0 || n === 0) return null;
  return Math.pow(fvPos / -pvNeg, 1 / n) - 1;
}

/**
 * BC-202 — equivalent annual cost/value: spreads an NPV over `years` as a level
 * annuity at `rate` (Excel PMT(rate, years, −npv)). rate 0 ⇒ npv / years.
 */
export function eac(npvValue: number, rate: number, years: number): number {
  if (years <= 0) return npvValue;
  if (rate === 0) return npvValue / years;
  return (npvValue * rate) / (1 - Math.pow(1 + rate, -years));
}
