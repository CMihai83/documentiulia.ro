import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService, NotificationType } from '../notifications/notifications.service';
import {
  FraudAlertDto,
  CreateFraudAlertDto,
  UpdateFraudAlertDto,
  FraudAlertType,
  FraudAlertSeverity,
  FraudAlertStatus,
  TransactionAnalysisDto,
  FraudDashboardStatsDto,
  FraudDetectionRulesDto,
} from './fraud-detection.dto';
import {
  FraudRulesEngine,
  DEFAULT_FRAUD_RULES,
  calculateRiskScore,
  determineSeverity,
  FraudRule,
} from './fraud-rules';

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);
  private rulesEngine: FraudRulesEngine;
  private readonly ANOMALY_THRESHOLD = 3; // Standard deviations

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {
    this.rulesEngine = new FraudRulesEngine(DEFAULT_FRAUD_RULES);
  }

  /**
   * Analyze a transaction for potential fraud
   */
  async analyzeTransaction(transaction: TransactionAnalysisDto): Promise<FraudAlertDto[]> {
    const alerts: FraudAlertDto[] = [];

    try {
      // Run all enabled fraud detection checks
      const unusualAmountAlert = await this.detectUnusualAmount(transaction);
      if (unusualAmountAlert) alerts.push(unusualAmountAlert);

      const duplicateAlert = await this.detectDuplicateInvoice(transaction);
      if (duplicateAlert) alerts.push(duplicateAlert);

      const rapidSuccessionAlert = await this.detectRapidSuccession(transaction);
      if (rapidSuccessionAlert) alerts.push(rapidSuccessionAlert);

      const vendorAnomalyAlert = await this.detectVendorAnomaly(transaction);
      if (vendorAnomalyAlert) alerts.push(vendorAnomalyAlert);

      const geoAlert = await this.detectGeographicInconsistency(transaction);
      if (geoAlert) alerts.push(geoAlert);

      const timingAlerts = await this.detectSuspiciousTiming(transaction);
      alerts.push(...timingAlerts);

      const velocityAlert = await this.detectVelocityAnomaly(transaction);
      if (velocityAlert) alerts.push(velocityAlert);

      // Save alerts to database and send notifications
      for (const alert of alerts) {
        await this.createAlert(alert);
      }

      return alerts;
    } catch (error) {
      this.logger.error(`Error analyzing transaction ${transaction.transactionId}:`, error);
      return [];
    }
  }

  /**
   * Detect unusual transaction amounts using statistical analysis
   */
  private async detectUnusualAmount(transaction: TransactionAnalysisDto): Promise<FraudAlertDto | null> {
    const rule = this.rulesEngine.getRule(FraudAlertType.UNUSUAL_AMOUNT);
    if (!rule?.enabled) return null;

    // Get user's historical transaction statistics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const userTransactions = await this.prisma.invoice.findMany({
      where: {
        userId: transaction.userId,
        invoiceDate: { gte: thirtyDaysAgo },
      },
      select: { grossAmount: true },
    });

    if (userTransactions.length < 5) return null; // Need minimum data

    // Calculate mean and standard deviation
    const amounts = userTransactions.map(t => Number(t.grossAmount));
    const mean = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
    const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    // Check if current transaction is an anomaly
    const zScore = Math.abs((transaction.amount - mean) / stdDev);
    const threshold = rule.threshold || this.ANOMALY_THRESHOLD;

    if (zScore > threshold) {
      const riskScore = calculateRiskScore(FraudAlertType.UNUSUAL_AMOUNT, zScore / threshold, {
        amountFactor: transaction.amount / mean - 1,
      });

      return {
        id: '', // Will be set by createAlert
        userId: transaction.userId,
        type: FraudAlertType.UNUSUAL_AMOUNT,
        severity: determineSeverity(riskScore),
        status: FraudAlertStatus.PENDING,
        title: 'Unusual Transaction Amount Detected',
        description: `Transaction amount ${transaction.amount} ${transaction.currency} is ${zScore.toFixed(1)} standard deviations above your average of ${mean.toFixed(2)} ${transaction.currency}`,
        riskScore,
        entityType: 'TRANSACTION',
        entityId: transaction.transactionId,
        metadata: {
          amount: transaction.amount,
          average: mean,
          stdDev,
          zScore: zScore.toFixed(2),
          threshold,
        },
        detectedAt: new Date(),
      };
    }

    return null;
  }

  /**
   * Detect duplicate invoices
   */
  private async detectDuplicateInvoice(transaction: TransactionAnalysisDto): Promise<FraudAlertDto | null> {
    const rule = this.rulesEngine.getRule(FraudAlertType.DUPLICATE_INVOICE);
    if (!rule?.enabled) return null;

    const timeWindow = (rule.threshold || 24) * 60 * 60 * 1000; // Hours to milliseconds
    const windowStart = new Date(transaction.timestamp.getTime() - timeWindow);

    // Check for similar transactions
    const duplicates = await this.prisma.invoice.findMany({
      where: {
        userId: transaction.userId,
        grossAmount: transaction.amount,
        invoiceDate: { gte: windowStart, lt: transaction.timestamp },
      },
    });

    if (duplicates.length > 0) {
      const riskScore = calculateRiskScore(FraudAlertType.DUPLICATE_INVOICE, 0.9, {
        duplicateCount: duplicates.length * 0.1,
      });

      return {
        id: '',
        userId: transaction.userId,
        type: FraudAlertType.DUPLICATE_INVOICE,
        severity: FraudAlertSeverity.HIGH,
        status: FraudAlertStatus.PENDING,
        title: 'Potential Duplicate Invoice',
        description: `Found ${duplicates.length} similar transaction(s) with the same amount within ${rule.threshold} hours`,
        riskScore,
        entityType: 'TRANSACTION',
        entityId: transaction.transactionId,
        metadata: {
          duplicateCount: duplicates.length,
          duplicateIds: duplicates.map(d => d.id),
          amount: transaction.amount,
        },
        detectedAt: new Date(),
      };
    }

    return null;
  }

  /**
   * Detect rapid succession of transactions
   */
  private async detectRapidSuccession(transaction: TransactionAnalysisDto): Promise<FraudAlertDto | null> {
    const rule = this.rulesEngine.getRule(FraudAlertType.RAPID_SUCCESSION);
    if (!rule?.enabled) return null;

    const timeWindow = (rule.threshold || 5) * 60 * 1000; // Minutes to milliseconds
    const windowStart = new Date(transaction.timestamp.getTime() - timeWindow);

    const recentTransactions = await this.prisma.invoice.findMany({
      where: {
        userId: transaction.userId,
        invoiceDate: { gte: windowStart, lt: transaction.timestamp },
      },
    });

    if (recentTransactions.length >= 3) {
      const riskScore = calculateRiskScore(FraudAlertType.RAPID_SUCCESSION, 0.8, {
        velocity: recentTransactions.length / (rule.threshold || 5),
      });

      return {
        id: '',
        userId: transaction.userId,
        type: FraudAlertType.RAPID_SUCCESSION,
        severity: determineSeverity(riskScore),
        status: FraudAlertStatus.PENDING,
        title: 'Rapid Transaction Succession',
        description: `${recentTransactions.length} transactions detected within ${rule.threshold} minutes`,
        riskScore,
        entityType: 'TRANSACTION',
        entityId: transaction.transactionId,
        metadata: {
          transactionCount: recentTransactions.length,
          timeWindow: rule.threshold,
          transactionIds: recentTransactions.map(t => t.id),
        },
        detectedAt: new Date(),
      };
    }

    return null;
  }

  /**
   * Detect vendor anomalies
   */
  private async detectVendorAnomaly(transaction: TransactionAnalysisDto): Promise<FraudAlertDto | null> {
    if (!transaction.vendorId) return null;

    const rule = this.rulesEngine.getRule(FraudAlertType.VENDOR_ANOMALY);
    if (!rule?.enabled) return null;

    // Check if vendor is new to the user
    const firstTransaction = await this.prisma.invoice.findFirst({
      where: {
        userId: transaction.userId,
        partnerName: transaction.vendorName,
      },
      orderBy: { invoiceDate: 'asc' },
    });

    if (firstTransaction) {
      const vendorAgeDays = Math.floor(
        (transaction.timestamp.getTime() - firstTransaction.invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // New vendor with large transaction
      if (vendorAgeDays < 7 && transaction.amount > 10000) {
        const riskScore = calculateRiskScore(FraudAlertType.VENDOR_ANOMALY, 0.7, {
          amountFactor: transaction.amount / 10000,
          newnessFactor: (7 - vendorAgeDays) / 7,
        });

        return {
          id: '',
          userId: transaction.userId,
          type: FraudAlertType.VENDOR_ANOMALY,
          severity: determineSeverity(riskScore),
          status: FraudAlertStatus.PENDING,
          title: 'New Vendor with Large Transaction',
          description: `Large transaction (${transaction.amount} ${transaction.currency}) with vendor added only ${vendorAgeDays} days ago`,
          riskScore,
          entityType: 'TRANSACTION',
          entityId: transaction.transactionId,
          metadata: {
            vendorId: transaction.vendorId,
            vendorName: transaction.vendorName,
            vendorAgeDays,
            amount: transaction.amount,
          },
          detectedAt: new Date(),
        };
      }
    }

    return null;
  }

  /**
   * Detect geographic inconsistencies
   */
  private async detectGeographicInconsistency(transaction: TransactionAnalysisDto): Promise<FraudAlertDto | null> {
    if (!transaction.location && !transaction.ipAddress) return null;

    const rule = this.rulesEngine.getRule(FraudAlertType.GEOGRAPHIC_INCONSISTENCY);
    if (!rule?.enabled) return null;

    // Get most recent transaction location
    const recentTransaction = await this.prisma.auditLog.findFirst({
      where: {
        userId: transaction.userId,
        action: 'TRANSACTION_CREATED',
      },
      orderBy: { createdAt: 'desc' },
    });

    // For simplicity, this is a placeholder
    // In production, you would use a geolocation service to calculate distance
    if (recentTransaction?.details && typeof recentTransaction.details === 'object') {
      const details = recentTransaction.details as any;
      if (details.location && transaction.location && details.location !== transaction.location) {
        const riskScore = calculateRiskScore(FraudAlertType.GEOGRAPHIC_INCONSISTENCY, 0.95);

        return {
          id: '',
          userId: transaction.userId,
          type: FraudAlertType.GEOGRAPHIC_INCONSISTENCY,
          severity: FraudAlertSeverity.CRITICAL,
          status: FraudAlertStatus.PENDING,
          title: 'Geographic Location Anomaly',
          description: `Transaction initiated from unusual location: ${transaction.location}`,
          riskScore,
          entityType: 'TRANSACTION',
          entityId: transaction.transactionId,
          metadata: {
            currentLocation: transaction.location,
            previousLocation: details.location,
            ipAddress: transaction.ipAddress,
          },
          detectedAt: new Date(),
        };
      }
    }

    return null;
  }

  /**
   * Detect suspicious timing patterns
   */
  private async detectSuspiciousTiming(transaction: TransactionAnalysisDto): Promise<FraudAlertDto[]> {
    const alerts: FraudAlertDto[] = [];
    const hour = transaction.timestamp.getHours();
    const dayOfWeek = transaction.timestamp.getDay();

    // After hours detection
    const afterHoursRule = this.rulesEngine.getRule(FraudAlertType.AFTER_HOURS);
    if (afterHoursRule?.enabled && (hour < 8 || hour > 18)) {
      const riskScore = calculateRiskScore(FraudAlertType.AFTER_HOURS, 0.3);

      alerts.push({
        id: '',
        userId: transaction.userId,
        type: FraudAlertType.AFTER_HOURS,
        severity: FraudAlertSeverity.LOW,
        status: FraudAlertStatus.PENDING,
        title: 'After-Hours Transaction',
        description: `Transaction created at ${hour}:00, outside normal business hours (8:00-18:00)`,
        riskScore,
        entityType: 'TRANSACTION',
        entityId: transaction.transactionId,
        metadata: { hour, timestamp: transaction.timestamp },
        detectedAt: new Date(),
      });
    }

    // Weekend detection
    const weekendRule = this.rulesEngine.getRule(FraudAlertType.WEEKEND_ACTIVITY);
    if (weekendRule?.enabled && (dayOfWeek === 0 || dayOfWeek === 6)) {
      const riskScore = calculateRiskScore(FraudAlertType.WEEKEND_ACTIVITY, 0.25);

      alerts.push({
        id: '',
        userId: transaction.userId,
        type: FraudAlertType.WEEKEND_ACTIVITY,
        severity: FraudAlertSeverity.LOW,
        status: FraudAlertStatus.PENDING,
        title: 'Weekend Transaction',
        description: `Transaction created on ${dayOfWeek === 0 ? 'Sunday' : 'Saturday'}`,
        riskScore,
        entityType: 'TRANSACTION',
        entityId: transaction.transactionId,
        metadata: { dayOfWeek, timestamp: transaction.timestamp },
        detectedAt: new Date(),
      });
    }

    return alerts;
  }

  /**
   * Detect transaction velocity anomalies
   */
  private async detectVelocityAnomaly(transaction: TransactionAnalysisDto): Promise<FraudAlertDto | null> {
    const rule = this.rulesEngine.getRule(FraudAlertType.VELOCITY_ANOMALY);
    if (!rule?.enabled) return null;

    // Calculate current velocity (transactions per day)
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const recentCount = await this.prisma.invoice.count({
      where: {
        userId: transaction.userId,
        invoiceDate: { gte: last7Days },
      },
    });

    const currentVelocity = recentCount / 7;

    // Calculate historical average velocity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const historicalCount = await this.prisma.invoice.count({
      where: {
        userId: transaction.userId,
        invoiceDate: { gte: thirtyDaysAgo, lt: last7Days },
      },
    });

    const historicalVelocity = historicalCount / 23; // 30 - 7 days

    if (historicalVelocity > 0 && currentVelocity > historicalVelocity * 2) {
      const riskScore = calculateRiskScore(FraudAlertType.VELOCITY_ANOMALY, 0.7, {
        velocityRatio: currentVelocity / historicalVelocity - 1,
      });

      return {
        id: '',
        userId: transaction.userId,
        type: FraudAlertType.VELOCITY_ANOMALY,
        severity: determineSeverity(riskScore),
        status: FraudAlertStatus.PENDING,
        title: 'Transaction Velocity Spike',
        description: `Transaction velocity increased by ${((currentVelocity / historicalVelocity - 1) * 100).toFixed(0)}%`,
        riskScore,
        entityType: 'TRANSACTION',
        entityId: transaction.transactionId,
        metadata: {
          currentVelocity: currentVelocity.toFixed(2),
          historicalVelocity: historicalVelocity.toFixed(2),
          increasePercentage: ((currentVelocity / historicalVelocity - 1) * 100).toFixed(0),
        },
        detectedAt: new Date(),
      };
    }

    return null;
  }

  /**
   * Create a fraud alert
   */
  async createAlert(alert: CreateFraudAlertDto | FraudAlertDto): Promise<FraudAlertDto> {
    const created = await this.prisma.auditLog.create({
      data: {
        userId: alert.userId,
        action: 'FRAUD_ALERT_CREATED',
        entity: 'FRAUD_ALERT',
        entityId: alert.entityId || '',
        details: {
          type: alert.type,
          severity: alert.severity,
          title: alert.title,
          description: alert.description,
          riskScore: alert.riskScore,
          status: 'status' in alert ? alert.status : FraudAlertStatus.PENDING,
          metadata: alert.metadata,
        },
      },
    });

    // Send notification for high and critical alerts
    if (alert.severity === FraudAlertSeverity.HIGH || alert.severity === FraudAlertSeverity.CRITICAL) {
      const user = await this.prisma.user.findUnique({
        where: { id: alert.userId },
        select: { email: true, name: true },
      });

      if (user?.email) {
        await this.notifications.send({
          type: NotificationType.COMPLIANCE_ALERT,
          userId: alert.userId,
          recipientEmail: user.email,
          recipientName: user.name || undefined,
          data: {
            alertType: 'FRAUD_DETECTION',
            alertMessage: alert.title,
            deadline: 'Immediate action required',
            requiredAction: 'Review the flagged transaction',
            legalReference: 'Fraud Prevention Policy',
          },
        });
      }
    }

    return {
      ...alert,
      id: created.id,
      status: 'status' in alert ? alert.status : FraudAlertStatus.PENDING,
      detectedAt: created.createdAt,
    } as FraudAlertDto;
  }

  /**
   * Get all alerts for a user
   */
  async getAlerts(userId: string, status?: FraudAlertStatus): Promise<FraudAlertDto[]> {
    const where: any = {
      userId,
      action: 'FRAUD_ALERT_CREATED',
    };

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return logs
      .map(log => {
        const details = log.details as any;
        if (!status || details.status === status) {
          return {
            id: log.id,
            userId: log.userId,
            type: details.type,
            severity: details.severity,
            status: details.status,
            title: details.title,
            description: details.description,
            riskScore: details.riskScore,
            entityType: log.entity,
            entityId: log.entityId,
            metadata: details.metadata,
            detectedAt: log.createdAt,
          } as FraudAlertDto;
        }
        return null;
      })
      .filter((alert): alert is FraudAlertDto => alert !== null);
  }

  /**
   * Update alert status
   */
  async updateAlert(alertId: string, userId: string, update: UpdateFraudAlertDto): Promise<FraudAlertDto> {
    const alert = await this.prisma.auditLog.findFirst({
      where: { id: alertId, userId },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    const details = alert.details as any;
    const updated = await this.prisma.auditLog.update({
      where: { id: alertId },
      data: {
        details: {
          ...details,
          status: update.status || details.status,
          resolution: update.resolution,
          resolvedAt: update.status === FraudAlertStatus.RESOLVED ? new Date() : undefined,
        },
      },
    });

    const updatedDetails = updated.details as any;
    return {
      id: updated.id,
      userId: updated.userId,
      type: updatedDetails.type,
      severity: updatedDetails.severity,
      status: updatedDetails.status,
      title: updatedDetails.title,
      description: updatedDetails.description,
      riskScore: updatedDetails.riskScore,
      entityType: updated.entity,
      entityId: updated.entityId ?? undefined,
      metadata: updatedDetails.metadata,
      detectedAt: updated.createdAt,
      resolvedAt: updatedDetails.resolvedAt,
      resolution: updatedDetails.resolution,
    };
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(userId: string): Promise<FraudDashboardStatsDto> {
    const alerts = await this.getAlerts(userId);

    const totalAlerts = alerts.length;
    const criticalAlerts = alerts.filter(a => a.severity === FraudAlertSeverity.CRITICAL).length;
    const pendingAlerts = alerts.filter(a => a.status === FraudAlertStatus.PENDING).length;
    const resolvedAlerts = alerts.filter(a => a.status === FraudAlertStatus.RESOLVED).length;
    const falsePositives = alerts.filter(a => a.status === FraudAlertStatus.FALSE_POSITIVE).length;

    const falsePositiveRate = totalAlerts > 0 ? (falsePositives / totalAlerts) * 100 : 0;
    const averageRiskScore = totalAlerts > 0
      ? alerts.reduce((sum, a) => sum + a.riskScore, 0) / totalAlerts
      : 0;

    // Count by type
    const alertsByType: Record<string, number> = {};
    alerts.forEach(alert => {
      alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
    });

    // Count by severity
    const alertsBySeverity: Record<string, number> = {
      [FraudAlertSeverity.LOW]: 0,
      [FraudAlertSeverity.MEDIUM]: 0,
      [FraudAlertSeverity.HIGH]: 0,
      [FraudAlertSeverity.CRITICAL]: 0,
    };
    alerts.forEach(alert => {
      alertsBySeverity[alert.severity]++;
    });

    // Risk trend (last 30 days)
    const riskTrend: Array<{ date: string; score: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayAlerts = alerts.filter(a => {
        const alertDate = new Date(a.detectedAt).toISOString().split('T')[0];
        return alertDate === dateStr;
      });

      const avgScore = dayAlerts.length > 0
        ? dayAlerts.reduce((sum, a) => sum + a.riskScore, 0) / dayAlerts.length
        : 0;

      riskTrend.push({ date: dateStr, score: Math.round(avgScore) });
    }

    return {
      totalAlerts,
      criticalAlerts,
      pendingAlerts,
      resolvedAlerts,
      falsePositiveRate: Math.round(falsePositiveRate * 10) / 10,
      averageRiskScore: Math.round(averageRiskScore * 10) / 10,
      alertsByType,
      alertsBySeverity,
      riskTrend,
    };
  }

  /**
   * Get fraud detection rules
   */
  getRules(): FraudRule[] {
    return this.rulesEngine.getAllRules();
  }

  /**
   * Update fraud detection rules
   */
  updateRules(rules: Partial<FraudDetectionRulesDto>): void {
    // In production, this would persist to database
    this.logger.log('Fraud detection rules updated', rules);
  }
}
