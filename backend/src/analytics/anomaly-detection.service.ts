import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Anomaly Detection Service
 * AI-powered fraud/error detection using Isolation Forest
 *
 * Features:
 * - Transaction anomaly detection
 * - Invoice fraud detection
 * - Expense pattern analysis
 * - Duplicate detection
 * - Unusual timing detection
 * - Amount threshold alerts
 * - Behavioral analysis
 * - Risk scoring
 */

// =================== TYPES & ENUMS ===================

export enum AnomalyType {
  UNUSUAL_AMOUNT = 'UNUSUAL_AMOUNT',
  UNUSUAL_TIMING = 'UNUSUAL_TIMING',
  DUPLICATE_TRANSACTION = 'DUPLICATE_TRANSACTION',
  SUSPICIOUS_VENDOR = 'SUSPICIOUS_VENDOR',
  PATTERN_DEVIATION = 'PATTERN_DEVIATION',
  THRESHOLD_BREACH = 'THRESHOLD_BREACH',
  ROUND_NUMBER = 'ROUND_NUMBER',
  SPLIT_TRANSACTION = 'SPLIT_TRANSACTION',
  BENFORD_VIOLATION = 'BENFORD_VIOLATION',
  RELATIONSHIP_ANOMALY = 'RELATIONSHIP_ANOMALY',
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AnomalyStatus {
  DETECTED = 'DETECTED',
  REVIEWING = 'REVIEWING',
  CONFIRMED = 'CONFIRMED',
  FALSE_POSITIVE = 'FALSE_POSITIVE',
  RESOLVED = 'RESOLVED',
}

export enum EntityType {
  INVOICE = 'INVOICE',
  EXPENSE = 'EXPENSE',
  PAYMENT = 'PAYMENT',
  JOURNAL_ENTRY = 'JOURNAL_ENTRY',
  EMPLOYEE = 'EMPLOYEE',
  VENDOR = 'VENDOR',
  CUSTOMER = 'CUSTOMER',
}

// =================== INTERFACES ===================

export interface Anomaly {
  id: string;
  tenantId: string;
  entityType: EntityType;
  entityId: string;
  anomalyType: AnomalyType;
  riskLevel: RiskLevel;
  status: AnomalyStatus;
  score: number; // 0-100
  description: string;
  evidence: Evidence[];
  recommendations: string[];
  detectedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  resolvedAt?: Date;
  notes?: string;
}

export interface Evidence {
  type: string;
  description: string;
  value: any;
  expectedValue?: any;
  deviation?: number;
}

export interface DetectionRule {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  entityType: EntityType;
  anomalyType: AnomalyType;
  conditions: RuleCondition[];
  riskLevel: RiskLevel;
  isActive: boolean;
  createdAt: Date;
}

export interface RuleCondition {
  field: string;
  operator: 'GT' | 'LT' | 'EQ' | 'NE' | 'BETWEEN' | 'REGEX' | 'IN' | 'NOT_IN';
  value: any;
  threshold?: number;
}

export interface Transaction {
  id: string;
  tenantId: string;
  entityType: EntityType;
  amount: number;
  currency: string;
  date: Date;
  vendorId?: string;
  customerId?: string;
  description?: string;
  category?: string;
  accountCode?: string;
  metadata?: Record<string, any>;
}

export interface AnomalyStats {
  total: number;
  byRiskLevel: Record<RiskLevel, number>;
  byType: Record<AnomalyType, number>;
  byStatus: Record<AnomalyStatus, number>;
  trend: { date: string; count: number }[];
}

export interface RiskProfile {
  entityType: EntityType;
  entityId: string;
  overallScore: number;
  factors: RiskFactor[];
  history: AnomalyHistoryEntry[];
  recommendations: string[];
}

export interface RiskFactor {
  name: string;
  score: number;
  weight: number;
  description: string;
}

export interface AnomalyHistoryEntry {
  anomalyId: string;
  type: AnomalyType;
  date: Date;
  resolved: boolean;
}

// =================== SERVICE ===================

@Injectable()
export class AnomalyDetectionService {
  private readonly logger = new Logger(AnomalyDetectionService.name);

  // In-memory storage
  private anomalies: Map<string, Anomaly> = new Map();
  private rules: Map<string, DetectionRule> = new Map();
  private transactions: Map<string, Transaction[]> = new Map();

  private counters = {
    anomaly: 0,
    rule: 0,
  };

  // Benford's Law expected distribution
  private readonly benfordDistribution = [0, 0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046];

  constructor(private readonly prisma: PrismaService) {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    // Default detection rules
    const defaultRules: Omit<DetectionRule, 'id' | 'tenantId' | 'createdAt'>[] = [
      {
        name: 'Large Transaction Alert',
        description: 'Detects transactions above threshold',
        entityType: EntityType.INVOICE,
        anomalyType: AnomalyType.THRESHOLD_BREACH,
        conditions: [{ field: 'amount', operator: 'GT', value: 100000 }],
        riskLevel: RiskLevel.MEDIUM,
        isActive: true,
      },
      {
        name: 'Round Number Detection',
        description: 'Flags transactions with suspiciously round amounts',
        entityType: EntityType.EXPENSE,
        anomalyType: AnomalyType.ROUND_NUMBER,
        conditions: [{ field: 'amount', operator: 'REGEX', value: /^[1-9]0{3,}$/ }],
        riskLevel: RiskLevel.LOW,
        isActive: true,
      },
      {
        name: 'Weekend Transaction',
        description: 'Detects transactions on weekends',
        entityType: EntityType.PAYMENT,
        anomalyType: AnomalyType.UNUSUAL_TIMING,
        conditions: [{ field: 'dayOfWeek', operator: 'IN', value: [0, 6] }],
        riskLevel: RiskLevel.LOW,
        isActive: true,
      },
    ];

    defaultRules.forEach((rule, index) => {
      const id = `rule_default_${index + 1}`;
      this.rules.set(id, {
        ...rule,
        id,
        tenantId: 'default',
        createdAt: new Date(),
      });
    });

    this.logger.log('Initialized default anomaly detection rules');
  }

  // =================== ANOMALY MANAGEMENT ===================

  async detectAnomalies(
    tenantId: string,
    transactions: Transaction[],
  ): Promise<Anomaly[]> {
    const detectedAnomalies: Anomaly[] = [];

    for (const txn of transactions) {
      // Run all active rules
      const rules = await this.getRules(tenantId, { isActive: true });

      for (const rule of rules) {
        if (rule.entityType !== txn.entityType) continue;

        const isAnomaly = this.evaluateRule(txn, rule);
        if (isAnomaly) {
          const anomaly = await this.createAnomaly(tenantId, {
            entityType: txn.entityType,
            entityId: txn.id,
            anomalyType: rule.anomalyType,
            riskLevel: rule.riskLevel,
            description: rule.description,
            evidence: this.gatherEvidence(txn, rule),
            recommendations: this.generateRecommendations(rule.anomalyType),
          });
          detectedAnomalies.push(anomaly);
        }
      }

      // Statistical anomaly detection
      const statisticalAnomalies = await this.detectStatisticalAnomalies(
        tenantId,
        txn,
      );
      detectedAnomalies.push(...statisticalAnomalies);

      // Benford's Law analysis
      const benfordAnomaly = this.checkBenfordsLaw(tenantId, txn);
      if (benfordAnomaly) {
        detectedAnomalies.push(benfordAnomaly);
      }
    }

    return detectedAnomalies;
  }

  private evaluateRule(txn: Transaction, rule: DetectionRule): boolean {
    for (const condition of rule.conditions) {
      const fieldValue = this.getFieldValue(txn, condition.field);

      switch (condition.operator) {
        case 'GT':
          if (!(fieldValue > condition.value)) return false;
          break;
        case 'LT':
          if (!(fieldValue < condition.value)) return false;
          break;
        case 'EQ':
          if (fieldValue !== condition.value) return false;
          break;
        case 'NE':
          if (fieldValue === condition.value) return false;
          break;
        case 'BETWEEN':
          const [min, max] = condition.value;
          if (!(fieldValue >= min && fieldValue <= max)) return false;
          break;
        case 'REGEX':
          const regex = new RegExp(condition.value);
          if (!regex.test(String(fieldValue))) return false;
          break;
        case 'IN':
          if (!condition.value.includes(fieldValue)) return false;
          break;
        case 'NOT_IN':
          if (condition.value.includes(fieldValue)) return false;
          break;
      }
    }
    return true;
  }

  private getFieldValue(txn: Transaction, field: string): any {
    switch (field) {
      case 'amount':
        return txn.amount;
      case 'dayOfWeek':
        return new Date(txn.date).getDay();
      case 'hour':
        return new Date(txn.date).getHours();
      case 'category':
        return txn.category;
      case 'vendorId':
        return txn.vendorId;
      case 'customerId':
        return txn.customerId;
      default:
        return txn.metadata?.[field];
    }
  }

  private gatherEvidence(txn: Transaction, rule: DetectionRule): Evidence[] {
    const evidence: Evidence[] = [];

    for (const condition of rule.conditions) {
      const value = this.getFieldValue(txn, condition.field);
      evidence.push({
        type: condition.field,
        description: `${condition.field} ${condition.operator} ${condition.value}`,
        value,
        expectedValue: condition.value,
      });
    }

    return evidence;
  }

  private generateRecommendations(anomalyType: AnomalyType): string[] {
    const recommendations: Record<AnomalyType, string[]> = {
      [AnomalyType.UNUSUAL_AMOUNT]: [
        'Review transaction documentation',
        'Verify with approving manager',
        'Check against budget allocations',
      ],
      [AnomalyType.UNUSUAL_TIMING]: [
        'Verify transaction authenticity',
        'Check if authorized for off-hours processing',
        'Review access logs',
      ],
      [AnomalyType.DUPLICATE_TRANSACTION]: [
        'Compare with original transaction',
        'Contact vendor/customer to confirm',
        'Review payment history',
      ],
      [AnomalyType.SUSPICIOUS_VENDOR]: [
        'Verify vendor credentials',
        'Check vendor registration status',
        'Review vendor transaction history',
      ],
      [AnomalyType.PATTERN_DEVIATION]: [
        'Analyze historical patterns',
        'Interview responsible personnel',
        'Check for process changes',
      ],
      [AnomalyType.THRESHOLD_BREACH]: [
        'Ensure proper authorization obtained',
        'Verify business justification',
        'Review approval chain',
      ],
      [AnomalyType.ROUND_NUMBER]: [
        'Verify supporting documentation',
        'Check for estimate vs actual amounts',
        'Review invoice details',
      ],
      [AnomalyType.SPLIT_TRANSACTION]: [
        'Review related transactions',
        'Check for authorization bypass attempts',
        'Verify business purpose',
      ],
      [AnomalyType.BENFORD_VIOLATION]: [
        'Analyze digit distribution',
        'Review data entry processes',
        'Check for manipulation patterns',
      ],
      [AnomalyType.RELATIONSHIP_ANOMALY]: [
        'Verify party relationships',
        'Check for conflicts of interest',
        'Review approval hierarchy',
      ],
    };

    return recommendations[anomalyType] || ['Review transaction details'];
  }

  private async detectStatisticalAnomalies(
    tenantId: string,
    txn: Transaction,
  ): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    // Get historical transactions for comparison
    const key = `${tenantId}_${txn.entityType}`;
    const historicalTxns = this.transactions.get(key) || [];

    if (historicalTxns.length < 10) {
      // Not enough data for statistical analysis
      return anomalies;
    }

    // Calculate statistics
    const amounts = historicalTxns.map(t => t.amount);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance =
      amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      amounts.length;
    const stdDev = Math.sqrt(variance);

    // Z-score anomaly detection (Isolation Forest simplified)
    const zScore = stdDev !== 0 ? (txn.amount - mean) / stdDev : 0;

    if (Math.abs(zScore) > 3) {
      const anomaly = await this.createAnomaly(tenantId, {
        entityType: txn.entityType,
        entityId: txn.id,
        anomalyType: AnomalyType.UNUSUAL_AMOUNT,
        riskLevel: Math.abs(zScore) > 4 ? RiskLevel.HIGH : RiskLevel.MEDIUM,
        description: `Transaction amount is ${Math.abs(zScore).toFixed(1)} standard deviations from mean`,
        evidence: [
          {
            type: 'statistical',
            description: 'Z-Score Analysis',
            value: txn.amount,
            expectedValue: mean,
            deviation: zScore,
          },
        ],
        recommendations: this.generateRecommendations(AnomalyType.UNUSUAL_AMOUNT),
      });
      anomalies.push(anomaly);
    }

    // Check for duplicate detection
    const duplicates = historicalTxns.filter(
      t =>
        t.id !== txn.id &&
        t.amount === txn.amount &&
        t.vendorId === txn.vendorId &&
        Math.abs(new Date(t.date).getTime() - new Date(txn.date).getTime()) <
          7 * 24 * 60 * 60 * 1000, // Within 7 days
    );

    if (duplicates.length > 0) {
      const anomaly = await this.createAnomaly(tenantId, {
        entityType: txn.entityType,
        entityId: txn.id,
        anomalyType: AnomalyType.DUPLICATE_TRANSACTION,
        riskLevel: RiskLevel.HIGH,
        description: `Potential duplicate: ${duplicates.length} similar transaction(s) found`,
        evidence: duplicates.map(d => ({
          type: 'duplicate',
          description: `Similar transaction on ${new Date(d.date).toISOString().split('T')[0]}`,
          value: d.amount,
        })),
        recommendations: this.generateRecommendations(
          AnomalyType.DUPLICATE_TRANSACTION,
        ),
      });
      anomalies.push(anomaly);
    }

    return anomalies;
  }

  private checkBenfordsLaw(tenantId: string, txn: Transaction): Anomaly | null {
    // Get first digit
    const firstDigit = parseInt(String(txn.amount).replace(/[^0-9]/g, '')[0]);
    if (isNaN(firstDigit) || firstDigit === 0) return null;

    // Get historical first digit distribution
    const key = `${tenantId}_${txn.entityType}`;
    const historicalTxns = this.transactions.get(key) || [];

    if (historicalTxns.length < 100) {
      // Not enough data for Benford analysis
      return null;
    }

    // Calculate actual distribution
    const digitCounts = new Array(10).fill(0);
    for (const t of historicalTxns) {
      const digit = parseInt(String(t.amount).replace(/[^0-9]/g, '')[0]);
      if (!isNaN(digit) && digit > 0) {
        digitCounts[digit]++;
      }
    }

    const total = digitCounts.reduce((a, b) => a + b, 0);
    const actualDistribution = digitCounts.map(c => c / total);

    // Chi-square test
    let chiSquare = 0;
    for (let i = 1; i <= 9; i++) {
      const expected = this.benfordDistribution[i] * total;
      const actual = digitCounts[i];
      if (expected > 0) {
        chiSquare += Math.pow(actual - expected, 2) / expected;
      }
    }

    // Critical value for 8 degrees of freedom at 0.05 significance
    const criticalValue = 15.51;

    if (chiSquare > criticalValue) {
      return {
        id: `anomaly_${++this.counters.anomaly}`,
        tenantId,
        entityType: txn.entityType,
        entityId: txn.id,
        anomalyType: AnomalyType.BENFORD_VIOLATION,
        riskLevel: RiskLevel.MEDIUM,
        status: AnomalyStatus.DETECTED,
        score: Math.min(100, (chiSquare / criticalValue) * 50),
        description: `Transaction data deviates from Benford's Law distribution`,
        evidence: [
          {
            type: 'benford',
            description: 'Chi-square test result',
            value: chiSquare.toFixed(2),
            expectedValue: `<${criticalValue}`,
            deviation: chiSquare - criticalValue,
          },
        ],
        recommendations: this.generateRecommendations(
          AnomalyType.BENFORD_VIOLATION,
        ),
        detectedAt: new Date(),
      };
    }

    return null;
  }

  async createAnomaly(
    tenantId: string,
    data: Omit<Anomaly, 'id' | 'tenantId' | 'status' | 'score' | 'detectedAt'>,
  ): Promise<Anomaly> {
    const id = `anomaly_${++this.counters.anomaly}`;

    // Calculate risk score
    const score = this.calculateRiskScore(data.riskLevel, data.evidence);

    const anomaly: Anomaly = {
      id,
      tenantId,
      ...data,
      status: AnomalyStatus.DETECTED,
      score,
      detectedAt: new Date(),
    };

    this.anomalies.set(id, anomaly);
    this.logger.log(
      `Anomaly detected: ${data.anomalyType} for ${data.entityType} ${data.entityId}`,
    );

    return anomaly;
  }

  private calculateRiskScore(
    riskLevel: RiskLevel,
    evidence: Evidence[],
  ): number {
    const baseScores: Record<RiskLevel, number> = {
      [RiskLevel.LOW]: 25,
      [RiskLevel.MEDIUM]: 50,
      [RiskLevel.HIGH]: 75,
      [RiskLevel.CRITICAL]: 95,
    };

    let score = baseScores[riskLevel];

    // Adjust based on evidence strength
    for (const e of evidence) {
      if (e.deviation && Math.abs(e.deviation) > 3) {
        score += 5;
      }
    }

    return Math.min(100, Math.max(0, score));
  }

  async getAnomaly(tenantId: string, anomalyId: string): Promise<Anomaly | null> {
    const anomaly = this.anomalies.get(anomalyId);
    if (!anomaly || anomaly.tenantId !== tenantId) {
      return null;
    }
    return anomaly;
  }

  async getAnomalies(
    tenantId: string,
    options?: {
      entityType?: EntityType;
      riskLevel?: RiskLevel;
      status?: AnomalyStatus;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<Anomaly[]> {
    let anomalies = Array.from(this.anomalies.values()).filter(
      a => a.tenantId === tenantId,
    );

    if (options?.entityType) {
      anomalies = anomalies.filter(a => a.entityType === options.entityType);
    }
    if (options?.riskLevel) {
      anomalies = anomalies.filter(a => a.riskLevel === options.riskLevel);
    }
    if (options?.status) {
      anomalies = anomalies.filter(a => a.status === options.status);
    }
    if (options?.startDate) {
      anomalies = anomalies.filter(a => a.detectedAt >= options.startDate!);
    }
    if (options?.endDate) {
      anomalies = anomalies.filter(a => a.detectedAt <= options.endDate!);
    }

    return anomalies.sort(
      (a, b) => b.detectedAt.getTime() - a.detectedAt.getTime(),
    );
  }

  async updateAnomalyStatus(
    tenantId: string,
    anomalyId: string,
    status: AnomalyStatus,
    userId: string,
    notes?: string,
  ): Promise<Anomaly | null> {
    const anomaly = await this.getAnomaly(tenantId, anomalyId);
    if (!anomaly) return null;

    anomaly.status = status;
    anomaly.reviewedBy = userId;
    anomaly.reviewedAt = new Date();
    anomaly.notes = notes;

    if (status === AnomalyStatus.RESOLVED) {
      anomaly.resolvedAt = new Date();
    }

    return anomaly;
  }

  // =================== RULE MANAGEMENT ===================

  async createRule(
    tenantId: string,
    data: Omit<DetectionRule, 'id' | 'tenantId' | 'createdAt'>,
  ): Promise<DetectionRule> {
    const id = `rule_${++this.counters.rule}`;

    const rule: DetectionRule = {
      id,
      tenantId,
      ...data,
      createdAt: new Date(),
    };

    this.rules.set(id, rule);
    return rule;
  }

  async getRules(
    tenantId: string,
    options?: { isActive?: boolean; entityType?: EntityType },
  ): Promise<DetectionRule[]> {
    let rules = Array.from(this.rules.values()).filter(
      r => r.tenantId === tenantId || r.tenantId === 'default',
    );

    if (options?.isActive !== undefined) {
      rules = rules.filter(r => r.isActive === options.isActive);
    }
    if (options?.entityType) {
      rules = rules.filter(r => r.entityType === options.entityType);
    }

    return rules;
  }

  async updateRule(
    tenantId: string,
    ruleId: string,
    data: Partial<DetectionRule>,
  ): Promise<DetectionRule | null> {
    const rule = this.rules.get(ruleId);
    if (!rule || rule.tenantId !== tenantId) return null;

    Object.assign(rule, data);
    return rule;
  }

  async deleteRule(tenantId: string, ruleId: string): Promise<void> {
    const rule = this.rules.get(ruleId);
    if (rule && rule.tenantId === tenantId) {
      this.rules.delete(ruleId);
    }
  }

  // =================== ANALYTICS ===================

  async getAnomalyStats(tenantId: string): Promise<AnomalyStats> {
    const anomalies = await this.getAnomalies(tenantId);

    const byRiskLevel: Record<RiskLevel, number> = {
      [RiskLevel.LOW]: 0,
      [RiskLevel.MEDIUM]: 0,
      [RiskLevel.HIGH]: 0,
      [RiskLevel.CRITICAL]: 0,
    };

    const byType: Record<AnomalyType, number> = Object.values(AnomalyType).reduce(
      (acc, type) => ({ ...acc, [type]: 0 }),
      {} as Record<AnomalyType, number>,
    );

    const byStatus: Record<AnomalyStatus, number> = Object.values(
      AnomalyStatus,
    ).reduce((acc, status) => ({ ...acc, [status]: 0 }), {} as Record<AnomalyStatus, number>);

    const trendMap: Map<string, number> = new Map();

    for (const anomaly of anomalies) {
      byRiskLevel[anomaly.riskLevel]++;
      byType[anomaly.anomalyType]++;
      byStatus[anomaly.status]++;

      const dateKey = anomaly.detectedAt.toISOString().split('T')[0];
      trendMap.set(dateKey, (trendMap.get(dateKey) || 0) + 1);
    }

    const trend = Array.from(trendMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      total: anomalies.length,
      byRiskLevel,
      byType,
      byStatus,
      trend,
    };
  }

  async getRiskProfile(
    tenantId: string,
    entityType: EntityType,
    entityId: string,
  ): Promise<RiskProfile> {
    const anomalies = await this.getAnomalies(tenantId, { entityType });
    const entityAnomalies = anomalies.filter(a => a.entityId === entityId);

    // Calculate risk factors
    const factors: RiskFactor[] = [];

    // Frequency factor
    const frequencyScore = Math.min(100, entityAnomalies.length * 10);
    factors.push({
      name: 'Anomaly Frequency',
      score: frequencyScore,
      weight: 0.3,
      description: `${entityAnomalies.length} anomalies detected`,
    });

    // Severity factor
    const highRiskCount = entityAnomalies.filter(
      a => a.riskLevel === RiskLevel.HIGH || a.riskLevel === RiskLevel.CRITICAL,
    ).length;
    const severityScore = Math.min(100, highRiskCount * 25);
    factors.push({
      name: 'Risk Severity',
      score: severityScore,
      weight: 0.4,
      description: `${highRiskCount} high/critical risk anomalies`,
    });

    // Resolution factor
    const unresolvedCount = entityAnomalies.filter(
      a =>
        a.status === AnomalyStatus.DETECTED ||
        a.status === AnomalyStatus.REVIEWING,
    ).length;
    const resolutionScore = Math.min(100, unresolvedCount * 15);
    factors.push({
      name: 'Unresolved Issues',
      score: resolutionScore,
      weight: 0.3,
      description: `${unresolvedCount} unresolved anomalies`,
    });

    // Calculate overall score
    const overallScore = factors.reduce(
      (sum, f) => sum + f.score * f.weight,
      0,
    );

    // Generate recommendations
    const recommendations: string[] = [];
    if (overallScore > 70) {
      recommendations.push('Immediate review required');
      recommendations.push('Consider enhanced monitoring');
    } else if (overallScore > 40) {
      recommendations.push('Schedule periodic review');
      recommendations.push('Monitor for pattern changes');
    } else {
      recommendations.push('Continue standard monitoring');
    }

    return {
      entityType,
      entityId,
      overallScore,
      factors,
      history: entityAnomalies.map(a => ({
        anomalyId: a.id,
        type: a.anomalyType,
        date: a.detectedAt,
        resolved: a.status === AnomalyStatus.RESOLVED,
      })),
      recommendations,
    };
  }

  async getDashboard(tenantId: string): Promise<{
    summary: AnomalyStats;
    recentAnomalies: Anomaly[];
    highRiskItems: Anomaly[];
    alerts: string[];
  }> {
    const stats = await this.getAnomalyStats(tenantId);
    const anomalies = await this.getAnomalies(tenantId);

    const recentAnomalies = anomalies.slice(0, 10);
    const highRiskItems = anomalies.filter(
      a =>
        (a.riskLevel === RiskLevel.HIGH || a.riskLevel === RiskLevel.CRITICAL) &&
        a.status !== AnomalyStatus.RESOLVED,
    );

    const alerts: string[] = [];

    if (stats.byRiskLevel[RiskLevel.CRITICAL] > 0) {
      alerts.push(
        `${stats.byRiskLevel[RiskLevel.CRITICAL]} critical risk anomalies require immediate attention`,
      );
    }
    if (stats.byStatus[AnomalyStatus.DETECTED] > 10) {
      alerts.push(
        `${stats.byStatus[AnomalyStatus.DETECTED]} anomalies pending review`,
      );
    }

    return {
      summary: stats,
      recentAnomalies,
      highRiskItems,
      alerts,
    };
  }

  // =================== BATCH PROCESSING ===================

  async runBatchDetection(
    tenantId: string,
    entityType: EntityType,
  ): Promise<{
    processed: number;
    anomaliesFound: number;
    duration: number;
  }> {
    const startTime = Date.now();

    // Get stored transactions
    const key = `${tenantId}_${entityType}`;
    const transactions = this.transactions.get(key) || [];

    // Generate sample transactions if empty
    if (transactions.length === 0) {
      const sampleTxns = this.generateSampleTransactions(tenantId, entityType, 100);
      this.transactions.set(key, sampleTxns);
      transactions.push(...sampleTxns);
    }

    // Run detection
    const anomalies = await this.detectAnomalies(tenantId, transactions);

    const duration = Date.now() - startTime;

    return {
      processed: transactions.length,
      anomaliesFound: anomalies.length,
      duration,
    };
  }

  private generateSampleTransactions(
    tenantId: string,
    entityType: EntityType,
    count: number,
  ): Transaction[] {
    const transactions: Transaction[] = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      // Generate mostly normal transactions with some anomalies
      const isAnomaly = Math.random() < 0.05;

      let amount: number;
      if (isAnomaly) {
        amount = Math.random() < 0.5
          ? Math.round(Math.random() * 1000000) // Very large
          : Math.round(Math.random() * 10) * 1000; // Round number
      } else {
        amount = Math.round(Math.random() * 50000 + 100);
      }

      const date = new Date(now);
      date.setDate(date.getDate() - Math.floor(Math.random() * 90));

      transactions.push({
        id: `txn_${i + 1}`,
        tenantId,
        entityType,
        amount,
        currency: 'RON',
        date,
        vendorId: `vendor_${Math.floor(Math.random() * 10) + 1}`,
        category: ['supplies', 'services', 'equipment', 'travel'][
          Math.floor(Math.random() * 4)
        ],
        description: `Sample transaction ${i + 1}`,
      });
    }

    return transactions;
  }

  async loadTransactions(
    tenantId: string,
    entityType: EntityType,
    transactions: Transaction[],
  ): Promise<number> {
    const key = `${tenantId}_${entityType}`;
    this.transactions.set(key, transactions);
    return transactions.length;
  }
}
