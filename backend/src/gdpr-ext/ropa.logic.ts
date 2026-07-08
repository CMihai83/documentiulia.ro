/**
 * GE-ROPA-MVP (S-61) — pure RoPA logic: module-usage → seed proposals,
 * industry templates, Art-30 completeness, RO retention defaults.
 *
 * Retention defaults follow Romanian law (mirrors GDPR-A semantics in
 * src/gdpr/gdpr.service.ts): accounting/billing records 10 years (Legea
 * contabilității 82/1991), payroll states 50 years, generic customer data 3
 * years, marketing consent 2 years. Defaults are editable — informational,
 * not legal advice.
 */

export type RopaRole = 'controller' | 'processor';

export interface RopaEntryLike {
  role: RopaRole;
  processName: string;
  purposes: string[];
  legalBasis?: string | null;
  categories: string[];
  specialCategories?: string[];
  recipients: string[];
  transfers?: string[];
  retentionMonths?: number | null;
  securityMeasures: string[];
  status?: string;
}

/** Signals about what data the org actually holds (probed by the service). */
export interface OrgModuleUsage {
  invoices: number;
  employees: number;
  partners: number;
  documents: number;
}

export const RETENTION_DEFAULTS_MONTHS = {
  accountingBilling: 120, // 10y — Legea 82/1991 accounting records
  payroll: 600, // 50y — state de salarii
  customerGeneric: 36,
  marketingConsent: 24,
  documentsOcr: 60, // 5y — supporting documents
} as const;

/** Law 190/2018 Art 4 — CNP processing needs explicit safeguards. */
export const CNP_CATEGORY = 'CNP (cod numeric personal)';

const BASE_SECURITY = ['Criptare AES-256 în repaus', 'TLS 1.3 în tranzit', 'Control de acces pe roluri (RBAC)', 'Jurnal de audit imuabil'];

/** Propose RoPA entries from what the org's ERP actually contains. */
export function proposeFromUsage(usage: OrgModuleUsage): RopaEntryLike[] {
  const out: RopaEntryLike[] = [];
  if (usage.invoices > 0 || usage.partners > 0) {
    out.push({
      role: 'controller',
      processName: 'Facturare și evidență clienți',
      purposes: ['Emiterea și evidența facturilor', 'Conformitate fiscală (e-Factura/SAF-T)'],
      legalBasis: 'Art. 6(1)(c) — obligație legală (Cod fiscal)',
      categories: ['Date de identificare', 'Date de contact', 'Date bancare', 'CUI/CIF'],
      recipients: ['ANAF (e-Factura/SPV)', 'Contabil / expert contabil'],
      transfers: [],
      retentionMonths: RETENTION_DEFAULTS_MONTHS.accountingBilling,
      securityMeasures: BASE_SECURITY,
    });
  }
  if (usage.employees > 0) {
    out.push({
      role: 'controller',
      processName: 'Resurse umane și salarizare',
      purposes: ['Executarea contractelor de muncă', 'Salarizare și declarații sociale'],
      legalBasis: 'Art. 6(1)(b) — contract; Art. 6(1)(c) — obligație legală',
      categories: ['Date de identificare', 'Date de contact', 'Date salariale'],
      specialCategories: [CNP_CATEGORY],
      recipients: ['ANAF', 'REVISAL/ITM', 'Casa de pensii/sănătate'],
      transfers: [],
      retentionMonths: RETENTION_DEFAULTS_MONTHS.payroll,
      securityMeasures: BASE_SECURITY,
    });
  }
  if (usage.documents > 0) {
    out.push({
      role: 'controller',
      processName: 'Procesare documente (OCR)',
      purposes: ['Digitalizarea și extragerea datelor din documente'],
      legalBasis: 'Art. 6(1)(f) — interes legitim',
      categories: ['Conținutul documentelor încărcate'],
      recipients: [],
      transfers: [],
      retentionMonths: RETENTION_DEFAULTS_MONTHS.documentsOcr,
      securityMeasures: BASE_SECURITY,
    });
  }
  return out;
}

export type IndustryTemplate = 'accounting-practice' | 'ecommerce' | 'services';

export function templateEntries(template: IndustryTemplate): RopaEntryLike[] {
  switch (template) {
    case 'accounting-practice':
      return [
        {
          role: 'processor',
          processName: 'Prelucrare contabilă pentru clienți (împuternicit)',
          purposes: ['Ținerea contabilității clienților', 'Declarații fiscale în numele clienților'],
          legalBasis: 'Art. 28 — contract de prelucrare (DPA) cu operatorul-client',
          categories: ['Date facturare clienți finali', 'Date angajați ai clienților'],
          specialCategories: [CNP_CATEGORY],
          recipients: ['ANAF (în numele clientului)'],
          transfers: [],
          retentionMonths: RETENTION_DEFAULTS_MONTHS.accountingBilling,
          securityMeasures: BASE_SECURITY,
        },
        ...proposeFromUsage({ invoices: 1, employees: 1, partners: 1, documents: 0 }),
      ];
    case 'ecommerce':
      return [
        {
          role: 'controller',
          processName: 'Comenzi și livrare',
          purposes: ['Procesarea comenzilor', 'Livrare și retururi'],
          legalBasis: 'Art. 6(1)(b) — contract',
          categories: ['Date de identificare', 'Adresă livrare', 'Istoric comenzi'],
          recipients: ['Curieri', 'Procesator plăți'],
          transfers: [],
          retentionMonths: RETENTION_DEFAULTS_MONTHS.accountingBilling,
          securityMeasures: BASE_SECURITY,
        },
        {
          role: 'controller',
          processName: 'Marketing direct (newsletter)',
          purposes: ['Comunicări comerciale pe bază de consimțământ'],
          legalBasis: 'Art. 6(1)(a) — consimțământ',
          categories: ['Email', 'Preferințe'],
          recipients: ['Platformă email marketing'],
          transfers: [],
          retentionMonths: RETENTION_DEFAULTS_MONTHS.marketingConsent,
          securityMeasures: BASE_SECURITY,
        },
      ];
    case 'services':
      return [
        {
          role: 'controller',
          processName: 'Evidență clienți și contracte',
          purposes: ['Executarea contractelor de servicii'],
          legalBasis: 'Art. 6(1)(b) — contract',
          categories: ['Date de identificare', 'Date de contact', 'Date contractuale'],
          recipients: ['Contabil'],
          transfers: [],
          retentionMonths: RETENTION_DEFAULTS_MONTHS.customerGeneric,
          securityMeasures: BASE_SECURITY,
        },
      ];
  }
}

/** Art 30(1) required facets for a controller entry (adapted for processors). */
const ART30_FIELDS: Array<{ key: keyof RopaEntryLike; label: string }> = [
  { key: 'processName', label: 'Denumirea procesului' },
  { key: 'purposes', label: 'Scopurile prelucrării' },
  { key: 'categories', label: 'Categoriile de date' },
  { key: 'recipients', label: 'Destinatarii' },
  { key: 'retentionMonths', label: 'Termenul de păstrare' },
  { key: 'securityMeasures', label: 'Măsurile de securitate (Art 32)' },
];

export interface CompletenessResult {
  pct: number;
  missing: string[];
  warnings: string[];
}

export function completeness(entry: RopaEntryLike): CompletenessResult {
  const missing: string[] = [];
  for (const f of ART30_FIELDS) {
    const v = entry[f.key];
    const empty = v == null || (Array.isArray(v) && v.length === 0) || (typeof v === 'string' && v.trim() === '');
    if (empty) missing.push(f.label);
  }
  const warnings: string[] = [];
  if ((entry.specialCategories ?? []).includes(CNP_CATEGORY)) {
    warnings.push('Conține CNP — Legea 190/2018 Art. 4: măsuri suplimentare (DPO/termen/instruire) recomandate.');
  }
  if (!entry.legalBasis) warnings.push('Temeiul legal (Art 6) nu este completat.');
  const pct = Math.round(((ART30_FIELDS.length - missing.length) / ART30_FIELDS.length) * 100);
  return { pct, missing, warnings };
}
