/**
 * GE-VENDOR pure logic — SCC 2021/914 module picker, TIA scoring (EDPB 01/2020
 * structure, mirrors docs/gdpr-module/TIA-xai.md), and Art 28 DPA HTML.
 * Deterministic; no I/O. Generated docs are informational, not legal advice.
 */

export type PartyRole = 'controller' | 'processor';

/**
 * SCC 2021/914 modules by role pairing (exporter → importer):
 *   M1 controller → controller
 *   M2 controller → processor
 *   M3 processor  → processor
 *   M4 processor  → controller
 */
export function sccModule(exporter: PartyRole, importer: PartyRole): 'M1' | 'M2' | 'M3' | 'M4' {
  if (exporter === 'controller' && importer === 'controller') return 'M1';
  if (exporter === 'controller' && importer === 'processor') return 'M2';
  if (exporter === 'processor' && importer === 'processor') return 'M3';
  return 'M4'; // processor -> controller
}

export interface TransferDecisionInput {
  importerCountry: string;   // ISO-2
  importerIsEu: boolean;
  dpfClaimed?: boolean;      // importer claims EU-US Data Privacy Framework
  exporterRole: PartyRole;
  importerRole: PartyRole;
}

export interface TransferDecision {
  mechanism: 'none_needed' | 'adequacy' | 'dpf_verify' | 'scc';
  sccModule?: 'M1' | 'M2' | 'M3' | 'M4';
  note: string;
  tiaRequired: boolean;
}

// Non-exhaustive adequacy list (Art 45 decisions). Kept small + honest.
const ADEQUATE = new Set(['GB', 'CH', 'CA', 'JP', 'KR', 'NZ', 'IL', 'UY', 'AR', 'AD', 'FO', 'GG', 'IM', 'JE']);

export function decideTransfer(i: TransferDecisionInput): TransferDecision {
  if (i.importerIsEu) {
    return { mechanism: 'none_needed', note: 'Importator în SEE — niciun mecanism de transfer necesar.', tiaRequired: false };
  }
  if (ADEQUATE.has(i.importerCountry.toUpperCase())) {
    return { mechanism: 'adequacy', note: `Țară cu decizie de adecvare (${i.importerCountry}).`, tiaRequired: false };
  }
  if (i.dpfClaimed && i.importerCountry.toUpperCase() === 'US') {
    return {
      mechanism: 'dpf_verify',
      note: 'Importatorul invocă EU-US DPF. Verificați manual listarea activă pe dataprivacyframework.gov și păstrați dovada; recomandăm SCC ca rezervă. (Nu verificăm automat lista DPF.)',
      tiaRequired: true,
    };
  }
  return {
    mechanism: 'scc',
    sccModule: sccModule(i.exporterRole, i.importerRole),
    note: 'Fără adecvare/DPF — sunt necesare Clauze Contractuale Standard (2021/914) + evaluare de impact al transferului (TIA).',
    tiaRequired: true,
  };
}

// ---------------------------------------------------------------------------
// TIA — EDPB 01/2020 six-step, scored (mirrors TIA-xai.md's shape)
// ---------------------------------------------------------------------------

export interface TiaAnswers {
  governmentAccessRisk?: 1 | 2 | 3 | 4;   // destination surveillance exposure
  dataSensitivity?: 1 | 2 | 3 | 4;
  volume?: 1 | 2 | 3 | 4;
  encryptionAtRest?: boolean;             // supplementary measures
  pseudonymised?: boolean;
  encryptionInTransit?: boolean;
  contractualSafeguards?: boolean;        // SCC + DPA in place
  zeroRetentionWarranty?: boolean;        // sub-processor ZDR / no-training
  specialCategories?: boolean;
}

export type TiaVerdict = 'proceed' | 'proceed_with_measures' | 'do_not_transfer';

export interface TiaResult {
  score: number;        // 0 (safe) .. 12 (highest residual)
  verdict: TiaVerdict;
  measures: string[];
  reasons: string[];
}

export function assessTia(a: TiaAnswers): TiaResult {
  const inherent = (a.governmentAccessRisk ?? 2) + (a.dataSensitivity ?? 2) + (a.volume ?? 2); // 3..12
  let credit = 0;
  const measures: string[] = [];
  const reasons: string[] = [];
  if (a.pseudonymised) { credit += 2; measures.push('Pseudonimizare/redactare a datelor cu caracter personal înainte de transfer.'); }
  if (a.encryptionAtRest) { credit += 1; measures.push('Criptare la repaus la destinație.'); }
  if (a.encryptionInTransit) { credit += 1; measures.push('Criptare în tranzit (TLS).'); }
  if (a.contractualSafeguards) { credit += 1; measures.push('SCC 2021/914 + DPA în vigoare.'); }
  if (a.zeroRetentionWarranty) { credit += 1; measures.push('Garanție de non-retenție / non-antrenare de la importator.'); }

  const score = Math.max(0, inherent - credit);
  let verdict: TiaVerdict;
  if (a.specialCategories && !a.pseudonymised) {
    verdict = 'do_not_transfer';
    reasons.push('Categorii speciale de date fără pseudonimizare — transferul nu este recomandat.');
  } else if (score <= 4) {
    verdict = 'proceed';
    reasons.push('Risc rezidual scăzut cu măsurile aplicate.');
  } else if (score <= 8) {
    verdict = 'proceed_with_measures';
    reasons.push('Risc rezidual moderat — continuați doar cu măsurile suplimentare enumerate.');
  } else {
    verdict = 'do_not_transfer';
    reasons.push('Risc rezidual ridicat chiar și cu măsuri — reconsiderați transferul.');
  }
  return { score, verdict, measures, reasons };
}

// ---------------------------------------------------------------------------
// Art 28 DPA generator (EU 2021/915 structure)
// ---------------------------------------------------------------------------

export interface DpaInput {
  controllerName: string;
  processorName: string;
  purposes: string[];
  categories: string[];
  retentionMonths?: number | null;
  sccModule?: string | null;
  locale?: 'ro' | 'en';
}

export function buildDpaHtml(i: DpaInput): string {
  const ro = (i.locale ?? 'ro') === 'ro';
  const L = ro
    ? {
        title: 'Acord de prelucrare a datelor (Art. 28 GDPR)',
        parties: 'Părți', controller: 'Operator', processor: 'Persoană împuternicită',
        subject: 'Obiect și durată', purposes: 'Scopuri', categories: 'Categorii de date',
        retention: 'Durata de stocare (luni)', obligations: 'Obligațiile împuternicitului (art. 28 alin. 3)',
        transfers: 'Transferuri internaționale',
        obl: [
          'prelucrează datele numai pe baza instrucțiunilor documentate ale operatorului;',
          'asigură confidențialitatea persoanelor autorizate să prelucreze datele;',
          'ia toate măsurile de securitate cerute de art. 32;',
          'respectă condițiile pentru subîmputerniciți (art. 28 alin. 2 și 4);',
          'asistă operatorul pentru exercitarea drepturilor persoanelor vizate;',
          'asistă la asigurarea conformității cu art. 32–36;',
          'șterge sau returnează datele la încetarea prestării serviciilor;',
          'pune la dispoziție toate informațiile necesare demonstrării conformității și permite audituri.',
        ],
      }
    : {
        title: 'Data Processing Agreement (GDPR Art. 28)',
        parties: 'Parties', controller: 'Controller', processor: 'Processor',
        subject: 'Subject-matter and duration', purposes: 'Purposes', categories: 'Data categories',
        retention: 'Retention (months)', obligations: 'Processor obligations (Art. 28(3))',
        transfers: 'International transfers',
        obl: [
          'processes personal data only on the controller’s documented instructions;',
          'ensures confidentiality of persons authorised to process the data;',
          'takes all security measures required by Art. 32;',
          'respects the conditions for engaging sub-processors (Art. 28(2) and (4));',
          'assists the controller in responding to data-subject requests;',
          'assists in ensuring compliance with Arts. 32–36;',
          'deletes or returns the data at the end of the service;',
          'makes available all information necessary to demonstrate compliance and allows audits.',
        ],
      };
  const scc = i.sccModule ? `<p><strong>${L.transfers}:</strong> SCC 2021/914 ${i.sccModule}.</p>` : '';
  return `<h1>${L.title}</h1>
<h2>${L.parties}</h2><p><strong>${L.controller}:</strong> ${i.controllerName}<br/><strong>${L.processor}:</strong> ${i.processorName}</p>
<h2>${L.subject}</h2>
<p><strong>${L.purposes}:</strong> ${(i.purposes ?? []).join(', ') || '—'}</p>
<p><strong>${L.categories}:</strong> ${(i.categories ?? []).join(', ') || '—'}</p>
<p><strong>${L.retention}:</strong> ${i.retentionMonths ?? '—'}</p>
<h2>${L.obligations}</h2><ol>${L.obl.map((o) => `<li>${o}</li>`).join('')}</ol>
${scc}`;
}
