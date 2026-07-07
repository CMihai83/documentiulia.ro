import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  userId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, any> | null;
  ipAddress?: string | null;
  organizationId?: string | null;
}

export interface ChainVerifyResult {
  ok: boolean;
  checked: number;
  brokenAt?: { id: string; sequence: string; reason: string };
}

/**
 * GI-AUDIT-1 — append-only, hash-chained audit log persisted in Postgres.
 *
 * One GLOBAL chain (not per-org): stronger tamper-evidence (a deletion anywhere
 * breaks the sequence) at the cost of a single serialization point. Appends are
 * serialized with a transaction-scoped Postgres advisory lock so the chain can
 * never fork under concurrency.
 */
@Injectable()
export class AuditChainService {
  private readonly logger = new Logger(AuditChainService.name);
  private static readonly LOCK_KEY = 748_291_143; // arbitrary constant for the audit-chain advisory lock

  constructor(private readonly prisma: PrismaService) {}

  /** Deterministic, key-sorted JSON so the hash is stable across runs. */
  private canonical(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map((v) => this.canonical(v)).join(',') + ']';
    return '{' + Object.keys(value).sort().map((k) => JSON.stringify(k) + ':' + this.canonical(value[k])).join(',') + '}';
  }

  private computeHash(sequence: bigint, previousHash: string | null, entry: AuditEntry, createdAtIso: string): string {
    const payload = [
      sequence.toString(),
      previousHash ?? 'GENESIS',
      this.canonical({
        userId: entry.userId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        details: entry.details ?? null,
        ipAddress: entry.ipAddress ?? null,
        organizationId: entry.organizationId ?? null,
      }),
      createdAtIso,
    ].join('|');
    return createHash('sha256').update(payload).digest('hex');
  }

  /** Append an entry to the chain. Serialized via advisory lock; returns the created log id + sequence. */
  async appendAudit(entry: AuditEntry): Promise<{ id: string; sequence: string; hash: string }> {
    return this.prisma.$transaction(async (tx) => {
      // Serialize all appends against each other (released at txn end).
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${AuditChainService.LOCK_KEY})`;

      const head = await tx.auditChainHead.upsert({
        where: { id: 'global' },
        create: { id: 'global', lastSequence: BigInt(0), lastHash: null },
        update: {},
      });

      const sequence = head.lastSequence + BigInt(1);
      const createdAt = new Date();
      const hash = this.computeHash(sequence, head.lastHash, entry, createdAt.toISOString());

      const log = await tx.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId ?? null,
          details: entry.details ?? undefined,
          ipAddress: entry.ipAddress ?? null,
          organizationId: entry.organizationId ?? null,
          sequence,
          previousHash: head.lastHash,
          hash,
          createdAt,
        },
      });

      await tx.auditChainHead.update({
        where: { id: 'global' },
        data: { lastSequence: sequence, lastHash: hash },
      });

      return { id: log.id, sequence: sequence.toString(), hash };
    });
  }

  /** Walk the chain in sequence order and report the first break (missing seq, bad link, or altered content). */
  async verifyChain(from?: number, to?: number): Promise<ChainVerifyResult> {
    const rows = await this.prisma.auditLog.findMany({
      where: {
        sequence: { not: null, ...(from ? { gte: BigInt(from) } : {}), ...(to ? { lte: BigInt(to) } : {}) },
      },
      orderBy: { sequence: 'asc' },
    });

    let checked = 0;
    let expectedSeq = from ? BigInt(from) : (rows.length ? rows[0].sequence! : BigInt(1));
    let prevHash: string | null = from && rows.length ? rows[0].previousHash : null;

    for (const row of rows) {
      checked++;
      const seq = row.sequence!;
      if (seq !== expectedSeq) {
        return { ok: false, checked, brokenAt: { id: row.id, sequence: seq.toString(), reason: `sequence gap: expected ${expectedSeq}` } };
      }
      if (row.previousHash !== prevHash) {
        return { ok: false, checked, brokenAt: { id: row.id, sequence: seq.toString(), reason: 'previousHash does not match prior row' } };
      }
      const recomputed = this.computeHash(
        seq, row.previousHash,
        { userId: row.userId, action: row.action, entity: row.entity, entityId: row.entityId, details: row.details as any, ipAddress: row.ipAddress, organizationId: row.organizationId },
        row.createdAt.toISOString(),
      );
      if (recomputed !== row.hash) {
        return { ok: false, checked, brokenAt: { id: row.id, sequence: seq.toString(), reason: 'hash mismatch — row content was altered' } };
      }
      prevHash = row.hash;
      expectedSeq = seq + BigInt(1);
    }

    return { ok: true, checked };
  }
}
