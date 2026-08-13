import {
  checkVatRateForDate,
  isPostLegea141,
  standardVatRateForDate,
  validVatRatesForDate,
} from './vat-rates';

describe('VAT rates by document date (REQ-048, Legea 141/2025)', () => {
  it('applies 19% before 1 Aug 2025 and 21% from that date', () => {
    expect(standardVatRateForDate('2025-07-31')).toBe(19);
    expect(standardVatRateForDate('2025-08-01')).toBe(21);
    expect(standardVatRateForDate('2026-08-13')).toBe(21);
  });

  it('treats the transition date itself as post-transition', () => {
    expect(isPostLegea141('2025-08-01T00:00:00')).toBe(true);
    expect(isPostLegea141('2025-07-31T23:59:59')).toBe(false);
  });

  it('exposes the reduced rate that replaced 9%/5%', () => {
    expect(validVatRatesForDate('2026-01-01')).toContain(11);
    expect(validVatRatesForDate('2026-01-01')).not.toContain(19);
    expect(validVatRatesForDate('2025-01-01')).toContain(9);
    expect(validVatRatesForDate('2025-01-01')).not.toContain(21);
  });

  it('rejects an abolished rate on a current document and explains why', () => {
    const check = checkVatRateForDate(19, '2026-08-13');
    expect(check.valid).toBe(false);
    expect(check.message).toContain('Legea 141/2025');
    expect(check.expected).toContain(21);
  });

  it('rejects a future rate back-dated before the transition', () => {
    expect(checkVatRateForDate(21, '2025-07-01').valid).toBe(false);
  });

  it('accepts correct rates on both sides of the boundary', () => {
    expect(checkVatRateForDate(19, '2025-03-15').valid).toBe(true);
    expect(checkVatRateForDate(21, '2026-03-15').valid).toBe(true);
    expect(checkVatRateForDate(0, '2026-03-15').valid).toBe(true); // exports
  });
});
