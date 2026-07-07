/**
 * Simulator v2 core types (S-48 / SIM-1..SIM-4).
 *
 * The whole simulation state is one JSON-serializable object advanced by the
 * pure reducer in simv2.engine.ts. Time is counted in DAY ticks (the canonical
 * unit); a week tick advances 7 days, a month tick 30 (fixed 360-day sim year
 * for determinism). Randomness is a seeded PRNG whose state lives IN the state,
 * so replay and resume are bit-identical.
 */

export type TickType = 'day' | 'week' | 'month';

export const TICK_DAYS: Record<TickType, number> = { day: 1, week: 7, month: 30 };

/** Focus granted per applyTick call, by tick granularity (SIM-3). */
export const FOCUS_PER_TICK: Record<TickType, number> = { day: 5, week: 15, month: 40 };

// ---------------------------------------------------------------------------
// State model (stocks / flows / auxiliaries — SIM-6 deepens the coupling)
// ---------------------------------------------------------------------------

export interface Stocks {
  cash: number;
  inventoryUnits: number;
  receivables: number;
  payables: number;
  debt: number;
  equity: number;
  capacity: number; // units producible per day
  headcount: number;
  backlogOrders: number; // units ordered, not yet fulfilled
  customerBase: number;
  brandEquity: number; // 0-100
  reputation: number; // 0-100
}

/** Per-tick rates (recomputed every tick; last tick's values kept for display). */
export interface Flows {
  revenue: number;
  cogs: number;
  opex: number;
  marketingSpend: number;
  orderInflow: number;
  interestExpense: number;
}

export interface Auxiliaries {
  morale: number; // 0-100
  productivity: number; // multiplier ~1.0
  serviceQuality: number; // 0-100
  priceIndex: number; // 1.0 = list price
  marketShare: number; // 0-100
  utilization: number; // 0-1
  churnRate: number; // 0-1 per month
}

// ---------------------------------------------------------------------------
// Deferred effects (SIM-2)
// ---------------------------------------------------------------------------

export interface DeferredEffect {
  id: string;
  sourceDecision: string;
  /** Absolute day-tick at which the effect lands. */
  resolveAtTick: number;
  /** Dot-path into the state for simple deltas, e.g. "stocks.capacity". */
  target?: string;
  delta?: number;
  /** Named effect handled by the engine (for non-linear effects). */
  effectKey?: 'HIRE_RAMP_COMPLETE' | 'MARKETING_DECAY' | 'PROCESS_IMPROVEMENT' | 'PLAN_PAYOFF';
  description: string;
  /** Shown in the pending-consequences ledger; telegraphs the delayed outcome. */
  visibleHint: string;
}

// ---------------------------------------------------------------------------
// Focus / operational issues (SIM-3)
// ---------------------------------------------------------------------------

export type OperationalKind = 'CHASE_INVOICE' | 'APPROVE_PO' | 'DISCOUNT_TO_CLOSE';

export interface OperationalIssue {
  id: string;
  kind: OperationalKind;
  /** Day-tick the issue appeared. Unhandled issues auto-resolve WORSE at tick end. */
  tick: number;
}

export interface FocusState {
  /** Focus granted for the current applyTick call. */
  granted: number;
  spent: number;
  /** Operational classes delegated to staff/automation (auto-resolved at a small error rate). */
  delegations: OperationalKind[];
  /** Issues open during this tick (regenerated each tick). */
  openIssues: OperationalIssue[];
}

// ---------------------------------------------------------------------------
// Macro cycle + seasonality (SIM-4)
// ---------------------------------------------------------------------------

export type CyclePhase = 'EXPANSION' | 'PEAK' | 'RECESSION' | 'TROUGH' | 'RECOVERY';

export const CYCLE_ORDER: CyclePhase[] = ['EXPANSION', 'PEAK', 'RECESSION', 'TROUGH', 'RECOVERY'];

export interface CycleMultipliers {
  demand: number;
  inputCosts: number;
  interestRate: number;
  hiringMarket: number; // >1 = easier hiring
}

export const CYCLE_MULTIPLIERS: Record<CyclePhase, CycleMultipliers> = {
  EXPANSION: { demand: 1.05, inputCosts: 1.0, interestRate: 1.0, hiringMarket: 1.0 },
  PEAK: { demand: 1.12, inputCosts: 1.08, interestRate: 1.15, hiringMarket: 0.85 },
  RECESSION: { demand: 0.85, inputCosts: 1.02, interestRate: 1.25, hiringMarket: 1.2 },
  TROUGH: { demand: 0.75, inputCosts: 0.95, interestRate: 1.1, hiringMarket: 1.35 },
  RECOVERY: { demand: 0.95, inputCosts: 0.97, interestRate: 0.95, hiringMarket: 1.15 },
};

/** Base dwell (days) per phase; actual dwell = base ± spread via seeded RNG. */
export const CYCLE_DWELL: Record<CyclePhase, { base: number; spread: number }> = {
  EXPANSION: { base: 240, spread: 90 },
  PEAK: { base: 90, spread: 45 },
  RECESSION: { base: 180, spread: 75 },
  TROUGH: { base: 90, spread: 40 },
  RECOVERY: { base: 150, spread: 60 },
};

export interface CycleState {
  phase: CyclePhase;
  ticksInPhase: number;
  /** Stochastic dwell chosen (seeded) when the phase was entered. */
  plannedDwell: number;
}

// ---------------------------------------------------------------------------
// Tunable parameters (per-industry presets; SIM-9 calibrates from real ERP)
// ---------------------------------------------------------------------------

export interface SimParams {
  industry: string;
  /** Base daily demand in units at tick 0. */
  baseDailyDemand: number;
  /** 12-month seasonality vector (index 0 = January), mean ≈ 1.0. */
  seasonality: number[];
  /** Secular annual growth trend, e.g. 0.03 = +3%/year. */
  trendAnnual: number;
  /** ± amplitude of per-tick demand noise (seeded), e.g. 0.02. */
  noiseAmplitude: number;
  unitPrice: number;
  unitCost: number;
  monthlySalary: number;
  /** Fixed opex per day (rent, utilities…). */
  fixedOpexDaily: number;
  marketingDailySpend: number;
  /** Share of revenue collected as cash immediately; rest becomes receivables. */
  cashSaleShare: number;
  /** Share of outstanding receivables collected per day. */
  collectionRatePerDay: number;
  annualInterestRate: number;
  /** Cash cost per day of one delegated operational class. */
  delegationDailyCost: number;
  /** Probability a delegated issue is fumbled (bad path) — small error rate. */
  delegationErrorRate: number;
  /** Expected operational issues per day-tick (scales with tick length). */
  issuesPerDay: number;

  // --- SIM-6 feedback-loop coefficients (optional; engine defaults if unset) ---
  /** Demand price elasticity (higher = more volume lost per price rise). */
  priceElasticity?: number;
  /** Morale points gained/lost per day toward its equilibrium given utilization. */
  moraleAdjustRate?: number;
  /** Productivity gained/lost per day per point of morale above/below 60. */
  productivityFromMorale?: number;
  /** Attrition (headcount loss) probability per day when morale is very low. */
  attritionFromMorale?: number;
  /** Extra churn per day when backlog exceeds capacity (lead-time pain). */
  churnFromBacklog?: number;
  /** Daily brand-equity decay toward 0 (offset by marketing). */
  brandDecayDaily?: number;
}

// ---------------------------------------------------------------------------
// Decisions (SIM-2 / SIM-3)
// ---------------------------------------------------------------------------

export type DecisionKey =
  // operational fire-fights (immediate, small payoff)
  | 'RESOLVE_ISSUE'
  // strategic (pay later via DeferredEffects)
  | 'HIRE'
  | 'RAISE_MARKETING'
  | 'CUT_MARKETING'
  | 'PLAN'
  | 'PROCESS_IMPROVEMENT'
  | 'DELEGATE';

export interface SimDecision {
  key: DecisionKey;
  params?: {
    issueId?: string;
    class?: OperationalKind;
    amount?: number;
  };
}

export interface DecisionSpec {
  key: DecisionKey;
  focusCost: number;
  kind: 'operational' | 'strategic';
  description: string;
}

export const DECISION_CATALOG: Record<DecisionKey, DecisionSpec> = {
  RESOLVE_ISSUE: { key: 'RESOLVE_ISSUE', focusCost: 1, kind: 'operational', description: 'Handle an operational fire (invoice chase, PO approval, deal rescue)' },
  HIRE: { key: 'HIRE', focusCost: 2, kind: 'strategic', description: 'Hire an employee — salary starts now, productivity after an 8-week ramp' },
  RAISE_MARKETING: { key: 'RAISE_MARKETING', focusCost: 1, kind: 'strategic', description: 'Increase daily marketing spend (demand builds with a lag)' },
  CUT_MARKETING: { key: 'CUT_MARKETING', focusCost: 1, kind: 'strategic', description: 'Cut daily marketing spend — saves cash now, demand decays ~6 weeks later' },
  PLAN: { key: 'PLAN', focusCost: 2, kind: 'strategic', description: 'Strategic planning — small productivity payoff in 2 weeks' },
  PROCESS_IMPROVEMENT: { key: 'PROCESS_IMPROVEMENT', focusCost: 3, kind: 'strategic', description: 'Invest in process improvement — opex reduction in 4 weeks' },
  DELEGATE: { key: 'DELEGATE', focusCost: 2, kind: 'strategic', description: 'Delegate an operational class to staff/automation (daily cost, small error rate, frees Focus)' },
};

// ---------------------------------------------------------------------------
// The whole state
// ---------------------------------------------------------------------------

export interface SimClock {
  year: number;
  month: number; // 1-12
  day: number; // 1-30 (fixed 30-day months)
}

export interface TickLogEntry {
  tick: number;
  kind: 'decision' | 'effect-resolved' | 'issue-auto' | 'cycle' | 'guardrail' | 'event' | 'hint';
  message: string;
}

// ---------------------------------------------------------------------------
// Data-driven events (SIM-5)
// ---------------------------------------------------------------------------

export type EventCategory = 'supply' | 'competitor' | 'regulatory' | 'demand' | 'hr' | 'fx' | 'finance';

/** A temporary multiplier/addend applied to a named KPI for a number of ticks. */
export interface EventModifier {
  targetKpi: 'demand' | 'inputCosts' | 'churn' | 'serviceQuality' | 'productivity' | 'interestRate';
  mult?: number;
  add?: number;
  durationTicks: number;
}

export interface ActiveModifier extends EventModifier {
  id: string;
  eventId: string;
  expiresAtTick: number;
}

export interface EventCondition {
  /** state.stocks.cash | aux.marketShare | cycle.phase | clock.day | tick */
  field: string;
  op: 'lt' | 'gt' | 'eq' | 'mod';
  value: number;
}

export interface EventChoiceEffect {
  target?: string; // dot-path e.g. "stocks.cash"
  delta?: number;
}

export interface EventChoice {
  label: string;
  cost?: number; // cash cost, applied on choose
  effects?: EventChoiceEffect[];
  modifiers?: EventModifier[];
}

export interface SimEventTrigger {
  type: 'random' | 'scripted' | 'conditional';
  baseProbPerTick?: number; // random
  conditions?: EventCondition[]; // conditional (all must hold)
  scriptedTicks?: number[]; // scripted (absolute day ticks)
  monthlyDay?: number; // scripted-monthly: fires on clock.day == monthlyDay
}

export interface SimEventDef {
  id: string;
  title: string;
  category: EventCategory;
  telegraph: string; // hint text shown telegraphTicks before firing
  telegraphTicks: number; // 0 = fires immediately, no telegraph
  trigger: SimEventTrigger;
  /** Auto-applied modifiers/effects when the event fires (default outcome). */
  modifiers?: EventModifier[];
  effects?: EventChoiceEffect[];
  /** Optional player choices (surfaced via the pending-events endpoint). */
  choices?: EventChoice[];
  /** Multiply baseProbPerTick by phase weight (default 1). */
  weightByPhase?: Partial<Record<CyclePhase, number>>;
  cooldownTicks: number;
  once?: boolean;
  isBad?: boolean; // bad events get telegraphed; drives UI severity
}

/** A fired event awaiting a player choice (surfaced to the controller). */
export interface PendingEvent {
  eventId: string;
  title: string;
  category: EventCategory;
  firedAtTick: number;
  choices: EventChoice[];
}

export interface SimV2StateData {
  tick: number; // day index since start
  clock: SimClock;
  /** PRNG state (mulberry32) — persisted so replay/resume are identical. */
  rngState: number;
  stocks: Stocks;
  flows: Flows;
  aux: Auxiliaries;
  focus: FocusState;
  pendingEffects: DeferredEffect[];
  cycle: CycleState;
  params: SimParams;
  // --- events (SIM-5) ---
  activeModifiers: ActiveModifier[];
  /** eventId -> day-tick before which it cannot fire again (cooldown). */
  eventCooldowns: Record<string, number>;
  /** Telegraphed events awaiting their fire tick. */
  telegraphed: { eventId: string; fireAtTick: number }[];
  /** once-only events that have already fired. */
  firedOnce: string[];
  /** Fired events awaiting a player choice (default outcome already applied). */
  pendingEventChoices: PendingEvent[];
  /** What happened last tick (bounded; UI shows it as the tick narrative). */
  lastTickLog: TickLogEntry[];
  /** Monotonic id counter for engine-generated ids (deterministic). */
  seq: number;
}

export interface AdvanceResult {
  state: SimV2StateData;
  resolvedEffects: DeferredEffect[];
  log: TickLogEntry[];
}
