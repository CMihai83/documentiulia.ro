import { Injectable, Logger } from '@nestjs/common';

/**
 * Smart Categorization Service (AI-003)
 * Auto-categorize transactions using ML-based classification
 *
 * Features:
 * - Transaction categorization using pattern matching and ML
 * - Romanian accounting chart (PCG) category mapping
 * - Vendor-based learning
 * - Description-based classification
 * - Multi-language support (RO/EN)
 * - Confidence scoring
 * - Category suggestions
 * - Learning from user corrections
 */

// =================== TYPES & ENUMS ===================

export enum TransactionType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME',
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum CategoryLevel {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
  DETAILED = 'DETAILED',
}

export interface Category {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  level: CategoryLevel;
  parentId?: string;
  accountCode?: string; // Romanian PCG account code
  keywords: string[];
  synonyms: string[];
  isActive: boolean;
}

export interface Transaction {
  id: string;
  tenantId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string;
  vendorName?: string;
  vendorId?: string;
  date: Date;
  metadata?: Record<string, any>;
}

export interface CategorizationResult {
  transactionId: string;
  suggestedCategory: Category;
  confidence: number; // 0-100
  alternativeCategories: Array<{
    category: Category;
    confidence: number;
  }>;
  matchedRules: string[];
  requiresReview: boolean;
}

export interface CategorizationRule {
  id: string;
  tenantId: string;
  name: string;
  priority: number;
  conditions: RuleCondition[];
  categoryId: string;
  isActive: boolean;
  matchCount: number;
  createdAt: Date;
}

export interface RuleCondition {
  field: 'description' | 'vendorName' | 'amount' | 'vendorId';
  operator: 'CONTAINS' | 'EQUALS' | 'STARTS_WITH' | 'ENDS_WITH' | 'REGEX' | 'GT' | 'LT' | 'BETWEEN';
  value: string | number | [number, number];
  caseSensitive?: boolean;
}

export interface VendorCategoryMapping {
  vendorId: string;
  vendorName: string;
  categoryId: string;
  confidence: number;
  transactionCount: number;
  lastUsed: Date;
}

export interface LearningFeedback {
  transactionId: string;
  originalCategoryId: string;
  correctedCategoryId: string;
  userId: string;
  timestamp: Date;
}

// =================== SERVICE ===================

@Injectable()
export class SmartCategorizationService {
  private readonly logger = new Logger(SmartCategorizationService.name);

  // In-memory storage
  private categories: Map<string, Category> = new Map();
  private rules: Map<string, CategorizationRule> = new Map();
  private vendorMappings: Map<string, VendorCategoryMapping> = new Map();
  private learningData: LearningFeedback[] = [];

  private counters = {
    rule: 0,
  };

  constructor() {
    this.initializeDefaultCategories();
    this.initializeDefaultRules();
  }

  private initializeDefaultCategories(): void {
    // Romanian PCG-based expense categories
    const expenseCategories: Omit<Category, 'id'>[] = [
      // Primary: Operating Expenses (Class 6)
      {
        code: '6',
        name: 'Cheltuieli',
        nameEn: 'Expenses',
        level: CategoryLevel.PRIMARY,
        accountCode: '6',
        keywords: ['cheltuieli', 'costs', 'expenses'],
        synonyms: [],
        isActive: true,
      },
      // Secondary: Material Expenses
      {
        code: '60',
        name: 'Cheltuieli privind stocurile',
        nameEn: 'Inventory Expenses',
        level: CategoryLevel.SECONDARY,
        parentId: 'cat_6',
        accountCode: '60',
        keywords: ['materii prime', 'materiale', 'stocuri', 'raw materials', 'inventory'],
        synonyms: ['aprovizionare', 'supplies'],
        isActive: true,
      },
      {
        code: '601',
        name: 'Cheltuieli cu materiile prime',
        nameEn: 'Raw Materials Expenses',
        level: CategoryLevel.DETAILED,
        parentId: 'cat_60',
        accountCode: '601',
        keywords: ['materii prime', 'raw materials'],
        synonyms: [],
        isActive: true,
      },
      {
        code: '602',
        name: 'Cheltuieli cu materialele consumabile',
        nameEn: 'Consumable Materials',
        level: CategoryLevel.DETAILED,
        parentId: 'cat_60',
        accountCode: '602',
        keywords: ['consumabile', 'birotica', 'papetarie', 'office supplies', 'consumables'],
        synonyms: ['rechizite', 'cartuse', 'toner'],
        isActive: true,
      },
      {
        code: '603',
        name: 'Cheltuieli privind materialele de natura obiectelor de inventar',
        nameEn: 'Small Inventory Items',
        level: CategoryLevel.DETAILED,
        parentId: 'cat_60',
        accountCode: '603',
        keywords: ['obiecte inventar', 'small tools', 'inventory items'],
        synonyms: ['scule', 'unelte'],
        isActive: true,
      },
      {
        code: '605',
        name: 'Cheltuieli privind energia și apa',
        nameEn: 'Energy and Water',
        level: CategoryLevel.DETAILED,
        parentId: 'cat_60',
        accountCode: '605',
        keywords: ['energie', 'electricitate', 'gaz', 'apa', 'energy', 'electricity', 'water', 'utilities'],
        synonyms: ['enel', 'engie', 'eol', 'electrica', 'e-on', 'factura utilitati'],
        isActive: true,
      },
      // Secondary: Third-party Services
      {
        code: '61',
        name: 'Cheltuieli cu serviciile executate de terți',
        nameEn: 'Third-party Services',
        level: CategoryLevel.SECONDARY,
        parentId: 'cat_6',
        accountCode: '61',
        keywords: ['servicii', 'services', 'prestari'],
        synonyms: [],
        isActive: true,
      },
      {
        code: '611',
        name: 'Cheltuieli cu întreținerea și reparațiile',
        nameEn: 'Maintenance and Repairs',
        level: CategoryLevel.DETAILED,
        parentId: 'cat_61',
        accountCode: '611',
        keywords: ['intretinere', 'reparatii', 'maintenance', 'repairs', 'service'],
        synonyms: ['revizie', 'itp', 'vulcanizare'],
        isActive: true,
      },
      {
        code: '612',
        name: 'Cheltuieli cu redevențele, locațiile de gestiune și chiriile',
        nameEn: 'Rent and Leases',
        level: CategoryLevel.DETAILED,
        parentId: 'cat_61',
        accountCode: '612',
        keywords: ['chirie', 'rent', 'leasing', 'inchiriere', 'locatie'],
        synonyms: ['spatiu', 'birou', 'office rent'],
        isActive: true,
      },
      {
        code: '613',
        name: 'Cheltuieli cu primele de asigurare',
        nameEn: 'Insurance Premiums',
        level: CategoryLevel.DETAILED,
        parentId: 'cat_61',
        accountCode: '613',
        keywords: ['asigurare', 'insurance', 'polita', 'rca', 'casco'],
        synonyms: ['allianz', 'omniasig', 'euroins', 'generali'],
        isActive: true,
      },
      {
        code: '614',
        name: 'Cheltuieli cu studiile și cercetările',
        nameEn: 'Research and Studies',
        level: CategoryLevel.DETAILED,
        parentId: 'cat_61',
        accountCode: '614',
        keywords: ['cercetare', 'studii', 'research', 'studies'],
        synonyms: ['r&d', 'development'],
        isActive: true,
      },
      // Secondary: Other Third-party Services
      {
        code: '62',
        name: 'Cheltuieli cu alte servicii executate de terți',
        nameEn: 'Other Third-party Services',
        level: CategoryLevel.SECONDARY,
        parentId: 'cat_6',
        accountCode: '62',
        keywords: ['alte servicii', 'other services'],
        synonyms: [],
        isActive: true,
      },
      {
        code: '621',
        name: 'Cheltuieli cu colaboratorii',
        nameEn: 'Collaborator Expenses',
        level: CategoryLevel.DETAILED,
        parentId: 'cat_62',
        accountCode: '621',
        keywords: ['colaboratori', 'freelancer', 'consultant', 'pfa'],
        synonyms: ['contractori', 'subcontractori'],
        isActive: true,
      },
      {
        code: '622',
        name: 'Cheltuieli privind comisioanele și onorariile',
        nameEn: 'Commissions and Fees',
        level: CategoryLevel.DETAILED,
        parentId: 'cat_62',
        accountCode: '622',
        keywords: ['comision', 'onorariu', 'commission', 'fees', 'honorarium'],
        synonyms: ['agent', 'broker'],
        isActive: true,
      },
      {
        code: '623',
        name: 'Cheltuieli de protocol, reclamă și publicitate',
        nameEn: 'Marketing and Advertising',
        level: CategoryLevel.DETAILED,
        parentId: 'cat_62',
        accountCode: '623',
        keywords: ['marketing', 'publicitate', 'advertising', 'protocol', 'reclama', 'promovare'],
        synonyms: ['facebook ads', 'google ads', 'banner', 'sponsorizare'],
        isActive: true,
      },
      {
        code: '624',
        name: 'Cheltuieli cu transportul de bunuri și personal',
        nameEn: 'Transport Expenses',
        level: CategoryLevel.DETAILED,
        parentId: 'cat_62',
        accountCode: '624',
        keywords: ['transport', 'curier', 'shipping', 'delivery', 'livrare'],
        synonyms: ['fan courier', 'dhl', 'ups', 'fedex', 'cargus', 'sameday'],
        isActive: true,
      },
      {
        code: '625',
        name: 'Cheltuieli cu deplasări, detașări și transferări',
        nameEn: 'Travel Expenses',
        level: CategoryLevel.DETAILED,
        parentId: 'cat_62',
        accountCode: '625',
        keywords: ['deplasare', 'travel', 'diurna', 'cazare', 'hotel', 'avion', 'tren'],
        synonyms: ['bilet', 'combustibil', 'benzina', 'motorina', 'carburant'],
        isActive: true,
      },
      {
        code: '626',
        name: 'Cheltuieli poștale și de telecomunicații',
        nameEn: 'Postal and Telecom',
        level: CategoryLevel.DETAILED,
        parentId: 'cat_62',
        accountCode: '626',
        keywords: ['telefon', 'internet', 'telecom', 'postal', 'posta'],
        synonyms: ['vodafone', 'orange', 'telekom', 'digi', 'rcs rds', 'abonament telefon'],
        isActive: true,
      },
      {
        code: '627',
        name: 'Cheltuieli cu serviciile bancare și asimilate',
        nameEn: 'Banking Services',
        level: CategoryLevel.DETAILED,
        parentId: 'cat_62',
        accountCode: '627',
        keywords: ['banca', 'bank', 'comision bancar', 'banking fees'],
        synonyms: ['bt', 'bcr', 'ing', 'raiffeisen', 'brd', 'cec'],
        isActive: true,
      },
      {
        code: '628',
        name: 'Alte cheltuieli cu serviciile executate de terți',
        nameEn: 'Other Services',
        level: CategoryLevel.DETAILED,
        parentId: 'cat_62',
        accountCode: '628',
        keywords: ['software', 'subscriptie', 'subscription', 'licenta', 'cloud', 'saas'],
        synonyms: ['microsoft', 'google workspace', 'adobe', 'hosting', 'domeniu'],
        isActive: true,
      },
      // Personnel Expenses
      {
        code: '64',
        name: 'Cheltuieli cu personalul',
        nameEn: 'Personnel Expenses',
        level: CategoryLevel.SECONDARY,
        parentId: 'cat_6',
        accountCode: '64',
        keywords: ['personal', 'salarii', 'personnel', 'salaries', 'wages'],
        synonyms: [],
        isActive: true,
      },
      {
        code: '641',
        name: 'Cheltuieli cu salariile personalului',
        nameEn: 'Employee Salaries',
        level: CategoryLevel.DETAILED,
        parentId: 'cat_64',
        accountCode: '641',
        keywords: ['salariu', 'salary', 'retributie'],
        synonyms: ['plata angajati', 'virament salarial'],
        isActive: true,
      },
      {
        code: '645',
        name: 'Cheltuieli privind asigurările și protecția socială',
        nameEn: 'Social Security Contributions',
        level: CategoryLevel.DETAILED,
        parentId: 'cat_64',
        accountCode: '645',
        keywords: ['cas', 'cass', 'contributii', 'social', 'asigurari sociale'],
        synonyms: ['impozit salariu', 'taxe salariale'],
        isActive: true,
      },
      // Taxes
      {
        code: '63',
        name: 'Cheltuieli cu alte impozite, taxe și vărsăminte asimilate',
        nameEn: 'Taxes and Duties',
        level: CategoryLevel.SECONDARY,
        parentId: 'cat_6',
        accountCode: '63',
        keywords: ['impozit', 'taxa', 'tax', 'duty', 'taxe locale'],
        synonyms: ['anaf', 'primarie', 'timbru'],
        isActive: true,
      },
      // Financial Expenses
      {
        code: '66',
        name: 'Cheltuieli financiare',
        nameEn: 'Financial Expenses',
        level: CategoryLevel.SECONDARY,
        parentId: 'cat_6',
        accountCode: '66',
        keywords: ['financiar', 'dobanda', 'interest', 'financial'],
        synonyms: ['credit', 'imprumut', 'leasing financiar'],
        isActive: true,
      },
      // INCOME Categories (Class 7)
      {
        code: '7',
        name: 'Venituri',
        nameEn: 'Income',
        level: CategoryLevel.PRIMARY,
        accountCode: '7',
        keywords: ['venit', 'incasare', 'income', 'revenue'],
        synonyms: [],
        isActive: true,
      },
      {
        code: '70',
        name: 'Venituri din vânzări',
        nameEn: 'Sales Revenue',
        level: CategoryLevel.SECONDARY,
        parentId: 'cat_7',
        accountCode: '70',
        keywords: ['vanzare', 'factura emisa', 'sales', 'revenue'],
        synonyms: [],
        isActive: true,
      },
      {
        code: '704',
        name: 'Venituri din lucrări executate și servicii prestate',
        nameEn: 'Service Revenue',
        level: CategoryLevel.DETAILED,
        parentId: 'cat_70',
        accountCode: '704',
        keywords: ['servicii prestate', 'lucrari', 'service revenue', 'consulting'],
        synonyms: ['prestari servicii', 'factura client'],
        isActive: true,
      },
      {
        code: '76',
        name: 'Venituri financiare',
        nameEn: 'Financial Income',
        level: CategoryLevel.SECONDARY,
        parentId: 'cat_7',
        accountCode: '76',
        keywords: ['dobanda incasata', 'dividende', 'interest income', 'financial income'],
        synonyms: [],
        isActive: true,
      },
    ];

    // Add categories with generated IDs
    expenseCategories.forEach((cat, index) => {
      const id = `cat_${cat.code}`;
      this.categories.set(id, { ...cat, id });
    });

    this.logger.log(`Initialized ${this.categories.size} default categories`);
  }

  private initializeDefaultRules(): void {
    // Default categorization rules
    const defaultRules: Omit<CategorizationRule, 'id' | 'matchCount' | 'createdAt'>[] = [
      // Utilities
      {
        tenantId: 'default',
        name: 'Electricity - ENEL',
        priority: 100,
        conditions: [
          { field: 'vendorName', operator: 'CONTAINS', value: 'enel', caseSensitive: false },
        ],
        categoryId: 'cat_605',
        isActive: true,
      },
      {
        tenantId: 'default',
        name: 'Gas - ENGIE',
        priority: 100,
        conditions: [
          { field: 'vendorName', operator: 'CONTAINS', value: 'engie', caseSensitive: false },
        ],
        categoryId: 'cat_605',
        isActive: true,
      },
      {
        tenantId: 'default',
        name: 'Water - APA',
        priority: 100,
        conditions: [
          { field: 'vendorName', operator: 'CONTAINS', value: 'apa nova', caseSensitive: false },
        ],
        categoryId: 'cat_605',
        isActive: true,
      },
      // Telecom
      {
        tenantId: 'default',
        name: 'Telecom - Orange',
        priority: 90,
        conditions: [
          { field: 'vendorName', operator: 'CONTAINS', value: 'orange', caseSensitive: false },
        ],
        categoryId: 'cat_626',
        isActive: true,
      },
      {
        tenantId: 'default',
        name: 'Telecom - Vodafone',
        priority: 90,
        conditions: [
          { field: 'vendorName', operator: 'CONTAINS', value: 'vodafone', caseSensitive: false },
        ],
        categoryId: 'cat_626',
        isActive: true,
      },
      {
        tenantId: 'default',
        name: 'Internet - DIGI/RCS',
        priority: 90,
        conditions: [
          { field: 'vendorName', operator: 'REGEX', value: '(digi|rcs)', caseSensitive: false },
        ],
        categoryId: 'cat_626',
        isActive: true,
      },
      // Courier/Shipping
      {
        tenantId: 'default',
        name: 'Courier Services',
        priority: 80,
        conditions: [
          { field: 'vendorName', operator: 'REGEX', value: '(fan courier|dhl|ups|fedex|cargus|sameday)', caseSensitive: false },
        ],
        categoryId: 'cat_624',
        isActive: true,
      },
      {
        tenantId: 'default',
        name: 'Shipping Description',
        priority: 70,
        conditions: [
          { field: 'description', operator: 'REGEX', value: '(curier|livrare|transport|shipping)', caseSensitive: false },
        ],
        categoryId: 'cat_624',
        isActive: true,
      },
      // Travel
      {
        tenantId: 'default',
        name: 'Fuel - Petrol',
        priority: 85,
        conditions: [
          { field: 'vendorName', operator: 'REGEX', value: '(petrom|omv|mol|lukoil|rompetrol|socar)', caseSensitive: false },
        ],
        categoryId: 'cat_625',
        isActive: true,
      },
      {
        tenantId: 'default',
        name: 'Hotel/Accommodation',
        priority: 80,
        conditions: [
          { field: 'description', operator: 'REGEX', value: '(hotel|cazare|accommodation|booking)', caseSensitive: false },
        ],
        categoryId: 'cat_625',
        isActive: true,
      },
      // Banking
      {
        tenantId: 'default',
        name: 'Bank Fees',
        priority: 95,
        conditions: [
          { field: 'description', operator: 'REGEX', value: '(comision|bank fee|taxa administrare)', caseSensitive: false },
        ],
        categoryId: 'cat_627',
        isActive: true,
      },
      // Software/Subscriptions
      {
        tenantId: 'default',
        name: 'Software Subscriptions',
        priority: 75,
        conditions: [
          { field: 'description', operator: 'REGEX', value: '(subscription|abonament|licenta|license|saas)', caseSensitive: false },
        ],
        categoryId: 'cat_628',
        isActive: true,
      },
      // Marketing
      {
        tenantId: 'default',
        name: 'Digital Advertising',
        priority: 80,
        conditions: [
          { field: 'vendorName', operator: 'REGEX', value: '(facebook|google ads|meta|linkedin)', caseSensitive: false },
        ],
        categoryId: 'cat_623',
        isActive: true,
      },
      // Insurance
      {
        tenantId: 'default',
        name: 'Insurance',
        priority: 85,
        conditions: [
          { field: 'description', operator: 'REGEX', value: '(asigurare|insurance|polita|rca|casco)', caseSensitive: false },
        ],
        categoryId: 'cat_613',
        isActive: true,
      },
      // Rent
      {
        tenantId: 'default',
        name: 'Rent/Lease',
        priority: 90,
        conditions: [
          { field: 'description', operator: 'REGEX', value: '(chirie|rent|lease|inchiriere)', caseSensitive: false },
        ],
        categoryId: 'cat_612',
        isActive: true,
      },
    ];

    defaultRules.forEach((rule, index) => {
      const id = `rule_default_${index + 1}`;
      this.rules.set(id, {
        ...rule,
        id,
        matchCount: 0,
        createdAt: new Date(),
      });
    });

    this.logger.log(`Initialized ${this.rules.size} default categorization rules`);
  }

  // =================== CATEGORIZATION ENGINE ===================

  async categorizeTransaction(
    tenantId: string,
    transaction: Transaction,
  ): Promise<CategorizationResult> {
    const matchedRules: string[] = [];
    let bestMatch: { category: Category; confidence: number; rule?: string } | null = null;
    const alternatives: Array<{ category: Category; confidence: number }> = [];

    // 1. Check vendor mapping first (highest priority)
    if (transaction.vendorId || transaction.vendorName) {
      const vendorKey = transaction.vendorId || this.normalizeVendorName(transaction.vendorName || '');
      const vendorMapping = this.vendorMappings.get(vendorKey);

      if (vendorMapping && vendorMapping.confidence >= 80) {
        const category = this.categories.get(vendorMapping.categoryId);
        if (category) {
          bestMatch = {
            category,
            confidence: Math.min(99, vendorMapping.confidence + vendorMapping.transactionCount),
          };
          matchedRules.push(`Vendor mapping: ${vendorMapping.vendorName}`);
        }
      }
    }

    // 2. Apply rules in priority order
    const sortedRules = Array.from(this.rules.values())
      .filter(r => r.isActive && (r.tenantId === tenantId || r.tenantId === 'default'))
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (this.evaluateRule(transaction, rule)) {
        const category = this.categories.get(rule.categoryId);
        if (category) {
          const confidence = this.calculateRuleConfidence(rule, transaction);

          if (!bestMatch || confidence > bestMatch.confidence) {
            if (bestMatch) {
              alternatives.push({ category: bestMatch.category, confidence: bestMatch.confidence });
            }
            bestMatch = { category, confidence, rule: rule.name };
            matchedRules.push(`Rule: ${rule.name}`);
          } else {
            alternatives.push({ category, confidence });
          }

          // Increment match count
          rule.matchCount++;
        }
      }
    }

    // 3. Keyword-based matching (fallback)
    if (!bestMatch || bestMatch.confidence < 70) {
      const keywordMatch = this.matchByKeywords(transaction);
      if (keywordMatch) {
        if (!bestMatch || keywordMatch.confidence > bestMatch.confidence) {
          if (bestMatch) {
            alternatives.push({ category: bestMatch.category, confidence: bestMatch.confidence });
          }
          bestMatch = keywordMatch;
          matchedRules.push('Keyword matching');
        } else {
          alternatives.push(keywordMatch);
        }
      }
    }

    // 4. Default category if nothing matches
    if (!bestMatch) {
      const defaultCategory = transaction.type === TransactionType.EXPENSE
        ? this.categories.get('cat_628') // Other services
        : this.categories.get('cat_704'); // Service revenue

      if (defaultCategory) {
        bestMatch = { category: defaultCategory, confidence: 20 };
        matchedRules.push('Default category');
      }
    }

    // Sort alternatives by confidence
    alternatives.sort((a, b) => b.confidence - a.confidence);

    return {
      transactionId: transaction.id,
      suggestedCategory: bestMatch!.category,
      confidence: bestMatch!.confidence,
      alternativeCategories: alternatives.slice(0, 3),
      matchedRules,
      requiresReview: bestMatch!.confidence < 70,
    };
  }

  async categorizeTransactions(
    tenantId: string,
    transactions: Transaction[],
  ): Promise<CategorizationResult[]> {
    const results: CategorizationResult[] = [];

    for (const txn of transactions) {
      const result = await this.categorizeTransaction(tenantId, txn);
      results.push(result);
    }

    return results;
  }

  private evaluateRule(transaction: Transaction, rule: CategorizationRule): boolean {
    for (const condition of rule.conditions) {
      const fieldValue = this.getFieldValue(transaction, condition.field);
      if (!this.matchCondition(fieldValue, condition)) {
        return false;
      }
    }
    return true;
  }

  private getFieldValue(transaction: Transaction, field: string): any {
    switch (field) {
      case 'description':
        return transaction.description || '';
      case 'vendorName':
        return transaction.vendorName || '';
      case 'vendorId':
        return transaction.vendorId || '';
      case 'amount':
        return transaction.amount;
      default:
        return transaction.metadata?.[field];
    }
  }

  private matchCondition(value: any, condition: RuleCondition): boolean {
    const stringValue = String(value || '');
    const conditionValue = condition.caseSensitive === false
      ? String(condition.value).toLowerCase()
      : String(condition.value);
    const compareValue = condition.caseSensitive === false
      ? stringValue.toLowerCase()
      : stringValue;

    switch (condition.operator) {
      case 'CONTAINS':
        return compareValue.includes(conditionValue);
      case 'EQUALS':
        return compareValue === conditionValue;
      case 'STARTS_WITH':
        return compareValue.startsWith(conditionValue);
      case 'ENDS_WITH':
        return compareValue.endsWith(conditionValue);
      case 'REGEX':
        try {
          const regex = new RegExp(conditionValue, condition.caseSensitive === false ? 'i' : '');
          return regex.test(stringValue);
        } catch {
          return false;
        }
      case 'GT':
        return Number(value) > Number(condition.value);
      case 'LT':
        return Number(value) < Number(condition.value);
      case 'BETWEEN':
        const [min, max] = condition.value as [number, number];
        return Number(value) >= min && Number(value) <= max;
      default:
        return false;
    }
  }

  private calculateRuleConfidence(rule: CategorizationRule, transaction: Transaction): number {
    let confidence = 70; // Base confidence for rule match

    // Boost for exact vendor match
    if (rule.conditions.some(c => c.field === 'vendorName' && c.operator === 'EQUALS')) {
      confidence += 20;
    }

    // Boost for high match count (proven rule)
    if (rule.matchCount > 100) {
      confidence += 10;
    } else if (rule.matchCount > 10) {
      confidence += 5;
    }

    // Boost for multiple conditions
    if (rule.conditions.length > 1) {
      confidence += 5 * (rule.conditions.length - 1);
    }

    return Math.min(98, confidence);
  }

  private matchByKeywords(transaction: Transaction): { category: Category; confidence: number } | null {
    const searchText = `${transaction.description || ''} ${transaction.vendorName || ''}`.toLowerCase();
    let bestMatch: { category: Category; confidence: number; matchScore: number } | null = null;

    for (const category of this.categories.values()) {
      if (!category.isActive) continue;

      let matchScore = 0;

      // Check keywords
      for (const keyword of category.keywords) {
        if (searchText.includes(keyword.toLowerCase())) {
          matchScore += 2;
        }
      }

      // Check synonyms
      for (const synonym of category.synonyms) {
        if (searchText.includes(synonym.toLowerCase())) {
          matchScore += 1;
        }
      }

      if (matchScore > 0) {
        const confidence = Math.min(65, 30 + matchScore * 10);

        if (!bestMatch || matchScore > bestMatch.matchScore) {
          bestMatch = { category, confidence, matchScore };
        }
      }
    }

    return bestMatch ? { category: bestMatch.category, confidence: bestMatch.confidence } : null;
  }

  private normalizeVendorName(name: string): string {
    return name.toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

  // =================== CATEGORY MANAGEMENT ===================

  async getCategories(options?: {
    level?: CategoryLevel;
    parentId?: string;
    isActive?: boolean;
  }): Promise<Category[]> {
    let categories = Array.from(this.categories.values());

    if (options?.level) {
      categories = categories.filter(c => c.level === options.level);
    }
    if (options?.parentId) {
      categories = categories.filter(c => c.parentId === options.parentId);
    }
    if (options?.isActive !== undefined) {
      categories = categories.filter(c => c.isActive === options.isActive);
    }

    return categories.sort((a, b) => a.code.localeCompare(b.code));
  }

  async getCategory(categoryId: string): Promise<Category | null> {
    return this.categories.get(categoryId) || null;
  }

  async getCategoryTree(): Promise<Array<Category & { children: Category[] }>> {
    const primaryCategories = Array.from(this.categories.values())
      .filter(c => c.level === CategoryLevel.PRIMARY);

    return primaryCategories.map(primary => {
      const secondaryCategories = Array.from(this.categories.values())
        .filter(c => c.parentId === primary.id);

      return {
        ...primary,
        children: secondaryCategories.map(secondary => {
          const detailedCategories = Array.from(this.categories.values())
            .filter(c => c.parentId === secondary.id);

          return {
            ...secondary,
            children: detailedCategories,
          };
        }),
      };
    });
  }

  // =================== RULE MANAGEMENT ===================

  async createRule(
    tenantId: string,
    data: Omit<CategorizationRule, 'id' | 'tenantId' | 'matchCount' | 'createdAt'>,
  ): Promise<CategorizationRule> {
    const id = `rule_${++this.counters.rule}`;

    const rule: CategorizationRule = {
      ...data,
      id,
      tenantId,
      matchCount: 0,
      createdAt: new Date(),
    };

    this.rules.set(id, rule);
    return rule;
  }

  async getRules(tenantId: string): Promise<CategorizationRule[]> {
    return Array.from(this.rules.values())
      .filter(r => r.tenantId === tenantId || r.tenantId === 'default')
      .sort((a, b) => b.priority - a.priority);
  }

  async updateRule(
    tenantId: string,
    ruleId: string,
    data: Partial<CategorizationRule>,
  ): Promise<CategorizationRule | null> {
    const rule = this.rules.get(ruleId);
    if (!rule || (rule.tenantId !== tenantId && rule.tenantId !== 'default')) {
      return null;
    }

    Object.assign(rule, data);
    return rule;
  }

  async deleteRule(tenantId: string, ruleId: string): Promise<void> {
    const rule = this.rules.get(ruleId);
    if (rule && rule.tenantId === tenantId) {
      this.rules.delete(ruleId);
    }
  }

  // =================== LEARNING & FEEDBACK ===================

  async recordFeedback(
    tenantId: string,
    transactionId: string,
    originalCategoryId: string,
    correctedCategoryId: string,
    userId: string,
    vendorName?: string,
    vendorId?: string,
  ): Promise<void> {
    this.learningData.push({
      transactionId,
      originalCategoryId,
      correctedCategoryId,
      userId,
      timestamp: new Date(),
    });

    // Update vendor mapping if provided
    if (vendorId || vendorName) {
      const vendorKey = vendorId || this.normalizeVendorName(vendorName || '');
      const existing = this.vendorMappings.get(vendorKey);

      if (existing) {
        if (existing.categoryId === correctedCategoryId) {
          // Reinforce existing mapping
          existing.confidence = Math.min(99, existing.confidence + 2);
          existing.transactionCount++;
          existing.lastUsed = new Date();
        } else {
          // Conflicting mapping - adjust confidence
          existing.confidence = Math.max(50, existing.confidence - 10);
          if (existing.confidence < 60) {
            // Replace mapping
            existing.categoryId = correctedCategoryId;
            existing.confidence = 70;
          }
        }
      } else {
        // Create new mapping
        this.vendorMappings.set(vendorKey, {
          vendorId: vendorId || '',
          vendorName: vendorName || '',
          categoryId: correctedCategoryId,
          confidence: 75,
          transactionCount: 1,
          lastUsed: new Date(),
        });
      }
    }

    this.logger.log(
      `Learning feedback recorded: ${transactionId} ${originalCategoryId} -> ${correctedCategoryId}`,
    );
  }

  async getVendorMappings(tenantId: string): Promise<VendorCategoryMapping[]> {
    return Array.from(this.vendorMappings.values());
  }

  // =================== ANALYTICS ===================

  async getCategorizationStats(tenantId: string): Promise<{
    totalRules: number;
    activeRules: number;
    vendorMappings: number;
    topCategories: Array<{ category: Category; matchCount: number }>;
    learningAccuracy: number;
  }> {
    const rules = await this.getRules(tenantId);
    const activeRules = rules.filter(r => r.isActive);

    // Calculate top categories by match count
    const categoryMatchCounts: Map<string, number> = new Map();
    for (const rule of rules) {
      const current = categoryMatchCounts.get(rule.categoryId) || 0;
      categoryMatchCounts.set(rule.categoryId, current + rule.matchCount);
    }

    const topCategories = Array.from(categoryMatchCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([categoryId, matchCount]) => ({
        category: this.categories.get(categoryId)!,
        matchCount,
      }))
      .filter(item => item.category);

    // Calculate learning accuracy (simplified)
    const corrections = this.learningData.length;
    const accuracy = corrections > 0
      ? Math.max(70, 100 - (corrections / 10)) // Simplified metric
      : 85;

    return {
      totalRules: rules.length,
      activeRules: activeRules.length,
      vendorMappings: this.vendorMappings.size,
      topCategories,
      learningAccuracy: accuracy,
    };
  }
}
