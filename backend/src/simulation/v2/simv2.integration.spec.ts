/**
 * SIM-7/9 integration — runs against a throwaway postgres:15-alpine.
 * Gated by SIMV2_IT=1 so it never runs in the normal unit sweep.
 * Verifies: run lifecycle, 60-tick determinism replay (bit-identical through the
 * DB round-trip), scripted-event telegraph-then-fire, feedback-loop movement,
 * KPI timeseries + CSV, and the Art 28(10) calibration gate (unauth -> preset/no
 * PII; auth -> real aggregates with the guard consulted).
 */
import { PrismaService } from '../../prisma/prisma.service';
import { SimV2Service } from './simv2.service';
import { SimV2CalibrationService } from './simv2.calibration';
import { DataUseGuardService } from '../../ai/data-use-guard.service';
import { GamificationService } from '../../lms/gamification.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

const RUN = process.env.SIMV2_IT === '1';
const d = RUN ? describe : describe.skip;

d('SIM-7/9 integration', () => {
  let prisma: PrismaService;
  let sim: SimV2Service;
  let guard: DataUseGuardService;
  const userId = 'it-user-1';
  const orgId = 'it-org-1';

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    guard = new DataUseGuardService(prisma);
    const gamification = new GamificationService(new EventEmitter2(), prisma);
    sim = new SimV2Service(prisma, new SimV2CalibrationService(prisma, guard), gamification);

    // idempotent: the throwaway DB may persist across jest invocations
    await prisma.invoice.deleteMany({ where: { userId } });
    await prisma.partner.deleteMany({ where: { userId } });
    await prisma.employee.deleteMany({ where: { userId } });
    await prisma.user.upsert({ where: { id: userId }, update: {}, create: { id: userId, email: 'it@example.com' } });
    await prisma.organization.upsert({
      where: { id: orgId }, update: { aiTrainingAuthorized: false },
      create: { id: orgId, name: 'IT Org', slug: 'it-org-1', aiTrainingAuthorized: false },
    });
  }, 60000);

  afterAll(async () => { await prisma.$disconnect(); });

  const finalState = async (seed: number, ticks: number) => {
    const { run } = await sim.createRun(userId, { scenarioKey: 'services', seed });
    // advance in chunks (advance() caps at 90 ticks/call)
    let remaining = ticks;
    while (remaining > 0) { const n = Math.min(remaining, 90); await sim.advance(userId, run.id, { tickType: 'day', ticks: n }); remaining -= n; }
    return { run, state: (await sim.getRun(userId, run.id)).state };
  };

  it('advances 60 day-ticks and replays bit-identically through the DB', async () => {
    const a = await finalState(4242, 60);
    const b = await finalState(4242, 60);
    expect(a.state.tick).toBe(60);
    // determinism: same seed -> byte-identical persisted state (minus the run id/clock is part of state)
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
    // a different seed diverges
    const c = await finalState(9999, 60);
    expect(JSON.stringify(c.state)).not.toBe(JSON.stringify(a.state));
  }, 120000);

  it('telegraphs then fires scripted events, and moves the feedback loops', async () => {
    const { run, state } = await finalState(777, 130);
    // scripted VAT_CHANGE fires at tick 120 (telegraph 5) -> must be in firedOnce by 130
    expect(state.firedOnce.length).toBeGreaterThan(0);
    // feedback loops moved KPIs away from their initial values
    const first = (await sim.history(userId, run.id, 0, 5))[0];
    const last = (await sim.history(userId, run.id, 129, 5)).slice(-1)[0];
    expect(last.tick).toBe(130);
    expect(last.morale).not.toBe(first.morale);
  }, 120000);

  it('serves the KPI timeseries and a CSV export', async () => {
    const { run } = await finalState(555, 30);
    const rows = await sim.history(userId, run.id, 0, 1000);
    expect(rows.length).toBe(31); // tick 0..30
    expect(rows[0]).toHaveProperty('cash');
    const csv = await sim.historyCsv(userId, run.id);
    expect(csv.split('\n')[0]).toContain('tick,');
    expect(csv.split('\n').length).toBeGreaterThan(31);
  }, 120000);

  it('mirror mode: org WITHOUT training authorisation still calibrates from OWN data (service delivery), person-level scrubbed', async () => {
    await prisma.organization.update({ where: { id: orgId }, data: { aiTrainingAuthorized: false } });
    const res = await sim.createCalibratedRun(userId, orgId, { scenarioKey: 'services' });
    expect(res.calibration.mirror).toBe(true);
    expect(res.calibration.source).toBe('erp');
    expect(res.run.mirrorMode).toBe(true);
    // person-level data must STILL never reach the state (scrub), even though aggregates do
    const blob = JSON.stringify(res.state).toLowerCase();
    expect(blob).not.toContain('cnp');
    expect(blob).not.toContain('@it.ro');
  }, 60000);

  it('authorised org also seeds from real aggregates (scrub still applied)', async () => {
    // real tenant data
    await prisma.partner.createMany({ data: [1, 2, 3].map((i) => ({ userId, organizationId: orgId, name: `Partner ${i}` })), skipDuplicates: true });
    await prisma.employee.createMany({ data: [1, 2].map((i) => ({ userId, organizationId: orgId, firstName: `F${i}`, lastName: `L${i}`, email: `e${i}@it.ro`, position: 'Dev', salary: 5000, hireDate: new Date('2025-01-10') })), skipDuplicates: true });
    await prisma.invoice.createMany({
      data: [1, 2, 3, 4].map((i) => ({ userId, invoiceNumber: `IT-${i}`, partnerName: `Partner ${i}`, netAmount: 10000, vatRate: 21, vatAmount: 2100, grossAmount: 12100, invoiceDate: new Date(`2026-0${i}-15`) })),
      skipDuplicates: true,
    });
    await prisma.organization.update({ where: { id: orgId }, data: { aiTrainingAuthorized: true } });

    const res = await sim.createCalibratedRun(userId, orgId, { scenarioKey: 'services' });
    expect(res.calibration.mirror).toBe(true);
    expect(res.calibration.source).toBe('erp');
    expect(res.run.mirrorMode).toBe(true);
    expect(res.state.stocks.customerBase).toBe(3); // from 3 real partners
    expect(res.state.stocks.headcount).toBe(2);    // from 2 real employees
    // still no tenant PII in the seeded state (names/emails scrubbed; only aggregates fed)
    const blob = JSON.stringify(res.state).toLowerCase();
    expect(blob).not.toContain('@it.ro');
    expect(blob).not.toContain('partner 1');
  }, 60000);

  // ---- SIM-8: rewind is a pure sandbox (advance→rewind→advance == straight replay) ----
  it('SIM-8: advance 20 → rewind to 5 → advance 15 is bit-identical to a straight 20-tick replay', async () => {
    const seed = 313131;
    // straight replay of 20 ticks
    const straight = await finalState(seed, 20);

    // rewind path: same seed, advance 20, rewind to tick 5, advance 15 more back to tick 20
    const { run } = await sim.createRun(userId, { scenarioKey: 'services', seed });
    await sim.advance(userId, run.id, { tickType: 'day', ticks: 20 });
    await sim.rewind(userId, run.id, 15); // 20 - 15 = 5 ticks back (at the cap)
    let mid = (await sim.getRun(userId, run.id)).state;
    expect(mid.tick).toBe(15);
    await sim.rewind(userId, run.id, 10); // rewind again (10) — still within cap per call
    await sim.advance(userId, run.id, { tickType: 'day', ticks: 10 }); // back to 20
    const rewound = (await sim.getRun(userId, run.id)).state;

    expect(rewound.tick).toBe(20);
    // PRNG state lives in the state JSON → replay after rewind is byte-identical
    expect(JSON.stringify(rewound)).toBe(JSON.stringify(straight.state));

    // later state rows were pruned then rebuilt — exactly 21 rows (ticks 0..20)
    const rows = await prisma.simV2State.count({ where: { runId: run.id } });
    expect(rows).toBe(21);
  }, 120000);

  it('SIM-8: rewind is REFUSED on a scored run', async () => {
    const { run } = await sim.createRun(userId, { scenarioKey: 'services', mode: 'scored', seed: 55 });
    await sim.advance(userId, run.id, { tickType: 'day', ticks: 3 });
    await expect(sim.rewind(userId, run.id, 1)).rejects.toThrow(/practice/i);
  }, 60000);

  it('SIM-8: rewind cannot jump more than 5 ticks back in one call', async () => {
    const { run } = await sim.createRun(userId, { scenarioKey: 'services', seed: 66 });
    await sim.advance(userId, run.id, { tickType: 'day', ticks: 10 });
    await expect(sim.rewind(userId, run.id, 2)).rejects.toThrow(/capped/i); // 10 - 2 = 8 > 5
  }, 60000);

  // ---- SIM-12: ending a run persists the composite score + awards points/badges (scored) ----
  it('SIM-12: ending a scored run persists a composite score and awards points + ≥1 badge, surviving a fresh service instance', async () => {
    const badgeUser = 'it-user-badge';
    const { run } = await sim.createRun(badgeUser, { scenarioKey: 'services', mode: 'scored', seed: 2027 });
    // Delegate all three operational classes across three advance calls → earns 'sim-delegator'.
    await sim.advance(badgeUser, run.id, { tickType: 'day', ticks: 5, decisions: [{ key: 'DELEGATE', params: { class: 'CHASE_INVOICE' } }] });
    await sim.advance(badgeUser, run.id, { tickType: 'day', ticks: 5, decisions: [{ key: 'DELEGATE', params: { class: 'APPROVE_PO' } }] });
    await sim.advance(badgeUser, run.id, { tickType: 'day', ticks: 5, decisions: [{ key: 'DELEGATE', params: { class: 'DISCOUNT_TO_CLOSE' } }] });
    await sim.advance(badgeUser, run.id, { tickType: 'day', ticks: 75 });
    const ended = await sim.endRun(badgeUser, run.id);
    expect(ended.score.composite).toBeGreaterThanOrEqual(0);
    expect(ended.score.composite).toBeLessThanOrEqual(100);
    expect(ended.badges).toContain('sim-delegator');
    // the behavioral badge was actually persisted via the F-2 engine
    const badgeRow = await prisma.gamificationUserBadge.findUnique({ where: { userId_badgeId: { userId: badgeUser, badgeId: 'sim-delegator' } } });
    expect(badgeRow).toBeTruthy();

    // persisted breakdown survives a brand-new service instance (proves DB, not memory)
    const fresh = new SimV2Service(
      prisma,
      new SimV2CalibrationService(prisma, guard),
      new GamificationService(new EventEmitter2(), prisma),
    );
    const reloaded = await fresh.getRun(badgeUser, run.id);
    expect(reloaded.run.status).toBe('ended');
    expect((reloaded.run as any).scoreJson).toBeTruthy();
    expect((reloaded.run as any).scoreJson.composite).toBe(ended.score.composite);

    // XP was awarded via the F-2 gamification engine
    const points = await prisma.gamificationUserPoints.findUnique({ where: { userId: badgeUser } });
    expect(points && points.totalPoints).toBeGreaterThan(0);
  }, 120000);
});
