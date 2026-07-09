import { buildChartConfigs } from './bc.charts';

const RESULTS = {
  appraisal: { cashflows: [{ year: 0, net: -1000 }, { year: 1, net: 600 }, { year: 2, net: 700 }] },
  tornado: [
    { key: 'price', swing: 500 },
    { key: 'volume', swing: 300 },
  ],
  monteCarlo: { histogram: [{ x0: 0, x1: 100, count: 5 }, { x0: 100, x1: 200, count: 9 }] },
  extended: {
    annual: [
      { year: 1, fcff: 120, fcfe: 90 },
      { year: 2, fcff: 150, fcfe: 110 },
    ],
    coverage: { rows: [{ period: 1, dscr: 1.4 }, { period: 2, dscr: 0.9 }] },
  },
};

describe('BC-301 shared chart-config builder', () => {
  it('builds all four charts from a full results object', () => {
    const set = buildChartConfigs(RESULTS);
    expect(set.cashTrajectory?.type).toBe('bar');
    expect((set.cashTrajectory?.data.datasets ?? []).map((d: any) => d.label)).toEqual(['FCFF', 'FCFE']);
    expect(set.tornado?.options && (set.tornado.options as any).indexAxis).toBe('y');
    expect(set.tornado?.data.labels).toEqual(['price', 'volume']);
    expect(set.mcHistogram?.data.datasets?.[0].data).toEqual([5, 9]);
    // DSCR chart carries the 1.0 threshold line
    const dscrSets = set.debtDscr?.data.datasets ?? [];
    expect(dscrSets.map((d: any) => d.label)).toContain('DSCR = 1.0');
    expect((dscrSets.find((d: any) => d.label === 'DSCR = 1.0') as any).data).toEqual([1, 1]);
  });

  it('falls back to appraisal net bars when no extended model exists', () => {
    const set = buildChartConfigs({ appraisal: RESULTS.appraisal, tornado: [], monteCarlo: {} });
    expect(set.cashTrajectory?.data.labels).toEqual(['Y0', 'Y1', 'Y2']);
    expect(set.tornado).toBeUndefined();
    expect(set.mcHistogram).toBeUndefined();
    expect(set.debtDscr).toBeUndefined();
  });

  it('applies branding colors when provided', () => {
    const set = buildChartConfigs(RESULTS, { primaryColor: '#123456', accentColor: '#654321' });
    expect((set.cashTrajectory?.data.datasets?.[0] as any).backgroundColor).toBe('#123456');
    expect((set.tornado?.data.datasets?.[0] as any).backgroundColor).toBe('#654321');
  });
});
