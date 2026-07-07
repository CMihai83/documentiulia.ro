/**
 * BC-103 — WACC / discount-rate math (pure, deterministic, unit-tested).
 * Deterministic in-house implementations so exported Excel formulas match to
 * the cent later (research 02 §A1).
 */

export interface WaccInputs {
  rf: number;          // risk-free rate (decimal, e.g. 0.04)
  erp: number;         // equity risk premium (decimal)
  beta: number;
  costDebtPre: number; // pre-tax cost of debt (decimal)
  taxRate: number;     // decimal
  debtWeight: number;  // D/V in [0,1]
}

/** Cost of equity via CAPM: Re = Rf + β·ERP. */
export function costOfEquity(rf: number, beta: number, erp: number): number {
  return rf + beta * erp;
}

/** WACC = E/V·Re + D/V·Rd·(1−Tax). Returns a decimal. */
export function wacc(i: WaccInputs): number {
  const d = clamp01(i.debtWeight);
  const e = 1 - d;
  const re = costOfEquity(i.rf, i.beta, i.erp);
  const rdAfterTax = i.costDebtPre * (1 - i.taxRate);
  return e * re + d * rdAfterTax;
}

/** Accept either a full CAPM input set or a simple hurdle rate; returns the decimal rate used. */
export function resolveDiscountRate(a: Record<string, any>): { rate: number; method: 'capm' | 'hurdle' } {
  const mode = a['wacc.mode'] === 'hurdle' ? 'hurdle' : 'capm';
  if (mode === 'hurdle') {
    return { rate: pct(a['wacc.hurdle']), method: 'hurdle' };
  }
  return {
    method: 'capm',
    rate: wacc({
      rf: pct(a['wacc.rf']),
      erp: pct(a['wacc.erp']),
      beta: Number(a['wacc.beta'] ?? 1),
      costDebtPre: pct(a['wacc.costDebtPre']),
      taxRate: pct(a['wacc.taxRate']),
      debtWeight: pct(a['wacc.debtWeight']),
    }),
  };
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, Number(n) || 0));
/** Percent answers are stored as whole numbers (e.g. 4 for 4%); convert to decimal. */
const pct = (n: any) => (Number(n) || 0) / 100;
