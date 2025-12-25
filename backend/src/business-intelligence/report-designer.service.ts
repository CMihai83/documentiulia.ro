import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type ReportType = 'tabular' | 'summary' | 'matrix' | 'chart' | 'composite';
export type OutputFormat = 'pdf' | 'excel' | 'csv' | 'html' | 'json';
export type AggregateFunction = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct';

export interface ReportDataSource {
  id: string;
  name: string;
  type: 'table' | 'query' | 'api' | 'stored_procedure';
  connection?: string;
  query?: string;
  endpoint?: string;
  parameters?: ReportParameter[];
  joins?: DataSourceJoin[];
}

export interface DataSourceJoin {
  target: string;
  type: 'inner' | 'left' | 'right' | 'full';
  leftField: string;
  rightField: string;
}

export interface ReportParameter {
  id: string;
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'daterange' | 'select' | 'multiselect' | 'boolean';
  required: boolean;
  defaultValue?: any;
  options?: { value: any; label: string }[];
  validation?: ParameterValidation;
}

export interface ParameterValidation {
  min?: number;
  max?: number;
  pattern?: string;
  customValidator?: string;
}

export interface ReportColumn {
  id: string;
  field: string;
  header: string;
  width?: number;
  alignment?: 'left' | 'center' | 'right';
  format?: ColumnFormat;
  aggregate?: AggregateFunction;
  formula?: string;
  visible?: boolean;
  sortable?: boolean;
  groupBy?: boolean;
  conditionalFormatting?: ConditionalFormat[];
}

export interface ColumnFormat {
  type: 'text' | 'number' | 'currency' | 'percent' | 'date' | 'datetime' | 'boolean' | 'custom';
  pattern?: string;
  locale?: string;
  currency?: string;
  decimals?: number;
  trueLabel?: string;
  falseLabel?: string;
}

export interface ConditionalFormat {
  condition: string;
  style: {
    backgroundColor?: string;
    color?: string;
    fontWeight?: string;
    icon?: string;
  };
}

export interface ReportGroup {
  field: string;
  order?: 'asc' | 'desc';
  showHeader?: boolean;
  showFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
  pageBreakAfter?: boolean;
}

export interface ReportSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ReportFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'between' | 'isNull' | 'isNotNull';
  value: any;
  or?: boolean;
}

export interface ReportSection {
  id: string;
  type: 'header' | 'body' | 'footer' | 'group_header' | 'group_footer';
  height?: number;
  backgroundColor?: string;
  elements: ReportElement[];
}

export interface ReportElement {
  id: string;
  type: 'text' | 'field' | 'image' | 'chart' | 'table' | 'subreport' | 'barcode' | 'qrcode' | 'shape' | 'line';
  position: { x: number; y: number; width: number; height: number };
  properties: Record<string, any>;
  style?: ElementStyle;
}

export interface ElementStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  color?: string;
  backgroundColor?: string;
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: string;
  padding?: number;
  textAlign?: string;
  verticalAlign?: string;
}

export interface ReportLayout {
  paperSize: 'A4' | 'A3' | 'Letter' | 'Legal' | 'Custom';
  orientation: 'portrait' | 'landscape';
  margins: { top: number; right: number; bottom: number; left: number };
  customWidth?: number;
  customHeight?: number;
}

export interface ReportDefinition {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: ReportType;
  category?: string;
  tags?: string[];
  dataSource: ReportDataSource;
  parameters: ReportParameter[];
  columns: ReportColumn[];
  groups?: ReportGroup[];
  sorts?: ReportSort[];
  filters?: ReportFilter[];
  layout: ReportLayout;
  sections: ReportSection[];
  styling: {
    theme?: string;
    headerStyle?: ElementStyle;
    bodyStyle?: ElementStyle;
    footerStyle?: ElementStyle;
    alternateRowColor?: string;
  };
  options: {
    showPageNumbers?: boolean;
    showDateTime?: boolean;
    showTotals?: boolean;
    repeatHeaderOnPages?: boolean;
    allowExport?: OutputFormat[];
    maxRows?: number;
  };
  version: number;
  isPublished: boolean;
  publishedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportExecution {
  id: string;
  reportId: string;
  tenantId: string;
  parameters: Record<string, any>;
  format: OutputFormat;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  rowCount?: number;
  fileSize?: number;
  filePath?: string;
  error?: string;
  executedBy: string;
  createdAt: Date;
}

export interface ReportSnapshot {
  id: string;
  reportId: string;
  tenantId: string;
  name: string;
  parameters: Record<string, any>;
  data: any;
  generatedAt: Date;
  expiresAt?: Date;
  createdBy: string;
}

@Injectable()
export class ReportDesignerService {
  private reports: Map<string, ReportDefinition> = new Map();
  private executions: Map<string, ReportExecution> = new Map();
  private snapshots: Map<string, ReportSnapshot> = new Map();

  constructor(private eventEmitter: EventEmitter2) {}

  // =================== REPORT DEFINITIONS ===================

  async createReport(data: {
    tenantId: string;
    name: string;
    description?: string;
    type: ReportType;
    category?: string;
    tags?: string[];
    dataSource: ReportDataSource;
    columns: ReportColumn[];
    layout?: Partial<ReportLayout>;
    createdBy: string;
  }): Promise<ReportDefinition> {
    const id = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const report: ReportDefinition = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      type: data.type,
      category: data.category,
      tags: data.tags,
      dataSource: data.dataSource,
      parameters: data.dataSource.parameters || [],
      columns: data.columns,
      groups: [],
      sorts: [],
      filters: [],
      layout: {
        paperSize: 'A4',
        orientation: 'portrait',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        ...data.layout,
      },
      sections: this.createDefaultSections(data.type),
      styling: {
        alternateRowColor: '#f9fafb',
      },
      options: {
        showPageNumbers: true,
        showDateTime: true,
        showTotals: true,
        repeatHeaderOnPages: true,
        allowExport: ['pdf', 'excel', 'csv'],
      },
      version: 1,
      isPublished: false,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.reports.set(id, report);
    this.eventEmitter.emit('report.created', { report });
    return report;
  }

  private createDefaultSections(type: ReportType): ReportSection[] {
    return [
      {
        id: 'header',
        type: 'header',
        height: 60,
        elements: [
          {
            id: 'title',
            type: 'text',
            position: { x: 0, y: 10, width: 300, height: 30 },
            properties: { text: '{{reportName}}', fontSize: 18, fontWeight: 'bold' },
          },
          {
            id: 'date',
            type: 'text',
            position: { x: 400, y: 10, width: 150, height: 20 },
            properties: { text: '{{generatedAt}}', fontSize: 10 },
          },
        ],
      },
      {
        id: 'body',
        type: 'body',
        elements: type === 'tabular' ? [] : [],
      },
      {
        id: 'footer',
        type: 'footer',
        height: 40,
        elements: [
          {
            id: 'pageNumber',
            type: 'text',
            position: { x: 250, y: 10, width: 100, height: 20 },
            properties: { text: 'Page {{pageNumber}} of {{totalPages}}', fontSize: 10, textAlign: 'center' },
          },
        ],
      },
    ];
  }

  async getReport(id: string): Promise<ReportDefinition | undefined> {
    return this.reports.get(id);
  }

  async getReports(tenantId: string, options?: {
    type?: ReportType;
    category?: string;
    tag?: string;
    published?: boolean;
    search?: string;
  }): Promise<ReportDefinition[]> {
    let reports = Array.from(this.reports.values()).filter(r => r.tenantId === tenantId);

    if (options?.type) {
      reports = reports.filter(r => r.type === options.type);
    }
    if (options?.category) {
      reports = reports.filter(r => r.category === options.category);
    }
    if (options?.tag) {
      reports = reports.filter(r => r.tags?.includes(options.tag!));
    }
    if (options?.published !== undefined) {
      reports = reports.filter(r => r.isPublished === options.published);
    }
    if (options?.search) {
      const search = options.search.toLowerCase();
      reports = reports.filter(r =>
        r.name.toLowerCase().includes(search) ||
        r.description?.toLowerCase().includes(search)
      );
    }

    return reports.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async updateReport(id: string, updates: Partial<{
    name: string;
    description: string;
    type: ReportType;
    category: string;
    tags: string[];
    dataSource: ReportDataSource;
    parameters: ReportParameter[];
    columns: ReportColumn[];
    groups: ReportGroup[];
    sorts: ReportSort[];
    filters: ReportFilter[];
    layout: ReportLayout;
    sections: ReportSection[];
    styling: ReportDefinition['styling'];
    options: ReportDefinition['options'];
  }>): Promise<ReportDefinition | undefined> {
    const report = this.reports.get(id);
    if (!report) return undefined;

    Object.assign(report, updates, {
      updatedAt: new Date(),
      version: report.version + 1,
    });

    this.eventEmitter.emit('report.updated', { report });
    return report;
  }

  async deleteReport(id: string): Promise<void> {
    this.reports.delete(id);
    this.eventEmitter.emit('report.deleted', { reportId: id });
  }

  async duplicateReport(id: string, newName: string, userId: string): Promise<ReportDefinition | undefined> {
    const original = this.reports.get(id);
    if (!original) return undefined;

    return this.createReport({
      tenantId: original.tenantId,
      name: newName,
      description: original.description,
      type: original.type,
      category: original.category,
      tags: original.tags,
      dataSource: { ...original.dataSource },
      columns: original.columns.map(c => ({ ...c })),
      layout: { ...original.layout },
      createdBy: userId,
    });
  }

  async publishReport(id: string): Promise<ReportDefinition | undefined> {
    const report = this.reports.get(id);
    if (!report) return undefined;

    report.isPublished = true;
    report.publishedAt = new Date();
    report.updatedAt = new Date();

    this.eventEmitter.emit('report.published', { report });
    return report;
  }

  async unpublishReport(id: string): Promise<ReportDefinition | undefined> {
    const report = this.reports.get(id);
    if (!report) return undefined;

    report.isPublished = false;
    report.updatedAt = new Date();

    return report;
  }

  // =================== COLUMNS ===================

  async addColumn(reportId: string, column: ReportColumn): Promise<ReportDefinition | undefined> {
    const report = this.reports.get(reportId);
    if (!report) return undefined;

    report.columns.push(column);
    report.updatedAt = new Date();
    report.version++;

    return report;
  }

  async updateColumn(reportId: string, columnId: string, updates: Partial<ReportColumn>): Promise<ReportDefinition | undefined> {
    const report = this.reports.get(reportId);
    if (!report) return undefined;

    const columnIdx = report.columns.findIndex(c => c.id === columnId);
    if (columnIdx < 0) return undefined;

    Object.assign(report.columns[columnIdx], updates);
    report.updatedAt = new Date();
    report.version++;

    return report;
  }

  async removeColumn(reportId: string, columnId: string): Promise<ReportDefinition | undefined> {
    const report = this.reports.get(reportId);
    if (!report) return undefined;

    report.columns = report.columns.filter(c => c.id !== columnId);
    report.updatedAt = new Date();
    report.version++;

    return report;
  }

  async reorderColumns(reportId: string, columnIds: string[]): Promise<ReportDefinition | undefined> {
    const report = this.reports.get(reportId);
    if (!report) return undefined;

    const columnMap = new Map(report.columns.map(c => [c.id, c]));
    report.columns = columnIds.map(id => columnMap.get(id)!).filter(Boolean);
    report.updatedAt = new Date();
    report.version++;

    return report;
  }

  // =================== SECTIONS & ELEMENTS ===================

  async updateSection(reportId: string, sectionId: string, updates: Partial<ReportSection>): Promise<ReportDefinition | undefined> {
    const report = this.reports.get(reportId);
    if (!report) return undefined;

    const sectionIdx = report.sections.findIndex(s => s.id === sectionId);
    if (sectionIdx < 0) return undefined;

    Object.assign(report.sections[sectionIdx], updates);
    report.updatedAt = new Date();
    report.version++;

    return report;
  }

  async addElement(reportId: string, sectionId: string, element: ReportElement): Promise<ReportDefinition | undefined> {
    const report = this.reports.get(reportId);
    if (!report) return undefined;

    const section = report.sections.find(s => s.id === sectionId);
    if (!section) return undefined;

    section.elements.push(element);
    report.updatedAt = new Date();
    report.version++;

    return report;
  }

  async updateElement(reportId: string, sectionId: string, elementId: string, updates: Partial<ReportElement>): Promise<ReportDefinition | undefined> {
    const report = this.reports.get(reportId);
    if (!report) return undefined;

    const section = report.sections.find(s => s.id === sectionId);
    if (!section) return undefined;

    const elementIdx = section.elements.findIndex(e => e.id === elementId);
    if (elementIdx < 0) return undefined;

    Object.assign(section.elements[elementIdx], updates);
    report.updatedAt = new Date();
    report.version++;

    return report;
  }

  async removeElement(reportId: string, sectionId: string, elementId: string): Promise<ReportDefinition | undefined> {
    const report = this.reports.get(reportId);
    if (!report) return undefined;

    const section = report.sections.find(s => s.id === sectionId);
    if (!section) return undefined;

    section.elements = section.elements.filter(e => e.id !== elementId);
    report.updatedAt = new Date();
    report.version++;

    return report;
  }

  // =================== REPORT EXECUTION ===================

  async executeReport(data: {
    reportId: string;
    tenantId: string;
    parameters: Record<string, any>;
    format: OutputFormat;
    executedBy: string;
  }): Promise<ReportExecution> {
    const report = this.reports.get(data.reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    const id = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const execution: ReportExecution = {
      id,
      reportId: data.reportId,
      tenantId: data.tenantId,
      parameters: data.parameters,
      format: data.format,
      status: 'pending',
      progress: 0,
      executedBy: data.executedBy,
      createdAt: new Date(),
    };

    this.executions.set(id, execution);

    // Start execution asynchronously
    this.runExecution(execution, report);

    this.eventEmitter.emit('report.execution.started', { execution });
    return execution;
  }

  private async runExecution(execution: ReportExecution, report: ReportDefinition): Promise<void> {
    try {
      execution.status = 'running';
      execution.startedAt = new Date();
      execution.progress = 10;

      // Validate parameters
      this.validateParameters(report.parameters, execution.parameters);
      execution.progress = 20;

      // Fetch data
      const data = await this.fetchReportData(report, execution.parameters);
      execution.progress = 50;
      execution.rowCount = data.length;

      // Apply transformations
      const transformedData = this.applyTransformations(data, report);
      execution.progress = 70;

      // Generate output
      const output = await this.generateOutput(report, transformedData, execution.format);
      execution.progress = 90;

      // Save output
      execution.filePath = `/reports/${execution.id}.${execution.format}`;
      execution.fileSize = output.length;
      execution.progress = 100;

      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();

      this.eventEmitter.emit('report.execution.completed', { execution });
    } catch (error: any) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.completedAt = new Date();

      this.eventEmitter.emit('report.execution.failed', { execution, error });
    }
  }

  private validateParameters(definitions: ReportParameter[], values: Record<string, any>): void {
    for (const param of definitions) {
      if (param.required && values[param.name] === undefined) {
        throw new Error(`Required parameter '${param.name}' is missing`);
      }

      const value = values[param.name];
      if (value !== undefined && param.validation) {
        const { min, max, pattern } = param.validation;
        if (min !== undefined && value < min) {
          throw new Error(`Parameter '${param.name}' must be at least ${min}`);
        }
        if (max !== undefined && value > max) {
          throw new Error(`Parameter '${param.name}' must be at most ${max}`);
        }
        if (pattern && !new RegExp(pattern).test(value)) {
          throw new Error(`Parameter '${param.name}' does not match required pattern`);
        }
      }
    }
  }

  private async fetchReportData(_report: ReportDefinition, _parameters: Record<string, any>): Promise<any[]> {
    // In production, this would execute actual queries
    // Simulate data fetching
    return Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      date: new Date(Date.now() - i * 86400000),
      description: `Record ${i + 1}`,
      amount: Math.floor(Math.random() * 10000) / 100,
      status: ['active', 'pending', 'completed'][i % 3],
    }));
  }

  private applyTransformations(data: any[], report: ReportDefinition): any[] {
    let result = [...data];

    // Apply filters
    if (report.filters?.length) {
      result = result.filter(row => {
        return report.filters!.every(filter => {
          const value = row[filter.field];
          switch (filter.operator) {
            case 'eq': return value === filter.value;
            case 'neq': return value !== filter.value;
            case 'gt': return value > filter.value;
            case 'gte': return value >= filter.value;
            case 'lt': return value < filter.value;
            case 'lte': return value <= filter.value;
            case 'contains': return String(value).includes(filter.value);
            case 'isNull': return value === null || value === undefined;
            case 'isNotNull': return value !== null && value !== undefined;
            default: return true;
          }
        });
      });
    }

    // Apply sorting
    if (report.sorts?.length) {
      result.sort((a, b) => {
        for (const sort of report.sorts!) {
          const aVal = a[sort.field];
          const bVal = b[sort.field];
          if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }

  private async generateOutput(report: ReportDefinition, data: any[], format: OutputFormat): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify({ report: report.name, data, generatedAt: new Date() });

      case 'csv':
        return this.generateCsv(report, data);

      case 'html':
        return this.generateHtml(report, data);

      case 'pdf':
        // In production, use a PDF library
        return `PDF output for ${report.name} with ${data.length} rows`;

      case 'excel':
        // In production, use an Excel library
        return `Excel output for ${report.name} with ${data.length} rows`;

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private generateCsv(report: ReportDefinition, data: any[]): string {
    const visibleColumns = report.columns.filter(c => c.visible !== false);
    const headers = visibleColumns.map(c => `"${c.header}"`).join(',');
    const rows = data.map(row =>
      visibleColumns.map(c => {
        const value = row[c.field];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      }).join(',')
    );
    return [headers, ...rows].join('\n');
  }

  private generateHtml(report: ReportDefinition, data: any[]): string {
    const visibleColumns = report.columns.filter(c => c.visible !== false);
    const headerRow = visibleColumns.map(c => `<th>${c.header}</th>`).join('');
    const bodyRows = data.map(row =>
      `<tr>${visibleColumns.map(c => `<td>${row[c.field] ?? ''}</td>`).join('')}</tr>`
    ).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <title>${report.name}</title>
  <style>
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f4f4f4; }
    tr:nth-child(even) { background-color: ${report.styling.alternateRowColor || '#f9f9f9'}; }
  </style>
</head>
<body>
  <h1>${report.name}</h1>
  <p>Generated: ${new Date().toISOString()}</p>
  <table>
    <thead><tr>${headerRow}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`;
  }

  async getExecution(id: string): Promise<ReportExecution | undefined> {
    return this.executions.get(id);
  }

  async getExecutions(tenantId: string, reportId?: string): Promise<ReportExecution[]> {
    let executions = Array.from(this.executions.values()).filter(e => e.tenantId === tenantId);

    if (reportId) {
      executions = executions.filter(e => e.reportId === reportId);
    }

    return executions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async cancelExecution(id: string): Promise<ReportExecution | undefined> {
    const execution = this.executions.get(id);
    if (!execution || execution.status !== 'running') return undefined;

    execution.status = 'cancelled';
    execution.completedAt = new Date();

    return execution;
  }

  // =================== SNAPSHOTS ===================

  async createSnapshot(data: {
    reportId: string;
    tenantId: string;
    name: string;
    parameters: Record<string, any>;
    expiresAt?: Date;
    createdBy: string;
  }): Promise<ReportSnapshot> {
    const report = this.reports.get(data.reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    const id = `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Fetch and store data
    const reportData = await this.fetchReportData(report, data.parameters);
    const transformedData = this.applyTransformations(reportData, report);

    const snapshot: ReportSnapshot = {
      id,
      reportId: data.reportId,
      tenantId: data.tenantId,
      name: data.name,
      parameters: data.parameters,
      data: transformedData,
      generatedAt: new Date(),
      expiresAt: data.expiresAt,
      createdBy: data.createdBy,
    };

    this.snapshots.set(id, snapshot);
    this.eventEmitter.emit('report.snapshot.created', { snapshot });
    return snapshot;
  }

  async getSnapshot(id: string): Promise<ReportSnapshot | undefined> {
    const snapshot = this.snapshots.get(id);
    if (snapshot?.expiresAt && snapshot.expiresAt < new Date()) {
      this.snapshots.delete(id);
      return undefined;
    }
    return snapshot;
  }

  async getSnapshots(tenantId: string, reportId?: string): Promise<ReportSnapshot[]> {
    let snapshots = Array.from(this.snapshots.values()).filter(s => s.tenantId === tenantId);

    // Remove expired
    const now = new Date();
    snapshots = snapshots.filter(s => !s.expiresAt || s.expiresAt > now);

    if (reportId) {
      snapshots = snapshots.filter(s => s.reportId === reportId);
    }

    return snapshots.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
  }

  async deleteSnapshot(id: string): Promise<void> {
    this.snapshots.delete(id);
  }

  // =================== PREVIEW ===================

  async previewReport(reportId: string, parameters: Record<string, any>, limit: number = 10): Promise<{
    columns: ReportColumn[];
    data: any[];
    totalRows: number;
  }> {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    const data = await this.fetchReportData(report, parameters);
    const transformedData = this.applyTransformations(data, report);

    return {
      columns: report.columns.filter(c => c.visible !== false),
      data: transformedData.slice(0, limit),
      totalRows: transformedData.length,
    };
  }

  // =================== STATS ===================

  async getStats(tenantId: string): Promise<{
    totalReports: number;
    publishedReports: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
    recentExecutions: ReportExecution[];
    executionsByFormat: Record<string, number>;
  }> {
    const reports = Array.from(this.reports.values()).filter(r => r.tenantId === tenantId);
    const executions = Array.from(this.executions.values()).filter(e => e.tenantId === tenantId);

    const byType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const executionsByFormat: Record<string, number> = {};

    reports.forEach(r => {
      byType[r.type] = (byType[r.type] || 0) + 1;
      const cat = r.category || 'uncategorized';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });

    executions.forEach(e => {
      executionsByFormat[e.format] = (executionsByFormat[e.format] || 0) + 1;
    });

    return {
      totalReports: reports.length,
      publishedReports: reports.filter(r => r.isPublished).length,
      byType,
      byCategory,
      recentExecutions: executions
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10),
      executionsByFormat,
    };
  }
}
