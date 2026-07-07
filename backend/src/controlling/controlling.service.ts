import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import {
  round2,
  varianceStatus,
  variance,
  contributionMargin,
  allocateAmount,
  canTransitionInternalOrder,
  InternalOrderStatus,
  VarianceStatus,
} from './controlling.math';

/**
 * CONTROLLING (Management Accounting) — SAP CO analog.
 * S-42: promoted from in-memory PoC to persisted, org-scoped Prisma storage.
 * Demo data is seeded idempotently per organization on first access, so the
 * showcase still "just works" while every figure is now real and durable.
 */

// ---- Public type contracts (kept stable for controller/consumers) ----
export type { VarianceStatus };
export type CostCenterCategory =
  | 'production' | 'sales' | 'administration' | 'rd' | 'logistics' | 'it' | 'management';
export type CostElementCategory =
  | 'personnel' | 'materials' | 'services' | 'depreciation' | 'rent_utilities'
  | 'marketing' | 'travel' | 'it_software' | 'financial' | 'other';
export type AllocationDriver =
  | 'headcount' | 'area_sqm' | 'revenue_share' | 'machine_hours' | 'fixed_percentage';
export type AllocationMethod = 'distribution' | 'assessment';

export interface CostCenter {
  id: string; code: string; name: string; nameRo: string;
  category: CostCenterCategory; parentId?: string | null; managerName?: string | null;
  currency: string; active: boolean;
}
export interface ProfitCenter {
  id: string; code: string; name: string; nameRo: string;
  responsible?: string | null; currency: string; active: boolean;
}
export interface InternalOrder {
  id: string; code: string; name: string; type: string;
  responsibleCostCenterId: string; budget: number; actual: number;
  currency: string; status: string; startDate: string; endDate?: string | null;
}
export interface AllocationCycle {
  id: string; name: string; method: AllocationMethod; driver: AllocationDriver;
  senderCostCenterId: string; receiverCostCenterIds: string[]; active: boolean;
}
export interface VarianceLine {
  costCenterId: string; costCenterCode: string; costCenterName: string;
  category: CostCenterCategory; planned: number; actual: number;
  variance: number; variancePercent: number; status: VarianceStatus;
}
export interface CostElementBreakdown {
  costElementId: string; code: string; name: string; category: CostElementCategory;
  planned: number; actual: number; variance: number; variancePercent: number; sharePercent: number;
}
export interface ProfitCenterResult {
  profitCenterId: string; code: string; name: string;
  revenue: number; cost: number; operatingResult: number; marginPercent: number;
}
export interface ContributionMarginResult {
  segmentId: string; name: string; profitCenterName: string; revenue: number;
  variableCosts: number; contributionMargin1: number; cm1Percent: number;
  allocatedFixedCosts: number; operatingResult: number; operatingMarginPercent: number;
}
export interface KpiCockpit {
  period: string; currency: string; totalRevenue: number; totalCost: number;
  ebitda: number; ebitdaMarginPercent: number; grossMarginPercent: number;
  personnelCostRatio: number; overheadRatio: number; budgetPlanned: number;
  budgetActual: number; budgetUtilizationPercent: number; costCenterCount: number;
  profitCenterCount: number; openInternalOrders: number;
}

const DEFAULT_PERIOD = '2026-07';
const CURRENCY = 'RON';

@Injectable()
export class ControllingService {
  private readonly logger = new Logger(ControllingService.name);

  constructor(private readonly prisma: PrismaService) {}

  private num(d: unknown): number {
    return typeof d === 'number' ? d : Number(d ?? 0);
  }

  private async audit(
    orgId: string, userId: string | undefined, action: string, entity: string,
    entityId: string, details?: Record<string, unknown>,
  ): Promise<void> {
    if (!userId) return;
    try {
      await this.prisma.auditLog.create({
        data: { userId, organizationId: orgId, action, entity, entityId, details: details as any },
      });
    } catch (e: any) {
      this.logger.warn(`audit skipped for ${entity}:${entityId} — ${e?.message}`);
    }
  }

  // =================== SEED (idempotent, per org) ===================

  private async ensureSeeded(orgId: string): Promise<void> {
    const existing = await this.prisma.costCenter.count({ where: { organizationId: orgId } });
    if (existing > 0) return;

    await this.prisma.costElement.createMany({
      data: [
        { code: '641', name: 'Salarii personal', category: 'personnel' },
        { code: '645', name: 'Contribuții sociale', category: 'personnel' },
        { code: '601', name: 'Materii prime', category: 'materials' },
        { code: '628', name: 'Servicii terți', category: 'services' },
        { code: '681', name: 'Amortizare', category: 'depreciation' },
        { code: '612', name: 'Chirii', category: 'rent_utilities' },
        { code: '605', name: 'Utilități (energie, apă)', category: 'rent_utilities' },
        { code: '623', name: 'Marketing & protocol', category: 'marketing' },
        { code: '625', name: 'Deplasări & transport', category: 'travel' },
        { code: '611', name: 'IT & software (SaaS)', category: 'it_software' },
        { code: '666', name: 'Costuri financiare', category: 'financial' },
        { code: '931', name: 'Alocare overhead (secundar)', category: 'other', type: 'secondary' },
      ].map((e) => ({ ...e, organizationId: orgId })) as any,
      skipDuplicates: true,
    });

    await this.prisma.costCenter.createMany({
      data: [
        { code: 'CC-1000', name: 'Production', nameRo: 'Producție', category: 'production', managerName: 'Andrei Pop' },
        { code: 'CC-2000', name: 'Sales', nameRo: 'Vânzări', category: 'sales', managerName: 'Iulia Marin' },
        { code: 'CC-3000', name: 'Logistics', nameRo: 'Logistică', category: 'logistics', managerName: 'Vlad Ene' },
        { code: 'CC-4000', name: 'IT', nameRo: 'IT', category: 'it', managerName: 'Radu Dinu' },
        { code: 'CC-5000', name: 'R&D', nameRo: 'Cercetare-Dezvoltare', category: 'rd', managerName: 'Sanda Ilie' },
        { code: 'CC-9000', name: 'Administration', nameRo: 'Administrativ', category: 'administration', managerName: 'Elena Voicu' },
        { code: 'CC-9900', name: 'Management', nameRo: 'Management', category: 'management', managerName: 'Mihai C.' },
      ].map((c) => ({ ...c, organizationId: orgId })) as any,
      skipDuplicates: true,
    });

    await this.prisma.profitCenter.createMany({
      data: [
        { code: 'PC-100', name: 'Software & SaaS', nameRo: 'Software & SaaS', responsible: 'Iulia Marin' },
        { code: 'PC-200', name: 'Consulting Services', nameRo: 'Servicii Consultanță', responsible: 'Mihai C.' },
        { code: 'PC-300', name: 'Trading & Distribution', nameRo: 'Comerț & Distribuție', responsible: 'Vlad Ene' },
      ].map((p) => ({ ...p, organizationId: orgId })),
      skipDuplicates: true,
    });

    const centers = await this.prisma.costCenter.findMany({ where: { organizationId: orgId } });
    const pcs = await this.prisma.profitCenter.findMany({ where: { organizationId: orgId } });
    const ccId = (code: string) => centers.find((c) => c.code === code)!.id;
    const pcId = (code: string) => pcs.find((c) => c.code === code)!.id;

    await this.prisma.internalOrder.createMany({
      data: [
        { code: 'IO-2026-001', name: 'Implementare S/4HANA client X', type: 'project', responsibleCostCenterId: ccId('CC-2000'), budget: 180000, actual: 96500, status: 'released', startDate: '2026-02-01' },
        { code: 'IO-2026-002', name: 'Campanie SAF-T Q3', type: 'marketing_campaign', responsibleCostCenterId: ccId('CC-2000'), budget: 45000, actual: 51200, status: 'released', startDate: '2026-04-01' },
        { code: 'IO-2026-003', name: 'Upgrade infrastructură GPU', type: 'capex', responsibleCostCenterId: ccId('CC-4000'), budget: 120000, actual: 38000, status: 'open', startDate: '2026-05-15' },
      ].map((o) => ({ ...o, organizationId: orgId })) as any,
      skipDuplicates: true,
    });

    await this.prisma.allocationCycle.createMany({
      data: [
        { name: 'Repartizare Administrativ pe headcount', method: 'assessment', driver: 'headcount', senderCostCenterId: ccId('CC-9000'), receiverCostCenterIds: ['CC-1000', 'CC-2000', 'CC-3000', 'CC-4000', 'CC-5000'].map(ccId) },
        { name: 'Repartizare Management pe cifra de afaceri', method: 'assessment', driver: 'revenue_share', senderCostCenterId: ccId('CC-9900'), receiverCostCenterIds: ['CC-1000', 'CC-2000', 'CC-3000'].map(ccId) },
      ].map((c) => ({ ...c, organizationId: orgId })) as any,
    });

    await this.prisma.profitabilitySegment.createMany({
      data: [
        { name: 'SaaS Pro (49 RON/lună)', profitCenterId: pcId('PC-100'), revenue: 420000, cogs: 63000, directCosts: 28000, allocatedFixedCosts: 110000 },
        { name: 'SaaS Business (149 RON/lună)', profitCenterId: pcId('PC-100'), revenue: 268000, cogs: 40000, directCosts: 19000, allocatedFixedCosts: 70000 },
        { name: 'Consultanță SAP / ERP', profitCenterId: pcId('PC-200'), revenue: 540000, cogs: 210000, directCosts: 46000, allocatedFixedCosts: 120000 },
        { name: 'Distribuție produse', profitCenterId: pcId('PC-300'), revenue: 310000, cogs: 232000, directCosts: 24000, allocatedFixedCosts: 60000 },
      ].map((s) => ({ ...s, organizationId: orgId })),
    });

    // cost lines for current period, referencing seeded ids by code
    const elems = await this.prisma.costElement.findMany({ where: { organizationId: orgId } });
    const ceId = (code: string) => elems.find((e) => e.code === code)!.id;
    const rows: [string, string, number, number][] = [
      ['CC-1000', '641', 42000, 43500], ['CC-1000', '645', 9200, 9550], ['CC-1000', '601', 68000, 74300],
      ['CC-1000', '681', 12000, 12000], ['CC-1000', '605', 8000, 9100],
      ['CC-2000', '641', 31000, 30200], ['CC-2000', '623', 18000, 24500], ['CC-2000', '625', 6000, 5200],
      ['CC-3000', '641', 22000, 22400], ['CC-3000', '628', 14000, 13100], ['CC-3000', '605', 4000, 4600],
      ['CC-4000', '641', 28000, 27500], ['CC-4000', '611', 16000, 17800],
      ['CC-5000', '641', 24000, 23000], ['CC-5000', '628', 9000, 8200],
      ['CC-9000', '641', 19000, 19000], ['CC-9000', '612', 15000, 15000], ['CC-9000', '611', 5000, 5400],
      ['CC-9900', '641', 26000, 26000], ['CC-9900', '666', 4000, 5100],
    ];
    await this.prisma.costLine.createMany({
      data: rows.map(([cc, ce, planned, actual]) => ({
        organizationId: orgId, costCenterId: ccId(cc), costElementId: ceId(ce), period: DEFAULT_PERIOD, planned, actual,
      })),
      skipDuplicates: true,
    });
    this.logger.log(`Controlling demo seeded for org ${orgId}`);
  }

  // =================== COST CENTERS ===================

  async getCostCenters(orgId: string): Promise<CostCenter[]> {
    await this.ensureSeeded(orgId);
    return this.prisma.costCenter.findMany({ where: { organizationId: orgId }, orderBy: { code: 'asc' } });
  }

  async getCostCenter(orgId: string, id: string): Promise<CostCenter> {
    const cc = await this.prisma.costCenter.findFirst({ where: { id, organizationId: orgId } });
    if (!cc) throw new NotFoundException(`Cost center ${id} not found`);
    return cc;
  }

  async createCostCenter(
    orgId: string,
    dto: { code: string; name: string; nameRo?: string; category: CostCenterCategory; managerName?: string },
    userId?: string,
  ): Promise<CostCenter> {
    if (!dto.code || !dto.name || !dto.category) {
      throw new BadRequestException('code, name and category are required');
    }
    const cc = await this.prisma.costCenter.create({
      data: {
        organizationId: orgId, code: dto.code, name: dto.name, nameRo: dto.nameRo || dto.name,
        category: dto.category as any, managerName: dto.managerName, currency: CURRENCY,
      },
    });
    await this.audit(orgId, userId, 'create', 'CostCenter', cc.id, { code: cc.code });
    return cc;
  }

  async upsertCostLine(
    orgId: string,
    dto: { costCenterId: string; costElementId: string; period?: string; planned: number; actual: number },
    userId?: string,
  ): Promise<{ costCenterId: string; costElementId: string; period: string; planned: number; actual: number }> {
    const period = dto.period || DEFAULT_PERIOD;
    const line = await this.prisma.costLine.upsert({
      where: {
        organizationId_costCenterId_costElementId_period: {
          organizationId: orgId, costCenterId: dto.costCenterId, costElementId: dto.costElementId, period,
        },
      },
      create: { organizationId: orgId, costCenterId: dto.costCenterId, costElementId: dto.costElementId, period, planned: dto.planned, actual: dto.actual },
      update: { planned: dto.planned, actual: dto.actual },
    });
    await this.audit(orgId, userId, 'upsert', 'CostLine', line.id, { period, planned: dto.planned, actual: dto.actual });
    return { costCenterId: line.costCenterId, costElementId: line.costElementId, period, planned: this.num(line.planned), actual: this.num(line.actual) };
  }

  async getCostCenterVariance(orgId: string, period = DEFAULT_PERIOD): Promise<VarianceLine[]> {
    await this.ensureSeeded(orgId);
    const [centers, lines] = await Promise.all([
      this.prisma.costCenter.findMany({ where: { organizationId: orgId } }),
      this.prisma.costLine.findMany({ where: { organizationId: orgId, period } }),
    ]);
    const out: VarianceLine[] = [];
    for (const cc of centers) {
      const rel = lines.filter((l) => l.costCenterId === cc.id);
      if (!rel.length) continue;
      const planned = rel.reduce((s, l) => s + this.num(l.planned), 0);
      const actual = rel.reduce((s, l) => s + this.num(l.actual), 0);
      const v = variance(planned, actual);
      out.push({
        costCenterId: cc.id, costCenterCode: cc.code, costCenterName: cc.nameRo,
        category: cc.category as CostCenterCategory, planned: round2(planned), actual: round2(actual),
        variance: v.amount, variancePercent: v.percent, status: varianceStatus(planned, actual),
      });
    }
    return out.sort((a, b) => a.variance - b.variance);
  }

  async getCostElementBreakdown(orgId: string, period = DEFAULT_PERIOD): Promise<CostElementBreakdown[]> {
    await this.ensureSeeded(orgId);
    const [elems, lines] = await Promise.all([
      this.prisma.costElement.findMany({ where: { organizationId: orgId } }),
      this.prisma.costLine.findMany({ where: { organizationId: orgId, period } }),
    ]);
    const totalActual = lines.reduce((s, l) => s + this.num(l.actual), 0) || 1;
    const out: CostElementBreakdown[] = [];
    for (const ce of elems) {
      const rel = lines.filter((l) => l.costElementId === ce.id);
      if (!rel.length) continue;
      const planned = rel.reduce((s, l) => s + this.num(l.planned), 0);
      const actual = rel.reduce((s, l) => s + this.num(l.actual), 0);
      const v = variance(planned, actual);
      out.push({
        costElementId: ce.id, code: ce.code, name: ce.name, category: ce.category as CostElementCategory,
        planned: round2(planned), actual: round2(actual), variance: v.amount, variancePercent: v.percent,
        sharePercent: round2((actual / totalActual) * 100),
      });
    }
    return out.sort((a, b) => b.actual - a.actual);
  }

  // =================== PROFIT CENTERS ===================

  async getProfitCenters(orgId: string): Promise<ProfitCenter[]> {
    await this.ensureSeeded(orgId);
    return this.prisma.profitCenter.findMany({ where: { organizationId: orgId }, orderBy: { code: 'asc' } });
  }

  async getProfitCenterResults(orgId: string): Promise<ProfitCenterResult[]> {
    await this.ensureSeeded(orgId);
    const [pcs, segs] = await Promise.all([
      this.prisma.profitCenter.findMany({ where: { organizationId: orgId } }),
      this.prisma.profitabilitySegment.findMany({ where: { organizationId: orgId } }),
    ]);
    const out: ProfitCenterResult[] = [];
    for (const pc of pcs) {
      const rel = segs.filter((s) => s.profitCenterId === pc.id);
      const revenue = rel.reduce((s, x) => s + this.num(x.revenue), 0);
      const cost = rel.reduce((s, x) => s + this.num(x.cogs) + this.num(x.directCosts) + this.num(x.allocatedFixedCosts), 0);
      const operatingResult = round2(revenue - cost);
      out.push({
        profitCenterId: pc.id, code: pc.code, name: pc.nameRo, revenue: round2(revenue), cost: round2(cost),
        operatingResult, marginPercent: revenue ? round2((operatingResult / revenue) * 100) : 0,
      });
    }
    return out.sort((a, b) => b.operatingResult - a.operatingResult);
  }

  // =================== INTERNAL ORDERS ===================

  async getInternalOrders(orgId: string): Promise<InternalOrder[]> {
    await this.ensureSeeded(orgId);
    const rows = await this.prisma.internalOrder.findMany({ where: { organizationId: orgId }, orderBy: { code: 'asc' } });
    return rows.map((o) => ({ ...o, budget: this.num(o.budget), actual: this.num(o.actual) }));
  }

  async createInternalOrder(
    orgId: string,
    input: { code?: string; name: string; type?: string; responsibleCostCenterId: string; budget?: number; startDate?: string; endDate?: string },
    userId?: string,
  ): Promise<InternalOrder> {
    if (!input.name || !input.responsibleCostCenterId) {
      throw new BadRequestException('name and responsibleCostCenterId are required');
    }
    const cc = await this.prisma.costCenter.findFirst({ where: { id: input.responsibleCostCenterId, organizationId: orgId } });
    if (!cc) throw new BadRequestException('responsibleCostCenterId does not exist for this organization');
    const count = await this.prisma.internalOrder.count({ where: { organizationId: orgId } });
    const io = await this.prisma.internalOrder.create({
      data: {
        organizationId: orgId,
        code: input.code || `IO-2026-${String(count + 1).padStart(3, '0')}`,
        name: input.name, type: (input.type as any) || 'project',
        responsibleCostCenterId: input.responsibleCostCenterId, budget: input.budget || 0, actual: 0,
        currency: CURRENCY, status: 'open', startDate: input.startDate || DEFAULT_PERIOD + '-01', endDate: input.endDate,
      },
    });
    await this.audit(orgId, userId, 'create', 'InternalOrder', io.id, { code: io.code });
    return { ...io, budget: this.num(io.budget), actual: this.num(io.actual) };
  }

  async getInternalOrderVariance(orgId: string) {
    const orders = await this.getInternalOrders(orgId);
    return orders.map((io) => ({
      ...io,
      variance: round2(io.budget - io.actual),
      utilizationPercent: io.budget ? round2((io.actual / io.budget) * 100) : 0,
      status_rag: varianceStatus(io.budget, io.actual),
    }));
  }

  // =================== ALLOCATION ===================

  async getAllocationCycles(orgId: string): Promise<AllocationCycle[]> {
    await this.ensureSeeded(orgId);
    return this.prisma.allocationCycle.findMany({ where: { organizationId: orgId } }) as any;
  }

  /**
   * Run an assessment/distribution cycle. Persists immutable postings (sender −,
   * receivers +) via a secondary cost element. Idempotent: re-running for the
   * same (cycle, period) reverses the previous run before posting a fresh one,
   * so totals never double-count. `dryRun` returns the computed postings without
   * writing anything.
   */
  async runAllocationCycle(
    orgId: string,
    cycleId: string,
    period = DEFAULT_PERIOD,
    opts?: { dryRun?: boolean; userId?: string },
  ) {
    const cycle = await this.prisma.allocationCycle.findFirst({ where: { id: cycleId, organizationId: orgId } });
    if (!cycle) throw new NotFoundException(`Allocation cycle ${cycleId} not found`);

    const [lines, centers, elems] = await Promise.all([
      this.prisma.costLine.findMany({ where: { organizationId: orgId, period } }),
      this.prisma.costCenter.findMany({ where: { organizationId: orgId } }),
      this.prisma.costElement.findMany({ where: { organizationId: orgId } }),
    ]);
    const personnelIds = new Set(elems.filter((e) => e.category === 'personnel').map((e) => e.id));
    const secondary = elems.find((e) => e.type === 'secondary') || elems[0];
    if (!secondary) throw new BadRequestException('No cost element available for allocation posting');

    const senderTotal = lines
      .filter((l) => l.costCenterId === cycle.senderCostCenterId)
      .reduce((s, l) => s + this.num(l.actual), 0);

    const weights = cycle.receiverCostCenterIds.map((rid) => {
      const rel = lines.filter((l) => l.costCenterId === rid);
      if (cycle.driver === 'headcount') {
        return rel.filter((l) => personnelIds.has(l.costElementId)).reduce((s, l) => s + this.num(l.actual), 0) / 5000;
      }
      if (cycle.driver === 'revenue_share') {
        return rel.reduce((s, l) => s + this.num(l.actual), 0);
      }
      return 1;
    });
    const weightSum = weights.reduce((s, w) => s + w, 0) || 1;
    const amounts = allocateAmount(senderTotal, weights);
    const receiverPostings = cycle.receiverCostCenterIds.map((rid, i) => {
      const cc = centers.find((c) => c.id === rid);
      return { receiverId: rid, receiverName: cc?.nameRo || rid, driverWeight: round2((weights[i] / weightSum) * 100), amount: amounts[i] };
    });

    if (opts?.dryRun) {
      return {
        cycle, senderTotal: round2(senderTotal), dryRun: true, persisted: false,
        reversedPrevious: 0, runId: null, postings: receiverPostings,
        senderPosting: { costCenterId: cycle.senderCostCenterId, amount: round2(-senderTotal) },
      };
    }

    const runId = randomUUID();
    // Idempotency: reverse any prior live run for this (cycle, period).
    const reversal = await this.prisma.allocationPosting.updateMany({
      where: { organizationId: orgId, cycleId, period, reversed: false },
      data: { reversed: true },
    });
    const rows = [
      { organizationId: orgId, cycleId, runId, period, costCenterId: cycle.senderCostCenterId, costElementId: secondary.id, direction: 'sender', amount: round2(-senderTotal) },
      ...receiverPostings.map((p) => ({ organizationId: orgId, cycleId, runId, period, costCenterId: p.receiverId, costElementId: secondary.id, direction: 'receiver', amount: p.amount })),
    ];
    await this.prisma.allocationPosting.createMany({ data: rows });
    await this.audit(orgId, opts?.userId, 'run', 'AllocationCycle', cycleId, { runId, period, senderTotal: round2(senderTotal) });

    return {
      cycle, senderTotal: round2(senderTotal), dryRun: false, persisted: true,
      reversedPrevious: reversal.count, runId, postings: receiverPostings,
      senderPosting: { costCenterId: cycle.senderCostCenterId, amount: round2(-senderTotal) },
    };
  }

  /** Current (non-reversed) allocation postings for a cycle+period, with net per cost center. */
  async getAllocationPostings(orgId: string, cycleId: string, period = DEFAULT_PERIOD) {
    const [rows, centers] = await Promise.all([
      this.prisma.allocationPosting.findMany({ where: { organizationId: orgId, cycleId, period, reversed: false }, orderBy: { createdAt: 'asc' } }),
      this.prisma.costCenter.findMany({ where: { organizationId: orgId } }),
    ]);
    const name = (id: string) => centers.find((c) => c.id === id)?.nameRo || id;
    return rows.map((r) => ({
      id: r.id, runId: r.runId, period: r.period, direction: r.direction,
      costCenterId: r.costCenterId, costCenterName: name(r.costCenterId), amount: this.num(r.amount),
    }));
  }

  // =================== INTERNAL ORDER LIFECYCLE (DOC-43-2) ===================

  async updateInternalOrder(
    orgId: string,
    id: string,
    dto: { name?: string; budget?: number; actual?: number; endDate?: string; status?: InternalOrderStatus },
    userId?: string,
  ): Promise<InternalOrder> {
    const io = await this.prisma.internalOrder.findFirst({ where: { id, organizationId: orgId } });
    if (!io) throw new NotFoundException(`Internal order ${id} not found`);
    if (dto.status && !canTransitionInternalOrder(io.status as InternalOrderStatus, dto.status)) {
      throw new BadRequestException(`Invalid status transition: ${io.status} → ${dto.status}`);
    }
    const updated = await this.prisma.internalOrder.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        budget: dto.budget ?? undefined,
        actual: dto.actual ?? undefined,
        endDate: dto.endDate ?? undefined,
        status: (dto.status as any) ?? undefined,
      },
    });
    await this.audit(orgId, userId, 'update', 'InternalOrder', id, { status: updated.status });
    return { ...updated, budget: this.num(updated.budget), actual: this.num(updated.actual) };
  }

  async closeInternalOrder(orgId: string, id: string, userId?: string): Promise<InternalOrder> {
    return this.updateInternalOrder(orgId, id, { status: 'closed' }, userId);
  }

  // =================== CO-PA SEGMENT WRITES (DOC-43-1) ===================

  async createSegment(
    orgId: string,
    dto: { name: string; profitCenterId: string; revenue: number; cogs: number; directCosts: number; allocatedFixedCosts: number },
    userId?: string,
  ) {
    if (!dto.name || !dto.profitCenterId) throw new BadRequestException('name and profitCenterId are required');
    const pc = await this.prisma.profitCenter.findFirst({ where: { id: dto.profitCenterId, organizationId: orgId } });
    if (!pc) throw new BadRequestException('profitCenterId does not exist for this organization');
    const seg = await this.prisma.profitabilitySegment.create({
      data: { organizationId: orgId, name: dto.name, profitCenterId: dto.profitCenterId, revenue: dto.revenue, cogs: dto.cogs, directCosts: dto.directCosts, allocatedFixedCosts: dto.allocatedFixedCosts },
    });
    await this.audit(orgId, userId, 'create', 'ProfitabilitySegment', seg.id, { name: seg.name });
    return seg;
  }

  async updateSegment(
    orgId: string,
    id: string,
    dto: { name?: string; revenue?: number; cogs?: number; directCosts?: number; allocatedFixedCosts?: number },
    userId?: string,
  ) {
    const seg = await this.prisma.profitabilitySegment.findFirst({ where: { id, organizationId: orgId } });
    if (!seg) throw new NotFoundException(`Segment ${id} not found`);
    const updated = await this.prisma.profitabilitySegment.update({
      where: { id },
      data: { name: dto.name ?? undefined, revenue: dto.revenue ?? undefined, cogs: dto.cogs ?? undefined, directCosts: dto.directCosts ?? undefined, allocatedFixedCosts: dto.allocatedFixedCosts ?? undefined },
    });
    await this.audit(orgId, userId, 'update', 'ProfitabilitySegment', id, { name: updated.name });
    return updated;
  }

  // =================== CO-PA ===================

  async getContributionMargins(orgId: string): Promise<ContributionMarginResult[]> {
    await this.ensureSeeded(orgId);
    const [segs, pcs] = await Promise.all([
      this.prisma.profitabilitySegment.findMany({ where: { organizationId: orgId } }),
      this.prisma.profitCenter.findMany({ where: { organizationId: orgId } }),
    ]);
    const out: ContributionMarginResult[] = segs.map((s) => {
      const cm = contributionMargin({
        revenue: this.num(s.revenue), cogs: this.num(s.cogs),
        directCosts: this.num(s.directCosts), allocatedFixedCosts: this.num(s.allocatedFixedCosts),
      });
      return {
        segmentId: s.id, name: s.name, profitCenterName: pcs.find((p) => p.id === s.profitCenterId)?.nameRo || '—',
        revenue: round2(this.num(s.revenue)), variableCosts: cm.variableCosts, contributionMargin1: cm.contributionMargin1,
        cm1Percent: cm.cm1Percent, allocatedFixedCosts: round2(this.num(s.allocatedFixedCosts)),
        operatingResult: cm.operatingResult, operatingMarginPercent: cm.operatingMarginPercent,
      };
    });
    return out.sort((a, b) => b.contributionMargin1 - a.contributionMargin1);
  }

  // =================== KPI COCKPIT ===================

  async getKpiCockpit(orgId: string, period = DEFAULT_PERIOD): Promise<KpiCockpit> {
    await this.ensureSeeded(orgId);
    const [lines, centers, elems, segs, ccCount, pcCount, openIo] = await Promise.all([
      this.prisma.costLine.findMany({ where: { organizationId: orgId, period } }),
      this.prisma.costCenter.findMany({ where: { organizationId: orgId } }),
      this.prisma.costElement.findMany({ where: { organizationId: orgId } }),
      this.prisma.profitabilitySegment.findMany({ where: { organizationId: orgId } }),
      this.prisma.costCenter.count({ where: { organizationId: orgId } }),
      this.prisma.profitCenter.count({ where: { organizationId: orgId } }),
      this.prisma.internalOrder.count({ where: { organizationId: orgId, status: { in: ['open', 'released'] } } }),
    ]);
    const budgetPlanned = lines.reduce((s, l) => s + this.num(l.planned), 0);
    const budgetActual = lines.reduce((s, l) => s + this.num(l.actual), 0);
    const totalRevenue = segs.reduce((s, x) => s + this.num(x.revenue), 0);
    const totalCost = segs.reduce((s, x) => s + this.num(x.cogs) + this.num(x.directCosts) + this.num(x.allocatedFixedCosts), 0);
    const grossProfit = totalRevenue - segs.reduce((s, x) => s + this.num(x.cogs), 0);
    const ebitda = totalRevenue - totalCost;

    const personnelElemIds = new Set(elems.filter((e) => e.category === 'personnel').map((e) => e.id));
    const personnelAnnual = lines.filter((l) => personnelElemIds.has(l.costElementId)).reduce((s, l) => s + this.num(l.actual), 0) * 12;
    const overheadCcIds = new Set(centers.filter((c) => ['administration', 'it', 'management'].includes(c.category)).map((c) => c.id));
    const overheadAnnual = lines.filter((l) => overheadCcIds.has(l.costCenterId)).reduce((s, l) => s + this.num(l.actual), 0) * 12;

    return {
      period, currency: CURRENCY, totalRevenue: round2(totalRevenue), totalCost: round2(totalCost),
      ebitda: round2(ebitda), ebitdaMarginPercent: totalRevenue ? round2((ebitda / totalRevenue) * 100) : 0,
      grossMarginPercent: totalRevenue ? round2((grossProfit / totalRevenue) * 100) : 0,
      personnelCostRatio: totalRevenue ? round2((personnelAnnual / totalRevenue) * 100) : 0,
      overheadRatio: totalRevenue ? round2((overheadAnnual / totalRevenue) * 100) : 0,
      budgetPlanned: round2(budgetPlanned), budgetActual: round2(budgetActual),
      budgetUtilizationPercent: budgetPlanned ? round2((budgetActual / budgetPlanned) * 100) : 0,
      costCenterCount: ccCount, profitCenterCount: pcCount, openInternalOrders: openIo,
    };
  }

  // =================== EXECUTIVE SUMMARY ===================

  async getExecutiveSummary(orgId: string, period = DEFAULT_PERIOD) {
    const [kpi, variances, segments, ioVar] = await Promise.all([
      this.getKpiCockpit(orgId, period),
      this.getCostCenterVariance(orgId, period),
      this.getContributionMargins(orgId),
      this.getInternalOrderVariance(orgId),
    ]);
    const topVariances = variances.filter((v) => v.status === 'warning' || v.status === 'critical');
    const alerts: { severity: VarianceStatus; message: string; messageRo: string }[] = [];
    for (const v of topVariances) {
      alerts.push({
        severity: v.status,
        message: `${v.costCenterName} over budget by ${Math.abs(v.variancePercent)}% (${Math.abs(v.variance)} ${CURRENCY})`,
        messageRo: `${v.costCenterName} depășește bugetul cu ${Math.abs(v.variancePercent)}% (${Math.abs(v.variance)} ${CURRENCY})`,
      });
    }
    for (const io of ioVar) {
      if (io.status_rag === 'critical') {
        alerts.push({
          severity: 'critical',
          message: `Internal order ${io.code} exceeded budget (${io.utilizationPercent}% used)`,
          messageRo: `Ordinul intern ${io.code} a depășit bugetul (${io.utilizationPercent}% consumat)`,
        });
      }
    }
    return { kpi, topVariances, bestSegment: segments[0], worstSegment: segments[segments.length - 1], alerts };
  }
}
