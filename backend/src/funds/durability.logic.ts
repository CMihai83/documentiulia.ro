/**
 * FND-9 — durability & implementation calendar (pure, no DB).
 * Durability horizon: 3 years for SMEs, 5 years for large & public bodies,
 * measured from the final-payment date. Reporting cadence + Ordin MFE 1284/2016
 * private-procurement (≥2 bidders) checklist. Each event gets a 30-day-prior alert.
 */

export type BeneficiaryType = 'sme' | 'large' | 'public';

export interface DurabilityEventSpec {
  kind: 'reporting' | 'procurement' | 'durability_end';
  dueDate: Date;
  description: string;
  descriptionRo: string;
  alertAt: Date; // 30 days before dueDate
}

const DAY = 86400000;

/** 3 yr SME, 5 yr large & public — from final payment. */
export function durabilityYearsFor(beneficiaryType: BeneficiaryType): number {
  return beneficiaryType === 'sme' ? 3 : 5;
}

function alert30(due: Date): Date {
  return new Date(due.getTime() - 30 * DAY);
}

function addYears(d: Date, y: number): Date {
  const n = new Date(d.getTime());
  n.setFullYear(n.getFullYear() + y);
  return n;
}

/**
 * Build the durability calendar from the final-payment date:
 *  - one annual durability report per durability year,
 *  - the durability-end milestone,
 *  - a one-off procurement-file compliance check (Ordin 1284/2016, ≥2 bidders).
 * Every event carries a 30-day-prior alert timestamp.
 */
export function buildDurabilityCalendar(finalPaymentDate: Date, beneficiaryType: BeneficiaryType): {
  durabilityYears: number;
  events: DurabilityEventSpec[];
} {
  const years = durabilityYearsFor(beneficiaryType);
  const events: DurabilityEventSpec[] = [];

  // Procurement compliance check — 30 days after final payment (retain the file).
  const proc = new Date(finalPaymentDate.getTime() + 30 * DAY);
  events.push({
    kind: 'procurement',
    dueDate: proc,
    description: 'Procurement file compliance (Ordin MFE 1284/2016: ≥2 bidders for private procurement).',
    descriptionRo: 'Conformitate dosar achiziții (Ordin MFE 1284/2016: minim 2 ofertanți pentru achiziții private).',
    alertAt: alert30(proc),
  });

  // Annual durability reports (rapoarte de durabilitate).
  for (let y = 1; y <= years; y++) {
    const due = addYears(finalPaymentDate, y);
    events.push({
      kind: 'reporting',
      dueDate: due,
      description: `Annual durability report (year ${y} of ${years}): maintain assets & indicators.`,
      descriptionRo: `Raport anual de durabilitate (anul ${y} din ${years}): menținere active și indicatori.`,
      alertAt: alert30(due),
    });
  }

  // Durability period end.
  const end = addYears(finalPaymentDate, years);
  events.push({
    kind: 'durability_end',
    dueDate: end,
    description: `End of the ${years}-year durability period.`,
    descriptionRo: `Sfârșitul perioadei de durabilitate de ${years} ani.`,
    alertAt: alert30(end),
  });

  events.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  return { durabilityYears: years, events };
}
