/**
 * DOC-W0-3 — Romanian salary math (pure, unit-tested to the leu).
 *
 * Model (Codul Fiscal, as amended by OG 16/2022 — the post-2023 regime):
 *   CAS  = 25% × gross            (pension)
 *   CASS = 10% × gross            (health)
 *   Deducerea personală de bază: granted while gross ≤ minWage + 2000 lei.
 *     The official annex is a linear-degressive table in 50-lei steps:
 *     base % (of the minimum wage) by dependents [0..4+] = [20, 25, 30, 35, 45],
 *     scaled by (1 − k/40) where k = ceil((gross − minWage)/50), k ∈ [0..40].
 *     The deduction is rounded UP to the leu (in the employee's favour).
 *   Impozit = 10% × (gross − CAS − CASS − deducere), rounded to the leu.
 *   Net    = gross − CAS − CASS − impozit.
 *
 * Reference example (committed AC): minWage 4050, gross 5000, 0 dependents →
 *   CAS 1250 · CASS 500 · deducere 426 · impozit 282 · net 2968.
 *
 * The minimum wage changes by government decision — it is a PARAMETER
 * (default below is the last verified value); the UI exposes it.
 */

export const DEFAULT_MIN_WAGE = 4050; // lei, verified for 2025; configurable

const BASE_PCT_BY_DEPENDENTS = [20, 25, 30, 35, 45]; // % of min wage at gross ≤ minWage

export interface SalaryBreakdown {
  gross: number;
  cas: number;
  cass: number;
  personalDeduction: number;
  taxable: number;
  incomeTax: number;
  net: number;
  minWage: number;
  dependents: number;
  employerCostNote: string;
}

export function personalDeduction(gross: number, dependents: number, minWage: number): number {
  if (gross > minWage + 2000) return 0;
  const basePct = BASE_PCT_BY_DEPENDENTS[Math.min(Math.max(dependents, 0), 4)];
  const k = gross <= minWage ? 0 : Math.min(40, Math.ceil((gross - minWage) / 50));
  const pct = basePct * (1 - k / 40);
  return Math.ceil((pct / 100) * minWage); // rounded up, in the employee's favour
}

export function salaryFromGross(
  gross: number,
  dependents = 0,
  minWage = DEFAULT_MIN_WAGE,
): SalaryBreakdown {
  const g = Math.round(gross);
  const cas = Math.round(g * 0.25);
  const cass = Math.round(g * 0.1);
  const deduction = personalDeduction(g, dependents, minWage);
  const taxable = Math.max(0, g - cas - cass - deduction);
  const incomeTax = Math.round(taxable * 0.1);
  const net = g - cas - cass - incomeTax;
  return {
    gross: g,
    cas,
    cass,
    personalDeduction: deduction,
    taxable,
    incomeTax,
    net,
    minWage,
    dependents,
    employerCostNote: 'CAM 2.25% se adaugă la costul angajatorului (nu afectează netul).',
  };
}

/** Net → gross by binary search (net is monotonic in gross), exact to the leu. */
export function salaryFromNet(
  targetNet: number,
  dependents = 0,
  minWage = DEFAULT_MIN_WAGE,
): SalaryBreakdown {
  const target = Math.round(targetNet);
  let lo = target; // net ≤ gross always
  let hi = Math.max(target * 2, target + 4000);
  while (salaryFromGross(hi, dependents, minWage).net < target) hi *= 2;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (salaryFromGross(mid, dependents, minWage).net >= target) hi = mid;
    else lo = mid + 1;
  }
  return salaryFromGross(lo, dependents, minWage);
}
