/**
 * Business Logic Engine
 * Complete simulation engine with all business calculations
 * Based on Grok AI recommendations - Sprint 25
 */

import {
  ROMANIAN_MARKET_2025,
  calculateEmployerCost,
  getSeasonalFactor,
  getIndustryMargin,
  getEconomicCycleImpact,
} from './romanian-market.model';

export interface SimulationState {
  // Financial
  cash: number;
  revenue: number;
  expenses: number;
  profit: number;
  receivables: number;
  payables: number;
  inventory: number;
  equipment: number;
  loans: number;
  loanPayments: number;

  // Operations
  employees: number;
  averageSalary: number;
  capacity: number;
  utilization: number;
  quality: number;
  morale: number;

  // Market
  price: number;
  basePrice: number;
  marketSize: number;
  marketShare: number;
  customerCount: number;
  reputation: number;
  customerSatisfaction: number;

  // Compliance
  taxOwed: number;
  vatBalance: number;
  penaltiesRisk: number;
  auditRisk: number;
  complianceScore: number;

  // Meta
  month: number;
  year: number;
  industry: string;
  isMicro: boolean;
  hasEmployees: boolean;
}

export interface CalculatedMetrics {
  monthlyRevenue: number;
  monthlyExpenses: number;
  netProfit: number;
  cashFlow: number;
  employeeProductivity: number;
  marketDemand: number;
  qualityImpact: number;
  reputationChange: number;
  healthScores: HealthScores;
  // Enhanced metrics
  roi: number;
  customerAcquisitionCost: number;
  employeeTurnoverRate: number;
  inventoryTurnover: number;
  debtToEquityRatio: number;
  workingCapital: number;
  grossMargin: number;
  operatingMargin: number;
  marketPenetration: number;
  competitiveAdvantage: number;
}

export interface HealthScores {
  overall: number;
  financial: number;
  operations: number;
  compliance: number;
  growth: number;
}

// =====================================================
// REVENUE CALCULATIONS
// =====================================================

/**
 * Calculate monthly revenue
 * Formula: base × market × min(capacity, demand) × qualityFactor × reputationFactor × seasonalFactor × economicFactor
 */
export function calculateMonthlyRevenue(state: SimulationState): number {
  const { price, marketSize, capacity, utilization, quality, reputation, month, industry } = state;

  // Base revenue from customer transactions
  const baseRevenue = state.customerCount * price * 0.8; // Average 0.8 transactions per customer per month

  // Market demand factor
  const marketDemand = calculateMarketDemand(price, state.basePrice, marketSize);

  // Capacity constraint
  const capacityFactor = Math.min(capacity / 100, marketDemand / 100);

  // Quality multiplier (50 = baseline, higher = bonus)
  const qualityFactor = 1 + (quality - 50) / 200; // ±25% impact

  // Reputation multiplier (50 = baseline)
  const reputationFactor = 1 + (reputation - 50) / 150; // ±33% impact

  // Seasonal adjustment
  const seasonalFactor = getSeasonalFactor(month);

  // Economic cycle
  const { demand: economicFactor } = getEconomicCycleImpact();

  // Industry margin adjustment
  const margin = getIndustryMargin(industry);
  const industryFactor = 1 + (margin.typical - 10) / 100;

  const revenue = baseRevenue *
    capacityFactor *
    qualityFactor *
    reputationFactor *
    seasonalFactor *
    economicFactor *
    industryFactor;

  return Math.round(revenue * 100) / 100;
}

/**
 * Calculate market demand based on price elasticity
 */
export function calculateMarketDemand(
  currentPrice: number,
  basePrice: number,
  marketSize: number,
  priceElasticity: number = 1.5
): number {
  const priceRatio = currentPrice / basePrice;
  const demandMultiplier = Math.pow(priceRatio, -priceElasticity);
  return marketSize * demandMultiplier * 0.01; // 1% of market as base
}

// =====================================================
// EXPENSE CALCULATIONS
// =====================================================

/**
 * Calculate monthly expenses
 * Components: fixed + variable + salaries + equipment depreciation + loan payments
 */
export function calculateMonthlyExpenses(state: SimulationState): number {
  const {
    employees,
    averageSalary,
    capacity,
    utilization,
    equipment,
    inventory,
    loans,
    industry
  } = state;

  // Fixed costs (rent, utilities, insurance, etc.)
  const fixedCosts = calculateFixedCosts(employees, industry);

  // Variable costs based on utilization
  const variableCosts = calculateVariableCosts(capacity, utilization, industry);

  // Salary costs with employer contributions
  const salaryCosts = employees * calculateEmployerCost(averageSalary);

  // Equipment depreciation (5% annual = 0.42% monthly)
  const depreciation = equipment * 0.0042;

  // Inventory carrying costs (2% monthly)
  const inventoryCosts = inventory * 0.02;

  // Loan interest payments (based on commercial rate)
  const loanInterest = loans * (ROMANIAN_MARKET_2025.interestRates.commercial / 100 / 12);

  const totalExpenses = fixedCosts + variableCosts + salaryCosts + depreciation + inventoryCosts + loanInterest;

  return Math.round(totalExpenses * 100) / 100;
}

/**
 * Calculate fixed costs based on team size and industry
 */
function calculateFixedCosts(employees: number, industry: string): number {
  // Base fixed costs
  const baseFixed = 2000; // Minimum operating costs

  // Per-employee overhead
  const employeeOverhead = employees * 500;

  // Industry-specific adjustments
  const industryMultiplier: Record<string, number> = {
    'IT': 0.8,           // Lower fixed costs
    'Manufacturing': 1.5, // Higher fixed costs
    'Retail': 1.2,
    'Services': 0.9,
    'Construction': 1.3,
    'HoReCa': 1.4,
  };

  const multiplier = industryMultiplier[industry] || 1.0;

  return (baseFixed + employeeOverhead) * multiplier;
}

/**
 * Calculate variable costs based on capacity utilization
 */
function calculateVariableCosts(capacity: number, utilization: number, industry: string): number {
  const activeCapacity = capacity * (utilization / 100);

  // Cost per unit of capacity
  const costPerUnit: Record<string, number> = {
    'IT': 50,
    'Manufacturing': 150,
    'Retail': 80,
    'Services': 60,
    'Construction': 200,
    'HoReCa': 100,
  };

  const unitCost = costPerUnit[industry] || 75;

  return activeCapacity * unitCost * 0.1; // 10% of capacity as variable cost base
}

// =====================================================
// CASH FLOW CALCULATIONS
// =====================================================

/**
 * Calculate monthly cash flow
 */
export function calculateCashFlow(state: SimulationState): number {
  const revenue = calculateMonthlyRevenue(state);
  const expenses = calculateMonthlyExpenses(state);

  // Collections from receivables (60% collected per month)
  const collections = state.receivables * 0.6;

  // Payments to suppliers
  const supplierPayments = state.payables * 0.7;

  // Loan principal payments
  const loanPrincipal = state.loanPayments;

  // Tax payments
  const taxPayments = state.taxOwed > 0 ? Math.min(state.taxOwed, state.taxOwed * 0.25) : 0;

  const cashFlow = revenue - expenses + collections - supplierPayments - loanPrincipal - taxPayments;

  return Math.round(cashFlow * 100) / 100;
}

/**
 * Project cash flow for N months
 */
export function projectCashFlow(state: SimulationState, months: number): number[] {
  const projections: number[] = [];
  let currentState = { ...state };

  for (let i = 0; i < months; i++) {
    const monthlyFlow = calculateCashFlow(currentState);
    projections.push(monthlyFlow);

    // Update state for next month
    currentState.cash += monthlyFlow;
    currentState.month = (currentState.month % 12) + 1;
    if (currentState.month === 1) currentState.year++;
  }

  return projections;
}

// =====================================================
// EMPLOYEE & PRODUCTIVITY CALCULATIONS
// =====================================================

/**
 * Calculate employee productivity score
 */
export function calculateEmployeeProductivity(state: SimulationState): number {
  const { employees, quality, morale, utilization } = state;

  // Base productivity
  const baseProductivity = 100;

  // Quality factor (trained employees = higher quality)
  const qualityFactor = 1 + (quality - 50) / 100;

  // Morale factor
  const moraleFactor = 1 + (morale - 50) / 100;

  // Overwork penalty (utilization > 90% reduces productivity)
  const overworkPenalty = utilization > 90 ? 1 - (utilization - 90) / 100 : 1;

  // Team size bonus/penalty (optimal team size varies)
  const teamFactor = employees > 1 ? 1 + Math.log10(employees) * 0.1 : 1;

  const productivity = baseProductivity *
    qualityFactor *
    moraleFactor *
    overworkPenalty *
    teamFactor;

  return Math.min(150, Math.max(50, Math.round(productivity)));
}

/**
 * Calculate role capacity contribution
 */
export function calculateRoleCapacity(role: 'junior' | 'senior' | 'manager'): number {
  const capacityByRole = {
    junior: 50,
    senior: 100,
    manager: 150, // Managers also add organizational capacity
  };
  return capacityByRole[role];
}

// =====================================================
// QUALITY & REPUTATION
// =====================================================

/**
 * Calculate quality impact on revenue
 */
export function calculateQualityImpact(quality: number): number {
  // 50 is baseline (1.0), range is 0.5 to 1.5
  return 0.5 + (quality / 100);
}

/**
 * Calculate reputation change for the month
 */
export function calculateReputationChange(state: SimulationState): number {
  const {
    reputation,
    customerSatisfaction,
    quality,
    marketShare
  } = state;

  // Customer satisfaction impact
  const satisfactionImpact = (customerSatisfaction - 50) / 500; // ±10% per month max

  // Quality consistency
  const qualityImpact = (quality - 50) / 1000; // ±5% per month max

  // Market presence
  const marketImpact = marketShare * 0.001; // Small bonus for market presence

  // Reputation inertia (tends toward 50)
  const inertia = (50 - reputation) / 1000;

  const change = reputation * (satisfactionImpact + qualityImpact + marketImpact + inertia);

  return Math.max(-5, Math.min(5, change)); // Cap at ±5 points per month
}

// =====================================================
// HEALTH SCORE CALCULATIONS
// =====================================================

/**
 * Calculate all health scores
 */
export function calculateHealthScores(state: SimulationState): HealthScores {
  const financial = calculateFinancialHealth(state);
  const operations = calculateOperationsHealth(state);
  const compliance = calculateComplianceHealth(state);
  const growth = calculateGrowthHealth(state);

  // Weighted average for overall health
  const overall = Math.round(
    financial * 0.30 +
    operations * 0.25 +
    compliance * 0.20 +
    growth * 0.25
  );

  return {
    overall: Math.max(0, Math.min(100, overall)),
    financial: Math.max(0, Math.min(100, financial)),
    operations: Math.max(0, Math.min(100, operations)),
    compliance: Math.max(0, Math.min(100, compliance)),
    growth: Math.max(0, Math.min(100, growth)),
  };
}

/**
 * Calculate financial health score (0-100)
 */
export function calculateFinancialHealth(state: SimulationState): number {
  const { cash, revenue, expenses, profit, receivables, payables, loans } = state;

  // Liquidity ratio (cash / monthly expenses)
  const liquidity = expenses > 0 ? Math.min(50, (cash / expenses) * 10) : 50;

  // Profitability (profit margin)
  const profitMargin = revenue > 0 ? Math.min(30, (profit / revenue) * 100) : 0;

  // Debt ratio (loans / total assets)
  const totalAssets = cash + receivables + state.inventory + state.equipment;
  const debtRatio = totalAssets > 0 ? Math.max(0, 20 - (loans / totalAssets) * 40) : 20;

  return Math.round(liquidity + profitMargin + debtRatio);
}

/**
 * Calculate operations health score (0-100)
 */
export function calculateOperationsHealth(state: SimulationState): number {
  const { capacity, utilization, quality, employees, morale } = state;

  // Capacity utilization (optimal: 70-85%)
  const utilizationScore = utilization >= 70 && utilization <= 85 ?
    30 :
    30 - Math.abs(utilization - 77.5) * 0.5;

  // Quality score
  const qualityScore = quality * 0.4; // Max 40 points

  // Employee efficiency
  const efficiency = employees > 0 ? Math.min(20, capacity / employees * 0.2) : 0;

  // Morale impact
  const moraleScore = morale * 0.1; // Max 10 points

  return Math.round(utilizationScore + qualityScore + efficiency + moraleScore);
}

/**
 * Calculate compliance health score (0-100)
 */
export function calculateComplianceHealth(state: SimulationState): number {
  const { taxOwed, vatBalance, penaltiesRisk, auditRisk, complianceScore } = state;

  // Tax status (paid = good)
  const taxScore = taxOwed === 0 ? 30 : Math.max(0, 30 - taxOwed / 1000);

  // VAT management
  const vatScore = Math.abs(vatBalance) < 5000 ? 20 : Math.max(0, 20 - Math.abs(vatBalance) / 1000);

  // Audit risk (lower = better)
  const auditScore = Math.max(0, 25 - auditRisk);

  // Penalty risk
  const penaltyScore = Math.max(0, 25 - penaltiesRisk);

  return Math.round(taxScore + vatScore + auditScore + penaltyScore);
}

/**
 * Calculate growth health score (0-100)
 */
export function calculateGrowthHealth(state: SimulationState): number {
  const { marketShare, customerCount, reputation, revenue } = state;

  // Market share score
  const marketScore = Math.min(30, marketShare * 3);

  // Customer base
  const customerScore = Math.min(25, Math.log10(customerCount + 1) * 10);

  // Reputation
  const reputationScore = reputation * 0.25; // Max 25 points

  // Revenue momentum (would need historical data)
  const momentumScore = 20; // Placeholder - calculate from trend

  return Math.round(marketScore + customerScore + reputationScore + momentumScore);
}

// =====================================================
// SIMULATION STEP
// =====================================================

/**
 * Process one month of simulation
 */
export function processSimulationMonth(state: SimulationState): SimulationState {
  const newState = { ...state };

  // Calculate metrics
  const revenue = calculateMonthlyRevenue(state);
  const expenses = calculateMonthlyExpenses(state);
  const cashFlow = calculateCashFlow(state);
  const productivity = calculateEmployeeProductivity(state);
  const reputationChange = calculateReputationChange(state);

  // Update financial state
  newState.revenue = revenue;
  newState.expenses = expenses;
  newState.profit = revenue - expenses;
  newState.cash = Math.max(0, state.cash + cashFlow);

  // Update receivables and payables
  newState.receivables = state.receivables * 0.4 + revenue * 0.3; // 30% credit sales
  newState.payables = state.payables * 0.3 + expenses * 0.2;

  // Update reputation
  newState.reputation = Math.max(0, Math.min(100, state.reputation + reputationChange));

  // Update customer count based on reputation and marketing
  const customerGrowth = (newState.reputation - 50) / 100 * state.customerCount * 0.1;
  newState.customerCount = Math.max(1, Math.round(state.customerCount + customerGrowth));

  // Update market share
  const totalMarket = state.marketSize * 100;
  newState.marketShare = (newState.customerCount / totalMarket) * 100;

  // Update compliance
  newState.taxOwed += calculateMonthlyTaxOwed(newState);
  newState.vatBalance += calculateVATBalance(revenue, expenses);

  // Advance time
  newState.month = (state.month % 12) + 1;
  if (newState.month === 1) newState.year++;

  return newState;
}

/**
 * Calculate monthly tax owed
 */
function calculateMonthlyTaxOwed(state: SimulationState): number {
  if (state.isMicro) {
    const rate = state.hasEmployees ?
      ROMANIAN_MARKET_2025.corporateTax.micro1 :
      ROMANIAN_MARKET_2025.corporateTax.micro3;
    return state.revenue * (rate / 100);
  }
  return Math.max(0, state.profit * (ROMANIAN_MARKET_2025.corporateTax.standard / 100));
}

/**
 * Calculate VAT balance change
 */
function calculateVATBalance(revenue: number, expenses: number): number {
  const vatCollected = revenue * (ROMANIAN_MARKET_2025.vatRates.standard / 100);
  const vatPaid = expenses * 0.5 * (ROMANIAN_MARKET_2025.vatRates.standard / 100); // Assume 50% of expenses have VAT
  return vatCollected - vatPaid;
}

// =====================================================
// ENHANCED METRICS CALCULATIONS
// =====================================================

/**
 * Calculate Return on Investment (ROI)
 */
export function calculateROI(investment: number, returns: number): number {
  return investment > 0 ? ((returns - investment) / investment) * 100 : 0;
}

/**
 * Calculate Customer Acquisition Cost (CAC)
 */
export function calculateCAC(marketingSpend: number, newCustomers: number): number {
  return newCustomers > 0 ? marketingSpend / newCustomers : 0;
}

/**
 * Calculate Employee Turnover Rate
 */
export function calculateEmployeeTurnover(employeesLeft: number, totalEmployees: number): number {
  return totalEmployees > 0 ? (employeesLeft / totalEmployees) * 100 : 0;
}

/**
 * Calculate Inventory Turnover Ratio
 */
export function calculateInventoryTurnover(costOfGoodsSold: number, averageInventory: number): number {
  return averageInventory > 0 ? costOfGoodsSold / averageInventory : 0;
}

/**
 * Calculate Debt-to-Equity Ratio
 */
export function calculateDebtToEquity(totalDebt: number, equity: number): number {
  return equity > 0 ? totalDebt / equity : 0;
}

/**
 * Calculate Working Capital
 */
export function calculateWorkingCapital(currentAssets: number, currentLiabilities: number): number {
  return currentAssets - currentLiabilities;
}

/**
 * Calculate Gross Margin
 */
export function calculateGrossMargin(revenue: number, costOfGoodsSold: number): number {
  return revenue > 0 ? ((revenue - costOfGoodsSold) / revenue) * 100 : 0;
}

/**
 * Calculate Operating Margin
 */
export function calculateOperatingMargin(operatingIncome: number, revenue: number): number {
  return revenue > 0 ? (operatingIncome / revenue) * 100 : 0;
}

/**
 * Calculate Market Penetration
 */
export function calculateMarketPenetration(companyCustomers: number, totalMarket: number): number {
  return totalMarket > 0 ? (companyCustomers / totalMarket) * 100 : 0;
}

/**
 * Calculate Competitive Advantage Score
 */
export function calculateCompetitiveAdvantage(
  quality: number,
  reputation: number,
  marketShare: number,
  innovation: number
): number {
  return (quality * 0.3 + reputation * 0.3 + marketShare * 0.2 + innovation * 0.2);
}

/**
 * Calculate advanced metrics for a simulation state
 */
export function calculateAdvancedMetrics(state: SimulationState): Omit<CalculatedMetrics, 'monthlyRevenue' | 'monthlyExpenses' | 'netProfit' | 'cashFlow' | 'employeeProductivity' | 'marketDemand' | 'qualityImpact' | 'reputationChange' | 'healthScores'> {
  const revenue = calculateMonthlyRevenue(state);
  const expenses = calculateMonthlyExpenses(state);
  const profit = revenue - expenses;

  // ROI (simplified - would need investment tracking)
  const roi = calculateROI(state.equipment, revenue * 0.1); // Assume 10% of revenue from equipment

  // Customer Acquisition Cost (simplified)
  const customerAcquisitionCost = calculateCAC(expenses * 0.1, Math.max(1, state.customerCount * 0.1));

  // Employee Turnover (simplified - random for now)
  const employeeTurnoverRate = calculateEmployeeTurnover(Math.floor(Math.random() * 2), state.employees);

  // Inventory Turnover
  const inventoryTurnover = calculateInventoryTurnover(expenses * 0.6, state.inventory);

  // Debt-to-Equity
  const equity = state.cash + state.equipment - state.loans; // Simplified
  const debtToEquityRatio = calculateDebtToEquity(state.loans, Math.max(1, equity));

  // Working Capital
  const currentAssets = state.cash + state.receivables + state.inventory;
  const currentLiabilities = state.payables + state.loanPayments;
  const workingCapital = calculateWorkingCapital(currentAssets, currentLiabilities);

  // Gross Margin (assume COGS is 60% of revenue)
  const grossMargin = calculateGrossMargin(revenue, revenue * 0.6);

  // Operating Margin
  const operatingMargin = calculateOperatingMargin(profit, revenue);

  // Market Penetration
  const marketPenetration = calculateMarketPenetration(state.customerCount, state.marketSize * 100);

  // Competitive Advantage
  const competitiveAdvantage = calculateCompetitiveAdvantage(
    state.quality,
    state.reputation,
    state.marketShare,
    state.capacity / 100 // Innovation proxy
  );

  return {
    roi,
    customerAcquisitionCost,
    employeeTurnoverRate,
    inventoryTurnover,
    debtToEquityRatio,
    workingCapital,
    grossMargin,
    operatingMargin,
    marketPenetration,
    competitiveAdvantage,
  };
}
