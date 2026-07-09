/**
 * BC-210 — unit economics (pure, deterministic).
 *
 * Conventions (hand-validated in the spec):
 *  - contribution/unit  = price − variableCost
 *  - monthly contribution/customer = contribution × ordersPerMonth
 *  - CAC = monthly marketing spend / new customers per month
 *  - LTV (contribution-based) = monthlyContribution / churn, CAPPED at the
 *    60-month horizon (LTV_HORIZON). Zero churn → horizon LTV, flagged capped.
 *  - CAC payback months = CAC / monthlyContribution.
 */

const num = (v: any, d = 0): number => (Number.isFinite(Number(v)) ? Number(v) : d);
const round2 = (v: number): number => Math.round(v * 100) / 100;

export const LTV_HORIZON_MONTHS = 60;

export interface UnitEconomicsResult {
  contributionPerUnit: number;
  monthlyContribution: number;   // per customer
  cac: number | null;            // null when marketing/newCustomers absent
  ltv: number;
  ltvCapped: boolean;            // true when the 60-month horizon bound applied
  ltvToCac: number | null;
  cacPaybackMonths: number | null;
}

export function hasUnitEconomicsInputs(answers: Record<string, any>): boolean {
  return num(answers['ue.pricePerUnit']) > 0 && num(answers['ue.ordersPerMonth']) > 0;
}

export function computeUnitEconomics(answers: Record<string, any>): UnitEconomicsResult {
  const price = num(answers['ue.pricePerUnit']);
  const varCost = num(answers['ue.variableCostPerUnit']);
  const orders = num(answers['ue.ordersPerMonth']);
  const churn = Math.max(0, num(answers['ue.monthlyChurnPct'])) / 100;
  const marketing = num(answers['ue.marketingSpendMonthly']);
  const newCustomers = num(answers['ue.newCustomersMonthly']);

  const contributionPerUnit = price - varCost;
  const monthlyContribution = contributionPerUnit * orders;

  const cac = marketing > 0 && newCustomers > 0 ? round2(marketing / newCustomers) : null;

  // LTV: expected lifetime = 1/churn months, capped at the horizon; zero churn = horizon.
  const horizonLtv = monthlyContribution * LTV_HORIZON_MONTHS;
  let ltv: number;
  let ltvCapped = false;
  if (churn <= 0) {
    ltv = horizonLtv;
    ltvCapped = true;
  } else {
    const raw = monthlyContribution / churn;
    ltv = Math.min(raw, horizonLtv);
    ltvCapped = raw > horizonLtv;
  }

  const ltvToCac = cac && cac > 0 ? round2(ltv / cac) : null;
  const cacPaybackMonths = cac && monthlyContribution > 0 ? round2(cac / monthlyContribution) : null;

  return {
    contributionPerUnit: round2(contributionPerUnit),
    monthlyContribution: round2(monthlyContribution),
    cac,
    ltv: round2(ltv),
    ltvCapped,
    ltvToCac,
    cacPaybackMonths,
  };
}
