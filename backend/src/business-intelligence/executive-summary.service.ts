import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type SummaryPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
export type SummaryFormat = 'html' | 'pdf' | 'markdown' | 'json';
export type TrendIndicator = 'up' | 'down' | 'stable' | 'volatile';

export interface ExecutiveSummary {
  id: string;
  tenantId: string;
  title: string;
  period: SummaryPeriod;
  dateRange: { start: Date; end: Date };
  sections: SummarySection[];
  highlights: Highlight[];
  alerts: SummaryAlert[];
  recommendations: Recommendation[];
  metadata: SummaryMetadata;
  generatedAt: Date;
  generatedBy: string;
}

export interface SummarySection {
  id: string;
  title: string;
  type: 'overview' | 'financial' | 'operational' | 'hr' | 'sales' | 'custom';
  order: number;
  metrics: SummaryMetric[];
  charts?: SectionChart[];
  insights?: string[];
  narrative?: string;
}

export interface SummaryMetric {
  id: string;
  name: string;
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  trend: TrendIndicator;
  target?: number;
  targetAchievement?: number;
  unit?: string;
  format: 'number' | 'currency' | 'percent' | 'duration';
  currency?: string;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  sparkline?: number[];
}

export interface SectionChart {
  type: 'line' | 'bar' | 'pie' | 'gauge';
  title: string;
  data: any[];
  config?: Record<string, any>;
}

export interface Highlight {
  id: string;
  type: 'achievement' | 'milestone' | 'record' | 'concern' | 'opportunity';
  title: string;
  description: string;
  metric?: string;
  value?: number;
  impact: 'high' | 'medium' | 'low';
  category: string;
}

export interface SummaryAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  metric?: string;
  threshold?: number;
  currentValue?: number;
  recommendedAction?: string;
}

export interface Recommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  expectedImpact?: string;
  effort?: 'low' | 'medium' | 'high';
  deadline?: Date;
  relatedMetrics?: string[];
}

export interface SummaryMetadata {
  version: string;
  dataQuality: number;
  dataSources: string[];
  processingTime: number;
  lastDataUpdate: Date;
}

export interface SummaryTemplate {
  id: string;
  name: string;
  description: string;
  sections: TemplateSectionConfig[];
  theme?: SummaryTheme;
  branding?: BrandingConfig;
  isDefault?: boolean;
}

export interface TemplateSectionConfig {
  type: SummarySection['type'];
  title: string;
  metrics: string[];
  charts?: string[];
  includeInsights?: boolean;
  includeNarrative?: boolean;
}

export interface SummaryTheme {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    danger: string;
    background: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
}

export interface BrandingConfig {
  logo?: string;
  companyName?: string;
  tagline?: string;
  footer?: string;
}

export interface SummaryPreferences {
  id: string;
  tenantId: string;
  userId: string;
  defaultPeriod: SummaryPeriod;
  defaultFormat: SummaryFormat;
  defaultTemplateId?: string;
  subscribedSections: string[];
  deliveryPreferences: {
    email?: boolean;
    slack?: boolean;
    inApp?: boolean;
  };
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
  };
}

@Injectable()
export class ExecutiveSummaryService {
  private summaries: Map<string, ExecutiveSummary> = new Map();
  private templates: Map<string, SummaryTemplate> = new Map();
  private preferences: Map<string, SummaryPreferences> = new Map();

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates() {
    const templates: SummaryTemplate[] = [
      {
        id: 'executive-overview',
        name: 'Executive Overview',
        description: 'High-level business performance summary for executives',
        isDefault: true,
        sections: [
          {
            type: 'overview',
            title: 'Business Performance',
            metrics: ['revenue', 'profit', 'growth', 'customer_count'],
            charts: ['revenue_trend', 'profit_margin'],
            includeInsights: true,
          },
          {
            type: 'financial',
            title: 'Financial Highlights',
            metrics: ['revenue_ytd', 'expenses', 'cash_flow', 'ar_aging'],
            charts: ['expense_breakdown'],
            includeNarrative: true,
          },
          {
            type: 'sales',
            title: 'Sales Performance',
            metrics: ['sales_total', 'deals_won', 'win_rate', 'pipeline_value'],
            charts: ['sales_funnel'],
          },
          {
            type: 'operational',
            title: 'Operations',
            metrics: ['orders_processed', 'fulfillment_rate', 'customer_satisfaction'],
          },
        ],
      },
      {
        id: 'financial-report',
        name: 'Financial Summary',
        description: 'Detailed financial performance report',
        sections: [
          {
            type: 'financial',
            title: 'Revenue Analysis',
            metrics: ['revenue', 'revenue_growth', 'revenue_by_segment', 'mrr', 'arr'],
            charts: ['revenue_trend', 'revenue_by_segment_pie'],
            includeInsights: true,
            includeNarrative: true,
          },
          {
            type: 'financial',
            title: 'Profitability',
            metrics: ['gross_profit', 'operating_profit', 'net_profit', 'profit_margin'],
            charts: ['profit_waterfall'],
          },
          {
            type: 'financial',
            title: 'Cash Flow',
            metrics: ['operating_cash_flow', 'free_cash_flow', 'cash_position'],
          },
          {
            type: 'financial',
            title: 'Key Ratios',
            metrics: ['current_ratio', 'quick_ratio', 'debt_to_equity', 'roa', 'roe'],
          },
        ],
      },
      {
        id: 'sales-report',
        name: 'Sales Summary',
        description: 'Sales team performance and pipeline report',
        sections: [
          {
            type: 'sales',
            title: 'Sales Overview',
            metrics: ['total_sales', 'new_customers', 'average_deal_size', 'sales_cycle'],
            includeInsights: true,
          },
          {
            type: 'sales',
            title: 'Pipeline Health',
            metrics: ['pipeline_value', 'pipeline_velocity', 'coverage_ratio', 'forecast_accuracy'],
            charts: ['pipeline_funnel', 'forecast_vs_actual'],
          },
          {
            type: 'sales',
            title: 'Team Performance',
            metrics: ['quota_attainment', 'activities_completed', 'conversion_rate'],
            charts: ['sales_by_rep'],
          },
        ],
      },
      {
        id: 'hr-report',
        name: 'HR Summary',
        description: 'Human resources and workforce analytics',
        sections: [
          {
            type: 'hr',
            title: 'Workforce Overview',
            metrics: ['headcount', 'turnover_rate', 'time_to_hire', 'cost_per_hire'],
          },
          {
            type: 'hr',
            title: 'Employee Engagement',
            metrics: ['satisfaction_score', 'engagement_rate', 'absenteeism_rate'],
            charts: ['satisfaction_trend'],
          },
          {
            type: 'hr',
            title: 'Training & Development',
            metrics: ['training_hours', 'completion_rate', 'skill_coverage'],
          },
        ],
      },
    ];

    templates.forEach(t => this.templates.set(t.id, t));
  }

  // =================== SUMMARY GENERATION ===================

  async generateSummary(data: {
    tenantId: string;
    title?: string;
    period: SummaryPeriod;
    dateRange?: { start: Date; end: Date };
    templateId?: string;
    customSections?: TemplateSectionConfig[];
    generatedBy: string;
  }): Promise<ExecutiveSummary> {
    const id = `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    // Get template
    const template = data.templateId
      ? this.templates.get(data.templateId)
      : Array.from(this.templates.values()).find(t => t.isDefault);

    // Calculate date range
    const dateRange = data.dateRange || this.calculateDateRange(data.period);

    // Generate sections
    const sectionConfigs = data.customSections || template?.sections || [];
    const sections = await Promise.all(
      sectionConfigs.map((config, idx) =>
        this.generateSection(data.tenantId, config, dateRange, idx)
      )
    );

    // Generate highlights
    const highlights = this.extractHighlights(sections);

    // Generate alerts
    const alerts = this.generateAlerts(sections);

    // Generate recommendations
    const recommendations = this.generateRecommendations(sections, alerts);

    const summary: ExecutiveSummary = {
      id,
      tenantId: data.tenantId,
      title: data.title || this.generateTitle(data.period, dateRange),
      period: data.period,
      dateRange,
      sections,
      highlights,
      alerts,
      recommendations,
      metadata: {
        version: '1.0',
        dataQuality: 95,
        dataSources: ['Finance', 'Sales', 'Operations', 'HR'],
        processingTime: Date.now() - startTime,
        lastDataUpdate: new Date(),
      },
      generatedAt: new Date(),
      generatedBy: data.generatedBy,
    };

    this.summaries.set(id, summary);
    this.eventEmitter.emit('summary.generated', { summary });
    return summary;
  }

  private calculateDateRange(period: SummaryPeriod): { start: Date; end: Date } {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    let start: Date;

    switch (period) {
      case 'daily':
        start = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 0, 0, 0);
        break;
      case 'weekly':
        start = new Date(end);
        start.setDate(end.getDate() - 7);
        break;
      case 'monthly':
        start = new Date(end.getFullYear(), end.getMonth(), 1);
        break;
      case 'quarterly':
        const quarter = Math.floor(end.getMonth() / 3);
        start = new Date(end.getFullYear(), quarter * 3, 1);
        break;
      case 'yearly':
        start = new Date(end.getFullYear(), 0, 1);
        break;
      default:
        start = new Date(end);
        start.setMonth(end.getMonth() - 1);
    }

    return { start, end };
  }

  private generateTitle(period: SummaryPeriod, dateRange: { start: Date; end: Date }): string {
    const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    switch (period) {
      case 'daily':
        return `Daily Executive Summary - ${formatDate(dateRange.end)}`;
      case 'weekly':
        return `Weekly Executive Summary - ${formatDate(dateRange.start)} to ${formatDate(dateRange.end)}`;
      case 'monthly':
        return `Monthly Executive Summary - ${dateRange.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
      case 'quarterly':
        const quarter = Math.floor(dateRange.start.getMonth() / 3) + 1;
        return `Q${quarter} ${dateRange.start.getFullYear()} Executive Summary`;
      case 'yearly':
        return `Annual Executive Summary - ${dateRange.start.getFullYear()}`;
      default:
        return `Executive Summary - ${formatDate(dateRange.start)} to ${formatDate(dateRange.end)}`;
    }
  }

  private async generateSection(
    _tenantId: string,
    config: TemplateSectionConfig,
    _dateRange: { start: Date; end: Date },
    order: number
  ): Promise<SummarySection> {
    const metrics = await this.fetchSectionMetrics(config.type, config.metrics);

    const section: SummarySection = {
      id: `section_${Date.now()}_${order}`,
      title: config.title,
      type: config.type,
      order,
      metrics,
    };

    if (config.charts) {
      section.charts = await this.generateSectionCharts(config.type, config.charts);
    }

    if (config.includeInsights) {
      section.insights = this.generateInsights(metrics);
    }

    if (config.includeNarrative) {
      section.narrative = this.generateNarrative(config.type, metrics);
    }

    return section;
  }

  private async fetchSectionMetrics(type: string, metricIds: string[]): Promise<SummaryMetric[]> {
    // Simulate fetching metrics - in production, fetch from KPI service
    const metricTemplates: Record<string, Partial<SummaryMetric>> = {
      revenue: { name: 'Total Revenue', format: 'currency', currency: 'RON' },
      profit: { name: 'Net Profit', format: 'currency', currency: 'RON' },
      growth: { name: 'Growth Rate', format: 'percent' },
      customer_count: { name: 'Total Customers', format: 'number' },
      revenue_ytd: { name: 'Revenue YTD', format: 'currency', currency: 'RON' },
      expenses: { name: 'Total Expenses', format: 'currency', currency: 'RON' },
      cash_flow: { name: 'Cash Flow', format: 'currency', currency: 'RON' },
      ar_aging: { name: 'AR Aging (>30 days)', format: 'currency', currency: 'RON' },
      sales_total: { name: 'Total Sales', format: 'currency', currency: 'RON' },
      deals_won: { name: 'Deals Won', format: 'number' },
      win_rate: { name: 'Win Rate', format: 'percent' },
      pipeline_value: { name: 'Pipeline Value', format: 'currency', currency: 'RON' },
      orders_processed: { name: 'Orders Processed', format: 'number' },
      fulfillment_rate: { name: 'Fulfillment Rate', format: 'percent' },
      customer_satisfaction: { name: 'Customer Satisfaction', format: 'number', unit: '/5' },
      headcount: { name: 'Total Headcount', format: 'number' },
      turnover_rate: { name: 'Turnover Rate', format: 'percent' },
      satisfaction_score: { name: 'Satisfaction Score', format: 'number', unit: '/10' },
    };

    return metricIds.map((metricId, idx) => {
      const template = metricTemplates[metricId] || { name: metricId, format: 'number' as const };
      const value = Math.floor(Math.random() * 100000) + 10000;
      const previousValue = value * (0.85 + Math.random() * 0.3);
      const change = value - previousValue;
      const changePercent = (change / previousValue) * 100;

      return {
        id: `metric_${idx}`,
        name: template.name || metricId,
        value,
        previousValue,
        change,
        changePercent,
        trend: changePercent > 2 ? 'up' : changePercent < -2 ? 'down' : 'stable',
        target: value * 1.1,
        targetAchievement: (value / (value * 1.1)) * 100,
        unit: template.unit,
        format: template.format || 'number',
        currency: template.currency,
        status: changePercent > 5 ? 'excellent' : changePercent > 0 ? 'good' : changePercent > -5 ? 'warning' : 'critical',
        sparkline: Array.from({ length: 7 }, () => Math.floor(Math.random() * 20000) + 5000),
      };
    });
  }

  private async generateSectionCharts(_type: string, chartIds: string[]): Promise<SectionChart[]> {
    return chartIds.map(chartId => ({
      type: 'line' as const,
      title: chartId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      data: Array.from({ length: 12 }, (_, i) => ({
        month: new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'short' }),
        value: Math.floor(Math.random() * 50000) + 10000,
      })),
    }));
  }

  private generateInsights(metrics: SummaryMetric[]): string[] {
    const insights: string[] = [];

    metrics.forEach(metric => {
      if (metric.status === 'excellent') {
        insights.push(`${metric.name} is performing exceptionally well, up ${metric.changePercent?.toFixed(1)}% from the previous period.`);
      } else if (metric.status === 'critical') {
        insights.push(`${metric.name} requires attention - down ${Math.abs(metric.changePercent || 0).toFixed(1)}% from the previous period.`);
      }
    });

    return insights.slice(0, 3);
  }

  private generateNarrative(type: string, metrics: SummaryMetric[]): string {
    const totalMetrics = metrics.length;
    const positiveMetrics = metrics.filter(m => m.trend === 'up').length;
    const negativeMetrics = metrics.filter(m => m.trend === 'down').length;

    const performance = positiveMetrics > negativeMetrics ? 'positive' : negativeMetrics > positiveMetrics ? 'challenging' : 'mixed';

    let narrative = `The ${type} performance this period shows ${performance} trends overall. `;
    narrative += `${positiveMetrics} of ${totalMetrics} key metrics are trending upward, `;
    narrative += `while ${negativeMetrics} show decline. `;

    const topPerformer = metrics.reduce((best, curr) =>
      (curr.changePercent || 0) > (best.changePercent || 0) ? curr : best
    );

    if (topPerformer.changePercent && topPerformer.changePercent > 0) {
      narrative += `The best performing metric is ${topPerformer.name} with ${topPerformer.changePercent.toFixed(1)}% growth.`;
    }

    return narrative;
  }

  private extractHighlights(sections: SummarySection[]): Highlight[] {
    const highlights: Highlight[] = [];

    sections.forEach(section => {
      section.metrics.forEach(metric => {
        if (metric.status === 'excellent' && (metric.changePercent || 0) > 10) {
          highlights.push({
            id: `highlight_${highlights.length}`,
            type: 'achievement',
            title: `${metric.name} Achievement`,
            description: `${metric.name} exceeded expectations with ${metric.changePercent?.toFixed(1)}% growth`,
            metric: metric.name,
            value: metric.value,
            impact: 'high',
            category: section.type,
          });
        }

        if (metric.targetAchievement && metric.targetAchievement >= 100) {
          highlights.push({
            id: `highlight_${highlights.length}`,
            type: 'milestone',
            title: `${metric.name} Target Achieved`,
            description: `${metric.name} reached ${metric.targetAchievement.toFixed(0)}% of target`,
            metric: metric.name,
            value: metric.value,
            impact: 'high',
            category: section.type,
          });
        }
      });
    });

    return highlights.slice(0, 5);
  }

  private generateAlerts(sections: SummarySection[]): SummaryAlert[] {
    const alerts: SummaryAlert[] = [];

    sections.forEach(section => {
      section.metrics.forEach(metric => {
        if (metric.status === 'critical') {
          alerts.push({
            id: `alert_${alerts.length}`,
            severity: 'critical',
            title: `${metric.name} Below Threshold`,
            description: `${metric.name} has declined ${Math.abs(metric.changePercent || 0).toFixed(1)}% and requires immediate attention`,
            metric: metric.name,
            currentValue: metric.value,
            recommendedAction: `Review ${metric.name} drivers and implement corrective measures`,
          });
        } else if (metric.status === 'warning') {
          alerts.push({
            id: `alert_${alerts.length}`,
            severity: 'warning',
            title: `${metric.name} Trending Down`,
            description: `${metric.name} shows early warning signs with ${Math.abs(metric.changePercent || 0).toFixed(1)}% decline`,
            metric: metric.name,
            currentValue: metric.value,
          });
        }
      });
    });

    return alerts;
  }

  private generateRecommendations(sections: SummarySection[], alerts: SummaryAlert[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Generate recommendations based on alerts
    alerts
      .filter(a => a.severity === 'critical')
      .forEach(alert => {
        recommendations.push({
          id: `rec_${recommendations.length}`,
          priority: 'high',
          category: 'Performance',
          title: `Address ${alert.metric} Decline`,
          description: alert.recommendedAction || `Investigate and resolve issues affecting ${alert.metric}`,
          expectedImpact: `Restore ${alert.metric} to target levels`,
          effort: 'medium',
          relatedMetrics: [alert.metric || ''],
        });
      });

    // Generate recommendations based on opportunities
    sections.forEach(section => {
      section.metrics
        .filter(m => m.status === 'good' && (m.changePercent || 0) > 5)
        .slice(0, 1)
        .forEach(metric => {
          recommendations.push({
            id: `rec_${recommendations.length}`,
            priority: 'medium',
            category: 'Growth',
            title: `Capitalize on ${metric.name} Momentum`,
            description: `${metric.name} is showing strong growth. Consider increasing investment to accelerate gains.`,
            expectedImpact: `Potential to increase ${metric.name} by additional 10-15%`,
            effort: 'low',
            relatedMetrics: [metric.name],
          });
        });
    });

    return recommendations.slice(0, 5);
  }

  // =================== SUMMARY MANAGEMENT ===================

  async getSummary(id: string): Promise<ExecutiveSummary | undefined> {
    return this.summaries.get(id);
  }

  async getSummaries(tenantId: string, options?: {
    period?: SummaryPeriod;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<ExecutiveSummary[]> {
    let summaries = Array.from(this.summaries.values()).filter(s => s.tenantId === tenantId);

    if (options?.period) {
      summaries = summaries.filter(s => s.period === options.period);
    }
    if (options?.startDate) {
      summaries = summaries.filter(s => s.generatedAt >= options.startDate!);
    }
    if (options?.endDate) {
      summaries = summaries.filter(s => s.generatedAt <= options.endDate!);
    }

    summaries = summaries.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());

    if (options?.limit) {
      summaries = summaries.slice(0, options.limit);
    }

    return summaries;
  }

  async deleteSummary(id: string): Promise<void> {
    this.summaries.delete(id);
  }

  // =================== TEMPLATES ===================

  async getTemplates(): Promise<SummaryTemplate[]> {
    return Array.from(this.templates.values());
  }

  async getTemplate(id: string): Promise<SummaryTemplate | undefined> {
    return this.templates.get(id);
  }

  async createTemplate(data: Omit<SummaryTemplate, 'id'>): Promise<SummaryTemplate> {
    const id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const template: SummaryTemplate = {
      id,
      ...data,
    };

    this.templates.set(id, template);
    return template;
  }

  async updateTemplate(id: string, updates: Partial<SummaryTemplate>): Promise<SummaryTemplate | undefined> {
    const template = this.templates.get(id);
    if (!template) return undefined;

    Object.assign(template, updates);
    return template;
  }

  async deleteTemplate(id: string): Promise<void> {
    this.templates.delete(id);
  }

  // =================== PREFERENCES ===================

  async getPreferences(tenantId: string, userId: string): Promise<SummaryPreferences | undefined> {
    const key = `${tenantId}_${userId}`;
    return this.preferences.get(key);
  }

  async updatePreferences(tenantId: string, userId: string, updates: Partial<SummaryPreferences>): Promise<SummaryPreferences> {
    const key = `${tenantId}_${userId}`;
    let prefs = this.preferences.get(key);

    if (!prefs) {
      prefs = {
        id: key,
        tenantId,
        userId,
        defaultPeriod: 'monthly',
        defaultFormat: 'pdf',
        subscribedSections: ['overview', 'financial', 'sales'],
        deliveryPreferences: { email: true, inApp: true },
      };
    }

    Object.assign(prefs, updates);
    this.preferences.set(key, prefs);

    return prefs;
  }

  // =================== EXPORT ===================

  async exportSummary(id: string, format: SummaryFormat): Promise<string | undefined> {
    const summary = this.summaries.get(id);
    if (!summary) return undefined;

    switch (format) {
      case 'json':
        return JSON.stringify(summary, null, 2);

      case 'markdown':
        return this.toMarkdown(summary);

      case 'html':
        return this.toHtml(summary);

      case 'pdf':
        // In production, use a PDF library
        return `PDF export for summary ${id}`;

      default:
        return undefined;
    }
  }

  private toMarkdown(summary: ExecutiveSummary): string {
    let md = `# ${summary.title}\n\n`;
    md += `**Period:** ${summary.dateRange.start.toLocaleDateString()} - ${summary.dateRange.end.toLocaleDateString()}\n\n`;

    // Highlights
    if (summary.highlights.length > 0) {
      md += `## Key Highlights\n\n`;
      summary.highlights.forEach(h => {
        md += `- **${h.title}:** ${h.description}\n`;
      });
      md += '\n';
    }

    // Sections
    summary.sections.forEach(section => {
      md += `## ${section.title}\n\n`;

      if (section.narrative) {
        md += `${section.narrative}\n\n`;
      }

      md += '| Metric | Value | Change | Status |\n';
      md += '|--------|-------|--------|--------|\n';
      section.metrics.forEach(m => {
        const changeStr = m.changePercent
          ? `${m.changePercent > 0 ? '+' : ''}${m.changePercent.toFixed(1)}%`
          : 'N/A';
        md += `| ${m.name} | ${m.value.toLocaleString()} | ${changeStr} | ${m.status} |\n`;
      });
      md += '\n';

      if (section.insights?.length) {
        md += '**Insights:**\n';
        section.insights.forEach(i => {
          md += `- ${i}\n`;
        });
        md += '\n';
      }
    });

    // Alerts
    if (summary.alerts.length > 0) {
      md += `## Alerts\n\n`;
      summary.alerts.forEach(a => {
        md += `- **[${a.severity.toUpperCase()}] ${a.title}:** ${a.description}\n`;
      });
      md += '\n';
    }

    // Recommendations
    if (summary.recommendations.length > 0) {
      md += `## Recommendations\n\n`;
      summary.recommendations.forEach((r, i) => {
        md += `${i + 1}. **${r.title}** (${r.priority} priority)\n`;
        md += `   ${r.description}\n\n`;
      });
    }

    return md;
  }

  private toHtml(summary: ExecutiveSummary): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>${summary.title}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    h2 { color: #555; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f4f4f4; }
    .alert-critical { color: #d32f2f; }
    .alert-warning { color: #f57c00; }
    .status-excellent { color: #388e3c; }
    .status-good { color: #689f38; }
    .status-warning { color: #f57c00; }
    .status-critical { color: #d32f2f; }
  </style>
</head>
<body>
  <h1>${summary.title}</h1>
  <p><strong>Period:</strong> ${summary.dateRange.start.toLocaleDateString()} - ${summary.dateRange.end.toLocaleDateString()}</p>

  ${summary.sections.map(section => `
    <h2>${section.title}</h2>
    ${section.narrative ? `<p>${section.narrative}</p>` : ''}
    <table>
      <tr><th>Metric</th><th>Value</th><th>Change</th><th>Status</th></tr>
      ${section.metrics.map(m => `
        <tr>
          <td>${m.name}</td>
          <td>${m.value.toLocaleString()}</td>
          <td>${m.changePercent ? `${m.changePercent > 0 ? '+' : ''}${m.changePercent.toFixed(1)}%` : 'N/A'}</td>
          <td class="status-${m.status}">${m.status}</td>
        </tr>
      `).join('')}
    </table>
  `).join('')}
</body>
</html>`;
  }

  // =================== STATS ===================

  async getStats(tenantId: string): Promise<{
    totalSummaries: number;
    byPeriod: Record<string, number>;
    recentSummaries: ExecutiveSummary[];
    avgMetricsPerSummary: number;
    avgAlertsPerSummary: number;
  }> {
    const summaries = Array.from(this.summaries.values()).filter(s => s.tenantId === tenantId);

    const byPeriod: Record<string, number> = {};
    summaries.forEach(s => {
      byPeriod[s.period] = (byPeriod[s.period] || 0) + 1;
    });

    const totalMetrics = summaries.reduce(
      (sum, s) => sum + s.sections.reduce((sSum, sec) => sSum + sec.metrics.length, 0),
      0
    );

    const totalAlerts = summaries.reduce((sum, s) => sum + s.alerts.length, 0);

    return {
      totalSummaries: summaries.length,
      byPeriod,
      recentSummaries: summaries
        .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
        .slice(0, 5),
      avgMetricsPerSummary: summaries.length > 0 ? totalMetrics / summaries.length : 0,
      avgAlertsPerSummary: summaries.length > 0 ? totalAlerts / summaries.length : 0,
    };
  }
}
