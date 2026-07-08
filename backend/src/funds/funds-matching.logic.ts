/**
 * FND-2 — the pure 7-filter grant-matching engine. No DB, no NestJS: unit-tested in
 * isolation like matching.logic.ts (F-3). Every filter returns a pass/fail + a
 * plain-language reason so the UI can explain each verdict.
 *
 * Filters (research/05 Part 4): CAEN · NUTS region · enterprise size (consolidated) ·
 * project type · age/firm-in-difficulty · de minimis headroom · legal basis.
 */
import {
  caenAntecedents,
  isExcludedSector,
  countyToNuts2,
  REGION_MAX_INTENSITY_LARGE,
  classifySize,
  smeBonusPct,
  EnterpriseSize,
} from './funds-reference';

export interface PartnerLink {
  relation: 'partner' | 'linked';
  sharePct: number; // % held/owned
  headcount?: number;
  turnoverEur?: number;
  balanceSheetEur?: number;
}

export interface FundingProfileLike {
  county?: string | null;
  caenPrimary?: string | null;
  caenSecondary?: string[];
  foundedDate?: Date | string | null;
  headcount?: number | null;
  turnoverEur?: number | null;
  balanceSheetEur?: number | null;
  subscribedCapitalEur?: number | null;
  accumulatedLossEur?: number | null;
  equityEur?: number | null;
  partnerLinks?: PartnerLink[];
  anafDebt?: boolean;
  insolvent?: boolean;
}

export interface FundingProgramLike {
  id: string;
  name: string;
  legalBasis: string; // de_minimis | gber_<article> | notified
  sizeEligibility: string[]; // micro|small|medium|large
  coFinancingPct?: number | null;
  aidIntensityPct?: number | null;
  ceilingEur?: number | null;
  caenWhitelist: string[];
  caenBlacklist: string[];
  regions: string[]; // NUTS-2; empty => national
  interventionField?: string | null;
  status: string;
  closesAt?: Date | string | null;
}

export interface MatchRequest {
  requestedCostEur?: number; // eligible project cost
  projectType?: string; // maps to interventionField
  deMinimisHeadroomEur?: number; // injected from FND-3 ledger (default: full 300k)
}

export interface FilterResult {
  filter: string;
  pass: boolean;
  reason: string;
}

export interface MatchResult {
  programId: string;
  programName: string;
  eligible: boolean;
  perFilter: FilterResult[];
  size: EnterpriseSize;
  nuts2?: string;
  effectiveIntensityPct?: number; // GBER: regional ceiling + SME bonus, capped
  coFinPct?: number; // beneficiary contribution %
  estMaxGrantEur?: number;
  deMinimisImpactEur?: number;
}

export const DE_MINIMIS_CEILING_EUR = 300_000;

// ---- enterprise-size consolidation (Rec. 2003/361): never evaluate in isolation ----
export function consolidate(profile: FundingProfileLike): {
  headcount: number;
  turnoverEur: number;
  balanceSheetEur: number;
} {
  let headcount = profile.headcount ?? 0;
  let turnoverEur = profile.turnoverEur ?? 0;
  let balanceSheetEur = profile.balanceSheetEur ?? 0;
  for (const l of profile.partnerLinks ?? []) {
    // linked (>50%): add 100%. partner (25–50%): add pro-rata by share.
    const factor = l.relation === 'linked' ? 1 : Math.min(1, Math.max(0, (l.sharePct ?? 0) / 100));
    headcount += Math.round((l.headcount ?? 0) * factor);
    turnoverEur += (l.turnoverEur ?? 0) * factor;
    balanceSheetEur += (l.balanceSheetEur ?? 0) * factor;
  }
  return { headcount, turnoverEur, balanceSheetEur };
}

function yearsSince(d?: Date | string | null): number | null {
  if (!d) return null;
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return null;
  // fixed reference (research horizon) — pure, no Date.now dependency for determinism
  const ref = new Date('2026-07-01').getTime();
  return (ref - t) / (365.25 * 24 * 3600 * 1000);
}

/** GBER Art.2(18): firm in difficulty if accumulated losses > half subscribed capital. */
export function isFirmInDifficulty(profile: FundingProfileLike): boolean {
  const cap = profile.subscribedCapitalEur ?? 0;
  const loss = profile.accumulatedLossEur ?? 0;
  const equity = profile.equityEur;
  if (equity !== undefined && equity !== null && equity < 0) return true;
  if (cap > 0 && loss > cap / 2) return true;
  return false;
}

// ===== the seven filters =====

function filterCaen(profile: FundingProfileLike, program: FundingProgramLike): FilterResult {
  const codes = [profile.caenPrimary, ...(profile.caenSecondary ?? [])].filter(Boolean) as string[];
  if (codes.length === 0) return { filter: 'caen', pass: false, reason: 'No CAEN code on the profile.' };
  const tested = new Set<string>();
  for (const c of codes) for (const a of caenAntecedents(c)) tested.add(a);
  const testedArr = [...tested];
  // blacklist (explicit or global exclusion) fails first
  const black = program.caenBlacklist ?? [];
  const hitBlack = testedArr.find((c) => black.includes(c));
  if (hitBlack) return { filter: 'caen', pass: false, reason: `CAEN ${hitBlack} is on this program's blacklist.` };
  if ((program.caenWhitelist ?? []).length > 0) {
    const hitWhite = testedArr.find((c) => program.caenWhitelist.includes(c));
    if (!hitWhite) return { filter: 'caen', pass: false, reason: `None of CAEN [${codes.join(', ')}] is on the program whitelist.` };
    return { filter: 'caen', pass: true, reason: `CAEN ${hitWhite} is eligible (incl. Rev.2 antecedents).` };
  }
  // no whitelist => all allowed except globally-excluded sectors
  const primaryExcluded = testedArr.find((c) => isExcludedSector(c));
  if (primaryExcluded) return { filter: 'caen', pass: false, reason: `CAEN ${primaryExcluded} is in a state-aid-excluded sector.` };
  return { filter: 'caen', pass: true, reason: 'CAEN not restricted by this program.' };
}

function filterRegion(nuts2: string | undefined, program: FundingProgramLike): FilterResult {
  if ((program.regions ?? []).length === 0) return { filter: 'region', pass: true, reason: 'National program (all regions).' };
  if (!nuts2) return { filter: 'region', pass: false, reason: 'Company county does not map to a NUTS-2 region.' };
  if (program.regions.includes(nuts2)) return { filter: 'region', pass: true, reason: `Region ${nuts2} is covered.` };
  return { filter: 'region', pass: false, reason: `Region ${nuts2} not in program regions [${program.regions.join(', ')}].` };
}

function filterSize(size: EnterpriseSize, program: FundingProgramLike): FilterResult {
  if ((program.sizeEligibility ?? []).length === 0) return { filter: 'size', pass: true, reason: 'No size restriction.' };
  if (program.sizeEligibility.includes(size)) return { filter: 'size', pass: true, reason: `Enterprise size '${size}' is eligible.` };
  return { filter: 'size', pass: false, reason: `Size '${size}' not in [${program.sizeEligibility.join(', ')}].` };
}

function filterProjectType(request: MatchRequest, program: FundingProgramLike): FilterResult {
  if (!program.interventionField || !request.projectType) return { filter: 'projectType', pass: true, reason: 'No project-type constraint.' };
  const ok = program.interventionField.toLowerCase().includes(request.projectType.toLowerCase())
    || request.projectType.toLowerCase().includes(program.interventionField.toLowerCase());
  return ok
    ? { filter: 'projectType', pass: true, reason: `Project type matches intervention field '${program.interventionField}'.` }
    : { filter: 'projectType', pass: false, reason: `Project type '${request.projectType}' ≠ intervention field '${program.interventionField}'.` };
}

function filterAgeDifficulty(profile: FundingProfileLike): FilterResult {
  if (profile.insolvent) return { filter: 'ageDifficulty', pass: false, reason: 'Enterprise is insolvent.' };
  if (profile.anafDebt) return { filter: 'ageDifficulty', pass: false, reason: 'Outstanding ANAF debts.' };
  if (isFirmInDifficulty(profile)) return { filter: 'ageDifficulty', pass: false, reason: 'Firm in difficulty (GBER Art.2(18): accumulated losses > ½ subscribed capital or negative equity).' };
  const age = yearsSince(profile.foundedDate);
  if (age !== null && age < 1) return { filter: 'ageDifficulty', pass: false, reason: 'Less than one full fiscal year of activity.' };
  return { filter: 'ageDifficulty', pass: true, reason: 'No firm-in-difficulty / ANAF-debt / insolvency flags.' };
}

function filterDeMinimis(request: MatchRequest, program: FundingProgramLike, estGrant: number): FilterResult {
  if (program.legalBasis !== 'de_minimis') return { filter: 'deMinimis', pass: true, reason: 'Not a de minimis program.' };
  const headroom = request.deMinimisHeadroomEur ?? DE_MINIMIS_CEILING_EUR;
  if (estGrant > headroom) {
    return { filter: 'deMinimis', pass: false, reason: `Estimated grant €${Math.round(estGrant).toLocaleString()} exceeds de minimis headroom €${Math.round(headroom).toLocaleString()} (€300k rolling 3yr).` };
  }
  return { filter: 'deMinimis', pass: true, reason: `Within de minimis headroom (€${Math.round(headroom).toLocaleString()} available).` };
}

function filterLegalBasis(program: FundingProgramLike): FilterResult {
  const ok = program.legalBasis === 'de_minimis' || program.legalBasis.startsWith('gber_') || program.legalBasis === 'notified';
  return ok
    ? { filter: 'legalBasis', pass: true, reason: `Legal basis '${program.legalBasis}' recognised.` }
    : { filter: 'legalBasis', pass: false, reason: `Unknown legal basis '${program.legalBasis}'.` };
}

// ---- grant estimation ----
function estimateIntensityAndGrant(
  size: EnterpriseSize,
  nuts2: string | undefined,
  program: FundingProgramLike,
  request: MatchRequest,
): { effectiveIntensityPct?: number; coFinPct?: number; estMaxGrantEur: number } {
  const cost = request.requestedCostEur ?? 0;
  if (program.legalBasis === 'de_minimis') {
    // intensity = program intensity if given, else (100 - co-fin%), capped by ceiling
    const intensity = program.aidIntensityPct ?? (program.coFinancingPct != null ? 100 - program.coFinancingPct : 100);
    let grant = cost * (intensity / 100);
    if (program.ceilingEur != null) grant = Math.min(grant, program.ceilingEur);
    return { effectiveIntensityPct: intensity, coFinPct: 100 - intensity, estMaxGrantEur: grant };
  }
  if (program.legalBasis.startsWith('gber_')) {
    // Regional legal ceiling (by NUTS) + SME bonus. A call's own aidIntensityPct can
    // only LOWER the result — the stricter ceiling binds; a generous call intensity
    // never raises the regional maximum (state-aid semantics).
    const regionalBase = nuts2 ? REGION_MAX_INTENSITY_LARGE[nuts2] : undefined;
    const pathBase = regionalBase ?? program.aidIntensityPct ?? 0;
    let effective = Math.min(100, pathBase + smeBonusPct(size));
    if (program.aidIntensityPct != null) effective = Math.min(effective, program.aidIntensityPct);
    let grant = cost * (effective / 100);
    if (program.ceilingEur != null) grant = Math.min(grant, program.ceilingEur);
    return { effectiveIntensityPct: effective, coFinPct: 100 - effective, estMaxGrantEur: grant };
  }
  // notified / other: use stated intensity or co-fin
  const intensity = program.aidIntensityPct ?? (program.coFinancingPct != null ? 100 - program.coFinancingPct : 50);
  let grant = cost * (intensity / 100);
  if (program.ceilingEur != null) grant = Math.min(grant, program.ceilingEur);
  return { effectiveIntensityPct: intensity, coFinPct: 100 - intensity, estMaxGrantEur: grant };
}

export function matchProgram(
  profile: FundingProfileLike,
  program: FundingProgramLike,
  request: MatchRequest = {},
): MatchResult {
  const nuts2 = countyToNuts2(profile.county);
  const cons = consolidate(profile);
  const size = classifySize(cons.headcount, cons.turnoverEur, cons.balanceSheetEur);
  const { effectiveIntensityPct, coFinPct, estMaxGrantEur } = estimateIntensityAndGrant(size, nuts2, program, request);

  const perFilter: FilterResult[] = [
    filterCaen(profile, program),
    filterRegion(nuts2, program),
    filterSize(size, program),
    filterProjectType(request, program),
    filterAgeDifficulty(profile),
    filterDeMinimis(request, program, estMaxGrantEur),
    filterLegalBasis(program),
  ];
  // a closed program is never eligible regardless of filters
  const open = program.status === 'open';
  if (!open) perFilter.push({ filter: 'status', pass: false, reason: `Program is '${program.status}', not open.` });

  const eligible = open && perFilter.every((f) => f.pass);
  return {
    programId: program.id,
    programName: program.name,
    eligible,
    perFilter,
    size,
    nuts2,
    effectiveIntensityPct,
    coFinPct,
    estMaxGrantEur: Math.round(estMaxGrantEur),
    deMinimisImpactEur: program.legalBasis === 'de_minimis' ? Math.round(estMaxGrantEur) : 0,
  };
}

/** Rank: eligible first, then by estimated grant desc. */
export function rankMatches(
  profile: FundingProfileLike,
  programs: FundingProgramLike[],
  request: MatchRequest = {},
): MatchResult[] {
  return programs
    .map((p) => matchProgram(profile, p, request))
    .sort((a, b) => {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      return (b.estMaxGrantEur ?? 0) - (a.estMaxGrantEur ?? 0);
    });
}
