import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DE_MINIMIS_CEILING_EUR } from './funds-matching.logic';

/**
 * FND-3 — de minimis ledger for a single undertaking. Cumulative aid over a rolling
 * 3-year window (Reg. EU 2023/2831, €300k). headroom feeds the FND-2 filter 6.
 */
@Injectable()
export class DeMinimisService {
  private readonly logger = new Logger(DeMinimisService.name);
  readonly CEILING = DE_MINIMIS_CEILING_EUR;
  readonly ALERT_RATIO = 0.8;

  constructor(private readonly prisma: PrismaService) {}

  /** Sum of aid awarded within 3 years before `asOf` (default: reference horizon). */
  async rollingTotal(organizationId: string, asOf: Date = new Date('2026-07-01')): Promise<number> {
    const from = new Date(asOf);
    from.setFullYear(from.getFullYear() - 3);
    const rows = await this.prisma.deMinimisAid.findMany({
      where: { organizationId, awardedDate: { gt: from, lte: asOf } },
      select: { amountEur: true },
    });
    return rows.reduce((s, r) => s + (r.amountEur ?? 0), 0);
  }

  async headroom(organizationId: string, asOf?: Date): Promise<number> {
    const used = await this.rollingTotal(organizationId, asOf);
    return Math.max(0, this.CEILING - used);
  }

  /** Headroom + usage ratio + an 80% alert flag. */
  async status(organizationId: string, asOf?: Date) {
    const used = await this.rollingTotal(organizationId, asOf);
    const headroom = Math.max(0, this.CEILING - used);
    const ratio = used / this.CEILING;
    return {
      ceilingEur: this.CEILING,
      usedEur: Math.round(used),
      headroomEur: Math.round(headroom),
      usedRatio: Number(ratio.toFixed(4)),
      alert: ratio >= this.ALERT_RATIO,
      alertMessage: ratio >= this.ALERT_RATIO
        ? `De minimis usage at ${Math.round(ratio * 100)}% of the €300k ceiling.`
        : null,
    };
  }

  async wouldExceed(organizationId: string, requestedEur: number, asOf?: Date): Promise<boolean> {
    const headroom = await this.headroom(organizationId, asOf);
    return requestedEur > headroom;
  }

  record(organizationId: string, dto: { grantorProgram: string; amountEur: number; awardedDate: string; source?: string }) {
    return this.prisma.deMinimisAid.create({
      data: {
        organizationId,
        grantorProgram: dto.grantorProgram,
        amountEur: dto.amountEur,
        awardedDate: new Date(dto.awardedDate),
        source: dto.source ?? 'self-declared',
      },
    });
  }

  list(organizationId: string) {
    return this.prisma.deMinimisAid.findMany({ where: { organizationId }, orderBy: { awardedDate: 'desc' } });
  }
}
