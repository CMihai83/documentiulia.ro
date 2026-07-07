import { SimV2CalibrationService } from './simv2.calibration';

function makePrisma(spy: { touched: boolean }) {
  const inv = [
    { grossAmount: 1000, createdAt: new Date('2026-01-15') },
    { grossAmount: 2000, createdAt: new Date('2026-06-15') },
  ];
  return {
    invoice: {
      aggregate: async () => { spy.touched = true; return { _sum: { grossAmount: 365000 }, _count: 120 }; },
      findMany: async () => { spy.touched = true; return inv; },
    },
    partner: { count: async () => { spy.touched = true; return 42; } },
    employee: { count: async () => { spy.touched = true; return 8; } },
  } as any;
}

const guard = (allowed: boolean, scrubSpy?: { called: boolean }) => ({
  isTrainingAllowed: async () => allowed,
  scrubForCalibration: (d: any) => { if (scrubSpy) scrubSpy.called = true; return d; },
}) as any;

describe('SIM-9 calibration (Art 28(10) gate)', () => {
  it('falls back to the preset and touches NO tenant data when unauthorised', async () => {
    const spy = { touched: false };
    const svc = new SimV2CalibrationService(makePrisma(spy), guard(false));
    const r = await svc.calibrate('u1', 'org1', 'services', 123);
    expect(r.mirror).toBe(false);
    expect(r.source).toBe('preset');
    expect(spy.touched).toBe(false); // no ERP query ran
  });

  it('falls back to preset when there is no organisation context', async () => {
    const spy = { touched: false };
    const svc = new SimV2CalibrationService(makePrisma(spy), guard(true));
    const r = await svc.calibrate('u1', undefined, 'services', 123);
    expect(r.mirror).toBe(false);
    expect(spy.touched).toBe(false);
  });

  it('seeds stocks from aggregates and scrubs when authorised', async () => {
    const spy = { touched: false };
    const scrub = { called: false };
    const svc = new SimV2CalibrationService(makePrisma(spy), guard(true, scrub));
    const r = await svc.calibrate('u1', 'org1', 'services', 123);
    expect(r.mirror).toBe(true);
    expect(r.source).toBe('erp');
    expect(spy.touched).toBe(true);
    expect(scrub.called).toBe(true); // scrubForCalibration was consulted
    expect(r.state.stocks.customerBase).toBe(42);
    expect(r.state.stocks.headcount).toBe(8);
    expect(r.state.params.baseDailyDemand).toBeGreaterThan(0);
  });

  it('degrades to preset if aggregation throws', async () => {
    const bad = { invoice: { aggregate: async () => { throw new Error('db'); }, findMany: async () => [] }, partner: { count: async () => 0 }, employee: { count: async () => 0 } } as any;
    const svc = new SimV2CalibrationService(bad, guard(true));
    const r = await svc.calibrate('u1', 'org1', 'services', 123);
    expect(r.mirror).toBe(false);
    expect(r.source).toBe('preset');
  });
});
