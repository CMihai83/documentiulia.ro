import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Freelancer Compliance & Tax Forms Service
// PFA tax form generation, cross-border VAT handling, misclassification risk AI reviewer,
// and international tax document generation (1099/W-9 equivalents)

// ===== TYPES =====

export interface FreelancerTaxProfile {
  id: string;
  freelancerId: string;
  // Romanian tax info
  taxIdType: 'CNP' | 'CUI' | 'CIF'; // Personal ID, Company ID, Fiscal ID
  taxId: string;
  entityType: 'PFA' | 'SRL' | 'II' | 'IF'; // Persoană Fizică Autorizată, SRL, etc.
  registrationNumber?: string; // ONRC registration
  tradeRegisterNumber?: string; // J-number
  // Address
  address: TaxAddress;
  // Banking
  bankAccount: string;
  bankName: string;
  swiftCode?: string;
  // VAT
  vatRegistered: boolean;
  vatNumber?: string;
  vatScheme: 'NORMAL' | 'SPECIAL' | 'EXEMPT'; // Normal, Special regime for small businesses, Exempt
  vatThreshold: number; // 300,000 RON for 2025
  // Tax regime
  taxRegime: 'INCOME_TAX' | 'MICRO' | 'NORM'; // 10% income, 1%/3% micro, income norms
  microTaxRate?: number; // 1% with employees, 3% without
  // Social contributions
  casOptIn: boolean; // CAS (pension) opt-in for PFA
  cassOptIn: boolean; // CASS (health) opt-in
  // International
  taxResidency: string; // ISO country code
  taxTreatyCountries: string[]; // Countries with tax treaties
  createdAt: Date;
  updatedAt: Date;
}

export interface TaxAddress {
  street: string;
  city: string;
  county: string;
  postalCode: string;
  country: string;
}

export interface IncomeDeclaration {
  id: string;
  freelancerId: string;
  declarationType: 'D212' | 'D200' | 'D201' | 'D207' | 'D394';
  // D212: Declarație unică (main annual declaration)
  // D200: Income tax declaration
  // D201: Informative declaration
  // D207: Income from independent activities
  // D394: Informative statement for supplies/acquisitions
  fiscalYear: number;
  quarter?: number; // For quarterly declarations
  status: 'DRAFT' | 'VALIDATED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'AMENDED';
  income: IncomeBreakdown;
  deductions: DeductionBreakdown;
  taxes: TaxCalculation;
  xmlContent?: string;
  pdfUrl?: string;
  submissionId?: string;
  submittedAt?: Date;
  anafResponse?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IncomeBreakdown {
  grossIncome: number;
  bySource: IncomeSource[];
  byCountry: CountryIncome[];
  totalDomestic: number;
  totalForeign: number;
}

export interface IncomeSource {
  clientId: string;
  clientName: string;
  clientCountry: string;
  clientVatNumber?: string;
  amount: number;
  currency: string;
  amountRON: number;
  invoiceCount: number;
  withholdingTax?: number;
}

export interface CountryIncome {
  country: string;
  amount: number;
  amountRON: number;
  taxTreatyApplied: boolean;
  withholdingTaxRate?: number;
  withholdingTaxPaid?: number;
  taxCreditAvailable?: number;
}

export interface DeductionBreakdown {
  totalDeductions: number;
  items: DeductionItem[];
}

export interface DeductionItem {
  category: 'BUSINESS_EXPENSE' | 'DEPRECIATION' | 'SOCIAL_CONTRIBUTIONS' | 'HEALTH_INSURANCE' |
            'PENSION' | 'PROFESSIONAL_FEES' | 'OFFICE_RENT' | 'EQUIPMENT' | 'SOFTWARE' |
            'TRAVEL' | 'TRAINING' | 'OTHER';
  description: string;
  amount: number;
  documentRef?: string;
  deductiblePercent: number; // Some expenses are only partially deductible
  deductibleAmount: number;
}

export interface TaxCalculation {
  taxableIncome: number;
  // Income tax
  incomeTaxRate: number;
  incomeTaxAmount: number;
  // Social contributions
  casBase: number;
  casRate: number; // 25%
  casAmount: number;
  cassBase: number;
  cassRate: number; // 10%
  cassAmount: number;
  // Total
  totalTaxDue: number;
  advancePaymentsMade: number;
  remainingDue: number;
  // Foreign tax credits
  foreignTaxCredits: number;
  effectiveTaxRate: number;
}

export interface CrossBorderTransaction {
  id: string;
  freelancerId: string;
  transactionType: 'SERVICE_EXPORT' | 'SERVICE_IMPORT' | 'GOODS_EXPORT' | 'GOODS_IMPORT';
  clientId: string;
  clientCountry: string;
  clientVatNumber?: string;
  isB2B: boolean;
  // Amounts
  amount: number;
  currency: string;
  amountEUR: number;
  amountRON: number;
  exchangeRate: number;
  // VAT treatment
  vatTreatment: 'REVERSE_CHARGE' | 'DOMESTIC_VAT' | 'EXEMPT' | 'ZERO_RATED' | 'OSS';
  vatRate: number;
  vatAmount: number;
  // Place of supply
  placeOfSupply: string;
  placeOfSupplyRule: 'B2B_CUSTOMER' | 'B2C_SUPPLIER' | 'B2C_CUSTOMER' | 'SPECIAL';
  // Reporting
  includeInIntrastat: boolean;
  includeInVIES: boolean;
  includeInRecap: boolean; // Recapitulative statement
  // Documents
  invoiceNumber: string;
  invoiceDate: Date;
  createdAt: Date;
}

export interface VATReturn {
  id: string;
  freelancerId: string;
  period: string; // YYYY-MM or YYYY-Q1/Q2/Q3/Q4
  periodType: 'MONTHLY' | 'QUARTERLY';
  status: 'DRAFT' | 'VALIDATED' | 'SUBMITTED' | 'ACCEPTED';
  // Domestic
  domesticSalesStandard: number; // 19%
  domesticSalesReduced: number; // 9%, 5%
  domesticSalesExempt: number;
  domesticPurchases: number;
  domesticVATCollected: number;
  domesticVATDeductible: number;
  // Intra-EU
  intraCommunitySupplies: number; // B2B reverse charge
  intraCommunityAcquisitions: number;
  // Exports/Imports
  exportsOutsideEU: number;
  importsFromOutsideEU: number;
  // OSS (One-Stop Shop for B2C digital services)
  ossRevenue: number;
  ossVATDue: number;
  // Totals
  totalVATCollected: number;
  totalVATDeductible: number;
  vatPayable: number;
  vatRefundable: number;
  netVATPosition: number;
  createdAt: Date;
}

export interface MisclassificationRisk {
  id: string;
  freelancerId: string;
  clientId: string;
  assessmentDate: Date;
  // Risk factors (based on OUG 79/2023 criteria)
  factors: MisclassificationFactor[];
  // Scoring
  totalScore: number;
  maxScore: number;
  riskPercentage: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  // AI analysis
  aiAnalysis: string;
  recommendations: string[];
  // Legal references
  legalBasis: string[];
  potentialPenalties: PenaltyEstimate;
  // Actions
  mitigationActions: MitigationAction[];
  status: 'PENDING_REVIEW' | 'REVIEWED' | 'MITIGATED' | 'ESCALATED';
}

export interface MisclassificationFactor {
  criterion: string;
  category: 'CONTROL' | 'ECONOMIC_DEPENDENCE' | 'INTEGRATION' | 'TOOLS' | 'SCHEDULE' | 'OTHER';
  weight: number;
  indicatesEmployment: boolean;
  score: number;
  evidence?: string;
  description: string;
}

export interface PenaltyEstimate {
  unpaidTaxes: number;
  socialContributions: number;
  penalties: number;
  interest: number;
  totalExposure: number;
  currency: string;
}

export interface MitigationAction {
  action: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  implementedAt?: Date;
  effectOnRisk: string;
}

export interface InternationalTaxDocument {
  id: string;
  freelancerId: string;
  documentType: 'W8_BEN' | 'W8_BEN_E' | 'W9' | 'TAX_RESIDENCY_CERT' | 'A1_CERTIFICATE' |
                'E101' | 'COE' | 'SELF_DECLARATION';
  // W-8BEN: Certificate of Foreign Status (for US clients paying non-US persons)
  // W-8BEN-E: Certificate of Foreign Status for Entities
  // W9: Request for Taxpayer ID (US persons)
  // A1: Social security coordination (EU Posted Workers)
  clientCountry: string;
  clientId?: string;
  // Document details
  beneficialOwner: string;
  countryOfResidence: string;
  taxIdNumber: string;
  taxIdType: string;
  // Treaty benefits
  claimsTreatyBenefits: boolean;
  treatyCountry?: string;
  treatyArticle?: string;
  withholdingRate?: number;
  // Document
  content: Record<string, any>;
  pdfUrl?: string;
  signedAt?: Date;
  signatureHash?: string;
  validFrom: Date;
  validUntil: Date;
  status: 'DRAFT' | 'SIGNED' | 'SUBMITTED' | 'VERIFIED' | 'EXPIRED';
  createdAt: Date;
}

export interface ComplianceAuditReport {
  id: string;
  freelancerId: string;
  auditPeriod: { start: Date; end: Date };
  auditType: 'ANNUAL' | 'QUARTERLY' | 'AD_HOC';
  // Compliance areas
  taxCompliance: ComplianceArea;
  vatCompliance: ComplianceArea;
  socialContributions: ComplianceArea;
  documentationCompliance: ComplianceArea;
  crossBorderCompliance: ComplianceArea;
  misclassificationRisk: ComplianceArea;
  // Overall
  overallScore: number;
  overallRating: 'EXCELLENT' | 'GOOD' | 'ACCEPTABLE' | 'NEEDS_IMPROVEMENT' | 'CRITICAL';
  findings: AuditFinding[];
  recommendations: string[];
  // Actions
  requiredActions: RequiredAction[];
  createdAt: Date;
}

export interface ComplianceArea {
  name: string;
  score: number;
  maxScore: number;
  percentage: number;
  status: 'COMPLIANT' | 'MINOR_ISSUES' | 'MAJOR_ISSUES' | 'NON_COMPLIANT';
  issues: string[];
}

export interface AuditFinding {
  id: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  finding: string;
  impact: string;
  recommendation: string;
  deadline?: Date;
}

export interface RequiredAction {
  action: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  deadline: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  completedAt?: Date;
}

@Injectable()
export class FreelancerComplianceService {
  // In-memory storage
  private taxProfiles = new Map<string, FreelancerTaxProfile>();
  private incomeDeclarations = new Map<string, IncomeDeclaration>();
  private crossBorderTransactions = new Map<string, CrossBorderTransaction>();
  private vatReturns = new Map<string, VATReturn>();
  private misclassificationRisks = new Map<string, MisclassificationRisk>();
  private internationalDocs = new Map<string, InternationalTaxDocument>();
  private auditReports = new Map<string, ComplianceAuditReport>();

  // Romanian tax constants for 2025
  private readonly TAX_CONSTANTS = {
    INCOME_TAX_RATE: 0.10, // 10%
    CAS_RATE: 0.25, // 25% pension contribution
    CASS_RATE: 0.10, // 10% health contribution
    CAS_THRESHOLD_MIN: 12 * 3300, // 12 minimum wages
    CAS_THRESHOLD_MAX: 12 * 3300 * 24, // 24 minimum wages cap
    MINIMUM_WAGE_2025: 3700, // RON gross
    VAT_THRESHOLD: 300000, // RON annual turnover
    VAT_STANDARD: 0.19,
    VAT_REDUCED_9: 0.09,
    VAT_REDUCED_5: 0.05,
    MICRO_TAX_WITH_EMPLOYEES: 0.01,
    MICRO_TAX_WITHOUT_EMPLOYEES: 0.03,
  };

  // EU VAT rates by country
  private readonly EU_VAT_RATES: Record<string, { standard: number; reduced: number[] }> = {
    RO: { standard: 19, reduced: [9, 5] },
    DE: { standard: 19, reduced: [7] },
    FR: { standard: 20, reduced: [10, 5.5, 2.1] },
    IT: { standard: 22, reduced: [10, 5, 4] },
    ES: { standard: 21, reduced: [10, 4] },
    NL: { standard: 21, reduced: [9] },
    BE: { standard: 21, reduced: [12, 6] },
    AT: { standard: 20, reduced: [13, 10] },
    PL: { standard: 23, reduced: [8, 5] },
    PT: { standard: 23, reduced: [13, 6] },
    GR: { standard: 24, reduced: [13, 6] },
    CZ: { standard: 21, reduced: [15, 10] },
    HU: { standard: 27, reduced: [18, 5] },
    SE: { standard: 25, reduced: [12, 6] },
    DK: { standard: 25, reduced: [] },
    FI: { standard: 24, reduced: [14, 10] },
    IE: { standard: 23, reduced: [13.5, 9, 4.8] },
    BG: { standard: 20, reduced: [9] },
    SK: { standard: 20, reduced: [10] },
    HR: { standard: 25, reduced: [13, 5] },
    SI: { standard: 22, reduced: [9.5, 5] },
    LT: { standard: 21, reduced: [9, 5] },
    LV: { standard: 21, reduced: [12, 5] },
    EE: { standard: 22, reduced: [9] },
    CY: { standard: 19, reduced: [9, 5] },
    MT: { standard: 18, reduced: [7, 5] },
    LU: { standard: 17, reduced: [14, 8, 3] },
  };

  // Tax treaty withholding rates for Romania
  private readonly TAX_TREATY_RATES: Record<string, { dividends: number; interest: number; royalties: number; services: number }> = {
    US: { dividends: 10, interest: 10, royalties: 10, services: 0 },
    UK: { dividends: 10, interest: 10, royalties: 10, services: 0 },
    DE: { dividends: 5, interest: 0, royalties: 0, services: 0 },
    FR: { dividends: 5, interest: 10, royalties: 10, services: 0 },
    NL: { dividends: 5, interest: 0, royalties: 0, services: 0 },
    CH: { dividends: 5, interest: 5, royalties: 0, services: 0 },
    AT: { dividends: 5, interest: 0, royalties: 3, services: 0 },
    IT: { dividends: 5, interest: 5, royalties: 5, services: 0 },
  };

  constructor(private configService: ConfigService) {}

  resetState(): void {
    this.taxProfiles.clear();
    this.incomeDeclarations.clear();
    this.crossBorderTransactions.clear();
    this.vatReturns.clear();
    this.misclassificationRisks.clear();
    this.internationalDocs.clear();
    this.auditReports.clear();
  }

  // ===== TAX PROFILE MANAGEMENT =====

  async createTaxProfile(data: Omit<FreelancerTaxProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<FreelancerTaxProfile> {
    const profileId = `txp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const profile: FreelancerTaxProfile = {
      id: profileId,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.taxProfiles.set(profileId, profile);
    return profile;
  }

  async getTaxProfile(profileId: string): Promise<FreelancerTaxProfile | null> {
    return this.taxProfiles.get(profileId) || null;
  }

  async getTaxProfileByFreelancer(freelancerId: string): Promise<FreelancerTaxProfile | null> {
    return Array.from(this.taxProfiles.values()).find(p => p.freelancerId === freelancerId) || null;
  }

  async updateTaxProfile(profileId: string, updates: Partial<FreelancerTaxProfile>): Promise<FreelancerTaxProfile> {
    const profile = this.taxProfiles.get(profileId);
    if (!profile) {
      throw new Error('Tax profile not found');
    }

    const updated = { ...profile, ...updates, updatedAt: new Date() };
    this.taxProfiles.set(profileId, updated);
    return updated;
  }

  // ===== PFA INCOME DECLARATION (D212) =====

  async generateIncomeDeclaration(data: {
    freelancerId: string;
    declarationType: IncomeDeclaration['declarationType'];
    fiscalYear: number;
    quarter?: number;
    incomeSources: Omit<IncomeSource, 'amountRON'>[];
    deductions: Omit<DeductionItem, 'deductibleAmount'>[];
    exchangeRates?: Record<string, number>;
  }): Promise<IncomeDeclaration> {
    const profile = await this.getTaxProfileByFreelancer(data.freelancerId);
    if (!profile) {
      throw new Error('Tax profile not found for freelancer');
    }

    const declarationId = `dec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Calculate income with RON conversion
    const defaultRates: Record<string, number> = { EUR: 4.97, USD: 4.55, GBP: 5.78, ...data.exchangeRates };

    const incomeBySource: IncomeSource[] = data.incomeSources.map(source => ({
      ...source,
      amountRON: source.currency === 'RON' ? source.amount : source.amount * (defaultRates[source.currency] || 1),
    }));

    const totalDomestic = incomeBySource
      .filter(s => s.clientCountry === 'RO')
      .reduce((sum, s) => sum + s.amountRON, 0);

    const totalForeign = incomeBySource
      .filter(s => s.clientCountry !== 'RO')
      .reduce((sum, s) => sum + s.amountRON, 0);

    const grossIncome = totalDomestic + totalForeign;

    // Group by country
    const countryMap = new Map<string, CountryIncome>();
    incomeBySource.forEach(source => {
      const existing = countryMap.get(source.clientCountry) || {
        country: source.clientCountry,
        amount: 0,
        amountRON: 0,
        taxTreatyApplied: false,
        withholdingTaxRate: 0,
        withholdingTaxPaid: 0,
        taxCreditAvailable: 0,
      };
      existing.amount += source.amount;
      existing.amountRON += source.amountRON;

      // Check tax treaty
      const treaty = this.TAX_TREATY_RATES[source.clientCountry];
      if (treaty) {
        existing.taxTreatyApplied = true;
        existing.withholdingTaxRate = treaty.services;
      }

      countryMap.set(source.clientCountry, existing);
    });

    // Calculate deductions
    const deductionItems: DeductionItem[] = data.deductions.map(d => ({
      ...d,
      deductibleAmount: d.amount * (d.deductiblePercent / 100),
    }));

    const totalDeductions = deductionItems.reduce((sum, d) => sum + d.deductibleAmount, 0);

    // Calculate taxes based on tax regime
    const taxableIncome = Math.max(0, grossIncome - totalDeductions);
    const taxes = this.calculateTaxes(profile, taxableIncome, grossIncome);

    const declaration: IncomeDeclaration = {
      id: declarationId,
      freelancerId: data.freelancerId,
      declarationType: data.declarationType,
      fiscalYear: data.fiscalYear,
      quarter: data.quarter,
      status: 'DRAFT',
      income: {
        grossIncome,
        bySource: incomeBySource,
        byCountry: Array.from(countryMap.values()),
        totalDomestic,
        totalForeign,
      },
      deductions: {
        totalDeductions,
        items: deductionItems,
      },
      taxes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.incomeDeclarations.set(declarationId, declaration);
    return declaration;
  }

  private calculateTaxes(profile: FreelancerTaxProfile, taxableIncome: number, grossIncome: number): TaxCalculation {
    let incomeTaxRate = this.TAX_CONSTANTS.INCOME_TAX_RATE;
    let incomeTaxAmount = 0;

    // Calculate income tax based on regime
    if (profile.taxRegime === 'MICRO') {
      incomeTaxRate = profile.microTaxRate || this.TAX_CONSTANTS.MICRO_TAX_WITHOUT_EMPLOYEES;
      incomeTaxAmount = grossIncome * incomeTaxRate;
    } else {
      incomeTaxAmount = taxableIncome * incomeTaxRate;
    }

    // Calculate social contributions (CAS - pension)
    let casBase = 0;
    let casAmount = 0;
    if (profile.casOptIn && grossIncome >= this.TAX_CONSTANTS.CAS_THRESHOLD_MIN) {
      casBase = Math.min(grossIncome, this.TAX_CONSTANTS.CAS_THRESHOLD_MAX);
      casAmount = casBase * this.TAX_CONSTANTS.CAS_RATE;
    }

    // Calculate health contributions (CASS)
    let cassBase = 0;
    let cassAmount = 0;
    if (profile.cassOptIn || grossIncome >= this.TAX_CONSTANTS.CAS_THRESHOLD_MIN) {
      cassBase = Math.min(grossIncome, this.TAX_CONSTANTS.CAS_THRESHOLD_MAX);
      cassAmount = cassBase * this.TAX_CONSTANTS.CASS_RATE;
    }

    const totalTaxDue = incomeTaxAmount + casAmount + cassAmount;
    const effectiveTaxRate = grossIncome > 0 ? (totalTaxDue / grossIncome) * 100 : 0;

    return {
      taxableIncome,
      incomeTaxRate,
      incomeTaxAmount,
      casBase,
      casRate: this.TAX_CONSTANTS.CAS_RATE,
      casAmount,
      cassBase,
      cassRate: this.TAX_CONSTANTS.CASS_RATE,
      cassAmount,
      totalTaxDue,
      advancePaymentsMade: 0,
      remainingDue: totalTaxDue,
      foreignTaxCredits: 0,
      effectiveTaxRate,
    };
  }

  async getIncomeDeclaration(declarationId: string): Promise<IncomeDeclaration | null> {
    return this.incomeDeclarations.get(declarationId) || null;
  }

  async getDeclarationsForFreelancer(freelancerId: string, fiscalYear?: number): Promise<IncomeDeclaration[]> {
    let declarations = Array.from(this.incomeDeclarations.values())
      .filter(d => d.freelancerId === freelancerId);

    if (fiscalYear) {
      declarations = declarations.filter(d => d.fiscalYear === fiscalYear);
    }

    return declarations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async validateDeclaration(declarationId: string): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    const declaration = this.incomeDeclarations.get(declarationId);
    if (!declaration) {
      throw new Error('Declaration not found');
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate income
    if (declaration.income.grossIncome <= 0) {
      errors.push('Gross income must be greater than zero');
    }

    // Validate sources have required fields
    declaration.income.bySource.forEach((source, index) => {
      if (!source.clientName) {
        errors.push(`Income source ${index + 1}: Client name is required`);
      }
      if (!source.clientCountry) {
        errors.push(`Income source ${index + 1}: Client country is required`);
      }
    });

    // Validate deductions
    const suspiciousDeductionRatio = declaration.deductions.totalDeductions / declaration.income.grossIncome;
    if (suspiciousDeductionRatio > 0.7) {
      warnings.push('Deductions exceed 70% of gross income - may trigger audit');
    }

    // Validate foreign income reporting
    if (declaration.income.totalForeign > 0) {
      const foreignWithoutVAT = declaration.income.bySource.filter(
        s => s.clientCountry !== 'RO' && !s.clientVatNumber
      );
      if (foreignWithoutVAT.length > 0) {
        warnings.push('Some foreign clients do not have VAT numbers - verify B2B status');
      }
    }

    const valid = errors.length === 0;

    if (valid) {
      declaration.status = 'VALIDATED';
      this.incomeDeclarations.set(declarationId, declaration);
    }

    return { valid, errors, warnings };
  }

  async submitDeclaration(declarationId: string): Promise<IncomeDeclaration> {
    const declaration = this.incomeDeclarations.get(declarationId);
    if (!declaration) {
      throw new Error('Declaration not found');
    }

    if (declaration.status !== 'VALIDATED') {
      throw new Error('Declaration must be validated before submission');
    }

    // Generate XML for ANAF
    declaration.xmlContent = this.generateDeclarationXML(declaration);
    declaration.status = 'SUBMITTED';
    declaration.submittedAt = new Date();
    declaration.submissionId = `ANAF-${Date.now()}`;
    declaration.updatedAt = new Date();

    this.incomeDeclarations.set(declarationId, declaration);
    return declaration;
  }

  private generateDeclarationXML(declaration: IncomeDeclaration): string {
    // Simplified XML generation - would be full ANAF schema in production
    return `<?xml version="1.0" encoding="UTF-8"?>
<declaratie xmlns="mfp:anaf:dgti:${declaration.declarationType.toLowerCase()}:declaratie:v1">
  <antet>
    <tip_declaratie>${declaration.declarationType}</tip_declaratie>
    <an_fiscal>${declaration.fiscalYear}</an_fiscal>
  </antet>
  <venituri>
    <total_brut>${declaration.income.grossIncome.toFixed(2)}</total_brut>
    <total_intern>${declaration.income.totalDomestic.toFixed(2)}</total_intern>
    <total_extern>${declaration.income.totalForeign.toFixed(2)}</total_extern>
  </venituri>
  <cheltuieli>
    <total_deductibil>${declaration.deductions.totalDeductions.toFixed(2)}</total_deductibil>
  </cheltuieli>
  <impozite>
    <venit_impozabil>${declaration.taxes.taxableIncome.toFixed(2)}</venit_impozabil>
    <impozit_venit>${declaration.taxes.incomeTaxAmount.toFixed(2)}</impozit_venit>
    <cas>${declaration.taxes.casAmount.toFixed(2)}</cas>
    <cass>${declaration.taxes.cassAmount.toFixed(2)}</cass>
    <total_datorat>${declaration.taxes.totalTaxDue.toFixed(2)}</total_datorat>
  </impozite>
</declaratie>`;
  }

  // ===== CROSS-BORDER VAT HANDLING =====

  async recordCrossBorderTransaction(data: {
    freelancerId: string;
    transactionType: CrossBorderTransaction['transactionType'];
    clientId: string;
    clientCountry: string;
    clientVatNumber?: string;
    isB2B: boolean;
    amount: number;
    currency: string;
    invoiceNumber: string;
    invoiceDate: Date;
    exchangeRate?: number;
  }): Promise<CrossBorderTransaction> {
    const transactionId = `cbt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Determine exchange rate
    const defaultRates: Record<string, number> = { EUR: 4.97, USD: 4.55, GBP: 5.78 };
    const exchangeRate = data.exchangeRate || defaultRates[data.currency] || 1;

    const amountEUR = data.currency === 'EUR' ? data.amount : data.amount / (defaultRates[data.currency] / defaultRates.EUR || 1);
    const amountRON = data.currency === 'RON' ? data.amount : data.amount * exchangeRate;

    // Determine VAT treatment and place of supply
    const isEU = Object.keys(this.EU_VAT_RATES).includes(data.clientCountry);
    let vatTreatment: CrossBorderTransaction['vatTreatment'] = 'DOMESTIC_VAT';
    let placeOfSupply = 'RO';
    let placeOfSupplyRule: CrossBorderTransaction['placeOfSupplyRule'] = 'B2B_CUSTOMER';
    let vatRate = 0;

    if (data.transactionType === 'SERVICE_EXPORT') {
      if (data.isB2B) {
        // B2B services - reverse charge, place of supply is customer's country
        vatTreatment = 'REVERSE_CHARGE';
        placeOfSupply = data.clientCountry;
        placeOfSupplyRule = 'B2B_CUSTOMER';
        vatRate = 0;
      } else {
        // B2C services - varies by service type
        if (isEU) {
          // Digital services to EU consumers - OSS applies
          vatTreatment = 'OSS';
          placeOfSupply = data.clientCountry;
          placeOfSupplyRule = 'B2C_CUSTOMER';
          vatRate = this.EU_VAT_RATES[data.clientCountry]?.standard || 0;
        } else {
          // B2C to non-EU - generally exempt/zero-rated
          vatTreatment = 'EXEMPT';
          placeOfSupply = data.clientCountry;
          placeOfSupplyRule = 'B2C_CUSTOMER';
          vatRate = 0;
        }
      }
    } else if (!isEU) {
      // Exports outside EU
      vatTreatment = 'ZERO_RATED';
      vatRate = 0;
    }

    const vatAmount = (amountRON * vatRate) / 100;

    const transaction: CrossBorderTransaction = {
      id: transactionId,
      freelancerId: data.freelancerId,
      transactionType: data.transactionType,
      clientId: data.clientId,
      clientCountry: data.clientCountry,
      clientVatNumber: data.clientVatNumber,
      isB2B: data.isB2B,
      amount: data.amount,
      currency: data.currency,
      amountEUR,
      amountRON,
      exchangeRate,
      vatTreatment,
      vatRate,
      vatAmount,
      placeOfSupply,
      placeOfSupplyRule,
      includeInIntrastat: isEU && data.transactionType.includes('GOODS') && amountEUR >= 900000,
      includeInVIES: isEU && data.isB2B && vatTreatment === 'REVERSE_CHARGE',
      includeInRecap: isEU && data.isB2B,
      invoiceNumber: data.invoiceNumber,
      invoiceDate: data.invoiceDate,
      createdAt: new Date(),
    };

    this.crossBorderTransactions.set(transactionId, transaction);
    return transaction;
  }

  async getTransactionsForFreelancer(freelancerId: string): Promise<CrossBorderTransaction[]> {
    return Array.from(this.crossBorderTransactions.values())
      .filter(t => t.freelancerId === freelancerId)
      .sort((a, b) => b.invoiceDate.getTime() - a.invoiceDate.getTime());
  }

  async generateVATReturn(freelancerId: string, period: string, periodType: 'MONTHLY' | 'QUARTERLY'): Promise<VATReturn> {
    const returnId = `vat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const transactions = await this.getTransactionsForFreelancer(freelancerId);

    // Filter transactions for the period
    const periodTransactions = transactions.filter(t => {
      const invoiceMonth = t.invoiceDate.toISOString().slice(0, 7);
      if (periodType === 'MONTHLY') {
        return invoiceMonth === period;
      } else {
        const [year, quarter] = period.split('-Q');
        const month = t.invoiceDate.getMonth() + 1;
        const quarterNum = Math.ceil(month / 3);
        return t.invoiceDate.getFullYear().toString() === year && quarterNum.toString() === quarter;
      }
    });

    // Calculate domestic sales
    const domesticSalesStandard = periodTransactions
      .filter(t => t.placeOfSupply === 'RO' && t.vatRate === 19)
      .reduce((sum, t) => sum + t.amountRON, 0);

    const domesticSalesReduced = periodTransactions
      .filter(t => t.placeOfSupply === 'RO' && (t.vatRate === 9 || t.vatRate === 5))
      .reduce((sum, t) => sum + t.amountRON, 0);

    const domesticSalesExempt = periodTransactions
      .filter(t => t.placeOfSupply === 'RO' && t.vatTreatment === 'EXEMPT')
      .reduce((sum, t) => sum + t.amountRON, 0);

    // Intra-EU
    const intraCommunitySupplies = periodTransactions
      .filter(t => t.vatTreatment === 'REVERSE_CHARGE' && t.transactionType === 'SERVICE_EXPORT')
      .reduce((sum, t) => sum + t.amountRON, 0);

    // Exports
    const exportsOutsideEU = periodTransactions
      .filter(t => t.vatTreatment === 'ZERO_RATED' || (t.vatTreatment === 'EXEMPT' && !Object.keys(this.EU_VAT_RATES).includes(t.clientCountry)))
      .reduce((sum, t) => sum + t.amountRON, 0);

    // OSS
    const ossTransactions = periodTransactions.filter(t => t.vatTreatment === 'OSS');
    const ossRevenue = ossTransactions.reduce((sum, t) => sum + t.amountRON, 0);
    const ossVATDue = ossTransactions.reduce((sum, t) => sum + t.vatAmount, 0);

    // Calculate totals
    const domesticVATCollected = (domesticSalesStandard * 0.19) + (domesticSalesReduced * 0.09);
    const totalVATCollected = domesticVATCollected + ossVATDue;
    const totalVATDeductible = 0; // Would come from purchase records

    const netVATPosition = totalVATCollected - totalVATDeductible;

    const vatReturn: VATReturn = {
      id: returnId,
      freelancerId,
      period,
      periodType,
      status: 'DRAFT',
      domesticSalesStandard,
      domesticSalesReduced,
      domesticSalesExempt,
      domesticPurchases: 0,
      domesticVATCollected,
      domesticVATDeductible: 0,
      intraCommunitySupplies,
      intraCommunityAcquisitions: 0,
      exportsOutsideEU,
      importsFromOutsideEU: 0,
      ossRevenue,
      ossVATDue,
      totalVATCollected,
      totalVATDeductible,
      vatPayable: netVATPosition > 0 ? netVATPosition : 0,
      vatRefundable: netVATPosition < 0 ? Math.abs(netVATPosition) : 0,
      netVATPosition,
      createdAt: new Date(),
    };

    this.vatReturns.set(returnId, vatReturn);
    return vatReturn;
  }

  // ===== MISCLASSIFICATION RISK ASSESSMENT =====

  async assessMisclassificationRisk(data: {
    freelancerId: string;
    clientId: string;
    workArrangement: {
      hasFixedSchedule: boolean;
      worksOnClientPremises: boolean;
      usesClientTools: boolean;
      hasMultipleClients: boolean;
      clientPercentageOfIncome: number;
      contractDuration: number; // months
      canRefuseWork: boolean;
      setsOwnRates: boolean;
      bearsBusinesRisk: boolean;
      hasOwnBrand: boolean;
      hasSubstitutionRight: boolean;
      receivesTraining: boolean;
      hasPerformanceReviews: boolean;
      integratedIntoOrg: boolean;
      exclusivityClause: boolean;
      paidByHour: boolean;
    };
  }): Promise<MisclassificationRisk> {
    const riskId = `mcr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const factors: MisclassificationFactor[] = [];
    let totalScore = 0;
    const maxScore = 100;

    // Control factors (most important - 40% weight)
    if (data.workArrangement.hasFixedSchedule) {
      factors.push({
        criterion: 'Fixed work schedule imposed by client',
        category: 'CONTROL',
        weight: 10,
        indicatesEmployment: true,
        score: 10,
        description: 'Worker must follow specific hours set by client',
      });
      totalScore += 10;
    }

    if (data.workArrangement.worksOnClientPremises) {
      factors.push({
        criterion: 'Work performed at client premises',
        category: 'CONTROL',
        weight: 8,
        indicatesEmployment: true,
        score: 8,
        description: 'Regular presence at client location required',
      });
      totalScore += 8;
    }

    if (data.workArrangement.receivesTraining) {
      factors.push({
        criterion: 'Training provided by client',
        category: 'CONTROL',
        weight: 7,
        indicatesEmployment: true,
        score: 7,
        description: 'Client provides job-specific training',
      });
      totalScore += 7;
    }

    if (data.workArrangement.hasPerformanceReviews) {
      factors.push({
        criterion: 'Subject to performance reviews',
        category: 'CONTROL',
        weight: 7,
        indicatesEmployment: true,
        score: 7,
        description: 'Regular performance evaluation by client',
      });
      totalScore += 7;
    }

    if (!data.workArrangement.canRefuseWork) {
      factors.push({
        criterion: 'Cannot refuse assigned work',
        category: 'CONTROL',
        weight: 8,
        indicatesEmployment: true,
        score: 8,
        description: 'Worker must accept all tasks assigned',
      });
      totalScore += 8;
    }

    // Economic dependence factors (30% weight)
    if (data.workArrangement.clientPercentageOfIncome > 70) {
      factors.push({
        criterion: 'High economic dependence (>70% income from single client)',
        category: 'ECONOMIC_DEPENDENCE',
        weight: 12,
        indicatesEmployment: true,
        score: 12,
        description: `${data.workArrangement.clientPercentageOfIncome}% of income from this client`,
      });
      totalScore += 12;
    } else if (data.workArrangement.clientPercentageOfIncome > 50) {
      factors.push({
        criterion: 'Moderate economic dependence (50-70% income)',
        category: 'ECONOMIC_DEPENDENCE',
        weight: 6,
        indicatesEmployment: true,
        score: 6,
        description: `${data.workArrangement.clientPercentageOfIncome}% of income from this client`,
      });
      totalScore += 6;
    }

    if (!data.workArrangement.hasMultipleClients) {
      factors.push({
        criterion: 'Single client relationship',
        category: 'ECONOMIC_DEPENDENCE',
        weight: 8,
        indicatesEmployment: true,
        score: 8,
        description: 'Worker has no other clients',
      });
      totalScore += 8;
    }

    if (data.workArrangement.exclusivityClause) {
      factors.push({
        criterion: 'Exclusivity clause in contract',
        category: 'ECONOMIC_DEPENDENCE',
        weight: 10,
        indicatesEmployment: true,
        score: 10,
        description: 'Contract prohibits working for competitors',
      });
      totalScore += 10;
    }

    // Integration factors (15% weight)
    if (data.workArrangement.integratedIntoOrg) {
      factors.push({
        criterion: 'Integrated into client organization',
        category: 'INTEGRATION',
        weight: 8,
        indicatesEmployment: true,
        score: 8,
        description: 'Worker appears as part of client team',
      });
      totalScore += 8;
    }

    if (data.workArrangement.contractDuration > 12) {
      factors.push({
        criterion: 'Long-term continuous engagement (>12 months)',
        category: 'INTEGRATION',
        weight: 5,
        indicatesEmployment: true,
        score: 5,
        description: `Contract duration: ${data.workArrangement.contractDuration} months`,
      });
      totalScore += 5;
    }

    // Tools and investment factors (10% weight)
    if (data.workArrangement.usesClientTools) {
      factors.push({
        criterion: 'Uses tools/equipment provided by client',
        category: 'TOOLS',
        weight: 5,
        indicatesEmployment: true,
        score: 5,
        description: 'Client provides necessary work tools',
      });
      totalScore += 5;
    }

    // Entrepreneurial factors (reduce score)
    if (data.workArrangement.setsOwnRates) {
      factors.push({
        criterion: 'Sets own rates',
        category: 'OTHER',
        weight: -5,
        indicatesEmployment: false,
        score: -5,
        description: 'Worker negotiates and sets own pricing',
      });
      totalScore = Math.max(0, totalScore - 5);
    }

    if (data.workArrangement.bearsBusinesRisk) {
      factors.push({
        criterion: 'Bears business/financial risk',
        category: 'OTHER',
        weight: -8,
        indicatesEmployment: false,
        score: -8,
        description: 'Worker has financial risk exposure',
      });
      totalScore = Math.max(0, totalScore - 8);
    }

    if (data.workArrangement.hasOwnBrand) {
      factors.push({
        criterion: 'Has own business brand/identity',
        category: 'OTHER',
        weight: -5,
        indicatesEmployment: false,
        score: -5,
        description: 'Worker markets under own brand',
      });
      totalScore = Math.max(0, totalScore - 5);
    }

    if (data.workArrangement.hasSubstitutionRight) {
      factors.push({
        criterion: 'Right to substitute/delegate work',
        category: 'OTHER',
        weight: -7,
        indicatesEmployment: false,
        score: -7,
        description: 'Can send substitute to perform work',
      });
      totalScore = Math.max(0, totalScore - 7);
    }

    const riskPercentage = (totalScore / maxScore) * 100;
    let riskLevel: MisclassificationRisk['riskLevel'] = 'LOW';
    if (riskPercentage >= 70) riskLevel = 'CRITICAL';
    else if (riskPercentage >= 50) riskLevel = 'HIGH';
    else if (riskPercentage >= 30) riskLevel = 'MEDIUM';

    // Generate AI analysis and recommendations
    const aiAnalysis = this.generateAIAnalysis(factors, riskLevel, riskPercentage);
    const recommendations = this.generateMitigationRecommendations(factors, riskLevel);

    // Calculate potential penalties
    const potentialPenalties = this.estimatePenalties(data.workArrangement.clientPercentageOfIncome, data.workArrangement.contractDuration);

    const risk: MisclassificationRisk = {
      id: riskId,
      freelancerId: data.freelancerId,
      clientId: data.clientId,
      assessmentDate: new Date(),
      factors,
      totalScore,
      maxScore,
      riskPercentage,
      riskLevel,
      aiAnalysis,
      recommendations,
      legalBasis: [
        'OUG 79/2023 - Criterii de identificare a relațiilor de muncă',
        'Codul Muncii Art. 16 - Definiția raportului de muncă',
        'Legea 227/2015 - Codul Fiscal',
      ],
      potentialPenalties,
      mitigationActions: recommendations.map(r => ({
        action: r,
        priority: riskLevel === 'CRITICAL' ? 'CRITICAL' : riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM',
        effectOnRisk: 'Reduces risk score by implementing independent contractor practices',
      })),
      status: 'PENDING_REVIEW',
    };

    this.misclassificationRisks.set(riskId, risk);
    return risk;
  }

  private generateAIAnalysis(factors: MisclassificationFactor[], riskLevel: string, riskPercentage: number): string {
    const employmentFactors = factors.filter(f => f.indicatesEmployment);
    const independenceFactors = factors.filter(f => !f.indicatesEmployment);

    return `Risk Assessment Summary:

The work arrangement shows ${riskPercentage.toFixed(1)}% alignment with employment characteristics.

Key Employment Indicators (${employmentFactors.length} factors identified):
${employmentFactors.map(f => `- ${f.criterion}`).join('\n')}

Independence Indicators (${independenceFactors.length} factors identified):
${independenceFactors.map(f => `- ${f.criterion}`).join('\n')}

Risk Level: ${riskLevel}

${riskLevel === 'CRITICAL' || riskLevel === 'HIGH'
  ? 'URGENT ACTION REQUIRED: This arrangement has high likelihood of being reclassified as employment by ANAF. Immediate restructuring recommended.'
  : riskLevel === 'MEDIUM'
  ? 'ATTENTION: Some aspects of this arrangement may raise concerns during an audit. Review recommended.'
  : 'This arrangement appears to have appropriate independent contractor characteristics.'}`;
  }

  private generateMitigationRecommendations(factors: MisclassificationFactor[], riskLevel: string): string[] {
    const recommendations: string[] = [];

    const hasScheduleIssue = factors.some(f => f.criterion.includes('schedule'));
    const hasEconomicDependence = factors.some(f => f.category === 'ECONOMIC_DEPENDENCE' && f.indicatesEmployment);
    const hasControlIssues = factors.some(f => f.category === 'CONTROL' && f.indicatesEmployment);
    const hasIntegrationIssues = factors.some(f => f.category === 'INTEGRATION' && f.indicatesEmployment);

    if (hasScheduleIssue) {
      recommendations.push('Remove fixed schedule requirements - allow freelancer to set own working hours');
    }

    if (hasEconomicDependence) {
      recommendations.push('Diversify client base - aim for no single client exceeding 50% of income');
      recommendations.push('Remove any exclusivity clauses from contracts');
    }

    if (hasControlIssues) {
      recommendations.push('Focus contracts on deliverables/outcomes rather than processes');
      recommendations.push('Allow freelancer to determine how work is performed');
      recommendations.push('Remove mandatory attendance at meetings/training');
    }

    if (hasIntegrationIssues) {
      recommendations.push('Use freelancer\'s own business identity in communications');
      recommendations.push('Avoid including freelancer in organizational charts');
      recommendations.push('Limit contract duration or use project-based agreements');
    }

    if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
      recommendations.push('Consider converting to formal employment relationship');
      recommendations.push('Consult with employment law specialist before continuing');
      recommendations.push('Document business-to-business nature of relationship');
    }

    return recommendations;
  }

  private estimatePenalties(incomePercentage: number, durationMonths: number): PenaltyEstimate {
    // Estimated penalties based on typical enforcement
    const estimatedMonthlyIncome = 5000; // EUR average
    const totalIncome = estimatedMonthlyIncome * durationMonths;

    const unpaidTaxes = totalIncome * 0.10; // Income tax
    const socialContributions = totalIncome * 0.35; // CAS + CASS
    const penalties = (unpaidTaxes + socialContributions) * 0.15; // 15% penalty
    const interest = (unpaidTaxes + socialContributions) * 0.02 * (durationMonths / 12); // 2% annual interest

    return {
      unpaidTaxes,
      socialContributions,
      penalties,
      interest,
      totalExposure: unpaidTaxes + socialContributions + penalties + interest,
      currency: 'EUR',
    };
  }

  async getMisclassificationRisk(riskId: string): Promise<MisclassificationRisk | null> {
    return this.misclassificationRisks.get(riskId) || null;
  }

  async getRisksForFreelancer(freelancerId: string): Promise<MisclassificationRisk[]> {
    return Array.from(this.misclassificationRisks.values())
      .filter(r => r.freelancerId === freelancerId);
  }

  // ===== INTERNATIONAL TAX DOCUMENTS =====

  async generateW8BEN(data: {
    freelancerId: string;
    clientId: string;
    clientCountry: string;
    beneficialOwner: string;
    countryOfResidence: string;
    taxIdNumber: string;
    taxIdType: string;
    address: TaxAddress;
    claimsTreatyBenefits: boolean;
  }): Promise<InternationalTaxDocument> {
    const docId = `itd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const treatyRate = data.claimsTreatyBenefits && this.TAX_TREATY_RATES[data.countryOfResidence]
      ? this.TAX_TREATY_RATES[data.countryOfResidence]
      : null;

    const document: InternationalTaxDocument = {
      id: docId,
      freelancerId: data.freelancerId,
      documentType: 'W8_BEN',
      clientCountry: data.clientCountry,
      clientId: data.clientId,
      beneficialOwner: data.beneficialOwner,
      countryOfResidence: data.countryOfResidence,
      taxIdNumber: data.taxIdNumber,
      taxIdType: data.taxIdType,
      claimsTreatyBenefits: data.claimsTreatyBenefits,
      treatyCountry: data.claimsTreatyBenefits ? data.countryOfResidence : undefined,
      treatyArticle: data.claimsTreatyBenefits ? 'Article 7 (Business Profits)' : undefined,
      withholdingRate: treatyRate?.services ?? 30, // Default US withholding is 30%
      content: {
        part1: {
          name: data.beneficialOwner,
          countryOfCitizenship: data.countryOfResidence,
          permanentResidenceAddress: data.address,
          mailingAddress: data.address,
        },
        part2: {
          foreignTIN: data.taxIdNumber,
          foreignTINType: data.taxIdType,
          referenceNumber: data.freelancerId,
        },
        part3: data.claimsTreatyBenefits ? {
          country: data.countryOfResidence,
          specialRatesArticle: 'Article 7',
          specialRatesPercentage: treatyRate?.services ?? 0,
          conditions: 'Services performed as independent contractor',
        } : null,
      },
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000), // 3 years
      status: 'DRAFT',
      createdAt: new Date(),
    };

    this.internationalDocs.set(docId, document);
    return document;
  }

  async generateTaxResidencyCertificate(data: {
    freelancerId: string;
    fiscalYear: number;
    purpose: string;
    requestingCountry: string;
  }): Promise<InternationalTaxDocument> {
    const profile = await this.getTaxProfileByFreelancer(data.freelancerId);
    if (!profile) {
      throw new Error('Tax profile not found');
    }

    const docId = `itd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const document: InternationalTaxDocument = {
      id: docId,
      freelancerId: data.freelancerId,
      documentType: 'TAX_RESIDENCY_CERT',
      clientCountry: data.requestingCountry,
      beneficialOwner: profile.freelancerId, // Would be actual name
      countryOfResidence: profile.taxResidency,
      taxIdNumber: profile.taxId,
      taxIdType: profile.taxIdType,
      claimsTreatyBenefits: true,
      content: {
        fiscalYear: data.fiscalYear,
        purpose: data.purpose,
        requestingCountry: data.requestingCountry,
        certificationText: `This is to certify that the above-named individual/entity was a resident of Romania for tax purposes during the fiscal year ${data.fiscalYear}, within the meaning of Article 4 of the Double Taxation Convention between Romania and ${data.requestingCountry}.`,
        issuingAuthority: 'ANAF - Agenția Națională de Administrare Fiscală',
      },
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      status: 'DRAFT',
      createdAt: new Date(),
    };

    this.internationalDocs.set(docId, document);
    return document;
  }

  async signInternationalDocument(docId: string, signatureHash: string): Promise<InternationalTaxDocument> {
    const doc = this.internationalDocs.get(docId);
    if (!doc) {
      throw new Error('Document not found');
    }

    doc.signedAt = new Date();
    doc.signatureHash = signatureHash;
    doc.status = 'SIGNED';

    this.internationalDocs.set(docId, doc);
    return doc;
  }

  async getInternationalDocument(docId: string): Promise<InternationalTaxDocument | null> {
    return this.internationalDocs.get(docId) || null;
  }

  async getDocumentsForFreelancer(freelancerId: string): Promise<InternationalTaxDocument[]> {
    return Array.from(this.internationalDocs.values())
      .filter(d => d.freelancerId === freelancerId);
  }

  // ===== COMPLIANCE AUDIT REPORTS =====

  async generateComplianceAuditReport(data: {
    freelancerId: string;
    periodStart: Date;
    periodEnd: Date;
    auditType: ComplianceAuditReport['auditType'];
  }): Promise<ComplianceAuditReport> {
    const reportId = `aud-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Gather data for assessment
    const profile = await this.getTaxProfileByFreelancer(data.freelancerId);
    const declarations = await this.getDeclarationsForFreelancer(data.freelancerId);
    const transactions = await this.getTransactionsForFreelancer(data.freelancerId);
    const risks = await this.getRisksForFreelancer(data.freelancerId);
    const documents = await this.getDocumentsForFreelancer(data.freelancerId);

    const findings: AuditFinding[] = [];
    const recommendations: string[] = [];

    // Tax Compliance Assessment
    const taxCompliance = this.assessTaxCompliance(profile, declarations, findings);

    // VAT Compliance Assessment
    const vatCompliance = this.assessVATCompliance(profile, transactions, findings);

    // Social Contributions Assessment
    const socialContributions = this.assessSocialContributions(profile, declarations, findings);

    // Documentation Compliance
    const documentationCompliance = this.assessDocumentation(documents, findings);

    // Cross-Border Compliance
    const crossBorderCompliance = this.assessCrossBorder(transactions, findings);

    // Misclassification Risk
    const misclassificationRisk = this.assessMisclassification(risks, findings);

    // Calculate overall score
    const areas = [taxCompliance, vatCompliance, socialContributions, documentationCompliance, crossBorderCompliance, misclassificationRisk];
    const overallScore = areas.reduce((sum, a) => sum + a.percentage, 0) / areas.length;

    let overallRating: ComplianceAuditReport['overallRating'] = 'EXCELLENT';
    if (overallScore < 50) overallRating = 'CRITICAL';
    else if (overallScore < 65) overallRating = 'NEEDS_IMPROVEMENT';
    else if (overallScore < 80) overallRating = 'ACCEPTABLE';
    else if (overallScore < 90) overallRating = 'GOOD';

    // Generate recommendations based on findings
    findings.filter(f => f.severity === 'HIGH' || f.severity === 'CRITICAL').forEach(f => {
      recommendations.push(f.recommendation);
    });

    // Required actions
    const requiredActions: RequiredAction[] = findings
      .filter(f => f.severity === 'HIGH' || f.severity === 'CRITICAL')
      .map(f => ({
        action: f.recommendation,
        priority: f.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        deadline: f.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'PENDING' as const,
      }));

    const report: ComplianceAuditReport = {
      id: reportId,
      freelancerId: data.freelancerId,
      auditPeriod: { start: data.periodStart, end: data.periodEnd },
      auditType: data.auditType,
      taxCompliance,
      vatCompliance,
      socialContributions,
      documentationCompliance,
      crossBorderCompliance,
      misclassificationRisk,
      overallScore,
      overallRating,
      findings,
      recommendations,
      requiredActions,
      createdAt: new Date(),
    };

    this.auditReports.set(reportId, report);
    return report;
  }

  private assessTaxCompliance(
    profile: FreelancerTaxProfile | null,
    declarations: IncomeDeclaration[],
    findings: AuditFinding[]
  ): ComplianceArea {
    const issues: string[] = [];
    let score = 100;

    if (!profile) {
      issues.push('No tax profile configured');
      score -= 30;
      findings.push({
        id: `find-${Date.now()}`,
        severity: 'HIGH',
        category: 'Tax Compliance',
        finding: 'Tax profile not configured',
        impact: 'Unable to generate proper tax declarations',
        recommendation: 'Create tax profile with all required information',
      });
    }

    if (declarations.length === 0) {
      issues.push('No tax declarations submitted');
      score -= 25;
    }

    const rejectedDeclarations = declarations.filter(d => d.status === 'REJECTED');
    if (rejectedDeclarations.length > 0) {
      issues.push(`${rejectedDeclarations.length} rejected declarations`);
      score -= rejectedDeclarations.length * 10;
    }

    return {
      name: 'Tax Compliance',
      score: Math.max(0, score),
      maxScore: 100,
      percentage: Math.max(0, score),
      status: score >= 80 ? 'COMPLIANT' : score >= 60 ? 'MINOR_ISSUES' : score >= 40 ? 'MAJOR_ISSUES' : 'NON_COMPLIANT',
      issues,
    };
  }

  private assessVATCompliance(
    profile: FreelancerTaxProfile | null,
    transactions: CrossBorderTransaction[],
    findings: AuditFinding[]
  ): ComplianceArea {
    const issues: string[] = [];
    let score = 100;

    if (profile?.vatRegistered) {
      const transactionsWithoutVAT = transactions.filter(t => t.vatTreatment === 'DOMESTIC_VAT' && t.vatAmount === 0);
      if (transactionsWithoutVAT.length > 0) {
        issues.push(`${transactionsWithoutVAT.length} domestic transactions without VAT`);
        score -= transactionsWithoutVAT.length * 5;
      }
    }

    const b2bWithoutVATNumber = transactions.filter(t => t.isB2B && !t.clientVatNumber && t.clientCountry !== 'RO');
    if (b2bWithoutVATNumber.length > 0) {
      issues.push(`${b2bWithoutVATNumber.length} B2B transactions without client VAT number`);
      score -= b2bWithoutVATNumber.length * 3;
      findings.push({
        id: `find-${Date.now()}`,
        severity: 'MEDIUM',
        category: 'VAT Compliance',
        finding: 'B2B transactions missing client VAT numbers',
        impact: 'May not qualify for reverse charge treatment',
        recommendation: 'Request VAT numbers from all B2B EU clients',
      });
    }

    return {
      name: 'VAT Compliance',
      score: Math.max(0, score),
      maxScore: 100,
      percentage: Math.max(0, score),
      status: score >= 80 ? 'COMPLIANT' : score >= 60 ? 'MINOR_ISSUES' : score >= 40 ? 'MAJOR_ISSUES' : 'NON_COMPLIANT',
      issues,
    };
  }

  private assessSocialContributions(
    profile: FreelancerTaxProfile | null,
    declarations: IncomeDeclaration[],
    findings: AuditFinding[]
  ): ComplianceArea {
    const issues: string[] = [];
    let score = 100;

    if (!profile) {
      return { name: 'Social Contributions', score: 0, maxScore: 100, percentage: 0, status: 'NON_COMPLIANT', issues: ['No profile'] };
    }

    // Check if CAS/CASS should be paid based on income
    const totalIncome = declarations.reduce((sum, d) => sum + (d.income?.grossIncome || 0), 0);

    if (totalIncome >= this.TAX_CONSTANTS.CAS_THRESHOLD_MIN && !profile.casOptIn) {
      issues.push('CAS contributions may be mandatory based on income level');
      score -= 15;
    }

    if (totalIncome >= this.TAX_CONSTANTS.CAS_THRESHOLD_MIN && !profile.cassOptIn) {
      issues.push('CASS contributions may be mandatory based on income level');
      score -= 15;
    }

    return {
      name: 'Social Contributions',
      score: Math.max(0, score),
      maxScore: 100,
      percentage: Math.max(0, score),
      status: score >= 80 ? 'COMPLIANT' : score >= 60 ? 'MINOR_ISSUES' : score >= 40 ? 'MAJOR_ISSUES' : 'NON_COMPLIANT',
      issues,
    };
  }

  private assessDocumentation(
    documents: InternationalTaxDocument[],
    findings: AuditFinding[]
  ): ComplianceArea {
    const issues: string[] = [];
    let score = 100;

    const expiredDocs = documents.filter(d => d.validUntil < new Date());
    if (expiredDocs.length > 0) {
      issues.push(`${expiredDocs.length} expired documents`);
      score -= expiredDocs.length * 10;
      findings.push({
        id: `find-${Date.now()}`,
        severity: 'MEDIUM',
        category: 'Documentation',
        finding: 'Expired tax documents',
        impact: 'May result in higher withholding rates',
        recommendation: 'Renew expired W-8BEN and tax residency certificates',
      });
    }

    const unsignedDocs = documents.filter(d => d.status === 'DRAFT');
    if (unsignedDocs.length > 0) {
      issues.push(`${unsignedDocs.length} unsigned documents`);
      score -= unsignedDocs.length * 5;
    }

    return {
      name: 'Documentation Compliance',
      score: Math.max(0, score),
      maxScore: 100,
      percentage: Math.max(0, score),
      status: score >= 80 ? 'COMPLIANT' : score >= 60 ? 'MINOR_ISSUES' : score >= 40 ? 'MAJOR_ISSUES' : 'NON_COMPLIANT',
      issues,
    };
  }

  private assessCrossBorder(
    transactions: CrossBorderTransaction[],
    findings: AuditFinding[]
  ): ComplianceArea {
    const issues: string[] = [];
    let score = 100;

    const viesRequired = transactions.filter(t => t.includeInVIES);
    if (viesRequired.length > 0) {
      // Check if VIES reporting would be complete
      const missingVATNumbers = viesRequired.filter(t => !t.clientVatNumber);
      if (missingVATNumbers.length > 0) {
        issues.push(`${missingVATNumbers.length} VIES transactions missing VAT numbers`);
        score -= missingVATNumbers.length * 5;
      }
    }

    return {
      name: 'Cross-Border Compliance',
      score: Math.max(0, score),
      maxScore: 100,
      percentage: Math.max(0, score),
      status: score >= 80 ? 'COMPLIANT' : score >= 60 ? 'MINOR_ISSUES' : score >= 40 ? 'MAJOR_ISSUES' : 'NON_COMPLIANT',
      issues,
    };
  }

  private assessMisclassification(
    risks: MisclassificationRisk[],
    findings: AuditFinding[]
  ): ComplianceArea {
    const issues: string[] = [];
    let score = 100;

    const highRisks = risks.filter(r => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL');
    if (highRisks.length > 0) {
      issues.push(`${highRisks.length} high-risk client relationships`);
      score -= highRisks.length * 20;
      findings.push({
        id: `find-${Date.now()}`,
        severity: 'CRITICAL',
        category: 'Misclassification Risk',
        finding: 'High misclassification risk detected',
        impact: 'Potential reclassification as employee with back taxes and penalties',
        recommendation: 'Restructure work arrangements or consider employment',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    }

    const mediumRisks = risks.filter(r => r.riskLevel === 'MEDIUM');
    if (mediumRisks.length > 0) {
      issues.push(`${mediumRisks.length} medium-risk relationships`);
      score -= mediumRisks.length * 10;
    }

    return {
      name: 'Misclassification Risk',
      score: Math.max(0, score),
      maxScore: 100,
      percentage: Math.max(0, score),
      status: score >= 80 ? 'COMPLIANT' : score >= 60 ? 'MINOR_ISSUES' : score >= 40 ? 'MAJOR_ISSUES' : 'NON_COMPLIANT',
      issues,
    };
  }

  async getAuditReport(reportId: string): Promise<ComplianceAuditReport | null> {
    return this.auditReports.get(reportId) || null;
  }

  async getAuditReportsForFreelancer(freelancerId: string): Promise<ComplianceAuditReport[]> {
    return Array.from(this.auditReports.values())
      .filter(r => r.freelancerId === freelancerId);
  }

  // ===== REFERENCE DATA =====

  getTaxConstants(): typeof this.TAX_CONSTANTS {
    return { ...this.TAX_CONSTANTS };
  }

  getEUVATRates(): typeof this.EU_VAT_RATES {
    return { ...this.EU_VAT_RATES };
  }

  getTaxTreatyRates(): typeof this.TAX_TREATY_RATES {
    return { ...this.TAX_TREATY_RATES };
  }

  getDeclarationTypes(): { type: IncomeDeclaration['declarationType']; description: string }[] {
    return [
      { type: 'D212', description: 'Declarație unică - Annual unified declaration for income and contributions' },
      { type: 'D200', description: 'Declarație privind veniturile realizate - Income declaration' },
      { type: 'D201', description: 'Declarație informativă - Informative declaration on payments' },
      { type: 'D207', description: 'Declarație privind venitul din activități independente' },
      { type: 'D394', description: 'Declarație informativă privind livrările/achiziții - VAT reporting' },
    ];
  }

  getDeductionCategories(): { category: DeductionItem['category']; description: string; maxPercent: number }[] {
    return [
      { category: 'BUSINESS_EXPENSE', description: 'General business expenses', maxPercent: 100 },
      { category: 'DEPRECIATION', description: 'Asset depreciation', maxPercent: 100 },
      { category: 'SOCIAL_CONTRIBUTIONS', description: 'CAS/CASS contributions', maxPercent: 100 },
      { category: 'HEALTH_INSURANCE', description: 'Private health insurance', maxPercent: 100 },
      { category: 'PENSION', description: 'Private pension contributions', maxPercent: 100 },
      { category: 'PROFESSIONAL_FEES', description: 'Professional association fees', maxPercent: 100 },
      { category: 'OFFICE_RENT', description: 'Office/workspace rent', maxPercent: 100 },
      { category: 'EQUIPMENT', description: 'Equipment and tools', maxPercent: 100 },
      { category: 'SOFTWARE', description: 'Software subscriptions', maxPercent: 100 },
      { category: 'TRAVEL', description: 'Business travel expenses', maxPercent: 50 },
      { category: 'TRAINING', description: 'Professional development', maxPercent: 100 },
      { category: 'OTHER', description: 'Other deductible expenses', maxPercent: 100 },
    ];
  }
}
