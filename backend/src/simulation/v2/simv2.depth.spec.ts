import { createInitialState, applyTick, effectiveDemand } from './simv2.engine';
import { EVENT_CATALOG, kpiModifier } from './simv2.events';
import { SimV2StateData, SimDecision } from './simv2.types';

function advance(state: SimV2StateData, ticks: number, decisionsAt: (t: number) => SimDecision[] = () => []) {
  let s = state;
  const events: string[] = [];
  const hints: string[] = [];
  for (let i = 0; i < ticks; i++) {
    const r = applyTick(s, decisionsAt(s.tick), 'day');
    s = r.state;
    for (const e of r.log) { if (e.kind === 'event') events.push(`${e.tick}:${e.message}`); if (e.kind === 'hint') hints.push(`${e.tick}:${e.message}`); }
  }
  return { s, events, hints };
}

describe('SIM-5 data-driven events', () => {
  it('catalog is well-formed (ids unique, triggers valid)', () => {
    const ids = new Set(EVENT_CATALOG.map((e) => e.id));
    expect(ids.size).toBe(EVENT_CATALOG.length);
    expect(EVENT_CATALOG.length).toBeGreaterThanOrEqual(8);
    for (const e of EVENT_CATALOG) expect(['random', 'scripted', 'conditional']).toContain(e.trigger.type);
  });

  it('the scripted VAT change fires at tick 120, telegraphed ~5 days earlier', () => {
    const { events, hints, s } = advance(createInitialState('services', 42), 125);
    expect(events.some((e) => e.includes('VAT rate change'))).toBe(true);
    expect(hints.some((h) => h.includes('VAT'))).toBe(true);
    // fires exactly at 120 (telegraphTicks=5 from tick 115)
    expect(events.find((e) => e.includes('VAT'))!.startsWith('120:')).toBe(true);
    expect(s.firedOnce).toContain('VAT_CHANGE');
  });

  it('the monthly ANAF D406 event surfaces a choice on day 25', () => {
    const { s } = advance(createInitialState('services', 7), 26);
    expect(s.pendingEventChoices.some((p) => p.eventId === 'ANAF_D406_DEADLINE')).toBe(true);
  });

  it('temporary modifiers decay after their window', () => {
    // find a tick where any modifier is active, then confirm none outlive their expiry
    const { s } = advance(createInitialState('retail', 99), 200);
    for (const m of s.activeModifiers) expect(m.expiresAtTick).toBeGreaterThan(s.tick);
  });

  it('event timing is deterministic for a fixed seed', () => {
    const a = advance(createInitialState('services', 12345), 180);
    const b = advance(createInitialState('services', 12345), 180);
    expect(a.events).toEqual(b.events);
    expect(JSON.stringify(a.s)).toEqual(JSON.stringify(b.s));
  });

  it('a demand modifier changes effectiveDemand multiplicatively', () => {
    const s = createInitialState('services', 1);
    const before = effectiveDemand(JSON.parse(JSON.stringify(s)));
    s.activeModifiers.push({ id: 'm1', eventId: 'X', targetKpi: 'demand', mult: 0.5, durationTicks: 10, expiresAtTick: 100 });
    const after = effectiveDemand(JSON.parse(JSON.stringify(s)));
    expect(after).toBeLessThan(before);
    expect(kpiModifier(s, 'demand').mult).toBe(0.5);
  });
});

describe('SIM-6 feedback loops', () => {
  it('price elasticity: a higher price index yields lower demand', () => {
    const lo = createInitialState('services', 3); lo.aux.priceIndex = 1.0;
    const hi = createInitialState('services', 3); hi.aux.priceIndex = 1.3;
    expect(effectiveDemand(hi)).toBeLessThan(effectiveDemand(lo));
  });

  it('B1: a large backlog vs capacity drives churn up', () => {
    const base = createInitialState('services', 5);
    const { s } = advance(base, 10);
    const churnBase = s.aux.churnRate;
    const jammed = createInitialState('services', 5);
    jammed.stocks.backlogOrders = jammed.stocks.capacity * 6; // huge lead-time pressure
    const { s: s2 } = advance(jammed, 3);
    expect(s2.aux.churnRate).toBeGreaterThan(churnBase);
  });

  it('R2/B2: sustained low morale erodes productivity over time', () => {
    const s = createInitialState('services', 8);
    s.aux.morale = 20; // dire morale
    const p0 = s.aux.productivity;
    const { s: s2 } = advance(s, 20);
    expect(s2.aux.productivity).toBeLessThan(p0);
  });

  it('R1 growth: sustained marketing lifts brand equity vs a cut', () => {
    const grow = advance(createInitialState('services', 9), 40, () => [{ key: 'RAISE_MARKETING', params: { amount: 300 } }]).s;
    const cut = createInitialState('services', 9); cut.flows.marketingSpend = 0;
    const cutS = advance(cut, 40).s;
    expect(grow.stocks.brandEquity).toBeGreaterThan(cutS.stocks.brandEquity);
  });
});
