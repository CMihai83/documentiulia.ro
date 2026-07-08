import { computeRfq, hasRfqInputs } from './bc.rfq';

/**
 * Hand math (committed reference):
 *  material 400, labour 300 → direct 700; overhead 50% of direct = 350 → full cost 1,050.
 *  Cost-plus 20%:     price = 1,050 × 1.20 = 1,260.00; margin = 210/1,260 = 16.67%.
 *  Target margin 30%: price = 1,050 / 0.70  = 1,500.00; margin = 30%.
 *  Should-cost benchmark 1,000: variance = 50/1,000 = +5% → 'over'.
 *  Bid (defaults w=50/30/20, margin threshold 15%, capacity 70, strategic 50):
 *   cost-plus margin 16.67% ≥ 15% → margin comp = 100
 *   score = (100×50 + 70×30 + 50×20)/100 = (5000+2100+1000)/100 = 81 → BID (≥60).
 */
const BASE: Record<string, any> = {
  'rfq.method': 'cost-plus',
  'rfq.directMaterial': 400,
  'rfq.directLabour': 300,
  'rfq.overheadPct': 50,
  'rfq.markupPct': 20,
};

describe('BC-209 RFQ costing engine', () => {
  it('cost sheet reconciles (direct + overhead = full cost)', () => {
    const r = computeRfq(BASE);
    expect(r.costSheet).toEqual({
      directMaterial: 400, directLabour: 300, directCost: 700,
      overheadPct: 50, overhead: 350, fullCost: 1050,
    });
    expect(r.costSheet.directCost + r.costSheet.overhead).toBe(r.costSheet.fullCost);
  });

  it('cost-plus pricing hand-validated (1,260.00, margin 16.67%)', () => {
    const r = computeRfq(BASE);
    expect(r.pricing.price).toBe(1260);
    expect(r.pricing.marginPct).toBeCloseTo(16.67, 2);
  });

  it('target-margin pricing hand-validated (1,500.00 at 30%)', () => {
    const r = computeRfq({ ...BASE, 'rfq.method': 'target-margin', 'rfq.targetMarginPct': 30 });
    expect(r.pricing.price).toBe(1500);
    expect(r.pricing.marginPct).toBe(30);
  });

  it('should-cost variance vs a benchmark (+5% over)', () => {
    const r = computeRfq({ ...BASE, 'rfq.shouldCostBenchmark': 1000 });
    expect(r.shouldCost).toEqual({ benchmark: 1000, variancePct: 5, verdict: 'over' });
  });

  it('bid score with default weights = 81 → BID', () => {
    const r = computeRfq(BASE);
    expect(r.bid.score).toBe(81);
    expect(r.bid.recommendation).toBe('bid');
    expect(r.bid.components.margin).toBe(100);
  });

  it('thin margin below threshold drags the score to no-bid', () => {
    // markup 5% → price 1,102.50, margin 4.76%; margin comp = 4.76/15×100 = 31.75
    // score = (31.75×50 + 70×30 + 50×20)/100 = (1587.3+2100+1000)/100 = 46.87 → no-bid
    const r = computeRfq({ ...BASE, 'rfq.markupPct': 5 });
    expect(r.bid.score).toBeCloseTo(46.87, 1);
    expect(r.bid.recommendation).toBe('no-bid');
  });

  it('custom weights are normalised', () => {
    const r = computeRfq({ ...BASE, 'rfq.bid.weightMargin': 1, 'rfq.bid.weightCapacity': 1, 'rfq.bid.weightStrategic': 2 });
    expect(r.bid.weights.margin).toBeCloseTo(0.25, 2);
    expect(r.bid.weights.strategic).toBeCloseTo(0.5, 2);
  });

  it('hasRfqInputs gates on the method field', () => {
    expect(hasRfqInputs(BASE)).toBe(true);
    expect(hasRfqInputs({})).toBe(false);
  });
});
