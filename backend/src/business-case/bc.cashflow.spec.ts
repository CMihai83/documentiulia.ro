import { buildExtendedModel, hasExtendedDrivers, TvValidationError } from './bc.cashflow';
import { mirr, eac, CashflowRow } from './bc.model';

/**
 * BC-201 committed reference vector (hand math, 30-day-month + even-spread conventions):
 *   revenueYear1 = 1,200,000 (→ 100,000/mo), growth 12%/yr, COGS 40%,
 *   opex 30,000/mo, D&A 5,000/mo, tax 16%, capex0 300,000,
 *   debt 300,000 @ 12%/24mo amortizing (PMT = 14,122.041667 — decimal-verified),
 *   WC: DSO 60 / DPO 30 / DIO 45.
 *
 *   Month 1: EBITDA = 100,000−40,000−30,000 = 30,000; EBIT = 25,000;
 *     tax = 4,000; NOPAT = 21,000; ΔNWC = 220,000 (AR 200,000 + INV 60,000 − AP 40,000)
 *     FCFF₁ = 21,000 + 5,000 − 0 − 220,000 = −194,000.00
 *     FCFE₁ = −194,000 − 3,000×0.84 − 11,122.04 = −207,642.04
 *   Month 2 (steady): ΔNWC = 0 → FCFF₂ = 26,000.00
 *   Month 13 (year 2: revenue 112,000/mo): EBITDA 37,200; EBIT 32,200; tax 5,152;
 *     NOPAT 27,048; NWC 246,400 → ΔNWC 26,400 → FCFF₁₃ = 27,048 + 5,000 − 26,400 = 5,648.00
 *   Period 0: FCFF₀ = −300,000; FCFE₀ = −300,000 + 300,000 = 0
 */
const ANSWERS: Record<string, any> = {
  'strategic.horizonYears': 2,
  'strategic.initialInvestment': 300_000,
  'wacc.mode': 'hurdle', 'wacc.hurdle': 10,
  'economic.pnl.revenueYear1': 1_200_000,
  'economic.pnl.revenueGrowthPct': 12,
  'economic.pnl.cogsPct': 40,
  'economic.pnl.opexMonthly': 30_000,
  'economic.pnl.daMonthly': 5_000,
  'economic.pnl.taxRatePct': 16,
  'economic.wc.dsoDays': 60, 'economic.wc.dpoDays': 30, 'economic.wc.dioDays': 45,
  'economic.debt.amount': 300_000, 'economic.debt.ratePct': 12,
  'economic.debt.tenorMonths': 24, 'economic.debt.shape': 'amortizing',
};

describe('BC-201 FCFF/FCFE cash-flow builder', () => {
  const model = buildExtendedModel(ANSWERS);

  it('matches the committed reference vector to the cent', () => {
    expect(model.months[0].fcff).toBe(-300_000);
    expect(model.months[0].fcfe).toBe(0); // drawdown offsets capex
    expect(model.months[1].fcff).toBe(-194_000);
    expect(model.months[1].fcfe).toBe(-207_642.04);
    expect(model.months[2].fcff).toBe(26_000);
    expect(model.months[13].fcff).toBe(5_648);
  });

  it('produces 60-cap monthly periods + annual rollups; FCFF ≠ FCFE and both labelled', () => {
    expect(model.months.length).toBe(25); // period 0 + 24 operating months
    expect(model.annual.length).toBe(3);  // year 0 + 2 operating years
    // annual year1 revenue = 1,200,000
    expect(model.annual[1].revenue).toBe(1_200_000);
    expect(model.annual[1].fcff).not.toBe(model.annual[1].fcfe);
    const cap = buildExtendedModel({ ...ANSWERS, 'strategic.horizonYears': 10 });
    expect(cap.months.length).toBe(61); // capped at 60 + period 0
    expect(cap.notes.join(' ')).toMatch(/capped/i);
  });

  it('hasExtendedDrivers gates on revenueYear1', () => {
    expect(hasExtendedDrivers(ANSWERS)).toBe(true);
    expect(hasExtendedDrivers({ 'strategic.horizonYears': 3 })).toBe(false);
  });

  it('flags the DSCR warning when FCFF cannot service the debt', () => {
    // month-1 FCFF is deeply negative → min DSCR < 1
    expect(model.dscrWarning).toBe(true);
    expect(model.coverage?.minDscr).toBeLessThan(1);
  });
});

describe('BC-202 MIRR + EAC (Excel semantics, decimal-verified references)', () => {
  const flows = (nets: number[]): CashflowRow[] => nets.map((net, year) => ({ year, capex: 0, benefit: 0, opex: 0, net }));

  it('MIRR([-1000,300,400,500,600], 10%, 12%) = 0.201392 to 6dp', () => {
    const m = mirr(flows([-1000, 300, 400, 500, 600]), 0.10, 0.12);
    expect(m).not.toBeNull();
    expect(Math.abs((m as number) - 0.201392)).toBeLessThan(5e-7);
  });

  it('MIRR returns null when a sign is absent (Excel #DIV/0!)', () => {
    expect(mirr(flows([-100, -50, -25]), 0.1, 0.1)).toBeNull();
    expect(mirr(flows([100, 50, 25]), 0.1, 0.1)).toBeNull();
  });

  it('EAC(10,000, 10%, 3y) = 4,021.148036 (Excel PMT)', () => {
    expect(Math.abs(eac(10_000, 0.10, 3) - 4_021.148036)).toBeLessThan(0.0001);
    expect(eac(9_000, 0, 3)).toBe(3_000);
  });
});

describe('BC-203 terminal value', () => {
  it('gordon: decimal-verified TV = 1,275,000 → PV 791,674.69 at N=5', () => {
    // isolate TV math: flat 100k annual FCFF, no debt/wc noise
    const m = buildExtendedModel({
      'strategic.horizonYears': 5,
      'strategic.initialInvestment': 0,
      'wacc.mode': 'hurdle', 'wacc.hurdle': 10,
      'economic.pnl.revenueYear1': 100_000, 'economic.pnl.cogsPct': 0,
      'economic.pnl.opexMonthly': 0, 'economic.pnl.daMonthly': 0, 'economic.pnl.taxRatePct': 0,
      'economic.wc.dsoDays': 0, 'economic.wc.dpoDays': 0, 'economic.wc.dioDays': 0,
      'economic.tv.method': 'gordon', 'economic.tv.growthPct': 2,
    });
    // annual FCFF = 100,000 → TV = 100,000×1.02/0.08 = 1,275,000; PV = /1.1^5
    expect(m.terminalValue?.tv).toBe(1_275_000);
    expect(m.terminalValue?.pvTv).toBe(791_674.69);
    expect(m.terminalValue?.npvWithTv).toBe(round2((m.terminalValue?.npvWithoutTv ?? 0) + 791_674.69));
  });

  it('exit multiple: TV = multiple × last-year EBITDA, discounted', () => {
    const m = buildExtendedModel({
      'strategic.horizonYears': 3, 'strategic.initialInvestment': 0,
      'wacc.mode': 'hurdle', 'wacc.hurdle': 10,
      'economic.pnl.revenueYear1': 120_000, 'economic.pnl.cogsPct': 0,
      'economic.pnl.opexMonthly': 0, 'economic.pnl.daMonthly': 0, 'economic.pnl.taxRatePct': 0,
      'economic.wc.dsoDays': 0, 'economic.wc.dpoDays': 0, 'economic.wc.dioDays': 0,
      'economic.tv.method': 'exit_multiple', 'economic.tv.exitMultiple': 5,
    });
    expect(m.terminalValue?.method).toBe('exit_multiple');
    expect(m.terminalValue?.tv).toBe(600_000); // 5 × 120,000 EBITDA
  });

  it('rejects g ≥ discount rate with a clear TvValidationError', () => {
    expect(() =>
      buildExtendedModel({
        ...{
          'strategic.horizonYears': 3, 'strategic.initialInvestment': 0,
          'wacc.mode': 'hurdle', 'wacc.hurdle': 10,
          'economic.pnl.revenueYear1': 120_000, 'economic.pnl.cogsPct': 0,
          'economic.pnl.opexMonthly': 0, 'economic.pnl.daMonthly': 0, 'economic.pnl.taxRatePct': 0,
          'economic.wc.dsoDays': 0, 'economic.wc.dpoDays': 0, 'economic.wc.dioDays': 0,
        },
        'economic.tv.method': 'gordon', 'economic.tv.growthPct': 12,
      }),
    ).toThrow(TvValidationError);
  });
});

const round2 = (n: number) => Math.round(n * 100) / 100;
