/**
 * REQ-040 integration — projects org-scoping + stats, meetings upcoming window,
 * goals progress from seeded real invoices, client-portal me resolution.
 * Gated by REQ40_IT=1 (throwaway postgres, see runner).
 */
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from './projects.service';
import { MeetingsService } from '../scheduling/meetings.service';
import { BusinessGoalsService } from '../analytics/business-goals.service';

const RUN = process.env.REQ40_IT === '1';
const d = RUN ? describe : describe.skip;

d('REQ-040 integration', () => {
  let prisma: PrismaService;
  let projects: ProjectsService;
  let meetings: MeetingsService;
  let goals: BusinessGoalsService;
  const orgA = 'req40-org-a';
  const orgB = 'req40-org-b';
  const userA = 'req40-user-a';

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    await prisma.organization.upsert({
      where: { slug: 'req40-org-a' },
      update: {},
      create: { id: orgA, name: 'REQ40 Org A', slug: 'req40-org-a' },
    });
    await prisma.user.upsert({
      where: { email: 'req40-user@test.ro' },
      update: {},
      create: { id: userA, email: 'req40-user@test.ro', password: 'x', name: 'REQ40 User' },
    });
    projects = new ProjectsService(prisma);
    meetings = new MeetingsService(prisma);
    goals = new BusinessGoalsService(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('projects: CRUD + stats, org-scoped (org B sees nothing)', async () => {
    const p = await projects.create(orgA, {
      name: 'Implementare ERP', budgetRon: 45000, spentRon: 29250,
      dueDate: new Date(Date.now() + 10 * 86_400_000).toISOString(),
    });
    await projects.addTask(orgA, p.id, { title: 'Analiză', status: 'completed' });
    await projects.addTask(orgA, p.id, { title: 'Configurare', status: 'in_progress' });
    const m = await projects.addMilestone(orgA, p.id, { title: 'Kickoff' });
    await projects.setMilestoneDone(orgA, m.id, true);

    const stats = await projects.stats(orgA, p.id);
    expect(stats.tasks.total).toBe(2);
    expect(stats.tasks.completed).toBe(1);
    expect(stats.milestones.done).toBe(1);
    expect(stats.budget.utilizationPct).toBe(65);

    const listB = await projects.list(orgB);
    expect(listB.find((x) => x.id === p.id)).toBeUndefined();
    await expect(projects.get(orgB, p.id)).rejects.toThrow();
  });

  it('meetings: upcoming window is correct', async () => {
    const now = new Date();
    const inTwoDays = new Date(now.getTime() + 2 * 86_400_000);
    const inTwenty = new Date(now.getTime() + 20 * 86_400_000);
    await meetings.create(orgA, userA, {
      title: 'Ședință apropiată', startsAt: inTwoDays.toISOString(),
      endsAt: new Date(inTwoDays.getTime() + 3600_000).toISOString(),
    });
    await meetings.create(orgA, userA, {
      title: 'Ședință departe', startsAt: inTwenty.toISOString(),
      endsAt: new Date(inTwenty.getTime() + 3600_000).toISOString(),
    });
    const up7 = await meetings.upcoming(orgA, 7, now);
    expect(up7.map((x) => x.title)).toContain('Ședință apropiată');
    expect(up7.map((x) => x.title)).not.toContain('Ședință departe');
    const up30 = await meetings.upcoming(orgA, 30, now);
    expect(up30.map((x) => x.title)).toContain('Ședință departe');
  });

  it('goals: progress computed from seeded REAL invoices', async () => {
    await prisma.invoice.createMany({
      data: [
        { userId: userA, organizationId: orgA, invoiceNumber: 'R40-1', partnerName: 'X', type: 'ISSUED' as any, netAmount: 1000, vatRate: 21, vatAmount: 210, grossAmount: 12100, invoiceDate: new Date('2026-07-05') },
        { userId: userA, organizationId: orgA, invoiceNumber: 'R40-2', partnerName: 'X', type: 'ISSUED' as any, netAmount: 1000, vatRate: 21, vatAmount: 210, grossAmount: 7900, invoiceDate: new Date('2026-07-06') },
        { userId: userA, organizationId: orgA, invoiceNumber: 'R40-3', partnerName: 'Y', type: 'RECEIVED' as any, netAmount: 500, vatRate: 21, vatAmount: 105, grossAmount: 5000, invoiceDate: new Date('2026-07-07') },
      ],
      skipDuplicates: true,
    });
    await goals.create(orgA, { metric: 'revenue', targetValue: 40000, period: '2026-07' });
    await goals.create(orgA, { metric: 'profit', targetValue: 15000, period: '2026-07' });
    const prog = await goals.progress(orgA, userA);
    const rev = prog.find((g: any) => g.metric === 'revenue');
    const prof = prog.find((g: any) => g.metric === 'profit');
    expect(rev.current).toBe(20000);
    expect(rev.progressPct).toBe(50);
    expect(prof.current).toBe(15000); // 20000 - 5000
    expect(prof.achieved).toBe(true);
  });

  it('client-portal me: 404 without a linked partner, resolves with one', async () => {
    const { ClientPortalMeController } = await import('../client-portal/client-portal-me.controller');
    const ctrl = new ClientPortalMeController(prisma);
    await expect(ctrl.profile({ user: { email: 'nobody@req40.test' } } as any)).rejects.toThrow('Niciun profil');
    await prisma.partner.create({
      data: { userId: userA, organizationId: orgA, name: 'Client R40 SRL', cui: 'RO40404040', email: 'client@req40.test', type: 'CUSTOMER' as any },
    });
    await prisma.invoice.create({
      data: { userId: userA, organizationId: orgA, invoiceNumber: 'R40-C1', partnerName: 'Client R40 SRL', partnerCui: 'RO40404040', type: 'ISSUED' as any, netAmount: 100, vatRate: 21, vatAmount: 21, grossAmount: 121, invoiceDate: new Date('2026-07-08') },
    });
    const prof = await ctrl.profile({ user: { email: 'CLIENT@req40.test' } } as any); // case-insensitive
    expect(prof.name).toBe('Client R40 SRL');
    const dash = await ctrl.dashboard({ user: { email: 'client@req40.test' } } as any);
    expect(dash.invoices.length).toBeGreaterThanOrEqual(1);
    expect(dash.totals.outstandingRon).toBeGreaterThan(0);
    const docs = await ctrl.documents({ user: { email: 'client@req40.test' } } as any);
    expect(docs[0].name).toContain('Factura R40-C1');
  });
});
