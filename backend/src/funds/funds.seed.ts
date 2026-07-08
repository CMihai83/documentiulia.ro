/**
 * FND-1 seed — real, currently-open 2025-2026 Romanian/EU programs (research/05 Part 1).
 * PNRR Digitalizare IMM is deliberately EXCLUDED (closed to new intake).
 */
export interface SeedProgram {
  name: string; authority: string; purpose: string; beneficiaryType: string;
  sizeEligibility: string[]; coFinancingPct?: number; legalBasis: string;
  gberArticle?: string; aidIntensityPct?: number; ceilingEur?: number;
  opensAt?: string; closesAt?: string; caenWhitelist: string[]; caenBlacklist: string[];
  regions: string[]; interventionField?: string; status: string; sourceUrl: string;
}

export const SEED_PROGRAMS: SeedProgram[] = [
  {
    name: 'Start-Up Nation România (ed. 2024/2025)',
    authority: 'Ministerul Economiei / MEAT',
    purpose: 'Sprijin pentru înființarea și dezvoltarea de întreprinderi noi.',
    beneficiaryType: 'New SMEs (<3 yr)',
    sizeEligibility: ['micro', 'small'],
    coFinancingPct: 0, legalBasis: 'de_minimis', ceilingEur: 50_000,
    opensAt: '2025-03-01', closesAt: '2026-12-31',
    caenWhitelist: [], caenBlacklist: ['9200', '6810', '6820', '6411', '6419'],
    regions: [], interventionField: 'business creation',
    status: 'open', sourceUrl: 'https://minimis.imm.gov.ro',
  },
  {
    name: 'Programe Regionale 2021-2027 — Competitivitate IMM',
    authority: 'ADR (8 agenții de dezvoltare regională)',
    purpose: 'Competitivitate, digitalizare, eficiență energetică pentru IMM.',
    beneficiaryType: 'SMEs, micro',
    sizeEligibility: ['micro', 'small', 'medium'],
    coFinancingPct: 10, legalBasis: 'de_minimis', ceilingEur: 200_000,
    opensAt: '2025-02-01', closesAt: '2026-09-30',
    caenWhitelist: [], caenBlacklist: ['0111', '0113', '0311', '1200', '9200', '6810'],
    regions: ['RO11', 'RO12', 'RO21', 'RO22', 'RO31', 'RO41', 'RO42'],
    interventionField: 'digitalization',
    status: 'open', sourceUrl: 'https://www.adrvest.ro/programe-regionale',
  },
  {
    name: 'POCIDIF 2021-2027 — Acțiunea 2.1 (R&D & inovare IMM)',
    authority: 'MIPE / Autoritatea de Management POCIDIF',
    purpose: 'Cercetare-dezvoltare, inovare, specializare inteligentă.',
    beneficiaryType: 'SMEs / mid-caps, R&D',
    sizeEligibility: ['micro', 'small', 'medium'],
    legalBasis: 'gber_25', gberArticle: '25', aidIntensityPct: 60, ceilingEur: 3_000_000,
    opensAt: '2026-05-29', closesAt: '2026-08-31',
    caenWhitelist: [], caenBlacklist: ['0111', '9200', '6810', '6411'],
    regions: [], interventionField: 'research and innovation',
    status: 'open', sourceUrl: 'https://mfe.gov.ro/pocidif',
  },
  {
    name: 'EIC Accelerator (Horizon Europe)',
    authority: 'European Innovation Council',
    purpose: 'Breakthrough innovation scale-up (grant + equity).',
    beneficiaryType: 'Startups/SMEs, small mid-caps ≤499',
    sizeEligibility: ['micro', 'small', 'medium'],
    legalBasis: 'notified', aidIntensityPct: 70, ceilingEur: 2_500_000,
    opensAt: '2026-01-07', closesAt: '2026-11-04',
    caenWhitelist: [], caenBlacklist: ['2540', '3040', '9200'],
    regions: [], interventionField: 'innovation',
    status: 'open', sourceUrl: 'https://eic.ec.europa.eu/eic-funding-opportunities/eic-accelerator_en',
  },
  {
    name: 'Digital Europe — EDIH (European Digital Innovation Hubs)',
    authority: 'European Commission / DG CONNECT',
    purpose: 'Digital transformation services for SMEs via local hubs.',
    beneficiaryType: 'SMEs & public bodies',
    sizeEligibility: ['micro', 'small', 'medium'],
    coFinancingPct: 50, legalBasis: 'gber_28', gberArticle: '28', aidIntensityPct: 50, ceilingEur: 220_000,
    opensAt: '2025-01-01', closesAt: '2026-12-31',
    caenWhitelist: ['6201', '6202', '6209', '6311', '4791'], caenBlacklist: [],
    regions: [], interventionField: 'digitalization',
    status: 'open', sourceUrl: 'https://digital-strategy.ec.europa.eu/en/activities/edihs',
  },
  {
    name: 'Femeia Antreprenor 2025',
    authority: 'Ministerul Economiei / MEAT',
    purpose: 'Sprijin pentru IMM conduse de femei.',
    beneficiaryType: 'Women-led SMEs (≥50% female capital)',
    sizeEligibility: ['micro', 'small', 'medium'],
    coFinancingPct: 0, legalBasis: 'de_minimis', ceilingEur: 40_000,
    opensAt: '2025-06-01', closesAt: '2026-06-30',
    caenWhitelist: [], caenBlacklist: ['9200', '6810', '6411'],
    regions: [], interventionField: 'business creation',
    status: 'upcoming', sourceUrl: 'https://www.imm.gov.ro/femeia-antreprenor',
  },
];
