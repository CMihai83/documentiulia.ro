import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AuditChainService } from '../audit/audit-chain.service';
import { contentHashOf, diffProgram, extractFacts, ProposedChange } from './funds-refresh.logic';

/**
 * S-57 AI-1 — funds-catalog auto-refresh. Deterministic fetch → extract →
 * diff → PENDING revision. Nothing is ever auto-applied: a human approves
 * (which applies + audit-logs) or rejects. Idempotent per (program, contentHash).
 */
@Injectable()
export class FundsRefreshService {
  private readonly logger = new Logger(FundsRefreshService.name);
  /** Only these fields may ever be applied from a revision. */
  private static readonly APPLICABLE = new Set(['status', 'closesAt', 'ceilingEur']);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditChainService,
  ) {}

  /** Weekly sweep (Mondays 06:00) + manual POST funds/refresh. */
  @Cron(CronExpression.EVERY_WEEK)
  async scheduledRefresh() {
    try {
      const res = await this.refreshAll();
      this.logger.log(`Weekly funds refresh: ${JSON.stringify(res)}`);
    } catch (e: any) {
      this.logger.warn(`Weekly funds refresh failed: ${e?.message}`);
    }
  }

  async refreshAll(): Promise<{ checked: number; revisionsCreated: number; failures: number }> {
    const programs = await this.prisma.fundingProgram.findMany({ where: { sourceUrl: { not: '' } } });
    let created = 0;
    let failures = 0;
    for (const p of programs) {
      try {
        const html = await this.fetchPage(p.sourceUrl);
        const facts = extractFacts(html);
        const changes = diffProgram({ status: p.status, closesAt: p.closesAt, ceilingEur: p.ceilingEur }, facts);
        if (!changes.length) continue;
        const contentHash = contentHashOf(facts);
        // idempotent: same program + same extracted content → no duplicate
        const existing = await this.prisma.fundingProgramRevision.findUnique({
          where: { programId_contentHash: { programId: p.id, contentHash } },
        });
        if (existing) continue;
        await this.prisma.fundingProgramRevision.create({
          data: {
            programId: p.id,
            sourceUrl: p.sourceUrl,
            rawExcerpt: facts.excerpt,
            proposedChanges: changes as any,
            contentHash,
            status: 'pending',
          },
        });
        created++;
      } catch (e: any) {
        failures++; // one program failing must never stop the sweep
        this.logger.warn(`refresh failed for ${p.name} (${p.sourceUrl}): ${e?.message}`);
      }
    }
    return { checked: programs.length, revisionsCreated: created, failures };
  }

  private async fetchPage(url: string): Promise<string> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'DocumentIulia-FundsBot/1.0 (+https://documentiulia.ro)' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } finally {
      clearTimeout(t);
    }
  }

  async listRevisions(status?: string) {
    const revisions = await this.prisma.fundingProgramRevision.findMany({
      where: status ? { status } : undefined,
      orderBy: { fetchedAt: 'desc' },
      take: 100,
    });
    const programs = await this.prisma.fundingProgram.findMany({
      where: { id: { in: [...new Set(revisions.map((r) => r.programId))] } },
      select: { id: true, name: true },
    });
    const nameById = new Map(programs.map((p) => [p.id, p.name]));
    return revisions.map((r) => ({ ...r, programName: nameById.get(r.programId) ?? r.programId }));
  }

  async approve(revisionId: string, reviewerUserId: string) {
    const rev = await this.prisma.fundingProgramRevision.findUnique({ where: { id: revisionId } });
    if (!rev) throw new NotFoundException('Revision not found');
    if (rev.status !== 'pending') throw new BadRequestException(`Revision is already ${rev.status}.`);

    const changes = (rev.proposedChanges as any as ProposedChange[]).filter((c) =>
      FundsRefreshService.APPLICABLE.has(c.field),
    );
    const data: Record<string, any> = {};
    for (const c of changes) {
      data[c.field] = c.field === 'closesAt' && c.new ? new Date(`${c.new}T23:59:59Z`) : c.new;
    }
    const [program] = await this.prisma.$transaction([
      this.prisma.fundingProgram.update({ where: { id: rev.programId }, data }),
      this.prisma.fundingProgramRevision.update({
        where: { id: revisionId },
        data: { status: 'approved', reviewedBy: reviewerUserId, reviewedAt: new Date() },
      }),
    ]);
    await this.audit
      .appendAudit({
        userId: reviewerUserId,
        action: 'funds.revision.approve',
        entity: 'FundingProgram',
        entityId: rev.programId,
        details: { revisionId, applied: changes, sourceUrl: rev.sourceUrl },
      })
      .catch((e) => this.logger.warn(`audit failed: ${e?.message}`));
    return { applied: changes, program };
  }

  async reject(revisionId: string, reviewerUserId: string) {
    const rev = await this.prisma.fundingProgramRevision.findUnique({ where: { id: revisionId } });
    if (!rev) throw new NotFoundException('Revision not found');
    if (rev.status !== 'pending') throw new BadRequestException(`Revision is already ${rev.status}.`);
    const updated = await this.prisma.fundingProgramRevision.update({
      where: { id: revisionId },
      data: { status: 'rejected', reviewedBy: reviewerUserId, reviewedAt: new Date() },
    });
    await this.audit
      .appendAudit({
        userId: reviewerUserId,
        action: 'funds.revision.reject',
        entity: 'FundingProgramRevision',
        entityId: revisionId,
        details: { programId: rev.programId },
      })
      .catch(() => undefined);
    return updated;
  }
}
