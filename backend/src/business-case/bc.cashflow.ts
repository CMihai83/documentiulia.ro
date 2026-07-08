/**
 * BC-201 — FCFF/FCFE monthly cash-flow builder (+ BC-203 terminal value).
 * Pure & deterministic; conventions documented so an Excel rebuild matches to
 * the cent (research 02 §A3):
 *
 * - Period 0 = today: capex0 outlay and the debt drawdown. Operating months 1..N (N ≤ 60).
 * - Revenue: annual year-1 revenue grows at `revenueGrowthPct` per YEAR and is
 *   spread EVENLY across that year's 12 months (annual ÷ 12).
 * - P&L: EBITDA = revenue − COGS(revenue × cogsPct) − opexMonthly;
 *   EBIT = EBITDA − daMonthly; tax = EBIT × taxRatePct (SYMMETRIC — negative
 *   EBIT produces a tax credit, the plain teaching form of the FCFF formula);
 *   NOPAT = EBIT − tax.
 * - FCFF_t = NOPAT + D&A − capex_t − ΔNWC_t          (discount at WACC)
 * - FCFE_t = FCFF_t − interest_t×(1−tax) − principal_t (+ drawdown at period 0)
 *                                                     (discount at cost of equity)
 * - Annual rollups sum operating months per project year; year 0 kept separate.
 * - Extended NPV/TV work on the ANNUAL FCFF vector at the annual discount rate.
 *
 * BC-203 terminal value:
 * - gordon: TV = FCFF_lastYear × (1+g) / (r − g), g < r enforced (TvValidationError).
 * - exit_multiple: TV = multiple × EBITDA_lastYear (annual).
 * - PV(TV) = TV / (1+r)^N; results expose npvWithTv AND npvWithoutTv separately.
 */
import { resolveDiscountRate } from './bc.finance';
import { npv as npvOf, CashflowRow } from './bc.model';
import { buildDebtSchedule, coverage, DebtSchedule, CoverageResult, DebtShape } from './bc.debt';
import { buildWorkingCapital, WorkingCapitalRow } from './bc.workingcapital';

export class TvValidationError extends Error {}

export interface MonthlyRow {
  month: number;      // 0 = today (capex/drawdown), 1..N operating
  revenue: number;
  cogs: number;
  opex: number;
  ebitda: number;
  da: number;
  ebit: number;
  tax: number;
  nopat: number;
  capex: number;
  deltaNwc: number;
  fcff: number;
  interest: number;
  principal: number;
  newDebt: number;
  fcfe: number;
}

export interface AnnualRow {
  year: number;       // 0 = today; 1..Y operating years
  revenue: number; ebitda: number; ebit: number;
  capex: number; deltaNwc: number;
  fcff: number; fcfe: number;
  interest: number; principal: number;
}

export interface TerminalValueResult {
  method: 'gordon' | 'exit_multiple';
  tv: number;          // undiscounted, at end of year N
  pvTv: number;        // discounted to today
  npvWithoutTv: number;
  npvWithTv: number;
}

export interface ExtendedModel {
  months: MonthlyRow[];
  annual: AnnualRow[];
  workingCapital: WorkingCapitalRow[];
  debtSchedule: DebtSchedule | null;
  coverage: CoverageResult | null;   // DSCR on FCFF as CFADS
  dscrWarning: boolean;
  fcffNpv: number;                   // NPV of annual FCFF at the resolved rate (no TV)
  terminalValue: TerminalValueResult | null;
  discountRate: number;
  notes: string[];
}

const num = (v: any, d = 0): number => (Number.isFinite(Number(v)) ? Number(v) : d);
const round2 = (n: number): number => Math.round(n * 100) / 100;

/** True when the assumption set carries the extended monthly P&L drivers. */
export function hasExtendedDrivers(answers: Record<string, any>): boolean {
  return num(answers['economic.pnl.revenueYear1']) > 0;
}

/** Build the full extended model from a stored assumption set (null-safe wrapper in the service). */
export function buildExtendedModel(answers: Record<string, any>): ExtendedModel {
  const { rate } = resolveDiscountRate(answers);
  const notes: string[] = [];

  const years = Math.max(1, Math.round(num(answers['strategic.horizonYears'], 1)));
  const nMonths = Math.min(60, years * 12);
  if (years * 12 > 60) notes.push('Horizon capped at 60 monthly periods (5 years) for the monthly model.');

  const revenueYear1 = num(answers['economic.pnl.revenueYear1']);
  const growth = num(answers['economic.pnl.revenueGrowthPct']) / 100;
  const cogsPct = num(answers['economic.pnl.cogsPct']) / 100;
  const opexM = num(answers['economic.pnl.opexMonthly']);
  const daM = num(answers['economic.pnl.daMonthly']);
  const taxRate = num(answers['economic.pnl.taxRatePct'], 16) / 100; // RO profit tax default
  const capexM = num(answers['economic.pnl.capexMonthly']);
  const capex0 = num(answers['strategic.initialInvestment'] ?? answers['model.capex0']);

  // revenue / cogs series (operating months 1..N)
  const revenue: number[] = [];
  const cogs: number[] = [];
  for (let m = 1; m <= nMonths; m++) {
    const y = Math.ceil(m / 12);
    const annual = revenueYear1 * Math.pow(1 + growth, y - 1);
    const rev = annual / 12;
    revenue.push(rev);
    cogs.push(rev * cogsPct);
  }

  // BC-205 working capital
  const wc = buildWorkingCapital(revenue, cogs, {
    dsoDays: num(answers['economic.wc.dsoDays']),
    dpoDays: num(answers['economic.wc.dpoDays']),
    dioDays: num(answers['economic.wc.dioDays']),
    dsoTargetDays: answers['economic.wc.dsoTargetDays'] != null ? num(answers['economic.wc.dsoTargetDays']) : undefined,
    dpoTargetDays: answers['economic.wc.dpoTargetDays'] != null ? num(answers['economic.wc.dpoTargetDays']) : undefined,
    dioTargetDays: answers['economic.wc.dioTargetDays'] != null ? num(answers['economic.wc.dioTargetDays']) : undefined,
    improveMonths: num(answers['economic.wc.improveMonths'], 12),
  });

  // BC-204 debt
  const debtAmount = num(answers['economic.debt.amount']);
  const debt = debtAmount > 0
    ? buildDebtSchedule({
        amount: debtAmount,
        annualRatePct: num(answers['economic.debt.ratePct']),
        tenorMonths: Math.max(1, Math.round(num(answers['economic.debt.tenorMonths'], 12))),
        shape: (answers['economic.debt.shape'] as DebtShape) || 'amortizing',
        graceMonths: num(answers['economic.debt.graceMonths']),
        balloonPct: num(answers['economic.debt.balloonPct'], 30),
      })
    : null;

  // monthly rows
  const months: MonthlyRow[] = [];
  months.push({
    month: 0, revenue: 0, cogs: 0, opex: 0, ebitda: 0, da: 0, ebit: 0, tax: 0, nopat: 0,
    capex: round2(capex0), deltaNwc: 0,
    fcff: round2(-capex0),
    interest: 0, principal: 0, newDebt: round2(debtAmount),
    fcfe: round2(-capex0 + debtAmount),
  });
  // raw (unrounded) series — annual sums, NPV, TV and DSCR all use these so
  // per-cell display rounding never accumulates (Excel-cell semantics).
  const raw: Array<{ rev: number; cg: number; ebitda: number; ebit: number; tax: number; nopat: number;
    dNwc: number; interest: number; principal: number; fcff: number; fcfe: number }> = [];
  for (let m = 1; m <= nMonths; m++) {
    const rev = revenue[m - 1];
    const cg = cogs[m - 1];
    const ebitda = rev - cg - opexM;
    const ebit = ebitda - daM;
    const tax = ebit * taxRate; // symmetric (see header)
    const nopat = ebit - tax;
    const dNwc = wc[m - 1]?.deltaNwc ?? 0;
    const dRow = debt?.rows[m - 1]; // periods 1..tenor align with months
    const interest = dRow ? dRow.interest : 0;
    const principal = dRow ? dRow.principal : 0;
    const fcff = nopat + daM - capexM - dNwc;
    const fcfe = fcff - interest * (1 - taxRate) - principal;
    raw.push({ rev, cg, ebitda, ebit, tax, nopat, dNwc, interest, principal, fcff, fcfe });
    months.push({
      month: m,
      revenue: round2(rev), cogs: round2(cg), opex: round2(opexM),
      ebitda: round2(ebitda), da: round2(daM), ebit: round2(ebit),
      tax: round2(tax), nopat: round2(nopat),
      capex: round2(capexM), deltaNwc: round2(dNwc),
      fcff: round2(fcff),
      interest: round2(interest), principal: round2(principal), newDebt: 0,
      fcfe: round2(fcfe),
    });
  }

  // annual rollups
  const annual: AnnualRow[] = [{
    year: 0, revenue: 0, ebitda: 0, ebit: 0,
    capex: round2(capex0), deltaNwc: 0,
    fcff: round2(-capex0), fcfe: round2(-capex0 + debtAmount),
    interest: 0, principal: 0,
  }];
  const nYears = Math.ceil(nMonths / 12);
  const annualFcffRaw: number[] = [];
  for (let y = 1; y <= nYears; y++) {
    const slice = raw.slice((y - 1) * 12, y * 12);
    const sum = (f: (r: (typeof raw)[number]) => number) => slice.reduce((a, r) => a + f(r), 0);
    annualFcffRaw.push(sum((r) => r.fcff));
    annual.push({
      year: y,
      revenue: round2(sum((r) => r.rev)), ebitda: round2(sum((r) => r.ebitda)), ebit: round2(sum((r) => r.ebit)),
      capex: round2(capexM * slice.length), deltaNwc: round2(sum((r) => r.dNwc)),
      fcff: round2(sum((r) => r.fcff)), fcfe: round2(sum((r) => r.fcfe)),
      interest: round2(sum((r) => r.interest)), principal: round2(sum((r) => r.principal)),
    });
  }

  // DSCR coverage: CFADS = monthly FCFF over the debt tenor
  const cov = debt ? coverage(debt, raw.map((r) => r.fcff)) : null;

  // extended NPV on annual FCFF (year 0..N) at the annual rate
  const fcffRows: CashflowRow[] = [
    { year: 0, capex: 0, benefit: 0, opex: 0, net: -capex0 },
    ...annualFcffRaw.map((net, i) => ({ year: i + 1, capex: 0, benefit: 0, opex: 0, net })),
  ];
  const fcffNpv = round2(npvOf(rate, fcffRows));

  // BC-203 terminal value
  const method = answers['economic.tv.method'];
  let tvRes: TerminalValueResult | null = null;
  if (method === 'gordon' || method === 'exit_multiple') {
    const lastYearIdx = annualFcffRaw.length; // year N
    const lastFcffRaw = annualFcffRaw[annualFcffRaw.length - 1] ?? 0;
    const lastEbitdaRaw = raw.slice((lastYearIdx - 1) * 12, lastYearIdx * 12).reduce((a, r) => a + r.ebitda, 0);
    let tv: number;
    if (method === 'gordon') {
      const g = num(answers['economic.tv.growthPct']) / 100;
      if (g >= rate) {
        throw new TvValidationError(
          `Terminal-value growth (${(g * 100).toFixed(1)}%) must be BELOW the discount rate (${(rate * 100).toFixed(1)}%).`,
        );
      }
      tv = (lastFcffRaw * (1 + g)) / (rate - g);
    } else {
      tv = num(answers['economic.tv.exitMultiple']) * lastEbitdaRaw;
    }
    const pvTv = tv / Math.pow(1 + rate, lastYearIdx);
    tvRes = {
      method,
      tv: round2(tv),
      pvTv: round2(pvTv),
      npvWithoutTv: fcffNpv,
      npvWithTv: round2(fcffNpv + pvTv),
    };
  }

  return {
    months, annual, workingCapital: wc,
    debtSchedule: debt, coverage: cov,
    dscrWarning: cov?.dscrBelowOne ?? false,
    fcffNpv, terminalValue: tvRes,
    discountRate: rate, notes,
  };
}
