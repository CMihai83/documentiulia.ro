/**
 * BC-105 — sensitivity + risk analysis on top of the BC-104 model.
 *  - tornado(): one-way ±X% swings on each driver, ranked by |ΔNPV|.
 *  - monteCarlo(): seeded (mulberry32) sampling of driver distributions → an NPV
 *    distribution with P10/P50/P90, mean, P(NPV>0) and P(IRR>hurdle).
 *
 * Fully deterministic: every random draw threads the PRNG state, so the same
 * seed reproduces the same result byte-for-byte (mirrors the sim-v2 engine).
 */
import { resolveDiscountRate } from './bc.finance';
import { buildCashflows, npv, irr, CashflowRow } from './bc.model';
import { rngNext } from '../simulation/v2/simv2.engine';

export type DriverKey = 'capex' | 'benefits' | 'opex' | 'discountRate';
export const ALL_DRIVERS: DriverKey[] = ['capex', 'benefits', 'opex', 'discountRate'];

interface Base { rate: number; cashflows: CashflowRow[]; }

function baseOf(answers: Record<string, any>): Base {
  return { rate: resolveDiscountRate(answers).rate, cashflows: buildCashflows(answers) };
}

/** Scale one driver by `factor`, returning a fresh {rate, cashflows}. */
function applyDriver(base: Base, driver: DriverKey, factor: number): Base {
  if (driver === 'discountRate') {
    return { rate: base.rate * factor, cashflows: base.cashflows };
  }
  const cashflows = base.cashflows.map((r) => {
    if (r.year === 0) {
      const capex = driver === 'capex' ? r.capex * factor : r.capex;
      return { ...r, capex, net: -capex };
    }
    const benefit = driver === 'benefits' ? r.benefit * factor : r.benefit;
    const opex = driver === 'opex' ? r.opex * factor : r.opex;
    return { ...r, benefit, opex, net: benefit - opex };
  });
  return { rate: base.rate, cashflows };
}

export interface TornadoBar { key: DriverKey; lowNpv: number; highNpv: number; baseNpv: number; swing: number; }

/**
 * One-way sensitivity. Each driver is swung to (1−pct) and (1+pct); the bar's
 * `swing` is |highNpv − lowNpv|. Drivers with no exposure (zero base value) are
 * dropped. Ranked most-sensitive first.
 */
export function tornado(answers: Record<string, any>, drivers: DriverKey[] = ALL_DRIVERS, pct = 0.1): TornadoBar[] {
  const base = baseOf(answers);
  const baseNpv = npv(base.rate, base.cashflows);
  const bars: TornadoBar[] = [];
  for (const d of drivers) {
    if (!hasExposure(base, d)) continue;
    const low = npv(...unpack(applyDriver(base, d, 1 - pct)));
    const high = npv(...unpack(applyDriver(base, d, 1 + pct)));
    bars.push({ key: d, lowNpv: round(low), highNpv: round(high), baseNpv: round(baseNpv), swing: round(Math.abs(high - low)) });
  }
  return bars.sort((a, b) => b.swing - a.swing);
}

function hasExposure(base: Base, d: DriverKey): boolean {
  if (d === 'discountRate') return base.rate !== 0;
  if (d === 'capex') return (base.cashflows[0]?.capex ?? 0) !== 0;
  const field = d === 'benefits' ? 'benefit' : 'opex';
  return base.cashflows.some((r) => (r as any)[field] !== 0);
}

// ---- Monte-Carlo -----------------------------------------------------------

export type DistSpec =
  | { dist: 'triangular'; min: number; mode: number; max: number }
  | { dist: 'uniform'; min: number; max: number }
  | { dist: 'normal'; mean: number; sd: number }
  | { dist: 'pert'; min: number; mode: number; max: number };

export interface MonteCarloOptions {
  iterations?: number;
  seed?: number;
  swingPct?: number; // fallback ± range when a driver has no explicit distribution
}

export interface MonteCarloResult {
  iterations: number;
  seed: number;
  p10: number; p50: number; p90: number; mean: number;
  probNpvPositive: number;
  probIrrAboveHurdle: number;
  histogram: { x0: number; x1: number; count: number }[];
}

/** distribution specs live under `economic.dist.<driver>` in the answer set. */
function distsFrom(answers: Record<string, any>): Partial<Record<DriverKey, DistSpec>> {
  const out: Partial<Record<DriverKey, DistSpec>> = {};
  for (const d of ALL_DRIVERS) {
    const spec = answers[`economic.dist.${d}`];
    if (spec && typeof spec === 'object' && spec.dist) out[d] = spec as DistSpec;
  }
  return out;
}

/**
 * Seeded Monte-Carlo. Each driver with a distribution spec is sampled as a
 * MULTIPLIER around its base value; drivers without a spec stay at 1.0. Returns
 * the NPV distribution plus P(NPV>0) and P(IRR > base hurdle rate).
 */
export function monteCarlo(answers: Record<string, any>, opts: MonteCarloOptions = {}): MonteCarloResult {
  const iterations = Math.max(1, Math.floor(opts.iterations ?? 5000));
  const seed = (opts.seed ?? 12345) >>> 0;
  const base = baseOf(answers);
  const specs = distsFrom(answers);
  const drivers = Object.keys(specs) as DriverKey[];

  const hurdle = base.rate; // IRR is a property of the cashflows; compare to the central cost of capital
  const rng = makeRng(seed);
  const npvs: number[] = [];
  let positive = 0, aboveHurdle = 0;

  for (let i = 0; i < iterations; i++) {
    let scenario = base;
    for (const d of drivers) {
      const factor = Math.max(0, sample(specs[d]!, rng));
      scenario = applyDriver(scenario, d, factor);
    }
    const v = npv(scenario.rate, scenario.cashflows);
    npvs.push(v);
    if (v > 0) positive++;
    // IRR > hurdle. For a conventional cashflow (one sign change) this is exactly
    // NPV(hurdle) > 0 — cheap; only non-conventional flows need the full IRR scan.
    if (isConventional(scenario.cashflows)) {
      if (npv(hurdle, scenario.cashflows) > 0) aboveHurdle++;
    } else {
      const ir = irr(scenario.cashflows).irr;
      if (ir !== null && ir > hurdle) aboveHurdle++;
    }
  }

  npvs.sort((a, b) => a - b);
  return {
    iterations,
    seed,
    p10: round(percentile(npvs, 0.1)),
    p50: round(percentile(npvs, 0.5)),
    p90: round(percentile(npvs, 0.9)),
    mean: round(npvs.reduce((a, b) => a + b, 0) / npvs.length),
    probNpvPositive: round(positive / iterations, 4),
    probIrrAboveHurdle: round(aboveHurdle / iterations, 4),
    histogram: histogram(npvs, 20),
  };
}

// ---- seeded sampling (mulberry32 state threaded through a closure) ----------

interface Rng { next(): number; normal(): number; }
function makeRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = () => { const r = rngNext(state); state = r.state; return r.value; };
  let spare: number | null = null;
  const normal = () => {
    if (spare !== null) { const s = spare; spare = null; return s; }
    const u1 = Math.max(1e-12, next());
    const u2 = next();
    const mag = Math.sqrt(-2 * Math.log(u1));
    spare = mag * Math.sin(2 * Math.PI * u2);
    return mag * Math.cos(2 * Math.PI * u2);
  };
  return { next, normal };
}

function sample(spec: DistSpec, rng: Rng): number {
  switch (spec.dist) {
    case 'uniform': return spec.min + rng.next() * (spec.max - spec.min);
    case 'normal': return spec.mean + spec.sd * rng.normal();
    case 'triangular': return triangular(spec.min, spec.mode, spec.max, rng.next());
    case 'pert': return pert(spec.min, spec.mode, spec.max, rng);
  }
}

function triangular(min: number, mode: number, max: number, u: number): number {
  if (max <= min) return min;
  const fc = (mode - min) / (max - min);
  return u < fc
    ? min + Math.sqrt(u * (max - min) * (mode - min))
    : max - Math.sqrt((1 - u) * (max - min) * (max - mode));
}

/** Beta-PERT via two Gamma draws (Marsaglia–Tsang); PERT α,β are always ≥1. */
function pert(min: number, mode: number, max: number, rng: Rng): number {
  if (max <= min) return min;
  const a = 1 + 4 * (mode - min) / (max - min);
  const b = 1 + 4 * (max - mode) / (max - min);
  const ga = gamma(a, rng), gb = gamma(b, rng);
  const beta = ga / (ga + gb);
  return min + beta * (max - min);
}

function gamma(shape: number, rng: Rng): number {
  // shape >= 1 (guaranteed for PERT). Marsaglia–Tsang.
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (let i = 0; i < 1000; i++) {
    let x = rng.normal();
    let v = Math.pow(1 + c * x, 3);
    if (v <= 0) continue;
    const u = rng.next();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
  return d; // extremely unlikely fallback
}

// ---- stats helpers ---------------------------------------------------------

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 1) return sorted[0];
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
}

function histogram(sorted: number[], bins: number): { x0: number; x1: number; count: number }[] {
  const min = sorted[0], max = sorted[sorted.length - 1];
  if (max === min) return [{ x0: min, x1: max, count: sorted.length }];
  const w = (max - min) / bins;
  const out = Array.from({ length: bins }, (_, i) => ({ x0: round(min + i * w), x1: round(min + (i + 1) * w), count: 0 }));
  for (const v of sorted) {
    let b = Math.floor((v - min) / w);
    if (b >= bins) b = bins - 1;
    out[b].count++;
  }
  return out;
}

/** Conventional = exactly one sign change in the net series (⇒ a unique IRR). */
function isConventional(cashflows: CashflowRow[]): boolean {
  let changes = 0, prevSign = 0;
  for (const r of cashflows) {
    const s = Math.sign(r.net);
    if (s !== 0 && s !== prevSign && prevSign !== 0) changes++;
    if (s !== 0) prevSign = s;
  }
  return changes <= 1;
}

const unpack = (b: Base): [number, CashflowRow[]] => [b.rate, b.cashflows];
const round = (n: number, dp = 2): number => (Number.isFinite(n) ? Number(n.toFixed(dp)) : n);
