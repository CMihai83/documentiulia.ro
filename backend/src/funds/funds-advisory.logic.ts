/**
 * S-54 FND Funds Advisory — pure logic (no DB, unit-tested).
 * FND-6 projection assembly (feeds bc.model.ts), FND-7 co-fin/VAT eligibility,
 * FND-8 instrument ranking. Durability calendar lives in durability.logic.ts.
 */
import { appraise, AppraisalResult } from '../business-case/bc.model';

const num = (v: any, d = 0): number => (Number.isFinite(Number(v)) ? Number(v) : d);

// ---------------- FND-6: business-plan projection ----------------

export interface ProjectionInput {
  initialInvestmentEur: number;
  implementationYears: number;   // years of build-out before benefits stabilise
  durabilityYears: number;       // 3 (SME) or 5 (large/public) post-completion
  /** annual {benefit, opex} rows over implementation + durability horizon */
  cashflows: Array<{ benefit: number; opex: number }>;
  discountRatePct: number;       // whole-number percent (10 == 10%)
}

/** Map a funding projection to the BC-engine answer set, then appraise() it. */
export function buildProjectionAnswers(p: ProjectionInput): Record<string, any> {
  const horizon = Math.max(0, Math.round(p.implementationYears + p.durabilityYears));
  const rows = Array.from({ length: horizon }, (_, i) => ({
    benefit: num(p.cashflows[i]?.benefit),
    opex: num(p.cashflows[i]?.opex),
  }));
  return {
    'strategic.initialInvestment': num(p.initialInvestmentEur),
    'strategic.horizonYears': horizon,
    'economic.cashflows': rows,
    'wacc.mode': 'hurdle',
    'wacc.hurdle': num(p.discountRatePct),
  };
}

export function appraiseProjection(p: ProjectionInput): AppraisalResult {
  return appraise(buildProjectionAnswers(p));
}

// ---------------- FND-7: co-financing / VAT eligibility ----------------

export interface CoFinInput {
  totalProjectCostEur: number;    // incl. VAT where borne
  ineligibleCostEur?: number;     // costs excluded by the guide (pre-VAT)
  vatRatePct?: number;            // whole-number percent applied to eligible net (default 21)
  programCoFinPct: number;        // grant share of eligible cost (e.g. 90)
  /** VAT-registered payer => deductible VAT is INELIGIBLE even if not reclaimed. */
  vatRegistered: boolean;
}

export interface CoFinResult {
  eligibleBaseEur: number;        // eligible costs net of VAT
  vatEur: number;                 // VAT amount on the eligible base
  vatEligible: boolean;           // false when the beneficiary is VAT-registered
  eligibleTotalEur: number;       // eligible base + (VAT if eligible)
  ineligibleEur: number;          // guide-ineligible + (VAT if VAT ineligible)
  grantEur: number;               // eligibleTotal × min(coFin, 90) %
  beneficiaryContributionEur: number; // total − grant
  notes: string[];
}

/**
 * COMPLIANCE (research 05 Part 3 §5): VAT is eligible ONLY if genuinely,
 * definitively borne and non-recoverable. A VAT-registered payer's VAT is
 * INELIGIBLE even if not actually reclaimed. A non-VAT-payer's borne VAT is eligible.
 */
export function coFinance(input: CoFinInput): CoFinResult {
  const notes: string[] = [];
  const total = num(input.totalProjectCostEur);
  const guideIneligible = Math.max(0, num(input.ineligibleCostEur));
  const vatRate = num(input.vatRatePct, 21) / 100;

  // Derive the eligible NET base and the VAT sitting on it.
  // total ≈ (net eligible + guideIneligible) grossed by VAT on the eligible part.
  const eligibleGross = Math.max(0, total - guideIneligible);
  const eligibleBase = eligibleGross / (1 + vatRate);
  const vat = eligibleGross - eligibleBase;

  const vatEligible = !input.vatRegistered;
  if (input.vatRegistered) {
    notes.push('VAT-registered beneficiary: deductible VAT is INELIGIBLE even if not reclaimed.');
  } else {
    notes.push('Non-VAT-payer: genuinely-borne VAT is eligible.');
  }

  const eligibleTotal = eligibleBase + (vatEligible ? vat : 0);
  const ineligible = guideIneligible + (vatEligible ? 0 : vat);

  const coFinPct = Math.min(num(input.programCoFinPct), 90); // grant cap ~90%
  if (num(input.programCoFinPct) > 90) notes.push('Co-financing capped at 90% (grant ceiling).');
  const grant = eligibleTotal * (coFinPct / 100);
  const contribution = total - grant;

  return {
    eligibleBaseEur: round2(eligibleBase),
    vatEur: round2(vat),
    vatEligible,
    eligibleTotalEur: round2(eligibleTotal),
    ineligibleEur: round2(ineligible),
    grantEur: round2(grant),
    beneficiaryContributionEur: round2(contribution),
    notes,
  };
}

// ---------------- FND-8: financing instrument ranking ----------------

export interface InstrumentLike {
  id: string;
  name: string;
  type: string;
  maxCoveragePct?: number | null;
  minAmountEur?: number | null;
  maxAmountEur?: number | null;
  forReimbursementGap: boolean;
  eligibilitySnippet: string;
}

export interface RankedInstrument {
  instrument: InstrumentLike;
  score: number;
  coversEur: number;
  reason: string;
}

/**
 * Rank instruments against a reimbursement cash-flow gap (grants are paid in
 * arrears → the beneficiary needs bridge finance up to the grant amount).
 */
export function rankInstruments(instruments: InstrumentLike[], reimbursementGapEur: number): RankedInstrument[] {
  const gap = Math.max(0, num(reimbursementGapEur));
  return instruments
    .map((inst) => {
      const cap = inst.maxCoveragePct != null ? gap * (inst.maxCoveragePct / 100) : gap;
      const withinRange =
        (inst.minAmountEur == null || gap >= inst.minAmountEur) &&
        (inst.maxAmountEur == null || gap <= inst.maxAmountEur);
      const covers = Math.min(gap, cap, inst.maxAmountEur ?? cap);
      let score = 0;
      if (inst.forReimbursementGap) score += 50;        // purpose-fit for the arrears gap
      score += Math.round((covers / (gap || 1)) * 40);  // how much of the gap it covers
      if (withinRange) score += 10;
      const reason = inst.forReimbursementGap
        ? `Bridges the reimbursement gap; covers ≈ €${Math.round(covers).toLocaleString()}.`
        : `Covers ≈ €${Math.round(covers).toLocaleString()} of the €${Math.round(gap).toLocaleString()} need.`;
      return { instrument: inst, score, coversEur: round2(covers), reason };
    })
    .sort((a, b) => b.score - a.score);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
