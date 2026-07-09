/**
 * GE-DPIA pure logic — Art 35 screening (WP248 + ANSPDCP Decision 174/2018),
 * a 4×4 likelihood×severity risk matrix, and the Law-190 Art 5
 * employee-monitoring wizard (5 gates). Deterministic; no I/O.
 *
 * Outputs are structured working documents, not legal advice — the service
 * stamps every artifact with legal-terms.artifactStamp() (lawyerReviewed:false).
 */

// ---------------------------------------------------------------------------
// Screening
// ---------------------------------------------------------------------------

export interface ScreeningAnswers {
  // WP248 criteria (EDPB, 9 items)
  evaluationOrScoring?: boolean;         // profiling/scoring
  automatedDecisionLegalEffect?: boolean;
  systematicMonitoring?: boolean;        // incl. publicly accessible areas
  sensitiveOrHighlyPersonal?: boolean;   // special categories / highly personal
  largeScale?: boolean;
  matchingOrCombining?: boolean;         // dataset matching/combining
  vulnerableSubjects?: boolean;          // employees, children, patients…
  innovativeTech?: boolean;              // new tech / AI
  preventsRightsOrService?: boolean;     // blocks a right/contract/service
  // ANSPDCP Decision 174/2018 national list (selection)
  nationalIdLargeScale?: boolean;        // CNP at scale (national identifier)
  employeeMonitoring?: boolean;          // systematic monitoring of employees
  locationOrBehaviourLargeScale?: boolean;
}

export type ScreeningVerdict = 'required' | 'recommended' | 'not_required';

export interface ScreeningResult {
  verdict: ScreeningVerdict;
  criteriaMet: string[];
  reasons: string[];
  /** true when the Law-190 Art-5 employee-monitoring wizard must pass before sign-off */
  employeeMonitoringWizardRequired: boolean;
}

const WP248_KEYS: Array<[keyof ScreeningAnswers, string]> = [
  ['evaluationOrScoring', 'Evaluare sau scoring (profilare)'],
  ['automatedDecisionLegalEffect', 'Decizii automate cu efect juridic/similar semnificativ'],
  ['systematicMonitoring', 'Monitorizare sistematică'],
  ['sensitiveOrHighlyPersonal', 'Date sensibile sau cu caracter deosebit de personal'],
  ['largeScale', 'Prelucrare pe scară largă'],
  ['matchingOrCombining', 'Combinarea/corelarea seturilor de date'],
  ['vulnerableSubjects', 'Persoane vizate vulnerabile (angajați, minori, pacienți)'],
  ['innovativeTech', 'Utilizarea inovatoare a tehnologiei (ex. AI)'],
  ['preventsRightsOrService', 'Împiedică exercitarea unui drept sau accesul la un serviciu/contract'],
];

const ANSPDCP_KEYS: Array<[keyof ScreeningAnswers, string]> = [
  ['nationalIdLargeScale', 'ANSPDCP 174/2018: identificator național (CNP) pe scară largă'],
  ['employeeMonitoring', 'ANSPDCP 174/2018: monitorizarea sistematică a angajaților'],
  ['locationOrBehaviourLargeScale', 'ANSPDCP 174/2018: date de localizare/comportament pe scară largă'],
];

/**
 * Verdict rule (documented, deterministic):
 *  - ANY ANSPDCP national-list item        -> required (national list is binding)
 *  - >= 2 WP248 criteria                    -> required (EDPB rule of thumb)
 *  - exactly 1 WP248 criterion              -> recommended
 *  - none                                   -> not_required
 */
export function screen(a: ScreeningAnswers): ScreeningResult {
  const wp = WP248_KEYS.filter(([k]) => !!a[k]);
  const nat = ANSPDCP_KEYS.filter(([k]) => !!a[k]);
  const criteriaMet = [...nat, ...wp].map(([, label]) => label);
  let verdict: ScreeningVerdict = 'not_required';
  const reasons: string[] = [];
  if (nat.length > 0) {
    verdict = 'required';
    reasons.push('Prelucrarea figurează pe lista națională ANSPDCP (Decizia 174/2018) — DPIA obligatorie.');
  } else if (wp.length >= 2) {
    verdict = 'required';
    reasons.push(`${wp.length} criterii WP248 îndeplinite (pragul EDPB este 2) — DPIA obligatorie.`);
  } else if (wp.length === 1) {
    verdict = 'recommended';
    reasons.push('Un singur criteriu WP248 — DPIA recomandată ca bună practică.');
  } else {
    reasons.push('Niciun criteriu WP248/ANSPDCP îndeplinit — DPIA nu este necesară.');
  }
  return {
    verdict,
    criteriaMet,
    reasons,
    employeeMonitoringWizardRequired: !!a.employeeMonitoring,
  };
}

// ---------------------------------------------------------------------------
// Risk matrix (4×4)
// ---------------------------------------------------------------------------

export interface RiskItem {
  risk: string;
  likelihood: 1 | 2 | 3 | 4;         // rare..very likely
  severity: 1 | 2 | 3 | 4;           // minimal..maximal impact on subjects
  mitigations?: string[];
  residualLikelihood?: 1 | 2 | 3 | 4;
  residualSeverity?: 1 | 2 | 3 | 4;
}

export type RiskBand = 'low' | 'medium' | 'high' | 'very_high';

export function band(score: number): RiskBand {
  if (score <= 4) return 'low';
  if (score <= 8) return 'medium';
  if (score <= 12) return 'high';
  return 'very_high';
}

export interface RiskAssessment {
  items: Array<RiskItem & { inherentScore: number; inherentBand: RiskBand; residualScore: number; residualBand: RiskBand }>;
  overallResidual: RiskBand;
  /** Art 36 prior consultation needed when residual risk stays high/very_high */
  art36Required: boolean;
}

export function assessRisks(items: RiskItem[]): RiskAssessment {
  const scored = items.map((r) => {
    const inherentScore = r.likelihood * r.severity;
    const rl = r.residualLikelihood ?? r.likelihood;
    const rs = r.residualSeverity ?? r.severity;
    const residualScore = rl * rs;
    return { ...r, inherentScore, inherentBand: band(inherentScore), residualScore, residualBand: band(residualScore) };
  });
  const order: RiskBand[] = ['low', 'medium', 'high', 'very_high'];
  const overallResidual = scored.reduce<RiskBand>(
    (acc, r) => (order.indexOf(r.residualBand) > order.indexOf(acc) ? r.residualBand : acc),
    'low',
  );
  return { items: scored, overallResidual, art36Required: overallResidual === 'high' || overallResidual === 'very_high' };
}

// ---------------------------------------------------------------------------
// Law 190/2018 Art 5 — employee-monitoring wizard (5 gates)
// ---------------------------------------------------------------------------

export interface MonitoringWizardAnswers {
  legitimateInterestProven?: boolean; // interests duly justified & documented
  priorInfoProvided?: boolean;        // employees informed in advance
  unionOrRepsConsulted?: boolean;     // consultation done
  alternativesExhausted?: boolean;    // less-intrusive means shown insufficient
  storageDays?: number;               // Art 5: max 30 days unless justified
  storageJustification?: string;
}

export interface WizardGate {
  key: string;
  ok: boolean;
  remedy: string;
}

export interface WizardResult {
  passed: boolean;
  gates: WizardGate[];
}

export function monitoringWizard(a: MonitoringWizardAnswers): WizardResult {
  const storageOk =
    typeof a.storageDays === 'number' &&
    (a.storageDays <= 30 || !!(a.storageJustification && a.storageJustification.trim().length >= 20));
  const gates: WizardGate[] = [
    { key: 'legitimate_interest', ok: !!a.legitimateInterestProven, remedy: 'Documentați interesul legitim temeinic justificat (art. 5 lit. a).' },
    { key: 'prior_info', ok: !!a.priorInfoProvided, remedy: 'Informați prealabil angajații despre monitorizare (art. 5 lit. b).' },
    { key: 'consultation', ok: !!a.unionOrRepsConsulted, remedy: 'Consultați sindicatul sau reprezentanții angajaților (art. 5 lit. c).' },
    { key: 'alternatives', ok: !!a.alternativesExhausted, remedy: 'Demonstrați că metode mai puțin intruzive nu au fost eficiente (art. 5 lit. d).' },
    { key: 'storage_30d', ok: storageOk, remedy: 'Limitați stocarea la 30 de zile sau justificați temeinic o durată mai mare (art. 5 lit. e).' },
  ];
  return { passed: gates.every((g) => g.ok), gates };
}

// ---------------------------------------------------------------------------
// Art 36 prior-consultation package (draft content)
// ---------------------------------------------------------------------------

export function art36Draft(processName: string, screening: ScreeningResult, risks: RiskAssessment, locale: 'ro' | 'en' = 'ro'): string {
  const ro = locale === 'ro';
  const title = ro ? 'Pachet consultare prealabilă — Art. 36 GDPR' : 'Prior consultation package — GDPR Art. 36';
  const rows = risks.items
    .map((r) => `<tr><td>${r.risk}</td><td>${r.inherentBand}</td><td>${(r.mitigations ?? []).join('; ') || '—'}</td><td>${r.residualBand}</td></tr>`)
    .join('');
  return `<h1>${title}</h1>
<p><strong>${ro ? 'Prelucrarea' : 'Processing'}:</strong> ${processName}</p>
<p><strong>${ro ? 'Motivele DPIA' : 'DPIA triggers'}:</strong> ${screening.criteriaMet.join('; ')}</p>
<table><thead><tr><th>${ro ? 'Risc' : 'Risk'}</th><th>${ro ? 'Inerent' : 'Inherent'}</th><th>${ro ? 'Măsuri' : 'Mitigations'}</th><th>${ro ? 'Rezidual' : 'Residual'}</th></tr></thead><tbody>${rows}</tbody></table>
<p>${ro
    ? 'Riscul rezidual rămâne ridicat; operatorul solicită consultarea prealabilă a ANSPDCP conform art. 36 GDPR. Acest pachet NU se transmite automat — depunerea este o acțiune manuală a operatorului.'
    : 'Residual risk remains high; the controller seeks prior consultation with the supervisory authority under GDPR Art. 36. This package is NOT auto-submitted — filing is a manual controller action.'}</p>`;
}
