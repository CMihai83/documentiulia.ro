import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = '/api/v1/tax';

// Types
export interface TaxRate {
  tax_type: string;
  tax_name_ro: string;
  tax_name_en: string;
  rate: number;
  rate_percent: number;
  effective_from: string;
  effective_until: string | null;
  applicable_to: string[];
  notes: string;
}

export interface MinimumWage {
  amount: number;
  effective_from: string;
  notes: string;
}

export interface GroupedRates {
  income_taxes: TaxRate[];
  social_contributions: TaxRate[];
  micro_enterprise: TaxRate[];
  corporate: TaxRate[];
  vat: TaxRate[];
  other: TaxRate[];
}

export interface TaxRatesResponse {
  rates: TaxRate[];
  grouped_rates: GroupedRates;
  minimum_wage: MinimumWage | null;
  reference_date: string;
}

// Salary calculation types
export interface SalaryDeduction {
  type: string;
  amount: number;
}

export interface SalaryInput {
  gross_salary: number;
  deductions?: SalaryDeduction[];
  is_it_worker?: boolean;
  has_dependents?: number;
  is_part_time?: boolean;
  hours_per_week?: number;
}

export interface SalaryResult {
  gross_salary: number;
  cas: number;
  cass: number;
  taxable_income: number;
  income_tax: number;
  net_salary: number;
  employer_cost: number;
  cam: number;
  effective_tax_rate: number;
}

// PFA calculation types
export interface PFAInput {
  annual_income: number;
  annual_expenses?: number;
  tax_system?: 'real' | 'norm';
  pay_cas?: boolean;
  pay_cass?: boolean;
}

export interface PFAResult {
  gross_income: number;
  expenses: number;
  net_income: number;
  income_tax: number;
  cas: number;
  cass: number;
  total_taxes: number;
  net_after_taxes: number;
  effective_rate: number;
}

// Micro-enterprise types
export interface MicroInput {
  revenue: number;
  has_employees?: boolean;
}

export interface MicroResult {
  revenue: number;
  tax_rate: number;
  tax_amount: number;
  has_employees: boolean;
  net_revenue: number;
}

// Profit tax types
export interface ProfitInput {
  revenue: number;
  expenses: number;
  sponsorships?: number;
  reinvested_profit?: number;
}

export interface ProfitResult {
  revenue: number;
  expenses: number;
  gross_profit: number;
  tax_deductions: number;
  taxable_profit: number;
  profit_tax: number;
  net_profit: number;
  effective_rate: number;
}

// Dividend types
export interface DividendInput {
  gross_dividend: number;
}

export interface DividendResult {
  gross_dividend: number;
  tax_rate: number;
  tax_amount: number;
  net_dividend: number;
}

// VAT types
export interface VATInput {
  amount: number;
  vat_type?: 'vat_19' | 'vat_9' | 'vat_5' | 'vat_0';
  inclusive?: boolean;
}

export interface VATResult {
  net_amount: number;
  vat_amount: number;
  gross_amount: number;
  vat_rate: number;
}

// VAT Balance types
export interface VATBalanceInput {
  collected_vat: number;
  deductible_vat: number;
}

export interface VATBalanceResult {
  collected_vat: number;
  deductible_vat: number;
  balance: number;
  to_pay: number;
  to_recover: number;
}

// Tax comparison types
export interface CompareRegimesInput {
  annual_revenue: number;
  annual_expenses: number;
  has_employees?: boolean;
  desired_dividends?: number;
}

export interface RegimeComparison {
  regime: string;
  total_tax: number;
  effective_rate: number;
  net_income: number;
  details: Record<string, number>;
}

export interface CompareRegimesResult {
  comparisons: RegimeComparison[];
  recommendation: string;
  savings_potential: number;
}

/**
 * Hook to fetch current Romanian tax rates
 */
export function useTaxRates() {
  const { token } = useAuth();
  const [rates, setRates] = useState<TaxRatesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = useCallback(async (date?: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (date) params.append('date', date);

      const response = await fetch(`${API_BASE}/rates.php?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setRates(data.data);
        return data.data;
      } else {
        setError(data.error || 'Failed to fetch tax rates');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  return { rates, loading, error, fetchRates };
}

/**
 * Hook for calculating various Romanian taxes
 */
export function useTaxCalculator() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calculate = useCallback(async <T>(type: string, input: any): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/calculate.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ type, ...input }),
      });

      const data = await response.json();

      if (data.success) {
        return data.data as T;
      } else {
        setError(data.error || 'Calculation failed');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Specific calculation methods
  const calculateSalary = useCallback(
    (input: SalaryInput) => calculate<SalaryResult>('salary', input),
    [calculate]
  );

  const calculatePFA = useCallback(
    (input: PFAInput) => calculate<PFAResult>('pfa', input),
    [calculate]
  );

  const calculateMicro = useCallback(
    (input: MicroInput) => calculate<MicroResult>('micro', input),
    [calculate]
  );

  const calculateProfit = useCallback(
    (input: ProfitInput) => calculate<ProfitResult>('profit', input),
    [calculate]
  );

  const calculateDividend = useCallback(
    (input: DividendInput) => calculate<DividendResult>('dividend', input),
    [calculate]
  );

  const calculateVAT = useCallback(
    (input: VATInput) => calculate<VATResult>('vat', input),
    [calculate]
  );

  const calculateVATBalance = useCallback(
    (input: VATBalanceInput) => calculate<VATBalanceResult>('vat_balance', input),
    [calculate]
  );

  const compareRegimes = useCallback(
    (input: CompareRegimesInput) => calculate<CompareRegimesResult>('compare_regimes', input),
    [calculate]
  );

  return {
    loading,
    error,
    calculateSalary,
    calculatePFA,
    calculateMicro,
    calculateProfit,
    calculateDividend,
    calculateVAT,
    calculateVATBalance,
    compareRegimes,
  };
}

// Utility functions for local calculations (no API needed)
export const TaxUtils = {
  /**
   * Format currency in RON
   */
  formatRON: (amount: number): string => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 2,
    }).format(amount);
  },

  /**
   * Format percentage
   */
  formatPercent: (rate: number): string => {
    return `${(rate * 100).toFixed(2)}%`;
  },

  /**
   * Quick VAT calculation (local, no API)
   */
  quickVAT: (amount: number, rate: number = 0.19, inclusive: boolean = false): {
    net: number;
    vat: number;
    gross: number;
  } => {
    if (inclusive) {
      const net = amount / (1 + rate);
      const vat = amount - net;
      return { net, vat, gross: amount };
    } else {
      const vat = amount * rate;
      return { net: amount, vat, gross: amount + vat };
    }
  },

  /**
   * Quick net salary estimation (rough, no deductions)
   */
  quickNetSalary: (gross: number): number => {
    const cas = gross * 0.25;
    const cass = gross * 0.10;
    const taxableIncome = gross - cas - cass;
    const incomeTax = taxableIncome * 0.10;
    return gross - cas - cass - incomeTax;
  },

  /**
   * Quick employer cost estimation
   */
  quickEmployerCost: (gross: number): number => {
    const cam = gross * 0.0225;
    return gross + cam;
  },

  /**
   * Tax rate constants for quick reference
   */
  RATES: {
    INCOME_TAX: 0.10,
    CAS: 0.25,
    CASS: 0.10,
    CAM: 0.0225,
    MICRO_WITH_EMPLOYEES: 0.01,
    MICRO_WITHOUT_EMPLOYEES: 0.03,
    PROFIT_TAX: 0.16,
    DIVIDEND_TAX: 0.08,
    VAT_STANDARD: 0.19,
    VAT_REDUCED_9: 0.09,
    VAT_REDUCED_5: 0.05,
  } as const,
};
