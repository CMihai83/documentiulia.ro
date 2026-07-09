/**
 * W-1 integration. Two layers, both env-gated by W1_IT=1:
 *  - full escrow loop on the MockDriver against a throwaway Postgres;
 *  - a REAL LocalDockerDriver round-trip (provision alpine → assert sandbox +
 *    running → destroy → assert NO residual container OR volume). Everything is
 *    labelled w1test=1 and force-cleaned in afterAll even on failure.
 */
import { execFile } from 'child_process';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';
import { LocalDockerDriver } from './drivers/local-docker.driver';
import { MockDriver } from './drivers/mock.driver';
import { RunPodDriver } from './drivers/runpod.driver';
import { WorkspacesService } from './workspaces.service';

const run = promisify(execFile);
const RUN = process.env.W1_IT === '1';
const d = RUN ? describe : describe.skip;

async function docker(args: string[]) {
  try {
    const { stdout } = await run('docker', args);
    return stdout.trim();
  } catch {
    return '';
  }
}
async function cleanupByLabel() {
  const ids = (await docker(['ps', '-aq', '--filter', 'label=w1test=1'])).split('\n').filter(Boolean);
  for (const id of ids) await docker(['rm', '-f', id]);
  const vols = (await docker(['volume', 'ls', '-q', '--filter', 'label=w1test=1'])).split('\n').filter(Boolean);
  for (const v of vols) await docker(['volume', 'rm', '-f', v]);
}

d('W-1 delivery workspaces (integration)', () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await cleanupByLabel();
    await prisma.$disconnect();
  });

  it('MockDriver: create -> milestone submit -> approve -> escrow released + invoice DRAFT', async () => {
    // real User rows for the Invoice FK (prod always has real users)
    const expert = await prisma.user.create({ data: { email: `expert-it-${Date.now()}@w1.test`, password: 'x', name: 'Expert IT' } });
    const client = await prisma.user.create({ data: { email: `client-it-${Date.now()}@w1.test`, password: 'x', name: 'Client IT' } });
    const eng = await prisma.expertEngagement.create({
      data: { expertUserId: expert.id, clientUserId: client.id, sessionType: 'delivery', scheduledAt: new Date(), paymentStatus: 'held' },
    });
    const audit = { appendAudit: async () => ({ id: 'a', sequence: '1', hash: 'h' }) } as any;
    const svc = new WorkspacesService(prisma as any, audit, new MockDriver(), new LocalDockerDriver(), new RunPodDriver({ get: () => undefined } as any));

    // REAL service loop: create -> provision -> milestone -> expert submits -> client approves
    const ws = await svc.create(client.id, undefined, { name: 'proj', engagementId: eng.id });
    const running = await svc.provision(client.id, ws.id);
    expect(running.status).toBe('running');
    const m = await svc.addMilestone(client.id, ws.id, 'P1', 1000);
    await svc.submitMilestone(expert.id, m.id, 'delivered');
    const out = await svc.approveMilestone(client.id, m.id);

    const released = await prisma.expertEngagement.findUnique({ where: { id: eng.id } });
    expect(released!.paymentStatus).toBe('released');
    const inv = await prisma.invoice.findUnique({ where: { id: out.invoiceId } });
    expect(inv!.status).toBe('DRAFT');
    expect(Number(inv!.vatAmount)).toBe(210);

    // non-member is blocked
    await expect(svc.get('outsider', ws.id)).rejects.toThrow();
    // gpu_pod without a key -> clear error
    await expect(svc.create(client.id, undefined, { name: 'g', kind: 'gpu_pod' as any })).rejects.toThrow(/GPU pods are not configured/);
  }, 60000);

  it('LocalDockerDriver: provision -> running (sandboxed) -> destroy leaves NO residue', async () => {
    process.env.W1_TEST = '1';
    const driver = new LocalDockerDriver();
    expect(driver.label).toBe('w1test=1');
    const wsId = 'itcontainer1';

    const res = await driver.provision(wsId, { kind: 'dev_container', image: 'alpine:3.20' });
    expect(res.containerRef).toBeTruthy();

    // running + sandbox flags actually applied on the live container
    const status = await driver.status(res.containerRef!);
    expect(status.status).toBe('running');
    const inspect = await docker(['inspect', res.containerRef!]);
    expect(inspect).toContain('"ReadonlyRootfs": true');
    expect(inspect).toContain('no-new-privileges');
    expect(inspect).toMatch(/"NetworkMode": "none"/);

    await driver.destroy(res.containerRef!, res.volumeRef);
    // NO residual container and NO residual volume
    const stillThere = await docker(['ps', '-aq', '--filter', `id=${res.containerRef}`]);
    expect(stillThere).toBe('');
    const vols = await docker(['volume', 'ls', '-q', '--filter', `name=${res.volumeRef}`]);
    expect(vols).toBe('');
  }, 90000);
});
