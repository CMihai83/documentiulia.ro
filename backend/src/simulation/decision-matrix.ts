/**
 * Decision Impact Matrix
 * Complete decision definitions with impacts and risks
 * Based on Grok AI recommendations - Sprint 25
 */

import { ROMANIAN_MARKET_2025, calculateEmployerCost } from './romanian-market.model';

export type DecisionCategory =
  | 'FINANCIAL'
  | 'OPERATIONS'
  | 'HR'
  | 'MARKETING'
  | 'COMPLIANCE'
  | 'GROWTH'
  | 'RISK';

export interface DecisionParameter {
  name: string;
  type: 'number' | 'select' | 'boolean';
  min?: number;
  max?: number;
  options?: string[];
  default?: any;
  unit?: string;
}

export interface ImpactFormula {
  metric: string;
  formula: string; // Expression to evaluate
  timing: 'immediate' | 'monthly' | 'delayed';
  delay?: number; // Months delay if timing is 'delayed'
}

export interface RiskFactor {
  condition: string;
  probability: number;
  impact: Record<string, number>;
}

export interface Decision {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  category: DecisionCategory;
  icon: string;
  parameters: DecisionParameter[];
  immediateImpacts: Record<string, string>; // metric: formula
  monthlyImpacts: Record<string, string>;
  risks: RiskFactor[];
  requirements?: string[]; // Conditions that must be met
  cooldown?: number; // Months before can use again
  relatedCourseId?: string;
}

// =====================================================
// FINANCIAL DECISIONS
// =====================================================

export const FINANCIAL_DECISIONS: Decision[] = [
  {
    id: 'SET_PRICES',
    name: 'Set Prices',
    nameRo: 'Modifică Prețurile',
    description: 'Adjust product/service prices by a percentage',
    descriptionRo: 'Ajustează prețurile produselor/serviciilor cu un procent',
    category: 'FINANCIAL',
    icon: '💰',
    parameters: [
      {
        name: 'percentChange',
        type: 'number',
        min: -50,
        max: 50,
        default: 0,
        unit: '%',
      },
    ],
    immediateImpacts: {
      price: 'price * (1 + percentChange / 100)',
    },
    monthlyImpacts: {
      revenue: 'revenue * pow(1 + percentChange / 100, -1.5)', // Price elasticity
      customerCount: 'customerCount * (1 - percentChange / 200)', // Customer sensitivity
    },
    risks: [
      {
        condition: 'percentChange > 15',
        probability: 0.3,
        impact: { customerCount: -0.1, reputation: -2 },
      },
      {
        condition: 'percentChange < -20',
        probability: 0.2,
        impact: { reputation: -3 }, // Perceived as low quality
      },
    ],
    relatedCourseId: 'pricing-strategy',
  },
  {
    id: 'TAKE_LOAN',
    name: 'Take a Loan',
    nameRo: 'Ia un Credit',
    description: 'Obtain financing from a bank',
    descriptionRo: 'Obține finanțare de la bancă',
    category: 'FINANCIAL',
    icon: '🏦',
    parameters: [
      {
        name: 'amount',
        type: 'number',
        min: 10000,
        max: 1000000,
        default: 50000,
        unit: 'RON',
      },
      {
        name: 'termMonths',
        type: 'select',
        options: ['12', '24', '36', '60'],
        default: '36',
      },
    ],
    immediateImpacts: {
      cash: 'cash + amount',
      loans: 'loans + amount',
    },
    monthlyImpacts: {
      loanPayments: 'amount / termMonths + amount * 0.095 / 12', // Principal + interest
      expenses: 'expenses + amount * 0.095 / 12', // Interest expense
    },
    risks: [
      {
        condition: 'loans > cash * 3',
        probability: 0.4,
        impact: { auditRisk: 5, penaltiesRisk: 3 },
      },
    ],
    requirements: ['cash > 0', 'complianceScore > 50'],
    relatedCourseId: 'finantare-startup-romania-2025',
  },
  {
    id: 'COLLECT_RECEIVABLES',
    name: 'Collect Receivables',
    nameRo: 'Colectează Creanțe',
    description: 'Intensify collection efforts for outstanding invoices',
    descriptionRo: 'Intensifică eforturile de colectare a facturilor restante',
    category: 'FINANCIAL',
    icon: '📞',
    parameters: [
      {
        name: 'effort',
        type: 'select',
        options: ['low', 'medium', 'high', 'aggressive'],
        default: 'medium',
      },
    ],
    immediateImpacts: {
      cash: 'cash + receivables * (effort === "aggressive" ? 0.7 : effort === "high" ? 0.5 : effort === "medium" ? 0.3 : 0.1)',
      receivables: 'receivables * (1 - (effort === "aggressive" ? 0.7 : effort === "high" ? 0.5 : effort === "medium" ? 0.3 : 0.1))',
    },
    monthlyImpacts: {},
    risks: [
      {
        condition: 'effort === "aggressive"',
        probability: 0.25,
        impact: { reputation: -3, customerSatisfaction: -5 },
      },
    ],
    cooldown: 1,
  },
  {
    id: 'PAY_SUPPLIERS',
    name: 'Pay Suppliers',
    nameRo: 'Plătește Furnizorii',
    description: 'Pay outstanding supplier invoices',
    descriptionRo: 'Achită facturile restante către furnizori',
    category: 'FINANCIAL',
    icon: '📋',
    parameters: [
      {
        name: 'paymentPercent',
        type: 'number',
        min: 10,
        max: 100,
        default: 50,
        unit: '%',
      },
    ],
    immediateImpacts: {
      cash: 'cash - payables * (paymentPercent / 100)',
      payables: 'payables * (1 - paymentPercent / 100)',
    },
    monthlyImpacts: {
      reputation: 'reputation + paymentPercent / 50', // Better supplier relations
    },
    risks: [
      {
        condition: 'cash < payables * paymentPercent / 100',
        probability: 1.0,
        impact: { cash: 0 }, // Cannot pay more than you have
      },
    ],
  },
  {
    id: 'INVEST_CASH',
    name: 'Invest Cash',
    nameRo: 'Investește Disponibilul',
    description: 'Invest excess cash for returns',
    descriptionRo: 'Investește disponibilul în exces pentru randament',
    category: 'FINANCIAL',
    icon: '📈',
    parameters: [
      {
        name: 'amount',
        type: 'number',
        min: 5000,
        max: 500000,
        unit: 'RON',
      },
      {
        name: 'type',
        type: 'select',
        options: ['deposit', 'bonds', 'stocks'],
        default: 'deposit',
      },
    ],
    immediateImpacts: {
      cash: 'cash - amount',
    },
    monthlyImpacts: {
      revenue: 'revenue + amount * (type === "stocks" ? 0.012 : type === "bonds" ? 0.006 : 0.004)',
    },
    risks: [
      {
        condition: 'type === "stocks"',
        probability: 0.15,
        impact: { cash: -0.1 }, // 10% loss risk
      },
    ],
    requirements: ['cash > amount * 1.5'],
  },
];

// =====================================================
// OPERATIONS DECISIONS
// =====================================================

export const OPERATIONS_DECISIONS: Decision[] = [
  {
    id: 'HIRE_EMPLOYEE',
    name: 'Hire Employee',
    nameRo: 'Angajează',
    description: 'Add a new team member',
    descriptionRo: 'Adaugă un nou membru în echipă',
    category: 'HR',
    icon: '👤',
    parameters: [
      {
        name: 'role',
        type: 'select',
        options: ['junior', 'senior', 'manager'],
        default: 'junior',
      },
      {
        name: 'salary',
        type: 'number',
        min: 3700,
        max: 50000,
        default: 5000,
        unit: 'RON',
      },
    ],
    immediateImpacts: {
      cash: 'cash - salary', // First month advance
      employees: 'employees + 1',
      hasEmployees: 'true',
    },
    monthlyImpacts: {
      expenses: 'expenses + salary * 1.0225', // With employer contributions
      capacity: 'capacity + (role === "manager" ? 150 : role === "senior" ? 100 : 50)',
      quality: 'quality + (role === "manager" ? 3 : role === "senior" ? 2 : 1)',
    },
    risks: [
      {
        condition: 'utilization > 90 && role === "junior"',
        probability: 0.2,
        impact: { quality: -2, morale: -3 },
      },
      {
        condition: 'employees > 10 && morale < 60',
        probability: 0.15,
        impact: { morale: -5 },
      },
    ],
    relatedCourseId: 'primii-angajati',
  },
  {
    id: 'FIRE_EMPLOYEE',
    name: 'Fire Employee',
    nameRo: 'Concediază',
    description: 'Reduce staff with severance',
    descriptionRo: 'Reduce personalul cu compensație',
    category: 'HR',
    icon: '👋',
    parameters: [
      {
        name: 'severanceMonths',
        type: 'number',
        min: 1,
        max: 6,
        default: 2,
      },
    ],
    immediateImpacts: {
      cash: 'cash - averageSalary * severanceMonths',
      employees: 'max(1, employees - 1)',
    },
    monthlyImpacts: {
      expenses: 'expenses - averageSalary * 1.0225',
      capacity: 'capacity - 75', // Average capacity loss
      morale: 'morale - 5',
    },
    risks: [
      {
        condition: 'severanceMonths < 2',
        probability: 0.3,
        impact: { reputation: -3, morale: -8 },
      },
    ],
    requirements: ['employees > 1'],
  },
  {
    id: 'BUY_EQUIPMENT',
    name: 'Buy Equipment',
    nameRo: 'Cumpără Echipament',
    description: 'Invest in new equipment to increase capacity',
    descriptionRo: 'Investește în echipamente noi pentru creșterea capacității',
    category: 'OPERATIONS',
    icon: '🔧',
    parameters: [
      {
        name: 'cost',
        type: 'number',
        min: 5000,
        max: 500000,
        default: 20000,
        unit: 'RON',
      },
      {
        name: 'capacityIncrease',
        type: 'number',
        min: 10,
        max: 200,
        default: 50,
        unit: '%',
      },
    ],
    immediateImpacts: {
      cash: 'cash - cost',
      equipment: 'equipment + cost',
    },
    monthlyImpacts: {
      capacity: 'capacity + capacityIncrease',
      expenses: 'expenses + cost * 0.0042', // Depreciation
      quality: 'quality + capacityIncrease * 0.1',
    },
    risks: [
      {
        condition: 'employees < capacityIncrease / 25',
        probability: 0.3,
        impact: { utilization: -10 },
      },
    ],
    requirements: ['cash >= cost'],
  },
  {
    id: 'ORDER_INVENTORY',
    name: 'Order Inventory',
    nameRo: 'Comandă Stocuri',
    description: 'Restock inventory for production/sales',
    descriptionRo: 'Reaprovizionează inventarul pentru producție/vânzări',
    category: 'OPERATIONS',
    icon: '📦',
    parameters: [
      {
        name: 'amount',
        type: 'number',
        min: 1000,
        max: 200000,
        default: 10000,
        unit: 'RON',
      },
    ],
    immediateImpacts: {
      cash: 'cash - amount * 0.3', // 30% upfront
      payables: 'payables + amount * 0.7', // 70% on credit
      inventory: 'inventory + amount',
    },
    monthlyImpacts: {},
    risks: [
      {
        condition: 'inventory > revenue * 3',
        probability: 0.2,
        impact: { cash: -0.05 }, // Excess inventory costs
      },
    ],
  },
  {
    id: 'IMPROVE_QUALITY',
    name: 'Improve Quality',
    nameRo: 'Îmbunătățește Calitatea',
    description: 'Invest in quality control and processes',
    descriptionRo: 'Investește în controlul calității și procese',
    category: 'OPERATIONS',
    icon: '⭐',
    parameters: [
      {
        name: 'investment',
        type: 'number',
        min: 2000,
        max: 50000,
        default: 10000,
        unit: 'RON',
      },
    ],
    immediateImpacts: {
      cash: 'cash - investment',
    },
    monthlyImpacts: {
      quality: 'min(100, quality + investment / 2000)',
      customerSatisfaction: 'min(100, customerSatisfaction + investment / 5000)',
    },
    risks: [],
    cooldown: 2,
  },
];

// =====================================================
// MARKETING DECISIONS
// =====================================================

export const MARKETING_DECISIONS: Decision[] = [
  {
    id: 'RUN_CAMPAIGN',
    name: 'Marketing Campaign',
    nameRo: 'Campanie Marketing',
    description: 'Launch an advertising campaign',
    descriptionRo: 'Lansează o campanie publicitară',
    category: 'MARKETING',
    icon: '📣',
    parameters: [
      {
        name: 'budget',
        type: 'number',
        min: 1000,
        max: 100000,
        default: 5000,
        unit: 'RON',
      },
      {
        name: 'channel',
        type: 'select',
        options: ['social', 'google', 'tv', 'print', 'influencer'],
        default: 'social',
      },
    ],
    immediateImpacts: {
      cash: 'cash - budget',
    },
    monthlyImpacts: {
      customerCount: 'customerCount + budget * (channel === "social" ? 0.01 : channel === "google" ? 0.008 : 0.005)',
      reputation: 'reputation + budget / 10000',
      marketShare: 'marketShare + budget / 50000',
    },
    risks: [
      {
        condition: 'quality < 60',
        probability: 0.3,
        impact: { reputation: -5 }, // Bad reviews
      },
    ],
    cooldown: 1,
    relatedCourseId: 'marketing-digital',
  },
  {
    id: 'SOCIAL_MEDIA',
    name: 'Social Media Push',
    nameRo: 'Prezență Social Media',
    description: 'Intensify social media presence',
    descriptionRo: 'Intensifică prezența pe rețelele sociale',
    category: 'MARKETING',
    icon: '📱',
    parameters: [
      {
        name: 'hours',
        type: 'number',
        min: 5,
        max: 40,
        default: 10,
        unit: 'ore/săptămână',
      },
    ],
    immediateImpacts: {},
    monthlyImpacts: {
      reputation: 'reputation + hours * 0.2',
      customerCount: 'customerCount * (1 + hours * 0.005)',
    },
    risks: [
      {
        condition: 'hours > 20 && employees < 3',
        probability: 0.2,
        impact: { utilization: 10, quality: -2 },
      },
    ],
  },
  {
    id: 'DISCOUNT_PROMOTION',
    name: 'Discount Promotion',
    nameRo: 'Promoție Discount',
    description: 'Offer temporary discounts to boost sales',
    descriptionRo: 'Oferă reduceri temporare pentru creșterea vânzărilor',
    category: 'MARKETING',
    icon: '🏷️',
    parameters: [
      {
        name: 'discountPercent',
        type: 'number',
        min: 5,
        max: 50,
        default: 15,
        unit: '%',
      },
      {
        name: 'durationWeeks',
        type: 'number',
        min: 1,
        max: 4,
        default: 2,
        unit: 'săptămâni',
      },
    ],
    immediateImpacts: {},
    monthlyImpacts: {
      revenue: 'revenue * (1 - discountPercent / 100) * (1 + discountPercent / 50)',
      customerCount: 'customerCount * (1 + discountPercent / 100)',
    },
    risks: [
      {
        condition: 'discountPercent > 30',
        probability: 0.25,
        impact: { reputation: -2 }, // Perceived as low quality
      },
    ],
    cooldown: 2,
  },
  {
    id: 'REFERRAL_PROGRAM',
    name: 'Referral Program',
    nameRo: 'Program Recomandări',
    description: 'Reward customers for referrals',
    descriptionRo: 'Recompensează clienții pentru recomandări',
    category: 'MARKETING',
    icon: '🤝',
    parameters: [
      {
        name: 'rewardAmount',
        type: 'number',
        min: 50,
        max: 500,
        default: 100,
        unit: 'RON',
      },
    ],
    immediateImpacts: {},
    monthlyImpacts: {
      customerCount: 'customerCount * (1 + rewardAmount / 1000)',
      expenses: 'expenses + customerCount * 0.05 * rewardAmount',
      reputation: 'reputation + 1',
    },
    risks: [],
    cooldown: 3,
  },
];

// =====================================================
// COMPLIANCE DECISIONS
// =====================================================

export const COMPLIANCE_DECISIONS: Decision[] = [
  {
    id: 'PAY_TAXES',
    name: 'Pay Taxes',
    nameRo: 'Plătește Taxele',
    description: 'Pay outstanding tax obligations',
    descriptionRo: 'Achită obligațiile fiscale restante',
    category: 'COMPLIANCE',
    icon: '🏛️',
    parameters: [
      {
        name: 'paymentPercent',
        type: 'number',
        min: 10,
        max: 100,
        default: 100,
        unit: '%',
      },
    ],
    immediateImpacts: {
      cash: 'cash - taxOwed * (paymentPercent / 100)',
      taxOwed: 'taxOwed * (1 - paymentPercent / 100)',
    },
    monthlyImpacts: {
      auditRisk: 'max(5, auditRisk - paymentPercent / 10)',
      penaltiesRisk: 'max(0, penaltiesRisk - paymentPercent / 5)',
      complianceScore: 'min(100, complianceScore + paymentPercent / 5)',
    },
    risks: [],
    requirements: ['cash >= taxOwed * paymentPercent / 100'],
    relatedCourseId: 'conformitate-legala-firme-noi',
  },
  {
    id: 'SUBMIT_VAT',
    name: 'Submit VAT Declaration',
    nameRo: 'Depune Decont TVA',
    description: 'Submit monthly VAT declaration',
    descriptionRo: 'Depune decontul lunar de TVA',
    category: 'COMPLIANCE',
    icon: '📄',
    parameters: [],
    immediateImpacts: {
      cash: 'cash - max(0, vatBalance)',
      vatBalance: '0',
    },
    monthlyImpacts: {
      complianceScore: 'min(100, complianceScore + 5)',
      auditRisk: 'max(5, auditRisk - 2)',
    },
    risks: [
      {
        condition: 'cash < vatBalance',
        probability: 1.0,
        impact: { penaltiesRisk: 10, auditRisk: 5 },
      },
    ],
  },
  {
    id: 'PREPARE_AUDIT',
    name: 'Prepare for Audit',
    nameRo: 'Pregătește Audit',
    description: 'Organize documentation for potential audit',
    descriptionRo: 'Organizează documentația pentru un potențial control',
    category: 'COMPLIANCE',
    icon: '📁',
    parameters: [
      {
        name: 'hoursInvested',
        type: 'number',
        min: 4,
        max: 40,
        default: 16,
        unit: 'ore',
      },
    ],
    immediateImpacts: {
      cash: 'cash - hoursInvested * 100', // Cost of preparation
    },
    monthlyImpacts: {
      auditRisk: 'max(5, auditRisk - hoursInvested)',
      penaltiesRisk: 'max(0, penaltiesRisk - hoursInvested / 2)',
      complianceScore: 'min(100, complianceScore + hoursInvested / 4)',
    },
    risks: [],
    cooldown: 3,
  },
  {
    id: 'SAFT_REPORT',
    name: 'SAF-T D406 Report',
    nameRo: 'Raport SAF-T D406',
    description: 'Generate and submit SAF-T D406 monthly report',
    descriptionRo: 'Generează și trimite raportul lunar SAF-T D406',
    category: 'COMPLIANCE',
    icon: '📊',
    parameters: [],
    immediateImpacts: {},
    monthlyImpacts: {
      complianceScore: 'min(100, complianceScore + 10)',
      auditRisk: 'max(5, auditRisk - 5)',
    },
    risks: [
      {
        condition: 'complianceScore < 50',
        probability: 0.2,
        impact: { penaltiesRisk: 5 }, // Errors in report
      },
    ],
    relatedCourseId: 'saft-romania',
  },
  {
    id: 'COMPLIANCE_TRAINING',
    name: 'Compliance Training',
    nameRo: 'Training Conformitate',
    description: 'Train employees on compliance requirements',
    descriptionRo: 'Instruiește angajații privind cerințele de conformitate',
    category: 'COMPLIANCE',
    icon: '📚',
    parameters: [
      {
        name: 'hoursPerEmployee',
        type: 'number',
        min: 2,
        max: 16,
        default: 4,
        unit: 'ore',
      },
    ],
    immediateImpacts: {
      cash: 'cash - employees * hoursPerEmployee * 50',
    },
    monthlyImpacts: {
      complianceScore: 'min(100, complianceScore + hoursPerEmployee * 2)',
      auditRisk: 'max(5, auditRisk - hoursPerEmployee)',
      quality: 'min(100, quality + hoursPerEmployee * 0.5)',
    },
    risks: [
      {
        condition: 'hoursPerEmployee > 8',
        probability: 0.15,
        impact: { utilization: -5, morale: -2 },
      },
    ],
    cooldown: 2,
  },
];

// =====================================================
// CAPEX & INVESTMENT DECISIONS
// =====================================================

export const CAPEX_DECISIONS: Decision[] = [
  {
    id: 'MAJOR_EQUIPMENT',
    name: 'Major Equipment Investment',
    nameRo: 'Investiție Echipamente Majore',
    description: 'Invest in major production equipment or technology',
    descriptionRo: 'Investește în echipamente majore de producție sau tehnologie',
    category: 'GROWTH',
    icon: '🏭',
    parameters: [
      {
        name: 'amount',
        type: 'number',
        min: 50000,
        max: 500000,
        default: 100000,
        unit: 'RON',
      },
      {
        name: 'type',
        type: 'select',
        options: ['production', 'technology', 'automation', 'green'],
        default: 'production',
      },
    ],
    immediateImpacts: {
      cash: 'cash - amount',
      equipment: 'equipment + amount * 0.9', // 10% installation costs
    },
    monthlyImpacts: {
      capacity: 'capacity + amount / 5000',
      quality: 'quality + (type === "technology" ? 5 : 2)',
      expenses: 'expenses - amount * 0.005', // Efficiency savings
    },
    risks: [
      {
        condition: 'cash - amount < 20000',
        probability: 0.4,
        impact: { penaltiesRisk: 10, auditRisk: 5 },
      },
    ],
    requirements: ['cash >= amount * 1.2'],
    relatedCourseId: 'investitii-afaceri',
  },
  {
    id: 'EXPAND_FACILITY',
    name: 'Expand Production Facility',
    nameRo: 'Extinde Facilitatea de Producție',
    description: 'Expand or upgrade production facilities',
    descriptionRo: 'Extinde sau modernizează facilitățile de producție',
    category: 'GROWTH',
    icon: '🏗️',
    parameters: [
      {
        name: 'investment',
        type: 'number',
        min: 100000,
        max: 1000000,
        default: 200000,
        unit: 'RON',
      },
    ],
    immediateImpacts: {
      cash: 'cash - investment',
      equipment: 'equipment + investment * 0.8',
    },
    monthlyImpacts: {
      capacity: 'capacity + investment / 3000',
      marketShare: 'marketShare + investment / 100000',
    },
    risks: [
      {
        condition: 'investment > 300000',
        probability: 0.2,
        impact: { utilization: -20 }, // Temporary disruption
      },
    ],
    requirements: ['cash >= investment'],
    cooldown: 6,
  },
  {
    id: 'ROI_ANALYSIS',
    name: 'ROI Analysis Project',
    nameRo: 'Analiză Rentabilitate Investiție',
    description: 'Commission detailed ROI analysis before major investment',
    descriptionRo: 'Comandă analiza detaliată de ROI înainte de investiție majoră',
    category: 'FINANCIAL',
    icon: '📊',
    parameters: [
      {
        name: 'projectType',
        type: 'select',
        options: ['equipment', 'expansion', 'technology', 'acquisition'],
        default: 'equipment',
      },
    ],
    immediateImpacts: {
      cash: 'cash - 5000',
    },
    monthlyImpacts: {
      quality: 'quality + 2', // Better decision making
      auditRisk: 'max(5, auditRisk - 3)',
    },
    risks: [],
    cooldown: 3,
    relatedCourseId: 'analiza-financiara',
  },
];

// =====================================================
// EUROPEAN FUNDS DECISIONS
// =====================================================

export const EU_FUNDS_DECISIONS: Decision[] = [
  {
    id: 'APPLY_PNRR',
    name: 'Apply for PNRR Funding',
    nameRo: 'Aplică pentru Fonduri PNRR',
    description: 'Submit application for Romanian Recovery and Resilience Plan funds',
    descriptionRo: 'Depune aplicație pentru fonduri din Planul Național de Redresare și Reziliență',
    category: 'GROWTH',
    icon: '🇪🇺',
    parameters: [
      {
        name: 'projectValue',
        type: 'number',
        min: 50000,
        max: 500000,
        default: 100000,
        unit: 'RON',
      },
      {
        name: 'category',
        type: 'select',
        options: ['digitalization', 'green_transition', 'innovation', 'training'],
        default: 'digitalization',
      },
    ],
    immediateImpacts: {
      cash: 'cash - projectValue * 0.1', // Application and preparation costs
    },
    monthlyImpacts: {
      reputation: 'reputation + 3',
      complianceScore: 'min(100, complianceScore + 5)',
    },
    risks: [
      {
        condition: 'complianceScore < 70',
        probability: 0.6,
        impact: { cash: -5000 }, // Application rejected, wasted costs
      },
      {
        condition: 'projectValue > 200000',
        probability: 0.3,
        impact: { auditRisk: 15 }, // Higher scrutiny
      },
    ],
    requirements: ['complianceScore >= 60'],
    cooldown: 6,
    relatedCourseId: 'fonduri-europene',
  },
  {
    id: 'APPLY_POCU',
    name: 'Apply for HR Development Funds',
    nameRo: 'Aplică pentru Fonduri Dezvoltare Resurse Umane',
    description: 'Submit application for POCU human capital development funds',
    descriptionRo: 'Depune aplicație pentru fonduri POCU dezvoltare capital uman',
    category: 'HR',
    icon: '👥',
    parameters: [
      {
        name: 'trainingBudget',
        type: 'number',
        min: 20000,
        max: 100000,
        default: 40000,
        unit: 'RON',
      },
    ],
    immediateImpacts: {
      cash: 'cash - trainingBudget * 0.05',
    },
    monthlyImpacts: {
      quality: 'min(100, quality + trainingBudget / 10000)',
      morale: 'min(100, morale + 5)',
    },
    risks: [
      {
        condition: 'employees < 5',
        probability: 0.4,
        impact: { cash: -2000 }, // Application complexity for small teams
      },
    ],
    requirements: ['employees >= 3'],
    cooldown: 12,
  },
  {
    id: 'APPLY_AFIR',
    name: 'Apply for AFIR Agriculture Funds',
    nameRo: 'Aplică pentru Fonduri AFIR',
    description: 'Submit application for agricultural and rural development funds',
    descriptionRo: 'Depune aplicație pentru fonduri agricultură și dezvoltare rurală',
    category: 'GROWTH',
    icon: '🌾',
    parameters: [
      {
        name: 'projectValue',
        type: 'number',
        min: 30000,
        max: 300000,
        default: 75000,
        unit: 'RON',
      },
    ],
    immediateImpacts: {
      cash: 'cash - projectValue * 0.08',
    },
    monthlyImpacts: {
      capacity: 'capacity + projectValue / 8000',
      reputation: 'reputation + 2',
    },
    risks: [
      {
        condition: 'industry !== "Agriculture"',
        probability: 0.8,
        impact: { cash: -3000 }, // Wrong industry
      },
    ],
    cooldown: 12,
  },
  {
    id: 'EU_GRANT_MANAGEMENT',
    name: 'Manage EU Grant Implementation',
    nameRo: 'Gestionează Implementarea Grantului UE',
    description: 'Hire consultant or train staff for EU grant management',
    descriptionRo: 'Angajează consultant sau instruiește personalul pentru gestionarea grantului UE',
    category: 'COMPLIANCE',
    icon: '📋',
    parameters: [
      {
        name: 'option',
        type: 'select',
        options: ['consultant', 'internal_training', 'both'],
        default: 'consultant',
      },
    ],
    immediateImpacts: {
      cash: 'cash - (option === "consultant" ? 15000 : option === "internal_training" ? 8000 : 20000)',
    },
    monthlyImpacts: {
      complianceScore: 'min(100, complianceScore + (option === "both" ? 10 : 5))',
      auditRisk: 'max(5, auditRisk - (option === "both" ? 10 : 5))',
    },
    risks: [],
    cooldown: 6,
  },
];

// =====================================================
// STOCK & INVENTORY DECISIONS
// =====================================================

export const STOCK_DECISIONS: Decision[] = [
  {
    id: 'INCREASE_STOCK',
    name: 'Increase Safety Stock',
    nameRo: 'Mărește Stocul de Siguranță',
    description: 'Increase inventory levels to prevent stockouts',
    descriptionRo: 'Mărește nivelurile de inventar pentru a preveni rupturile de stoc',
    category: 'OPERATIONS',
    icon: '📦',
    parameters: [
      {
        name: 'amount',
        type: 'number',
        min: 5000,
        max: 100000,
        default: 20000,
        unit: 'RON',
      },
    ],
    immediateImpacts: {
      cash: 'cash - amount',
      inventory: 'inventory + amount',
    },
    monthlyImpacts: {
      utilization: 'min(100, utilization + 5)', // Can meet demand
      customerSatisfaction: 'min(100, customerSatisfaction + 3)',
    },
    risks: [
      {
        condition: 'amount > 50000',
        probability: 0.15,
        impact: { cash: -2500 }, // Obsolescence risk (fixed estimate)
      },
    ],
    requirements: ['cash >= amount'],
    relatedCourseId: 'gestiune-stocuri',
  },
  {
    id: 'REDUCE_STOCK',
    name: 'Reduce Excess Inventory',
    nameRo: 'Reduce Inventarul în Exces',
    description: 'Liquidate slow-moving inventory at a discount',
    descriptionRo: 'Lichidează inventarul cu rotație lentă cu reducere',
    category: 'OPERATIONS',
    icon: '📉',
    parameters: [
      {
        name: 'percentToSell',
        type: 'number',
        min: 10,
        max: 50,
        default: 25,
        unit: '%',
      },
      {
        name: 'discountPercent',
        type: 'number',
        min: 10,
        max: 50,
        default: 30,
        unit: '%',
      },
    ],
    immediateImpacts: {
      cash: 'cash + inventory * (percentToSell / 100) * (1 - discountPercent / 100)',
      inventory: 'inventory * (1 - percentToSell / 100)',
    },
    monthlyImpacts: {
      expenses: 'expenses - inventory * 0.002', // Lower carrying costs
    },
    risks: [
      {
        condition: 'discountPercent > 40',
        probability: 0.2,
        impact: { reputation: -3 }, // Perceived as distressed sale
      },
    ],
  },
  {
    id: 'JIT_IMPLEMENTATION',
    name: 'Implement Just-In-Time Inventory',
    nameRo: 'Implementează Inventar Just-In-Time',
    description: 'Transform to just-in-time inventory management',
    descriptionRo: 'Transformă la gestionare inventar just-in-time',
    category: 'OPERATIONS',
    icon: '⏱️',
    parameters: [],
    immediateImpacts: {
      cash: 'cash - 25000', // Implementation costs
    },
    monthlyImpacts: {
      inventory: 'inventory * 0.7', // 30% reduction over time
      expenses: 'expenses - inventory * 0.01', // Lower carrying costs
      quality: 'min(100, quality + 3)', // Fresher inputs
    },
    risks: [
      {
        condition: 'true',
        probability: 0.25,
        impact: { utilization: -15 }, // Supply disruption risk
      },
    ],
    cooldown: 12,
  },
];

// =====================================================
// PRODUCTION PLANNING DECISIONS
// =====================================================

export const PRODUCTION_DECISIONS: Decision[] = [
  {
    id: 'INCREASE_CAPACITY',
    name: 'Increase Production Capacity',
    nameRo: 'Mărește Capacitatea de Producție',
    description: 'Add shifts or overtime to increase output',
    descriptionRo: 'Adaugă ture sau ore suplimentare pentru a crește producția',
    category: 'OPERATIONS',
    icon: '⚡',
    parameters: [
      {
        name: 'method',
        type: 'select',
        options: ['overtime', 'extra_shift', 'weekend_work'],
        default: 'overtime',
      },
      {
        name: 'capacityIncrease',
        type: 'number',
        min: 10,
        max: 50,
        default: 20,
        unit: '%',
      },
    ],
    immediateImpacts: {},
    monthlyImpacts: {
      capacity: 'capacity + capacityIncrease',
      expenses: 'expenses + employees * averageSalary * (capacityIncrease / 100) * 1.5', // Overtime premium
      morale: 'morale - capacityIncrease / 5',
    },
    risks: [
      {
        condition: 'capacityIncrease > 30',
        probability: 0.3,
        impact: { quality: -5, morale: -10 },
      },
    ],
    cooldown: 1,
  },
  {
    id: 'PRODUCTION_OPTIMIZATION',
    name: 'Production Line Optimization',
    nameRo: 'Optimizare Linie de Producție',
    description: 'Hire consultant to optimize production flow',
    descriptionRo: 'Angajează consultant pentru optimizarea fluxului de producție',
    category: 'OPERATIONS',
    icon: '🔧',
    parameters: [
      {
        name: 'investmentLevel',
        type: 'select',
        options: ['basic', 'standard', 'comprehensive'],
        default: 'standard',
      },
    ],
    immediateImpacts: {
      cash: 'cash - (investmentLevel === "basic" ? 10000 : investmentLevel === "standard" ? 25000 : 50000)',
    },
    monthlyImpacts: {
      capacity: 'capacity + (investmentLevel === "basic" ? 5 : investmentLevel === "standard" ? 10 : 20)',
      quality: 'min(100, quality + (investmentLevel === "comprehensive" ? 5 : 2))',
      expenses: 'expenses * (1 - (investmentLevel === "basic" ? 0.02 : investmentLevel === "standard" ? 0.05 : 0.10))',
    },
    risks: [],
    cooldown: 6,
    relatedCourseId: 'managementul-productiei',
  },
  {
    id: 'DEMAND_FORECAST',
    name: 'Implement Demand Forecasting',
    nameRo: 'Implementează Prognoza Cererii',
    description: 'Deploy AI-powered demand forecasting system',
    descriptionRo: 'Implementează sistem de prognoză cerere bazat pe AI',
    category: 'OPERATIONS',
    icon: '🔮',
    parameters: [],
    immediateImpacts: {
      cash: 'cash - 35000',
    },
    monthlyImpacts: {
      inventory: 'inventory * 0.9', // Better inventory management
      customerSatisfaction: 'min(100, customerSatisfaction + 5)',
      utilization: 'min(100, utilization + 5)',
    },
    risks: [
      {
        condition: 'employees < 5',
        probability: 0.3,
        impact: { cash: -5000 }, // System underutilized
      },
    ],
    cooldown: 12,
  },
  {
    id: 'SEASONAL_PLANNING',
    name: 'Seasonal Production Planning',
    nameRo: 'Planificare Producție Sezonieră',
    description: 'Adjust production for seasonal demand patterns',
    descriptionRo: 'Ajustează producția pentru modelele sezoniere de cerere',
    category: 'OPERATIONS',
    icon: '📅',
    parameters: [
      {
        name: 'season',
        type: 'select',
        options: ['peak_preparation', 'off_peak_maintenance', 'transition'],
        default: 'peak_preparation',
      },
    ],
    immediateImpacts: {},
    monthlyImpacts: {
      capacity: 'capacity + (season === "peak_preparation" ? 15 : season === "off_peak_maintenance" ? -10 : 0)',
      quality: 'min(100, quality + (season === "off_peak_maintenance" ? 5 : 0))',
      expenses: 'expenses * (season === "peak_preparation" ? 1.1 : 0.95)',
    },
    risks: [
      {
        condition: 'season === "peak_preparation"',
        probability: 0.2,
        impact: { morale: -5 },
      },
    ],
  },
];

// =====================================================
// ALL DECISIONS
// =====================================================

export const ALL_DECISIONS: Decision[] = [
  ...FINANCIAL_DECISIONS,
  ...OPERATIONS_DECISIONS,
  ...MARKETING_DECISIONS,
  ...COMPLIANCE_DECISIONS,
  ...CAPEX_DECISIONS,
  ...EU_FUNDS_DECISIONS,
  ...STOCK_DECISIONS,
  ...PRODUCTION_DECISIONS,
];

/**
 * Get decisions by category
 */
export function getDecisionsByCategory(category: DecisionCategory): Decision[] {
  return ALL_DECISIONS.filter(d => d.category === category);
}

/**
 * Get decision by ID
 */
export function getDecisionById(id: string): Decision | undefined {
  return ALL_DECISIONS.find(d => d.id === id);
}

/**
 * Evaluate a decision's impacts
 */
export function evaluateDecisionImpacts(
  decision: Decision,
  params: Record<string, any>,
  currentState: Record<string, any>
): { immediate: Record<string, number>; monthly: Record<string, number> } {
  const context = { ...currentState, ...params };

  const immediate: Record<string, number> = {};
  const monthly: Record<string, number> = {};

  // Evaluate immediate impacts
  for (const [metric, formula] of Object.entries(decision.immediateImpacts)) {
    immediate[metric] = evaluateFormula(formula, context);
  }

  // Evaluate monthly impacts
  for (const [metric, formula] of Object.entries(decision.monthlyImpacts)) {
    monthly[metric] = evaluateFormula(formula, context);
  }

  return { immediate, monthly };
}

/**
 * Simple formula evaluator
 */
function evaluateFormula(formula: string, context: Record<string, any>): number {
  try {
    // Replace variables with values
    let expr = formula;
    for (const [key, value] of Object.entries(context)) {
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      expr = expr.replace(regex, String(value));
    }

    // Add math functions
    expr = expr.replace(/min\(/g, 'Math.min(');
    expr = expr.replace(/max\(/g, 'Math.max(');
    expr = expr.replace(/pow\(/g, 'Math.pow(');

    // Evaluate (safe for simple math expressions)
    const result = Function(`"use strict"; return (${expr})`)();
    return typeof result === 'number' ? result : 0;
  } catch {
    return 0;
  }
}

// Alias for service compatibility
export const DECISIONS = ALL_DECISIONS;

/**
 * Apply a decision to the current state
 * Returns new state and impacts
 */
export function applyDecision(
  state: Record<string, any>,
  decision: Decision,
  parameters: Record<string, any>
): { newState: Record<string, any>; impacts: Record<string, number> } {
  const { immediate, monthly } = evaluateDecisionImpacts(decision, parameters, state);

  const newState = { ...state };
  const impacts: Record<string, number> = {};

  // Apply immediate impacts
  for (const [metric, value] of Object.entries(immediate)) {
    const oldValue = newState[metric] || 0;
    newState[metric] = value;
    impacts[metric] = value - oldValue;
  }

  // Store monthly impacts for future processing
  newState._pendingMonthlyImpacts = {
    ...(state._pendingMonthlyImpacts || {}),
    [decision.id]: monthly,
  };

  return { newState, impacts };
}
