import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface GoalDto {
  metric: 'revenue' | 'profit' | 'invoices' | 'customers';
  targetValue: number;
  period: string; // YYYY or YYYY-MM
  note?: string;
}

const METRICS = ['revenue', 'profit', 'invoices', 'customers'];

/** Period → [start, end) date window. Pure, unit-tested. */
export function periodWindow(period: string): { start: Date; end: Date } {
  if (/^\d{4}$/.test(period)) {
    const y = parseInt(period, 10);
    return { start: new Date(Date.UTC(y, 0, 1)), end: new Date(Date.UTC(y + 1, 0, 1)) };
  }
  const m = period.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    if (mo >= 0 && mo <= 11) return { start: new Date(Date.UTC(y, mo, 1)), end: new Date(Date.UTC(y, mo + 1, 1)) };
  }
  throw new BadRequestException('Perioadă invalidă — folosiți YYYY sau YYYY-MM.');
}

/** Pure progress math — mirrors /dashboard/quick-stats derivations. */
export function computeProgress(metric: string, target: number, facts: { income: number; expenses: number; issuedCount: number; customers: number }) {
  const current =
    metric === 'revenue' ? facts.income
    : metric === 'profit' ? facts.income - facts.expenses
    : metric === 'invoices' ? facts.issuedCount
    : facts.customers;
  const pct = target > 0 ? Math.round((current / target) * 1000) / 10 : null;
  return { current: Math.round(current * 100) / 100, target, progressPct: pct, achieved: target > 0 && current >= target };
}

@Injectable()
export class BusinessGoalsService {
  constructor(private readonly prisma: PrismaService) {}

  list(orgId: string) {
    return this.prisma.businessGoal.findMany({ where: { orgId }, orderBy: [{ period: 'desc' }, { metric: 'asc' }] });
  }

  create(orgId: string, dto: GoalDto) {
    if (!METRICS.includes(dto.metric)) throw new BadRequestException('Metrică necunoscută.');
    periodWindow(dto.period); // validates
    if (!(dto.targetValue > 0)) throw new BadRequestException('Ținta trebuie să fie pozitivă.');
    return this.prisma.businessGoal.create({
      data: { orgId, metric: dto.metric, targetValue: dto.targetValue, period: dto.period, note: dto.note },
    });
  }

  private async owned(orgId: string, id: string) {
    const g = await this.prisma.businessGoal.findFirst({ where: { id, orgId } });
    if (!g) throw new NotFoundException('Obiectivul nu există.');
    return g;
  }

  async update(orgId: string, id: string, dto: Partial<GoalDto>) {
    await this.owned(orgId, id);
    if (dto.period) periodWindow(dto.period);
    if (dto.metric && !METRICS.includes(dto.metric)) throw new BadRequestException('Metrică necunoscută.');
    return this.prisma.businessGoal.update({
      where: { id },
      data: {
        ...(dto.metric !== undefined && { metric: dto.metric }),
        ...(dto.targetValue !== undefined && { targetValue: dto.targetValue }),
        ...(dto.period !== undefined && { period: dto.period }),
        ...(dto.note !== undefined && { note: dto.note }),
      },
    });
  }

  async remove(orgId: string, id: string) {
    await this.owned(orgId, id);
    await this.prisma.businessGoal.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Progress per goal from REAL data — the same sources /dashboard/quick-stats
   * uses: revenue = ISSUED invoices' grossAmount, expenses = RECEIVED,
   * profit = revenue − expenses, invoices = ISSUED count, customers = partners.
   */
  async progress(orgId: string, userId: string) {
    const goals = await this.list(orgId);
    const scope = { OR: [{ organizationId: orgId }, { userId }] };
    const out = [] as any[];
    for (const g of goals) {
      const { start, end } = periodWindow(g.period);
      const invoices = await this.prisma.invoice.findMany({
        where: { OR: [{ organizationId: orgId } as any, { userId }], invoiceDate: { gte: start, lt: end } },
        select: { type: true, grossAmount: true },
      });
      const income = invoices.filter((i) => i.type === 'ISSUED').reduce((s, i) => s + Number(i.grossAmount || 0), 0);
      const expenses = invoices.filter((i) => i.type === 'RECEIVED').reduce((s, i) => s + Number(i.grossAmount || 0), 0);
      const issuedCount = invoices.filter((i) => i.type === 'ISSUED').length;
      const customers = await this.prisma.partner.count({ where: { ...scope, type: 'CUSTOMER' as any } });
      out.push({ ...g, ...computeProgress(g.metric, Number(g.targetValue), { income, expenses, issuedCount, customers }) });
    }
    return out;
  }
}
