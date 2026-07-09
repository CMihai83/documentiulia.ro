/**
 * DOC-W0-2 — pure VAT add/extract math. The RATE comes from the real
 * date-aware engine (VatCalculationService, DOC-45-4) — this module only does
 * the arithmetic, so the tool can never drift from the statutory engine.
 */

export type VatCategory = 'STANDARD' | 'REDUCED' | 'SPECIAL';

export interface VatToolResult {
  direction: 'add' | 'extract';
  category: VatCategory;
  ratePct: number;
  rateEffectiveDate: string;
  net: number;
  vat: number;
  gross: number;
  note?: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** amount = NET when adding, GROSS when extracting. */
export function computeVat(
  amount: number,
  direction: 'add' | 'extract',
  ratePct: number,
  category: VatCategory,
  rateEffectiveDate: string,
): VatToolResult {
  if (direction === 'add') {
    const vat = r2((amount * ratePct) / 100);
    return {
      direction,
      category,
      ratePct,
      rateEffectiveDate,
      net: r2(amount),
      vat,
      gross: r2(amount + vat),
    };
  }
  const net = r2(amount / (1 + ratePct / 100));
  return {
    direction,
    category,
    ratePct,
    rateEffectiveDate,
    net,
    vat: r2(amount - net),
    gross: r2(amount),
  };
}
