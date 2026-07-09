import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AuditChainService } from '../audit/audit-chain.service';
import { MockDriver } from './drivers/mock.driver';
import { LocalDockerDriver } from './drivers/local-docker.driver';
import { RunPodDriver } from './drivers/runpod.driver';
import { DriverUnavailableError, WorkspaceDriver, WorkspaceSpec } from './drivers/workspace-driver.interface';
import { billRuntime, isIdlePastAutoStop, isOverBudget, minutesBetween, WorkspaceKind } from './workspace-billing.logic';

interface CreateWorkspaceInput {
  name: string;
  kind?: WorkspaceKind;
  engagementId?: string;
  budgetCapEur?: number;
  autoStopMinutes?: number;
  image?: string;
  network?: boolean;
}

@Injectable()
export class WorkspacesService {
  private readonly logger = new Logger(WorkspacesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditChainService,
    private readonly mock: MockDriver,
    private readonly localDocker: LocalDockerDriver,
    private readonly runpod: RunPodDriver,
  ) {}

  /** Driver selection: gpu_pod → runpod (gated), otherwise the configured driver. */
  private driverFor(kind: WorkspaceKind, requested?: string): WorkspaceDriver {
    if (kind === 'gpu_pod') return this.runpod;
    if (requested === 'local_docker') return this.localDocker;
    if (requested === 'runpod') return this.runpod;
    return this.mock;
  }

  private async event(workspaceId: string, type: string, payload?: any) {
    await this.prisma.workspaceEvent.create({ data: { workspaceId, type, payload: payload ?? undefined } });
  }

  /** Membership: creator, or (for engagement-linked) the engagement's client/expert. */
  private async assertMember(workspaceId: string, userId: string) {
    const ws = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!ws) throw new NotFoundException('Workspace not found');
    if (ws.createdBy === userId) return ws;
    if (ws.engagementId) {
      const eng = await this.prisma.expertEngagement.findUnique({ where: { id: ws.engagementId } });
      if (eng && (eng.clientUserId === userId || eng.expertUserId === userId)) return ws;
    }
    throw new ForbiddenException('Not a member of this workspace');
  }

  async create(userId: string, orgId: string | undefined, input: CreateWorkspaceInput) {
    const kind = (input.kind ?? 'dev_container') as WorkspaceKind;
    const driver = this.driverFor(kind, undefined);
    if (!driver.isAvailable()) {
      throw new BadRequestException(
        kind === 'gpu_pod'
          ? 'GPU pods are not configured on this deployment yet.'
          : `Driver for ${kind} is unavailable.`,
      );
    }
    const ws = await this.prisma.workspace.create({
      data: {
        createdBy: userId,
        orgId: orgId ?? null,
        engagementId: input.engagementId ?? null,
        name: input.name,
        kind,
        driver: driver.name,
        status: 'requested',
        budgetCapEur: input.budgetCapEur ?? 25,
        autoStopMinutes: input.autoStopMinutes ?? 60,
        spec: { image: input.image, network: !!input.network } as any,
      },
    });
    await this.event(ws.id, 'created', { kind, driver: driver.name });
    await this.audit.appendAudit({ userId, action: 'workspace.create', entity: 'Workspace', entityId: ws.id, organizationId: orgId ?? null });
    return ws;
  }

  async provision(userId: string, workspaceId: string) {
    const ws = await this.assertMember(workspaceId, userId);
    if (ws.status === 'running') return ws;
    if (ws.status === 'destroyed') throw new BadRequestException('Workspace was destroyed');
    const kind = ws.kind as WorkspaceKind;
    const driver = this.driverFor(kind, ws.driver);
    const spec: WorkspaceSpec = { kind, ...(ws.spec as any) };
    await this.prisma.workspace.update({ where: { id: ws.id }, data: { status: 'provisioning' } });
    await this.event(ws.id, 'provisioning');
    try {
      const res = await driver.provision(ws.id, spec);
      const updated = await this.prisma.workspace.update({
        where: { id: ws.id },
        data: {
          status: 'running',
          containerRef: res.containerRef,
          volumeRef: res.volumeRef,
          connectInfo: (res.connectInfo ?? undefined) as any,
          startedAt: new Date(),
          lastActiveAt: new Date(),
          lastBilledAt: new Date(),
        },
      });
      await this.event(ws.id, 'running', { containerRef: res.containerRef });
      return updated;
    } catch (e: any) {
      const msg = e instanceof DriverUnavailableError ? e.message : `provision failed: ${e?.message}`;
      await this.prisma.workspace.update({ where: { id: ws.id }, data: { status: 'error' } });
      await this.event(ws.id, 'error', { message: msg });
      throw new BadRequestException(msg);
    }
  }

  /** Meter the runtime since lastBilledAt into spentEur; returns the new spend. */
  private async accrue(ws: { id: string; kind: string; lastBilledAt: Date | null; spentEur: any }, now: Date): Promise<number> {
    const from = ws.lastBilledAt ?? now;
    const mins = minutesBetween(from, now);
    const bill = billRuntime(ws.kind as WorkspaceKind, mins);
    const spent = Number(ws.spentEur) + bill.totalEur;
    await this.prisma.workspace.update({ where: { id: ws.id }, data: { spentEur: spent, lastBilledAt: now } });
    return spent;
  }

  async stop(userId: string, workspaceId: string, reason = 'user') {
    const ws = await this.assertMember(workspaceId, userId);
    return this.doStop(ws, reason);
  }

  private async doStop(ws: any, reason: string) {
    if (ws.status !== 'running') return ws;
    const driver = this.driverFor(ws.kind as WorkspaceKind, ws.driver);
    const now = new Date();
    await this.accrue(ws, now);
    if (ws.containerRef) await driver.stop(ws.containerRef).catch(() => undefined);
    const updated = await this.prisma.workspace.update({ where: { id: ws.id }, data: { status: 'stopped', stoppedAt: now } });
    await this.event(ws.id, 'stopped', { reason });
    return updated;
  }

  async destroy(userId: string, workspaceId: string) {
    const ws = await this.assertMember(workspaceId, userId);
    const driver = this.driverFor(ws.kind as WorkspaceKind, ws.driver);
    if (ws.containerRef) await driver.destroy(ws.containerRef, ws.volumeRef ?? null).catch(() => undefined);
    const updated = await this.prisma.workspace.update({
      where: { id: ws.id },
      data: { status: 'destroyed', destroyedAt: new Date(), connectInfo: undefined },
    });
    await this.event(ws.id, 'wiped', { containerRef: ws.containerRef, volumeRef: ws.volumeRef });
    await this.audit.appendAudit({ userId, action: 'workspace.destroy', entity: 'Workspace', entityId: ws.id });
    return updated;
  }

  async touch(userId: string, workspaceId: string) {
    await this.assertMember(workspaceId, userId);
    return this.prisma.workspace.update({ where: { id: workspaceId }, data: { lastActiveAt: new Date() } });
  }

  async list(userId: string) {
    const engagements = await this.prisma.expertEngagement.findMany({
      where: { OR: [{ clientUserId: userId }, { expertUserId: userId }] },
      select: { id: true },
    });
    const engIds = engagements.map((e) => e.id);
    return this.prisma.workspace.findMany({
      where: { OR: [{ createdBy: userId }, { engagementId: { in: engIds } }] },
      orderBy: { createdAt: 'desc' },
      include: { milestones: true },
    });
  }

  async get(userId: string, workspaceId: string) {
    await this.assertMember(workspaceId, userId);
    return this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { events: { orderBy: { at: 'desc' }, take: 50 }, milestones: true },
    });
  }

  /**
   * Every 5 minutes: stop workspaces that are idle past their auto-stop window or
   * over budget. Per-item try/catch so one failure never halts the sweep.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async sweep(now: Date = new Date()) {
    const running = await this.prisma.workspace.findMany({ where: { status: 'running' } });
    let stopped = 0;
    for (const ws of running) {
      try {
        const spent = await this.accrue(ws, now);
        const overBudget = isOverBudget(spent, Number(ws.budgetCapEur));
        const idle = isIdlePastAutoStop(new Date(ws.lastActiveAt), ws.autoStopMinutes, now);
        if (overBudget || idle) {
          await this.doStop(ws, overBudget ? 'budget_cap' : 'auto_stop');
          stopped++;
        }
      } catch (e: any) {
        this.logger.warn(`sweep ${ws.id}: ${e?.message}`);
      }
    }
    if (stopped) this.logger.log(`Workspace sweep stopped ${stopped} workspace(s)`);
    return { checked: running.length, stopped };
  }

  // ---- W1-3 milestones / escrow / e-Factura draft ----

  async addMilestone(userId: string, workspaceId: string, title: string, amountEur: number) {
    const ws = await this.assertMember(workspaceId, userId);
    if (!ws.engagementId) throw new BadRequestException('Milestones require an engagement-linked workspace');
    return this.prisma.milestone.create({ data: { engagementId: ws.engagementId, workspaceId: ws.id, title, amountEur } });
  }

  private async milestoneWithEngagement(milestoneId: string) {
    const m = await this.prisma.milestone.findUnique({ where: { id: milestoneId } });
    if (!m) throw new NotFoundException('Milestone not found');
    const eng = await this.prisma.expertEngagement.findUnique({ where: { id: m.engagementId } });
    if (!eng) throw new NotFoundException('Engagement not found');
    return { m, eng };
  }

  /** Freelancer (expert) submits the deliverable. */
  async submitMilestone(userId: string, milestoneId: string, note?: string) {
    const { m, eng } = await this.milestoneWithEngagement(milestoneId);
    if (userId !== eng.expertUserId) throw new ForbiddenException('Only the assigned expert can submit');
    if (m.status !== 'pending') throw new BadRequestException(`Cannot submit from status ${m.status}`);
    return this.prisma.milestone.update({ where: { id: m.id }, data: { status: 'submitted', deliverableNote: note ?? null, submittedAt: new Date() } });
  }

  /** Client approves → escrow release → e-Factura draft. Self-approval blocked. */
  async approveMilestone(userId: string, milestoneId: string) {
    const { m, eng } = await this.milestoneWithEngagement(milestoneId);
    if (userId !== eng.clientUserId) throw new ForbiddenException('Only the client can approve');
    if (eng.clientUserId === eng.expertUserId) throw new BadRequestException('Self-dealing engagement blocked');
    if (m.status !== 'submitted') throw new BadRequestException(`Cannot approve from status ${m.status}`);

    // escrow release — placeholder (no real charge; Stripe pending). Flip engagement paymentStatus.
    await this.prisma.expertEngagement.update({ where: { id: eng.id }, data: { paymentStatus: 'released' } });

    // e-Factura DRAFT invoice (expert issues to client). Reuses the Invoice model.
    const net = Number(m.amountEur);
    const vatRate = 21;
    const vat = Math.round(net * vatRate) / 100;
    const invoice = await this.prisma.invoice.create({
      data: {
        userId: eng.expertUserId,
        invoiceNumber: `WS-${m.id.slice(-8).toUpperCase()}`,
        invoiceDate: new Date(),
        type: 'ISSUED',
        status: 'DRAFT',
        partnerName: `Client ${eng.clientUserId.slice(-6)}`,
        netAmount: net,
        vatRate,
        vatAmount: vat,
        grossAmount: net + vat,
        currency: 'RON',
      },
    });

    const updated = await this.prisma.milestone.update({
      where: { id: m.id },
      data: { status: 'released', approvedAt: new Date(), releasedAt: new Date(), invoiceId: invoice.id },
    });
    await this.audit.appendAudit({ userId, action: 'milestone.release', entity: 'Milestone', entityId: m.id, details: { invoiceId: invoice.id, amountEur: net } });
    return { milestone: updated, invoiceId: invoice.id };
  }
}
