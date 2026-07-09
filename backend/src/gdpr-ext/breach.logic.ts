/**
 * GE-BREACH pure logic — Art 33 timing, ENISA-style severity, ANSPDCP draft.
 * No I/O, no network; deterministic; unit-tested.
 *
 * Severity model follows ENISA "Recommendations for a methodology of the
 * assessment of severity of personal data breaches" (2013): SE = DPC x EI x CB,
 * banded to low / medium / high / very_high. Simplified but deterministic.
 */

export type BreachSeverity = 'low' | 'medium' | 'high' | 'very_high';

/** Art 33(1): notify the supervisory authority within 72h of becoming aware. */
export function computeNotifyDueAt(detectedAt: Date): Date {
  return new Date(detectedAt.getTime() + 72 * 3600 * 1000);
}

export function breachHoursRemaining(now: Date, notifyDueAt: Date): number {
  return Math.floor((notifyDueAt.getTime() - now.getTime()) / 3_600_000);
}

export interface EnisaInputs {
  /** Data Processing Context: simple(1) < behavioural(2) < financial(3) < sensitive/special(4). */
  dpc: 1 | 2 | 3 | 4;
  /** Ease of Identification: negligible(0.25) < limited(0.5) < significant(0.75) < maximum(1). */
  ei: 0.25 | 0.5 | 0.75 | 1;
  /** Circumstances of the breach: loss of confidentiality/integrity/availability + malicious intent. */
  lossOfConfidentiality?: boolean;
  lossOfIntegrity?: boolean;
  lossOfAvailability?: boolean;
  maliciousIntent?: boolean;
}

/** CB (circumstances bonus): each aggravating factor adds 0.25, capped for sanity. */
export function circumstancesBonus(i: EnisaInputs): number {
  let cb = 0;
  if (i.lossOfConfidentiality) cb += 0.25;
  if (i.lossOfIntegrity) cb += 0.25;
  if (i.lossOfAvailability) cb += 0.25;
  if (i.maliciousIntent) cb += 0.5;
  return cb;
}

/** SE = DPC x EI + CB. Deterministic score in ~[0.25 .. 5.25]. */
export function enisaScore(i: EnisaInputs): number {
  return Number((i.dpc * i.ei + circumstancesBonus(i)).toFixed(4));
}

export function enisaSeverity(i: EnisaInputs): BreachSeverity {
  const se = enisaScore(i);
  if (se < 1) return 'low';
  if (se < 2) return 'medium';
  if (se < 3) return 'high';
  return 'very_high';
}

/** Art 34: high-risk breaches also require notifying affected data subjects. */
export function subjectNotificationRequired(sev: BreachSeverity): boolean {
  return sev === 'high' || sev === 'very_high';
}

export interface AnsdpcDraftInput {
  orgName: string;
  detectedAt: Date;
  description: string;
  categories: string[];
  affectedCount: number;
  severity: BreachSeverity;
  measuresTaken?: string;
  dpoContact?: string;
}

/**
 * ANSPDCP notification content (Decision 128/2018 fields), Romanian, DRAFT only.
 * The mandatory-field keys below are asserted in tests.
 */
export function ansdpcNotificationDraft(i: AnsdpcDraftInput): Record<string, string> {
  return {
    operator: i.orgName,
    dataProtectionOfficer: i.dpoContact ?? 'A se completa (DPO)',
    natureOfBreach: i.description,
    categoriesOfData: i.categories.join(', ') || 'A se completa',
    approximateNumberAffected: String(i.affectedCount),
    dateOfAwareness: i.detectedAt.toISOString(),
    likelyConsequences:
      `Severitate estimată: ${i.severity.toUpperCase()}. Se evaluează riscul pentru drepturile și libertățile persoanelor vizate.`,
    measuresTaken: i.measuresTaken ?? 'A se completa: măsuri luate/propuse pentru remediere.',
    subjectsNotified: subjectNotificationRequired(i.severity) ? 'Da (Art. 34)' : 'Nu — risc scăzut',
    legalBasis: 'Art. 33 GDPR · Decizia ANSPDCP nr. 128/2018',
    disclaimer:
      'DRAFT generat automat. Nu constituie consultanță juridică. A se revizui și transmite manual către ANSPDCP.',
  };
}

export const ANSDPC_MANDATORY_FIELDS = [
  'operator',
  'natureOfBreach',
  'categoriesOfData',
  'approximateNumberAffected',
  'dateOfAwareness',
  'likelyConsequences',
  'measuresTaken',
];
