import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomInt } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { applyTick, createInitialState, SCENARIO_PRESETS } from './simv2.engine';
import { DECISION_CATALOG, SimDecision, SimV2StateData, TickType } from './simv2.types';

/**
 * Simulator v2 — run lifecycle + versioned state persistence (S-48).
 * Every tick's full state is stored as a SimV2State row, which is what makes
 * resume (and, in SIM-8, rewind) trivial: load a row, keep reducing.
 */
@Injectable()
export class SimV2Service {
  private readonly logger = new Logger(SimV2Service.name);

  constructor(private readonly prisma: PrismaService) {}

  getCatalog() {
    return {
      scenarios: Object.entries(SCENARIO_PRESETS).map(([key, p]) => ({ key, industry: p.industry })),
      decisions: Object.values(DECISION_CATALOG),
      tickTypes: ['day', 'week', 'month'],
    };
  }

  async createRun(userId: string, dto: { scenarioKey?: string; mode?: 'practice' | 'scored'; seed?: number; businessId?: string }) {
    const scenarioKey = dto.scenarioKey && SCENARIO_PRESETS[dto.scenarioKey] ? dto.scenarioKey : 'services';
    const seed = dto.seed ?? randomInt(1, 2 ** 31);
    const state = createInitialState(scenarioKey, seed);

    const run = await this.prisma.simV2Run.create({
      data: {
        userId,
        businessId: dto.businessId,
        scenarioKey,
        mode: dto.mode === 'scored' ? 'scored' : 'practice',
        seed,
        currentTick: 0,
        clockYear: state.clock.year,
        clockMonth: state.clock.month,
        clockDay: state.clock.day,
        states: { create: { tick: 0, stateJson: state as any } },
      },
    });
    this.logger.log(`SimV2 run ${run.id} created (${scenarioKey}, seed ${seed}, ${run.mode})`);
    return { run, state };
  }

  async listRuns(userId: string) {
    return this.prisma.simV2Run.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
  }

  async getRun(userId: string, runId: string) {
    const run = await this.prisma.simV2Run.findFirst({ where: { id: runId, userId } });
    if (!run) throw new NotFoundException(`Run ${runId} not found`);
    const state = await this.latestState(runId);
    return { run, state };
  }

  private async latestState(runId: string): Promise<SimV2StateData> {
    const row = await this.prisma.simV2State.findFirst({ where: { runId }, orderBy: { tick: 'desc' } });
    if (!row) throw new NotFoundException(`Run ${runId} has no state`);
    return row.stateJson as unknown as SimV2StateData;
  }

  /** Advance the run by n ticks of the given granularity, persisting every tick. */
  async advance(userId: string, runId: string, dto: { tickType?: TickType; ticks?: number; decisions?: SimDecision[] }) {
    const run = await this.prisma.simV2Run.findFirst({ where: { id: runId, userId } });
    if (!run) throw new NotFoundException(`Run ${runId} not found`);
    if (run.status !== 'active') throw new BadRequestException(`Run is ${run.status}`);

    const tickType: TickType = dto.tickType ?? 'day';
    const n = Math.min(Math.max(dto.ticks ?? 1, 1), 90);
    let state = await this.latestState(runId);
    const allLogs = [];
    const allResolved = [];

    for (let i = 0; i < n; i++) {
      // player decisions apply to the first tick only; the rest advance time
      const decisions = i === 0 ? (dto.decisions ?? []) : [];
      const result = applyTick(state, decisions, tickType);
      state = result.state;
      allLogs.push(...result.log);
      allResolved.push(...result.resolvedEffects);
      await this.prisma.simV2State.create({ data: { runId, tick: state.tick, stateJson: state as any } });
    }

    await this.prisma.simV2Run.update({
      where: { id: runId },
      data: {
        currentTick: state.tick,
        clockYear: state.clock.year,
        clockMonth: state.clock.month,
        clockDay: state.clock.day,
      },
    });

    return { state, log: allLogs, resolvedEffects: allResolved };
  }

  /** State history — the sim_timeseries feed for the KPI-evolution dashboard (SIM-7 builds the UI). */
  async history(userId: string, runId: string, fromTick = 0, limit = 400) {
    await this.getRun(userId, runId); // ownership check
    const rows = await this.prisma.simV2State.findMany({
      where: { runId, tick: { gte: fromTick } },
      orderBy: { tick: 'asc' },
      take: Math.min(limit, 1000),
    });
    return rows.map((r) => {
      const s = r.stateJson as unknown as SimV2StateData;
      return {
        tick: s.tick,
        clock: s.clock,
        cash: s.stocks.cash,
        revenue: s.flows.revenue,
        backlogOrders: s.stocks.backlogOrders,
        capacity: s.stocks.capacity,
        headcount: s.stocks.headcount,
        customerBase: s.stocks.customerBase,
        brandEquity: s.stocks.brandEquity,
        morale: s.aux.morale,
        utilization: s.aux.utilization,
        cyclePhase: s.cycle.phase,
      };
    });
  }

  /** The pending-consequences ledger (SIM-2 AC: visible via the API). */
  async pendingEffects(userId: string, runId: string) {
    const { state } = await this.getRun(userId, runId);
    return {
      currentTick: state.tick,
      pending: state.pendingEffects.map((e) => ({
        ...e,
        ticksUntil: e.resolveAtTick - state.tick,
      })),
      openIssues: state.focus.openIssues,
      focusPerTick: { day: 5, week: 15, month: 40 },
      delegations: state.focus.delegations,
    };
  }

  async setStatus(userId: string, runId: string, status: 'active' | 'paused' | 'ended') {
    const run = await this.prisma.simV2Run.findFirst({ where: { id: runId, userId } });
    if (!run) throw new NotFoundException(`Run ${runId} not found`);
    return this.prisma.simV2Run.update({ where: { id: runId }, data: { status } });
  }
}
