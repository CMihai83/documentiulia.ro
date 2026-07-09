import { computeDueAt, computeExtendedTo, requiredVerificationTier, verificationSatisfied, isOverdue, daysRemaining } from './dsar.logic';
import { computeNotifyDueAt, enisaScore, enisaSeverity, subjectNotificationRequired, ansdpcNotificationDraft, ANSDPC_MANDATORY_FIELDS } from './breach.logic';
import { checkLaw190, canActivate } from './law190.logic';
import { artifactStamp, LEGAL_TERMS } from './legal-terms';

describe('GE-DSAR dsar.logic — Art 12 clock + verification', () => {
  it('dueAt = receivedAt + 1 calendar month', () => {
    expect(computeDueAt(new Date('2026-01-15T00:00:00Z')).toISOString()).toBe('2026-02-15T00:00:00.000Z');
  });
  it('handles month-length overflow (Jan 31 -> Feb 28)', () => {
    expect(computeDueAt(new Date('2026-01-31T00:00:00Z')).toISOString().slice(0, 10)).toBe('2026-02-28');
  });
  it('extension = receivedAt + 3 months', () => {
    expect(computeExtendedTo(new Date('2026-01-15T00:00:00Z')).toISOString().slice(0, 10)).toBe('2026-04-15');
  });
  it('verification tier is proportionate: erasure=high, access=low, but authed account holder=low', () => {
    expect(requiredVerificationTier('erasure')).toBe('high');
    expect(requiredVerificationTier('portability')).toBe('high');
    expect(requiredVerificationTier('access')).toBe('low');
    expect(requiredVerificationTier('rectification')).toBe('medium');
    expect(requiredVerificationTier('erasure', { requesterIsAuthenticatedAccountHolder: true })).toBe('low');
  });
  it('verificationSatisfied requires meeting or exceeding the tier', () => {
    expect(verificationSatisfied('high', 'medium')).toBe(false);
    expect(verificationSatisfied('high', 'high')).toBe(true);
    expect(verificationSatisfied('low', 'high')).toBe(true);
  });
  it('overdue after the effective deadline (extension wins)', () => {
    const recv = new Date('2026-01-01T00:00:00Z');
    const due = computeDueAt(recv);
    expect(isOverdue(new Date('2026-02-10T00:00:00Z'), due)).toBe(true);
    expect(isOverdue(new Date('2026-02-10T00:00:00Z'), due, computeExtendedTo(recv))).toBe(false);
    expect(daysRemaining(new Date('2026-02-01T00:00:00Z'), due)).toBe(0);
  });
});

describe('GE-BREACH breach.logic — 72h + ENISA', () => {
  it('notifyDueAt = detectedAt + 72h', () => {
    expect(computeNotifyDueAt(new Date('2026-07-01T00:00:00Z')).toISOString()).toBe('2026-07-04T00:00:00.000Z');
  });
  it('ENISA severity bands deterministically', () => {
    expect(enisaSeverity({ dpc: 1, ei: 0.25 })).toBe('low'); // 0.25
    expect(enisaSeverity({ dpc: 2, ei: 0.5 })).toBe('medium'); // 1.0
    expect(enisaSeverity({ dpc: 3, ei: 0.75, lossOfConfidentiality: true })).toBe('high'); // 2.25+.25=... 2.5
    expect(enisaSeverity({ dpc: 4, ei: 1, maliciousIntent: true })).toBe('very_high'); // 4.5
  });
  it('score is exact + monotonic', () => {
    expect(enisaScore({ dpc: 4, ei: 1, lossOfConfidentiality: true, maliciousIntent: true })).toBe(4.75);
  });
  it('subject notification required only for high+', () => {
    expect(subjectNotificationRequired('medium')).toBe(false);
    expect(subjectNotificationRequired('high')).toBe(true);
    expect(subjectNotificationRequired('very_high')).toBe(true);
  });
  it('ANSPDCP draft has all mandatory fields + disclaimer', () => {
    const d = ansdpcNotificationDraft({ orgName: 'ACME', detectedAt: new Date('2026-07-01T00:00:00Z'), description: 'x', categories: ['CNP'], affectedCount: 10, severity: 'high' });
    for (const k of ANSDPC_MANDATORY_FIELDS) expect(d[k]).toBeDefined();
    expect(d.disclaimer).toContain('consultanță juridică');
  });
});

describe('GE-CNP law190.logic — Art 4 gate', () => {
  const base = { legalBasis: 'legitimate_interest', categories: ['CNP', 'name'] };
  it('applies only to legitimate-interest + CNP', () => {
    expect(checkLaw190(base).applies).toBe(true);
    expect(checkLaw190({ legalBasis: 'consent', categories: ['CNP'] }).applies).toBe(false);
    expect(checkLaw190({ legalBasis: 'legitimate_interest', categories: ['email'] }).applies).toBe(false);
  });
  it('blocks activation until all four conditions met, then allows', () => {
    expect(canActivate(base).allowed).toBe(false);
    const ok = { ...base, dpoDesignated: true, retentionMonths: 24, staffTrainingAttested: true, documentedSafeguards: true };
    expect(canActivate(ok).allowed).toBe(true);
    // partial still blocks
    expect(canActivate({ ...ok, staffTrainingAttested: false }).allowed).toBe(false);
  });
  it('non-applicable entries are vacuously allowed', () => {
    expect(canActivate({ legalBasis: 'contract', categories: ['email'] }).allowed).toBe(true);
  });
});

describe('GE-LIABILITY legal-terms', () => {
  it('every artifact stamp is lawyerReviewed:false + disclaimer', () => {
    const s = artifactStamp('ro');
    expect(s.lawyerReviewed).toBe(false);
    expect(s.disclaimer).toContain('consultanță juridică');
    expect(artifactStamp('en').disclaimer).toContain('legal advice');
  });
  it('LEGAL_TERMS is versioned with AS-IS + 12-month cap clauses', () => {
    expect(LEGAL_TERMS.version).toBeTruthy();
    expect(LEGAL_TERMS.ro.join(' ')).toContain('12 luni');
    expect(LEGAL_TERMS.en.join(' ')).toContain('12 months');
  });
});
