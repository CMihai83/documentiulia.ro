/**
 * BC-209 — RFQ costing engine (pure, deterministic).
 *
 * Consumes the existing S-50 `rfq.*` DSL fields plus the optional S-59
 * benchmark / bid-scoring fields. Conventions (documented, hand-validated):
 *  - Overhead % applies to TOTAL DIRECT COST (material + labour).
 *  - Cost-plus:      price = fullCost × (1 + markup%)
 *  - Target-margin:  price = fullCost / (1 − targetMargin%)
 *  - Margin % is always price-based: (price − fullCost) / price.
 *  - Should-cost variance: (fullCost − benchmark) / benchmark (+ = over benchmark).
 *
 * Bid/no-bid score (0–100, weighted; weights normalised):
 *  - margin component:    min(1, achievedMargin / thresholdMargin) × 100
 *  - capacity component:  rfq.bid.capacityFitPct   (self-assessed, 0–100)
 *  - strategic component: rfq.bid.strategicFitPct  (self-assessed, 0–100)
 * Recommendation: BID when score ≥ rfq.bid.scoreThreshold (default 60).
 */

const num = (v: any, d = 0): number => (Number.isFinite(Number(v)) ? Number(v) : d);
const round2 = (v: number): number => Math.round(v * 100) / 100;

export interface RfqCostSheet {
  directMaterial: number;
  directLabour: number;
  directCost: number;      // material + labour
  overheadPct: number;     // whole percent
  overhead: number;        // directCost × overhead%
  fullCost: number;        // directCost + overhead
}

export interface RfqPricing {
  method: 'cost-plus' | 'target-margin';
  price: number;
  marginPct: number;       // price-based margin, whole percent
  markupPct?: number;      // cost-plus input echoed
  targetMarginPct?: number;
}

export interface RfqShouldCost {
  benchmark: number;
  variancePct: number;     // + over benchmark, − under
  verdict: 'under' | 'at' | 'over';
}

export interface RfqBidScore {
  score: number;           // 0–100
  threshold: number;
  recommendation: 'bid' | 'no-bid';
  components: { margin: number; capacity: number; strategic: number };
  weights: { margin: number; capacity: number; strategic: number };
}

export interface RfqResult {
  costSheet: RfqCostSheet;
  pricing: RfqPricing;
  shouldCost: RfqShouldCost | null;
  bid: RfqBidScore;
}

export function hasRfqInputs(answers: Record<string, any>): boolean {
  return answers['rfq.method'] === 'cost-plus' || answers['rfq.method'] === 'target-margin';
}

export function computeRfq(answers: Record<string, any>): RfqResult {
  const material = num(answers['rfq.directMaterial']);
  const labour = num(answers['rfq.directLabour']);
  const overheadPct = num(answers['rfq.overheadPct']);
  const directCost = material + labour;
  const overhead = directCost * (overheadPct / 100);
  const fullCost = directCost + overhead;
  const costSheet: RfqCostSheet = {
    directMaterial: round2(material),
    directLabour: round2(labour),
    directCost: round2(directCost),
    overheadPct,
    overhead: round2(overhead),
    fullCost: round2(fullCost),
  };

  const method: RfqPricing['method'] = answers['rfq.method'] === 'target-margin' ? 'target-margin' : 'cost-plus';
  let price: number;
  let pricing: RfqPricing;
  if (method === 'cost-plus') {
    const markupPct = num(answers['rfq.markupPct']);
    price = fullCost * (1 + markupPct / 100);
    pricing = { method, price: round2(price), marginPct: round2(price > 0 ? ((price - fullCost) / price) * 100 : 0), markupPct };
  } else {
    const targetMarginPct = Math.min(95, Math.max(0, num(answers['rfq.targetMarginPct'])));
    price = targetMarginPct >= 95 ? fullCost / 0.05 : fullCost / (1 - targetMarginPct / 100);
    pricing = { method, price: round2(price), marginPct: round2(targetMarginPct), targetMarginPct };
  }

  let shouldCost: RfqShouldCost | null = null;
  const benchmark = num(answers['rfq.shouldCostBenchmark']);
  if (benchmark > 0) {
    const variancePct = round2(((fullCost - benchmark) / benchmark) * 100);
    shouldCost = {
      benchmark: round2(benchmark),
      variancePct,
      verdict: Math.abs(variancePct) < 1 ? 'at' : variancePct > 0 ? 'over' : 'under',
    };
  }

  // --- bid / no-bid --------------------------------------------------------
  const wMargin = num(answers['rfq.bid.weightMargin'], 50);
  const wCapacity = num(answers['rfq.bid.weightCapacity'], 30);
  const wStrategic = num(answers['rfq.bid.weightStrategic'], 20);
  const wSum = wMargin + wCapacity + wStrategic || 1;
  const weights = {
    margin: round2(wMargin / wSum),
    capacity: round2(wCapacity / wSum),
    strategic: round2(wStrategic / wSum),
  };
  const thresholdMargin = Math.max(0.01, num(answers['rfq.bid.marginThresholdPct'], 15));
  const marginComponent = Math.min(1, pricing.marginPct / thresholdMargin) * 100;
  const capacityComponent = Math.min(100, Math.max(0, num(answers['rfq.bid.capacityFitPct'], 70)));
  const strategicComponent = Math.min(100, Math.max(0, num(answers['rfq.bid.strategicFitPct'], 50)));
  const score = round2(
    (marginComponent * wMargin + capacityComponent * wCapacity + strategicComponent * wStrategic) / wSum,
  );
  const threshold = num(answers['rfq.bid.scoreThreshold'], 60);
  const bid: RfqBidScore = {
    score,
    threshold,
    recommendation: score >= threshold ? 'bid' : 'no-bid',
    components: {
      margin: round2(marginComponent),
      capacity: round2(capacityComponent),
      strategic: round2(strategicComponent),
    },
    weights,
  };

  return { costSheet, pricing, shouldCost, bid };
}
