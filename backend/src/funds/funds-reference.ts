/**
 * FND reference data — pure, dependency-free lookup tables for the matching engine.
 * Sources: CAEN Rev.2↔Rev.3 (ONRC transition through 25 Sep 2026), NUTS-2 RO regions
 * (Reg. co-fin ceilings 2021-2027), Rec. 2003/361 / Legea 346/2004 SME thresholds.
 */

// ---- CAEN Rev.3 (2025) -> Rev.2 antecedent(s). Only codes we need: seeded programs
// + the common GBER/de-minimis exclusion sectors. Evaluate BOTH during the transition.
export const CAEN_REV3_TO_REV2: Record<string, string[]> = {
  // digital / IT (Start-Up Nation, POR digitalization, EDIH)
  '6201': ['6201'], // custom software
  '6202': ['6202'], // IT consultancy
  '6209': ['6209'],
  '6311': ['6311'], // data processing/hosting
  '5821': ['5821'], // game publishing
  '5829': ['5829'], // other software publishing
  // manufacturing (Microindustrializare, regional competitiveness)
  '1071': ['1071'], // bread/pastry
  '2511': ['2511'], // metal structures
  '3101': ['3101'], // office furniture
  '1413': ['1413'], // outerwear
  // retail / services commonly eligible under POR
  '4791': ['4791'], // e-commerce mail order
  '7311': ['7311'], // advertising
  // ---- exclusion sectors (blacklist antecedents) ----
  '0111': ['0111'], '0113': ['0113'], // primary agriculture (01)
  '0311': ['0311'], '0321': ['0321'], // fishing/aquaculture (03)
  '0510': ['0510'], '0520': ['0520'], // coal (05)
  '1200': ['1200'], // tobacco (12)
  '2540': ['2540'], // weapons/ammunition
  '3040': ['3040'], // military vehicles
  '9200': ['9200'], // gambling (92)
  '6810': ['6810'], '6820': ['6820'], // real estate (68)
  '6411': ['6411'], '6419': ['6419'], '6491': ['6491'], '6499': ['6499'], // financial (64)
  '6511': ['6511'], '6512': ['6512'], // insurance (65)
  '6619': ['6619'], // aux financial (66)
};

/** Two-digit CAEN divisions excluded from most state aid (GBER + de minimis common set). */
export const EXCLUDED_CAEN_DIVISIONS = ['01', '02', '03', '05', '12', '64', '65', '66', '68', '92'];
/** Specific 4-digit exclusions (arms). */
export const EXCLUDED_CAEN_CODES = ['2540', '3040'];

/** Given a Rev.3 code, the set of codes to test against a program list (self + Rev.2 antecedents). */
export function caenAntecedents(code: string): string[] {
  const set = new Set<string>([code]);
  for (const a of CAEN_REV3_TO_REV2[code] ?? []) set.add(a);
  return [...set];
}

/** Is a CAEN code in a globally-excluded sector? (used when a program has no explicit whitelist) */
export function isExcludedSector(code: string): boolean {
  if (!code) return false;
  if (EXCLUDED_CAEN_CODES.includes(code)) return true;
  return EXCLUDED_CAEN_DIVISIONS.includes(code.slice(0, 2));
}

// ---- Romanian county -> NUTS-2 region, and each region's max EU co-fin intensity.
// București-Ilfov (RO32) is the only "more developed" region (~40%); rest up to 85%.
export const COUNTY_TO_NUTS2: Record<string, string> = {
  // RO11 Nord-Vest
  'Bihor': 'RO11', 'Bistrița-Năsăud': 'RO11', 'Cluj': 'RO11', 'Maramureș': 'RO11', 'Satu Mare': 'RO11', 'Sălaj': 'RO11',
  // RO12 Centru
  'Alba': 'RO12', 'Brașov': 'RO12', 'Covasna': 'RO12', 'Harghita': 'RO12', 'Mureș': 'RO12', 'Sibiu': 'RO12',
  // RO21 Nord-Est
  'Bacău': 'RO21', 'Botoșani': 'RO21', 'Iași': 'RO21', 'Neamț': 'RO21', 'Suceava': 'RO21', 'Vaslui': 'RO21',
  // RO22 Sud-Est
  'Brăila': 'RO22', 'Buzău': 'RO22', 'Constanța': 'RO22', 'Galați': 'RO22', 'Tulcea': 'RO22', 'Vrancea': 'RO22',
  // RO31 Sud-Muntenia
  'Argeș': 'RO31', 'Călărași': 'RO31', 'Dâmbovița': 'RO31', 'Giurgiu': 'RO31', 'Ialomița': 'RO31', 'Prahova': 'RO31', 'Teleorman': 'RO31',
  // RO32 București-Ilfov (more developed)
  'București': 'RO32', 'Bucuresti': 'RO32', 'Ilfov': 'RO32',
  // RO41 Sud-Vest Oltenia
  'Dolj': 'RO41', 'Gorj': 'RO41', 'Mehedinți': 'RO41', 'Olt': 'RO41', 'Vâlcea': 'RO41',
  // RO42 Vest
  'Arad': 'RO42', 'Caraș-Severin': 'RO42', 'Hunedoara': 'RO42', 'Timiș': 'RO42',
};

/** Max EU regional-aid intensity for LARGE enterprises by NUTS-2 (GBER Art.14 map 2022-2027). */
export const REGION_MAX_INTENSITY_LARGE: Record<string, number> = {
  RO11: 60, RO12: 60, RO21: 60, RO22: 60, RO31: 60, RO41: 60, RO42: 50,
  RO32: 40, // București-Ilfov reduced
};

export function countyToNuts2(county?: string | null): string | undefined {
  if (!county) return undefined;
  return COUNTY_TO_NUTS2[county.trim()];
}

// ---- Enterprise size (Rec. 2003/361 / Legea 346/2004) ----
export type EnterpriseSize = 'micro' | 'small' | 'medium' | 'large';

/**
 * Classify by headcount AND (turnover OR balance-sheet). Headcount is the hard gate;
 * a firm exceeding BOTH financial ceilings for its headcount class steps up.
 * Inputs must already be CONSOLIDATED (partner pro-rata + linked 100%).
 */
export function classifySize(headcount: number, turnoverEur: number, balanceSheetEur: number): EnterpriseSize {
  const fin = Math.min(
    turnoverEur > 0 ? turnoverEur : Infinity,
    balanceSheetEur > 0 ? balanceSheetEur : Infinity,
  );
  // A class holds if headcount < ceiling AND (turnover<=T OR balance<=B). We use the
  // lesser of the two financials to give the firm the benefit where one is small.
  if (headcount < 10 && fin <= 2_000_000) return 'micro';
  if (headcount < 50 && fin <= 10_000_000) return 'small';
  if (headcount < 250 && (turnoverEur <= 50_000_000 || balanceSheetEur <= 43_000_000)) return 'medium';
  return 'large';
}

/** SME intensity bonus over the large-enterprise regional ceiling: +20pp small/micro, +10pp medium. */
export function smeBonusPct(size: EnterpriseSize): number {
  if (size === 'micro' || size === 'small') return 20;
  if (size === 'medium') return 10;
  return 0;
}
