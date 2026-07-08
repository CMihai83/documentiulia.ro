/**
 * BC-204 — debt schedule + coverage (research 02 §A3 financing). Pure & deterministic.
 *
 * Conventions:
 * - monthlyRate = annualRatePct / 100 / 12 (nominal, Excel PMT semantics).
 * - Drawdown happens at period 0 (alongside capex); periods 1..tenor service the loan.
 * - `grace` months pay INTEREST ONLY at the start of the schedule (all shapes).
 * - Shapes:
 *   · amortizing    — level annuity over (tenor − grace) after the grace window.
 *   · interest_only — interest every month, full principal bullet at maturity.
 *   · balloon       — (amount − balloon) amortizes as a level annuity after grace,
 *                     balloon (balloonPct of amount, default 30%) due at maturity.
 * - Rounding: internal math at full precision; rows are rounded to cents and the
 *   FINAL period's principal absorbs the residue so Σprincipal == amount exactly.
 *
 * Coverage: DSCR_t = CFADS_t / (interest_t + principal_t); interestCover_t =
 * CFADS_t / interest_t. `minDscr < 1.0` raises a warning (spec-asserted).
 */

export type DebtShape = 'amortizing' | 'interest_only' | 'balloon';

export interface DebtInputs {
  amount: number;
  annualRatePct: number;
  tenorMonths: number;
  shape: DebtShape;
  graceMonths?: number;   // interest-only window at the start (< tenor)
  balloonPct?: number;    // balloon only; % of amount due at maturity (default 30)
}

export interface DebtRow {
  period: number;    // 1..tenor
  opening: number;
  interest: number;
  principal: number;
  payment: number;
  closing: number;
}

export interface DebtSchedule {
  rows: DebtRow[];
  totalInterest: number;
  totalPrincipal: number; // == amount to the cent
  monthlyRate: number;
}

export interface CoverageRow {
  period: number;
  cfads: number;
  debtService: number;
  dscr: number | null;          // null when no debt service that period
  interestCover: number | null;
}

export interface CoverageResult {
  rows: CoverageRow[];
  minDscr: number | null;
  dscrBelowOne: boolean; // warning flag
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
const num = (v: any, d = 0): number => (Number.isFinite(Number(v)) ? Number(v) : d);

/** Level-annuity payment for `principal` over `n` periods at `r` per period. */
export function annuityPayment(principal: number, r: number, n: number): number {
  if (n <= 0) return 0;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

export function buildDebtSchedule(inputs: DebtInputs): DebtSchedule {
  const amount = num(inputs.amount);
  const tenor = Math.max(1, Math.round(num(inputs.tenorMonths)));
  const grace = Math.min(Math.max(0, Math.round(num(inputs.graceMonths))), tenor - 1);
  const r = num(inputs.annualRatePct) / 100 / 12;
  const shape: DebtShape = inputs.shape ?? 'amortizing';
  const balloon =
    shape === 'balloon' ? amount * (num(inputs.balloonPct, 30) / 100) : 0;

  const amortMonths = tenor - grace;
  const amortPrincipal = shape === 'interest_only' ? 0 : amount - balloon;
  const pay = shape === 'interest_only' ? 0 : annuityPayment(amortPrincipal, r, amortMonths);

  const rows: DebtRow[] = [];
  let opening = amount;
  let principalPaid = 0;
  for (let p = 1; p <= tenor; p++) {
    const interest = opening * r;
    let principal = 0;
    if (p > grace) {
      if (shape === 'interest_only') {
        principal = p === tenor ? opening : 0;
      } else {
        // annuity on the amortizing tranche; the balloon stays outstanding
        principal = Math.min(pay - interest, opening - balloon);
        if (p === tenor) principal = opening; // final period clears everything (incl. balloon)
      }
    }
    const closing = opening - principal;
    rows.push({
      period: p,
      opening: round2(opening),
      interest: round2(interest),
      principal: round2(principal),
      payment: round2(interest + principal),
      closing: round2(closing),
    });
    principalPaid += rows[rows.length - 1].principal;
    opening = closing;
  }
  // Residue absorption: force Σprincipal == amount to the cent via the final row.
  const residue = round2(amount - principalPaid);
  if (residue !== 0 && rows.length > 0) {
    const last = rows[rows.length - 1];
    last.principal = round2(last.principal + residue);
    last.payment = round2(last.interest + last.principal);
    last.closing = 0;
  }
  return {
    rows,
    totalInterest: round2(rows.reduce((a, x) => a + x.interest, 0)),
    totalPrincipal: round2(rows.reduce((a, x) => a + x.principal, 0)),
    monthlyRate: r,
  };
}

/** DSCR / interest cover per period against a CFADS series aligned to periods 1..N. */
export function coverage(schedule: DebtSchedule, cfads: number[]): CoverageResult {
  const rows: CoverageRow[] = schedule.rows.map((d) => {
    const c = num(cfads[d.period - 1]);
    const service = d.interest + d.principal;
    return {
      period: d.period,
      cfads: round2(c),
      debtService: round2(service),
      dscr: service > 0 ? Math.round((c / service) * 10000) / 10000 : null,
      interestCover: d.interest > 0 ? Math.round((c / d.interest) * 10000) / 10000 : null,
    };
  });
  const dscrs = rows.map((r) => r.dscr).filter((x): x is number => x !== null);
  const minDscr = dscrs.length ? Math.min(...dscrs) : null;
  return { rows, minDscr, dscrBelowOne: minDscr !== null && minDscr < 1.0 };
}
