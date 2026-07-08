/**
 * S-57 EXP-11 — pure career-coaching ranking.
 *
 * From the user's readiness per occupation (S-55 gap analysis) and a seeded
 * RO market-demand table, rank "next moves" by readiness × demand: near-mastery
 * occupations in demand surface first (quick wins), fully mastered ones are
 * flagged rather than hidden.
 *
 * Salary figures are STATIC INDICATIVE ESTIMATES (see salarySource on every
 * entry) — live salary-data integration is a tracked follow-up, not a claim.
 */

export interface OccupationDemand {
  escoUri: string;
  demand: number; // 0..1 relative RO market demand
  salaryMinEur: number; // gross EUR/month
  salaryMaxEur: number;
  salarySource: string;
}

const INDICATIVE = 'indicative 2025-26 RO market estimate';

/** Seeded demand + indicative salary per S-55 seeded occupation. */
export const RO_OCCUPATION_DEMAND: OccupationDemand[] = [
  {
    escoUri: 'http://data.europa.eu/esco/occupation/accountant',
    demand: 0.85,
    salaryMinEur: 1200,
    salaryMaxEur: 2500,
    salarySource: INDICATIVE,
  },
  {
    escoUri: 'http://data.europa.eu/esco/occupation/financial-manager',
    demand: 0.7,
    salaryMinEur: 2500,
    salaryMaxEur: 4500,
    salarySource: INDICATIVE,
  },
  {
    escoUri: 'http://data.europa.eu/esco/occupation/entrepreneur',
    demand: 0.6,
    salaryMinEur: 1500,
    salaryMaxEur: 6000,
    salarySource: INDICATIVE,
  },
];

export interface CareerMoveEntry {
  escoUri: string;
  label: string;
  readiness: number; // 0..1 from gap.logic readiness()
}

export interface CareerMoveSuggestion {
  escoUri: string;
  label: string;
  readinessPct: number; // 0..100, 1dp
  demand: number;
  score: number; // readiness × demand, 3dp — the ranking key
  mastered: boolean; // readiness ≥ 0.95: already there, shown but flagged
  salary: { minEur: number; maxEur: number; source: string } | null;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

export function rankCareerMoves(
  entries: CareerMoveEntry[],
  demandTable: OccupationDemand[] = RO_OCCUPATION_DEMAND,
): CareerMoveSuggestion[] {
  const demandByUri = new Map(demandTable.map((d) => [d.escoUri, d]));
  return entries
    .map((e) => {
      const d = demandByUri.get(e.escoUri);
      const demand = d?.demand ?? 0.5; // unknown occupation: neutral demand
      return {
        escoUri: e.escoUri,
        label: e.label,
        readinessPct: r1(Math.max(0, Math.min(1, e.readiness)) * 100),
        demand,
        score: r3(Math.max(0, Math.min(1, e.readiness)) * demand),
        mastered: e.readiness >= 0.95,
        salary: d ? { minEur: d.salaryMinEur, maxEur: d.salaryMaxEur, source: d.salarySource } : null,
      };
    })
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
}
