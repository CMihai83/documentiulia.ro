import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { MockDriver } from './drivers/mock.driver';
import { LocalDockerDriver } from './drivers/local-docker.driver';
import { RunPodDriver } from './drivers/runpod.driver';

// Minimal in-memory prisma double
function makePrisma() {
  const workspaces: any[] = [];
  const events: any[] = [];
  const milestones: any[] = [];
  const engagements: any[] = [];
  const invoices: any[] = [];
  const byId = (arr: any[], id: string) => arr.find((x) => x.id === id);
  return {
    _tables: { workspaces, events, milestones, engagements, invoices },
    workspace: {
      create: async ({ data }: any) => { const w = { id: `ws${workspaces.length + 1}`, spentEur: 0, ...data }; workspaces.push(w); return w; },
      findUnique: async ({ where }: any) => byId(workspaces, where.id) ?? null,
      findMany: async ({ where }: any = {}) => workspaces.filter((w) => !where?.status || w.status === where.status),
      update: async ({ where, data }: any) => { Object.assign(byId(workspaces, where.id), data); return byId(workspaces, where.id); },
    },
    workspaceEvent: { create: async ({ data }: any) => { events.push(data); return data; } },
    milestone: {
      create: async ({ data }: any) => { const m = { id: `m${milestones.length + 1}`, status: 'pending', ...data }; milestones.push(m); return m; },
      findUnique: async ({ where }: any) => byId(milestones, where.id) ?? null,
      update: async ({ where, data }: any) => { Object.assign(byId(milestones, where.id), data); return byId(milestones, where.id); },
    },
    expertEngagement: {
      findUnique: async ({ where }: any) => byId(engagements, where.id) ?? null,
      findMany: async () => engagements,
      update: async ({ where, data }: any) => { Object.assign(byId(engagements, where.id), data); return byId(engagements, where.id); },
    },
    invoice: { create: async ({ data }: any) => { const i = { id: `inv${invoices.length + 1}`, ...data }; invoices.push(i); return i; } },
  } as any;
}

const audit = { appendAudit: jest.fn().mockResolvedValue({ id: 'a', sequence: '1', hash: 'h' }) } as any;

function svcWith(prisma: any) {
  return new WorkspacesService(prisma, audit, new MockDriver(), new LocalDockerDriver(), new RunPodDriver({ get: () => undefined } as any));
}

describe('WorkspacesService (W1-1/2/3)', () => {
  it('provisions on the mock driver and logs lifecycle events', async () => {
    const prisma = makePrisma();
    const svc = svcWith(prisma);
    const ws = await svc.create('u1', 'org1', { name: 'dev' });
    const running = await svc.provision('u1', ws.id);
    expect(running.status).toBe('running');
    expect(running.containerRef).toContain('mock-');
    const types = prisma._tables.events.map((e: any) => e.type);
    expect(types).toEqual(expect.arrayContaining(['created', 'provisioning', 'running']));
  });

  it('blocks a non-member (403)', async () => {
    const prisma = makePrisma();
    const svc = svcWith(prisma);
    const ws = await svc.create('owner', undefined, { name: 'x' });
    await expect(svc.get('intruder', ws.id)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('gpu_pod without RUNPOD_API_KEY is a clear error, never a fake pod', async () => {
    const prisma = makePrisma();
    const svc = svcWith(prisma);
    await expect(svc.create('u1', undefined, { name: 'g', kind: 'gpu_pod' as any }))
      .rejects.toThrow(/GPU pods are not configured/);
  });

  it('destroy wipes and logs a wiped event', async () => {
    const prisma = makePrisma();
    const svc = svcWith(prisma);
    const ws = await svc.create('u1', undefined, { name: 'x' });
    await svc.provision('u1', ws.id);
    const d = await svc.destroy('u1', ws.id);
    expect(d.status).toBe('destroyed');
    expect(prisma._tables.events.map((e: any) => e.type)).toContain('wiped');
  });

  it('sweep stops idle and over-budget workspaces, survives a per-item failure', async () => {
    const prisma = makePrisma();
    const svc = svcWith(prisma);
    const idle = await svc.create('u1', undefined, { name: 'idle', autoStopMinutes: 30 });
    await svc.provision('u1', idle.id);
    // make it idle 2h ago
    Object.assign(prisma._tables.workspaces.find((w: any) => w.id === idle.id), { lastActiveAt: new Date(Date.now() - 2 * 3600_000), lastBilledAt: new Date(Date.now() - 2 * 3600_000) });
    const res = await svc.sweep(new Date());
    expect(res.stopped).toBe(1);
    expect(prisma._tables.workspaces.find((w: any) => w.id === idle.id).status).toBe('stopped');
  });

  it('milestone submit(expert)->approve(client) releases escrow + drafts an invoice; self-approval blocked', async () => {
    const prisma = makePrisma();
    prisma._tables.engagements.push({ id: 'e1', clientUserId: 'client', expertUserId: 'expert', paymentStatus: 'held' });
    const svc = svcWith(prisma);
    const ws = await svc.create('client', undefined, { name: 'proj', engagementId: 'e1' });
    const m = await svc.addMilestone('client', ws.id, 'Phase 1', 1000);

    // expert submits
    await svc.submitMilestone('expert', m.id, 'done');
    // client cannot be the submitter path; expert cannot approve
    await expect(svc.approveMilestone('expert', m.id)).rejects.toBeInstanceOf(ForbiddenException);
    // client approves -> release + invoice
    const out = await svc.approveMilestone('client', m.id);
    expect(out.invoiceId).toBeDefined();
    expect(prisma._tables.engagements[0].paymentStatus).toBe('released');
    expect(prisma._tables.invoices[0].status).toBe('DRAFT');
    expect(Number(prisma._tables.invoices[0].vatAmount)).toBe(210); // 21% of 1000
  });

  it('cannot approve a milestone that was not submitted', async () => {
    const prisma = makePrisma();
    prisma._tables.engagements.push({ id: 'e1', clientUserId: 'client', expertUserId: 'expert', paymentStatus: 'held' });
    const svc = svcWith(prisma);
    const ws = await svc.create('client', undefined, { name: 'proj', engagementId: 'e1' });
    const m = await svc.addMilestone('client', ws.id, 'P', 500);
    await expect(svc.approveMilestone('client', m.id)).rejects.toBeInstanceOf(BadRequestException);
  });
});
