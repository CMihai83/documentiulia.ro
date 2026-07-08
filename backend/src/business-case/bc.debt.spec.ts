import { annuityPayment, buildDebtSchedule, coverage } from './bc.debt';

/**
 * BC-204 reference vector (hand math, Excel PMT semantics):
 * 300,000 @ 12%/yr (r = 1%/mo), 24 months amortizing, no grace:
 *   1.01^24 = 1.2697346…, PMT = 3,000 / (1 − 1/1.2697346) = 3,000 / 0.2124339
 *   PMT = 14,122.0665 (Excel PMT(1%,24,-300000) = 14,122.066511…)
 *   Row 1: interest = 3,000.00; principal = 11,122.07; closing = 288,877.93
 */
describe('BC-204 debt schedule', () => {
  it('amortizing matches the hand reference row to the cent and reconciles', () => {
    const s = buildDebtSchedule({ amount: 300_000, annualRatePct: 12, tenorMonths: 24, shape: 'amortizing' });
    const pmt = annuityPayment(300_000, 0.01, 24);
    expect(Math.abs(pmt - 14_122.066511)).toBeLessThan(0.0001); // Excel PMT to 4dp

    expect(s.rows[0].interest).toBe(3_000);
    expect(s.rows[0].principal).toBe(round2(pmt - 3_000));
    expect(s.rows[0].closing).toBe(round2(300_000 - (pmt - 3_000)));
    // Σ principal == amount to the cent (residue absorbed by the final row)
    expect(s.totalPrincipal).toBe(300_000);
    expect(s.rows[s.rows.length - 1].closing).toBe(0);
  });

  it('interest-only: level interest, bullet principal at maturity', () => {
    const s = buildDebtSchedule({ amount: 120_000, annualRatePct: 6, tenorMonths: 12, shape: 'interest_only' });
    expect(s.rows[0].interest).toBe(600); // 120,000 × 0.5%
    expect(s.rows[0].principal).toBe(0);
    expect(s.rows[10].principal).toBe(0);
    expect(s.rows[11].principal).toBe(120_000);
    expect(s.totalPrincipal).toBe(120_000);
    expect(s.totalInterest).toBe(7_200); // 600 × 12
  });

  it('balloon: amortizes (amount − balloon), balloon due at maturity', () => {
    const s = buildDebtSchedule({ amount: 200_000, annualRatePct: 12, tenorMonths: 24, shape: 'balloon', balloonPct: 30 });
    // 60,000 balloon stays outstanding until the final period
    expect(s.rows[22].closing).toBeGreaterThanOrEqual(60_000 - 0.01);
    expect(s.rows[23].closing).toBe(0);
    expect(s.totalPrincipal).toBe(200_000);
  });

  it('grace: interest-only during the grace window, then amortizes', () => {
    const s = buildDebtSchedule({ amount: 100_000, annualRatePct: 12, tenorMonths: 12, shape: 'amortizing', graceMonths: 3 });
    expect(s.rows[0].principal).toBe(0);
    expect(s.rows[2].principal).toBe(0);
    expect(s.rows[2].interest).toBe(1_000); // balance untouched through grace
    expect(s.rows[3].principal).toBeGreaterThan(0);
    expect(s.totalPrincipal).toBe(100_000);
  });

  it('DSCR < 1.0 raises the warning; healthy CFADS does not', () => {
    const s = buildDebtSchedule({ amount: 300_000, annualRatePct: 12, tenorMonths: 24, shape: 'amortizing' });
    const weak = coverage(s, new Array(24).fill(10_000));   // service ≈ 14,122 → DSCR ≈ 0.708
    expect(weak.dscrBelowOne).toBe(true);
    expect(weak.minDscr).toBeLessThan(1);
    const strong = coverage(s, new Array(24).fill(20_000)); // DSCR ≈ 1.416
    expect(strong.dscrBelowOne).toBe(false);
    expect(strong.rows[0].dscr).toBe(round4(20_000 / s.rows[0].payment));
  });
});

const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;
