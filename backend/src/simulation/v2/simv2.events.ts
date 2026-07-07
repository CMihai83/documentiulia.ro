/**
 * Simulator v2 — data-driven market events (SIM-5).
 *
 * Events are declarative rows (no code) evaluated each DAY tick by the PURE
 * evaluator below. Probability uses the engine's seeded PRNG (passed in as
 * `drawFn`) so event timing is replay-identical. Bad events are telegraphed
 * `telegraphTicks` days early so preparedness (cash buffers, etc.) can mitigate.
 * Effects are either immediate (dot-path deltas) or temporary KPI modifiers that
 * decay after `durationTicks`.
 */

import {
  ActiveModifier,
  EventCondition,
  PendingEvent,
  SimEventDef,
  SimV2StateData,
  TickLogEntry,
} from './simv2.types';

export const EVENT_CATALOG: SimEventDef[] = [
  {
    id: 'VAT_CHANGE',
    title: 'VAT rate change (Legea 141) — 19% → 21%',
    category: 'regulatory',
    telegraph: 'ANAF signals a VAT increase taking effect soon — review pricing.',
    telegraphTicks: 5,
    trigger: { type: 'scripted', scriptedTicks: [120] },
    modifiers: [{ targetKpi: 'inputCosts', mult: 1.02, durationTicks: 9999 }],
    choices: [
      { label: 'Absorb it (protect volume)', modifiers: [{ targetKpi: 'demand', mult: 1.0, durationTicks: 1 }] },
      { label: 'Pass it to customers', effects: [{ target: 'aux.priceIndex', delta: 0.02 }], modifiers: [{ targetKpi: 'demand', mult: 0.96, durationTicks: 30 }] },
    ],
    cooldownTicks: 9999,
    once: true,
    isBad: true,
  },
  {
    id: 'SUPPLY_SHOCK',
    title: 'Key supplier disruption',
    category: 'supply',
    telegraph: 'A key supplier warns of disruption — input costs may spike.',
    telegraphTicks: 2,
    trigger: { type: 'random', baseProbPerTick: 0.004 },
    weightByPhase: { RECESSION: 2.5, TROUGH: 2.0, EXPANSION: 0.6, PEAK: 0.6 },
    modifiers: [{ targetKpi: 'inputCosts', mult: 1.3, durationTicks: 30 }],
    cooldownTicks: 120,
    isBad: true,
  },
  {
    id: 'NEW_COMPETITOR',
    title: 'A new competitor enters your market',
    category: 'competitor',
    telegraph: 'Market chatter: a well-funded competitor is eyeing your segment.',
    telegraphTicks: 3,
    trigger: { type: 'conditional', conditions: [{ field: 'aux.marketShare', op: 'gt', value: 30 }], baseProbPerTick: 0.02 },
    modifiers: [{ targetKpi: 'demand', mult: 0.85, durationTicks: 90 }],
    cooldownTicks: 240,
    isBad: true,
  },
  {
    id: 'DEMAND_SPIKE',
    title: 'Viral demand surge',
    category: 'demand',
    telegraph: '',
    telegraphTicks: 0,
    trigger: { type: 'random', baseProbPerTick: 0.003 },
    weightByPhase: { EXPANSION: 2.0, PEAK: 1.6, RECESSION: 0.3, TROUGH: 0.2 },
    modifiers: [{ targetKpi: 'demand', mult: 1.5, durationTicks: 14 }],
    cooldownTicks: 90,
    isBad: false,
  },
  {
    id: 'KEY_EMPLOYEE_QUITS',
    title: 'A key employee resigns',
    category: 'hr',
    telegraph: 'Morale is low and a key employee looks like a flight risk.',
    telegraphTicks: 2,
    trigger: { type: 'conditional', conditions: [{ field: 'aux.morale', op: 'lt', value: 40 }], baseProbPerTick: 0.05 },
    effects: [{ target: 'stocks.headcount', delta: -1 }, { target: 'stocks.capacity', delta: -8 }],
    modifiers: [{ targetKpi: 'productivity', mult: 0.95, durationTicks: 21 }],
    cooldownTicks: 120,
    isBad: true,
  },
  {
    id: 'FX_MOVE',
    title: 'RON/EUR moves against you',
    category: 'fx',
    telegraph: '',
    telegraphTicks: 0,
    trigger: { type: 'random', baseProbPerTick: 0.006 },
    modifiers: [{ targetKpi: 'inputCosts', mult: 1.08, durationTicks: 20 }],
    cooldownTicks: 45,
    isBad: true,
  },
  {
    id: 'RATE_HIKE',
    title: 'Central-bank interest-rate hike',
    category: 'finance',
    telegraph: 'Rate-hike expectations are building.',
    telegraphTicks: 3,
    trigger: { type: 'conditional', conditions: [{ field: 'stocks.debt', op: 'gt', value: 5000 }], baseProbPerTick: 0.01 },
    weightByPhase: { PEAK: 2.0, RECESSION: 1.5 },
    modifiers: [{ targetKpi: 'interestRate', mult: 1.2, durationTicks: 90 }],
    cooldownTicks: 180,
    isBad: true,
  },
  {
    id: 'ANAF_D406_DEADLINE',
    title: 'ANAF D406 (SAF-T) filing due',
    category: 'regulatory',
    telegraph: 'The monthly D406 SAF-T submission is due in a few days.',
    telegraphTicks: 3,
    trigger: { type: 'scripted', monthlyDay: 25 },
    choices: [
      { label: 'File on time (spend a little)', cost: 200 },
      { label: 'Risk a late filing', effects: [{ target: 'aux.reputation', delta: -1 }], modifiers: [{ targetKpi: 'serviceQuality', add: -1, durationTicks: 10 }] },
    ],
    cooldownTicks: 20,
    isBad: false,
  },
  {
    id: 'DEMAND_SLUMP',
    title: 'Sector-wide demand slump',
    category: 'demand',
    telegraph: 'Demand indicators are turning down across the sector.',
    telegraphTicks: 2,
    trigger: { type: 'random', baseProbPerTick: 0.004 },
    weightByPhase: { RECESSION: 3.0, TROUGH: 2.5, EXPANSION: 0.2, PEAK: 0.3 },
    modifiers: [{ targetKpi: 'demand', mult: 0.8, durationTicks: 45 }],
    cooldownTicks: 120,
    isBad: true,
  },
];

const EVENT_BY_ID: Record<string, SimEventDef> = Object.fromEntries(EVENT_CATALOG.map((e) => [e.id, e]));

/** Combined multiplier + addend currently applied to a KPI by active modifiers. */
export function kpiModifier(draft: SimV2StateData, kpi: ActiveModifier['targetKpi']): { mult: number; add: number } {
  let mult = 1;
  let add = 0;
  for (const m of draft.activeModifiers) {
    if (m.targetKpi !== kpi) continue;
    if (m.mult !== undefined) mult *= m.mult;
    if (m.add !== undefined) add += m.add;
  }
  return { mult, add };
}

function readField(draft: SimV2StateData, field: string): number {
  const [g, f] = field.split('.');
  const grp = (draft as any)[g];
  const v = f ? grp?.[f] : grp;
  return typeof v === 'number' ? v : (g === 'tick' ? draft.tick : NaN);
}

function conditionHolds(draft: SimV2StateData, c: EventCondition): boolean {
  const v = c.field === 'tick' ? draft.tick : readField(draft, c.field);
  if (Number.isNaN(v)) return false;
  switch (c.op) {
    case 'lt': return v < c.value;
    case 'gt': return v > c.value;
    case 'eq': return v === c.value;
    case 'mod': return v % c.value === 0;
  }
}

function onCooldown(draft: SimV2StateData, ev: SimEventDef): boolean {
  return (draft.eventCooldowns[ev.id] ?? 0) > draft.tick || (!!ev.once && draft.firedOnce.includes(ev.id));
}

/** Apply an event's default outcome (modifiers + immediate effects) and record it. */
function fireEvent(
  draft: SimV2StateData,
  ev: SimEventDef,
  round: (n: number, dp?: number) => number,
  log: TickLogEntry[],
): void {
  for (const m of ev.modifiers ?? []) {
    draft.seq += 1;
    draft.activeModifiers.push({ ...m, id: `mod-${draft.seq}`, eventId: ev.id, expiresAtTick: draft.tick + m.durationTicks });
  }
  for (const e of ev.effects ?? []) {
    if (e.target && e.delta !== undefined) {
      const [g, f] = e.target.split('.');
      const grp = (draft as any)[g];
      if (grp && typeof grp[f] === 'number') grp[f] = round(grp[f] + e.delta);
    }
  }
  draft.eventCooldowns[ev.id] = draft.tick + ev.cooldownTicks;
  if (ev.once) draft.firedOnce.push(ev.id);
  if (ev.choices?.length) {
    draft.pendingEventChoices.push({ eventId: ev.id, title: ev.title, category: ev.category, firedAtTick: draft.tick, choices: ev.choices });
  }
  log.push({ tick: draft.tick, kind: 'event', message: `Event: ${ev.title}` });
}

/**
 * Evaluate events for the current day tick. Order:
 *  1) expire modifiers past their window,
 *  2) fire any telegraphed events now due,
 *  3) test each catalog event's trigger; bad events with telegraphTicks>0 get
 *     scheduled + a hint, others fire immediately.
 */
export function evaluateEvents(
  draft: SimV2StateData,
  drawFn: (d: SimV2StateData) => number,
  round: (n: number, dp?: number) => number,
  log: TickLogEntry[],
  maxSimultaneous = 2,
): void {
  // 1) expire
  draft.activeModifiers = draft.activeModifiers.filter((m) => m.expiresAtTick > draft.tick);

  let firedThisTick = 0;

  // 2) telegraphed events now due
  const dueTele = draft.telegraphed.filter((t) => t.fireAtTick <= draft.tick);
  draft.telegraphed = draft.telegraphed.filter((t) => t.fireAtTick > draft.tick);
  for (const t of dueTele) {
    const ev = EVENT_BY_ID[t.eventId];
    if (ev && firedThisTick < maxSimultaneous) { fireEvent(draft, ev, round, log); firedThisTick++; }
  }

  // 3) trigger evaluation
  for (const ev of EVENT_CATALOG) {
    if (firedThisTick >= maxSimultaneous) break;
    if (onCooldown(draft, ev)) continue;
    if (draft.telegraphed.some((t) => t.eventId === ev.id)) continue; // already scheduled

    let hit = false;
    const tr = ev.trigger;
    if (tr.type === 'scripted') {
      hit = (tr.scriptedTicks?.includes(draft.tick) ?? false) || (tr.monthlyDay !== undefined && draft.clock.day === tr.monthlyDay);
    } else if (tr.type === 'conditional') {
      const condsOk = (tr.conditions ?? []).every((c) => conditionHolds(draft, c));
      hit = condsOk && (tr.baseProbPerTick === undefined || drawFn(draft) < tr.baseProbPerTick);
    } else { // random
      const w = ev.weightByPhase?.[draft.cycle.phase] ?? 1;
      hit = drawFn(draft) < (tr.baseProbPerTick ?? 0) * w;
    }
    if (!hit) continue;

    if (ev.telegraphTicks > 0) {
      draft.telegraphed.push({ eventId: ev.id, fireAtTick: draft.tick + ev.telegraphTicks });
      // reserve the cooldown so it doesn't re-trigger while telegraphed
      draft.eventCooldowns[ev.id] = draft.tick + ev.telegraphTicks + 1;
      log.push({ tick: draft.tick, kind: 'hint', message: `${ev.title} — ${ev.telegraph} (in ${ev.telegraphTicks} days)` });
    } else {
      fireEvent(draft, ev, round, log);
      firedThisTick++;
    }
  }
}

/** Apply a player's response to a pending event choice (called from the service). */
export function applyEventChoice(
  draft: SimV2StateData,
  eventId: string,
  choiceIndex: number,
  round: (n: number, dp?: number) => number,
  log: TickLogEntry[],
): void {
  const idx = draft.pendingEventChoices.findIndex((p) => p.eventId === eventId);
  if (idx === -1) throw new Error(`No pending event: ${eventId}`);
  const [pending] = draft.pendingEventChoices.splice(idx, 1);
  const choice = pending.choices[choiceIndex];
  if (!choice) throw new Error(`Invalid choice ${choiceIndex} for ${eventId}`);
  if (choice.cost) draft.stocks.cash = round(draft.stocks.cash - choice.cost);
  for (const e of choice.effects ?? []) {
    if (e.target && e.delta !== undefined) {
      const [g, f] = e.target.split('.');
      const grp = (draft as any)[g];
      if (grp && typeof grp[f] === 'number') grp[f] = round(grp[f] + e.delta);
    }
  }
  for (const m of choice.modifiers ?? []) {
    draft.seq += 1;
    draft.activeModifiers.push({ ...m, id: `mod-${draft.seq}`, eventId, expiresAtTick: draft.tick + m.durationTicks });
  }
  log.push({ tick: draft.tick, kind: 'decision', message: `Responded to "${pending.title}": ${choice.label}` });
}
