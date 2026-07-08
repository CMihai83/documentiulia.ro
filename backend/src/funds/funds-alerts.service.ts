import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationCenterService } from '../notifications/notification-center.service';

/**
 * FND-9 follow-up — durability deadline alerts.
 *
 * `DurabilityEvent.alertAt` (dueDate − 30d) is the durable source of truth.
 * This daily sweep finds due, un-alerted events and notifies the obligation
 * owner. Dedupe is DB-backed: the event's `status` moves 'pending' → 'alerted'
 * (nothing else reads that field; 'done' remains the terminal user-set state),
 * so restarts and repeated sweeps can never double-alert.
 */
@Injectable()
export class FundsAlertsService {
  private readonly logger = new Logger(FundsAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notifications?: NotificationCenterService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async sweepCron(): Promise<void> {
    try {
      const n = await this.sweep();
      if (n > 0) this.logger.log(`Durability sweep: ${n} alert(s) sent`);
    } catch (e: any) {
      this.logger.warn(`Durability sweep failed: ${e?.message}`);
    }
  }

  /** Returns the number of alerts sent. Idempotent: status flips to 'alerted'. */
  async sweep(now: Date = new Date()): Promise<number> {
    const due = await this.prisma.durabilityEvent.findMany({
      where: { alertAt: { lte: now }, status: 'pending' },
      include: { obligation: true },
      orderBy: { alertAt: 'asc' },
      take: 200,
    });

    let sent = 0;
    for (const ev of due) {
      try {
        await this.notifications?.createNotification({
          userId: ev.obligation.userId,
          tenantId: ev.obligation.organizationId ?? ev.obligation.userId,
          title: `Termen ${ev.kind === 'reporting' ? 'raportare' : ev.kind === 'procurement' ? 'achiziții' : 'durabilitate'} în 30 de zile`,
          message: `${ev.obligation.title}: ${ev.descriptionRo} — scadent ${ev.dueDate.toISOString().slice(0, 10)}.`,
          type: 'warning',
          category: 'funds-durability',
          priority: 'high',
          actionUrl: '/dashboard/funds',
          metadata: { durabilityEventId: ev.id, obligationId: ev.obligationId, dueDate: ev.dueDate },
        });
        // Flip AFTER a successful notify; a notify failure leaves it pending for the next sweep.
        await this.prisma.durabilityEvent.update({ where: { id: ev.id }, data: { status: 'alerted' } });
        sent++;
      } catch (e: any) {
        this.logger.warn(`Alert for durability event ${ev.id} failed (${e?.message}) — will retry next sweep`);
      }
    }
    return sent;
  }
}
