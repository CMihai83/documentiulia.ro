/**
 * Simulator v2 — pure tick engine (S-48 / SIM-1..SIM-4).
 *
 * applyTick(state, decisions, tickType) -> AdvanceResult is a PURE function:
 * no Date.now(), no Math.random() — time comes from the state's own clock and
 * all randomness flows through a mulberry32 PRNG whose state is persisted in
 * the state itself. Same state + same decisions => bit-identical output, which
 * is what makes replay, resume and (later) rewind trustworthy.
 */

import {
  AdvanceResult,
  CYCLE_DWELL,
  CYCLE_MULTIPLIERS,
  CYCLE_ORDER,
  CyclePhase,
  DECISION_CATALOG,
  DeferredEffect,
  FOCUS_PER_TICK,
  OperationalIssue,
  OperationalKind,
  SimDecision,
  SimParams,
  SimV2StateData,
  TICK_DAYS,
  TickLogEntry,
  TickType,
} from './simv2.types';

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32) — state is a uint32 carried inside SimV2StateData
// ---------------------------------------------------------------------------

export function rngNext(state: number): { value: number; state: number } {
  let a = (state + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, state: a };
}

/** Draw from the state's RNG, mutating draft.rngState (draft-local helper). */
function draw(draft: SimV2StateData): number {
  const { value, state } = rngNext(draft.rngState);
  draft.rngState = state;
  return value;
}

const round = (n: number, dp = 4): number => {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
};

// ---------------------------------------------------------------------------
// Scenario presets
// ---------------------------------------------------------------------------

const FLAT_SEASONALITY = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

export const SCENARIO_PRESETS: Record<string, SimParams> = {
  services: {
    industry: 'services',
    baseDailyDemand: 20,
    seasonality: [0.92, 0.95, 1.0, 1.02, 1.05, 1.02, 0.9, 0.85, 1.05, 1.1, 1.08, 1.06],
    trendAnnual: 0.03,
    noiseAmplitude: 0.02,
    unitPrice: 85,
    unitCost: 32,
    monthlySalary: 6500,
    fixedOpexDaily: 350,
    marketingDailySpend: 120,
    cashSaleShare: 0.4,
    collectionRatePerDay: 0.03,
    annualInterestRate: 0.09,
    delegationDailyCost: 45,
    delegationErrorRate: 0.1,
    issuesPerDay: 1.6,
  },
  retail: {
    industry: 'retail',
    baseDailyDemand: 60,
    seasonality: [0.8, 0.82, 0.9, 0.95, 1.0, 1.0, 0.95, 0.9, 1.0, 1.1, 1.25, 1.55],
    trendAnnual: 0.025,
    noiseAmplitude: 0.03,
    unitPrice: 45,
    unitCost: 27,
    monthlySalary: 5200,
    fixedOpexDaily: 500,
    marketingDailySpend: 180,
    cashSaleShare: 0.85,
    collectionRatePerDay: 0.06,
    annualInterestRate: 0.09,
    delegationDailyCost: 40,
    delegationErrorRate: 0.1,
    issuesPerDay: 2.2,
  },
  manufacturing: {
    industry: 'manufacturing',
    baseDailyDemand: 14,
    seasonality: [0.95, 0.97, 1.05, 1.08, 1.08, 1.05, 0.85, 0.7, 1.05, 1.1, 1.08, 1.0],
    trendAnnual: 0.02,
    noiseAmplitude: 0.025,
    unitPrice: 240,
    unitCost: 130,
    monthlySalary: 7200,
    fixedOpexDaily: 900,
    marketingDailySpend: 90,
    cashSaleShare: 0.2,
    collectionRatePerDay: 0.022,
    annualInterestRate: 0.09,
    delegationDailyCost: 55,
    delegationErrorRate: 0.1,
    issuesPerDay: 1.4,
  },
};

export function createInitialState(scenarioKey: string, seed: number): SimV2StateData {
  const params = SCENARIO_PRESETS[scenarioKey] ?? SCENARIO_PRESETS.services;
  const headcount = 6;
  // First dwell draw uses the raw seed so every run's cycle path is unique-but-replayable.
  const first = rngNext(seed >>> 0);
  const dwell = CYCLE_DWELL.EXPANSION;
  const state: SimV2StateData = {
    tick: 0,
    clock: { year: 1, month: 1, day: 1 },
    rngState: first.state,
    stocks: {
      cash: 45000,
      inventoryUnits: params.baseDailyDemand * 15,
      receivables: 18000,
      payables: 9000,
      debt: 20000,
      equity: 50000,
      capacity: params.baseDailyDemand * 1.15,
      headcount,
      backlogOrders: 0,
      customerBase: 100,
      brandEquity: 50,
      reputation: 50,
    },
    flows: { revenue: 0, cogs: 0, opex: 0, marketingSpend: params.marketingDailySpend, orderInflow: 0, interestExpense: 0 },
    aux: { morale: 70, productivity: 1.0, serviceQuality: 75, priceIndex: 1.0, marketShare: 5, utilization: 0, churnRate: 0.02 },
    focus: { granted: 0, spent: 0, delegations: [], openIssues: [] },
    pendingEffects: [],
    cycle: {
      phase: 'EXPANSION',
      ticksInPhase: 0,
      plannedDwell: Math.round(dwell.base + (first.value - 0.5) * 2 * dwell.spread),
    },
    params: { ...params, seasonality: [...params.seasonality] },
    lastTickLog: [],
    seq: 0,
  };
  // Open the first day's issues so the very first tick has something to triage.
  generateOpenIssues(state);
  return state;
}

// ---------------------------------------------------------------------------
// Cycle FSM + demand layers (SIM-4)
// ---------------------------------------------------------------------------

export function nextPhase(phase: CyclePhase): CyclePhase {
  const idx = CYCLE_ORDER.indexOf(phase);
  return CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length];
}

function stepCycle(draft: SimV2StateData, log: TickLogEntry[]): void {
  draft.cycle.ticksInPhase += 1;
  if (draft.cycle.ticksInPhase >= draft.cycle.plannedDwell) {
    const from = draft.cycle.phase;
    const to = nextPhase(from);
    const dwell = CYCLE_DWELL[to];
    draft.cycle = {
      phase: to,
      ticksInPhase: 0,
      plannedDwell: Math.max(15, Math.round(dwell.base + (draw(draft) - 0.5) * 2 * dwell.spread)),
    };
    log.push({ tick: draft.tick, kind: 'cycle', message: `Macro cycle shifted: ${from} → ${to}` });
  }
}

/** effective_demand = base × cycle × seasonality × trend × (1 + noise). */
export function effectiveDemand(draft: SimV2StateData): number {
  const p = draft.params;
  const cycleMult = CYCLE_MULTIPLIERS[draft.cycle.phase].demand;
  const season = p.seasonality[draft.clock.month - 1] ?? 1;
  const trend = Math.pow(1 + p.trendAnnual, draft.tick / 360);
  const noise = 1 + (draw(draft) - 0.5) * 2 * p.noiseAmplitude;
  // brand/customer effects deepen in SIM-6; a light brand pull keeps loops alive now
  const brandPull = 0.9 + (draft.stocks.brandEquity / 100) * 0.2;
  return p.baseDailyDemand * cycleMult * season * trend * noise * brandPull;
}

// ---------------------------------------------------------------------------
// Operational issues (SIM-3)
// ---------------------------------------------------------------------------

const ISSUE_KINDS: OperationalKind[] = ['CHASE_INVOICE', 'APPROVE_PO', 'DISCOUNT_TO_CLOSE'];

function generateOpenIssues(draft: SimV2StateData): void {
  const expected = draft.params.issuesPerDay;
  const count = Math.floor(expected) + (draw(draft) < expected % 1 ? 1 : 0);
  const issues: OperationalIssue[] = [];
  for (let i = 0; i < count; i++) {
    const kind = ISSUE_KINDS[Math.floor(draw(draft) * ISSUE_KINDS.length)];
    draft.seq += 1;
    issues.push({ id: `iss-${draft.seq}`, kind, tick: draft.tick });
  }
  draft.focus.openIssues = issues;
}

/** Apply the GOOD outcome of an operational issue (player-handled or delegated cleanly). */
function resolveIssueGood(draft: SimV2StateData, issue: OperationalIssue): void {
  const s = draft.stocks;
  switch (issue.kind) {
    case 'CHASE_INVOICE': {
      const collected = Math.min(s.receivables, 400);
      s.receivables = round(s.receivables - collected);
      s.cash = round(s.cash + collected);
      break;
    }
    case 'APPROVE_PO': {
      const units = 40;
      s.inventoryUnits = round(s.inventoryUnits + units);
      s.payables = round(s.payables + units * draft.params.unitCost);
      break;
    }
    case 'DISCOUNT_TO_CLOSE': {
      const units = Math.min(15, s.backlogOrders + 15);
      const revenue = units * draft.params.unitPrice * 0.88; // 12% discount
      s.cash = round(s.cash + revenue * draft.params.cashSaleShare);
      s.receivables = round(s.receivables + revenue * (1 - draft.params.cashSaleShare));
      draft.flows.revenue = round(draft.flows.revenue + revenue);
      break;
    }
  }
}

/** Apply the WORSE outcome — the price of ignoring the daily grind. */
function resolveIssueBad(draft: SimV2StateData, issue: OperationalIssue, log: TickLogEntry[]): void {
  const s = draft.stocks;
  switch (issue.kind) {
    case 'CHASE_INVOICE': {
      const writeOff = Math.min(s.receivables, 150);
      s.receivables = round(s.receivables - writeOff);
      log.push({ tick: draft.tick, kind: 'issue-auto', message: `Overdue invoice went bad — ${writeOff} RON written off` });
      break;
    }
    case 'APPROVE_PO': {
      draft.aux.serviceQuality = round(Math.max(0, draft.aux.serviceQuality - 0.5));
      s.backlogOrders = round(Math.max(0, s.backlogOrders - 10));
      log.push({ tick: draft.tick, kind: 'issue-auto', message: 'PO sat unapproved — stockout cost 10 backlog orders, service quality dipped' });
      break;
    }
    case 'DISCOUNT_TO_CLOSE': {
      s.backlogOrders = round(Math.max(0, s.backlogOrders - 8));
      s.reputation = round(Math.max(0, s.reputation - 0.2));
      log.push({ tick: draft.tick, kind: 'issue-auto', message: 'Deal at risk was lost — 8 orders gone, reputation dinged' });
      break;
    }
  }
}

/** Auto-resolve every still-open issue: delegated classes go well (minus error rate), the rest go badly. */
function autoResolveIssues(draft: SimV2StateData, log: TickLogEntry[]): void {
  for (const issue of draft.focus.openIssues) {
    if (draft.focus.delegations.includes(issue.kind)) {
      if (draw(draft) < draft.params.delegationErrorRate) {
        resolveIssueBad(draft, issue, log);
        log.push({ tick: draft.tick, kind: 'issue-auto', message: `Delegated ${issue.kind} was fumbled (delegation error)` });
      } else {
        resolveIssueGood(draft, issue);
      }
    } else {
      resolveIssueBad(draft, issue, log);
    }
  }
  draft.focus.openIssues = [];
}

// ---------------------------------------------------------------------------
// Decisions (SIM-2 / SIM-3)
// ---------------------------------------------------------------------------

function pushEffect(draft: SimV2StateData, e: Omit<DeferredEffect, 'id'>): void {
  draft.seq += 1;
  draft.pendingEffects.push({ ...e, id: `eff-${draft.seq}` });
}

function applyDecisions(draft: SimV2StateData, decisions: SimDecision[], log: TickLogEntry[]): void {
  for (const d of decisions) {
    const spec = DECISION_CATALOG[d.key];
    draft.focus.spent += spec.focusCost;
    switch (d.key) {
      case 'RESOLVE_ISSUE': {
        const idx = draft.focus.openIssues.findIndex((i) => i.id === d.params?.issueId);
        if (idx === -1) throw new Error(`Unknown or already-handled issue: ${d.params?.issueId}`);
        const [issue] = draft.focus.openIssues.splice(idx, 1);
        resolveIssueGood(draft, issue);
        log.push({ tick: draft.tick, kind: 'decision', message: `Handled ${issue.kind}` });
        break;
      }
      case 'HIRE': {
        draft.stocks.headcount += 1; // salary hits opex from today
        const capacityPerHead = draft.stocks.capacity / Math.max(1, draft.stocks.headcount - 1);
        pushEffect(draft, {
          sourceDecision: 'HIRE',
          resolveAtTick: draft.tick + 56, // 8-week onboarding ramp
          effectKey: 'HIRE_RAMP_COMPLETE',
          delta: round(capacityPerHead),
          description: 'New hire fully productive',
          visibleHint: `New hire ramps up — +${round(capacityPerHead, 1)} units/day capacity in 8 weeks`,
        });
        log.push({ tick: draft.tick, kind: 'decision', message: 'Hired 1 employee (salary now, capacity in 8 weeks)' });
        break;
      }
      case 'RAISE_MARKETING': {
        const amount = d.params?.amount ?? Math.round(draft.flows.marketingSpend * 0.3);
        draft.flows.marketingSpend = round(draft.flows.marketingSpend + amount);
        pushEffect(draft, {
          sourceDecision: 'RAISE_MARKETING',
          resolveAtTick: draft.tick + 21,
          target: 'stocks.brandEquity',
          delta: round(Math.min(8, amount / 25)),
          description: 'Marketing push lands',
          visibleHint: 'Brand lift from the marketing push arrives in ~3 weeks',
        });
        log.push({ tick: draft.tick, kind: 'decision', message: `Raised marketing by ${amount}/day` });
        break;
      }
      case 'CUT_MARKETING': {
        const amount = d.params?.amount ?? Math.round(draft.flows.marketingSpend * 0.3);
        const cutShare = draft.flows.marketingSpend > 0 ? amount / draft.flows.marketingSpend : 0;
        draft.flows.marketingSpend = round(Math.max(0, draft.flows.marketingSpend - amount));
        pushEffect(draft, {
          sourceDecision: 'CUT_MARKETING',
          resolveAtTick: draft.tick + 42, // the dip lands ~6 weeks later
          effectKey: 'MARKETING_DECAY',
          delta: round(cutShare, 4),
          description: 'Demand decay from the marketing cut',
          visibleHint: 'Sales pipeline thins ~6 weeks after the marketing cut',
        });
        log.push({ tick: draft.tick, kind: 'decision', message: `Cut marketing by ${amount}/day — consequences in ~6 weeks` });
        break;
      }
      case 'PLAN': {
        pushEffect(draft, {
          sourceDecision: 'PLAN',
          resolveAtTick: draft.tick + 14,
          effectKey: 'PLAN_PAYOFF',
          delta: 0.02,
          description: 'Planning pays off (+productivity)',
          visibleHint: 'Productivity bump from planning lands in 2 weeks',
        });
        log.push({ tick: draft.tick, kind: 'decision', message: 'Ran strategic planning session' });
        break;
      }
      case 'PROCESS_IMPROVEMENT': {
        draft.stocks.cash = round(draft.stocks.cash - 2000);
        pushEffect(draft, {
          sourceDecision: 'PROCESS_IMPROVEMENT',
          resolveAtTick: draft.tick + 28,
          effectKey: 'PROCESS_IMPROVEMENT',
          delta: 0.95,
          description: 'Process improvement cuts fixed opex 5%',
          visibleHint: 'Fixed-cost reduction from process work lands in 4 weeks',
        });
        log.push({ tick: draft.tick, kind: 'decision', message: 'Invested 2,000 RON in process improvement' });
        break;
      }
      case 'DELEGATE': {
        const cls = d.params?.class;
        if (!cls) throw new Error('DELEGATE requires params.class');
        if (!draft.focus.delegations.includes(cls)) draft.focus.delegations.push(cls);
        log.push({ tick: draft.tick, kind: 'decision', message: `Delegated ${cls} (auto-handled from now, ${draft.params.delegationDailyCost} RON/day)` });
        break;
      }
    }
  }
}

export function validateDecisions(state: SimV2StateData, decisions: SimDecision[], tickType: TickType): void {
  let cost = 0;
  for (const d of decisions) {
    const spec = DECISION_CATALOG[d.key];
    if (!spec) throw new Error(`Unknown decision: ${(d as any).key}`);
    cost += spec.focusCost;
  }
  const granted = FOCUS_PER_TICK[tickType];
  if (cost > granted) {
    throw new Error(`Focus budget exceeded: decisions cost ${cost}, only ${granted} Focus available this ${tickType} tick`);
  }
}

// ---------------------------------------------------------------------------
// Deferred effects (SIM-2)
// ---------------------------------------------------------------------------

function setByPath(draft: SimV2StateData, path: string, delta: number): void {
  const [group, field] = path.split('.');
  const target = (draft as any)[group];
  if (!target || typeof target[field] !== 'number') throw new Error(`Bad effect target: ${path}`);
  target[field] = round(target[field] + delta);
}

function resolveDueEffects(draft: SimV2StateData, log: TickLogEntry[]): DeferredEffect[] {
  const due = draft.pendingEffects.filter((e) => e.resolveAtTick <= draft.tick);
  if (!due.length) return [];
  draft.pendingEffects = draft.pendingEffects.filter((e) => e.resolveAtTick > draft.tick);
  for (const e of due) {
    switch (e.effectKey) {
      case 'HIRE_RAMP_COMPLETE':
        draft.stocks.capacity = round(draft.stocks.capacity + (e.delta ?? 0));
        draft.aux.productivity = round(draft.aux.productivity + 0.01);
        break;
      case 'MARKETING_DECAY': {
        const cutShare = e.delta ?? 0;
        draft.stocks.customerBase = round(draft.stocks.customerBase * (1 - 0.15 * cutShare));
        draft.stocks.brandEquity = round(Math.max(0, draft.stocks.brandEquity - 6 * cutShare));
        break;
      }
      case 'PLAN_PAYOFF':
        draft.aux.productivity = round(draft.aux.productivity + (e.delta ?? 0.02));
        break;
      case 'PROCESS_IMPROVEMENT':
        draft.params.fixedOpexDaily = round(draft.params.fixedOpexDaily * (e.delta ?? 0.95));
        break;
      default:
        if (e.target) setByPath(draft, e.target, e.delta ?? 0);
    }
    log.push({ tick: draft.tick, kind: 'effect-resolved', message: e.description });
  }
  return due;
}

// ---------------------------------------------------------------------------
// Daily economic step (light coupling now; the full 5-loop model is SIM-6)
// ---------------------------------------------------------------------------

function dailyStep(draft: SimV2StateData, log: TickLogEntry[]): DeferredEffect[] {
  const p = draft.params;
  const s = draft.stocks;
  const cycleMults = CYCLE_MULTIPLIERS[draft.cycle.phase];

  // advance calendar first so tick N maps to day N
  draft.tick += 1;
  draft.clock.day += 1;
  if (draft.clock.day > 30) {
    draft.clock.day = 1;
    draft.clock.month += 1;
    if (draft.clock.month > 12) {
      draft.clock.month = 1;
      draft.clock.year += 1;
    }
  }

  stepCycle(draft, log);

  // demand → orders → fulfillment (capacity- and inventory-bound)
  const demand = effectiveDemand(draft);
  s.backlogOrders = round(s.backlogOrders + demand);
  const producible = s.capacity * draft.aux.productivity;
  const fulfilled = Math.min(s.backlogOrders, producible, s.inventoryUnits);
  s.backlogOrders = round(s.backlogOrders - fulfilled);
  s.inventoryUnits = round(s.inventoryUnits - fulfilled);
  draft.aux.utilization = round(producible > 0 ? fulfilled / producible : 0, 4);

  // money
  const revenue = fulfilled * p.unitPrice * draft.aux.priceIndex;
  const cogs = fulfilled * p.unitCost * cycleMults.inputCosts;
  const salaries = (s.headcount * p.monthlySalary) / 30;
  const delegationCost = draft.focus.delegations.length * p.delegationDailyCost;
  const opex = salaries + p.fixedOpexDaily + draft.flows.marketingSpend + delegationCost;
  const interest = (s.debt * p.annualInterestRate * cycleMults.interestRate) / 360;

  s.cash = round(s.cash + revenue * p.cashSaleShare - cogs - opex - interest);
  s.receivables = round(s.receivables + revenue * (1 - p.cashSaleShare));
  const collected = round(s.receivables * p.collectionRatePerDay);
  s.receivables = round(s.receivables - collected);
  s.cash = round(s.cash + collected);
  // payables settle on the same daily rhythm
  const paid = round(s.payables * 0.04);
  s.payables = round(s.payables - paid);
  s.cash = round(s.cash - paid);

  draft.flows.revenue = round(revenue);
  draft.flows.cogs = round(cogs);
  draft.flows.opex = round(opex);
  draft.flows.orderInflow = round(demand);
  draft.flows.interestExpense = round(interest, 6);

  // solvency guardrail (full death-spiral loop lands in SIM-6)
  if (s.cash < 0) {
    const borrow = round(-s.cash + 1000);
    s.debt = round(s.debt + borrow);
    s.cash = round(s.cash + borrow);
    log.push({ tick: draft.tick, kind: 'guardrail', message: `Cash ran out — emergency credit line drawn: ${borrow} RON at penalty terms` });
  }

  // gentle inventory replenishment pressure: backlog starves service quality
  if (s.backlogOrders > producible * 3) {
    draft.aux.serviceQuality = round(Math.max(0, draft.aux.serviceQuality - 0.1));
  }

  return resolveDueEffects(draft, log);
}

// ---------------------------------------------------------------------------
// The reducer (SIM-1)
// ---------------------------------------------------------------------------

export function applyTick(state: SimV2StateData, decisions: SimDecision[], tickType: TickType): AdvanceResult {
  validateDecisions(state, decisions, tickType);

  const draft: SimV2StateData = JSON.parse(JSON.stringify(state));
  const log: TickLogEntry[] = [];
  const days = TICK_DAYS[tickType];

  draft.focus.granted = FOCUS_PER_TICK[tickType];
  draft.focus.spent = 0;

  // Day 1: the player acts on the issues telegraphed at the end of last tick.
  applyDecisions(draft, decisions, log);
  autoResolveIssues(draft, log);

  const resolved: DeferredEffect[] = [];
  for (let d = 0; d < days; d++) {
    resolved.push(...dailyStep(draft, log));
    // Intermediate days of coarse ticks: issues arise and are auto-triaged —
    // less granular play = less operational control (the SIM-3 trade-off).
    if (d < days - 1) {
      generateOpenIssues(draft);
      autoResolveIssues(draft, log);
    }
  }

  // Telegraph the next tick's operational issues.
  generateOpenIssues(draft);

  draft.lastTickLog = log.slice(-40);
  return { state: draft, resolvedEffects: resolved, log };
}
