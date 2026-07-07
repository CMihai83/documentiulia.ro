import { Prisma } from '@prisma/client';
import { getPiiCipher } from '../security/pii-cipher';

/**
 * GDPR-A / GI-SEC-2 — transparent field-level PII encryption at the single
 * Prisma choke point, so every one of the ~100 call sites (including
 * `include`d relations and interactive $transaction callbacks, which both
 * pass through $use middleware) is covered without per-site edits.
 *
 * - WRITES: encrypts the target fields per model; Employee.cnp also gets a
 *   deterministic blind-index (cnpHash) so equality lookups keep working.
 * - READS: deep-walks every result and decrypts any `enc:v1:` string
 *   (model-agnostic — covers nested includes). Legacy plaintext passes through.
 * - Idempotent with explicit service-layer encryption (prefix check), so
 *   belt-and-braces double application is harmless.
 */

const STRING_FIELDS: Record<string, string[]> = {
  User: ['mfaSecret'],
  Employee: ['cnp'],
  Partner: ['bankAccount'],
};
const ARRAY_FIELDS: Record<string, string[]> = {
  User: ['mfaBackupCodes'],
};

function scalar(v: any): any {
  // prisma update accepts { set: value }
  return v && typeof v === 'object' && 'set' in v && Object.keys(v).length === 1 ? v.set : v;
}

function encryptData(model: string, data: any): void {
  if (!data || typeof data !== 'object') return;
  const cipher = getPiiCipher();
  for (const f of STRING_FIELDS[model] ?? []) {
    if (data[f] === undefined) continue;
    const plain = scalar(data[f]);
    if (typeof plain !== 'string') continue;
    const enc = cipher.encryptField(plain);
    data[f] = enc;
    if (model === 'Employee' && f === 'cnp') {
      const h = cipher.hashField(cipher.isEncryptedValue(plain) ? undefined : plain);
      if (h) data.cnpHash = h;
    }
  }
  for (const f of ARRAY_FIELDS[model] ?? []) {
    if (data[f] === undefined) continue;
    const arr = scalar(data[f]);
    if (Array.isArray(arr)) data[f] = arr.map((v) => (typeof v === 'string' ? cipher.encryptField(v) : v));
  }
}

const OPAQUE = new Set(['Date', 'Buffer', 'Decimal', 'Uint8Array', 'BigInt']);

async function decryptDeep(node: any, depth = 0): Promise<void> {
  if (!node || typeof node !== 'object' || depth > 8) return;
  if (OPAQUE.has(node?.constructor?.name)) return;
  const cipher = getPiiCipher();
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const v = node[i];
      if (cipher.isEncryptedValue(v)) node[i] = cipher.decryptField(v);
      else await decryptDeep(v, depth + 1);
    }
    return;
  }
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (cipher.isEncryptedValue(v)) node[k] = cipher.decryptField(v);
    else if (v && typeof v === 'object') await decryptDeep(v, depth + 1);
  }
}

const WRITE_ACTIONS = new Set(['create', 'update', 'upsert', 'createMany', 'updateMany', 'createManyAndReturn']);

export function piiEncryptionMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    const model = params.model as string | undefined;
    if (model && (STRING_FIELDS[model] || ARRAY_FIELDS[model]) && WRITE_ACTIONS.has(params.action)) {
      const args = params.args ?? {};
      if (params.action === 'upsert') {
        encryptData(model, args.create);
        encryptData(model, args.update);
      } else if (Array.isArray(args.data)) {
        for (const d of args.data) encryptData(model, d);
      } else {
        encryptData(model, args.data);
      }
    }
    const result = await next(params);
    if (getPiiCipher().ready) await decryptDeep(result);
    return result;
  };
}
