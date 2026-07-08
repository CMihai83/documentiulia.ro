import { QuizItem } from './assessment.logic';

/**
 * EXP-6 — scenario→skill links (graded practice): which ESCO skills a sim-v2
 * scenario exercises. Keys MUST match SCENARIO_PRESETS in simv2.engine.ts.
 * URIs must exist in esco-seed.ts.
 */
export const SCENARIO_SKILL_LINKS: { scenarioKey: string; skillUri: string; weight: number }[] = [
  // services — a cash-flow/finance game
  { scenarioKey: 'services', skillUri: 'http://data.europa.eu/esco/skill/cash-flow-management', weight: 1 },
  { scenarioKey: 'services', skillUri: 'http://data.europa.eu/esco/skill/financial-management', weight: 0.8 },
  // retail — margin/cost discipline under demand swings
  { scenarioKey: 'retail', skillUri: 'http://data.europa.eu/esco/skill/cost-accounting', weight: 1 },
  { scenarioKey: 'retail', skillUri: 'http://data.europa.eu/esco/skill/cash-flow-management', weight: 0.7 },
  // manufacturing — capacity/planning
  { scenarioKey: 'manufacturing', skillUri: 'http://data.europa.eu/esco/skill/business-planning', weight: 1 },
  { scenarioKey: 'manufacturing', skillUri: 'http://data.europa.eu/esco/skill/cost-accounting', weight: 0.8 },
];

/** EXP-7 — seeded auto-graded quizzes (items carry answers; stripped when served). */
export const SEED_ASSESSMENTS: {
  skillUri: string;
  kind: 'auto_quiz' | 'work_sample' | 'capstone';
  title: string;
  passScorePct: number;
  items: QuizItem[];
}[] = [
  {
    skillUri: 'http://data.europa.eu/esco/skill/ro-vat-tva',
    kind: 'auto_quiz',
    title: 'TVA România — cote și reguli (Legea 141/2025)',
    passScorePct: 70,
    items: [
      { id: 'vat1', question: 'Cota standard de TVA în România din august 2025 este:', options: ['19%', '21%', '24%', '11%'], correct: 1 },
      { id: 'vat2', question: 'Cota redusă de TVA (alimente, medicamente) din august 2025 este:', options: ['5%', '9%', '11%', '19%'], correct: 2 },
      { id: 'vat3', question: 'Taxarea inversă se aplică de regulă pentru:', options: ['Orice vânzare B2C', 'Tranzacții intracomunitare B2B', 'Salarii', 'Dividende'], correct: 1 },
      { id: 'vat4', question: 'Declarația SAF-T D406 se depune:', options: ['Anual', 'Lunar', 'La 5 ani', 'Doar la control'], correct: 1 },
      { id: 'vat5', question: 'e-Factura B2B se transmite prin:', options: ['E-mail', 'SPV/ANAF', 'Poștă', 'WhatsApp'], correct: 1 },
    ],
  },
  {
    skillUri: 'http://data.europa.eu/esco/skill/cash-flow-management',
    kind: 'auto_quiz',
    title: 'Gestiunea fluxului de numerar — fundamentale',
    passScorePct: 70,
    items: [
      { id: 'cf1', question: 'Un ciclu de conversie a numerarului mai SCURT înseamnă:', options: ['Numerar blocat mai mult', 'Numerar recuperat mai repede', 'Profit mai mic', 'TVA mai mare'], correct: 1 },
      { id: 'cf2', question: 'Care crește imediat lichiditatea?', options: ['Prelungirea termenelor de încasare', 'Factoring pe creanțe', 'Stocuri mai mari', 'Plata anticipată a furnizorilor'], correct: 1 },
      { id: 'cf3', question: 'Runway de numerar = ', options: ['Venit / cheltuieli', 'Numerar disponibil / burn lunar', 'Active / pasive', 'Profit / TVA'], correct: 1 },
      { id: 'cf4', question: 'Un buffer sănătos de numerar acoperă de regulă:', options: ['O zi de costuri', '3+ luni de costuri', '10 ani', 'Nimic'], correct: 1 },
    ],
  },
  {
    skillUri: 'http://data.europa.eu/esco/skill/business-planning',
    kind: 'work_sample',
    title: 'Plan de afaceri — lucrare practică (evaluare colegială)',
    passScorePct: 70,
    items: [],
  },
];
