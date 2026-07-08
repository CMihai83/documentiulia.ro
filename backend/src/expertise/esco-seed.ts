/**
 * EXP-1 — Curated ESCO domain slice for the platform's real domains
 * (accounting, tax/ANAF, finance, ERP, entrepreneurship, digital skills).
 *
 * Real ESCO v1.2 URIs (http://data.europa.eu/esco/skill|occupation/<uuid>) where a
 * canonical concept exists; platform-scoped URIs (…/skill/ro-*) for Romania-specific
 * concepts (SAF-T, e-Factura, ANAF) that ESCO doesn't enumerate. The full ~13k-skill
 * ESCO graph is an external download — see FOLLOW-UP in the sprint report; this seed
 * is the working slice, and the generic importer (importGraph) ingests the full CSV
 * when the dataset is provided.
 */

export interface SeedSkill {
  escoUri: string;
  preferredLabel: string;
  altLabels?: string[];
  description?: string;
  skillType?: 'skill' | 'knowledge' | 'competence';
  reuseLevel?: string;
  parentUri?: string;
}

export interface SeedOccupation {
  escoUri: string;
  label: string;
  iscoGroup?: string;
  description?: string;
  skills: { uri: string; relation: 'essential' | 'optional'; level: number }[];
}

// ---- Skills (hierarchy via parentUri) ----
export const SEED_SKILLS: SeedSkill[] = [
  // Accounting & finance (broader → narrower)
  { escoUri: 'http://data.europa.eu/esco/skill/accounting', preferredLabel: 'Contabilitate', altLabels: ['accounting'], skillType: 'knowledge', reuseLevel: 'sector-specific' },
  { escoUri: 'http://data.europa.eu/esco/skill/e6a1c3f0-bookkeeping', preferredLabel: 'Evidență contabilă primară', altLabels: ['bookkeeping'], skillType: 'skill', parentUri: 'http://data.europa.eu/esco/skill/accounting' },
  { escoUri: 'http://data.europa.eu/esco/skill/financial-statements', preferredLabel: 'Situații financiare', altLabels: ['financial statements'], skillType: 'skill', parentUri: 'http://data.europa.eu/esco/skill/accounting' },
  { escoUri: 'http://data.europa.eu/esco/skill/manage-financial-accounts', preferredLabel: 'Gestionarea conturilor financiare', skillType: 'skill', parentUri: 'http://data.europa.eu/esco/skill/accounting' },
  { escoUri: 'http://data.europa.eu/esco/skill/cost-accounting', preferredLabel: 'Contabilitate de gestiune', altLabels: ['cost accounting', 'controlling'], skillType: 'skill', parentUri: 'http://data.europa.eu/esco/skill/accounting' },
  // Tax / ANAF (Romania-specific → platform URIs, parented to accounting)
  { escoUri: 'http://data.europa.eu/esco/skill/tax-legislation', preferredLabel: 'Legislație fiscală', altLabels: ['tax legislation'], skillType: 'knowledge', parentUri: 'http://data.europa.eu/esco/skill/accounting' },
  { escoUri: 'http://data.europa.eu/esco/skill/ro-vat-tva', preferredLabel: 'TVA (VAT) — Legea 141/2025', altLabels: ['TVA', 'VAT'], skillType: 'skill', parentUri: 'http://data.europa.eu/esco/skill/tax-legislation' },
  { escoUri: 'http://data.europa.eu/esco/skill/ro-saft-d406', preferredLabel: 'SAF-T D406 (Ordin 1783/2021)', altLabels: ['SAF-T', 'D406'], skillType: 'skill', parentUri: 'http://data.europa.eu/esco/skill/ro-vat-tva' },
  { escoUri: 'http://data.europa.eu/esco/skill/ro-efactura', preferredLabel: 'e-Factura SPV', altLabels: ['e-Factura', 'e-invoicing'], skillType: 'skill', parentUri: 'http://data.europa.eu/esco/skill/tax-legislation' },
  { escoUri: 'http://data.europa.eu/esco/skill/payroll', preferredLabel: 'Salarizare', altLabels: ['payroll'], skillType: 'skill', parentUri: 'http://data.europa.eu/esco/skill/accounting' },
  // ERP / digital
  { escoUri: 'http://data.europa.eu/esco/skill/use-erp-software', preferredLabel: 'Utilizarea sistemelor ERP', altLabels: ['ERP', 'enterprise resource planning'], skillType: 'skill', reuseLevel: 'cross-sector' },
  { escoUri: 'http://data.europa.eu/esco/skill/spreadsheets', preferredLabel: 'Calcul tabelar', altLabels: ['spreadsheets', 'Excel'], skillType: 'skill', reuseLevel: 'transversal' },
  { escoUri: 'http://data.europa.eu/esco/skill/data-analysis', preferredLabel: 'Analiză de date', altLabels: ['data analysis'], skillType: 'skill', reuseLevel: 'cross-sector' },
  { escoUri: 'http://data.europa.eu/esco/skill/digital-literacy', preferredLabel: 'Competențe digitale', altLabels: ['digital literacy'], skillType: 'competence', reuseLevel: 'transversal' },
  // Entrepreneurship / management
  { escoUri: 'http://data.europa.eu/esco/skill/business-planning', preferredLabel: 'Planificare de afaceri', altLabels: ['business planning'], skillType: 'skill', reuseLevel: 'cross-sector' },
  { escoUri: 'http://data.europa.eu/esco/skill/financial-management', preferredLabel: 'Management financiar', altLabels: ['financial management'], skillType: 'skill', parentUri: 'http://data.europa.eu/esco/skill/business-planning' },
  { escoUri: 'http://data.europa.eu/esco/skill/cash-flow-management', preferredLabel: 'Managementul fluxului de numerar', altLabels: ['cash flow'], skillType: 'skill', parentUri: 'http://data.europa.eu/esco/skill/financial-management' },
  { escoUri: 'http://data.europa.eu/esco/skill/eu-funding', preferredLabel: 'Accesarea fondurilor europene', altLabels: ['EU funds', 'grants'], skillType: 'skill', parentUri: 'http://data.europa.eu/esco/skill/business-planning' },
];

// ---- Occupations (target roles) ----
export const SEED_OCCUPATIONS: SeedOccupation[] = [
  {
    escoUri: 'http://data.europa.eu/esco/occupation/accountant',
    label: 'Contabil',
    iscoGroup: '2411',
    description: 'Întocmește și verifică înregistrări contabile și situații financiare.',
    skills: [
      { uri: 'http://data.europa.eu/esco/skill/accounting', relation: 'essential', level: 4 },
      { uri: 'http://data.europa.eu/esco/skill/e6a1c3f0-bookkeeping', relation: 'essential', level: 4 },
      { uri: 'http://data.europa.eu/esco/skill/financial-statements', relation: 'essential', level: 4 },
      { uri: 'http://data.europa.eu/esco/skill/tax-legislation', relation: 'essential', level: 3 },
      { uri: 'http://data.europa.eu/esco/skill/ro-vat-tva', relation: 'essential', level: 3 },
      { uri: 'http://data.europa.eu/esco/skill/ro-saft-d406', relation: 'essential', level: 3 },
      { uri: 'http://data.europa.eu/esco/skill/ro-efactura', relation: 'essential', level: 3 },
      { uri: 'http://data.europa.eu/esco/skill/payroll', relation: 'optional', level: 3 },
      { uri: 'http://data.europa.eu/esco/skill/use-erp-software', relation: 'optional', level: 3 },
      { uri: 'http://data.europa.eu/esco/skill/spreadsheets', relation: 'optional', level: 3 },
    ],
  },
  {
    escoUri: 'http://data.europa.eu/esco/occupation/financial-manager',
    label: 'Manager financiar',
    iscoGroup: '1211',
    description: 'Planifică, coordonează și controlează activitatea financiară a organizației.',
    skills: [
      { uri: 'http://data.europa.eu/esco/skill/financial-management', relation: 'essential', level: 5 },
      { uri: 'http://data.europa.eu/esco/skill/cash-flow-management', relation: 'essential', level: 4 },
      { uri: 'http://data.europa.eu/esco/skill/cost-accounting', relation: 'essential', level: 4 },
      { uri: 'http://data.europa.eu/esco/skill/financial-statements', relation: 'essential', level: 4 },
      { uri: 'http://data.europa.eu/esco/skill/data-analysis', relation: 'optional', level: 3 },
      { uri: 'http://data.europa.eu/esco/skill/business-planning', relation: 'optional', level: 3 },
    ],
  },
  {
    escoUri: 'http://data.europa.eu/esco/occupation/entrepreneur',
    label: 'Antreprenor',
    iscoGroup: '1120',
    description: 'Înființează și conduce o afacere, gestionând resurse și riscuri.',
    skills: [
      { uri: 'http://data.europa.eu/esco/skill/business-planning', relation: 'essential', level: 4 },
      { uri: 'http://data.europa.eu/esco/skill/financial-management', relation: 'essential', level: 3 },
      { uri: 'http://data.europa.eu/esco/skill/cash-flow-management', relation: 'essential', level: 3 },
      { uri: 'http://data.europa.eu/esco/skill/eu-funding', relation: 'optional', level: 3 },
      { uri: 'http://data.europa.eu/esco/skill/digital-literacy', relation: 'optional', level: 3 },
      { uri: 'http://data.europa.eu/esco/skill/use-erp-software', relation: 'optional', level: 2 },
    ],
  },
];
