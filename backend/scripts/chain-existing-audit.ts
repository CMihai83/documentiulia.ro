/**
 * GI-AUDIT-1 backfill — retroactively sequence + hash-chain existing AuditLog rows
 * that predate the chained writer. Idempotent: rows already carrying a `hash` are
 * left untouched, and the run continues the chain from the current head.
 *
 * Run once at deploy:  npx ts-node scripts/chain-existing-audit.ts
 */
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

function canonical(value: any): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.keys(value).sort().map((k) => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
}

function computeHash(sequence: bigint, previousHash: string | null, row: any): string {
  const payload = [
    sequence.toString(),
    previousHash ?? 'GENESIS',
    canonical({
      userId: row.userId, action: row.action, entity: row.entity,
      entityId: row.entityId ?? null, details: row.details ?? null,
      ipAddress: row.ipAddress ?? null, organizationId: row.organizationId ?? null,
    }),
    row.createdAt.toISOString(),
  ].join('|');
  return createHash('sha256').update(payload).digest('hex');
}

async function main() {
  const head = await prisma.auditChainHead.upsert({
    where: { id: 'global' },
    create: { id: 'global', lastSequence: BigInt(0), lastHash: null },
    update: {},
  });

  let seq = head.lastSequence;
  let prevHash = head.lastHash;

  // Only rows not yet in the chain, oldest first.
  const rows = await prisma.auditLog.findMany({
    where: { hash: null },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Backfilling ${rows.length} un-chained audit rows from sequence ${seq}...`);
  for (const row of rows) {
    seq = seq + BigInt(1);
    const hash = computeHash(seq, prevHash, row);
    await prisma.auditLog.update({
      where: { id: row.id },
      data: { sequence: seq, previousHash: prevHash, hash },
    });
    prevHash = hash;
  }

  await prisma.auditChainHead.update({
    where: { id: 'global' },
    data: { lastSequence: seq, lastHash: prevHash },
  });

  console.log(`Done. Chain head now at sequence ${seq}.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
