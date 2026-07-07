import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * GDPR-A / GI-SEC-1 — durable field-level PII encryption core.
 *
 * Envelope pattern: a master key (KEK) from ENCRYPTION_MASTER_KEY wraps random
 * data keys (DEKs) persisted in the EncryptionKeyStore table, so ciphertext
 * survives restarts and keys can rotate without re-encrypting history.
 *
 * Field format: enc:v1:{keyId}:{ivB64}:{tagB64}:{ctB64}
 *  - the prefix makes encryption idempotent and lets legacy plaintext pass through.
 *
 * No-op mode: when ENCRYPTION_MASTER_KEY is absent, encryptField/hashField
 * pass values through unchanged (with a loud warning at init) so boot never
 * breaks before ops provisions the key.
 *
 * Plain class (no Nest DI) so PrismaService can use it without a circular
 * dependency; EncryptionService delegates to the same singleton.
 */

const PREFIX = 'enc:v1:';

interface PrismaKeystoreDelegate {
  encryptionKeyStore: {
    findMany(args?: any): Promise<any[]>;
    create(args: any): Promise<any>;
    update(args: any): Promise<any>;
  };
}

export class PiiCipher {
  private readonly logger = new Logger('PiiCipher');
  private masterKey: Buffer | null = null;
  private keys = new Map<string, Buffer>(); // keyId -> DEK
  private activeKeyId: string | null = null;
  private hmacKey: Buffer | null = null; // blind-index key (HKDF from master)
  private initialized = false;

  get enabled(): boolean {
    return this.masterKey !== null;
  }

  get ready(): boolean {
    return this.initialized;
  }

  /** Parse ENCRYPTION_MASTER_KEY as base64 (preferred) or hex; must be 32 bytes. */
  private parseMasterKey(raw: string): Buffer | null {
    const tryBufs: Buffer[] = [];
    try { tryBufs.push(Buffer.from(raw, 'base64')); } catch { /* ignore */ }
    try { tryBufs.push(Buffer.from(raw, 'hex')); } catch { /* ignore */ }
    for (const b of tryBufs) if (b.length === 32) return b;
    return null;
  }

  /** Load (or create) the persisted key set. Call once at boot with a Prisma client. */
  async init(prisma: PrismaKeystoreDelegate): Promise<void> {
    if (this.initialized) return;
    const raw = process.env.ENCRYPTION_MASTER_KEY;
    if (!raw) {
      this.logger.warn(
        'ENCRYPTION_MASTER_KEY is not set — PII encryption is in NO-OP passthrough mode. ' +
          'Set a 32-byte base64 key (openssl rand -base64 32) to enable encryption at rest.',
      );
      this.initialized = true;
      return;
    }
    const mk = this.parseMasterKey(raw);
    if (!mk) {
      this.logger.error('ENCRYPTION_MASTER_KEY is set but is not a 32-byte base64/hex key — NO-OP mode.');
      this.initialized = true;
      return;
    }
    this.masterKey = mk;
    this.hmacKey = crypto.hkdfSync('sha256', mk, Buffer.alloc(0), Buffer.from('pii-blind-index'), 32) as unknown as Buffer;
    this.hmacKey = Buffer.from(this.hmacKey); // hkdfSync returns ArrayBuffer in some node versions

    const rows = await prisma.encryptionKeyStore.findMany({ where: { status: { in: ['ACTIVE', 'ROTATED'] } } });
    for (const row of rows) {
      try {
        this.keys.set(row.keyId, this.unwrapKey(row.wrappedKey));
        if (row.status === 'ACTIVE') this.activeKeyId = row.keyId;
      } catch (e: any) {
        this.logger.error(`Cannot unwrap key ${row.keyId} (wrong master key?): ${e.message}`);
      }
    }
    if (!this.activeKeyId) {
      const keyId = `k${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
      const dek = crypto.randomBytes(32);
      await prisma.encryptionKeyStore.create({
        data: { keyId, wrappedKey: this.wrapKey(dek), status: 'ACTIVE' },
      });
      this.keys.set(keyId, dek);
      this.activeKeyId = keyId;
      this.logger.log(`Created initial persisted data key ${keyId}`);
    }
    this.initialized = true;
    this.logger.log(`PII encryption ready (active key ${this.activeKeyId}, ${this.keys.size} key(s) loaded)`);
  }

  private wrapKey(dek: Buffer): string {
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv('aes-256-gcm', this.masterKey!, iv);
    const ct = Buffer.concat([c.update(dek), c.final()]);
    return [iv.toString('base64'), c.getAuthTag().toString('base64'), ct.toString('base64')].join('.');
  }

  private unwrapKey(wrapped: string): Buffer {
    const [ivB, tagB, ctB] = wrapped.split('.');
    const d = crypto.createDecipheriv('aes-256-gcm', this.masterKey!, Buffer.from(ivB, 'base64'));
    d.setAuthTag(Buffer.from(tagB, 'base64'));
    return Buffer.concat([d.update(Buffer.from(ctB, 'base64')), d.final()]);
  }

  /** Rotate: current ACTIVE -> ROTATED (kept for decrypts), new ACTIVE DEK persisted. */
  async rotate(prisma: PrismaKeystoreDelegate): Promise<{ oldKeyId: string | null; newKeyId: string }> {
    if (!this.enabled) throw new Error('Encryption disabled (no master key) — cannot rotate');
    const oldKeyId = this.activeKeyId;
    if (oldKeyId) {
      await prisma.encryptionKeyStore.update({
        where: { keyId: oldKeyId },
        data: { status: 'ROTATED', rotatedAt: new Date() },
      });
    }
    const keyId = `k${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
    const dek = crypto.randomBytes(32);
    await prisma.encryptionKeyStore.create({ data: { keyId, wrappedKey: this.wrapKey(dek), status: 'ACTIVE' } });
    this.keys.set(keyId, dek);
    this.activeKeyId = keyId;
    this.logger.log(`Key rotated: ${oldKeyId} -> ${keyId}`);
    return { oldKeyId, newKeyId: keyId };
  }

  isEncryptedValue(v: unknown): v is string {
    return typeof v === 'string' && v.startsWith(PREFIX);
  }

  /** Encrypt a field value. Idempotent; passthrough for null/empty/no-op mode. */
  encryptField(plain: string | null | undefined): string | null | undefined {
    if (plain === null || plain === undefined || plain === '') return plain;
    if (this.isEncryptedValue(plain)) return plain; // already encrypted
    if (!this.enabled || !this.activeKeyId) return plain; // no-op mode
    const dek = this.keys.get(this.activeKeyId)!;
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv('aes-256-gcm', dek, iv);
    const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
    return (
      PREFIX +
      [this.activeKeyId, iv.toString('base64'), c.getAuthTag().toString('base64'), ct.toString('base64')].join(':')
    );
  }

  /** Decrypt a stored value. Legacy plaintext passes through untouched. */
  decryptField(stored: string | null | undefined): string | null | undefined {
    if (stored === null || stored === undefined || stored === '') return stored;
    if (!this.isEncryptedValue(stored)) return stored; // legacy plaintext
    const parts = stored.slice(PREFIX.length).split(':');
    if (parts.length !== 4) return stored;
    const [keyId, ivB, tagB, ctB] = parts;
    const dek = this.keys.get(keyId);
    if (!dek) {
      this.logger.warn(`No key ${keyId} loaded — returning ciphertext as-is (missing/rotated-out master key?)`);
      return stored;
    }
    try {
      const d = crypto.createDecipheriv('aes-256-gcm', dek, Buffer.from(ivB, 'base64'));
      d.setAuthTag(Buffer.from(tagB, 'base64'));
      return Buffer.concat([d.update(Buffer.from(ctB, 'base64')), d.final()]).toString('utf8');
    } catch (e: any) {
      this.logger.error(`decryptField failed for key ${keyId}: ${e.message}`);
      return stored;
    }
  }

  /** Deterministic blind index (HMAC-SHA256) for equality lookups on encrypted fields. */
  hashField(plain: string | null | undefined): string | null {
    if (plain === null || plain === undefined || plain === '') return null;
    if (!this.enabled || !this.hmacKey) return null; // no-op mode -> callers fall back to plaintext equality
    return crypto.createHmac('sha256', this.hmacKey).update(plain, 'utf8').digest('hex');
  }
}

let singleton: PiiCipher | null = null;
export function getPiiCipher(): PiiCipher {
  if (!singleton) singleton = new PiiCipher();
  return singleton;
}
/** Test hook: reset the singleton (fresh instance simulates a process restart). */
export function resetPiiCipherForTests(): void {
  singleton = null;
}
