/**
 * GE-CNP pure logic — Law 190/2018 Art 4 gate.
 * When a RoPA entry processes CNP (or another national identifier) on the
 * LEGITIMATE-INTEREST basis, Romanian Law 190/2018 Art 4 requires extra
 * safeguards before that processing may go live. No I/O; unit-tested.
 */

export interface RopaLike {
  legalBasis?: string | null;
  categories?: string[];
  specialCategories?: string[];
  // safeguards the tenant declares:
  dpoDesignated?: boolean;
  retentionMonths?: number | null;
  staffTrainingAttested?: boolean;
  documentedSafeguards?: boolean;
}

export interface Law190Condition {
  key: 'dpo' | 'retention' | 'training' | 'safeguards';
  ok: boolean;
  remedy: string;
}

export interface Law190Check {
  applies: boolean; // true only for legitimate-interest + CNP
  passed: boolean;
  conditions: Law190Condition[];
}

const CNP_CATEGORY_HINTS = ['cnp', 'national id', 'identificator național', 'serie ci', 'cod numeric personal'];

export function processesCnp(entry: RopaLike): boolean {
  const cats = [...(entry.categories ?? []), ...(entry.specialCategories ?? [])].map((c) => c.toLowerCase());
  return cats.some((c) => CNP_CATEGORY_HINTS.some((h) => c.includes(h)));
}

function isLegitimateInterest(basis?: string | null): boolean {
  const b = (basis ?? '').toLowerCase().replace(/[\s_-]/g, '');
  return b.includes('legitimate') || b.includes('interes') || b === 'legitimateinterest' || b === 'legitimate_interests';
}

/** The Art-4 gate. `applies=false` means CNP-on-legit-interest is not present -> never blocks. */
export function checkLaw190(entry: RopaLike): Law190Check {
  const applies = isLegitimateInterest(entry.legalBasis) && processesCnp(entry);
  const conditions: Law190Condition[] = [
    {
      key: 'dpo',
      ok: !!entry.dpoDesignated,
      remedy: 'Desemnați un responsabil cu protecția datelor (DPO) — Legea 190/2018 art. 4 lit. a.',
    },
    {
      key: 'retention',
      ok: typeof entry.retentionMonths === 'number' && entry.retentionMonths > 0,
      remedy: 'Stabiliți o perioadă de stocare explicită pentru CNP — art. 4 lit. b.',
    },
    {
      key: 'training',
      ok: !!entry.staffTrainingAttested,
      remedy: 'Atestați instruirea periodică a personalului cu acces la CNP — art. 4 lit. c.',
    },
    {
      key: 'safeguards',
      ok: !!entry.documentedSafeguards,
      remedy: 'Documentați garanțiile tehnice și organizatorice aplicate — art. 4 lit. d.',
    },
  ];
  // Not applicable -> vacuously passed (no gate).
  const passed = !applies || conditions.every((c) => c.ok);
  return { applies, passed, conditions };
}

/** Server-side activation gate: may a RoPA entry become `active`? */
export function canActivate(entry: RopaLike): { allowed: boolean; check: Law190Check } {
  const check = checkLaw190(entry);
  return { allowed: check.passed, check };
}
