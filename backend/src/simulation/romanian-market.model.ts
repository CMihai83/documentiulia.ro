/**
 * Romanian Market Model
 * Complete economic parameters for Romanian business simulation
 * Based on Grok AI recommendations - Sprint 25
 */

export interface RomanianMarketModel {
  vatRates: {
    standard: number;
    reduced: number;
    special: number;
    // Post August 2025 rates (Legea 141/2025)
    standard2025: number;
    reduced2025: number;
  };
  vatThresholds: {
    micro: number;      // Under this = 1% tax
    small: number;      // Under this = 3% tax
    vat: number;        // Over this = must register for VAT
  };
  employeeContributions: {
    cas: { employee: number; employer: number };   // Pension
    cass: { employee: number; employer: number };  // Health
    cam: number;                                    // Work insurance (employer)
    totalEmployer: number;
    totalEmployee: number;
  };
  corporateTax: {
    micro1: number;      // Micro < 60k EUR, has employees
    micro3: number;      // Micro > 60k EUR or no employees
    standard: number;    // 16% profit tax
    dividend: number;    // Dividend tax
  };
  minimumWage: {
    current: number;
    construction: number;  // Higher for construction
    agriculture: number;   // Special for agriculture
    progression: number[]; // Future years projection
  };
  industryMargins: Record<string, { low: number; high: number; typical: number }>;
  seasonalFactors: Record<number, number>;
  economicCycle: {
    currentPhase: 'expansion' | 'peak' | 'contraction' | 'trough';
    yearInCycle: number;
    phases: Record<string, { duration: number; growthImpact: number; demandImpact: number }>;
  };
  inflation: {
    current: number;
    projected: number[];
  };
  interestRates: {
    bnr: number;           // BNR reference rate
    commercial: number;    // Commercial loan rates
    overdraft: number;     // Overdraft rates
  };
  exchangeRates: {
    eurRon: number;
    usdRon: number;
  };
}

export const ROMANIAN_MARKET_2025: RomanianMarketModel = {
  vatRates: {
    standard: 19,
    reduced: 9,
    special: 5,
    standard2025: 21,  // After August 2025
    reduced2025: 11,   // After August 2025
  },

  vatThresholds: {
    micro: 60000,      // 60k EUR micro limit
    small: 500000,     // 500k EUR small enterprise
    vat: 300000,       // 300k RON VAT registration threshold
  },

  employeeContributions: {
    cas: { employee: 25, employer: 0 },      // CAS 25% employee
    cass: { employee: 10, employer: 0 },     // CASS 10% employee
    cam: 2.25,                                // CAM 2.25% employer (work insurance)
    totalEmployer: 2.25,                      // Employer pays 2.25%
    totalEmployee: 35,                        // Employee pays 35%
  },

  corporateTax: {
    micro1: 1,         // 1% for micro with employees
    micro3: 3,         // 3% for micro without employees or > 60k EUR
    standard: 16,      // 16% profit tax
    dividend: 8,       // 8% dividend tax
  },

  minimumWage: {
    current: 3700,           // RON gross 2025
    construction: 4582,      // Construction sector
    agriculture: 3700,       // Agriculture
    progression: [3700, 3900, 4100, 4300, 4500], // 2025-2029
  },

  industryMargins: {
    'IT': { low: 15, high: 40, typical: 25 },
    'Consulting': { low: 20, high: 50, typical: 30 },
    'Manufacturing': { low: 5, high: 20, typical: 12 },
    'Retail': { low: 3, high: 15, typical: 8 },
    'Wholesale': { low: 5, high: 12, typical: 8 },
    'Services': { low: 10, high: 35, typical: 20 },
    'Construction': { low: 8, high: 25, typical: 15 },
    'Transport': { low: 5, high: 18, typical: 10 },
    'HoReCa': { low: 10, high: 30, typical: 18 },
    'Agriculture': { low: 5, high: 25, typical: 12 },
    'Healthcare': { low: 15, high: 40, typical: 25 },
    'Education': { low: 10, high: 30, typical: 18 },
    'FinTech': { low: 20, high: 50, typical: 35 },
    'E-commerce': { low: 8, high: 25, typical: 15 },
  },

  seasonalFactors: {
    1: 0.85,   // January - post-holiday slowdown
    2: 0.90,   // February
    3: 0.95,   // March - spring pickup
    4: 1.00,   // April
    5: 1.05,   // May
    6: 1.10,   // June - pre-summer boost
    7: 0.95,   // July - summer slowdown
    8: 0.90,   // August - vacation month
    9: 1.05,   // September - back to business
    10: 1.10,  // October
    11: 1.15,  // November - Black Friday
    12: 1.20,  // December - Christmas season
  },

  economicCycle: {
    currentPhase: 'expansion',
    yearInCycle: 2,
    phases: {
      expansion: { duration: 36, growthImpact: 1.05, demandImpact: 1.10 },
      peak: { duration: 12, growthImpact: 1.02, demandImpact: 1.15 },
      contraction: { duration: 18, growthImpact: 0.95, demandImpact: 0.90 },
      trough: { duration: 12, growthImpact: 0.98, demandImpact: 0.85 },
    },
  },

  inflation: {
    current: 5.5,  // 5.5% annual inflation
    projected: [5.5, 4.5, 3.5, 3.0, 2.5], // 2025-2029
  },

  interestRates: {
    bnr: 6.5,        // BNR reference rate
    commercial: 9.5, // Commercial loans
    overdraft: 12.0, // Overdraft facilities
  },

  exchangeRates: {
    eurRon: 4.97,
    usdRon: 4.65,
  },
};

/**
 * Calculate employer total cost for an employee
 */
export function calculateEmployerCost(grossSalary: number): number {
  const cam = grossSalary * (ROMANIAN_MARKET_2025.employeeContributions.cam / 100);
  return grossSalary + cam;
}

/**
 * Calculate net salary from gross
 */
export function calculateNetSalary(grossSalary: number): number {
  const cas = grossSalary * (ROMANIAN_MARKET_2025.employeeContributions.cas.employee / 100);
  const cass = grossSalary * (ROMANIAN_MARKET_2025.employeeContributions.cass.employee / 100);
  const taxableIncome = grossSalary - cas - cass;
  const incomeTax = taxableIncome * 0.10; // 10% income tax
  return grossSalary - cas - cass - incomeTax;
}

/**
 * Calculate VAT for a transaction
 */
export function calculateVAT(amount: number, reduced: boolean = false, post2025: boolean = false): number {
  const rates = ROMANIAN_MARKET_2025.vatRates;
  let rate: number;

  if (post2025) {
    rate = reduced ? rates.reduced2025 : rates.standard2025;
  } else {
    rate = reduced ? rates.reduced : rates.standard;
  }

  return amount * (rate / 100);
}

/**
 * Calculate corporate tax based on company type
 */
export function calculateCorporateTax(revenue: number, profit: number, hasEmployees: boolean, isMicro: boolean): number {
  if (isMicro) {
    const rate = hasEmployees ?
      ROMANIAN_MARKET_2025.corporateTax.micro1 :
      ROMANIAN_MARKET_2025.corporateTax.micro3;
    return revenue * (rate / 100);
  } else {
    return profit * (ROMANIAN_MARKET_2025.corporateTax.standard / 100);
  }
}

/**
 * Get seasonal adjustment factor for a given month
 */
export function getSeasonalFactor(month: number): number {
  return ROMANIAN_MARKET_2025.seasonalFactors[month] || 1.0;
}

/**
 * Get industry margin range
 */
export function getIndustryMargin(industry: string): { low: number; high: number; typical: number } {
  return ROMANIAN_MARKET_2025.industryMargins[industry] || { low: 5, high: 20, typical: 10 };
}

/**
 * Calculate economic cycle impact
 */
export function getEconomicCycleImpact(): { growth: number; demand: number } {
  const phase = ROMANIAN_MARKET_2025.economicCycle.currentPhase;
  const phaseData = ROMANIAN_MARKET_2025.economicCycle.phases[phase];
  return {
    growth: phaseData.growthImpact,
    demand: phaseData.demandImpact,
  };
}
