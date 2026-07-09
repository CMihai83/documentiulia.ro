import {
  billRuntime,
  isIdlePastAutoStop,
  isOverBudget,
  minutesBetween,
  PLATFORM_FEE_PCT,
  RATE_PER_MINUTE_EUR,
} from './workspace-billing.logic';

describe('workspace-billing.logic (W1-5)', () => {
  it('bills compute + platform fee to the cent', () => {
    // dev_container @ 0.002/min × 600 min = 1.20 compute; fee 15% = 0.18; total 1.38
    const r = billRuntime('dev_container', 600);
    expect(r.computeEur).toBe(1.2);
    expect(r.feeEur).toBe(0.18);
    expect(r.totalEur).toBe(1.38);
    expect(PLATFORM_FEE_PCT).toBe(15);
  });

  it('gpu_pod is the priciest rate', () => {
    expect(RATE_PER_MINUTE_EUR.gpu_pod).toBeGreaterThan(RATE_PER_MINUTE_EUR.vm);
    expect(RATE_PER_MINUTE_EUR.vm).toBeGreaterThan(RATE_PER_MINUTE_EUR.dev_container);
  });

  it('never bills negative runtime', () => {
    expect(billRuntime('vm', -100).totalEur).toBe(0);
    expect(minutesBetween(new Date('2026-07-09T10:00:00Z'), new Date('2026-07-09T09:00:00Z'))).toBe(0);
  });

  it('minutesBetween is exact', () => {
    expect(minutesBetween(new Date('2026-07-09T10:00:00Z'), new Date('2026-07-09T10:30:00Z'))).toBe(30);
  });

  it('budget cap triggers at or above the cap', () => {
    expect(isOverBudget(24.99, 25)).toBe(false);
    expect(isOverBudget(25, 25)).toBe(true);
    expect(isOverBudget(30, 25)).toBe(true);
  });

  it('auto-stop triggers once idle past the window', () => {
    const now = new Date('2026-07-09T12:00:00Z');
    expect(isIdlePastAutoStop(new Date('2026-07-09T11:01:00Z'), 60, now)).toBe(false); // 59 min idle
    expect(isIdlePastAutoStop(new Date('2026-07-09T11:00:00Z'), 60, now)).toBe(true); // 60 min idle
  });
});
