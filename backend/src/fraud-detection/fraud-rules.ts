import { FraudAlertType, FraudAlertSeverity } from './fraud-detection.dto';

export interface FraudRule {
  type: FraudAlertType;
  name: string;
  description: string;
  enabled: boolean;
  severity: FraudAlertSeverity;
  threshold?: number;
  conditions: RuleCondition[];
}

export interface RuleCondition {
  field: string;
  operator: 'gt' | 'lt' | 'eq' | 'ne' | 'in' | 'nin' | 'contains' | 'regex';
  value: any;
}

export const DEFAULT_FRAUD_RULES: FraudRule[] = [
  {
    type: FraudAlertType.UNUSUAL_AMOUNT,
    name: 'Unusual Transaction Amount',
    description: 'Detects transactions with amounts significantly higher than the user average',
    enabled: true,
    severity: FraudAlertSeverity.MEDIUM,
    threshold: 3, // Standard deviations from mean
    conditions: [
      { field: 'amount', operator: 'gt', value: 'average' },
    ],
  },
  {
    type: FraudAlertType.DUPLICATE_INVOICE,
    name: 'Duplicate Invoice Detection',
    description: 'Identifies potential duplicate invoices within a time window',
    enabled: true,
    severity: FraudAlertSeverity.HIGH,
    threshold: 24, // Hours
    conditions: [
      { field: 'invoiceNumber', operator: 'eq', value: 'previous' },
      { field: 'amount', operator: 'eq', value: 'previous' },
    ],
  },
  {
    type: FraudAlertType.RAPID_SUCCESSION,
    name: 'Rapid Succession Transactions',
    description: 'Detects multiple transactions in a very short time period',
    enabled: true,
    severity: FraudAlertSeverity.HIGH,
    threshold: 5, // Minutes between transactions
    conditions: [
      { field: 'transactionCount', operator: 'gt', value: 3 },
      { field: 'timeWindow', operator: 'lt', value: 5 },
    ],
  },
  {
    type: FraudAlertType.VENDOR_ANOMALY,
    name: 'Unusual Vendor Activity',
    description: 'Detects transactions with new or suspicious vendors',
    enabled: true,
    severity: FraudAlertSeverity.MEDIUM,
    conditions: [
      { field: 'vendorAge', operator: 'lt', value: 7 }, // Days
      { field: 'amount', operator: 'gt', value: 10000 },
    ],
  },
  {
    type: FraudAlertType.GEOGRAPHIC_INCONSISTENCY,
    name: 'Geographic Anomaly',
    description: 'Detects transactions from unusual or impossible geographic locations',
    enabled: true,
    severity: FraudAlertSeverity.CRITICAL,
    conditions: [
      { field: 'locationChange', operator: 'gt', value: 1000 }, // km
      { field: 'timeWindow', operator: 'lt', value: 60 }, // minutes
    ],
  },
  {
    type: FraudAlertType.WEEKEND_ACTIVITY,
    name: 'Weekend Transaction Activity',
    description: 'Flags transactions occurring during weekends when unusual for the user',
    enabled: true,
    severity: FraudAlertSeverity.LOW,
    conditions: [
      { field: 'dayOfWeek', operator: 'in', value: [0, 6] }, // Sunday, Saturday
      { field: 'weekendTransactionRatio', operator: 'lt', value: 0.1 },
    ],
  },
  {
    type: FraudAlertType.AFTER_HOURS,
    name: 'After Hours Activity',
    description: 'Detects transactions outside normal business hours',
    enabled: true,
    severity: FraudAlertSeverity.LOW,
    conditions: [
      { field: 'hour', operator: 'lt', value: 8 },
      { field: 'hour', operator: 'gt', value: 18 },
    ],
  },
  {
    type: FraudAlertType.AMOUNT_ROUNDING,
    name: 'Suspicious Amount Rounding',
    description: 'Identifies transactions with suspiciously round amounts',
    enabled: true,
    severity: FraudAlertSeverity.LOW,
    threshold: 1000, // Round to nearest 1000
    conditions: [
      { field: 'amount', operator: 'regex', value: /0{3,}$/ },
      { field: 'amount', operator: 'gt', value: 5000 },
    ],
  },
  {
    type: FraudAlertType.SPLIT_TRANSACTION,
    name: 'Split Transaction Pattern',
    description: 'Detects patterns of splitting large amounts into smaller transactions',
    enabled: true,
    severity: FraudAlertSeverity.HIGH,
    conditions: [
      { field: 'similarAmounts', operator: 'gt', value: 3 },
      { field: 'timeWindow', operator: 'lt', value: 24 }, // Hours
      { field: 'totalAmount', operator: 'gt', value: 10000 },
    ],
  },
  {
    type: FraudAlertType.VELOCITY_ANOMALY,
    name: 'Transaction Velocity Anomaly',
    description: 'Detects unusual increase in transaction frequency or volume',
    enabled: true,
    severity: FraudAlertSeverity.MEDIUM,
    threshold: 2, // Times normal velocity
    conditions: [
      { field: 'currentVelocity', operator: 'gt', value: 'averageVelocity' },
    ],
  },
  {
    type: FraudAlertType.UNUSUAL_VENDOR,
    name: 'Blocked or High-Risk Vendor',
    description: 'Flags transactions with vendors on blocklist or high-risk categories',
    enabled: true,
    severity: FraudAlertSeverity.CRITICAL,
    conditions: [
      { field: 'vendorId', operator: 'in', value: 'blockedVendors' },
    ],
  },
];

export class FraudRulesEngine {
  private rules: Map<FraudAlertType, FraudRule>;

  constructor(customRules?: FraudRule[]) {
    this.rules = new Map();
    const rulesToLoad = customRules || DEFAULT_FRAUD_RULES;

    rulesToLoad.forEach(rule => {
      this.rules.set(rule.type, rule);
    });
  }

  getRule(type: FraudAlertType): FraudRule | undefined {
    return this.rules.get(type);
  }

  getAllRules(): FraudRule[] {
    return Array.from(this.rules.values());
  }

  getEnabledRules(): FraudRule[] {
    return this.getAllRules().filter(rule => rule.enabled);
  }

  updateRule(type: FraudAlertType, updates: Partial<FraudRule>): void {
    const existing = this.rules.get(type);
    if (existing) {
      this.rules.set(type, { ...existing, ...updates });
    }
  }

  enableRule(type: FraudAlertType): void {
    this.updateRule(type, { enabled: true });
  }

  disableRule(type: FraudAlertType): void {
    this.updateRule(type, { enabled: false });
  }

  evaluateConditions(conditions: RuleCondition[], data: Record<string, any>, context: Record<string, any> = {}): boolean {
    return conditions.every(condition => {
      const fieldValue = data[condition.field];
      let compareValue = condition.value;

      // Handle dynamic values from context (e.g., 'average', 'previous')
      if (typeof compareValue === 'string' && context[compareValue] !== undefined) {
        compareValue = context[compareValue];
      }

      switch (condition.operator) {
        case 'gt':
          return fieldValue > compareValue;
        case 'lt':
          return fieldValue < compareValue;
        case 'eq':
          return fieldValue === compareValue;
        case 'ne':
          return fieldValue !== compareValue;
        case 'in':
          return Array.isArray(compareValue) && compareValue.includes(fieldValue);
        case 'nin':
          return Array.isArray(compareValue) && !compareValue.includes(fieldValue);
        case 'contains':
          return String(fieldValue).includes(String(compareValue));
        case 'regex':
          return compareValue instanceof RegExp && compareValue.test(String(fieldValue));
        default:
          return false;
      }
    });
  }
}

// Risk scoring weights for different alert types
export const RISK_SCORE_WEIGHTS: Record<FraudAlertType, number> = {
  [FraudAlertType.UNUSUAL_AMOUNT]: 0.6,
  [FraudAlertType.DUPLICATE_INVOICE]: 0.85,
  [FraudAlertType.RAPID_SUCCESSION]: 0.75,
  [FraudAlertType.VENDOR_ANOMALY]: 0.65,
  [FraudAlertType.GEOGRAPHIC_INCONSISTENCY]: 0.95,
  [FraudAlertType.WEEKEND_ACTIVITY]: 0.3,
  [FraudAlertType.AFTER_HOURS]: 0.25,
  [FraudAlertType.AMOUNT_ROUNDING]: 0.4,
  [FraudAlertType.SPLIT_TRANSACTION]: 0.8,
  [FraudAlertType.VELOCITY_ANOMALY]: 0.7,
  [FraudAlertType.UNUSUAL_VENDOR]: 0.9,
  [FraudAlertType.SUSPICIOUS_TIMING]: 0.5,
};

// Severity thresholds for risk scores
export const SEVERITY_THRESHOLDS = {
  LOW: 0.3,
  MEDIUM: 0.5,
  HIGH: 0.7,
  CRITICAL: 0.85,
};

export function calculateRiskScore(
  alertType: FraudAlertType,
  baseScore: number,
  additionalFactors: Record<string, number> = {}
): number {
  const weight = RISK_SCORE_WEIGHTS[alertType] || 0.5;
  let score = baseScore * weight;

  // Apply additional risk factors
  Object.values(additionalFactors).forEach(factor => {
    score *= (1 + factor);
  });

  // Normalize to 0-100 range
  return Math.min(Math.max(score * 100, 0), 100);
}

export function determineSeverity(riskScore: number): FraudAlertSeverity {
  if (riskScore >= SEVERITY_THRESHOLDS.CRITICAL * 100) {
    return FraudAlertSeverity.CRITICAL;
  } else if (riskScore >= SEVERITY_THRESHOLDS.HIGH * 100) {
    return FraudAlertSeverity.HIGH;
  } else if (riskScore >= SEVERITY_THRESHOLDS.MEDIUM * 100) {
    return FraudAlertSeverity.MEDIUM;
  }
  return FraudAlertSeverity.LOW;
}
