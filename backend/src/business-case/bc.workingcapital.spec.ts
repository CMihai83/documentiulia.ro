import { buildWorkingCapital, glideDays } from './bc.workingcapital';

/**
 * BC-205 reference vector (30-day-month convention, hand math):
 * revenue = 100,000/mo, cogs = 40,000/mo, DSO 60 / DPO 30 / DIO 45:
 *   AR  = 100,000 × 60/30 = 200,000
 *   INV =  40,000 × 45/30 =  60,000
 *   AP  =  40,000 × 30/30 =  40,000
 *   NWC = 200,000 + 60,000 − 40,000 = 220,000
 *   ΔNWC month1 = 220,000 (from empty), month2 = 0 (steady state)
 */
describe('BC-205 working capital', () => {
  const flat = (v: number, n: number) => new Array(n).fill(v);

  it('matches the hand reference to the cent (steady state)', () => {
    const rows = buildWorkingCapital(flat(100_000, 3), flat(40_000, 3), {
      dsoDays: 60, dpoDays: 30, dioDays: 45,
    });
    expect(rows[0].receivables).toBe(200_000);
    expect(rows[0].inventory).toBe(60_000);
    expect(rows[0].payables).toBe(40_000);
    expect(rows[0].nwc).toBe(220_000);
    expect(rows[0].deltaNwc).toBe(220_000);
    expect(rows[1].deltaNwc).toBe(0);
    expect(rows[2].deltaNwc).toBe(0);
  });

  it('DSO↑ absorbs cash (positive ΔNWC), DPO↑ releases (negative ΔNWC)', () => {
    const base = buildWorkingCapital(flat(100_000, 2), flat(40_000, 2), { dsoDays: 60, dpoDays: 30, dioDays: 45 });
    const dsoUp = buildWorkingCapital(flat(100_000, 2), flat(40_000, 2), {
      dsoDays: 60, dpoDays: 30, dioDays: 45, dsoTargetDays: 90, improveMonths: 2,
    });
    // month 2: DSO has risen → NWC grew → ΔNWC positive vs base's 0
    expect(dsoUp[1].deltaNwc).toBeGreaterThan(base[1].deltaNwc);

    const dpoUp = buildWorkingCapital(flat(100_000, 2), flat(40_000, 2), {
      dsoDays: 60, dpoDays: 30, dioDays: 45, dpoTargetDays: 60, improveMonths: 2,
    });
    expect(dpoUp[1].deltaNwc).toBeLessThan(base[1].deltaNwc); // releases cash
  });

  it('glide-path: DSO 60→45 over 12 months is linear and then holds', () => {
    expect(glideDays(60, 45, 12, 0)).toBe(60);
    expect(glideDays(60, 45, 12, 6)).toBe(52.5);
    expect(glideDays(60, 45, 12, 12)).toBe(45);
    expect(glideDays(60, 45, 12, 24)).toBe(45);
  });

  it('is safe on zero revenue / empty series', () => {
    const zero = buildWorkingCapital([0, 0], [0, 0], { dsoDays: 60, dpoDays: 30, dioDays: 45 });
    expect(zero.every((r) => r.nwc === 0 && r.deltaNwc === 0)).toBe(true);
    expect(buildWorkingCapital([], [], { dsoDays: 60, dpoDays: 30, dioDays: 45 })).toEqual([]);
  });
});
