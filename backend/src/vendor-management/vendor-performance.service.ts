import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { VendorManagementService } from './vendor-management.service';

// =================== TYPES ===================

export type PerformanceRating = 'excellent' | 'good' | 'satisfactory' | 'needs_improvement' | 'poor';
export type EvaluationFrequency = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

export interface PerformanceMetric {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  category: 'quality' | 'delivery' | 'price' | 'service' | 'compliance' | 'innovation';
  weight: number;
  targetValue?: number;
  targetUnit?: string;
  scoringMethod: 'numeric' | 'percentage' | 'rating' | 'yes_no';
  isActive: boolean;
  createdAt: Date;
}

export interface VendorScorecard {
  id: string;
  tenantId: string;
  vendorId: string;
  vendorName: string;
  evaluationPeriod: string;
  evaluationDate: Date;
  scores: MetricScore[];
  overallScore: number;
  overallRating: PerformanceRating;
  strengths: string[];
  improvements: string[];
  actionItems?: ActionItem[];
  comments?: string;
  evaluatedBy: string;
  evaluatedByName: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: Date;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export interface MetricScore {
  metricId: string;
  metricName: string;
  category: string;
  weight: number;
  rawScore: number;
  weightedScore: number;
  targetValue?: number;
  actualValue?: number;
  variance?: number;
  notes?: string;
}

export interface ActionItem {
  id: string;
  description: string;
  dueDate?: Date;
  assignedTo?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completedAt?: Date;
}

export interface PerformanceTrend {
  period: string;
  overallScore: number;
  rating: PerformanceRating;
  categoryScores: Record<string, number>;
}

export interface VendorRanking {
  rank: number;
  vendorId: string;
  vendorName: string;
  vendorTier: string;
  category?: string;
  overallScore: number;
  rating: PerformanceRating;
  trend: 'up' | 'down' | 'stable';
  scorecardCount: number;
}

export interface PerformanceAlert {
  id: string;
  tenantId: string;
  vendorId: string;
  vendorName: string;
  alertType: 'low_score' | 'declining_trend' | 'missed_target' | 'compliance_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metricId?: string;
  metricName?: string;
  threshold?: number;
  actualValue?: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  createdAt: Date;
}

export interface PerformanceGoal {
  id: string;
  tenantId: string;
  vendorId: string;
  vendorName: string;
  metricId: string;
  metricName: string;
  targetValue: number;
  currentValue?: number;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'achieved' | 'missed' | 'cancelled';
  achievedAt?: Date;
  notes?: string;
  createdBy: string;
  createdAt: Date;
}

// =================== SERVICE ===================

@Injectable()
export class VendorPerformanceService {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private scorecards: Map<string, VendorScorecard> = new Map();
  private alerts: Map<string, PerformanceAlert> = new Map();
  private goals: Map<string, PerformanceGoal> = new Map();

  constructor(
    private eventEmitter: EventEmitter2,
    private vendorService: VendorManagementService,
  ) {
    this.initializeDefaultMetrics();
  }

  private initializeDefaultMetrics(): void {
    const defaultMetrics = [
      { name: 'On-Time Delivery Rate', category: 'delivery', weight: 20 },
      { name: 'Product Quality Score', category: 'quality', weight: 25 },
      { name: 'Price Competitiveness', category: 'price', weight: 15 },
      { name: 'Order Accuracy', category: 'quality', weight: 15 },
      { name: 'Response Time', category: 'service', weight: 10 },
      { name: 'Issue Resolution', category: 'service', weight: 10 },
      { name: 'Compliance Adherence', category: 'compliance', weight: 5 },
    ];

    for (const metric of defaultMetrics) {
      const id = `metric-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      this.metrics.set(id, {
        id,
        tenantId: 'system',
        name: metric.name,
        category: metric.category as any,
        weight: metric.weight,
        scoringMethod: 'percentage',
        isActive: true,
        createdAt: new Date(),
      });
    }
  }

  // =================== METRICS ===================

  async createMetric(data: {
    tenantId: string;
    name: string;
    description?: string;
    category: PerformanceMetric['category'];
    weight: number;
    targetValue?: number;
    targetUnit?: string;
    scoringMethod: PerformanceMetric['scoringMethod'];
  }): Promise<PerformanceMetric> {
    const id = `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const metric: PerformanceMetric = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      category: data.category,
      weight: data.weight,
      targetValue: data.targetValue,
      targetUnit: data.targetUnit,
      scoringMethod: data.scoringMethod,
      isActive: true,
      createdAt: new Date(),
    };

    this.metrics.set(id, metric);

    return metric;
  }

  async getMetrics(tenantId: string): Promise<PerformanceMetric[]> {
    return Array.from(this.metrics.values()).filter(
      (m) => (m.tenantId === tenantId || m.tenantId === 'system') && m.isActive,
    );
  }

  async updateMetric(
    id: string,
    updates: Partial<PerformanceMetric>,
  ): Promise<PerformanceMetric | null> {
    const metric = this.metrics.get(id);
    if (!metric) return null;

    Object.assign(metric, updates, { id: metric.id, tenantId: metric.tenantId });
    this.metrics.set(id, metric);

    return metric;
  }

  // =================== SCORECARDS ===================

  async createScorecard(data: {
    tenantId: string;
    vendorId: string;
    evaluationPeriod: string;
    scores: Omit<MetricScore, 'weightedScore'>[];
    strengths?: string[];
    improvements?: string[];
    actionItems?: Omit<ActionItem, 'id'>[];
    comments?: string;
    evaluatedBy: string;
    evaluatedByName: string;
  }): Promise<VendorScorecard> {
    const vendor = await this.vendorService.getVendor(data.vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    const id = `scorecard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    // Calculate weighted scores
    const scores: MetricScore[] = data.scores.map((score) => ({
      ...score,
      weightedScore: Math.round((score.rawScore * score.weight / 100) * 100) / 100,
    }));

    // Calculate overall score
    const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
    const weightedSum = scores.reduce((sum, s) => sum + s.weightedScore, 0);
    const overallScore = totalWeight > 0
      ? Math.round((weightedSum / totalWeight * 100) * 100) / 100
      : 0;

    // Determine rating
    const overallRating = this.calculateRating(overallScore);

    // Generate action items with IDs
    const actionItems: ActionItem[] = (data.actionItems || []).map((item, i) => ({
      ...item,
      id: `action-${Date.now()}-${i}`,
    }));

    const scorecard: VendorScorecard = {
      id,
      tenantId: data.tenantId,
      vendorId: data.vendorId,
      vendorName: vendor.name,
      evaluationPeriod: data.evaluationPeriod,
      evaluationDate: now,
      scores,
      overallScore,
      overallRating,
      strengths: data.strengths || [],
      improvements: data.improvements || [],
      actionItems,
      comments: data.comments,
      evaluatedBy: data.evaluatedBy,
      evaluatedByName: data.evaluatedByName,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };

    this.scorecards.set(id, scorecard);

    // Check for alerts
    await this.checkPerformanceAlerts(scorecard, vendor);

    this.eventEmitter.emit('vendor.scorecard_created', { scorecard });

    return scorecard;
  }

  private calculateRating(score: number): PerformanceRating {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'satisfactory';
    if (score >= 40) return 'needs_improvement';
    return 'poor';
  }

  async getScorecard(id: string): Promise<VendorScorecard | null> {
    return this.scorecards.get(id) || null;
  }

  async getVendorScorecards(
    vendorId: string,
    limit?: number,
  ): Promise<VendorScorecard[]> {
    let scorecards = Array.from(this.scorecards.values())
      .filter((s) => s.vendorId === vendorId)
      .sort((a, b) => b.evaluationDate.getTime() - a.evaluationDate.getTime());

    if (limit) {
      scorecards = scorecards.slice(0, limit);
    }

    return scorecards;
  }

  async getScorecards(
    tenantId: string,
    filters?: {
      vendorId?: string;
      period?: string;
      status?: VendorScorecard['status'];
      minScore?: number;
      maxScore?: number;
      limit?: number;
    },
  ): Promise<VendorScorecard[]> {
    let scorecards = Array.from(this.scorecards.values()).filter(
      (s) => s.tenantId === tenantId,
    );

    if (filters?.vendorId) {
      scorecards = scorecards.filter((s) => s.vendorId === filters.vendorId);
    }

    if (filters?.period) {
      scorecards = scorecards.filter((s) => s.evaluationPeriod === filters.period);
    }

    if (filters?.status) {
      scorecards = scorecards.filter((s) => s.status === filters.status);
    }

    if (filters?.minScore !== undefined) {
      scorecards = scorecards.filter((s) => s.overallScore >= filters.minScore!);
    }

    if (filters?.maxScore !== undefined) {
      scorecards = scorecards.filter((s) => s.overallScore <= filters.maxScore!);
    }

    scorecards = scorecards.sort((a, b) => b.evaluationDate.getTime() - a.evaluationDate.getTime());

    if (filters?.limit) {
      scorecards = scorecards.slice(0, filters.limit);
    }

    return scorecards;
  }

  async submitScorecard(id: string): Promise<VendorScorecard | null> {
    const scorecard = this.scorecards.get(id);
    if (!scorecard || scorecard.status !== 'draft') return null;

    scorecard.status = 'submitted';
    scorecard.updatedAt = new Date();

    this.scorecards.set(id, scorecard);

    return scorecard;
  }

  async approveScorecard(
    id: string,
    approvedBy: string,
    approvedByName: string,
  ): Promise<VendorScorecard | null> {
    const scorecard = this.scorecards.get(id);
    if (!scorecard || scorecard.status !== 'submitted') return null;

    scorecard.status = 'approved';
    scorecard.approvedBy = approvedBy;
    scorecard.approvedByName = approvedByName;
    scorecard.approvedAt = new Date();
    scorecard.updatedAt = new Date();

    this.scorecards.set(id, scorecard);

    // Update vendor tier based on performance
    await this.updateVendorTierBasedOnPerformance(scorecard);

    this.eventEmitter.emit('vendor.scorecard_approved', { scorecard });

    return scorecard;
  }

  private async updateVendorTierBasedOnPerformance(
    scorecard: VendorScorecard,
  ): Promise<void> {
    const vendor = await this.vendorService.getVendor(scorecard.vendorId);
    if (!vendor) return;

    // Get recent scorecards
    const recentScorecards = await this.getVendorScorecards(scorecard.vendorId, 4);
    if (recentScorecards.length < 2) return;

    const avgScore = recentScorecards.reduce((sum, s) => sum + s.overallScore, 0) /
      recentScorecards.length;

    let newTier = vendor.tier;

    if (avgScore >= 90 && vendor.tier !== 'strategic') {
      newTier = 'strategic';
    } else if (avgScore >= 75 && !['strategic', 'preferred'].includes(vendor.tier)) {
      newTier = 'preferred';
    } else if (avgScore >= 60 && vendor.tier === 'new') {
      newTier = 'approved';
    } else if (avgScore < 40 && vendor.tier !== 'conditional') {
      newTier = 'conditional';
    }

    if (newTier !== vendor.tier) {
      await this.vendorService.updateVendorTier(
        scorecard.vendorId,
        newTier,
        `Performance-based tier update. Average score: ${avgScore}%`,
      );
    }
  }

  private async checkPerformanceAlerts(
    scorecard: VendorScorecard,
    vendor: any,
  ): Promise<void> {
    // Check for low overall score
    if (scorecard.overallScore < 50) {
      await this.createAlert({
        tenantId: scorecard.tenantId,
        vendorId: scorecard.vendorId,
        vendorName: vendor.name,
        alertType: 'low_score',
        severity: scorecard.overallScore < 30 ? 'critical' : 'high',
        message: `Vendor ${vendor.name} scored ${scorecard.overallScore}% in ${scorecard.evaluationPeriod}`,
      });
    }

    // Check for individual metric issues
    for (const score of scorecard.scores) {
      if (score.rawScore < 40) {
        await this.createAlert({
          tenantId: scorecard.tenantId,
          vendorId: scorecard.vendorId,
          vendorName: vendor.name,
          alertType: 'missed_target',
          severity: 'medium',
          message: `Low score on ${score.metricName}: ${score.rawScore}%`,
          metricId: score.metricId,
          metricName: score.metricName,
          actualValue: score.rawScore,
        });
      }
    }

    // Check for declining trend
    const previousScorecards = await this.getVendorScorecards(scorecard.vendorId, 3);
    if (previousScorecards.length >= 3) {
      const trend = previousScorecards.slice(0, 3).every(
        (s, i, arr) => i === 0 || s.overallScore < arr[i - 1].overallScore,
      );

      if (trend) {
        await this.createAlert({
          tenantId: scorecard.tenantId,
          vendorId: scorecard.vendorId,
          vendorName: vendor.name,
          alertType: 'declining_trend',
          severity: 'high',
          message: `Vendor ${vendor.name} shows declining performance over last 3 evaluations`,
        });
      }
    }
  }

  // =================== TRENDS ===================

  async getPerformanceTrends(
    vendorId: string,
    periods?: number,
  ): Promise<PerformanceTrend[]> {
    const scorecards = await this.getVendorScorecards(vendorId, periods || 12);

    return scorecards.map((scorecard) => {
      const categoryScores: Record<string, number> = {};

      for (const score of scorecard.scores) {
        if (!categoryScores[score.category]) {
          categoryScores[score.category] = 0;
        }
        categoryScores[score.category] += score.rawScore;
      }

      // Average by category
      const categoryCounts: Record<string, number> = {};
      for (const score of scorecard.scores) {
        categoryCounts[score.category] = (categoryCounts[score.category] || 0) + 1;
      }
      for (const cat of Object.keys(categoryScores)) {
        categoryScores[cat] = Math.round(categoryScores[cat] / categoryCounts[cat]);
      }

      return {
        period: scorecard.evaluationPeriod,
        overallScore: scorecard.overallScore,
        rating: scorecard.overallRating,
        categoryScores,
      };
    }).reverse();
  }

  // =================== RANKINGS ===================

  async getVendorRankings(
    tenantId: string,
    options?: {
      category?: string;
      tier?: string;
      limit?: number;
    },
  ): Promise<VendorRanking[]> {
    const vendorsResult = await this.vendorService.getVendors(tenantId, {
      status: 'active',
    });

    let vendors = vendorsResult.vendors;

    if (options?.tier) {
      vendors = vendors.filter((v) => v.tier === options.tier);
    }

    if (options?.category) {
      vendors = vendors.filter((v) => v.category === options.category);
    }

    const rankings: VendorRanking[] = [];

    for (const vendor of vendors) {
      const scorecards = await this.getVendorScorecards(vendor.id, 4);
      if (scorecards.length === 0) continue;

      const latestScore = scorecards[0].overallScore;
      const previousScore = scorecards.length > 1 ? scorecards[1].overallScore : latestScore;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (latestScore > previousScore + 2) trend = 'up';
      else if (latestScore < previousScore - 2) trend = 'down';

      rankings.push({
        rank: 0,
        vendorId: vendor.id,
        vendorName: vendor.name,
        vendorTier: vendor.tier,
        category: vendor.category,
        overallScore: latestScore,
        rating: scorecards[0].overallRating,
        trend,
        scorecardCount: scorecards.length,
      });
    }

    // Sort and assign ranks
    rankings.sort((a, b) => b.overallScore - a.overallScore);
    rankings.forEach((r, i) => (r.rank = i + 1));

    if (options?.limit) {
      return rankings.slice(0, options.limit);
    }

    return rankings;
  }

  // =================== ALERTS ===================

  async createAlert(data: {
    tenantId: string;
    vendorId: string;
    vendorName: string;
    alertType: PerformanceAlert['alertType'];
    severity: PerformanceAlert['severity'];
    message: string;
    metricId?: string;
    metricName?: string;
    threshold?: number;
    actualValue?: number;
  }): Promise<PerformanceAlert> {
    const id = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const alert: PerformanceAlert = {
      id,
      tenantId: data.tenantId,
      vendorId: data.vendorId,
      vendorName: data.vendorName,
      alertType: data.alertType,
      severity: data.severity,
      message: data.message,
      metricId: data.metricId,
      metricName: data.metricName,
      threshold: data.threshold,
      actualValue: data.actualValue,
      acknowledged: false,
      createdAt: new Date(),
    };

    this.alerts.set(id, alert);

    this.eventEmitter.emit('vendor.performance_alert', { alert });

    return alert;
  }

  async getAlerts(
    tenantId: string,
    filters?: {
      vendorId?: string;
      severity?: PerformanceAlert['severity'];
      acknowledged?: boolean;
      limit?: number;
    },
  ): Promise<PerformanceAlert[]> {
    let alerts = Array.from(this.alerts.values()).filter(
      (a) => a.tenantId === tenantId,
    );

    if (filters?.vendorId) {
      alerts = alerts.filter((a) => a.vendorId === filters.vendorId);
    }

    if (filters?.severity) {
      alerts = alerts.filter((a) => a.severity === filters.severity);
    }

    if (filters?.acknowledged !== undefined) {
      alerts = alerts.filter((a) => a.acknowledged === filters.acknowledged);
    }

    alerts = alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.limit) {
      alerts = alerts.slice(0, filters.limit);
    }

    return alerts;
  }

  async acknowledgeAlert(
    id: string,
    acknowledgedBy: string,
  ): Promise<PerformanceAlert | null> {
    const alert = this.alerts.get(id);
    if (!alert) return null;

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    this.alerts.set(id, alert);

    return alert;
  }

  // =================== GOALS ===================

  async createGoal(data: {
    tenantId: string;
    vendorId: string;
    metricId: string;
    targetValue: number;
    startDate: Date;
    endDate: Date;
    notes?: string;
    createdBy: string;
  }): Promise<PerformanceGoal> {
    const vendor = await this.vendorService.getVendor(data.vendorId);
    const metric = this.metrics.get(data.metricId);

    if (!vendor || !metric) {
      throw new Error('Vendor or metric not found');
    }

    const id = `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const goal: PerformanceGoal = {
      id,
      tenantId: data.tenantId,
      vendorId: data.vendorId,
      vendorName: vendor.name,
      metricId: data.metricId,
      metricName: metric.name,
      targetValue: data.targetValue,
      startDate: data.startDate,
      endDate: data.endDate,
      status: 'active',
      notes: data.notes,
      createdBy: data.createdBy,
      createdAt: new Date(),
    };

    this.goals.set(id, goal);

    return goal;
  }

  async getVendorGoals(vendorId: string): Promise<PerformanceGoal[]> {
    return Array.from(this.goals.values())
      .filter((g) => g.vendorId === vendorId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateGoalProgress(
    id: string,
    currentValue: number,
  ): Promise<PerformanceGoal | null> {
    const goal = this.goals.get(id);
    if (!goal || goal.status !== 'active') return null;

    goal.currentValue = currentValue;

    if (currentValue >= goal.targetValue) {
      goal.status = 'achieved';
      goal.achievedAt = new Date();
    } else if (new Date() > goal.endDate) {
      goal.status = 'missed';
    }

    this.goals.set(id, goal);

    return goal;
  }

  // =================== STATISTICS ===================

  async getPerformanceStatistics(tenantId: string): Promise<{
    totalScorecards: number;
    averageScore: number;
    ratingDistribution: Record<string, number>;
    activeAlerts: number;
    criticalAlerts: number;
    topPerformers: number;
    underperformers: number;
    scorecardsTrend: Array<{ period: string; count: number; avgScore: number }>;
  }> {
    const scorecards = Array.from(this.scorecards.values()).filter(
      (s) => s.tenantId === tenantId,
    );

    const alerts = Array.from(this.alerts.values()).filter(
      (a) => a.tenantId === tenantId && !a.acknowledged,
    );

    const ratingDistribution: Record<string, number> = {};
    let totalScore = 0;

    for (const scorecard of scorecards) {
      ratingDistribution[scorecard.overallRating] =
        (ratingDistribution[scorecard.overallRating] || 0) + 1;
      totalScore += scorecard.overallScore;
    }

    const averageScore = scorecards.length > 0
      ? Math.round(totalScore / scorecards.length * 100) / 100
      : 0;

    const topPerformers = scorecards.filter((s) => s.overallScore >= 80).length;
    const underperformers = scorecards.filter((s) => s.overallScore < 50).length;
    const criticalAlerts = alerts.filter((a) => a.severity === 'critical').length;

    // Group scorecards by period
    const periodGroups: Record<string, { count: number; totalScore: number }> = {};
    for (const scorecard of scorecards) {
      if (!periodGroups[scorecard.evaluationPeriod]) {
        periodGroups[scorecard.evaluationPeriod] = { count: 0, totalScore: 0 };
      }
      periodGroups[scorecard.evaluationPeriod].count++;
      periodGroups[scorecard.evaluationPeriod].totalScore += scorecard.overallScore;
    }

    const scorecardsTrend = Object.entries(periodGroups)
      .map(([period, data]) => ({
        period,
        count: data.count,
        avgScore: Math.round(data.totalScore / data.count * 100) / 100,
      }))
      .sort((a, b) => a.period.localeCompare(b.period))
      .slice(-6);

    return {
      totalScorecards: scorecards.length,
      averageScore,
      ratingDistribution,
      activeAlerts: alerts.length,
      criticalAlerts,
      topPerformers,
      underperformers,
      scorecardsTrend,
    };
  }
}
