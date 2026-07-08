import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

const MAX_MESSAGE = 2000;
const MAX_STACK = 8000;
const MAX_URL = 500;
const RETENTION_DAYS = 30; // GDPR data-minimisation: purge after 30 days

export interface ClientErrorInput {
  level?: string;
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  meta?: Record<string, unknown>;
}

@Injectable()
export class ClientLogsService {
  private readonly logger = new Logger(ClientLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Ingest a batch of frontend errors (already rate-limited at the controller). */
  async ingest(entries: ClientErrorInput[], userId?: string, orgId?: string): Promise<{ stored: number }> {
    const rows = (entries ?? [])
      .filter((e) => e && typeof e.message === 'string' && e.message.trim().length > 0)
      .slice(0, 20) // hard cap per batch
      .map((e) => ({
        source: 'frontend',
        level: e.level === 'warning' ? 'warning' : 'error',
        message: e.message.slice(0, MAX_MESSAGE),
        stack: e.stack ? String(e.stack).slice(0, MAX_STACK) : null,
        url: e.url ? String(e.url).slice(0, MAX_URL) : null,
        userAgent: e.userAgent ? String(e.userAgent).slice(0, 300) : null,
        userId: userId ?? null,
        orgId: orgId ?? null,
        meta: (e.meta as any) ?? undefined,
      }));
    if (!rows.length) return { stored: 0 };
    await this.prisma.clientErrorLog.createMany({ data: rows });
    return { stored: rows.length };
  }

  /** Persist a backend 5xx (called best-effort by the global exception filter). */
  async recordBackendError(message: string, stack?: string, url?: string, userId?: string): Promise<void> {
    try {
      await this.prisma.clientErrorLog.create({
        data: {
          source: 'backend',
          level: 'error',
          message: String(message).slice(0, MAX_MESSAGE),
          stack: stack ? String(stack).slice(0, MAX_STACK) : null,
          url: url ? String(url).slice(0, MAX_URL) : null,
          userId: userId ?? null,
        },
      });
    } catch {
      // never let logging break the request path
    }
  }

  async list(opts: { source?: string; level?: string; take?: number; before?: string; q?: string }) {
    const take = Math.min(Math.max(opts.take ?? 50, 1), 200);
    const where: any = {};
    if (opts.source) where.source = opts.source;
    if (opts.level) where.level = opts.level;
    if (opts.before) where.createdAt = { lt: new Date(opts.before) };
    if (opts.q) where.message = { contains: opts.q, mode: 'insensitive' };
    const [items, total] = await Promise.all([
      this.prisma.clientErrorLog.findMany({ where, orderBy: { createdAt: 'desc' }, take }),
      this.prisma.clientErrorLog.count({ where }),
    ]);
    return { items, total };
  }

  async stats() {
    const since24h = new Date(Date.now() - 24 * 3600 * 1000);
    const [total, last24h, frontend, backend] = await Promise.all([
      this.prisma.clientErrorLog.count(),
      this.prisma.clientErrorLog.count({ where: { createdAt: { gte: since24h } } }),
      this.prisma.clientErrorLog.count({ where: { source: 'frontend' } }),
      this.prisma.clientErrorLog.count({ where: { source: 'backend' } }),
    ]);
    return { total, last24h, frontend, backend, retentionDays: RETENTION_DAYS };
  }

  /** Nightly retention purge (GDPR data minimisation). */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeOld(): Promise<void> {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 3600 * 1000);
    const res = await this.prisma.clientErrorLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
    if (res.count > 0) this.logger.log(`Purged ${res.count} client error logs older than ${RETENTION_DAYS}d`);
  }
}
