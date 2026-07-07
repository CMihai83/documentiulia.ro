import { AuditChainService } from './audit-chain.service';

/** Minimal stateful Prisma fake: an in-memory AuditLog table + single chain-head row. */
function makeFakePrisma() {
  const logs: any[] = [];
  const head: any = { id: 'global', lastSequence: BigInt(0), lastHash: null };
  const tx = {
    $executeRaw: async () => 0,
    auditChainHead: {
      upsert: async () => head,
      update: async ({ data }: any) => Object.assign(head, data),
    },
    auditLog: {
      create: async ({ data }: any) => { const row = { id: `log_${logs.length + 1}`, ...data }; logs.push(row); return row; },
    },
  };
  return {
    logs,
    $transaction: async (fn: any) => fn(tx),
    auditLog: {
      findMany: async ({ where, orderBy }: any) => {
        let rows = logs.filter((r) => r.sequence !== null && r.sequence !== undefined);
        if (where?.sequence?.gte) rows = rows.filter((r) => r.sequence >= where.sequence.gte);
        if (where?.sequence?.lte) rows = rows.filter((r) => r.sequence <= where.sequence.lte);
        rows = [...rows].sort((a, b) => (a.sequence < b.sequence ? -1 : 1));
        return rows;
      },
    },
  };
}

describe('AuditChainService (GI-AUDIT-1)', () => {
  it('appends a genesis entry then links subsequent entries', async () => {
    const prisma = makeFakePrisma();
    const svc = new AuditChainService(prisma as any);

    const a = await svc.appendAudit({ userId: 'u1', action: 'A', entity: 'E' });
    const b = await svc.appendAudit({ userId: 'u1', action: 'B', entity: 'E' });

    expect(a.sequence).toBe('1');
    expect(b.sequence).toBe('2');
    expect(prisma.logs[0].previousHash).toBeNull();
    expect(prisma.logs[1].previousHash).toBe(prisma.logs[0].hash);
  });

  it('verifyChain reports ok for an intact chain', async () => {
    const prisma = makeFakePrisma();
    const svc = new AuditChainService(prisma as any);
    for (let i = 0; i < 5; i++) await svc.appendAudit({ userId: 'u', action: `A${i}`, entity: 'E', details: { i } });

    const res = await svc.verifyChain();
    expect(res.ok).toBe(true);
    expect(res.checked).toBe(5);
  });

  it('verifyChain detects a tampered row (content altered)', async () => {
    const prisma = makeFakePrisma();
    const svc = new AuditChainService(prisma as any);
    for (let i = 0; i < 5; i++) await svc.appendAudit({ userId: 'u', action: `A${i}`, entity: 'E' });

    // Tamper: change the action on row 3 without recomputing the hash.
    prisma.logs[2].action = 'TAMPERED';

    const res = await svc.verifyChain();
    expect(res.ok).toBe(false);
    expect(res.brokenAt?.sequence).toBe('3');
    expect(res.brokenAt?.reason).toMatch(/hash mismatch/);
  });

  it('verifyChain detects a deleted row (sequence gap)', async () => {
    const prisma = makeFakePrisma();
    const svc = new AuditChainService(prisma as any);
    for (let i = 0; i < 5; i++) await svc.appendAudit({ userId: 'u', action: `A${i}`, entity: 'E' });

    prisma.logs.splice(2, 1); // delete sequence 3

    const res = await svc.verifyChain();
    expect(res.ok).toBe(false);
    expect(res.brokenAt?.reason).toMatch(/sequence gap|previousHash/);
  });
});
