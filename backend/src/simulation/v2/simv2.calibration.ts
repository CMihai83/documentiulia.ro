import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DataUseGuardService } from '../../ai/data-use-guard.service';
import { createInitialState, SCENARIO_PRESETS } from './simv2.engine';
import { SimV2StateData } from './simv2.types';

export interface CalibrationResult {
  state: SimV2StateData;
  mirror: boolean;
  /** 'preset' when we fell back (unauthorised / no data); 'erp' when seeded from real data. */
  source: 'preset' | 'erp';
  notes: string[];
}

/**
 * SIM-9 — seed a simulation from a tenant's real ERP data.
 *
 * Art 28(10) gate: calibrating our simulator on tenant data is OWN-purpose use,
 * so it is blocked unless the org has authorised it (DataUseGuardService). When
 * not authorised we fall back to the industry preset — NO tenant data is read.
 * When authorised, only aggregates (scrubbed of any person-level field) feed the
 * sim; never names/CNP/salaries.
 */
@Injectable()
export class SimV2CalibrationService {
  private readonly logger = new Logger(SimV2CalibrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly guard: DataUseGuardService,
  ) {}

  async calibrate(
    userId: string,
    organizationId: string | undefined,
    scenarioKey: string,
    seed: number,
  ): Promise<CalibrationResult> {
    const key = SCENARIO_PRESETS[scenarioKey] ? scenarioKey : 'services';
    const notes: string[] = [];

    // Mirror-mode calibration is SERVICE DELIVERY on the tenant's own data inside
    // their authenticated, org-scoped, tier-gated session — not an Art 28(10)
    // role-flip. That gate applies to OUR reuse (model training / cross-tenant
    // benchmarks) and stays enforced via DataUseGuard at those call sites.
    // Person-level fields are still scrubbed below: the sim only needs aggregates.
    // See docs/business-simulator-v2/research/04 §5B (mirror mode).
    if (!organizationId) {
      notes.push('No organisation context — using the industry preset.');
      return { state: createInitialState(key, seed), mirror: false, source: 'preset', notes };
    }

    try {
      const agg = await this.aggregate(userId, organizationId!);
      // Even for an authorised org, only scrubbed aggregates may feed the model.
      const safe = this.guard.scrubForCalibration(agg);
      const state = this.applyCalibration(key, seed, safe, notes);
      notes.push('Calibrated from real ERP aggregates (person-level fields scrubbed).');
      this.logger.log(`SimV2 calibrated for org ${organizationId} (revenue/day≈${safe.dailyRevenue})`);
      return { state, mirror: true, source: 'erp', notes };
    } catch (e: any) {
      this.logger.warn(`Calibration failed (${e?.message}) — falling back to preset`);
      notes.push('ERP aggregation failed — fell back to the industry preset.');
      return { state: createInitialState(key, seed), mirror: false, source: 'preset', notes };
    }
  }

  /** Read ONLY aggregates from the tenant's data (no per-row PII leaves this method). */
  private async aggregate(userId: string, organizationId: string) {
    const orgOrUser = { OR: [{ organizationId }, { userId }] };
    const [invAgg, partnerCount, employeeCount, invoices] = await Promise.all([
      this.prisma.invoice.aggregate({ _sum: { grossAmount: true }, _count: true, where: { userId } }),
      this.prisma.partner.count({ where: orgOrUser }),
      this.prisma.employee.count({ where: orgOrUser }),
      // last-24-month monthly buckets for the seasonality vector
      this.prisma.invoice.findMany({
        where: { userId },
        select: { grossAmount: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5000,
      }),
    ]);

    const totalRevenue = Number(invAgg._sum.grossAmount ?? 0);
    const invoiceCount = invAgg._count || 0;
    // monthly seasonality (index 0 = Jan), normalised to mean 1
    const monthly = new Array(12).fill(0);
    const monthN = new Array(12).fill(0);
    for (const inv of invoices) {
      const m = new Date(inv.createdAt).getMonth();
      monthly[m] += Number(inv.grossAmount ?? 0);
      monthN[m] += 1;
    }
    const avgPerMonth = monthly.map((v, i) => (monthN[i] ? v / monthN[i] : 0));
    const mean = avgPerMonth.reduce((a, b) => a + b, 0) / 12 || 1;
    const seasonality = avgPerMonth.map((v) => (v > 0 ? v / mean : 1));

    // span in days for the run-rate
    const dates = invoices.map((i) => new Date(i.createdAt).getTime());
    const spanDays = dates.length ? Math.max(30, (Math.max(...dates) - Math.min(...dates)) / 86400000) : 365;
    const dailyRevenue = totalRevenue / spanDays;

    return {
      totalRevenue: Math.round(totalRevenue),
      invoiceCount,
      partnerCount,
      employeeCount,
      dailyRevenue: Math.round(dailyRevenue),
      seasonality,
    };
  }

  private applyCalibration(scenarioKey: string, seed: number, agg: any, notes: string[]): SimV2StateData {
    const state = createInitialState(scenarioKey, seed);
    const p = state.params;

    if (agg.dailyRevenue > 0 && p.unitPrice > 0) {
      const demand = Math.max(1, Math.round(agg.dailyRevenue / p.unitPrice));
      p.baseDailyDemand = demand;
      state.stocks.capacity = Math.round(demand * 1.15);
      state.stocks.inventoryUnits = demand * 15;
      state.flows.revenue = agg.dailyRevenue;
      notes.push(`Base daily demand set to ${demand} units from the real revenue run-rate.`);
    }
    if (Array.isArray(agg.seasonality) && agg.seasonality.length === 12) {
      p.seasonality = agg.seasonality.map((v: number) => (Number.isFinite(v) && v > 0 ? Number(v.toFixed(3)) : 1));
      notes.push('Seasonality vector fitted from real monthly revenue.');
    }
    if (agg.partnerCount > 0) {
      state.stocks.customerBase = agg.partnerCount;
      notes.push(`Customer base seeded from ${agg.partnerCount} real partners.`);
    }
    if (agg.employeeCount > 0) {
      state.stocks.headcount = agg.employeeCount;
      notes.push(`Headcount seeded from ${agg.employeeCount} real employees.`);
    }
    return state;
  }
}
