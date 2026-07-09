import { computeVat } from './tools-vat.logic';

describe('DOC-W0-2 VAT math (rates come from the statutory engine)', () => {
  it('adds 21% to a net amount', () => {
    const r = computeVat(1000, 'add', 21, 'STANDARD', '2025-08-01');
    expect(r.net).toBe(1000);
    expect(r.vat).toBe(210);
    expect(r.gross).toBe(1210);
  });

  it('extracts 21% from a gross amount (inverse of add)', () => {
    const r = computeVat(1210, 'extract', 21, 'STANDARD', '2025-08-01');
    expect(r.net).toBe(1000);
    expect(r.vat).toBe(210);
  });

  it('historical 19% pre-Aug-2025', () => {
    const r = computeVat(100, 'add', 19, 'STANDARD', '2010-07-01');
    expect(r.gross).toBe(119);
  });

  it('reduced 11% and rounding to the ban (2dp)', () => {
    const r = computeVat(33.33, 'add', 11, 'REDUCED', '2025-08-01');
    expect(r.vat).toBe(3.67);
    expect(r.gross).toBe(37);
  });

  it('extract is consistent: net + vat === gross', () => {
    for (const gross of [1, 7.77, 123.45, 99999.99]) {
      const r = computeVat(gross, 'extract', 21, 'STANDARD', '2025-08-01');
      expect(Math.round((r.net + r.vat) * 100) / 100).toBe(r.gross);
    }
  });
});
