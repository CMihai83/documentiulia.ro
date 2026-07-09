/**
 * GE-DSAR pure logic — Art 12 timing + Art 12(6) verification tiering.
 * No I/O; deterministic; unit-tested.
 */

export type DsarType =
  | 'access'
  | 'erasure'
  | 'rectification'
  | 'restriction'
  | 'portability'
  | 'objection';

export type VerificationTier = 'low' | 'medium' | 'high';

export const DSAR_TYPES: DsarType[] = [
  'access', 'erasure', 'rectification', 'restriction', 'portability', 'objection',
];

/** Art 12(3): respond within one calendar month of receipt. */
export function computeDueAt(receivedAt: Date): Date {
  const d = new Date(receivedAt.getTime());
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + 1);
  // guard month-length overflow (e.g. Jan 31 + 1mo -> Feb 28/29, not Mar 3)
  if (d.getUTCDate() < day) d.setUTCDate(0);
  return d;
}

/** Art 12(3): extension by two further months for complex/numerous requests. */
export function computeExtendedTo(receivedAt: Date): Date {
  const d = new Date(receivedAt.getTime());
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + 3);
  if (d.getUTCDate() < day) d.setUTCDate(0);
  return d;
}

/**
 * Art 12(6): identity verification proportionate to the request's risk.
 * - Erasure / portability / rectification expose or destroy data -> stronger proof.
 * - A plain access request from someone who already authenticated as the
 *   account holder must NOT be forced through document upload.
 */
export function requiredVerificationTier(
  type: DsarType,
  opts: { requesterIsAuthenticatedAccountHolder?: boolean } = {},
): VerificationTier {
  if (opts.requesterIsAuthenticatedAccountHolder) return 'low';
  switch (type) {
    case 'access':
    case 'restriction':
    case 'objection':
      return 'low'; // email-token confirmation
    case 'rectification':
      return 'medium'; // email + known-record match
    case 'erasure':
    case 'portability':
      return 'high'; // document upload -> manual review (high-impact / irreversible)
  }
}

/** A verification attempt satisfies the requirement if it meets or exceeds the tier. */
const TIER_RANK: Record<VerificationTier, number> = { low: 0, medium: 1, high: 2 };
export function verificationSatisfied(required: VerificationTier, provided: VerificationTier): boolean {
  return TIER_RANK[provided] >= TIER_RANK[required];
}

/** Days remaining vs the effective deadline (extendedTo wins when set). */
export function daysRemaining(now: Date, dueAt: Date, extendedTo?: Date | null): number {
  const deadline = extendedTo ?? dueAt;
  return Math.floor((deadline.getTime() - now.getTime()) / 86_400_000);
}

export function isOverdue(now: Date, dueAt: Date, extendedTo?: Date | null): boolean {
  return daysRemaining(now, dueAt, extendedTo) < 0;
}
