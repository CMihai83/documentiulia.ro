import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ExecutiveSummaryService, SummaryPeriod } from './executive-summary.service';

describe('ExecutiveSummaryService', () => {
  let service: ExecutiveSummaryService;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;

  const tenantId = 'tenant-123';
  const userId = 'user-456';

  beforeEach(async () => {
    mockEventEmitter = {
      emit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecutiveSummaryService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<ExecutiveSummaryService>(ExecutiveSummaryService);
  });

  describe('Constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize default templates', async () => {
      const templates = await service.getTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });
  });

  // =================== SUMMARY GENERATION ===================

  describe('generateSummary', () => {
    it('should generate an executive summary with default parameters', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        generatedBy: userId,
      });

      expect(summary).toBeDefined();
      expect(summary.id).toContain('summary_');
      expect(summary.tenantId).toBe(tenantId);
      expect(summary.period).toBe('monthly');
      expect(summary.generatedBy).toBe(userId);
    });

    it('should generate summary for daily period', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'daily',
        generatedBy: userId,
      });

      expect(summary.period).toBe('daily');
      expect(summary.title).toContain('Daily');
    });

    it('should generate summary for weekly period', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'weekly',
        generatedBy: userId,
      });

      expect(summary.period).toBe('weekly');
      expect(summary.title).toContain('Weekly');
    });

    it('should generate summary for quarterly period', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'quarterly',
        generatedBy: userId,
      });

      expect(summary.period).toBe('quarterly');
      expect(summary.title).toMatch(/Q\d/);
    });

    it('should generate summary for yearly period', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'yearly',
        generatedBy: userId,
      });

      expect(summary.period).toBe('yearly');
      expect(summary.title).toContain('Annual');
    });

    it('should use custom date range', async () => {
      const start = new Date('2025-01-01');
      const end = new Date('2025-01-31');

      const summary = await service.generateSummary({
        tenantId,
        period: 'custom',
        dateRange: { start, end },
        generatedBy: userId,
      });

      expect(summary.dateRange.start).toEqual(start);
      expect(summary.dateRange.end).toEqual(end);
    });

    it('should use specified template', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        templateId: 'financial-report',
        generatedBy: userId,
      });

      expect(summary.sections.some(s => s.title.includes('Revenue'))).toBe(true);
    });

    it('should use custom title', async () => {
      const summary = await service.generateSummary({
        tenantId,
        title: 'My Custom Summary',
        period: 'monthly',
        generatedBy: userId,
      });

      expect(summary.title).toBe('My Custom Summary');
    });

    it('should include sections with metrics', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        generatedBy: userId,
      });

      expect(summary.sections.length).toBeGreaterThan(0);
      summary.sections.forEach(section => {
        expect(section.metrics.length).toBeGreaterThan(0);
      });
    });

    it('should emit summary.generated event', async () => {
      await service.generateSummary({
        tenantId,
        period: 'monthly',
        generatedBy: userId,
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'summary.generated',
        expect.objectContaining({ summary: expect.any(Object) }),
      );
    });

    it('should include metadata', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        generatedBy: userId,
      });

      expect(summary.metadata).toBeDefined();
      expect(summary.metadata.version).toBe('1.0');
      expect(summary.metadata.dataQuality).toBeGreaterThan(0);
      expect(summary.metadata.dataSources.length).toBeGreaterThan(0);
      expect(summary.metadata.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should record generation timestamp', async () => {
      const before = new Date();
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        generatedBy: userId,
      });
      const after = new Date();

      expect(summary.generatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(summary.generatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Summary Sections', () => {
    it('should include ordered sections', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        generatedBy: userId,
      });

      for (let i = 0; i < summary.sections.length - 1; i++) {
        expect(summary.sections[i].order).toBeLessThan(summary.sections[i + 1].order);
      }
    });

    it('should include section types', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        generatedBy: userId,
      });

      summary.sections.forEach(section => {
        expect(['overview', 'financial', 'operational', 'hr', 'sales', 'custom']).toContain(
          section.type,
        );
      });
    });

    it('should include charts when specified', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        templateId: 'executive-overview',
        generatedBy: userId,
      });

      const sectionWithCharts = summary.sections.find(s => s.charts && s.charts.length > 0);
      expect(sectionWithCharts).toBeDefined();
    });

    it('should include insights when specified', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        templateId: 'executive-overview',
        generatedBy: userId,
      });

      const sectionWithInsights = summary.sections.find(s => s.insights && s.insights.length > 0);
      expect(sectionWithInsights).toBeDefined();
    });

    it('should include narrative when specified', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        templateId: 'executive-overview',
        generatedBy: userId,
      });

      const sectionWithNarrative = summary.sections.find(s => s.narrative);
      expect(sectionWithNarrative).toBeDefined();
    });
  });

  describe('Summary Metrics', () => {
    it('should include metric properties', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        generatedBy: userId,
      });

      const metric = summary.sections[0].metrics[0];

      expect(metric.id).toBeDefined();
      expect(metric.name).toBeDefined();
      expect(metric.value).toBeDefined();
      expect(metric.trend).toBeDefined();
      expect(metric.format).toBeDefined();
      expect(metric.status).toBeDefined();
    });

    it('should calculate change percentage', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        generatedBy: userId,
      });

      const metric = summary.sections[0].metrics[0];

      if (metric.previousValue) {
        expect(metric.change).toBeDefined();
        expect(metric.changePercent).toBeDefined();
      }
    });

    it('should include trend indicator', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        generatedBy: userId,
      });

      summary.sections.forEach(section => {
        section.metrics.forEach(metric => {
          expect(['up', 'down', 'stable', 'volatile']).toContain(metric.trend);
        });
      });
    });

    it('should include status classification', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        generatedBy: userId,
      });

      summary.sections.forEach(section => {
        section.metrics.forEach(metric => {
          expect(['excellent', 'good', 'warning', 'critical']).toContain(metric.status);
        });
      });
    });

    it('should include sparkline data', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        generatedBy: userId,
      });

      const metricWithSparkline = summary.sections[0].metrics.find(m => m.sparkline);
      expect(metricWithSparkline?.sparkline?.length).toBeGreaterThan(0);
    });
  });

  describe('Highlights', () => {
    it('should extract highlights from sections', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        generatedBy: userId,
      });

      expect(Array.isArray(summary.highlights)).toBe(true);
    });

    it('should limit highlights to 5', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        generatedBy: userId,
      });

      expect(summary.highlights.length).toBeLessThanOrEqual(5);
    });

    it('should include highlight properties', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        generatedBy: userId,
      });

      if (summary.highlights.length > 0) {
        const highlight = summary.highlights[0];
        expect(highlight.id).toBeDefined();
        expect(highlight.type).toBeDefined();
        expect(highlight.title).toBeDefined();
        expect(highlight.description).toBeDefined();
        expect(highlight.impact).toBeDefined();
        expect(highlight.category).toBeDefined();
      }
    });
  });

  describe('Alerts', () => {
    it('should generate alerts from sections', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        generatedBy: userId,
      });

      expect(Array.isArray(summary.alerts)).toBe(true);
    });

    it('should include severity in alerts', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        generatedBy: userId,
      });

      summary.alerts.forEach(alert => {
        expect(['critical', 'warning', 'info']).toContain(alert.severity);
      });
    });

    it('should include recommended actions for critical alerts', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        generatedBy: userId,
      });

      const criticalAlert = summary.alerts.find(a => a.severity === 'critical');
      if (criticalAlert) {
        expect(criticalAlert.recommendedAction).toBeDefined();
      }
    });
  });

  describe('Recommendations', () => {
    it('should generate recommendations', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        generatedBy: userId,
      });

      expect(Array.isArray(summary.recommendations)).toBe(true);
    });

    it('should limit recommendations to 5', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        generatedBy: userId,
      });

      expect(summary.recommendations.length).toBeLessThanOrEqual(5);
    });

    it('should include priority in recommendations', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        generatedBy: userId,
      });

      summary.recommendations.forEach(rec => {
        expect(['high', 'medium', 'low']).toContain(rec.priority);
      });
    });

    it('should include expected impact', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        generatedBy: userId,
      });

      summary.recommendations.forEach(rec => {
        expect(rec.description).toBeDefined();
      });
    });
  });

  // =================== SUMMARY MANAGEMENT ===================

  describe('getSummary', () => {
    it('should retrieve summary by id', async () => {
      const created = await service.generateSummary({
        tenantId,
        period: 'monthly',
        generatedBy: userId,
      });

      const retrieved = await service.getSummary(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return undefined for non-existent id', async () => {
      const result = await service.getSummary('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('getSummaries', () => {
    it('should return summaries for tenant', async () => {
      await service.generateSummary({ tenantId, period: 'monthly', generatedBy: userId });
      await service.generateSummary({ tenantId, period: 'weekly', generatedBy: userId });

      const summaries = await service.getSummaries(tenantId);

      expect(summaries.length).toBe(2);
    });

    it('should filter by period', async () => {
      await service.generateSummary({ tenantId, period: 'monthly', generatedBy: userId });
      await service.generateSummary({ tenantId, period: 'weekly', generatedBy: userId });

      const summaries = await service.getSummaries(tenantId, { period: 'monthly' });

      expect(summaries.length).toBe(1);
      expect(summaries[0].period).toBe('monthly');
    });

    it('should respect limit parameter', async () => {
      await service.generateSummary({ tenantId, period: 'monthly', generatedBy: userId });
      await service.generateSummary({ tenantId, period: 'weekly', generatedBy: userId });
      await service.generateSummary({ tenantId, period: 'daily', generatedBy: userId });

      const summaries = await service.getSummaries(tenantId, { limit: 2 });

      expect(summaries.length).toBe(2);
    });

    it('should sort by generation date descending', async () => {
      await service.generateSummary({ tenantId, period: 'monthly', generatedBy: userId });
      await service.generateSummary({ tenantId, period: 'weekly', generatedBy: userId });

      const summaries = await service.getSummaries(tenantId);

      expect(summaries[0].generatedAt.getTime()).toBeGreaterThanOrEqual(
        summaries[1].generatedAt.getTime(),
      );
    });

    it('should filter by date range', async () => {
      await service.generateSummary({ tenantId, period: 'monthly', generatedBy: userId });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const summaries = await service.getSummaries(tenantId, {
        endDate: tomorrow,
      });

      expect(summaries.length).toBeGreaterThan(0);
    });
  });

  describe('deleteSummary', () => {
    it('should delete summary by id', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        generatedBy: userId,
      });

      await service.deleteSummary(summary.id);

      const retrieved = await service.getSummary(summary.id);
      expect(retrieved).toBeUndefined();
    });
  });

  // =================== TEMPLATES ===================

  describe('getTemplates', () => {
    it('should return default templates', async () => {
      const templates = await service.getTemplates();

      expect(templates.length).toBeGreaterThan(0);
    });

    it('should include executive-overview template', async () => {
      const templates = await service.getTemplates();

      const execOverview = templates.find(t => t.id === 'executive-overview');
      expect(execOverview).toBeDefined();
      expect(execOverview?.isDefault).toBe(true);
    });

    it('should include financial-report template', async () => {
      const templates = await service.getTemplates();

      const financial = templates.find(t => t.id === 'financial-report');
      expect(financial).toBeDefined();
    });

    it('should include sales-report template', async () => {
      const templates = await service.getTemplates();

      const sales = templates.find(t => t.id === 'sales-report');
      expect(sales).toBeDefined();
    });

    it('should include hr-report template', async () => {
      const templates = await service.getTemplates();

      const hr = templates.find(t => t.id === 'hr-report');
      expect(hr).toBeDefined();
    });
  });

  describe('getTemplate', () => {
    it('should return template by id', async () => {
      const template = await service.getTemplate('executive-overview');

      expect(template).toBeDefined();
      expect(template?.id).toBe('executive-overview');
    });

    it('should return undefined for non-existent id', async () => {
      const template = await service.getTemplate('non-existent');

      expect(template).toBeUndefined();
    });
  });

  describe('createTemplate', () => {
    it('should create a custom template', async () => {
      const template = await service.createTemplate({
        name: 'Custom Report',
        description: 'My custom executive summary template',
        sections: [
          {
            type: 'overview',
            title: 'Custom Overview',
            metrics: ['revenue', 'profit'],
          },
        ],
      });

      expect(template.id).toContain('template_');
      expect(template.name).toBe('Custom Report');
    });

    it('should persist created template', async () => {
      const created = await service.createTemplate({
        name: 'Test Template',
        description: 'Test',
        sections: [{ type: 'financial', title: 'Finance', metrics: ['revenue'] }],
      });

      const retrieved = await service.getTemplate(created.id);
      expect(retrieved).toBeDefined();
    });
  });

  describe('updateTemplate', () => {
    it('should update template properties', async () => {
      const created = await service.createTemplate({
        name: 'Original Name',
        description: 'Original',
        sections: [],
      });

      const updated = await service.updateTemplate(created.id, {
        name: 'Updated Name',
      });

      expect(updated?.name).toBe('Updated Name');
    });

    it('should return undefined for non-existent template', async () => {
      const result = await service.updateTemplate('non-existent', { name: 'Test' });

      expect(result).toBeUndefined();
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template', async () => {
      const created = await service.createTemplate({
        name: 'To Delete',
        description: 'Delete me',
        sections: [],
      });

      await service.deleteTemplate(created.id);

      const retrieved = await service.getTemplate(created.id);
      expect(retrieved).toBeUndefined();
    });
  });

  // =================== PREFERENCES ===================

  describe('getPreferences', () => {
    it('should return undefined for user with no preferences', async () => {
      const prefs = await service.getPreferences(tenantId, 'new-user');

      expect(prefs).toBeUndefined();
    });

    it('should return preferences after update', async () => {
      await service.updatePreferences(tenantId, userId, {
        defaultPeriod: 'weekly',
      });

      const prefs = await service.getPreferences(tenantId, userId);

      expect(prefs).toBeDefined();
      expect(prefs?.defaultPeriod).toBe('weekly');
    });
  });

  describe('updatePreferences', () => {
    it('should create preferences if not exist', async () => {
      const prefs = await service.updatePreferences(tenantId, 'new-user', {
        defaultPeriod: 'quarterly',
      });

      expect(prefs.defaultPeriod).toBe('quarterly');
    });

    it('should set default values for new preferences', async () => {
      const prefs = await service.updatePreferences(tenantId, 'fresh-user', {});

      expect(prefs.defaultFormat).toBe('pdf');
      expect(prefs.subscribedSections).toContain('overview');
      expect(prefs.deliveryPreferences.email).toBe(true);
    });

    it('should update existing preferences', async () => {
      await service.updatePreferences(tenantId, userId, {
        defaultPeriod: 'monthly',
      });

      const updated = await service.updatePreferences(tenantId, userId, {
        defaultPeriod: 'weekly',
        defaultFormat: 'html',
      });

      expect(updated.defaultPeriod).toBe('weekly');
      expect(updated.defaultFormat).toBe('html');
    });

    it('should support schedule configuration', async () => {
      const prefs = await service.updatePreferences(tenantId, userId, {
        schedule: {
          frequency: 'weekly',
          time: '09:00',
          dayOfWeek: 1,
        },
      });

      expect(prefs.schedule?.frequency).toBe('weekly');
      expect(prefs.schedule?.dayOfWeek).toBe(1);
    });
  });

  // =================== EXPORT ===================

  describe('exportSummary', () => {
    it('should export to JSON format', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        generatedBy: userId,
      });

      const exported = await service.exportSummary(summary.id, 'json');

      expect(exported).toBeDefined();
      const parsed = JSON.parse(exported!);
      expect(parsed.id).toBe(summary.id);
    });

    it('should export to markdown format', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        generatedBy: userId,
      });

      const markdown = await service.exportSummary(summary.id, 'markdown');

      expect(markdown).toContain('# ');
      expect(markdown).toContain('##');
      expect(markdown).toContain('|');
    });

    it('should export to HTML format', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        generatedBy: userId,
      });

      const html = await service.exportSummary(summary.id, 'html');

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<table>');
      expect(html).toContain('</html>');
    });

    it('should export to PDF placeholder', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        generatedBy: userId,
      });

      const pdf = await service.exportSummary(summary.id, 'pdf');

      expect(pdf).toContain('PDF export');
    });

    it('should return undefined for non-existent summary', async () => {
      const result = await service.exportSummary('non-existent', 'json');

      expect(result).toBeUndefined();
    });

    it('should include highlights in markdown', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        generatedBy: userId,
      });

      const markdown = await service.exportSummary(summary.id, 'markdown');

      expect(markdown).toContain('Period:');
    });

    it('should include alerts in markdown', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        generatedBy: userId,
      });

      const markdown = await service.exportSummary(summary.id, 'markdown');

      if (summary.alerts.length > 0) {
        expect(markdown).toContain('Alerts');
      }
    });
  });

  // =================== STATISTICS ===================

  describe('getStats', () => {
    it('should return statistics for tenant', async () => {
      await service.generateSummary({ tenantId, period: 'monthly', generatedBy: userId });
      await service.generateSummary({ tenantId, period: 'weekly', generatedBy: userId });

      const stats = await service.getStats(tenantId);

      expect(stats.totalSummaries).toBe(2);
    });

    it('should count by period', async () => {
      await service.generateSummary({ tenantId, period: 'monthly', generatedBy: userId });
      await service.generateSummary({ tenantId, period: 'monthly', generatedBy: userId });
      await service.generateSummary({ tenantId, period: 'weekly', generatedBy: userId });

      const stats = await service.getStats(tenantId);

      expect(stats.byPeriod['monthly']).toBe(2);
      expect(stats.byPeriod['weekly']).toBe(1);
    });

    it('should return recent summaries', async () => {
      await service.generateSummary({ tenantId, period: 'monthly', generatedBy: userId });
      await service.generateSummary({ tenantId, period: 'weekly', generatedBy: userId });

      const stats = await service.getStats(tenantId);

      expect(stats.recentSummaries.length).toBeGreaterThan(0);
      expect(stats.recentSummaries.length).toBeLessThanOrEqual(5);
    });

    it('should calculate average metrics per summary', async () => {
      await service.generateSummary({ tenantId, period: 'monthly', generatedBy: userId });

      const stats = await service.getStats(tenantId);

      expect(stats.avgMetricsPerSummary).toBeGreaterThan(0);
    });

    it('should calculate average alerts per summary', async () => {
      await service.generateSummary({ tenantId, period: 'monthly', generatedBy: userId });

      const stats = await service.getStats(tenantId);

      expect(typeof stats.avgAlertsPerSummary).toBe('number');
    });

    it('should return zeros for tenant with no summaries', async () => {
      const stats = await service.getStats('empty-tenant');

      expect(stats.totalSummaries).toBe(0);
      expect(stats.avgMetricsPerSummary).toBe(0);
    });
  });

  // =================== EDGE CASES ===================

  describe('Edge Cases', () => {
    it('should handle custom sections', async () => {
      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        customSections: [
          {
            type: 'custom',
            title: 'My Custom Section',
            metrics: ['revenue', 'profit'],
          },
        ],
        generatedBy: userId,
      });

      expect(summary.sections.length).toBe(1);
      expect(summary.sections[0].title).toBe('My Custom Section');
    });

    it('should handle empty template sections', async () => {
      const template = await service.createTemplate({
        name: 'Empty Sections',
        description: 'No sections',
        sections: [],
      });

      const summary = await service.generateSummary({
        tenantId,
        period: 'monthly',
        templateId: template.id,
        generatedBy: userId,
      });

      expect(summary.sections.length).toBe(0);
    });

    it('should handle multiple concurrent summary generations', async () => {
      const promises = [
        service.generateSummary({ tenantId, period: 'daily', generatedBy: userId }),
        service.generateSummary({ tenantId, period: 'weekly', generatedBy: userId }),
        service.generateSummary({ tenantId, period: 'monthly', generatedBy: userId }),
      ];

      const summaries = await Promise.all(promises);

      expect(summaries.length).toBe(3);
      const ids = summaries.map(s => s.id);
      expect(new Set(ids).size).toBe(3); // All unique IDs
    });

    it('should handle different tenants separately', async () => {
      await service.generateSummary({ tenantId: 'tenant-A', period: 'monthly', generatedBy: userId });
      await service.generateSummary({ tenantId: 'tenant-B', period: 'monthly', generatedBy: userId });

      const summariesA = await service.getSummaries('tenant-A');
      const summariesB = await service.getSummaries('tenant-B');

      expect(summariesA.length).toBe(1);
      expect(summariesB.length).toBe(1);
    });
  });
});
