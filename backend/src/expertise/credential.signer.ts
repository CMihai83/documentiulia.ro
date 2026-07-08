import * as crypto from 'crypto';
import { Logger } from '@nestjs/common';

/**
 * EXP-8 — Ed25519 signing for Open Badges 3.0 / W3C VCs.
 *
 * Key provisioning mirrors PiiCipher's ENCRYPTION_MASTER_KEY pattern:
 * - env CREDENTIAL_SIGNING_KEY = base64/hex of a 32-byte Ed25519 seed (preferred).
 * - If absent, a seed is generated at boot and printed ONCE in a loud warning so
 *   ops can persist it to .env — it is NEVER written to a file by this code.
 *   Until it is persisted, credentials issued in that boot verify only until the
 *   next restart (key changes), which the warning states.
 *
 * Signatures are detached Ed25519 over a canonical JSON serialisation (stable
 * key order), so any tampering with the stored vcJson fails verification.
 */

// PKCS#8 DER prefix for a raw Ed25519 private seed (RFC 8410).
const PKCS8_ED25519_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');

/** Deterministic JSON: object keys sorted recursively (arrays keep order). */
export function canonicalize(value: any): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(value[k])}`).join(',')}}`;
}

export class CredentialSigner {
  private readonly logger = new Logger(CredentialSigner.name);
  private privateKey!: crypto.KeyObject;
  private publicKeyB64!: string;
  private provisioned = false;

  constructor() {
    this.init();
  }

  private parseSeed(raw: string): Buffer | null {
    try {
      let b = Buffer.from(raw, 'base64');
      if (b.length !== 32) b = Buffer.from(raw, 'hex');
      return b.length === 32 ? b : null;
    } catch {
      return null;
    }
  }

  private init() {
    const raw = process.env.CREDENTIAL_SIGNING_KEY;
    let seed = raw ? this.parseSeed(raw) : null;
    if (raw && !seed) {
      this.logger.error('CREDENTIAL_SIGNING_KEY is set but is not a 32-byte base64/hex seed — generating an ephemeral key.');
    }
    if (!seed) {
      seed = crypto.randomBytes(32);
      this.logger.warn(
        '════════════════════════════════════════════════════════════════════\n' +
          'CREDENTIAL_SIGNING_KEY is not set — generated an EPHEMERAL Ed25519 seed.\n' +
          `ONE-TIME PROVISIONING KEY (save to .env as CREDENTIAL_SIGNING_KEY):\n  ${seed.toString('base64')}\n` +
          'Credentials issued now will fail verification after a restart unless\n' +
          'this exact key is persisted. It is not written to disk by the app.\n' +
          '════════════════════════════════════════════════════════════════════',
      );
    } else {
      this.provisioned = true;
    }
    this.privateKey = crypto.createPrivateKey({
      key: Buffer.concat([PKCS8_ED25519_PREFIX, seed]),
      format: 'der',
      type: 'pkcs8',
    });
    const pub = crypto.createPublicKey(this.privateKey);
    this.publicKeyB64 = (pub.export({ format: 'der', type: 'spki' }) as Buffer).toString('base64');
    this.logger.log(`Credential signer ready (Ed25519, key ${this.provisioned ? 'provisioned from env' : 'EPHEMERAL'})`);
  }

  get publicKey(): string {
    return this.publicKeyB64;
  }

  get isProvisioned(): boolean {
    return this.provisioned;
  }

  /** Detached signature (base64) over the canonical form of the unsigned VC. */
  sign(unsignedVc: Record<string, any>): string {
    const data = Buffer.from(canonicalize(unsignedVc), 'utf8');
    return crypto.sign(null, data, this.privateKey).toString('base64');
  }

  /** Verify a detached signature against the canonical form of the (proof-stripped) VC. */
  verify(unsignedVc: Record<string, any>, signatureB64: string): boolean {
    try {
      const pub = crypto.createPublicKey({
        key: Buffer.from(this.publicKeyB64, 'base64'),
        format: 'der',
        type: 'spki',
      });
      const data = Buffer.from(canonicalize(unsignedVc), 'utf8');
      return crypto.verify(null, data, pub, Buffer.from(signatureB64, 'base64'));
    } catch {
      return false;
    }
  }
}

let signer: CredentialSigner | null = null;
/** Module-level singleton (same pattern as getPiiCipher). */
export function getCredentialSigner(): CredentialSigner {
  if (!signer) signer = new CredentialSigner();
  return signer;
}
