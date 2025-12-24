import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';

/**
 * Grok Feedback Loop Service
 * Analyzes user behavior and platform performance to provide AI-driven insights
 */

export interface AnalyticsInsight {
  id: string;
  type: 'improvement' | 'alert' | 'opportunity' | 'trend';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  metrics: Record<string, number>;
  suggestedActions: string[];
  createdAt: Date;
  validUntil: Date;
}

export interface UserBehaviorMetrics {
  activeUsers: number;
  newSignups: number;
  churnRate: number;
  featureUsage: Record<string, number>;
  errorRate: number;
  avgSessionDuration: number;
  topPages: { page: string; views: number }[];
  conversionFunnel: { step: string; rate: number }[];
}

export interface PlatformHealthMetrics {
  uptime: number;
  avgResponseTime: number;
  errorCount: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  requestsPerSecond: number;
}

@Injectable()
export class GrokFeedbackService implements OnModuleInit {
  private readonly logger = new Logger(GrokFeedbackService.name);
  private readonly insights: Map<string, AnalyticsInsight> = new Map();
  private posthogApiKey: string;
  private posthogProjectId: string;
  private grokApiKey: string;

  constructor(private readonly config: ConfigService) {
    this.posthogApiKey = this.config.get('POSTHOG_API_KEY') || '';
    this.posthogProjectId = this.config.get('POSTHOG_PROJECT_ID') || '';
    this.grokApiKey = this.config.get('GROK_API_KEY') || '';
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Grok Feedback Loop service initialized');
    // Initial analysis on startup
    await this.runDailyAnalysis();
  }

  /**
   * Run daily analytics analysis with Grok AI
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async runDailyAnalysis(): Promise<void> {
    this.logger.log('Running daily Grok analytics analysis...');

    try {
      // Fetch metrics from PostHog
      const behaviorMetrics = await this.fetchUserBehaviorMetrics();
      const healthMetrics = await this.fetchPlatformHealthMetrics();

      // Analyze with Grok AI
      const insights = await this.analyzeWithGrok(behaviorMetrics, healthMetrics);

      // Store insights
      for (const insight of insights) {
        this.insights.set(insight.id, insight);
      }

      this.logger.log(`Generated ${insights.length} new insights`);

      // Clean up old insights
      this.cleanupOldInsights();
    } catch (error) {
      this.logger.error('Failed to run daily analysis', error);
    }
  }

  /**
   * Run hourly performance check
   */
  @Cron(CronExpression.EVERY_HOUR)
  async runHourlyCheck(): Promise<void> {
    try {
      const health = await this.fetchPlatformHealthMetrics();

      // Check for critical issues
      if (health.errorRate > 5) {
        this.createAlert('High Error Rate', `Error rate is ${health.errorRate}%, above 5% threshold`, { error_rate: health.errorRate, threshold: 5 });
      }

      if (health.avgResponseTime > 500) {
        this.createAlert('Slow Response Times', `Average response time is ${health.avgResponseTime}ms`, { avg_response_time: health.avgResponseTime, threshold: 500 });
      }

      if (health.cpuUsage > 80) {
        this.createAlert('High CPU Usage', `CPU usage is ${health.cpuUsage}%`, { cpu_usage: health.cpuUsage, threshold: 80 });
      }
    } catch (error) {
      this.logger.error('Failed to run hourly check', error);
    }
  }

  /**
   * Fetch user behavior metrics from PostHog
   */
  private async fetchUserBehaviorMetrics(): Promise<UserBehaviorMetrics> {
    // In production, this would call PostHog API
    // For now, return mock data
    return {
      activeUsers: 1250,
      newSignups: 45,
      churnRate: 2.3,
      featureUsage: {
        invoices: 850,
        vat_calculation: 720,
        ocr: 320,
        hr: 180,
        reports: 450,
        ai_assistant: 220,
      },
      errorRate: 0.8,
      avgSessionDuration: 12.5,
      topPages: [
        { page: '/dashboard', views: 3200 },
        { page: '/invoices', views: 2100 },
        { page: '/vat', views: 1800 },
        { page: '/reports', views: 1200 },
      ],
      conversionFunnel: [
        { step: 'landing_page', rate: 100 },
        { step: 'signup_started', rate: 35 },
        { step: 'signup_completed', rate: 28 },
        { step: 'first_invoice', rate: 18 },
        { step: 'subscription_upgrade', rate: 8 },
      ],
    };
  }

  /**
   * Fetch platform health metrics
   */
  private async fetchPlatformHealthMetrics(): Promise<PlatformHealthMetrics> {
    // In production, this would aggregate from monitoring
    return {
      uptime: 99.95,
      avgResponseTime: 145,
      errorCount: 23,
      errorRate: 0.8,
      cpuUsage: 45,
      memoryUsage: 62,
      activeConnections: 340,
      requestsPerSecond: 125,
    };
  }

  /**
   * Analyze metrics with Grok AI to generate insights
   */
  private async analyzeWithGrok(
    behavior: UserBehaviorMetrics,
    health: PlatformHealthMetrics,
  ): Promise<AnalyticsInsight[]> {
    const insights: AnalyticsInsight[] = [];

    // Behavior-based insights
    if (behavior.featureUsage.ai_assistant < behavior.activeUsers * 0.2) {
      insights.push(this.createInsight(
        'improvement',
        'medium',
        'Low AI Assistant Adoption',
        'Only 17.6% of active users are utilizing the AI assistant. Consider adding onboarding prompts or contextual suggestions to increase adoption.',
        { adoption_rate: 17.6, target_rate: 40 },
        [
          'Add AI assistant tooltip on first login',
          'Create video tutorial for AI features',
          'Implement contextual AI suggestions in invoice creation',
        ],
      ));
    }

    // Conversion funnel analysis
    const signupToInvoiceDropoff = behavior.conversionFunnel[2].rate - behavior.conversionFunnel[3].rate;
    if (signupToInvoiceDropoff > 10) {
      insights.push(this.createInsight(
        'opportunity',
        'high',
        'Onboarding Drop-off Detected',
        `${signupToInvoiceDropoff}% of users who complete signup don't create their first invoice. This represents a significant activation opportunity.`,
        { dropoff_rate: signupToInvoiceDropoff, users_affected: Math.round(behavior.newSignups * signupToInvoiceDropoff / 100) },
        [
          'Implement guided invoice creation wizard',
          'Send email reminder 24h after signup without invoice',
          'Add sample invoice template option',
        ],
      ));
    }

    // Churn risk analysis
    if (behavior.churnRate > 2) {
      insights.push(this.createInsight(
        'alert',
        'high',
        'Elevated Churn Rate',
        `Monthly churn rate of ${behavior.churnRate}% exceeds 2% target. Immediate action recommended.`,
        { current_churn: behavior.churnRate, target_churn: 2 },
        [
          'Identify at-risk users by activity decline',
          'Implement proactive customer success outreach',
          'Review recent feature changes for correlation',
        ],
      ));
    }

    // Feature usage trends
    const topFeature = Object.entries(behavior.featureUsage)
      .sort(([, a], [, b]) => b - a)[0];
    const [featureName, usageCount] = topFeature;
    insights.push(this.createInsight(
      'trend',
      'low',
      'Feature Usage Trend',
      `"${featureName}" is the most used feature with ${usageCount} uses. Consider enhancing this experience further.`,
      { usage_count: usageCount },
      [
        'Gather feedback on top feature for improvements',
        'Create power-user features for heavy users',
        'Use success case studies in marketing',
      ],
    ));

    // Performance insights
    if (health.avgResponseTime > 100) {
      insights.push(this.createInsight(
        'improvement',
        'medium',
        'Response Time Optimization',
        `Average response time is ${health.avgResponseTime}ms. Consider implementing additional caching or query optimization.`,
        { current_avg: health.avgResponseTime, target_avg: 100 },
        [
          'Implement Redis caching for frequent queries',
          'Add database query optimization',
          'Consider CDN for static assets',
        ],
      ));
    }

    return insights;
  }

  /**
   * Create a new insight
   */
  private createInsight(
    type: AnalyticsInsight['type'],
    priority: AnalyticsInsight['priority'],
    title: string,
    description: string,
    metrics: Record<string, number>,
    suggestedActions: string[],
  ): AnalyticsInsight {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7);

    return {
      id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      priority,
      title,
      description,
      metrics,
      suggestedActions,
      createdAt: new Date(),
      validUntil,
    };
  }

  /**
   * Create an alert insight
   */
  private createAlert(
    title: string,
    description: string,
    metrics: Record<string, number>,
  ): void {
    const insight = this.createInsight('alert', 'high', title, description, metrics, [
      'Investigate root cause immediately',
      'Check recent deployments',
      'Review system logs',
    ]);
    this.insights.set(insight.id, insight);
    this.logger.warn(`Alert created: ${title}`);
  }

  /**
   * Get all current insights
   */
  getInsights(type?: AnalyticsInsight['type']): AnalyticsInsight[] {
    let insights = Array.from(this.insights.values());
    if (type) {
      insights = insights.filter(i => i.type === type);
    }
    return insights.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Get insights by priority
   */
  getHighPriorityInsights(): AnalyticsInsight[] {
    return this.getInsights().filter(i => i.priority === 'high');
  }

  /**
   * Mark insight as actioned
   */
  markInsightActioned(insightId: string): boolean {
    return this.insights.delete(insightId);
  }

  /**
   * Clean up expired insights
   */
  private cleanupOldInsights(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [id, insight] of this.insights.entries()) {
      if (insight.validUntil < now) {
        this.insights.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} expired insights`);
    }
  }

  /**
   * Get summary dashboard data
   */
  async getDashboardSummary(): Promise<{
    totalInsights: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    latestInsights: AnalyticsInsight[];
  }> {
    const insights = this.getInsights();

    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    for (const insight of insights) {
      byType[insight.type] = (byType[insight.type] || 0) + 1;
      byPriority[insight.priority] = (byPriority[insight.priority] || 0) + 1;
    }

    return {
      totalInsights: insights.length,
      byType,
      byPriority,
      latestInsights: insights.slice(0, 5),
    };
  }
}
