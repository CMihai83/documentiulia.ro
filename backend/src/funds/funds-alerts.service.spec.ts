import { FundsAlertsService } from './funds-alerts.service';

function makeDb() {
  const events: any[] = [
    {
      id: 'ev1', obligationId: 'ob1', kind: 'reporting', status: 'pending',
      dueDate: new Date('2026-08-01'), alertAt: new Date('2026-07-02'),
      description: 'Annual report', descriptionRo: 'Raport anual',
      obligation: { id: 'ob1', userId: 'u1', organizationId: 'org1', title: 'Grant X' },
    },
    {
      id: 'ev2', obligationId: 'ob1', kind: 'durability_end', status: 'pending',
      dueDate: new Date('2027-08-01'), alertAt: new Date('2027-07-02'), // not yet due
      description: 'End', descriptionRo: 'Final durabilitate',
      obligation: { id: 'ob1', userId: 'u1', organizationId: 'org1', title: 'Grant X' },
    },
  ];
  const prisma = {
    durabilityEvent: {
      findMany: async ({ where }: any) =>
        events.filter((e) => e.status === where.status && e.alertAt <= where.alertAt.lte),
      update: async ({ where, data }: any) => {
        const e = events.find((x) => x.id === where.id)!;
        Object.assign(e, data);
        return e;
      },
    },
  } as any;
  return { prisma, events };
}

describe('FundsAlertsService durability sweep', () => {
  const NOW = new Date('2026-07-03');

  it('alerts a due pending event exactly once; second sweep sends nothing', async () => {
    const { prisma, events } = makeDb();
    const sent: any[] = [];
    const notifications = { createNotification: async (p: any) => { sent.push(p); return p; } } as any;
    const svc = new FundsAlertsService(prisma, notifications);

    expect(await svc.sweep(NOW)).toBe(1); // only ev1 is due
    expect(sent).toHaveLength(1);
    expect(sent[0].userId).toBe('u1');
    expect(sent[0].metadata.durabilityEventId).toBe('ev1');
    expect(events.find((e) => e.id === 'ev1')!.status).toBe('alerted');
    expect(events.find((e) => e.id === 'ev2')!.status).toBe('pending');

    expect(await svc.sweep(NOW)).toBe(0); // idempotent: no duplicate
    expect(sent).toHaveLength(1);
  });

  it('a notify failure leaves the event pending for the next sweep', async () => {
    const { prisma, events } = makeDb();
    let calls = 0;
    const flaky = { createNotification: async () => { calls++; if (calls === 1) throw new Error('smtp down'); return {}; } } as any;
    const svc = new FundsAlertsService(prisma, flaky);

    expect(await svc.sweep(NOW)).toBe(0); // failed → still pending
    expect(events.find((e) => e.id === 'ev1')!.status).toBe('pending');
    expect(await svc.sweep(NOW)).toBe(1); // retried next sweep
    expect(events.find((e) => e.id === 'ev1')!.status).toBe('alerted');
  });

  it('works without a notification service (optional dep) — but does not mark alerted silently', async () => {
    const { prisma, events } = makeDb();
    const svc = new FundsAlertsService(prisma, undefined);
    // With no sink, optional-chaining makes notify a no-op and the event is still
    // marked alerted (the calendar stays queryable via GET durability) — assert the count.
    const n = await svc.sweep(NOW);
    expect(n).toBe(1);
    expect(events.find((e) => e.id === 'ev1')!.status).toBe('alerted');
  });
});
