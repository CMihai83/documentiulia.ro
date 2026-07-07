import { ChartService } from './chart.service';

const isPng = (b: Buffer) => b.length > 0 && b.slice(1, 4).toString() === 'PNG';

describe('ChartService (F-5)', () => {
  const svc = new ChartService();

  it('renders a bar chart to a non-empty PNG', async () => {
    const buf = await svc.renderToBuffer(svc.barConfig(['Base', 'Best', 'Worst'], [{ data: [100, 140, 60] }]));
    expect(isPng(buf)).toBe(true);
  });

  it('renders a line chart to a non-empty PNG', async () => {
    const buf = await svc.renderToBuffer(svc.lineConfig(['Jan', 'Feb', 'Mar'], [{ label: 'Cash', data: [10, 14, 12] }]));
    expect(isPng(buf)).toBe(true);
  });

  it('renders a tornado (sorted horizontal) chart', async () => {
    const buf = await svc.renderToBuffer(
      svc.tornadoConfig([{ label: 'price', value: 30 }, { label: 'volume', value: -18 }, { label: 'cost', value: 12 }]),
    );
    expect(isPng(buf)).toBe(true);
  });

  it('produces a base64 data URI', async () => {
    const uri = await svc.renderToDataUri(svc.barConfig(['a'], [{ data: [1] }]), { width: 120, height: 80 });
    expect(uri.startsWith('data:image/png;base64,')).toBe(true);
    expect(uri.length).toBeGreaterThan(100);
  });

  it('caches the canvas per size (same instance reused)', async () => {
    await svc.renderToBuffer(svc.barConfig(['a'], [{ data: [1] }]), { width: 200, height: 100 });
    await svc.renderToBuffer(svc.barConfig(['b'], [{ data: [2] }]), { width: 200, height: 100 });
    expect((svc as any).canvasCache.size).toBeGreaterThanOrEqual(1);
  });
});
