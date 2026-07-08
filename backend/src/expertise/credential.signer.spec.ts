import * as crypto from 'crypto';
import { CredentialSigner, canonicalize } from './credential.signer';

describe('EXP-8 credential.signer', () => {
  const SEED = crypto.randomBytes(32).toString('base64');

  beforeAll(() => {
    process.env.CREDENTIAL_SIGNING_KEY = SEED;
  });
  afterAll(() => {
    delete process.env.CREDENTIAL_SIGNING_KEY;
  });

  it('canonicalize is key-order independent', () => {
    expect(canonicalize({ b: 1, a: { d: 2, c: [3, { f: 4, e: 5 }] } })).toBe(
      canonicalize({ a: { c: [3, { e: 5, f: 4 }], d: 2 }, b: 1 }),
    );
  });

  it('signs and verifies a VC roundtrip', () => {
    const signer = new CredentialSigner();
    expect(signer.isProvisioned).toBe(true);
    const vc = { type: ['VerifiableCredential'], credentialSubject: { achievement: { name: 'TVA România' } } };
    const sig = signer.sign(vc);
    expect(signer.verify(vc, sig)).toBe(true);
  });

  it('fails verification on a tampered payload', () => {
    const signer = new CredentialSigner();
    const vc = { type: ['VerifiableCredential'], credentialSubject: { achievement: { name: 'TVA România' } } };
    const sig = signer.sign(vc);
    const tampered = { ...vc, credentialSubject: { achievement: { name: 'Doctorat în orice' } } };
    expect(signer.verify(tampered, sig)).toBe(false);
  });

  it('fails verification on a corrupted signature', () => {
    const signer = new CredentialSigner();
    const vc = { a: 1 };
    const sig = signer.sign(vc);
    const bad = Buffer.from(sig, 'base64');
    bad[0] ^= 0xff;
    expect(signer.verify(vc, bad.toString('base64'))).toBe(false);
  });

  it('generates an ephemeral key (unprovisioned) when env is unset', () => {
    delete process.env.CREDENTIAL_SIGNING_KEY;
    const signer = new CredentialSigner();
    expect(signer.isProvisioned).toBe(false);
    const sig = signer.sign({ x: 1 });
    expect(signer.verify({ x: 1 }, sig)).toBe(true);
    process.env.CREDENTIAL_SIGNING_KEY = SEED;
  });
});
