import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type ComplianceStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL' | 'PENDING' | 'UNKNOWN';

export type ComplianceCategory =
  | 'VAT'
  | 'E_FACTURA'
  | 'SAF_T'
  | 'GDPR'
  | 'CUI_VALIDATION'
  | 'INVOICE_FORMAT'
  | 'TAX_DECLARATION'
  | 'FINANCIAL_REPORTING';

export type Severity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export type DeadlineStatus = 'UPCOMING' | 'DUE_SOON' | 'OVERDUE' | 'COMPLETED' | 'MISSED';

export interface ComplianceRule {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  category: ComplianceCategory;
  regulation: string;
  regulationRo: string;
  effectiveDate: Date;
  isActive: boolean;
  severity: Severity;
  validator: string; // Validator function name
}

export interface ComplianceCheck {
  id: string;
  ruleId: string;
  customerId: string;
  status: ComplianceStatus;
  category: ComplianceCategory;
  details: string;
  detailsRo: string;
  issues: ComplianceIssue[];
  checkedAt: Date;
  validUntil?: Date;
  metadata?: Record<string, any>;
}

export interface ComplianceIssue {
  id: string;
  ruleId: string;
  severity: Severity;
  title: string;
  titleRo: string;
  description: string;
  descriptionRo: string;
  recommendation: string;
  recommendationRo: string;
  affectedField?: string;
  affectedValue?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface ComplianceDeadline {
  id: string;
  customerId?: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  category: ComplianceCategory;
  dueDate: Date;
  status: DeadlineStatus;
  regulation: string;
  reminderDays: number[];
  recurring: boolean;
  recurrencePattern?: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  completedAt?: Date;
  createdAt: Date;
}

export interface ComplianceReport {
  id: string;
  customerId: string;
  title: string;
  titleRo: string;
  generatedAt: Date;
  period: { start: Date; end: Date };
  overallStatus: ComplianceStatus;
  categories: CategorySummary[];
  issues: ComplianceIssue[];
  recommendations: string[];
  recommendationsRo: string[];
  score: number; // 0-100
}

export interface CategorySummary {
  category: ComplianceCategory;
  status: ComplianceStatus;
  checksPassed: number;
  checksFailed: number;
  issueCount: number;
}

export interface VATValidationResult {
  isValid: boolean;
  rate: number;
  rateType: 'STANDARD' | 'REDUCED' | 'SPECIAL';
  effectiveDate: Date;
  issues: string[];
  issuesRo: string[];
}

export interface CUIValidationResult {
  isValid: boolean;
  cui: string;
  companyName?: string;
  vatPayer?: boolean;
  status?: string;
  issues: string[];
  issuesRo: string[];
}

export interface EFacturaValidationResult {
  isValid: boolean;
  format: string;
  version: string;
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  field: string;
  message: string;
  messageRo: string;
  severity: Severity;
}

// Romanian tax rates
const VAT_RATES = {
  STANDARD: { rate: 19, description: 'Standard rate', descriptionRo: 'Cotă standard' },
  REDUCED_9: { rate: 9, description: 'Reduced rate (food, pharma)', descriptionRo: 'Cotă redusă (alimente, medicamente)' },
  REDUCED_5: { rate: 5, description: 'Special rate (housing)', descriptionRo: 'Cotă specială (locuințe)' },
  ZERO: { rate: 0, description: 'Zero rate (exports)', descriptionRo: 'Cotă zero (exporturi)' },
};

// New VAT rates effective August 2025 (Legea 141/2025)
const VAT_RATES_2025 = {
  STANDARD: { rate: 21, effectiveDate: new Date('2025-08-01') },
  REDUCED: { rate: 11, effectiveDate: new Date('2025-08-01') },
};

// Romanian compliance category translations
const CATEGORY_TRANSLATIONS: Record<ComplianceCategory, string> = {
  VAT: 'TVA',
  E_FACTURA: 'e-Factura',
  SAF_T: 'SAF-T (D406)',
  GDPR: 'GDPR',
  CUI_VALIDATION: 'Validare CUI',
  INVOICE_FORMAT: 'Format Factură',
  TAX_DECLARATION: 'Declarație Fiscală',
  FINANCIAL_REPORTING: 'Raportare Financiară',
};

// Romanian severity translations
const SEVERITY_TRANSLATIONS: Record<Severity, string> = {
  INFO: 'Informare',
  WARNING: 'Avertisment',
  ERROR: 'Eroare',
  CRITICAL: 'Critic',
};

// Default compliance rules
const DEFAULT_RULES: Omit<ComplianceRule, 'id'>[] = [
  {
    name: 'CUI Format Validation',
    nameRo: 'Validare Format CUI',
    description: 'Validate Romanian CUI/CIF format',
    descriptionRo: 'Validare format CUI/CIF românesc',
    category: 'CUI_VALIDATION',
    regulation: 'Romanian Tax Code',
    regulationRo: 'Codul Fiscal Românesc',
    effectiveDate: new Date('2000-01-01'),
    isActive: true,
    severity: 'ERROR',
    validator: 'validateCUI',
  },
  {
    name: 'e-Factura B2B Mandatory',
    nameRo: 'e-Factura B2B Obligatorie',
    description: 'All B2B invoices must be submitted via e-Factura',
    descriptionRo: 'Toate facturile B2B trebuie transmise prin e-Factura',
    category: 'E_FACTURA',
    regulation: 'OUG 120/2021, modified',
    regulationRo: 'OUG 120/2021, modificată',
    effectiveDate: new Date('2024-01-01'),
    isActive: true,
    severity: 'CRITICAL',
    validator: 'validateEFactura',
  },
  {
    name: 'SAF-T Monthly Submission',
    nameRo: 'Transmitere Lunară SAF-T',
    description: 'SAF-T D406 must be submitted monthly',
    descriptionRo: 'D406 SAF-T trebuie transmis lunar',
    category: 'SAF_T',
    regulation: 'Order 1783/2021',
    regulationRo: 'Ordinul 1783/2021',
    effectiveDate: new Date('2025-01-01'),
    isActive: true,
    severity: 'CRITICAL',
    validator: 'validateSAFT',
  },
  {
    name: 'VAT Rate Compliance',
    nameRo: 'Conformitate Cotă TVA',
    description: 'Ensure correct VAT rates are applied',
    descriptionRo: 'Asigurare aplicare cote TVA corecte',
    category: 'VAT',
    regulation: 'Tax Code Art. 291',
    regulationRo: 'Codul Fiscal Art. 291',
    effectiveDate: new Date('2024-01-01'),
    isActive: true,
    severity: 'ERROR',
    validator: 'validateVATRate',
  },
  {
    name: 'Invoice XML Format',
    nameRo: 'Format XML Factură',
    description: 'Invoice must conform to RO_CIUS UBL 2.1',
    descriptionRo: 'Factura trebuie să respecte RO_CIUS UBL 2.1',
    category: 'INVOICE_FORMAT',
    regulation: 'ANAF e-Factura Standard',
    regulationRo: 'Standard ANAF e-Factura',
    effectiveDate: new Date('2024-01-01'),
    isActive: true,
    severity: 'ERROR',
    validator: 'validateInvoiceXML',
  },
  {
    name: 'GDPR Data Protection',
    nameRo: 'Protecție Date GDPR',
    description: 'Customer data must comply with GDPR',
    descriptionRo: 'Datele clienților trebuie să respecte GDPR',
    category: 'GDPR',
    regulation: 'EU Regulation 2016/679',
    regulationRo: 'Regulamentul UE 2016/679',
    effectiveDate: new Date('2018-05-25'),
    isActive: true,
    severity: 'CRITICAL',
    validator: 'validateGDPR',
  },
  {
    name: 'Financial Report Deadline',
    nameRo: 'Termen Raportare Financiară',
    description: 'Annual financial reports must be submitted on time',
    descriptionRo: 'Rapoartele financiare anuale trebuie depuse la timp',
    category: 'FINANCIAL_REPORTING',
    regulation: 'Accounting Law 82/1991',
    regulationRo: 'Legea Contabilității 82/1991',
    effectiveDate: new Date('1991-01-01'),
    isActive: true,
    severity: 'ERROR',
    validator: 'validateFinancialReporting',
  },
];

@Injectable()
export class ComplianceCheckerService implements OnModuleInit {
  private rules: Map<string, ComplianceRule> = new Map();
  private checks: Map<string, ComplianceCheck> = new Map();
  private deadlines: Map<string, ComplianceDeadline> = new Map();
  private reports: Map<string, ComplianceReport> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async onModuleInit(): Promise<void> {
    for (const rule of DEFAULT_RULES) {
      const id = this.generateId('rule');
      this.rules.set(id, { ...rule, id });
    }
  }

  // Rule Management
  async getRule(ruleId: string): Promise<ComplianceRule | undefined> {
    return this.rules.get(ruleId);
  }

  async listRules(options: { category?: ComplianceCategory; activeOnly?: boolean } = {}): Promise<
    ComplianceRule[]
  > {
    let rules = Array.from(this.rules.values());

    if (options.category) {
      rules = rules.filter((r) => r.category === options.category);
    }
    if (options.activeOnly !== false) {
      rules = rules.filter((r) => r.isActive);
    }

    return rules;
  }

  async createRule(data: Omit<ComplianceRule, 'id'>): Promise<ComplianceRule> {
    const rule: ComplianceRule = {
      ...data,
      id: this.generateId('rule'),
    };

    this.rules.set(rule.id, rule);

    this.eventEmitter.emit('compliance.rule.created', {
      ruleId: rule.id,
      category: rule.category,
    });

    return rule;
  }

  async updateRule(ruleId: string, updates: Partial<Omit<ComplianceRule, 'id'>>): Promise<ComplianceRule> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule not found: ${ruleId}`);
    }

    const updated: ComplianceRule = { ...rule, ...updates };
    this.rules.set(ruleId, updated);

    return updated;
  }

  // Compliance Checks
  async runComplianceCheck(
    customerId: string,
    category: ComplianceCategory,
    data: Record<string, any>,
  ): Promise<ComplianceCheck> {
    const rules = await this.listRules({ category, activeOnly: true });
    const issues: ComplianceIssue[] = [];
    let status: ComplianceStatus = 'COMPLIANT';

    for (const rule of rules) {
      const result = await this.executeValidator(rule, data);
      if (!result.isValid) {
        issues.push(...result.issues);
        if (rule.severity === 'CRITICAL' || rule.severity === 'ERROR') {
          status = 'NON_COMPLIANT';
        } else if (status === 'COMPLIANT') {
          status = 'PARTIAL';
        }
      }
    }

    const check: ComplianceCheck = {
      id: this.generateId('check'),
      ruleId: rules[0]?.id || '',
      customerId,
      status,
      category,
      details: status === 'COMPLIANT' ? 'All checks passed' : `${issues.length} issues found`,
      detailsRo:
        status === 'COMPLIANT'
          ? 'Toate verificările au trecut'
          : `${issues.length} probleme găsite`,
      issues,
      checkedAt: new Date(),
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    this.checks.set(check.id, check);

    this.eventEmitter.emit('compliance.check.completed', {
      checkId: check.id,
      customerId,
      category,
      status,
    });

    return check;
  }

  async getCheck(checkId: string): Promise<ComplianceCheck | undefined> {
    return this.checks.get(checkId);
  }

  async listChecks(
    customerId: string,
    options: { category?: ComplianceCategory; status?: ComplianceStatus } = {},
  ): Promise<ComplianceCheck[]> {
    let checks = Array.from(this.checks.values()).filter((c) => c.customerId === customerId);

    if (options.category) {
      checks = checks.filter((c) => c.category === options.category);
    }
    if (options.status) {
      checks = checks.filter((c) => c.status === options.status);
    }

    return checks.sort((a, b) => b.checkedAt.getTime() - a.checkedAt.getTime());
  }

  private async executeValidator(
    rule: ComplianceRule,
    data: Record<string, any>,
  ): Promise<{ isValid: boolean; issues: ComplianceIssue[] }> {
    const issues: ComplianceIssue[] = [];

    switch (rule.validator) {
      case 'validateCUI':
        if (data.cui && !this.isValidCUI(data.cui)) {
          issues.push(this.createIssue(rule, 'Invalid CUI format', 'Format CUI invalid', 'cui', data.cui));
        }
        break;

      case 'validateVATRate':
        if (data.vatRate !== undefined) {
          const validRates = [0, 5, 9, 19];
          if (!validRates.includes(data.vatRate)) {
            issues.push(
              this.createIssue(
                rule,
                `Invalid VAT rate: ${data.vatRate}%`,
                `Cotă TVA invalidă: ${data.vatRate}%`,
                'vatRate',
                String(data.vatRate),
              ),
            );
          }
        }
        break;

      case 'validateEFactura':
        if (data.invoice) {
          if (!data.invoice.eFacturaId && data.invoice.isB2B) {
            issues.push(
              this.createIssue(
                rule,
                'B2B invoice missing e-Factura submission',
                'Factură B2B fără transmitere e-Factura',
                'eFacturaId',
              ),
            );
          }
        }
        break;

      case 'validateSAFT':
        if (data.saftSubmission === false && data.required) {
          issues.push(
            this.createIssue(rule, 'SAF-T D406 submission required', 'Transmitere SAF-T D406 necesară', 'saftSubmission'),
          );
        }
        break;

      case 'validateInvoiceXML':
        if (data.xml) {
          if (!data.xml.includes('xmlns')) {
            issues.push(this.createIssue(rule, 'Invalid XML namespace', 'Namespace XML invalid', 'xml'));
          }
        }
        break;

      case 'validateGDPR':
        if (data.personalData && !data.consentObtained) {
          issues.push(
            this.createIssue(
              rule,
              'GDPR consent not obtained for personal data',
              'Consimțământ GDPR neobținut pentru date personale',
              'consent',
            ),
          );
        }
        break;

      case 'validateFinancialReporting':
        // Financial reporting validation logic
        break;
    }

    return { isValid: issues.length === 0, issues };
  }

  private createIssue(
    rule: ComplianceRule,
    title: string,
    titleRo: string,
    field?: string,
    value?: string,
  ): ComplianceIssue {
    return {
      id: this.generateId('issue'),
      ruleId: rule.id,
      severity: rule.severity,
      title,
      titleRo,
      description: rule.description,
      descriptionRo: rule.descriptionRo,
      recommendation: `Review and correct the ${field || 'data'} to comply with ${rule.regulation}`,
      recommendationRo: `Revizuiți și corectați ${field || 'datele'} pentru conformitate cu ${rule.regulationRo}`,
      affectedField: field,
      affectedValue: value,
      createdAt: new Date(),
    };
  }

  // CUI Validation
  async validateCUI(cui: string): Promise<CUIValidationResult> {
    const issues: string[] = [];
    const issuesRo: string[] = [];

    // Remove RO prefix if present
    const cleanCui = cui.replace(/^RO/i, '').replace(/\D/g, '');

    if (cleanCui.length < 2 || cleanCui.length > 10) {
      issues.push('CUI must be between 2 and 10 digits');
      issuesRo.push('CUI trebuie să aibă între 2 și 10 cifre');
      return { isValid: false, cui: cleanCui, issues, issuesRo };
    }

    // Validate checksum (Romanian CUI validation algorithm)
    const isValid = this.isValidCUI(cleanCui);

    if (!isValid) {
      issues.push('CUI checksum validation failed');
      issuesRo.push('Validare sumă de control CUI eșuată');
    }

    return {
      isValid,
      cui: cleanCui,
      issues,
      issuesRo,
    };
  }

  private isValidCUI(cui: string): boolean {
    const cleanCui = cui.replace(/^RO/i, '').replace(/\D/g, '');

    if (cleanCui.length < 2 || cleanCui.length > 10) {
      return false;
    }

    // Romanian CUI validation algorithm
    const controlKey = '753217532';
    const digits = cleanCui.split('').map(Number);
    const checkDigit = digits.pop();

    // Pad with leading zeros if needed
    while (digits.length < 9) {
      digits.unshift(0);
    }

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += digits[i] * parseInt(controlKey[i]);
    }

    let control = (sum * 10) % 11;
    if (control === 10) control = 0;

    return control === checkDigit;
  }

  // VAT Validation
  async validateVAT(
    amount: number,
    vatRate: number,
    transactionDate: Date = new Date(),
  ): Promise<VATValidationResult> {
    const issues: string[] = [];
    const issuesRo: string[] = [];

    // Check if new rates apply (after August 2025)
    const newRatesEffective = transactionDate >= VAT_RATES_2025.STANDARD.effectiveDate;

    let rateType: 'STANDARD' | 'REDUCED' | 'SPECIAL' = 'STANDARD';
    let expectedRate: number;

    if (newRatesEffective) {
      // New rates from August 2025
      if (vatRate === 21) {
        rateType = 'STANDARD';
        expectedRate = 21;
      } else if (vatRate === 11) {
        rateType = 'REDUCED';
        expectedRate = 11;
      } else if (vatRate === 5) {
        rateType = 'SPECIAL';
        expectedRate = 5;
      } else if (vatRate === 0) {
        rateType = 'SPECIAL';
        expectedRate = 0;
      } else {
        issues.push(`Invalid VAT rate ${vatRate}% for transactions after August 2025`);
        issuesRo.push(`Cotă TVA invalidă ${vatRate}% pentru tranzacții după august 2025`);
        expectedRate = 21;
      }
    } else {
      // Current rates before August 2025
      if (vatRate === 19) {
        rateType = 'STANDARD';
        expectedRate = 19;
      } else if (vatRate === 9) {
        rateType = 'REDUCED';
        expectedRate = 9;
      } else if (vatRate === 5) {
        rateType = 'SPECIAL';
        expectedRate = 5;
      } else if (vatRate === 0) {
        rateType = 'SPECIAL';
        expectedRate = 0;
      } else {
        issues.push(`Invalid VAT rate ${vatRate}%`);
        issuesRo.push(`Cotă TVA invalidă ${vatRate}%`);
        expectedRate = 19;
      }
    }

    return {
      isValid: issues.length === 0,
      rate: expectedRate,
      rateType,
      effectiveDate: newRatesEffective ? VAT_RATES_2025.STANDARD.effectiveDate : new Date(),
      issues,
      issuesRo,
    };
  }

  // e-Factura Validation
  async validateEFacturaXML(xml: string): Promise<EFacturaValidationResult> {
    const issues: ValidationIssue[] = [];

    // Check for required XML namespace
    if (!xml.includes('urn:oasis:names:specification:ubl:schema:xsd:Invoice-2')) {
      issues.push({
        field: 'namespace',
        message: 'Missing UBL 2.1 namespace',
        messageRo: 'Namespace UBL 2.1 lipsă',
        severity: 'CRITICAL',
      });
    }

    // Check for Romanian CIUS customization
    if (!xml.includes('RO_CIUS') && !xml.includes('urn:cen.eu:en16931:2017#compliant')) {
      issues.push({
        field: 'customization',
        message: 'Missing RO_CIUS customization identifier',
        messageRo: 'Identificator personalizare RO_CIUS lipsă',
        severity: 'ERROR',
      });
    }

    // Check for required invoice fields
    const requiredFields = [
      { tag: 'cbc:ID', message: 'Invoice ID', messageRo: 'ID Factură' },
      { tag: 'cbc:IssueDate', message: 'Issue Date', messageRo: 'Data Emiterii' },
      { tag: 'cac:AccountingSupplierParty', message: 'Supplier Party', messageRo: 'Furnizor' },
      { tag: 'cac:AccountingCustomerParty', message: 'Customer Party', messageRo: 'Client' },
    ];

    for (const field of requiredFields) {
      if (!xml.includes(field.tag)) {
        issues.push({
          field: field.tag,
          message: `Missing required field: ${field.message}`,
          messageRo: `Câmp obligatoriu lipsă: ${field.messageRo}`,
          severity: 'ERROR',
        });
      }
    }

    return {
      isValid: issues.length === 0,
      format: 'UBL 2.1',
      version: 'RO_CIUS',
      issues,
    };
  }

  // Deadline Management
  async createDeadline(
    data: Omit<ComplianceDeadline, 'id' | 'status' | 'createdAt'>,
  ): Promise<ComplianceDeadline> {
    const deadline: ComplianceDeadline = {
      ...data,
      id: this.generateId('deadline'),
      status: this.calculateDeadlineStatus(data.dueDate),
      createdAt: new Date(),
    };

    this.deadlines.set(deadline.id, deadline);

    this.eventEmitter.emit('compliance.deadline.created', {
      deadlineId: deadline.id,
      dueDate: deadline.dueDate,
      category: deadline.category,
    });

    return deadline;
  }

  async getDeadline(deadlineId: string): Promise<ComplianceDeadline | undefined> {
    return this.deadlines.get(deadlineId);
  }

  async listDeadlines(options: {
    customerId?: string;
    category?: ComplianceCategory;
    status?: DeadlineStatus;
    upcoming?: boolean;
  } = {}): Promise<ComplianceDeadline[]> {
    let deadlines = Array.from(this.deadlines.values());

    if (options.customerId) {
      deadlines = deadlines.filter(
        (d) => !d.customerId || d.customerId === options.customerId,
      );
    }
    if (options.category) {
      deadlines = deadlines.filter((d) => d.category === options.category);
    }
    if (options.status) {
      deadlines = deadlines.filter((d) => d.status === options.status);
    }
    if (options.upcoming) {
      const now = new Date();
      deadlines = deadlines.filter((d) => d.dueDate > now && d.status !== 'COMPLETED');
    }

    return deadlines.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }

  async completeDeadline(deadlineId: string): Promise<ComplianceDeadline> {
    const deadline = this.deadlines.get(deadlineId);
    if (!deadline) {
      throw new Error(`Deadline not found: ${deadlineId}`);
    }

    deadline.status = 'COMPLETED';
    deadline.completedAt = new Date();
    this.deadlines.set(deadlineId, deadline);

    this.eventEmitter.emit('compliance.deadline.completed', {
      deadlineId,
    });

    return deadline;
  }

  async updateDeadlineStatuses(): Promise<number> {
    let updated = 0;
    const now = new Date();

    for (const [id, deadline] of this.deadlines) {
      if (deadline.status === 'COMPLETED') continue;

      const newStatus = this.calculateDeadlineStatus(deadline.dueDate);
      if (newStatus !== deadline.status) {
        deadline.status = newStatus;
        this.deadlines.set(id, deadline);
        updated++;

        if (newStatus === 'OVERDUE') {
          this.eventEmitter.emit('compliance.deadline.overdue', {
            deadlineId: id,
            name: deadline.name,
          });
        }
      }
    }

    return updated;
  }

  private calculateDeadlineStatus(dueDate: Date): DeadlineStatus {
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) return 'OVERDUE';
    if (daysUntilDue <= 3) return 'DUE_SOON';
    if (daysUntilDue <= 14) return 'UPCOMING';
    return 'UPCOMING';
  }

  // Compliance Reports
  async generateReport(
    customerId: string,
    period: { start: Date; end: Date },
  ): Promise<ComplianceReport> {
    const checks = await this.listChecks(customerId);
    const periodChecks = checks.filter(
      (c) => c.checkedAt >= period.start && c.checkedAt <= period.end,
    );

    const categories = new Map<ComplianceCategory, CategorySummary>();
    const allIssues: ComplianceIssue[] = [];

    for (const check of periodChecks) {
      if (!categories.has(check.category)) {
        categories.set(check.category, {
          category: check.category,
          status: 'COMPLIANT',
          checksPassed: 0,
          checksFailed: 0,
          issueCount: 0,
        });
      }

      const summary = categories.get(check.category)!;
      if (check.status === 'COMPLIANT') {
        summary.checksPassed++;
      } else {
        summary.checksFailed++;
        summary.issueCount += check.issues.length;
        if (check.status === 'NON_COMPLIANT') {
          summary.status = 'NON_COMPLIANT';
        } else if (summary.status === 'COMPLIANT') {
          summary.status = 'PARTIAL';
        }
      }

      allIssues.push(...check.issues);
    }

    // Calculate overall status and score
    const categorySummaries = Array.from(categories.values());
    let overallStatus: ComplianceStatus = 'COMPLIANT';
    let score = 100;

    for (const summary of categorySummaries) {
      if (summary.status === 'NON_COMPLIANT') {
        overallStatus = 'NON_COMPLIANT';
        score -= 25;
      } else if (summary.status === 'PARTIAL') {
        if (overallStatus === 'COMPLIANT') overallStatus = 'PARTIAL';
        score -= 10;
      }
    }

    score = Math.max(0, score);

    const recommendations = this.generateRecommendations(allIssues);

    const report: ComplianceReport = {
      id: this.generateId('report'),
      customerId,
      title: `Compliance Report ${period.start.toISOString().split('T')[0]} - ${period.end.toISOString().split('T')[0]}`,
      titleRo: `Raport Conformitate ${period.start.toISOString().split('T')[0]} - ${period.end.toISOString().split('T')[0]}`,
      generatedAt: new Date(),
      period,
      overallStatus,
      categories: categorySummaries,
      issues: allIssues,
      recommendations: recommendations.en,
      recommendationsRo: recommendations.ro,
      score,
    };

    this.reports.set(report.id, report);

    this.eventEmitter.emit('compliance.report.generated', {
      reportId: report.id,
      customerId,
      score,
    });

    return report;
  }

  async getReport(reportId: string): Promise<ComplianceReport | undefined> {
    return this.reports.get(reportId);
  }

  async listReports(customerId: string): Promise<ComplianceReport[]> {
    return Array.from(this.reports.values())
      .filter((r) => r.customerId === customerId)
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
  }

  private generateRecommendations(issues: ComplianceIssue[]): {
    en: string[];
    ro: string[];
  } {
    const en: string[] = [];
    const ro: string[] = [];

    const hasVATIssues = issues.some((i) => i.affectedField === 'vatRate');
    const hasCUIIssues = issues.some((i) => i.affectedField === 'cui');
    const hasEFacturaIssues = issues.some((i) => i.affectedField === 'eFacturaId');
    const hasGDPRIssues = issues.some((i) => i.affectedField === 'consent');

    if (hasVATIssues) {
      en.push('Review VAT calculations to ensure compliance with current tax rates');
      ro.push('Revizuiți calculele TVA pentru conformitate cu cotele fiscale actuale');
    }

    if (hasCUIIssues) {
      en.push('Verify all CUI/CIF numbers against ANAF registry');
      ro.push('Verificați toate numerele CUI/CIF în registrul ANAF');
    }

    if (hasEFacturaIssues) {
      en.push('Ensure all B2B invoices are submitted via e-Factura system');
      ro.push('Asigurați transmiterea tuturor facturilor B2B prin sistemul e-Factura');
    }

    if (hasGDPRIssues) {
      en.push('Obtain and document GDPR consent for personal data processing');
      ro.push('Obțineți și documentați consimțământul GDPR pentru procesarea datelor personale');
    }

    if (issues.length === 0) {
      en.push('Maintain current compliance practices');
      ro.push('Mențineți practicile actuale de conformitate');
    }

    return { en, ro };
  }

  // Romanian Localization Helpers
  getCategoryName(category: ComplianceCategory): string {
    return CATEGORY_TRANSLATIONS[category];
  }

  getSeverityName(severity: Severity): string {
    return SEVERITY_TRANSLATIONS[severity];
  }

  getAllCategories(): Array<{ category: ComplianceCategory; name: string; nameRo: string }> {
    return (Object.keys(CATEGORY_TRANSLATIONS) as ComplianceCategory[]).map((category) => ({
      category,
      name: category.replace(/_/g, ' '),
      nameRo: CATEGORY_TRANSLATIONS[category],
    }));
  }

  getVATRates(date: Date = new Date()): Array<{
    rate: number;
    type: string;
    description: string;
    descriptionRo: string;
  }> {
    const newRatesEffective = date >= VAT_RATES_2025.STANDARD.effectiveDate;

    if (newRatesEffective) {
      return [
        { rate: 21, type: 'STANDARD', description: 'Standard rate', descriptionRo: 'Cotă standard' },
        {
          rate: 11,
          type: 'REDUCED',
          description: 'Reduced rate (food, pharma)',
          descriptionRo: 'Cotă redusă (alimente, medicamente)',
        },
        {
          rate: 5,
          type: 'SPECIAL',
          description: 'Special rate (housing)',
          descriptionRo: 'Cotă specială (locuințe)',
        },
        { rate: 0, type: 'ZERO', description: 'Zero rate (exports)', descriptionRo: 'Cotă zero (exporturi)' },
      ];
    }

    return [
      { rate: 19, type: 'STANDARD', description: 'Standard rate', descriptionRo: 'Cotă standard' },
      {
        rate: 9,
        type: 'REDUCED',
        description: 'Reduced rate (food, pharma)',
        descriptionRo: 'Cotă redusă (alimente, medicamente)',
      },
      {
        rate: 5,
        type: 'SPECIAL',
        description: 'Special rate (housing)',
        descriptionRo: 'Cotă specială (locuințe)',
      },
      { rate: 0, type: 'ZERO', description: 'Zero rate (exports)', descriptionRo: 'Cotă zero (exporturi)' },
    ];
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
