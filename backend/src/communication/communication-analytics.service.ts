import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// =================== TYPES ===================

export type ChannelType = 'email' | 'sms' | 'whatsapp' | 'push' | 'in_app';
export type MetricType = 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed' | 'unsubscribed' | 'read';
export type TimeGranularity = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface CommunicationMetric {
  id: string;
  tenantId: string;
  channel: ChannelType;
  metricType: MetricType;
  value: number;
  timestamp: Date;
  granularity: TimeGranularity;
  campaignId?: string;
  templateId?: string;
  metadata?: Record<string, any>;
}

export interface ChannelStats {
  channel: ChannelType;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  unsubscribed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

export interface CampaignAnalytics {
  campaignId: string;
  campaignName: string;
  channel: ChannelType;
  startedAt: Date;
  completedAt?: Date;
  stats: {
    targeted: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    failed: number;
    unsubscribed: number;
  };
  rates: {
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    unsubscribeRate: number;
  };
  engagement: {
    uniqueOpens: number;
    uniqueClicks: number;
    totalOpens: number;
    totalClicks: number;
    averageTimeToOpen: number;
    averageTimeToClick: number;
  };
  topClickedLinks?: Array<{ url: string; clicks: number }>;
  deviceBreakdown?: Record<string, number>;
  locationBreakdown?: Record<string, number>;
}

export interface TemplateAnalytics {
  templateId: string;
  templateName: string;
  channel: ChannelType;
  usageCount: number;
  stats: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
  };
  rates: {
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
  };
  performance: 'excellent' | 'good' | 'average' | 'poor';
  lastUsed: Date;
}

export interface EngagementTrend {
  period: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  openRate: number;
  clickRate: number;
}

export interface RecipientAnalytics {
  recipientId: string;
  email?: string;
  phone?: string;
  totalReceived: number;
  totalOpened: number;
  totalClicked: number;
  engagementScore: number;
  lastEngagement: Date;
  preferredChannel: ChannelType;
  bestSendTime?: string;
  status: 'active' | 'inactive' | 'unsubscribed' | 'bounced';
}

export interface DeliveryReport {
  id: string;
  tenantId: string;
  period: { start: Date; end: Date };
  channels: ChannelStats[];
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  overallDeliveryRate: number;
  topPerformingChannel: ChannelType;
  issues: Array<{
    type: string;
    channel: ChannelType;
    count: number;
    severity: 'low' | 'medium' | 'high';
  }>;
  recommendations: string[];
  generatedAt: Date;
}

export interface ABTestResult {
  testId: string;
  testName: string;
  channel: ChannelType;
  variants: Array<{
    id: string;
    name: string;
    stats: {
      sent: number;
      delivered: number;
      opened: number;
      clicked: number;
    };
    rates: {
      openRate: number;
      clickRate: number;
    };
    isWinner: boolean;
  }>;
  confidence: number;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'cancelled';
}

// =================== SERVICE ===================

@Injectable()
export class CommunicationAnalyticsService {
  private metrics: Map<string, CommunicationMetric> = new Map();
  private campaignAnalytics: Map<string, CampaignAnalytics> = new Map();
  private templateAnalytics: Map<string, TemplateAnalytics> = new Map();
  private recipientAnalytics: Map<string, RecipientAnalytics> = new Map();
  private deliveryReports: Map<string, DeliveryReport> = new Map();
  private abTests: Map<string, ABTestResult> = new Map();

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    // Initialize sample metrics for demonstration
    const channels: ChannelType[] = ['email', 'sms', 'whatsapp', 'push', 'in_app'];
    const now = new Date();

    for (const channel of channels) {
      for (let i = 0; i < 30; i++) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const baseSent = Math.floor(Math.random() * 1000) + 100;

        this.recordMetric('system', channel, 'sent', baseSent, date);
        this.recordMetric('system', channel, 'delivered', Math.floor(baseSent * 0.95), date);
        this.recordMetric('system', channel, 'opened', Math.floor(baseSent * 0.3), date);
        this.recordMetric('system', channel, 'clicked', Math.floor(baseSent * 0.05), date);
        this.recordMetric('system', channel, 'bounced', Math.floor(baseSent * 0.02), date);
        this.recordMetric('system', channel, 'failed', Math.floor(baseSent * 0.03), date);
      }
    }
  }

  // =================== METRIC RECORDING ===================

  recordMetric(
    tenantId: string,
    channel: ChannelType,
    metricType: MetricType,
    value: number,
    timestamp?: Date,
    campaignId?: string,
    templateId?: string,
  ): void {
    const id = `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const metric: CommunicationMetric = {
      id,
      tenantId,
      channel,
      metricType,
      value,
      timestamp: timestamp || new Date(),
      granularity: 'day',
      campaignId,
      templateId,
    };

    this.metrics.set(id, metric);

    this.eventEmitter.emit('analytics.metric.recorded', { metric });
  }

  async incrementMetric(
    tenantId: string,
    channel: ChannelType,
    metricType: MetricType,
    campaignId?: string,
    templateId?: string,
  ): Promise<void> {
    this.recordMetric(tenantId, channel, metricType, 1, undefined, campaignId, templateId);
  }

  // =================== DASHBOARD STATS ===================

  async getDashboardStats(
    tenantId: string,
    period?: { start: Date; end: Date },
  ): Promise<{
    overview: {
      totalSent: number;
      totalDelivered: number;
      totalOpened: number;
      totalClicked: number;
      deliveryRate: number;
      openRate: number;
      clickRate: number;
    };
    byChannel: ChannelStats[];
    trends: EngagementTrend[];
    topCampaigns: Array<{ id: string; name: string; channel: ChannelType; performance: number }>;
    recentActivity: Array<{ type: string; channel: ChannelType; count: number; timestamp: Date }>;
  }> {
    const start = period?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = period?.end || new Date();

    const metrics = this.getMetricsInPeriod(tenantId, start, end);

    // Calculate overview
    const overview = this.calculateOverview(metrics);

    // Calculate by channel
    const byChannel = this.calculateChannelStats(metrics);

    // Calculate trends
    const trends = this.calculateTrends(metrics, start, end);

    // Get top campaigns
    const topCampaigns = await this.getTopCampaigns(tenantId, 5);

    // Get recent activity
    const recentActivity = this.getRecentActivity(tenantId, 10);

    return {
      overview,
      byChannel,
      trends,
      topCampaigns,
      recentActivity,
    };
  }

  private getMetricsInPeriod(tenantId: string, start: Date, end: Date): CommunicationMetric[] {
    return Array.from(this.metrics.values()).filter(
      (m) =>
        (m.tenantId === tenantId || m.tenantId === 'system') &&
        m.timestamp >= start &&
        m.timestamp <= end,
    );
  }

  private calculateOverview(metrics: CommunicationMetric[]): {
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
  } {
    let sent = 0, delivered = 0, opened = 0, clicked = 0;

    for (const metric of metrics) {
      switch (metric.metricType) {
        case 'sent': sent += metric.value; break;
        case 'delivered': delivered += metric.value; break;
        case 'opened': opened += metric.value; break;
        case 'clicked': clicked += metric.value; break;
      }
    }

    return {
      totalSent: sent,
      totalDelivered: delivered,
      totalOpened: opened,
      totalClicked: clicked,
      deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
      openRate: delivered > 0 ? Math.round((opened / delivered) * 100) : 0,
      clickRate: opened > 0 ? Math.round((clicked / opened) * 100) : 0,
    };
  }

  private calculateChannelStats(metrics: CommunicationMetric[]): ChannelStats[] {
    const channels: ChannelType[] = ['email', 'sms', 'whatsapp', 'push', 'in_app'];
    const result: ChannelStats[] = [];

    for (const channel of channels) {
      const channelMetrics = metrics.filter((m) => m.channel === channel);

      let sent = 0, delivered = 0, opened = 0, clicked = 0, bounced = 0, failed = 0, unsubscribed = 0;

      for (const metric of channelMetrics) {
        switch (metric.metricType) {
          case 'sent': sent += metric.value; break;
          case 'delivered': delivered += metric.value; break;
          case 'opened': opened += metric.value; break;
          case 'clicked': clicked += metric.value; break;
          case 'bounced': bounced += metric.value; break;
          case 'failed': failed += metric.value; break;
          case 'unsubscribed': unsubscribed += metric.value; break;
        }
      }

      result.push({
        channel,
        sent,
        delivered,
        opened,
        clicked,
        bounced,
        failed,
        unsubscribed,
        deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
        openRate: delivered > 0 ? Math.round((opened / delivered) * 100) : 0,
        clickRate: opened > 0 ? Math.round((clicked / opened) * 100) : 0,
        bounceRate: sent > 0 ? Math.round((bounced / sent) * 100) : 0,
      });
    }

    return result;
  }

  private calculateTrends(metrics: CommunicationMetric[], start: Date, end: Date): EngagementTrend[] {
    const trends: EngagementTrend[] = [];
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.ceil((end.getTime() - start.getTime()) / dayMs);

    for (let i = 0; i < Math.min(days, 30); i++) {
      const dayStart = new Date(end.getTime() - (i + 1) * dayMs);
      const dayEnd = new Date(end.getTime() - i * dayMs);

      const dayMetrics = metrics.filter(
        (m) => m.timestamp >= dayStart && m.timestamp < dayEnd,
      );

      let sent = 0, delivered = 0, opened = 0, clicked = 0;

      for (const metric of dayMetrics) {
        switch (metric.metricType) {
          case 'sent': sent += metric.value; break;
          case 'delivered': delivered += metric.value; break;
          case 'opened': opened += metric.value; break;
          case 'clicked': clicked += metric.value; break;
        }
      }

      trends.unshift({
        period: dayStart.toISOString().split('T')[0],
        sent,
        delivered,
        opened,
        clicked,
        openRate: delivered > 0 ? Math.round((opened / delivered) * 100) : 0,
        clickRate: opened > 0 ? Math.round((clicked / opened) * 100) : 0,
      });
    }

    return trends;
  }

  private async getTopCampaigns(
    tenantId: string,
    limit: number,
  ): Promise<Array<{ id: string; name: string; channel: ChannelType; performance: number }>> {
    const campaigns = Array.from(this.campaignAnalytics.values())
      .filter((c) => c.campaignId.startsWith(tenantId) || true)
      .map((c) => ({
        id: c.campaignId,
        name: c.campaignName,
        channel: c.channel,
        performance: c.rates.openRate * 0.6 + c.rates.clickRate * 0.4,
      }))
      .sort((a, b) => b.performance - a.performance)
      .slice(0, limit);

    // Add sample data if empty
    if (campaigns.length === 0) {
      return [
        { id: 'camp-1', name: 'Welcome Series', channel: 'email', performance: 85 },
        { id: 'camp-2', name: 'Product Launch', channel: 'push', performance: 72 },
        { id: 'camp-3', name: 'Holiday Promo', channel: 'sms', performance: 68 },
      ];
    }

    return campaigns;
  }

  private getRecentActivity(
    tenantId: string,
    limit: number,
  ): Array<{ type: string; channel: ChannelType; count: number; timestamp: Date }> {
    const recentMetrics = Array.from(this.metrics.values())
      .filter((m) => m.tenantId === tenantId || m.tenantId === 'system')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);

    return recentMetrics.map((m) => ({
      type: m.metricType,
      channel: m.channel,
      count: m.value,
      timestamp: m.timestamp,
    }));
  }

  // =================== CAMPAIGN ANALYTICS ===================

  async getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics | null> {
    return this.campaignAnalytics.get(campaignId) || null;
  }

  async updateCampaignAnalytics(
    campaignId: string,
    data: Partial<CampaignAnalytics>,
  ): Promise<CampaignAnalytics> {
    let analytics = this.campaignAnalytics.get(campaignId);

    if (!analytics) {
      analytics = {
        campaignId,
        campaignName: data.campaignName || 'Unknown Campaign',
        channel: data.channel || 'email',
        startedAt: data.startedAt || new Date(),
        stats: {
          targeted: 0,
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          failed: 0,
          unsubscribed: 0,
        },
        rates: {
          deliveryRate: 0,
          openRate: 0,
          clickRate: 0,
          bounceRate: 0,
          unsubscribeRate: 0,
        },
        engagement: {
          uniqueOpens: 0,
          uniqueClicks: 0,
          totalOpens: 0,
          totalClicks: 0,
          averageTimeToOpen: 0,
          averageTimeToClick: 0,
        },
      };
    }

    Object.assign(analytics, data);

    // Recalculate rates
    const { stats } = analytics;
    analytics.rates = {
      deliveryRate: stats.sent > 0 ? Math.round((stats.delivered / stats.sent) * 100) : 0,
      openRate: stats.delivered > 0 ? Math.round((stats.opened / stats.delivered) * 100) : 0,
      clickRate: stats.opened > 0 ? Math.round((stats.clicked / stats.opened) * 100) : 0,
      bounceRate: stats.sent > 0 ? Math.round((stats.bounced / stats.sent) * 100) : 0,
      unsubscribeRate: stats.delivered > 0 ? Math.round((stats.unsubscribed / stats.delivered) * 100) : 0,
    };

    this.campaignAnalytics.set(campaignId, analytics);

    return analytics;
  }

  async getCampaignComparison(
    campaignIds: string[],
  ): Promise<Array<CampaignAnalytics & { rank: number }>> {
    const campaigns = campaignIds
      .map((id) => this.campaignAnalytics.get(id))
      .filter((c): c is CampaignAnalytics => c !== undefined)
      .sort((a, b) => b.rates.clickRate - a.rates.clickRate)
      .map((c, index) => ({ ...c, rank: index + 1 }));

    return campaigns;
  }

  // =================== TEMPLATE ANALYTICS ===================

  async getTemplateAnalytics(templateId: string): Promise<TemplateAnalytics | null> {
    return this.templateAnalytics.get(templateId) || null;
  }

  async updateTemplateAnalytics(
    templateId: string,
    data: Partial<TemplateAnalytics>,
  ): Promise<TemplateAnalytics> {
    let analytics = this.templateAnalytics.get(templateId);

    if (!analytics) {
      analytics = {
        templateId,
        templateName: data.templateName || 'Unknown Template',
        channel: data.channel || 'email',
        usageCount: 0,
        stats: { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 },
        rates: { deliveryRate: 0, openRate: 0, clickRate: 0, bounceRate: 0 },
        performance: 'average',
        lastUsed: new Date(),
      };
    }

    Object.assign(analytics, data);

    // Calculate performance
    const { rates } = analytics;
    if (rates.openRate >= 30 && rates.clickRate >= 10) {
      analytics.performance = 'excellent';
    } else if (rates.openRate >= 20 && rates.clickRate >= 5) {
      analytics.performance = 'good';
    } else if (rates.openRate >= 10 && rates.clickRate >= 2) {
      analytics.performance = 'average';
    } else {
      analytics.performance = 'poor';
    }

    this.templateAnalytics.set(templateId, analytics);

    return analytics;
  }

  async getTopTemplates(
    tenantId: string,
    channel?: ChannelType,
    limit?: number,
  ): Promise<TemplateAnalytics[]> {
    let templates = Array.from(this.templateAnalytics.values());

    if (channel) {
      templates = templates.filter((t) => t.channel === channel);
    }

    templates = templates.sort((a, b) => {
      const scoreA = a.rates.openRate * 0.5 + a.rates.clickRate * 0.5;
      const scoreB = b.rates.openRate * 0.5 + b.rates.clickRate * 0.5;
      return scoreB - scoreA;
    });

    if (limit) {
      templates = templates.slice(0, limit);
    }

    return templates;
  }

  // =================== RECIPIENT ANALYTICS ===================

  async getRecipientAnalytics(recipientId: string): Promise<RecipientAnalytics | null> {
    return this.recipientAnalytics.get(recipientId) || null;
  }

  async updateRecipientEngagement(
    recipientId: string,
    channel: ChannelType,
    action: 'received' | 'opened' | 'clicked',
  ): Promise<void> {
    let analytics = this.recipientAnalytics.get(recipientId);

    if (!analytics) {
      analytics = {
        recipientId,
        totalReceived: 0,
        totalOpened: 0,
        totalClicked: 0,
        engagementScore: 0,
        lastEngagement: new Date(),
        preferredChannel: channel,
        status: 'active',
      };
    }

    switch (action) {
      case 'received':
        analytics.totalReceived++;
        break;
      case 'opened':
        analytics.totalOpened++;
        analytics.lastEngagement = new Date();
        break;
      case 'clicked':
        analytics.totalClicked++;
        analytics.lastEngagement = new Date();
        break;
    }

    // Calculate engagement score (0-100)
    analytics.engagementScore = Math.min(100, Math.round(
      (analytics.totalOpened / Math.max(analytics.totalReceived, 1)) * 50 +
      (analytics.totalClicked / Math.max(analytics.totalOpened, 1)) * 50,
    ));

    this.recipientAnalytics.set(recipientId, analytics);
  }

  async getTopEngagedRecipients(tenantId: string, limit: number): Promise<RecipientAnalytics[]> {
    return Array.from(this.recipientAnalytics.values())
      .filter((r) => r.status === 'active')
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, limit);
  }

  // =================== DELIVERY REPORTS ===================

  async generateDeliveryReport(
    tenantId: string,
    period: { start: Date; end: Date },
  ): Promise<DeliveryReport> {
    const id = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const metrics = this.getMetricsInPeriod(tenantId, period.start, period.end);
    const channelStats = this.calculateChannelStats(metrics);

    let totalSent = 0, totalDelivered = 0, totalFailed = 0;
    for (const stat of channelStats) {
      totalSent += stat.sent;
      totalDelivered += stat.delivered;
      totalFailed += stat.failed + stat.bounced;
    }

    const topChannel = channelStats.reduce((a, b) =>
      a.deliveryRate > b.deliveryRate ? a : b,
    );

    const issues: DeliveryReport['issues'] = [];
    for (const stat of channelStats) {
      if (stat.bounceRate > 5) {
        issues.push({
          type: 'high_bounce_rate',
          channel: stat.channel,
          count: stat.bounced,
          severity: stat.bounceRate > 10 ? 'high' : 'medium',
        });
      }
      if (stat.deliveryRate < 90) {
        issues.push({
          type: 'low_delivery_rate',
          channel: stat.channel,
          count: stat.failed,
          severity: stat.deliveryRate < 80 ? 'high' : 'medium',
        });
      }
    }

    const recommendations: string[] = [];
    if (issues.some((i) => i.type === 'high_bounce_rate')) {
      recommendations.push('Clean your email list to remove invalid addresses');
      recommendations.push('Implement double opt-in for new subscribers');
    }
    if (issues.some((i) => i.type === 'low_delivery_rate')) {
      recommendations.push('Check sender reputation and authentication (SPF, DKIM, DMARC)');
      recommendations.push('Review content for spam triggers');
    }

    const report: DeliveryReport = {
      id,
      tenantId,
      period,
      channels: channelStats,
      totalSent,
      totalDelivered,
      totalFailed,
      overallDeliveryRate: totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0,
      topPerformingChannel: topChannel.channel,
      issues,
      recommendations,
      generatedAt: new Date(),
    };

    this.deliveryReports.set(id, report);

    return report;
  }

  async getDeliveryReports(tenantId: string, limit?: number): Promise<DeliveryReport[]> {
    let reports = Array.from(this.deliveryReports.values())
      .filter((r) => r.tenantId === tenantId)
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());

    if (limit) {
      reports = reports.slice(0, limit);
    }

    return reports;
  }

  // =================== A/B TESTING ===================

  async createABTest(data: {
    tenantId: string;
    testName: string;
    channel: ChannelType;
    variants: Array<{ id: string; name: string }>;
  }): Promise<ABTestResult> {
    const testId = `abtest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const test: ABTestResult = {
      testId,
      testName: data.testName,
      channel: data.channel,
      variants: data.variants.map((v) => ({
        id: v.id,
        name: v.name,
        stats: { sent: 0, delivered: 0, opened: 0, clicked: 0 },
        rates: { openRate: 0, clickRate: 0 },
        isWinner: false,
      })),
      confidence: 0,
      startedAt: new Date(),
      status: 'running',
    };

    this.abTests.set(testId, test);

    return test;
  }

  async updateABTestVariant(
    testId: string,
    variantId: string,
    stats: Partial<ABTestResult['variants'][0]['stats']>,
  ): Promise<ABTestResult | null> {
    const test = this.abTests.get(testId);
    if (!test) return null;

    const variant = test.variants.find((v) => v.id === variantId);
    if (!variant) return null;

    Object.assign(variant.stats, stats);

    // Recalculate rates
    variant.rates = {
      openRate: variant.stats.delivered > 0
        ? Math.round((variant.stats.opened / variant.stats.delivered) * 100)
        : 0,
      clickRate: variant.stats.opened > 0
        ? Math.round((variant.stats.clicked / variant.stats.opened) * 100)
        : 0,
    };

    // Determine winner if enough data
    const totalSent = test.variants.reduce((sum, v) => sum + v.stats.sent, 0);
    if (totalSent >= 1000) {
      const sorted = [...test.variants].sort((a, b) => b.rates.clickRate - a.rates.clickRate);
      if (sorted[0].rates.clickRate - sorted[1].rates.clickRate >= 5) {
        test.variants.forEach((v) => v.isWinner = false);
        sorted[0].isWinner = true;
        test.confidence = 95;
      }
    }

    return test;
  }

  async completeABTest(testId: string): Promise<ABTestResult | null> {
    const test = this.abTests.get(testId);
    if (!test) return null;

    test.status = 'completed';
    test.completedAt = new Date();

    // Determine final winner
    const sorted = [...test.variants].sort((a, b) => b.rates.clickRate - a.rates.clickRate);
    test.variants.forEach((v) => v.isWinner = false);
    sorted[0].isWinner = true;

    return test;
  }

  async getABTests(tenantId: string, status?: ABTestResult['status']): Promise<ABTestResult[]> {
    let tests = Array.from(this.abTests.values());

    if (status) {
      tests = tests.filter((t) => t.status === status);
    }

    return tests.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  // =================== EXPORT ===================

  async exportAnalytics(
    tenantId: string,
    type: 'dashboard' | 'campaigns' | 'templates' | 'recipients',
    format: 'json' | 'csv',
    period?: { start: Date; end: Date },
  ): Promise<{ data: string; filename: string; contentType: string }> {
    let data: any;

    switch (type) {
      case 'dashboard':
        data = await this.getDashboardStats(tenantId, period);
        break;
      case 'campaigns':
        data = Array.from(this.campaignAnalytics.values());
        break;
      case 'templates':
        data = Array.from(this.templateAnalytics.values());
        break;
      case 'recipients':
        data = Array.from(this.recipientAnalytics.values());
        break;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `communication-analytics-${type}-${timestamp}.${format}`;

    if (format === 'json') {
      return {
        data: JSON.stringify(data, null, 2),
        filename,
        contentType: 'application/json',
      };
    } else {
      // Simple CSV conversion
      const csvData = this.convertToCSV(data);
      return {
        data: csvData,
        filename,
        contentType: 'text/csv',
      };
    }
  }

  private convertToCSV(data: any): string {
    if (!Array.isArray(data)) {
      data = [data];
    }

    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const rows = data.map((item: any) =>
      headers.map((h) => {
        const val = item[h];
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      }).join(','),
    );

    return [headers.join(','), ...rows].join('\n');
  }
}
