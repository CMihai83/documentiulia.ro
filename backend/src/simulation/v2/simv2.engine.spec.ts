import { applyTick, createInitialState, effectiveDemand, nextPhase, SCENARIO_PRESETS } from './simv2.engine';
import { CYCLE_ORDER, CyclePhase, SimDecision, SimV2StateData } from './simv2.types';

/** Advance n day-ticks with no player decisions. */
function run(state: SimV2StateData, n: number): SimV2StateData {
  let s = state;
  for (let i = 0; i < n; i++) s = applyTick(s, [], 'day').state;
  return s;
}

describe('SimV2 engine (S-48)', () => {
  // ------------------------------------------------------------------ SIM-1
  describe('SIM-1 — deterministic three-tier tick engine', () => {
    it('30 day-ticks from the same seed are bit-identical', () => {
      const a = run(createInitialState('services', 42), 30);
      const b = run(createInitialState('services', 42), 30);
      expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
      expect(a.tick).toBe(30);
    });

    it('different seeds diverge', () => {
      const a = run(createInitialState('services', 1), 30);
      const b = run(createInitialState('services', 2), 30);
      expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
    });

    it('replay equals resume: 20 straight == 10 + resume(10) via JSON round-trip', () => {
      const straight = run(createInitialState('services', 7), 20);
      const first10 = run(createInitialState('services', 7), 10);
      const resumed = run(JSON.parse(JSON.stringify(first10)), 10);
      expect(JSON.stringify(resumed)).toEqual(JSON.stringify(straight));
    });

    it('week and month ticks advance the clock by 7 and 30 days', () => {
      const s0 = createInitialState('services', 3);
      const w = applyTick(s0, [], 'week').state;
      expect(w.tick).toBe(7);
      const m = applyTick(s0, [], 'month').state;
      expect(m.tick).toBe(30);
      expect(m.clock.month).toBe(2); // fixed 30-day months
    });

    it('the reducer does not mutate its input', () => {
      const s0 = createInitialState('services', 5);
      const snapshot = JSON.stringify(s0);
      applyTick(s0, [], 'day');
      expect(JSON.stringify(s0)).toEqual(snapshot);
    });
  });

  // ------------------------------------------------------------------ SIM-2
  describe('SIM-2 — deferred effects resolve exactly on time', () => {
    it('HIRE ramps capacity exactly 56 day-ticks later, not before', () => {
      const s0 = createInitialState('services', 11);
      const afterHire = applyTick(s0, [{ key: 'HIRE' }], 'day').state; // tick 1
      const capBefore = afterHire.stocks.capacity;
      expect(afterHire.stocks.headcount).toBe(s0.stocks.headcount + 1); // salary now
      expect(afterHire.pendingEffects.some((e) => e.effectKey === 'HIRE_RAMP_COMPLETE')).toBe(true);

      const atTick55 = run(afterHire, 54); // tick 55 < 56: not yet
      expect(atTick55.stocks.capacity).toBe(capBefore);
      expect(atTick55.pendingEffects.some((e) => e.effectKey === 'HIRE_RAMP_COMPLETE')).toBe(true);

      const atTick56 = run(atTick55, 1); // tick 56: ramp completes
      expect(atTick56.stocks.capacity).toBeGreaterThan(capBefore);
      expect(atTick56.pendingEffects.some((e) => e.effectKey === 'HIRE_RAMP_COMPLETE')).toBe(false);
    });

    it('CUT_MARKETING saves cash now and decays demand ~6 weeks later', () => {
      const s0 = createInitialState('services', 13);
      const cut = applyTick(s0, [{ key: 'CUT_MARKETING', params: { amount: 60 } }], 'day').state;
      expect(cut.flows.marketingSpend).toBeLessThan(s0.flows.marketingSpend);
      const decay = cut.pendingEffects.find((e) => e.effectKey === 'MARKETING_DECAY');
      expect(decay).toBeDefined();
      expect(decay!.resolveAtTick).toBe(42); // decision taken at tick 0 → lands 42 day-ticks later

      const customersBefore = cut.stocks.customerBase;
      const later = run(cut, 42);
      expect(later.stocks.customerBase).toBeLessThan(customersBefore);
    });

    it('pending effects are visible with hints (the consequences ledger)', () => {
      const s0 = createInitialState('services', 17);
      const s1 = applyTick(s0, [{ key: 'PLAN' }], 'day').state;
      const eff = s1.pendingEffects.find((e) => e.sourceDecision === 'PLAN');
      expect(eff?.visibleHint).toMatch(/2 weeks/);
    });
  });

  // ------------------------------------------------------------------ SIM-3
  describe('SIM-3 — Focus budget and delegation', () => {
    it('overspending Focus is a validation error', () => {
      const s0 = createInitialState('services', 19);
      const tooMany: SimDecision[] = [
        { key: 'PROCESS_IMPROVEMENT' }, // 3
        { key: 'HIRE' }, // 2
        { key: 'PLAN' }, // 2 -> 7 > 5/day
      ];
      expect(() => applyTick(s0, tooMany, 'day')).toThrow(/Focus budget exceeded/);
      // same decisions fit inside a week tick's 15 Focus
      expect(() => applyTick(s0, tooMany, 'week')).not.toThrow();
    });

    it('unhandled operational issues auto-resolve WORSE (bad-debt write-off math)', () => {
      const s0 = createInitialState('services', 23);
      // force a deterministic, known issue set
      s0.focus.openIssues = [{ id: 'iss-x', kind: 'CHASE_INVOICE', tick: 0 }];
      const ignored = applyTick(s0, [], 'day').state;
      const handled = applyTick(s0, [{ key: 'RESOLVE_ISSUE', params: { issueId: 'iss-x' } }], 'day').state;
      // ignored invoice chase: 150 RON written off
      expect(ignored.lastTickLog.some((l) => l.message.includes('written off'))).toBe(true);
      // identical day except the choice → ignoring destroyed real value (the write-off)
      const totalIgnored = ignored.stocks.cash + ignored.stocks.receivables;
      const totalHandled = handled.stocks.cash + handled.stocks.receivables;
      expect(totalHandled).toBeGreaterThan(totalIgnored);
      expect(totalHandled - totalIgnored).toBeGreaterThan(100); // ≈ the 150 write-off net of collection-rate second-order effects
    });

    it('handling the same issue yourself collects cash instead', () => {
      const s0 = createInitialState('services', 23);
      s0.focus.openIssues = [{ id: 'iss-x', kind: 'CHASE_INVOICE', tick: 0 }];
      const s1 = applyTick(s0, [{ key: 'RESOLVE_ISSUE', params: { issueId: 'iss-x' } }], 'day').state;
      expect(s1.lastTickLog.some((l) => l.message.includes('Handled CHASE_INVOICE'))).toBe(true);
      expect(s1.lastTickLog.some((l) => l.message.includes('written off'))).toBe(false);
    });

    it('DELEGATE auto-handles that class from then on (at a daily cost)', () => {
      const s0 = createInitialState('services', 29);
      const s1 = applyTick(s0, [{ key: 'DELEGATE', params: { class: 'CHASE_INVOICE' } }], 'day').state;
      expect(s1.focus.delegations).toContain('CHASE_INVOICE');
      // delegation cost shows up in opex
      const s2 = applyTick(s1, [], 'day').state;
      expect(s2.flows.opex).toBeGreaterThan(0);
      // delegated issues no longer produce the bad-path write-off log except on fumbles,
      // which are rare (10%) — over 30 ticks, most CHASE_INVOICE issues resolve well.
      let fumbles = 0;
      let s: SimV2StateData = s1;
      for (let i = 0; i < 30; i++) {
        s = applyTick(s, [], 'day').state;
        fumbles += s.lastTickLog.filter((l) => l.message.includes('fumbled')).length;
      }
      const totalDelegated = 30 * s.params.issuesPerDay * (1 / 3); // ~1/3 of issues are CHASE_INVOICE
      expect(fumbles).toBeLessThan(totalDelegated); // errors are the exception, not the rule
    });
  });

  // ------------------------------------------------------------------ SIM-4
  describe('SIM-4 — macro-cycle FSM + seasonality', () => {
    it('FSM only follows the allowed edges', () => {
      for (let i = 0; i < CYCLE_ORDER.length; i++) {
        const from = CYCLE_ORDER[i];
        const to = nextPhase(from);
        expect(to).toBe(CYCLE_ORDER[(i + 1) % CYCLE_ORDER.length]);
      }
    });

    it('a long run walks through multiple phases without illegal jumps', () => {
      let s = createInitialState('services', 31);
      let prev: CyclePhase = s.cycle.phase;
      const seen = new Set<CyclePhase>([prev]);
      for (let i = 0; i < 720; i++) {
        s = applyTick(s, [], 'day').state;
        if (s.cycle.phase !== prev) {
          expect(s.cycle.phase).toBe(nextPhase(prev));
          prev = s.cycle.phase;
          seen.add(prev);
        }
      }
      expect(seen.size).toBeGreaterThanOrEqual(3); // dwell times make ≥2 transitions in 2 sim-years
    });

    it('demand responds to the cycle multipliers (RECESSION < PEAK, ceteris paribus)', () => {
      const base = createInitialState('services', 37);
      const inPeak: SimV2StateData = JSON.parse(JSON.stringify(base));
      inPeak.cycle = { phase: 'PEAK', ticksInPhase: 0, plannedDwell: 999 };
      const inRecession: SimV2StateData = JSON.parse(JSON.stringify(base));
      inRecession.cycle = { phase: 'RECESSION', ticksInPhase: 0, plannedDwell: 999 };
      // same rngState → same noise draw → the only difference is the multiplier
      expect(effectiveDemand(inPeak)).toBeGreaterThan(effectiveDemand(inRecession));
    });

    it('seasonality vector shapes demand by calendar month', () => {
      const dec: SimV2StateData = JSON.parse(JSON.stringify(createInitialState('retail', 41)));
      dec.clock.month = 12; // retail December = 1.55
      const aug: SimV2StateData = JSON.parse(JSON.stringify(dec));
      aug.clock.month = 8; // retail August = 0.9
      expect(effectiveDemand(dec)).toBeGreaterThan(effectiveDemand(aug));
      expect(SCENARIO_PRESETS.retail.seasonality[11]).toBeGreaterThan(SCENARIO_PRESETS.retail.seasonality[7]);
    });
  });
});
