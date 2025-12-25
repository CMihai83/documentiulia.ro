import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Anomaly Detection Service
 * Uses statistical methods and Isolation Forest algorithm to detect unusual transaction patterns
 *
 * Features:
 * - Z-score based anomaly detection
 * - IQR (Interquartile Range) method
 * - Isolation Forest algorithm
 * - Transaction velocity analysis
 * - Amount deviation detection
 * - Time-based pattern analysis
 * - Fraud risk scoring
 */

// =================== TYPES & INTERFACES ===================

export type AnomalyType =
  | 'amount_outlier'
  | 'velocity_spike'
  | 'unusual_time'
  | 'location_mismatch'
  | 'pattern_deviation'
  | 'frequency_anomaly'
  | 'round_amount'
  | 'duplicate_suspicious'
  | 'high_risk_category';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type DetectionMethod = 'zscore' | 'iqr' | 'isolation_forest' | 'rule_based';

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  timestamp: Date;
  category?: string;
  merchantId?: string;
  customerId: string;
  location?: {
    country: string;
    city?: string;
  };
  metadata?: Record<string, any>;
}

export interface AnomalyResult {
  transactionId: string;
  isAnomaly: boolean;
  score: number; // 0-100, higher = more anomalous
  riskLevel: RiskLevel;
  anomalyTypes: AnomalyType[];
  detectionMethods: DetectionMethod[];
  reasons: string[];
  confidence: number;
  recommendedAction: 'approve' | 'review' | 'flag' | 'block';
  detectedAt: Date;
}

export interface TransactionPattern {
  customerId: string;
  averageAmount: number;
  stdDevAmount: number;
  transactionCount: number;
  averageFrequency: number; // transactions per day
  typicalHours: number[];
  typicalDays: number[];
  commonCategories: string[];
  commonLocations: string[];
  lastUpdated: Date;
}

export interface AnomalyStats {
  totalAnalyzed: number;
  anomaliesDetected: number;
  byRiskLevel: Record<RiskLevel, number>;
  byAnomalyType: Record<AnomalyType, number>;
  falsePositiveRate?: number;
  averageScore: number;
}

export interface DetectionConfig {
  zscoreThreshold: number;
  iqrMultiplier: number;
  velocityWindow: number; // minutes
  velocityThreshold: number;
  minTransactionsForPattern: number;
  roundAmountThreshold: number;
  highRiskCategories: string[];
  unusualHours: number[];
}

export interface IsolationForestConfig {
  numTrees: number;
  sampleSize: number;
  maxDepth: number;
  contamination: number;
}

// =================== DEFAULT CONFIGURATIONS ===================

export const DEFAULT_DETECTION_CONFIG: DetectionConfig = {
  zscoreThreshold: 3.0,
  iqrMultiplier: 1.5,
  velocityWindow: 60, // 1 hour
  velocityThreshold: 10, // max transactions per window
  minTransactionsForPattern: 5,
  roundAmountThreshold: 100,
  highRiskCategories: ['gambling', 'cryptocurrency', 'wire_transfer', 'cash_advance'],
  unusualHours: [0, 1, 2, 3, 4, 5], // midnight to 6 AM
};

export const DEFAULT_ISOLATION_FOREST_CONFIG: IsolationForestConfig = {
  numTrees: 100,
  sampleSize: 256,
  maxDepth: 8,
  contamination: 0.1, // Expected proportion of anomalies
};

@Injectable()
export class AnomalyDetectionService {
  private readonly logger = new Logger(AnomalyDetectionService.name);
  private readonly config: DetectionConfig;
  private readonly isolationConfig: IsolationForestConfig;

  // Customer patterns cache
  private patterns: Map<string, TransactionPattern> = new Map();

  // Transaction history for velocity checks
  private recentTransactions: Map<string, Transaction[]> = new Map();

  // Statistics tracking
  private stats: AnomalyStats = {
    totalAnalyzed: 0,
    anomaliesDetected: 0,
    byRiskLevel: { low: 0, medium: 0, high: 0, critical: 0 },
    byAnomalyType: {} as Record<AnomalyType, number>,
    averageScore: 0,
  };

  private scoreSum = 0;

  constructor(private readonly configService: ConfigService) {
    this.config = DEFAULT_DETECTION_CONFIG;
    this.isolationConfig = DEFAULT_ISOLATION_FOREST_CONFIG;
    this.logger.log('Anomaly Detection Service initialized');
  }

  // =================== MAIN DETECTION ===================

  /**
   * Analyze a transaction for anomalies
   */
  async analyzeTransaction(transaction: Transaction): Promise<AnomalyResult> {
    const anomalyTypes: AnomalyType[] = [];
    const detectionMethods: DetectionMethod[] = [];
    const reasons: string[] = [];
    let totalScore = 0;

    // Get or create customer pattern
    const pattern = this.getOrCreatePattern(transaction.customerId);

    // 1. Z-score amount analysis
    const zscoreResult = this.analyzeAmountZscore(transaction, pattern);
    if (zscoreResult.isAnomaly) {
      anomalyTypes.push('amount_outlier');
      detectionMethods.push('zscore');
      reasons.push(zscoreResult.reason);
      totalScore += zscoreResult.score;
    }

    // 2. IQR analysis
    const iqrResult = this.analyzeAmountIQR(transaction, pattern);
    if (iqrResult.isAnomaly) {
      if (!anomalyTypes.includes('amount_outlier')) {
        anomalyTypes.push('amount_outlier');
      }
      detectionMethods.push('iqr');
      reasons.push(iqrResult.reason);
      totalScore += iqrResult.score;
    }

    // 3. Velocity analysis
    const velocityResult = this.analyzeVelocity(transaction);
    if (velocityResult.isAnomaly) {
      anomalyTypes.push('velocity_spike');
      detectionMethods.push('rule_based');
      reasons.push(velocityResult.reason);
      totalScore += velocityResult.score;
    }

    // 4. Time-based analysis
    const timeResult = this.analyzeTimePattern(transaction, pattern);
    if (timeResult.isAnomaly) {
      anomalyTypes.push('unusual_time');
      detectionMethods.push('rule_based');
      reasons.push(timeResult.reason);
      totalScore += timeResult.score;
    }

    // 5. Location analysis
    const locationResult = this.analyzeLocation(transaction, pattern);
    if (locationResult.isAnomaly) {
      anomalyTypes.push('location_mismatch');
      detectionMethods.push('rule_based');
      reasons.push(locationResult.reason);
      totalScore += locationResult.score;
    }

    // 6. Round amount check
    const roundResult = this.analyzeRoundAmount(transaction);
    if (roundResult.isAnomaly) {
      anomalyTypes.push('round_amount');
      detectionMethods.push('rule_based');
      reasons.push(roundResult.reason);
      totalScore += roundResult.score;
    }

    // 7. High-risk category check
    const categoryResult = this.analyzeCategory(transaction);
    if (categoryResult.isAnomaly) {
      anomalyTypes.push('high_risk_category');
      detectionMethods.push('rule_based');
      reasons.push(categoryResult.reason);
      totalScore += categoryResult.score;
    }

    // 8. Isolation Forest analysis
    const isolationResult = this.analyzeIsolationForest(transaction, pattern);
    if (isolationResult.isAnomaly) {
      anomalyTypes.push('pattern_deviation');
      detectionMethods.push('isolation_forest');
      reasons.push(isolationResult.reason);
      totalScore += isolationResult.score;
    }

    // Calculate final score (cap at 100)
    const finalScore = Math.min(100, totalScore);
    const isAnomaly = finalScore >= 30;
    const riskLevel = this.calculateRiskLevel(finalScore);
    const confidence = this.calculateConfidence(detectionMethods, pattern);
    const recommendedAction = this.getRecommendedAction(riskLevel, confidence);

    // Update statistics
    this.updateStats(finalScore, isAnomaly, riskLevel, anomalyTypes);

    // Update pattern with this transaction
    this.updatePattern(transaction, pattern);

    // Store in recent transactions
    this.storeRecentTransaction(transaction);

    return {
      transactionId: transaction.id,
      isAnomaly,
      score: finalScore,
      riskLevel,
      anomalyTypes,
      detectionMethods,
      reasons,
      confidence,
      recommendedAction,
      detectedAt: new Date(),
    };
  }

  /**
   * Batch analyze multiple transactions
   */
  async analyzeTransactions(transactions: Transaction[]): Promise<AnomalyResult[]> {
    const results: AnomalyResult[] = [];

    for (const transaction of transactions) {
      const result = await this.analyzeTransaction(transaction);
      results.push(result);
    }

    return results;
  }

  // =================== ANALYSIS METHODS ===================

  private analyzeAmountZscore(
    transaction: Transaction,
    pattern: TransactionPattern,
  ): { isAnomaly: boolean; score: number; reason: string } {
    if (pattern.transactionCount < this.config.minTransactionsForPattern) {
      return { isAnomaly: false, score: 0, reason: '' };
    }

    if (pattern.stdDevAmount === 0) {
      const deviation = Math.abs(transaction.amount - pattern.averageAmount);
      const isAnomaly = deviation > pattern.averageAmount * 0.5;
      return {
        isAnomaly,
        score: isAnomaly ? 25 : 0,
        reason: isAnomaly ? `Amount ${transaction.amount} deviates from average ${pattern.averageAmount.toFixed(2)}` : '',
      };
    }

    const zscore = (transaction.amount - pattern.averageAmount) / pattern.stdDevAmount;
    const absZscore = Math.abs(zscore);
    const isAnomaly = absZscore > this.config.zscoreThreshold;

    return {
      isAnomaly,
      score: isAnomaly ? Math.min(40, absZscore * 10) : 0,
      reason: isAnomaly
        ? `Amount z-score ${absZscore.toFixed(2)} exceeds threshold (${this.config.zscoreThreshold})`
        : '',
    };
  }

  private analyzeAmountIQR(
    transaction: Transaction,
    pattern: TransactionPattern,
  ): { isAnomaly: boolean; score: number; reason: string } {
    // Simplified IQR using stdDev as proxy (would need full history for true IQR)
    if (pattern.transactionCount < this.config.minTransactionsForPattern) {
      return { isAnomaly: false, score: 0, reason: '' };
    }

    const iqr = pattern.stdDevAmount * 1.35; // Approximate IQR from stdDev
    const lowerBound = pattern.averageAmount - this.config.iqrMultiplier * iqr;
    const upperBound = pattern.averageAmount + this.config.iqrMultiplier * iqr;

    const isAnomaly = transaction.amount < lowerBound || transaction.amount > upperBound;

    return {
      isAnomaly,
      score: isAnomaly ? 25 : 0,
      reason: isAnomaly
        ? `Amount ${transaction.amount} outside IQR bounds [${lowerBound.toFixed(2)}, ${upperBound.toFixed(2)}]`
        : '',
    };
  }

  private analyzeVelocity(
    transaction: Transaction,
  ): { isAnomaly: boolean; score: number; reason: string } {
    const recent = this.recentTransactions.get(transaction.customerId) || [];
    const windowStart = new Date(
      transaction.timestamp.getTime() - this.config.velocityWindow * 60 * 1000,
    );

    const recentCount = recent.filter(
      (t) => t.timestamp >= windowStart && t.id !== transaction.id,
    ).length;

    const isAnomaly = recentCount >= this.config.velocityThreshold;

    return {
      isAnomaly,
      score: isAnomaly ? Math.min(35, (recentCount / this.config.velocityThreshold) * 20) : 0,
      reason: isAnomaly
        ? `High velocity: ${recentCount + 1} transactions in ${this.config.velocityWindow} minutes`
        : '',
    };
  }

  private analyzeTimePattern(
    transaction: Transaction,
    pattern: TransactionPattern,
  ): { isAnomaly: boolean; score: number; reason: string } {
    const hour = transaction.timestamp.getHours();
    const isUnusualHour = this.config.unusualHours.includes(hour);

    // Check if this hour is typical for the customer
    const isAtypicalForCustomer =
      pattern.typicalHours.length > 0 && !pattern.typicalHours.includes(hour);

    const isAnomaly = isUnusualHour || isAtypicalForCustomer;

    return {
      isAnomaly,
      score: isAnomaly ? (isUnusualHour ? 15 : 10) : 0,
      reason: isAnomaly
        ? `Transaction at unusual hour (${hour}:00)`
        : '',
    };
  }

  private analyzeLocation(
    transaction: Transaction,
    pattern: TransactionPattern,
  ): { isAnomaly: boolean; score: number; reason: string } {
    if (!transaction.location) {
      return { isAnomaly: false, score: 0, reason: '' };
    }

    const location = transaction.location.country;
    const isNewLocation =
      pattern.commonLocations.length > 0 &&
      !pattern.commonLocations.includes(location);

    return {
      isAnomaly: isNewLocation,
      score: isNewLocation ? 20 : 0,
      reason: isNewLocation
        ? `New location detected: ${location}`
        : '',
    };
  }

  private analyzeRoundAmount(
    transaction: Transaction,
  ): { isAnomaly: boolean; score: number; reason: string } {
    const amount = transaction.amount;

    // Check for suspiciously round amounts
    const isRound =
      amount >= this.config.roundAmountThreshold &&
      amount % 100 === 0 &&
      amount >= 1000;

    return {
      isAnomaly: isRound,
      score: isRound ? 10 : 0,
      reason: isRound
        ? `Suspiciously round amount: ${amount}`
        : '',
    };
  }

  private analyzeCategory(
    transaction: Transaction,
  ): { isAnomaly: boolean; score: number; reason: string } {
    if (!transaction.category) {
      return { isAnomaly: false, score: 0, reason: '' };
    }

    const isHighRisk = this.config.highRiskCategories.includes(
      transaction.category.toLowerCase(),
    );

    return {
      isAnomaly: isHighRisk,
      score: isHighRisk ? 20 : 0,
      reason: isHighRisk
        ? `High-risk category: ${transaction.category}`
        : '',
    };
  }

  private analyzeIsolationForest(
    transaction: Transaction,
    pattern: TransactionPattern,
  ): { isAnomaly: boolean; score: number; reason: string } {
    // Simplified Isolation Forest scoring using path length estimation
    // In production, would use a proper ML library

    if (pattern.transactionCount < this.config.minTransactionsForPattern) {
      return { isAnomaly: false, score: 0, reason: '' };
    }

    // Calculate anomaly score based on feature deviation
    const features = this.extractFeatures(transaction, pattern);
    const pathLength = this.estimatePathLength(features);

    // Normalize to 0-1 range (shorter path = more anomalous)
    const avgPathLength = Math.log2(pattern.transactionCount);
    const anomalyScore = Math.pow(2, -pathLength / avgPathLength);

    const isAnomaly = anomalyScore > (1 - this.isolationConfig.contamination);

    return {
      isAnomaly,
      score: isAnomaly ? Math.round(anomalyScore * 30) : 0,
      reason: isAnomaly
        ? `Isolation Forest anomaly score: ${(anomalyScore * 100).toFixed(1)}%`
        : '',
    };
  }

  private extractFeatures(
    transaction: Transaction,
    pattern: TransactionPattern,
  ): number[] {
    const features: number[] = [];

    // Amount deviation
    if (pattern.averageAmount > 0) {
      features.push((transaction.amount - pattern.averageAmount) / pattern.averageAmount);
    } else {
      features.push(0);
    }

    // Hour of day (normalized)
    features.push(transaction.timestamp.getHours() / 24);

    // Day of week (normalized)
    features.push(transaction.timestamp.getDay() / 7);

    // Is weekend
    features.push(transaction.timestamp.getDay() === 0 || transaction.timestamp.getDay() === 6 ? 1 : 0);

    return features;
  }

  private estimatePathLength(features: number[]): number {
    // Simplified path length estimation
    // In production, would build actual isolation trees

    let pathLength = 0;
    for (const feature of features) {
      // More extreme values = shorter path
      pathLength += Math.log2(1 + Math.abs(feature));
    }

    return Math.max(1, pathLength);
  }

  // =================== PATTERN MANAGEMENT ===================

  private getOrCreatePattern(customerId: string): TransactionPattern {
    let pattern = this.patterns.get(customerId);

    if (!pattern) {
      pattern = {
        customerId,
        averageAmount: 0,
        stdDevAmount: 0,
        transactionCount: 0,
        averageFrequency: 0,
        typicalHours: [],
        typicalDays: [],
        commonCategories: [],
        commonLocations: [],
        lastUpdated: new Date(),
      };
      this.patterns.set(customerId, pattern);
    }

    return pattern;
  }

  private updatePattern(transaction: Transaction, pattern: TransactionPattern): void {
    const n = pattern.transactionCount;
    const newN = n + 1;

    // Update running average
    const newAvg = (pattern.averageAmount * n + transaction.amount) / newN;

    // Update running standard deviation (Welford's algorithm)
    const delta = transaction.amount - pattern.averageAmount;
    const delta2 = transaction.amount - newAvg;
    const newM2 = pattern.stdDevAmount * pattern.stdDevAmount * n + delta * delta2;
    const newStdDev = newN > 1 ? Math.sqrt(newM2 / (newN - 1)) : 0;

    pattern.averageAmount = newAvg;
    pattern.stdDevAmount = newStdDev;
    pattern.transactionCount = newN;

    // Update typical hours
    const hour = transaction.timestamp.getHours();
    if (!pattern.typicalHours.includes(hour)) {
      pattern.typicalHours.push(hour);
      if (pattern.typicalHours.length > 10) {
        pattern.typicalHours.shift();
      }
    }

    // Update typical days
    const day = transaction.timestamp.getDay();
    if (!pattern.typicalDays.includes(day)) {
      pattern.typicalDays.push(day);
    }

    // Update common categories
    if (transaction.category && !pattern.commonCategories.includes(transaction.category)) {
      pattern.commonCategories.push(transaction.category);
      if (pattern.commonCategories.length > 10) {
        pattern.commonCategories.shift();
      }
    }

    // Update common locations
    if (transaction.location && !pattern.commonLocations.includes(transaction.location.country)) {
      pattern.commonLocations.push(transaction.location.country);
      if (pattern.commonLocations.length > 5) {
        pattern.commonLocations.shift();
      }
    }

    pattern.lastUpdated = new Date();
  }

  /**
   * Get pattern for a customer
   */
  getPattern(customerId: string): TransactionPattern | null {
    return this.patterns.get(customerId) || null;
  }

  /**
   * Update pattern with historical data
   */
  buildPatternFromHistory(
    customerId: string,
    transactions: Transaction[],
  ): TransactionPattern {
    const pattern = this.getOrCreatePattern(customerId);

    // Reset pattern
    pattern.averageAmount = 0;
    pattern.stdDevAmount = 0;
    pattern.transactionCount = 0;
    pattern.typicalHours = [];
    pattern.typicalDays = [];
    pattern.commonCategories = [];
    pattern.commonLocations = [];

    // Build pattern from history
    for (const transaction of transactions) {
      this.updatePattern(transaction, pattern);
    }

    return pattern;
  }

  // =================== HELPER METHODS ===================

  private storeRecentTransaction(transaction: Transaction): void {
    const recent = this.recentTransactions.get(transaction.customerId) || [];
    recent.push(transaction);

    // Keep only last hour of transactions
    const cutoff = new Date(Date.now() - this.config.velocityWindow * 60 * 1000);
    const filtered = recent.filter((t) => t.timestamp >= cutoff);

    this.recentTransactions.set(transaction.customerId, filtered);
  }

  private calculateRiskLevel(score: number): RiskLevel {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  private calculateConfidence(
    methods: DetectionMethod[],
    pattern: TransactionPattern,
  ): number {
    let confidence = 0.5; // Base confidence

    // More methods agreeing = higher confidence
    confidence += methods.length * 0.1;

    // More historical data = higher confidence
    if (pattern.transactionCount >= 100) {
      confidence += 0.2;
    } else if (pattern.transactionCount >= 50) {
      confidence += 0.15;
    } else if (pattern.transactionCount >= 20) {
      confidence += 0.1;
    }

    return Math.min(1, confidence);
  }

  private getRecommendedAction(
    riskLevel: RiskLevel,
    confidence: number,
  ): 'approve' | 'review' | 'flag' | 'block' {
    if (riskLevel === 'critical' && confidence >= 0.7) return 'block';
    if (riskLevel === 'critical') return 'flag';
    if (riskLevel === 'high' && confidence >= 0.6) return 'flag';
    if (riskLevel === 'high' || riskLevel === 'medium') return 'review';
    return 'approve';
  }

  private updateStats(
    score: number,
    isAnomaly: boolean,
    riskLevel: RiskLevel,
    anomalyTypes: AnomalyType[],
  ): void {
    this.stats.totalAnalyzed++;
    this.scoreSum += score;
    this.stats.averageScore = this.scoreSum / this.stats.totalAnalyzed;

    if (isAnomaly) {
      this.stats.anomaliesDetected++;
      this.stats.byRiskLevel[riskLevel]++;

      for (const type of anomalyTypes) {
        this.stats.byAnomalyType[type] = (this.stats.byAnomalyType[type] || 0) + 1;
      }
    }
  }

  // =================== PUBLIC API ===================

  /**
   * Get detection statistics
   */
  getStats(): AnomalyStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalAnalyzed: 0,
      anomaliesDetected: 0,
      byRiskLevel: { low: 0, medium: 0, high: 0, critical: 0 },
      byAnomalyType: {} as Record<AnomalyType, number>,
      averageScore: 0,
    };
    this.scoreSum = 0;
  }

  /**
   * Get current configuration
   */
  getConfig(): { detection: DetectionConfig; isolationForest: IsolationForestConfig } {
    return {
      detection: { ...this.config },
      isolationForest: { ...this.isolationConfig },
    };
  }

  /**
   * Update detection configuration
   */
  updateConfig(config: Partial<DetectionConfig>): DetectionConfig {
    Object.assign(this.config, config);
    return { ...this.config };
  }

  /**
   * Clear all cached patterns
   */
  clearPatterns(): void {
    this.patterns.clear();
    this.recentTransactions.clear();
    this.logger.log('All patterns cleared');
  }

  /**
   * Get all customer patterns
   */
  getAllPatterns(): TransactionPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Generate risk report for a customer
   */
  generateRiskReport(customerId: string): {
    customerId: string;
    pattern: TransactionPattern | null;
    riskProfile: {
      overallRisk: RiskLevel;
      anomalyRate: number;
      averageScore: number;
      topConcerns: string[];
    };
  } {
    const pattern = this.patterns.get(customerId);

    if (!pattern) {
      return {
        customerId,
        pattern: null,
        riskProfile: {
          overallRisk: 'low',
          anomalyRate: 0,
          averageScore: 0,
          topConcerns: ['Insufficient transaction history'],
        },
      };
    }

    // Calculate risk metrics
    const concerns: string[] = [];

    if (pattern.stdDevAmount > pattern.averageAmount) {
      concerns.push('High amount variability');
    }

    if (pattern.commonLocations.length > 3) {
      concerns.push('Multiple transaction locations');
    }

    if (pattern.typicalHours.some((h) => this.config.unusualHours.includes(h))) {
      concerns.push('Transactions at unusual hours');
    }

    const anomalyRate = this.stats.totalAnalyzed > 0
      ? this.stats.anomaliesDetected / this.stats.totalAnalyzed
      : 0;

    return {
      customerId,
      pattern,
      riskProfile: {
        overallRisk: this.calculateRiskLevel(this.stats.averageScore),
        anomalyRate,
        averageScore: this.stats.averageScore,
        topConcerns: concerns.length > 0 ? concerns : ['No significant concerns'],
      },
    };
  }
}
