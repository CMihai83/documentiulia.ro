import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AuditChainService } from '../audit/audit-chain.service';
import {
  EnisaInputs, computeNotifyDueAt, enisaScore, enisaSeverity,
  subjectNotificationRequired, ansdpcNotificationDraft, breachHoursRemaining,
} from './breach.logic';
import { artifactStamp } from './legal-terms';

@Injectable()
export class GdprBreachService {
  private readonly logger = new Logger(GdprBreachService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditChainService,
  ) {}

  private async orgName(orgId: string): Promise<string> {
    const o = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
    return o?.name ?? 'Operatorul';
  }

  /** Record a breach. detectedAt defaults to now; severity computed from ENISA inputs. */
  async create(orgId: string, userId: string, dto: {
    description: string; categories?: string[]; affectedCount?: number;
    detectedAt?: string; enisa: EnisaInputs; measuresTaken?: string; dpoContact?: string;
  }) {
    const detectedAt = dto.detectedAt ? new Date(dto.detectedAt) : new Date();
    const score = enisaScore(dto.enisa);
    const severity = enisaSeverity(dto.enisa);
    const orgName = await this.orgName(orgId);
    const ansdpcDraft = ansdpcNotificationDraft({
      orgName, detectedAt, description: dto.description,
      categories: dto.categories ?? [], affectedCount: dto.affectedCount ?? 0,
      severity, measuresTaken: dto.measuresTaken, dpoContact: dto.dpoContact,
    });
    const subjectDraft = subjectNotificationRequired(severity)
      ? { ...artifactStamp(), text: `Vă informăm despre un incident de securitate (${severity}). ${dto.description}` }
      : null;

    const row = await this.prisma.breachIncident.create({
      data: {
        orgId, description: dto.description, categories: dto.categories ?? [],
        affectedCount: dto.affectedCount ?? 0, detectedAt,
        notifyDueAt: computeNotifyDueAt(detectedAt), severity, enisaScore: score,
        status: 'assessed', ansdpcDraft: { ...ansdpcDraft, ...artifactStamp() } as any,
        subjectDraft: subjectDraft as any,
      },
    });
    await this.prisma.breachAction.create({ data: { incidentId: row.id, type: 'assessed', payload: { severity, score } } });
    await this.audit.appendAudit({ userId, organizationId: orgId, action: 'gdprext.breach.create', entity: 'BreachIncident', entityId: row.id });
    return row;
  }

  async list(orgId: string) {
    const rows = await this.prisma.breachIncident.findMany({ where: { orgId }, orderBy: { detectedAt: 'desc' }, take: 200 });
    const now = new Date();
    return rows.map((r) => ({ ...r, hoursRemaining: breachHoursRemaining(now, r.notifyDueAt) }));
  }

  async get(orgId: string, id: string) {
    const r = await this.prisma.breachIncident.findFirst({ where: { id, orgId }, include: { actions: { orderBy: { at: 'asc' } } } });
    if (!r) throw new NotFoundException();
    return r;
  }

  /** Mark notified (records the timestamp; NEVER auto-submits anywhere). */
  async markNotified(orgId: string, userId: string, id: string) {
    const r = await this.prisma.breachIncident.findFirst({ where: { id, orgId } });
    if (!r) throw new NotFoundException();
    const row = await this.prisma.breachIncident.update({ where: { id }, data: { notified: true, dpaNotifiedAt: new Date(), status: 'notified' } });
    await this.prisma.breachAction.create({ data: { incidentId: id, type: 'notified_manual', payload: { at: row.dpaNotifiedAt } } });
    await this.audit.appendAudit({ userId, organizationId: orgId, action: 'gdprext.breach.notified', entity: 'BreachIncident', entityId: id });
    return row;
  }

  /** Art 33(5): record why a breach was NOT notified (kept in the register). */
  async markNotNotified(orgId: string, userId: string, id: string, reason: string) {
    const r = await this.prisma.breachIncident.findFirst({ where: { id, orgId } });
    if (!r) throw new NotFoundException();
    const row = await this.prisma.breachIncident.update({ where: { id }, data: { notified: false, notNotifiedReason: reason, status: 'closed' } });
    await this.prisma.breachAction.create({ data: { incidentId: id, type: 'not_notified', payload: { reason } } });
    return row;
  }

  /** Art 33(5) register — EVERY breach, incl. non-notified with justification. */
  async register(orgId: string) {
    const rows = await this.prisma.breachIncident.findMany({ where: { orgId }, orderBy: { detectedAt: 'desc' } });
    return {
      generatedAt: new Date().toISOString(),
      ...artifactStamp(),
      incidents: rows.map((r) => ({
        id: r.id, detectedAt: r.detectedAt, severity: r.severity, affectedCount: r.affectedCount,
        categories: r.categories, notified: r.notified, dpaNotifiedAt: r.dpaNotifiedAt,
        notNotifiedReason: r.notified ? null : (r.notNotifiedReason ?? 'A se completa justificarea (Art. 33(5)).'),
      })),
    };
  }

  /** Warn as the 72h window closes. */
  @Cron(CronExpression.EVERY_HOUR)
  async sweep() {
    const open = await this.prisma.breachIncident.findMany({ where: { status: { in: ['triage', 'assessed'] }, notified: false } });
    const now = new Date();
    for (const r of open) {
      try {
        const h = breachHoursRemaining(now, r.notifyDueAt);
        if (h <= 24 && h >= 0) this.logger.warn(`Breach ${r.id}: ${h}h left to notify ANSPDCP (Art 33)`);
        if (h < 0 && r.status !== 'closed') this.logger.warn(`Breach ${r.id}: 72h notify window PASSED`);
      } catch (e: any) { this.logger.warn(`breach sweep failed for ${r.id}: ${e?.message}`); }
    }
  }
}
