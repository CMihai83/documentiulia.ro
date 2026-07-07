/**
 * GDPR-A / GI-SEC-2 — one-time backfill: encrypt existing plaintext PII.
 *
 * Idempotent: rows already stored as `enc:v1:` are skipped. Uses its own
 * PrismaClient (NO $use middleware), so reads return raw column values and we
 * detect plaintext by the absence of the enc:v1: prefix.
 *
 * Requires ENCRYPTION_MASTER_KEY (same key the app runs with). Run at deploy:
 *   ENCRYPTION_MASTER_KEY=... npx ts-node scripts/encrypt-existing-pii.ts
 * or against the compiled build:  node dist/scripts/encrypt-existing-pii.js
 */
import { PrismaClient } from '@prisma/client';
import { getPiiCipher } from '../src/security/pii-cipher';

async function main() {
  const prisma = new PrismaClient();
  const cipher = getPiiCipher();
  await cipher.init(prisma as any);
  if (!cipher.enabled) {
    console.error('ENCRYPTION_MASTER_KEY not set / invalid — refusing to run (would no-op). Aborting.');
    process.exit(1);
  }
  const enc = (v: string | null) => cipher.encryptField(v) as string;
  const isEnc = (v: unknown) => cipher.isEncryptedValue(v);
  const stats: Record<string, number> = {};
  const bump = (k: string) => (stats[k] = (stats[k] || 0) + 1);

  // Employee.cnp (+ cnpHash blind index)
  for (const e of await prisma.employee.findMany({ where: { cnp: { not: null } }, select: { id: true, cnp: true } })) {
    if (isEnc(e.cnp)) continue;
    await prisma.employee.update({
      where: { id: e.id },
      data: { cnp: enc(e.cnp), cnpHash: cipher.hashField(e.cnp) },
    });
    bump('Employee.cnp');
  }

  // Partner.bankAccount
  for (const p of await prisma.partner.findMany({ where: { bankAccount: { not: null } }, select: { id: true, bankAccount: true } })) {
    if (isEnc(p.bankAccount)) continue;
    await prisma.partner.update({ where: { id: p.id }, data: { bankAccount: enc(p.bankAccount) } });
    bump('Partner.bankAccount');
  }

  // User.mfaSecret + User.mfaBackupCodes[]
  for (const u of await prisma.user.findMany({
    where: { OR: [{ mfaSecret: { not: null } }, { mfaBackupCodes: { isEmpty: false } }] },
    select: { id: true, mfaSecret: true, mfaBackupCodes: true },
  })) {
    const data: any = {};
    if (u.mfaSecret && !isEnc(u.mfaSecret)) { data.mfaSecret = enc(u.mfaSecret); bump('User.mfaSecret'); }
    const codes = (u.mfaBackupCodes as string[]) || [];
    if (codes.some((c) => !isEnc(c))) { data.mfaBackupCodes = codes.map((c) => (isEnc(c) ? c : enc(c))); bump('User.mfaBackupCodes'); }
    if (Object.keys(data).length) await prisma.user.update({ where: { id: u.id }, data });
  }

  console.log('PII backfill complete:', JSON.stringify(stats));
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
