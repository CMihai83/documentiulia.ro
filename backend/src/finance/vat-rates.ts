/**
 * Date-aware Romanian VAT rates — the single source used wherever an invoice
 * is created or generated (REQ-048).
 *
 * Legea 141/2025 raised the standard rate 19% -> 21% and merged the reduced
 * rates (9%/5%) into 11% from 1 August 2025. Several creation paths hardcoded
 * `vatRate || 19`, so templates and B2C invoices issued today silently applied
 * a rate that has not existed for a year: the invoice undercharges VAT and
 * ANAF/DUKIntegrator rejects a 19% rate on a current issue date.
 *
 * Deliberately a plain module rather than a service: invoice creation, recurring
 * generation and the e-Factura controllers all need it, and none of them should
 * have to inject a finance service to know what year it is.
 */

/** Legea 141/2025 transition — rates change for documents issued on/after this date. */
export const VAT_TRANSITION_DATE = new Date('2025-08-01T00:00:00');

export const VAT_RATES_POST_AUG_2025 = {
  standard: 21,
  reduced: 11,
  /** 5% survives only for specific legacy operations; not a default. */
  special: 5,
  zero: 0,
} as const;

export const VAT_RATES_PRE_AUG_2025 = {
  standard: 19,
  reduced: 9,
  special: 5,
  zero: 0,
} as const;

function asDate(date?: Date | string | null): Date {
  if (!date) return new Date();
  return date instanceof Date ? date : new Date(date);
}

/** True when the document date falls under the Legea 141/2025 regime. */
export function isPostLegea141(date?: Date | string | null): boolean {
  return asDate(date) >= VAT_TRANSITION_DATE;
}

/** Standard VAT rate applicable to a document issued on `date`. */
export function standardVatRateForDate(date?: Date | string | null): number {
  return isPostLegea141(date)
    ? VAT_RATES_POST_AUG_2025.standard
    : VAT_RATES_PRE_AUG_2025.standard;
}

/** Every rate legally valid for a document issued on `date`. */
export function validVatRatesForDate(date?: Date | string | null): number[] {
  const set = isPostLegea141(date) ? VAT_RATES_POST_AUG_2025 : VAT_RATES_PRE_AUG_2025;
  return [...new Set([set.standard, set.reduced, set.special, set.zero])].sort((a, b) => b - a);
}

export interface VatRateCheck {
  valid: boolean;
  /** Romanian-language explanation, suitable for surfacing to the user. */
  message?: string;
  expected: number[];
}

/**
 * Validate a user-supplied rate against the document date. Returns a verdict
 * rather than throwing so callers can decide between rejecting (creation) and
 * warning (import of historical documents).
 */
export function checkVatRateForDate(rate: number, date?: Date | string | null): VatRateCheck {
  const expected = validVatRatesForDate(date);
  if (expected.includes(rate)) return { valid: true, expected };

  const post = isPostLegea141(date);
  return {
    valid: false,
    expected,
    message: post
      ? `Cota TVA ${rate}% nu este validă pentru documente emise după 1 august 2025 (Legea 141/2025). Cote valide: ${expected.join('%, ')}%.`
      : `Cota TVA ${rate}% nu este validă pentru documente emise înainte de 1 august 2025. Cote valide: ${expected.join('%, ')}%.`,
  };
}
