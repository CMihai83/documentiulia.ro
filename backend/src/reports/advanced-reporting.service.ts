import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Report Types
export type ReportType =
  | 'financial'
  | 'hr'
  | 'compliance'
  | 'operational'
  | 'tax'
  | 'custom';

export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json' | 'html';

export type ScheduleFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'custom';

export type WidgetType =
  | 'chart'
  | 'kpi'
  | 'table'
  | 'summary'
  | 'gauge'
  | 'heatmap'
  | 'trend';

// Interfaces
export interface ReportField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency' | 'percentage';
  source: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'none';
  format?: string;
  label?: string;
}

export interface ReportFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'between';
  value: any;
}

export interface ReportSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: ReportType;
  category: string;
  fields: ReportField[];
  filters: ReportFilter[];
  sorting: ReportSort[];
  groupBy?: string[];
  charts?: ChartConfig[];
  createdAt: Date;
  isSystem: boolean;
}

export interface ChartConfig {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'donut';
  title: string;
  xAxis: string;
  yAxis: string[];
  colors?: string[];
}

export interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  type: ReportType;
  tenantId: string;
  createdBy: string;
  templateId?: string;
  fields: ReportField[];
  filters: ReportFilter[];
  sorting: ReportSort[];
  groupBy?: string[];
  charts?: ChartConfig[];
  schedule?: ReportSchedule;
  sharing: ReportSharing;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportSchedule {
  enabled: boolean;
  frequency: ScheduleFrequency;
  cronExpression?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  hour: number;
  minute: number;
  timezone: string;
  formats: ReportFormat[];
  recipients: string[];
  lastRun?: Date;
  nextRun?: Date;
}

export interface ReportSharing {
  isPublic: boolean;
  sharedWith: string[];
  permissions: {
    userId: string;
    canView: boolean;
    canEdit: boolean;
    canExport: boolean;
  }[];
}

export interface GeneratedReport {
  id: string;
  definitionId: string;
  name: string;
  type: ReportType;
  tenantId: string;
  generatedBy: string;
  generatedAt: Date;
  period: {
    start: string;
    end: string;
  };
  data: any[];
  summary: Record<string, any>;
  charts?: {
    id: string;
    title: string;
    data: any[];
  }[];
  format: ReportFormat;
  fileUrl?: string;
  fileSize?: number;
  status: 'generating' | 'completed' | 'failed';
  error?: string;
}

export interface DashboardWidget {
  id: string;
  name: string;
  type: WidgetType;
  reportDefinitionId?: string;
  config: WidgetConfig;
  position: { x: number; y: number; w: number; h: number };
  refreshInterval?: number;
  tenantId: string;
  createdBy: string;
}

export interface WidgetConfig {
  title: string;
  subtitle?: string;
  metric?: string;
  chartType?: 'line' | 'bar' | 'pie' | 'area';
  colors?: string[];
  showTrend?: boolean;
  showPercentChange?: boolean;
  threshold?: { warning: number; critical: number };
  dataSource: string;
  filters?: ReportFilter[];
  timeRange?: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  customDateRange?: { start: string; end: string };
}

export interface WidgetData {
  widgetId: string;
  timestamp: Date;
  value?: number;
  trend?: 'up' | 'down' | 'stable';
  percentChange?: number;
  data?: any[];
  chartData?: any[];
}

export interface ReportStats {
  totalReports: number;
  scheduledReports: number;
  reportsGeneratedToday: number;
  reportsGeneratedThisMonth: number;
  topReportTypes: { type: ReportType; count: number }[];
  exportsByFormat: { format: ReportFormat; count: number }[];
  averageGenerationTime: number;
}

@Injectable()
export class AdvancedReportingService {
  private readonly logger = new Logger(AdvancedReportingService.name);

  // In-memory storage for demo (would use database in production)
  private templates: Map<string, ReportTemplate> = new Map();
  private definitions: Map<string, ReportDefinition> = new Map();
  private reports: Map<string, GeneratedReport> = new Map();
  private widgets: Map<string, DashboardWidget> = new Map();
  private widgetData: Map<string, WidgetData[]> = new Map();

  // ID counters
  private templateIdCounter = 0;
  private definitionIdCounter = 0;
  private reportIdCounter = 0;
  private widgetIdCounter = 0;

  constructor(private configService: ConfigService) {
    this.initializeSystemTemplates();
  }

  private generateId(prefix: string, counter: number): string {
    return `${prefix}-${counter}-${Date.now()}`;
  }

  private initializeSystemTemplates(): void {
    const systemTemplates: ReportTemplate[] = [
      {
        id: 'tpl-financial-summary',
        name: 'Sumar Financiar',
        description: 'Raport sumar cu venituri, cheltuieli și profit',
        type: 'financial',
        category: 'Finance',
        fields: [
          { id: 'f1', name: 'period', type: 'date', source: 'invoice.invoiceDate', label: 'Perioada' },
          { id: 'f2', name: 'revenue', type: 'currency', source: 'invoice.netAmount', aggregation: 'sum', label: 'Venituri' },
          { id: 'f3', name: 'expenses', type: 'currency', source: 'expense.amount', aggregation: 'sum', label: 'Cheltuieli' },
          { id: 'f4', name: 'profit', type: 'currency', source: 'calculated.profit', aggregation: 'sum', label: 'Profit' },
          { id: 'f5', name: 'profitMargin', type: 'percentage', source: 'calculated.margin', label: 'Marja Profit' },
        ],
        filters: [],
        sorting: [{ field: 'period', direction: 'desc' }],
        groupBy: ['period'],
        charts: [
          { id: 'c1', type: 'line', title: 'Evoluție Venituri vs Cheltuieli', xAxis: 'period', yAxis: ['revenue', 'expenses'] },
          { id: 'c2', type: 'bar', title: 'Profit pe Perioadă', xAxis: 'period', yAxis: ['profit'] },
        ],
        createdAt: new Date(),
        isSystem: true,
      },
      {
        id: 'tpl-vat-report',
        name: 'Raport TVA',
        description: 'Declarație TVA cu colectat și deductibil',
        type: 'tax',
        category: 'Tax',
        fields: [
          { id: 'f1', name: 'period', type: 'date', source: 'vatReport.period', label: 'Perioada' },
          { id: 'f2', name: 'vatCollected', type: 'currency', source: 'vatReport.vatCollected', aggregation: 'sum', label: 'TVA Colectat' },
          { id: 'f3', name: 'vatDeductible', type: 'currency', source: 'vatReport.vatDeductible', aggregation: 'sum', label: 'TVA Deductibil' },
          { id: 'f4', name: 'vatPayable', type: 'currency', source: 'vatReport.vatPayable', aggregation: 'sum', label: 'TVA de Plată' },
          { id: 'f5', name: 'status', type: 'string', source: 'vatReport.status', label: 'Status' },
        ],
        filters: [],
        sorting: [{ field: 'period', direction: 'desc' }],
        charts: [
          { id: 'c1', type: 'bar', title: 'TVA Colectat vs Deductibil', xAxis: 'period', yAxis: ['vatCollected', 'vatDeductible'] },
        ],
        createdAt: new Date(),
        isSystem: true,
      },
      {
        id: 'tpl-hr-payroll',
        name: 'Raport Salarizare',
        description: 'Sumar lunar salarizare angajați',
        type: 'hr',
        category: 'Human Resources',
        fields: [
          { id: 'f1', name: 'month', type: 'date', source: 'payroll.period', label: 'Luna' },
          { id: 'f2', name: 'grossSalary', type: 'currency', source: 'payroll.grossSalary', aggregation: 'sum', label: 'Salariu Brut' },
          { id: 'f3', name: 'netSalary', type: 'currency', source: 'payroll.netSalary', aggregation: 'sum', label: 'Salariu Net' },
          { id: 'f4', name: 'taxes', type: 'currency', source: 'payroll.taxes', aggregation: 'sum', label: 'Taxe' },
          { id: 'f5', name: 'contributions', type: 'currency', source: 'payroll.contributions', aggregation: 'sum', label: 'Contribuții' },
          { id: 'f6', name: 'employeeCount', type: 'number', source: 'payroll.employeeCount', aggregation: 'count', label: 'Nr. Angajați' },
        ],
        filters: [],
        sorting: [{ field: 'month', direction: 'desc' }],
        groupBy: ['month'],
        charts: [
          { id: 'c1', type: 'line', title: 'Evoluție Salarizare', xAxis: 'month', yAxis: ['grossSalary', 'netSalary'] },
          { id: 'c2', type: 'pie', title: 'Distribuție Costuri', xAxis: 'category', yAxis: ['amount'] },
        ],
        createdAt: new Date(),
        isSystem: true,
      },
      {
        id: 'tpl-compliance-anaf',
        name: 'Raport Conformitate ANAF',
        description: 'Status declarații și raportări ANAF',
        type: 'compliance',
        category: 'Compliance',
        fields: [
          { id: 'f1', name: 'declarationType', type: 'string', source: 'declaration.type', label: 'Tip Declarație' },
          { id: 'f2', name: 'period', type: 'date', source: 'declaration.period', label: 'Perioada' },
          { id: 'f3', name: 'dueDate', type: 'date', source: 'declaration.dueDate', label: 'Termen' },
          { id: 'f4', name: 'submittedDate', type: 'date', source: 'declaration.submittedAt', label: 'Data Depunere' },
          { id: 'f5', name: 'status', type: 'string', source: 'declaration.status', label: 'Status' },
          { id: 'f6', name: 'amount', type: 'currency', source: 'declaration.amount', label: 'Suma' },
        ],
        filters: [],
        sorting: [{ field: 'dueDate', direction: 'asc' }],
        createdAt: new Date(),
        isSystem: true,
      },
      {
        id: 'tpl-invoice-aging',
        name: 'Raport Vechime Facturi',
        description: 'Analiza creanțe și datorii pe intervale de vechime',
        type: 'financial',
        category: 'Receivables',
        fields: [
          { id: 'f1', name: 'partner', type: 'string', source: 'invoice.partnerName', label: 'Partener' },
          { id: 'f2', name: 'current', type: 'currency', source: 'aging.current', aggregation: 'sum', label: '0-30 zile' },
          { id: 'f3', name: 'days31_60', type: 'currency', source: 'aging.days31_60', aggregation: 'sum', label: '31-60 zile' },
          { id: 'f4', name: 'days61_90', type: 'currency', source: 'aging.days61_90', aggregation: 'sum', label: '61-90 zile' },
          { id: 'f5', name: 'over90', type: 'currency', source: 'aging.over90', aggregation: 'sum', label: '>90 zile' },
          { id: 'f6', name: 'total', type: 'currency', source: 'aging.total', aggregation: 'sum', label: 'Total' },
        ],
        filters: [],
        sorting: [{ field: 'total', direction: 'desc' }],
        groupBy: ['partner'],
        charts: [
          { id: 'c1', type: 'bar', title: 'Distribuție Vechime', xAxis: 'ageRange', yAxis: ['amount'] },
        ],
        createdAt: new Date(),
        isSystem: true,
      },
      {
        id: 'tpl-operational-kpi',
        name: 'KPI Operațional',
        description: 'Indicatori cheie de performanță operațională',
        type: 'operational',
        category: 'Operations',
        fields: [
          { id: 'f1', name: 'period', type: 'date', source: 'kpi.period', label: 'Perioada' },
          { id: 'f2', name: 'documentsProcessed', type: 'number', source: 'kpi.documents', aggregation: 'sum', label: 'Documente Procesate' },
          { id: 'f3', name: 'averageProcessingTime', type: 'number', source: 'kpi.avgTime', aggregation: 'avg', label: 'Timp Mediu (s)' },
          { id: 'f4', name: 'errorRate', type: 'percentage', source: 'kpi.errorRate', aggregation: 'avg', label: 'Rata Erori' },
          { id: 'f5', name: 'automationRate', type: 'percentage', source: 'kpi.automation', aggregation: 'avg', label: 'Rata Automatizare' },
        ],
        filters: [],
        sorting: [{ field: 'period', direction: 'desc' }],
        charts: [
          { id: 'c1', type: 'line', title: 'Tendință Procesare', xAxis: 'period', yAxis: ['documentsProcessed'] },
          { id: 'c2', type: 'area', title: 'Rata Automatizare', xAxis: 'period', yAxis: ['automationRate'] },
        ],
        createdAt: new Date(),
        isSystem: true,
      },
    ];

    for (const template of systemTemplates) {
      this.templates.set(template.id, template);
    }

    this.logger.log(`Initialized ${systemTemplates.length} system report templates`);
  }

  // =================== TEMPLATES ===================

  async getTemplates(category?: string): Promise<ReportTemplate[]> {
    let templates = Array.from(this.templates.values());

    if (category) {
      templates = templates.filter(t => t.category.toLowerCase() === category.toLowerCase());
    }

    return templates.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getTemplate(templateId: string): Promise<ReportTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  async createTemplate(
    name: string,
    description: string,
    type: ReportType,
    category: string,
    fields: ReportField[],
    filters?: ReportFilter[],
    sorting?: ReportSort[],
    groupBy?: string[],
    charts?: ChartConfig[],
  ): Promise<ReportTemplate> {
    const template: ReportTemplate = {
      id: this.generateId('tpl', ++this.templateIdCounter),
      name,
      description,
      type,
      category,
      fields,
      filters: filters || [],
      sorting: sorting || [],
      groupBy,
      charts,
      createdAt: new Date(),
      isSystem: false,
    };

    this.templates.set(template.id, template);
    this.logger.log(`Created report template: ${name}`);
    return template;
  }

  // =================== REPORT DEFINITIONS ===================

  async createReportDefinition(
    name: string,
    description: string,
    type: ReportType,
    tenantId: string,
    createdBy: string,
    config: {
      templateId?: string;
      fields?: ReportField[];
      filters?: ReportFilter[];
      sorting?: ReportSort[];
      groupBy?: string[];
      charts?: ChartConfig[];
      schedule?: ReportSchedule;
      sharing?: Partial<ReportSharing>;
    },
  ): Promise<ReportDefinition> {
    let fields = config.fields || [];
    let charts = config.charts;

    // If using template, inherit fields and charts
    if (config.templateId) {
      const template = await this.getTemplate(config.templateId);
      if (template) {
        fields = config.fields || template.fields;
        charts = config.charts || template.charts;
      }
    }

    const definition: ReportDefinition = {
      id: this.generateId('rpt', ++this.definitionIdCounter),
      name,
      description,
      type,
      tenantId,
      createdBy,
      templateId: config.templateId,
      fields,
      filters: config.filters || [],
      sorting: config.sorting || [],
      groupBy: config.groupBy,
      charts,
      schedule: config.schedule,
      sharing: {
        isPublic: config.sharing?.isPublic || false,
        sharedWith: config.sharing?.sharedWith || [],
        permissions: config.sharing?.permissions || [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Calculate next run if scheduled
    if (definition.schedule?.enabled) {
      definition.schedule.nextRun = this.calculateNextRun(definition.schedule);
    }

    this.definitions.set(definition.id, definition);
    this.logger.log(`Created report definition: ${name}`);
    return definition;
  }

  async getReportDefinition(definitionId: string): Promise<ReportDefinition | null> {
    return this.definitions.get(definitionId) || null;
  }

  async getReportDefinitions(tenantId: string, type?: ReportType): Promise<ReportDefinition[]> {
    let definitions = Array.from(this.definitions.values())
      .filter(d => d.tenantId === tenantId);

    if (type) {
      definitions = definitions.filter(d => d.type === type);
    }

    return definitions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async updateReportDefinition(
    definitionId: string,
    updates: Partial<Omit<ReportDefinition, 'id' | 'tenantId' | 'createdBy' | 'createdAt'>>,
  ): Promise<ReportDefinition | null> {
    const definition = this.definitions.get(definitionId);
    if (!definition) return null;

    const updated: ReportDefinition = {
      ...definition,
      ...updates,
      updatedAt: new Date(),
    };

    // Recalculate next run if schedule changed
    if (updated.schedule?.enabled) {
      updated.schedule.nextRun = this.calculateNextRun(updated.schedule);
    }

    this.definitions.set(definitionId, updated);
    return updated;
  }

  async deleteReportDefinition(definitionId: string): Promise<boolean> {
    return this.definitions.delete(definitionId);
  }

  // =================== REPORT GENERATION ===================

  async generateReport(
    definitionId: string,
    generatedBy: string,
    period: { start: string; end: string },
    format: ReportFormat = 'json',
  ): Promise<GeneratedReport> {
    const definition = await this.getReportDefinition(definitionId);
    if (!definition) {
      throw new Error('Report definition not found');
    }

    const report: GeneratedReport = {
      id: this.generateId('gen', ++this.reportIdCounter),
      definitionId,
      name: definition.name,
      type: definition.type,
      tenantId: definition.tenantId,
      generatedBy,
      generatedAt: new Date(),
      period,
      data: [],
      summary: {},
      charts: [],
      format,
      status: 'generating',
    };

    this.reports.set(report.id, report);

    try {
      // Generate report data based on type
      const reportData = await this.fetchReportData(definition, period);
      report.data = reportData.data;
      report.summary = reportData.summary;

      // Generate chart data if charts defined
      if (definition.charts) {
        report.charts = definition.charts.map(chart => ({
          id: chart.id,
          title: chart.title,
          data: this.generateChartData(chart, reportData.data),
        }));
      }

      // Export to format if not JSON
      if (format !== 'json') {
        const exportResult = await this.exportReport(report, format);
        report.fileUrl = exportResult.url;
        report.fileSize = exportResult.size;
      }

      report.status = 'completed';
      this.reports.set(report.id, report);

      // Update last run on schedule
      if (definition.schedule) {
        definition.schedule.lastRun = new Date();
        definition.schedule.nextRun = this.calculateNextRun(definition.schedule);
        this.definitions.set(definitionId, definition);
      }

      this.logger.log(`Generated report: ${report.name} (${format})`);
      return report;
    } catch (error) {
      report.status = 'failed';
      report.error = error.message;
      this.reports.set(report.id, report);
      throw error;
    }
  }

  private async fetchReportData(
    definition: ReportDefinition,
    period: { start: string; end: string },
  ): Promise<{ data: any[]; summary: Record<string, any> }> {
    // Simulate data fetching based on report type
    const data: any[] = [];
    const summary: Record<string, any> = {};

    switch (definition.type) {
      case 'financial':
        return this.generateFinancialData(definition, period);
      case 'hr':
        return this.generateHrData(definition, period);
      case 'tax':
        return this.generateTaxData(definition, period);
      case 'compliance':
        return this.generateComplianceData(definition, period);
      case 'operational':
        return this.generateOperationalData(definition, period);
      default:
        return this.generateCustomData(definition, period);
    }
  }

  private generateFinancialData(
    definition: ReportDefinition,
    period: { start: string; end: string },
  ): { data: any[]; summary: Record<string, any> } {
    // Generate mock financial data
    const months = this.getMonthsInPeriod(period.start, period.end);
    const data = months.map((month, i) => ({
      period: month,
      revenue: 50000 + Math.random() * 30000,
      expenses: 30000 + Math.random() * 15000,
      profit: 0,
      profitMargin: 0,
    }));

    // Calculate derived fields
    data.forEach(row => {
      row.profit = row.revenue - row.expenses;
      row.profitMargin = row.revenue > 0 ? (row.profit / row.revenue) * 100 : 0;
    });

    const summary = {
      totalRevenue: data.reduce((sum, r) => sum + r.revenue, 0),
      totalExpenses: data.reduce((sum, r) => sum + r.expenses, 0),
      totalProfit: data.reduce((sum, r) => sum + r.profit, 0),
      averageMargin: data.reduce((sum, r) => sum + r.profitMargin, 0) / data.length,
      periodCount: data.length,
    };

    return { data, summary };
  }

  private generateHrData(
    definition: ReportDefinition,
    period: { start: string; end: string },
  ): { data: any[]; summary: Record<string, any> } {
    const months = this.getMonthsInPeriod(period.start, period.end);
    const data = months.map((month, i) => ({
      month,
      grossSalary: 150000 + Math.random() * 20000,
      netSalary: 100000 + Math.random() * 15000,
      taxes: 25000 + Math.random() * 5000,
      contributions: 35000 + Math.random() * 5000,
      employeeCount: 25 + Math.floor(Math.random() * 5),
    }));

    const summary = {
      totalGrossSalary: data.reduce((sum, r) => sum + r.grossSalary, 0),
      totalNetSalary: data.reduce((sum, r) => sum + r.netSalary, 0),
      totalTaxes: data.reduce((sum, r) => sum + r.taxes, 0),
      averageEmployees: Math.round(data.reduce((sum, r) => sum + r.employeeCount, 0) / data.length),
      averageSalary: data.reduce((sum, r) => sum + r.grossSalary, 0) / data.reduce((sum, r) => sum + r.employeeCount, 0),
    };

    return { data, summary };
  }

  private generateTaxData(
    definition: ReportDefinition,
    period: { start: string; end: string },
  ): { data: any[]; summary: Record<string, any> } {
    const months = this.getMonthsInPeriod(period.start, period.end);
    const data = months.map((month, i) => ({
      period: month,
      vatCollected: 10000 + Math.random() * 5000,
      vatDeductible: 6000 + Math.random() * 3000,
      vatPayable: 0,
      status: Math.random() > 0.3 ? 'SUBMITTED' : 'PENDING',
    }));

    data.forEach(row => {
      row.vatPayable = row.vatCollected - row.vatDeductible;
    });

    const summary = {
      totalVatCollected: data.reduce((sum, r) => sum + r.vatCollected, 0),
      totalVatDeductible: data.reduce((sum, r) => sum + r.vatDeductible, 0),
      totalVatPayable: data.reduce((sum, r) => sum + r.vatPayable, 0),
      submittedCount: data.filter(r => r.status === 'SUBMITTED').length,
      pendingCount: data.filter(r => r.status === 'PENDING').length,
    };

    return { data, summary };
  }

  private generateComplianceData(
    definition: ReportDefinition,
    period: { start: string; end: string },
  ): { data: any[]; summary: Record<string, any> } {
    const declarations = [
      { type: 'D300', name: 'Decont TVA' },
      { type: 'D390', name: 'Declarație Recapitulativă' },
      { type: 'D394', name: 'Declarație Informativă' },
      { type: 'SAF-T', name: 'SAF-T D406' },
    ];

    const months = this.getMonthsInPeriod(period.start, period.end);
    const data: any[] = [];

    months.forEach(month => {
      declarations.forEach(decl => {
        const dueDate = new Date(month);
        dueDate.setDate(25);

        data.push({
          declarationType: decl.type,
          declarationName: decl.name,
          period: month,
          dueDate: dueDate.toISOString().split('T')[0],
          submittedDate: Math.random() > 0.2 ? new Date(dueDate.getTime() - Math.random() * 86400000 * 10).toISOString().split('T')[0] : null,
          status: Math.random() > 0.2 ? 'SUBMITTED' : (Math.random() > 0.5 ? 'PENDING' : 'OVERDUE'),
          amount: 5000 + Math.random() * 10000,
        });
      });
    });

    const summary = {
      totalDeclarations: data.length,
      submitted: data.filter(d => d.status === 'SUBMITTED').length,
      pending: data.filter(d => d.status === 'PENDING').length,
      overdue: data.filter(d => d.status === 'OVERDUE').length,
      complianceRate: (data.filter(d => d.status === 'SUBMITTED').length / data.length) * 100,
    };

    return { data, summary };
  }

  private generateOperationalData(
    definition: ReportDefinition,
    period: { start: string; end: string },
  ): { data: any[]; summary: Record<string, any> } {
    const days = this.getDaysInPeriod(period.start, period.end);
    const data = days.slice(0, 30).map((day, i) => ({
      period: day,
      documentsProcessed: 50 + Math.floor(Math.random() * 100),
      averageProcessingTime: 2 + Math.random() * 3,
      errorRate: Math.random() * 5,
      automationRate: 75 + Math.random() * 20,
    }));

    const summary = {
      totalDocuments: data.reduce((sum, r) => sum + r.documentsProcessed, 0),
      avgProcessingTime: data.reduce((sum, r) => sum + r.averageProcessingTime, 0) / data.length,
      avgErrorRate: data.reduce((sum, r) => sum + r.errorRate, 0) / data.length,
      avgAutomation: data.reduce((sum, r) => sum + r.automationRate, 0) / data.length,
    };

    return { data, summary };
  }

  private generateCustomData(
    definition: ReportDefinition,
    period: { start: string; end: string },
  ): { data: any[]; summary: Record<string, any> } {
    // Generate data based on field definitions
    const data: any[] = [];
    const months = this.getMonthsInPeriod(period.start, period.end);

    months.forEach(month => {
      const row: any = { period: month };
      definition.fields.forEach(field => {
        switch (field.type) {
          case 'number':
            row[field.name] = Math.floor(Math.random() * 1000);
            break;
          case 'currency':
            row[field.name] = Math.floor(Math.random() * 100000);
            break;
          case 'percentage':
            row[field.name] = Math.random() * 100;
            break;
          case 'date':
            row[field.name] = month;
            break;
          default:
            row[field.name] = `Value-${Math.floor(Math.random() * 100)}`;
        }
      });
      data.push(row);
    });

    return { data, summary: { recordCount: data.length } };
  }

  private generateChartData(chart: ChartConfig, data: any[]): any[] {
    return data.map(row => ({
      x: row[chart.xAxis],
      ...chart.yAxis.reduce((acc, y) => ({ ...acc, [y]: row[y] }), {}),
    }));
  }

  private async exportReport(
    report: GeneratedReport,
    format: ReportFormat,
  ): Promise<{ url: string; size: number }> {
    // Simulate export generation
    const baseSize = JSON.stringify(report.data).length;
    let url = '';
    let size = 0;

    switch (format) {
      case 'pdf':
        url = `/exports/reports/${report.id}.pdf`;
        size = baseSize * 2; // PDFs are typically larger
        break;
      case 'excel':
        url = `/exports/reports/${report.id}.xlsx`;
        size = baseSize * 1.5;
        break;
      case 'csv':
        url = `/exports/reports/${report.id}.csv`;
        size = baseSize * 0.8;
        break;
      case 'html':
        url = `/exports/reports/${report.id}.html`;
        size = baseSize * 3;
        break;
    }

    return { url, size };
  }

  async getReport(reportId: string): Promise<GeneratedReport | null> {
    return this.reports.get(reportId) || null;
  }

  async getReportHistory(
    definitionId: string,
    limit: number = 10,
  ): Promise<GeneratedReport[]> {
    return Array.from(this.reports.values())
      .filter(r => r.definitionId === definitionId)
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
      .slice(0, limit);
  }

  // =================== SCHEDULING ===================

  private calculateNextRun(schedule: ReportSchedule): Date {
    const now = new Date();
    const next = new Date();
    next.setHours(schedule.hour, schedule.minute, 0, 0);

    switch (schedule.frequency) {
      case 'daily':
        if (next <= now) next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + ((7 + (schedule.dayOfWeek || 1) - next.getDay()) % 7 || 7));
        break;
      case 'monthly':
        next.setDate(schedule.dayOfMonth || 1);
        if (next <= now) next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        next.setMonth((currentQuarter + 1) * 3);
        next.setDate(schedule.dayOfMonth || 1);
        break;
      case 'yearly':
        next.setMonth(0);
        next.setDate(schedule.dayOfMonth || 1);
        if (next <= now) next.setFullYear(next.getFullYear() + 1);
        break;
    }

    return next;
  }

  async getScheduledReports(tenantId: string): Promise<ReportDefinition[]> {
    return Array.from(this.definitions.values())
      .filter(d => d.tenantId === tenantId && d.schedule?.enabled)
      .sort((a, b) => {
        const nextA = a.schedule?.nextRun?.getTime() || 0;
        const nextB = b.schedule?.nextRun?.getTime() || 0;
        return nextA - nextB;
      });
  }

  async runScheduledReports(): Promise<{ success: number; failed: number }> {
    const now = new Date();
    let success = 0;
    let failed = 0;

    for (const definition of this.definitions.values()) {
      if (definition.schedule?.enabled && definition.schedule.nextRun && definition.schedule.nextRun <= now) {
        try {
          const period = this.getDefaultPeriod(definition.schedule.frequency);
          for (const format of definition.schedule.formats) {
            await this.generateReport(definition.id, 'system', period, format);
          }
          success++;
        } catch {
          failed++;
        }
      }
    }

    this.logger.log(`Scheduled reports run: ${success} success, ${failed} failed`);
    return { success, failed };
  }

  private getDefaultPeriod(frequency: ScheduleFrequency): { start: string; end: string } {
    const now = new Date();
    let start: Date;
    let end: Date = new Date(now);

    switch (frequency) {
      case 'daily':
        start = new Date(now);
        start.setDate(start.getDate() - 1);
        break;
      case 'weekly':
        start = new Date(now);
        start.setDate(start.getDate() - 7);
        break;
      case 'monthly':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'quarterly':
        start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'yearly':
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  }

  // =================== DASHBOARD WIDGETS ===================

  async createWidget(
    name: string,
    type: WidgetType,
    config: WidgetConfig,
    position: { x: number; y: number; w: number; h: number },
    tenantId: string,
    createdBy: string,
    reportDefinitionId?: string,
    refreshInterval?: number,
  ): Promise<DashboardWidget> {
    const widget: DashboardWidget = {
      id: this.generateId('widget', ++this.widgetIdCounter),
      name,
      type,
      reportDefinitionId,
      config,
      position,
      refreshInterval,
      tenantId,
      createdBy,
    };

    this.widgets.set(widget.id, widget);
    this.logger.log(`Created dashboard widget: ${name}`);
    return widget;
  }

  async getWidget(widgetId: string): Promise<DashboardWidget | null> {
    return this.widgets.get(widgetId) || null;
  }

  async getWidgets(tenantId: string): Promise<DashboardWidget[]> {
    return Array.from(this.widgets.values())
      .filter(w => w.tenantId === tenantId);
  }

  async updateWidget(
    widgetId: string,
    updates: Partial<Omit<DashboardWidget, 'id' | 'tenantId' | 'createdBy'>>,
  ): Promise<DashboardWidget | null> {
    const widget = this.widgets.get(widgetId);
    if (!widget) return null;

    const updated = { ...widget, ...updates };
    this.widgets.set(widgetId, updated);
    return updated;
  }

  async deleteWidget(widgetId: string): Promise<boolean> {
    return this.widgets.delete(widgetId);
  }

  async getWidgetData(widgetId: string): Promise<WidgetData | null> {
    const widget = await this.getWidget(widgetId);
    if (!widget) return null;

    // Generate widget data based on config
    const data = await this.fetchWidgetData(widget);
    return data;
  }

  private async fetchWidgetData(widget: DashboardWidget): Promise<WidgetData> {
    const now = new Date();
    const baseData: WidgetData = {
      widgetId: widget.id,
      timestamp: now,
    };

    switch (widget.type) {
      case 'kpi':
        return {
          ...baseData,
          value: Math.floor(Math.random() * 100000),
          trend: Math.random() > 0.5 ? 'up' : 'down',
          percentChange: Math.random() * 20 - 10,
        };

      case 'gauge':
        return {
          ...baseData,
          value: Math.floor(Math.random() * 100),
          trend: 'stable',
        };

      case 'chart':
      case 'trend':
        const chartData = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          chartData.push({
            date: date.toISOString().split('T')[0],
            value: Math.floor(Math.random() * 10000),
          });
        }
        return {
          ...baseData,
          chartData,
          trend: chartData[6].value > chartData[0].value ? 'up' : 'down',
        };

      case 'table':
        return {
          ...baseData,
          data: [
            { name: 'Item 1', value: Math.floor(Math.random() * 1000), status: 'active' },
            { name: 'Item 2', value: Math.floor(Math.random() * 1000), status: 'pending' },
            { name: 'Item 3', value: Math.floor(Math.random() * 1000), status: 'completed' },
          ],
        };

      case 'summary':
        return {
          ...baseData,
          data: [
            { metric: 'Total Revenue', value: Math.floor(Math.random() * 100000) },
            { metric: 'Total Expenses', value: Math.floor(Math.random() * 50000) },
            { metric: 'Profit', value: Math.floor(Math.random() * 50000) },
          ],
        };

      default:
        return baseData;
    }
  }

  // =================== STATISTICS ===================

  async getReportStats(tenantId: string): Promise<ReportStats> {
    const definitions = Array.from(this.definitions.values())
      .filter(d => d.tenantId === tenantId);
    const reports = Array.from(this.reports.values())
      .filter(r => r.tenantId === tenantId);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Count by type
    const typeCounts = new Map<ReportType, number>();
    definitions.forEach(d => {
      typeCounts.set(d.type, (typeCounts.get(d.type) || 0) + 1);
    });

    // Count by format
    const formatCounts = new Map<ReportFormat, number>();
    reports.forEach(r => {
      formatCounts.set(r.format, (formatCounts.get(r.format) || 0) + 1);
    });

    return {
      totalReports: definitions.length,
      scheduledReports: definitions.filter(d => d.schedule?.enabled).length,
      reportsGeneratedToday: reports.filter(r => r.generatedAt >= todayStart).length,
      reportsGeneratedThisMonth: reports.filter(r => r.generatedAt >= monthStart).length,
      topReportTypes: Array.from(typeCounts.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
      exportsByFormat: Array.from(formatCounts.entries())
        .map(([format, count]) => ({ format, count }))
        .sort((a, b) => b.count - a.count),
      averageGenerationTime: 2.5, // Simulated
    };
  }

  // =================== UTILITY METHODS ===================

  private getMonthsInPeriod(startStr: string, endStr: string): string[] {
    const months: string[] = [];
    const start = new Date(startStr);
    const end = new Date(endStr);

    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    while (current <= end) {
      months.push(current.toISOString().slice(0, 7));
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  }

  private getDaysInPeriod(startStr: string, endStr: string): string[] {
    const days: string[] = [];
    const start = new Date(startStr);
    const end = new Date(endStr);

    const current = new Date(start);
    while (current <= end) {
      days.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    return days;
  }

  getReportTypes(): ReportType[] {
    return ['financial', 'hr', 'compliance', 'operational', 'tax', 'custom'];
  }

  getExportFormats(): ReportFormat[] {
    return ['pdf', 'excel', 'csv', 'json', 'html'];
  }

  getWidgetTypes(): WidgetType[] {
    return ['chart', 'kpi', 'table', 'summary', 'gauge', 'heatmap', 'trend'];
  }

  getScheduleFrequencies(): ScheduleFrequency[] {
    return ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'];
  }
}
