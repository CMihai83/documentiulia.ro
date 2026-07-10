import { computeProgress, periodWindow } from './business-goals.service';
import { BadRequestException } from '@nestjs/common';

describe('business goals (pure)', () => {
  it('periodWindow: year and month', () => {
    const y = periodWindow('2026');
    expect(y.start.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(y.end.toISOString()).toBe('2027-01-01T00:00:00.000Z');
    const m = periodWindow('2026-07');
    expect(m.start.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(m.end.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    expect(() => periodWindow('26-7')).toThrow(BadRequestException);
    expect(() => periodWindow('2026-13')).toThrow(BadRequestException);
  });

  it('computeProgress mirrors quick-stats semantics', () => {
    const facts = { income: 50000, expenses: 20000, issuedCount: 40, customers: 12 };
    expect(computeProgress('revenue', 100000, facts)).toEqual({ current: 50000, target: 100000, progressPct: 50, achieved: false });
    expect(computeProgress('profit', 30000, facts).achieved).toBe(true);
    expect(computeProgress('profit', 30000, facts).current).toBe(30000);
    expect(computeProgress('invoices', 40, facts).achieved).toBe(true);
    expect(computeProgress('customers', 24, facts).progressPct).toBe(50);
    expect(computeProgress('revenue', 0, facts).progressPct).toBeNull();
  });
});
