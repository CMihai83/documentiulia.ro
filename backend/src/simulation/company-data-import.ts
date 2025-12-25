/**
 * Company Data Import System
 * Import real business data from DocumentIulia.ro as simulation starting point
 * Based on Grok AI world-class recommendations - Sprint 25
 */

import { SimulationState } from './business-logic.engine';
import { ROMANIAN_MARKET_2025, getIndustryMargin } from './romanian-market.model';

export interface CompanyFinancials {
  // Balance Sheet
  cash: number;
  receivables: number;
  inventory: number;
  equipment: number;
  totalAssets: number;
  payables: number;
  loans: number;
  totalLiabilities: number;
  equity: number;

  // Income Statement (last 12 months average)
  monthlyRevenue: number;
  monthlyExpenses: number;
  monthlySalaries: number;
  monthlyProfit: number;
  profitMargin: number;

  // Tax Status
  taxOwed: number;
  vatBalance: number;
  lastTaxPayment: Date | null;
}

export interface CompanyOperations {
  employees: number;
  averageSalary: number;
  productionCapacity: number;
  currentUtilization: number;
  qualityScore: number; // From customer feedback if available
}

export interface CompanyMarket {
  industry: string;
  customerCount: number;
  averageOrderValue: number;
  monthlyOrders: number;
  competitorCount: number;
  estimatedMarketSize: number;
}

export interface CompanyCompliance {
  isMicroEnterprise: boolean;
  hasEmployees: boolean;
  vatRegistered: boolean;
  eFacturaEnabled: boolean;
  saftEnabled: boolean;
  lastAuditDate: Date | null;
  auditResult: 'PASS' | 'MINOR_ISSUES' | 'MAJOR_ISSUES' | null;
  complianceScore: number;
}

export interface CompanyImportData {
  businessId: string;
  businessName: string;
  cui: string; // Romanian company ID
  registrationDate: Date;
  financials: CompanyFinancials;
  operations: CompanyOperations;
  market: CompanyMarket;
  compliance: CompanyCompliance;
  importedAt: Date;
}

export interface SimulationInitConfig {
  mode: 'REAL_DATA' | 'SCENARIO' | 'WHAT_IF';
  whatIfMultipliers?: {
    revenue?: number;
    expenses?: number;
    customers?: number;
    employees?: number;
  };
  scenarioModifiers?: {
    crisisLevel?: number; // 0-1, applies revenue drop
    growthRate?: number;  // multiplier for market size
    competitionLevel?: number; // affects margins
  };
}

// =====================================================
// IMPORT FROM DOCUMENTULIA DATABASE
// =====================================================

/**
 * Import company data from DocumentIulia.ro database
 * This would connect to the actual business/accounting data
 */
export async function importCompanyData(businessId: string): Promise<CompanyImportData | null> {
  // In real implementation, this queries the database
  // For now, we simulate the import structure

  // TODO: Replace with actual Prisma queries
  /*
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      invoices: true,
      expenses: true,
      employees: true,
      bankAccounts: true,
      taxDeclarations: true,
    }
  });
  */

  return null; // Placeholder - implement with real DB queries
}

/**
 * Calculate financials from invoice and expense data
 */
export function calculateFinancialsFromTransactions(
  invoices: any[],
  expenses: any[],
  bankBalance: number,
  loanData: any[]
): CompanyFinancials {
  // Last 12 months
  const now = new Date();
  const twelveMonthsAgo = new Date(now.setMonth(now.getMonth() - 12));

  const recentInvoices = invoices.filter(i => new Date(i.date) >= twelveMonthsAgo);
  const recentExpenses = expenses.filter(e => new Date(e.date) >= twelveMonthsAgo);

  const totalRevenue = recentInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const totalExpenses = recentExpenses.reduce((sum, e) => sum + e.amount, 0);

  const monthlyRevenue = totalRevenue / 12;
  const monthlyExpenses = totalExpenses / 12;
  const monthlyProfit = monthlyRevenue - monthlyExpenses;

  // Calculate receivables (unpaid invoices)
  const receivables = invoices
    .filter(i => i.status === 'PENDING' || i.status === 'OVERDUE')
    .reduce((sum, i) => sum + i.totalAmount, 0);

  // Calculate payables (unpaid expenses)
  const payables = expenses
    .filter(e => e.status === 'PENDING')
    .reduce((sum, e) => sum + e.amount, 0);

  // Calculate loans
  const totalLoans = loanData.reduce((sum, l) => sum + l.remainingBalance, 0);

  return {
    cash: bankBalance,
    receivables,
    inventory: 0, // Would need inventory module data
    equipment: 0, // Would need asset register data
    totalAssets: bankBalance + receivables,
    payables,
    loans: totalLoans,
    totalLiabilities: payables + totalLoans,
    equity: (bankBalance + receivables) - (payables + totalLoans),
    monthlyRevenue,
    monthlyExpenses,
    monthlySalaries: 0, // Would need payroll data
    monthlyProfit,
    profitMargin: monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : 0,
    taxOwed: 0,
    vatBalance: 0,
    lastTaxPayment: null,
  };
}

// =====================================================
// CONVERT TO SIMULATION STATE
// =====================================================

/**
 * Convert imported company data to simulation initial state
 */
export function convertToSimulationState(
  companyData: CompanyImportData,
  config: SimulationInitConfig
): Partial<SimulationState> {
  const { financials, operations, market, compliance } = companyData;

  // Get industry margin for calibration
  const industryMargin = getIndustryMargin(market.industry);

  // Base state from real data
  let state: Partial<SimulationState> = {
    // Financial (in RON)
    cash: financials.cash,
    revenue: financials.monthlyRevenue,
    expenses: financials.monthlyExpenses,
    profit: financials.monthlyProfit,
    receivables: financials.receivables,
    payables: financials.payables,
    inventory: financials.inventory,
    equipment: financials.equipment,
    loans: financials.loans,
    loanPayments: financials.loans > 0 ? financials.loans / 36 : 0, // Assume 3-year term

    // Operations
    employees: operations.employees,
    averageSalary: operations.averageSalary,
    capacity: operations.productionCapacity,
    utilization: operations.currentUtilization,
    quality: operations.qualityScore || 75,
    morale: 70, // Default, would need employee survey data

    // Market
    price: market.averageOrderValue,
    basePrice: market.averageOrderValue,
    marketSize: market.estimatedMarketSize,
    marketShare: market.customerCount / (market.estimatedMarketSize * 0.01),
    customerCount: market.customerCount,
    reputation: 60 + (operations.qualityScore - 50) * 0.4, // Estimate from quality
    customerSatisfaction: operations.qualityScore || 70,

    // Compliance
    taxOwed: financials.taxOwed,
    vatBalance: financials.vatBalance,
    penaltiesRisk: compliance.auditResult === 'MAJOR_ISSUES' ? 30 :
                   compliance.auditResult === 'MINOR_ISSUES' ? 10 : 0,
    auditRisk: calculateAuditRisk(compliance),
    complianceScore: compliance.complianceScore,

    // Meta
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    industry: market.industry,
    isMicro: compliance.isMicroEnterprise,
    hasEmployees: compliance.hasEmployees,
  };

  // Apply what-if multipliers
  if (config.mode === 'WHAT_IF' && config.whatIfMultipliers) {
    const m = config.whatIfMultipliers;
    if (m.revenue) state.revenue = (state.revenue || 0) * m.revenue;
    if (m.expenses) state.expenses = (state.expenses || 0) * m.expenses;
    if (m.customers) state.customerCount = Math.round((state.customerCount || 0) * m.customers);
    if (m.employees) state.employees = Math.round((state.employees || 0) * m.employees);
  }

  // Apply scenario modifiers
  if (config.scenarioModifiers) {
    const s = config.scenarioModifiers;
    if (s.crisisLevel) {
      state.revenue = (state.revenue || 0) * (1 - s.crisisLevel);
      state.customerCount = Math.round((state.customerCount || 0) * (1 - s.crisisLevel * 0.5));
    }
    if (s.growthRate) {
      state.marketSize = (state.marketSize || 0) * s.growthRate;
    }
    if (s.competitionLevel) {
      // Higher competition = lower margins
      const marginPressure = 1 - (s.competitionLevel * 0.2);
      state.profit = (state.profit || 0) * marginPressure;
    }
  }

  return state;
}

/**
 * Calculate audit risk based on compliance factors
 */
function calculateAuditRisk(compliance: CompanyCompliance): number {
  let risk = 5; // Base risk

  // Factors that increase risk
  if (!compliance.eFacturaEnabled) risk += 10;
  if (!compliance.saftEnabled) risk += 10;
  if (compliance.complianceScore < 70) risk += 15;
  if (compliance.auditResult === 'MAJOR_ISSUES') risk += 20;
  if (compliance.auditResult === 'MINOR_ISSUES') risk += 10;

  // Time since last audit (if never audited, higher risk)
  if (!compliance.lastAuditDate) {
    risk += 5;
  } else {
    const monthsSinceAudit = Math.floor(
      (Date.now() - compliance.lastAuditDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    if (monthsSinceAudit > 36) risk += 10;
  }

  return Math.min(100, Math.max(0, risk));
}

// =====================================================
// WHAT-IF SCENARIO PRESETS
// =====================================================

export interface WhatIfPreset {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  icon: string;
  config: SimulationInitConfig;
}

export const WHAT_IF_PRESETS: WhatIfPreset[] = [
  {
    id: 'current-state',
    name: 'Current State',
    nameRo: 'Starea Curentă',
    description: 'Start with your exact current business state',
    descriptionRo: 'Începe cu starea exactă actuală a afacerii tale',
    icon: '📊',
    config: {
      mode: 'REAL_DATA',
    },
  },
  {
    id: 'revenue-double',
    name: 'Revenue Doubles',
    nameRo: 'Venituri Duble',
    description: 'What if your revenue suddenly doubled?',
    descriptionRo: 'Ce-ar fi dacă veniturile tale s-ar dubla brusc?',
    icon: '📈',
    config: {
      mode: 'WHAT_IF',
      whatIfMultipliers: { revenue: 2.0, customers: 1.5 },
    },
  },
  {
    id: 'revenue-drop-30',
    name: '30% Revenue Drop',
    nameRo: 'Scădere Venituri 30%',
    description: 'What if you lost 30% of revenue?',
    descriptionRo: 'Ce-ar fi dacă ai pierde 30% din venituri?',
    icon: '📉',
    config: {
      mode: 'WHAT_IF',
      whatIfMultipliers: { revenue: 0.7 },
    },
  },
  {
    id: 'economic-crisis',
    name: 'Economic Crisis',
    nameRo: 'Criză Economică',
    description: 'Simulate a severe economic downturn',
    descriptionRo: 'Simulează o recesiune economică severă',
    icon: '🌪️',
    config: {
      mode: 'WHAT_IF',
      scenarioModifiers: { crisisLevel: 0.4 },
    },
  },
  {
    id: 'rapid-expansion',
    name: 'Rapid Expansion',
    nameRo: 'Expansiune Rapidă',
    description: 'What if the market grows 3x?',
    descriptionRo: 'Ce-ar fi dacă piața crește de 3x?',
    icon: '🚀',
    config: {
      mode: 'WHAT_IF',
      scenarioModifiers: { growthRate: 3.0 },
    },
  },
  {
    id: 'team-growth',
    name: 'Double Your Team',
    nameRo: 'Dublează Echipa',
    description: 'What if you doubled your employees?',
    descriptionRo: 'Ce-ar fi dacă ai dubla angajații?',
    icon: '👥',
    config: {
      mode: 'WHAT_IF',
      whatIfMultipliers: { employees: 2.0, expenses: 1.4 },
    },
  },
  {
    id: 'price-war',
    name: 'Price War',
    nameRo: 'Război al Prețurilor',
    description: 'What if competition intensifies?',
    descriptionRo: 'Ce-ar fi dacă concurența se intensifică?',
    icon: '⚔️',
    config: {
      mode: 'WHAT_IF',
      scenarioModifiers: { competitionLevel: 0.8 },
    },
  },
  {
    id: 'best-case',
    name: 'Best Case Scenario',
    nameRo: 'Cel Mai Bun Caz',
    description: 'Everything goes perfectly',
    descriptionRo: 'Totul merge perfect',
    icon: '🌟',
    config: {
      mode: 'WHAT_IF',
      whatIfMultipliers: { revenue: 1.5, customers: 1.3 },
      scenarioModifiers: { growthRate: 1.5 },
    },
  },
  {
    id: 'worst-case',
    name: 'Worst Case Scenario',
    nameRo: 'Cel Mai Rău Caz',
    description: 'Stress test your business',
    descriptionRo: 'Testează rezistența afacerii tale',
    icon: '💀',
    config: {
      mode: 'WHAT_IF',
      whatIfMultipliers: { revenue: 0.5, customers: 0.6 },
      scenarioModifiers: { crisisLevel: 0.3, competitionLevel: 0.5 },
    },
  },
];

// =====================================================
// INDUSTRY-SPECIFIC SCENARIOS
// =====================================================

export interface IndustryScenario {
  id: string;
  industry: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  baseState: Partial<SimulationState>;
  specificEvents: string[]; // Event IDs that are more likely
  specificDecisions: string[]; // Decision IDs that are highlighted
  learningObjectives: string[];
}

export const INDUSTRY_SCENARIOS: IndustryScenario[] = [
  {
    id: 'it-startup',
    industry: 'IT',
    name: 'Tech Startup',
    nameRo: 'Startup Tehnologic',
    description: 'Build and scale a technology startup',
    descriptionRo: 'Construiește și scalează un startup tehnologic',
    baseState: {
      cash: 100000,
      revenue: 15000,
      expenses: 20000,
      employees: 3,
      averageSalary: 12000,
      capacity: 100,
      utilization: 60,
      quality: 85,
      customerCount: 15,
      industry: 'IT',
      isMicro: true,
    },
    specificEvents: ['INVESTOR_INTEREST', 'TECHNOLOGY_BREAKTHROUGH', 'CYBER_ATTACK', 'HIRING_CHALLENGE'],
    specificDecisions: ['HIRE_EMPLOYEE', 'INVEST_CASH', 'RUN_CAMPAIGN'],
    learningObjectives: [
      'Manage cash burn rate',
      'Scale team effectively',
      'Achieve product-market fit',
      'Secure funding',
    ],
  },
  {
    id: 'manufacturing-sme',
    industry: 'Manufacturing',
    name: 'Manufacturing SME',
    nameRo: 'IMM Producție',
    description: 'Run a manufacturing small business',
    descriptionRo: 'Conduce o afacere mică de producție',
    baseState: {
      cash: 200000,
      revenue: 80000,
      expenses: 70000,
      employees: 25,
      averageSalary: 5000,
      capacity: 500,
      utilization: 75,
      quality: 80,
      inventory: 50000,
      equipment: 300000,
      customerCount: 50,
      industry: 'Manufacturing',
      isMicro: false,
    },
    specificEvents: ['SUPPLY_CHAIN_DISRUPTION', 'LABOR_LAW_CHANGE', 'WORKPLACE_INCIDENT', 'MAJOR_CONTRACT'],
    specificDecisions: ['BUY_EQUIPMENT', 'ORDER_INVENTORY', 'IMPROVE_QUALITY', 'HIRE_EMPLOYEE'],
    learningObjectives: [
      'Optimize production efficiency',
      'Manage supply chain',
      'Control quality',
      'Handle labor relations',
    ],
  },
  {
    id: 'retail-shop',
    industry: 'Retail',
    name: 'Retail Store',
    nameRo: 'Magazin Retail',
    description: 'Manage a retail store business',
    descriptionRo: 'Administrează un magazin retail',
    baseState: {
      cash: 50000,
      revenue: 40000,
      expenses: 35000,
      employees: 5,
      averageSalary: 4500,
      capacity: 200,
      utilization: 65,
      quality: 75,
      inventory: 80000,
      customerCount: 200,
      industry: 'Retail',
      isMicro: true,
    },
    specificEvents: ['SEASONAL_BOOM', 'COMPETITOR_PRICE_WAR', 'CUSTOMER_COMPLAINT', 'VIRAL_MARKETING'],
    specificDecisions: ['SET_PRICES', 'ORDER_INVENTORY', 'DISCOUNT_PROMOTION', 'SOCIAL_MEDIA'],
    learningObjectives: [
      'Master inventory management',
      'Optimize pricing strategy',
      'Build customer loyalty',
      'Manage seasonality',
    ],
  },
  {
    id: 'horeca-restaurant',
    industry: 'HoReCa',
    name: 'Restaurant',
    nameRo: 'Restaurant',
    description: 'Run a restaurant business',
    descriptionRo: 'Conduce un restaurant',
    baseState: {
      cash: 80000,
      revenue: 60000,
      expenses: 55000,
      employees: 12,
      averageSalary: 4000,
      capacity: 150,
      utilization: 55,
      quality: 82,
      inventory: 15000,
      customerCount: 500,
      industry: 'HoReCa',
      isMicro: false,
    },
    specificEvents: ['SEASONAL_BOOM', 'CUSTOMER_COMPLAINT', 'SICK_LEAVE_WAVE', 'MEDIA_COVERAGE', 'INSPECTION'],
    specificDecisions: ['HIRE_EMPLOYEE', 'IMPROVE_QUALITY', 'RUN_CAMPAIGN', 'REFERRAL_PROGRAM'],
    learningObjectives: [
      'Manage food costs',
      'Maintain quality consistency',
      'Handle peak seasons',
      'Build reputation',
    ],
  },
  {
    id: 'consulting-firm',
    industry: 'Consulting',
    name: 'Consulting Firm',
    nameRo: 'Firmă de Consultanță',
    description: 'Build a professional services firm',
    descriptionRo: 'Construiește o firmă de servicii profesionale',
    baseState: {
      cash: 150000,
      revenue: 100000,
      expenses: 75000,
      employees: 8,
      averageSalary: 10000,
      capacity: 160,
      utilization: 70,
      quality: 88,
      customerCount: 25,
      industry: 'Consulting',
      isMicro: false,
    },
    specificEvents: ['KEY_EMPLOYEE_RESIGNATION', 'MAJOR_CONTRACT', 'PARTNERSHIP_OPPORTUNITY', 'SALARY_DEMAND'],
    specificDecisions: ['HIRE_EMPLOYEE', 'SET_PRICES', 'COMPLIANCE_TRAINING', 'RUN_CAMPAIGN'],
    learningObjectives: [
      'Retain key talent',
      'Win major clients',
      'Scale expertise',
      'Manage utilization',
    ],
  },
];

/**
 * Get industry scenario by ID
 */
export function getIndustryScenario(id: string): IndustryScenario | undefined {
  return INDUSTRY_SCENARIOS.find(s => s.id === id);
}

/**
 * Get all scenarios for an industry
 */
export function getScenariosByIndustry(industry: string): IndustryScenario[] {
  return INDUSTRY_SCENARIOS.filter(s => s.industry === industry);
}
