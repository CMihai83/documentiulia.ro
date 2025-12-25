import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Types
export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json' | 'html';
export type ReportStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ReportCategory = 'financial' | 'hr' | 'fleet' | 'operations' | 'compliance' | 'custom';
export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'once';

// Interfaces
export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  dataSource: string;
  columns: ReportColumn[];
  filters?: ReportFilter[];
  groupBy?: string[];
  sortBy?: ReportSort[];
  calculations?: ReportCalculation[];
  styling?: ReportStyling;
  isSystem: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportColumn {
  field: string;
  header: string;
  type: 'string' | 'number' | 'date' | 'currency' | 'percentage' | 'boolean';
  width?: number;
  format?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

export interface ReportFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in' | 'between';
  value: any;
  label?: string;
}

export interface ReportSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ReportCalculation {
  name: string;
  formula: string;
  format?: string;
}

export interface ReportStyling {
  headerColor?: string;
  alternateRowColor?: string;
  fontSize?: number;
  fontFamily?: string;
  logo?: string;
  pageSize?: 'A4' | 'A3' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  margins?: { top: number; right: number; bottom: number; left: number };
}

export interface Report {
  id: string;
  tenantId: string;
  templateId: string;
  name: string;
  format: ReportFormat;
  status: ReportStatus;
  parameters?: Record<string, any>;
  generatedAt?: Date;
  completedAt?: Date;
  fileSize?: number;
  filePath?: string;
  error?: string;
  createdBy: string;
  createdAt: Date;
}

export interface ScheduledReport {
  id: string;
  tenantId: string;
  templateId: string;
  name: string;
  format: ReportFormat;
  frequency: ScheduleFrequency;
  parameters?: Record<string, any>;
  recipients: string[];
  nextRunAt: Date;
  lastRunAt?: Date;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface GeneratedReport {
  reportId: string;
  content: string | Buffer;
  format: ReportFormat;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface ReportData {
  columns: ReportColumn[];
  rows: any[];
  totals?: Record<string, number>;
  metadata?: {
    generatedAt: Date;
    rowCount: number;
    filters?: Record<string, any>;
  };
}

@Injectable()
export class ReportGeneratorService {
  private readonly logger = new Logger(ReportGeneratorService.name);

  // Storage maps
  private templates: Map<string, ReportTemplate> = new Map();
  private reports: Map<string, Report> = new Map();
  private scheduledReports: Map<string, ScheduledReport> = new Map();
  private generatedContent: Map<string, GeneratedReport> = new Map();

  // Counters
  private templateIdCounter = 0;
  private reportIdCounter = 0;
  private scheduleIdCounter = 0;

  constructor(private configService: ConfigService) {
    this.initializeSystemTemplates();
  }

  private generateId(prefix: string): string {
    let counter = 0;
    switch (prefix) {
      case 'tpl': counter = ++this.templateIdCounter; break;
      case 'rpt': counter = ++this.reportIdCounter; break;
      case 'sch': counter = ++this.scheduleIdCounter; break;
      default: counter = Date.now();
    }
    return `${prefix}-${counter}-${Date.now()}`;
  }

  // =================== SYSTEM TEMPLATES ===================

  private initializeSystemTemplates(): void {
    // Financial Reports
    const invoiceSummary: ReportTemplate = {
      id: 'tpl-invoice-summary',
      name: 'Invoice Summary Report',
      description: 'Summary of all invoices with totals',
      category: 'financial',
      dataSource: 'invoices',
      columns: [
        { field: 'invoiceNumber', header: 'Invoice #', type: 'string' },
        { field: 'customerName', header: 'Customer', type: 'string' },
        { field: 'issueDate', header: 'Date', type: 'date', format: 'DD/MM/YYYY' },
        { field: 'dueDate', header: 'Due Date', type: 'date', format: 'DD/MM/YYYY' },
        { field: 'subtotal', header: 'Subtotal', type: 'currency', aggregation: 'sum' },
        { field: 'vatAmount', header: 'VAT', type: 'currency', aggregation: 'sum' },
        { field: 'total', header: 'Total', type: 'currency', aggregation: 'sum' },
        { field: 'status', header: 'Status', type: 'string' },
      ],
      sortBy: [{ field: 'issueDate', direction: 'desc' }],
      isSystem: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const vatReport: ReportTemplate = {
      id: 'tpl-vat-report',
      name: 'VAT Report',
      description: 'VAT collected and owed summary',
      category: 'financial',
      dataSource: 'vat_entries',
      columns: [
        { field: 'period', header: 'Period', type: 'string' },
        { field: 'vatCollected', header: 'VAT Collected', type: 'currency', aggregation: 'sum' },
        { field: 'vatPaid', header: 'VAT Paid', type: 'currency', aggregation: 'sum' },
        { field: 'netVat', header: 'Net VAT', type: 'currency', aggregation: 'sum' },
        { field: 'status', header: 'Status', type: 'string' },
      ],
      groupBy: ['period'],
      isSystem: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // HR Reports
    const employeeRoster: ReportTemplate = {
      id: 'tpl-employee-roster',
      name: 'Employee Roster',
      description: 'Complete list of employees',
      category: 'hr',
      dataSource: 'employees',
      columns: [
        { field: 'employeeId', header: 'ID', type: 'string' },
        { field: 'firstName', header: 'First Name', type: 'string' },
        { field: 'lastName', header: 'Last Name', type: 'string' },
        { field: 'email', header: 'Email', type: 'string' },
        { field: 'department', header: 'Department', type: 'string' },
        { field: 'position', header: 'Position', type: 'string' },
        { field: 'hireDate', header: 'Hire Date', type: 'date', format: 'DD/MM/YYYY' },
        { field: 'status', header: 'Status', type: 'string' },
      ],
      sortBy: [{ field: 'lastName', direction: 'asc' }],
      isSystem: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const payrollSummary: ReportTemplate = {
      id: 'tpl-payroll-summary',
      name: 'Payroll Summary',
      description: 'Monthly payroll summary',
      category: 'hr',
      dataSource: 'payroll',
      columns: [
        { field: 'period', header: 'Period', type: 'string' },
        { field: 'employeeCount', header: 'Employees', type: 'number', aggregation: 'sum' },
        { field: 'grossSalary', header: 'Gross Salary', type: 'currency', aggregation: 'sum' },
        { field: 'taxes', header: 'Taxes', type: 'currency', aggregation: 'sum' },
        { field: 'contributions', header: 'Contributions', type: 'currency', aggregation: 'sum' },
        { field: 'netSalary', header: 'Net Salary', type: 'currency', aggregation: 'sum' },
      ],
      groupBy: ['period'],
      isSystem: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Fleet Reports
    const fleetStatus: ReportTemplate = {
      id: 'tpl-fleet-status',
      name: 'Fleet Status Report',
      description: 'Current status of all vehicles',
      category: 'fleet',
      dataSource: 'vehicles',
      columns: [
        { field: 'vehicleId', header: 'Vehicle ID', type: 'string' },
        { field: 'licensePlate', header: 'License Plate', type: 'string' },
        { field: 'make', header: 'Make', type: 'string' },
        { field: 'model', header: 'Model', type: 'string' },
        { field: 'status', header: 'Status', type: 'string' },
        { field: 'mileage', header: 'Mileage', type: 'number', format: '0,0' },
        { field: 'lastService', header: 'Last Service', type: 'date', format: 'DD/MM/YYYY' },
        { field: 'nextService', header: 'Next Service', type: 'date', format: 'DD/MM/YYYY' },
      ],
      sortBy: [{ field: 'licensePlate', direction: 'asc' }],
      isSystem: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const deliveryPerformance: ReportTemplate = {
      id: 'tpl-delivery-performance',
      name: 'Delivery Performance Report',
      description: 'Delivery metrics and KPIs',
      category: 'fleet',
      dataSource: 'deliveries',
      columns: [
        { field: 'period', header: 'Period', type: 'string' },
        { field: 'totalDeliveries', header: 'Total', type: 'number', aggregation: 'sum' },
        { field: 'onTime', header: 'On Time', type: 'number', aggregation: 'sum' },
        { field: 'late', header: 'Late', type: 'number', aggregation: 'sum' },
        { field: 'onTimeRate', header: 'On-Time %', type: 'percentage' },
        { field: 'avgDeliveryTime', header: 'Avg Time (min)', type: 'number', aggregation: 'avg' },
      ],
      groupBy: ['period'],
      isSystem: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Compliance Reports
    const anafCompliance: ReportTemplate = {
      id: 'tpl-anaf-compliance',
      name: 'ANAF Compliance Report',
      description: 'Summary of ANAF declarations and compliance status',
      category: 'compliance',
      dataSource: 'anaf_declarations',
      columns: [
        { field: 'declarationType', header: 'Type', type: 'string' },
        { field: 'period', header: 'Period', type: 'string' },
        { field: 'submissionDate', header: 'Submitted', type: 'date', format: 'DD/MM/YYYY' },
        { field: 'dueDate', header: 'Due Date', type: 'date', format: 'DD/MM/YYYY' },
        { field: 'status', header: 'Status', type: 'string' },
        { field: 'amount', header: 'Amount', type: 'currency' },
      ],
      sortBy: [{ field: 'dueDate', direction: 'desc' }],
      isSystem: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(invoiceSummary.id, invoiceSummary);
    this.templates.set(vatReport.id, vatReport);
    this.templates.set(employeeRoster.id, employeeRoster);
    this.templates.set(payrollSummary.id, payrollSummary);
    this.templates.set(fleetStatus.id, fleetStatus);
    this.templates.set(deliveryPerformance.id, deliveryPerformance);
    this.templates.set(anafCompliance.id, anafCompliance);

    this.logger.log(`Initialized ${this.templates.size} system report templates`);
  }

  // =================== TEMPLATES ===================

  async createTemplate(
    name: string,
    description: string,
    category: ReportCategory,
    dataSource: string,
    columns: ReportColumn[],
    createdBy: string,
    options?: {
      filters?: ReportFilter[];
      groupBy?: string[];
      sortBy?: ReportSort[];
      calculations?: ReportCalculation[];
      styling?: ReportStyling;
    },
  ): Promise<ReportTemplate> {
    const template: ReportTemplate = {
      id: this.generateId('tpl'),
      name,
      description,
      category,
      dataSource,
      columns,
      filters: options?.filters,
      groupBy: options?.groupBy,
      sortBy: options?.sortBy,
      calculations: options?.calculations,
      styling: options?.styling,
      isSystem: false,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(template.id, template);
    this.logger.log(`Created report template: ${name} (${template.id})`);
    return template;
  }

  async getTemplate(templateId: string): Promise<ReportTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  async getTemplates(category?: ReportCategory, includeSystem = true): Promise<ReportTemplate[]> {
    let templates = Array.from(this.templates.values());

    if (category) {
      templates = templates.filter(t => t.category === category);
    }
    if (!includeSystem) {
      templates = templates.filter(t => !t.isSystem);
    }

    return templates.sort((a, b) => a.name.localeCompare(b.name));
  }

  async updateTemplate(
    templateId: string,
    updates: Partial<Omit<ReportTemplate, 'id' | 'isSystem' | 'createdAt' | 'createdBy'>>,
  ): Promise<ReportTemplate | null> {
    const template = this.templates.get(templateId);
    if (!template || template.isSystem) return null;

    const updated: ReportTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date(),
    };

    this.templates.set(templateId, updated);
    return updated;
  }

  async deleteTemplate(templateId: string): Promise<boolean> {
    const template = this.templates.get(templateId);
    if (!template || template.isSystem) return false;

    return this.templates.delete(templateId);
  }

  // =================== REPORT GENERATION ===================

  async generateReport(
    tenantId: string,
    templateId: string,
    format: ReportFormat,
    createdBy: string,
    parameters?: Record<string, any>,
  ): Promise<Report> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const report: Report = {
      id: this.generateId('rpt'),
      tenantId,
      templateId,
      name: `${template.name} - ${new Date().toISOString().split('T')[0]}`,
      format,
      status: 'pending',
      parameters,
      createdBy,
      createdAt: new Date(),
    };

    this.reports.set(report.id, report);

    // Simulate async generation
    this.processReport(report.id);

    return report;
  }

  private async processReport(reportId: string): Promise<void> {
    const report = this.reports.get(reportId);
    if (!report) return;

    report.status = 'processing';
    report.generatedAt = new Date();
    this.reports.set(reportId, report);

    try {
      const template = this.templates.get(report.templateId);
      if (!template) throw new Error('Template not found');

      // Generate mock data
      const data = this.generateMockData(template, report.parameters);

      // Generate content based on format
      const content = await this.generateContent(template, data, report.format);

      const generated: GeneratedReport = {
        reportId,
        content: content.content,
        format: report.format,
        fileName: `${template.name.replace(/\s+/g, '_')}_${Date.now()}.${this.getFileExtension(report.format)}`,
        mimeType: this.getMimeType(report.format),
        size: content.content.length,
      };

      this.generatedContent.set(reportId, generated);

      report.status = 'completed';
      report.completedAt = new Date();
      report.fileSize = generated.size;
      report.filePath = generated.fileName;
      this.reports.set(reportId, report);

      this.logger.log(`Generated report: ${report.name} (${reportId})`);
    } catch (error: any) {
      report.status = 'failed';
      report.error = error.message;
      this.reports.set(reportId, report);
      this.logger.error(`Failed to generate report ${reportId}: ${error.message}`);
    }
  }

  private generateMockData(template: ReportTemplate, parameters?: Record<string, any>): ReportData {
    const rows: any[] = [];
    const rowCount = parameters?.rowCount || 20;

    for (let i = 0; i < rowCount; i++) {
      const row: Record<string, any> = {};
      for (const col of template.columns) {
        row[col.field] = this.generateMockValue(col.type, col.field, i);
      }
      rows.push(row);
    }

    // Calculate totals for aggregated columns
    const totals: Record<string, number> = {};
    for (const col of template.columns) {
      if (col.aggregation) {
        const values = rows.map(r => r[col.field] as number).filter(v => !isNaN(v));
        switch (col.aggregation) {
          case 'sum': totals[col.field] = values.reduce((a, b) => a + b, 0); break;
          case 'avg': totals[col.field] = values.reduce((a, b) => a + b, 0) / values.length; break;
          case 'count': totals[col.field] = values.length; break;
          case 'min': totals[col.field] = Math.min(...values); break;
          case 'max': totals[col.field] = Math.max(...values); break;
        }
      }
    }

    return {
      columns: template.columns,
      rows,
      totals,
      metadata: {
        generatedAt: new Date(),
        rowCount: rows.length,
        filters: parameters,
      },
    };
  }

  private generateMockValue(type: string, field: string, index: number): any {
    switch (type) {
      case 'string':
        if (field.includes('Name')) return `Item ${index + 1}`;
        if (field.includes('status')) return ['Active', 'Pending', 'Completed'][index % 3];
        if (field.includes('Number') || field.includes('Id')) return `${field.toUpperCase().slice(0, 3)}-${1000 + index}`;
        return `Value ${index + 1}`;

      case 'number':
        return Math.floor(Math.random() * 1000);

      case 'currency':
        return Math.round(Math.random() * 10000 * 100) / 100;

      case 'percentage':
        return Math.round(Math.random() * 100 * 10) / 10;

      case 'date':
        const date = new Date();
        date.setDate(date.getDate() - index);
        return date.toISOString().split('T')[0];

      case 'boolean':
        return index % 2 === 0;

      default:
        return `Value ${index}`;
    }
  }

  private async generateContent(
    template: ReportTemplate,
    data: ReportData,
    format: ReportFormat,
  ): Promise<{ content: string | Buffer }> {
    switch (format) {
      case 'json':
        return { content: JSON.stringify(data, null, 2) };

      case 'csv':
        return { content: this.generateCsv(data) };

      case 'html':
        return { content: this.generateHtml(template, data) };

      case 'excel':
        return { content: this.generateExcelMock(template, data) };

      case 'pdf':
        return { content: this.generatePdfMock(template, data) };

      default:
        return { content: JSON.stringify(data) };
    }
  }

  private generateCsv(data: ReportData): string {
    const headers = data.columns.map(c => `"${c.header}"`).join(',');
    const rows = data.rows.map(row =>
      data.columns.map(col => {
        const val = row[col.field];
        return typeof val === 'string' ? `"${val}"` : val;
      }).join(','),
    );

    return [headers, ...rows].join('\n');
  }

  private generateHtml(template: ReportTemplate, data: ReportData): string {
    const styling = template.styling || {};
    const headerColor = styling.headerColor || '#1e40af';

    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${template.name}</title>
  <style>
    body { font-family: ${styling.fontFamily || 'Arial, sans-serif'}; font-size: ${styling.fontSize || 12}px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background-color: ${headerColor}; color: white; padding: 10px; text-align: left; }
    td { padding: 8px; border-bottom: 1px solid #ddd; }
    tr:nth-child(even) { background-color: ${styling.alternateRowColor || '#f9fafb'}; }
    .totals { font-weight: bold; background-color: #e5e7eb; }
    h1 { color: #1f2937; }
    .metadata { color: #6b7280; font-size: 11px; margin-bottom: 10px; }
  </style>
</head>
<body>
  <h1>${template.name}</h1>
  <p class="metadata">Generated: ${data.metadata?.generatedAt.toISOString()} | Rows: ${data.metadata?.rowCount}</p>
  <table>
    <thead>
      <tr>
        ${data.columns.map(c => `<th>${c.header}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${data.rows.map(row => `
        <tr>
          ${data.columns.map(col => `<td>${this.formatValue(row[col.field], col)}</td>`).join('')}
        </tr>
      `).join('')}
      ${data.totals && Object.keys(data.totals).length > 0 ? `
        <tr class="totals">
          ${data.columns.map(col =>
            data.totals![col.field] !== undefined
              ? `<td>${this.formatValue(data.totals![col.field], col)}</td>`
              : '<td></td>',
          ).join('')}
        </tr>
      ` : ''}
    </tbody>
  </table>
</body>
</html>`;

    return html;
  }

  private formatValue(value: any, column: ReportColumn): string {
    if (value === null || value === undefined) return '';

    switch (column.type) {
      case 'currency':
        return new Intl.NumberFormat('ro-RO', {
          style: 'currency',
          currency: 'RON',
        }).format(value);

      case 'percentage':
        return `${value.toFixed(1)}%`;

      case 'date':
        return value;

      case 'number':
        return new Intl.NumberFormat('ro-RO').format(value);

      default:
        return String(value);
    }
  }

  private generateExcelMock(template: ReportTemplate, data: ReportData): string {
    // In production, use a library like exceljs
    // For now, return a placeholder
    return `EXCEL_MOCK:${template.name}:${data.rows.length} rows`;
  }

  private generatePdfMock(template: ReportTemplate, data: ReportData): string {
    // In production, use a library like pdfkit or puppeteer
    // For now, return a placeholder
    return `PDF_MOCK:${template.name}:${data.rows.length} rows`;
  }

  private getFileExtension(format: ReportFormat): string {
    switch (format) {
      case 'pdf': return 'pdf';
      case 'excel': return 'xlsx';
      case 'csv': return 'csv';
      case 'json': return 'json';
      case 'html': return 'html';
      default: return 'txt';
    }
  }

  private getMimeType(format: ReportFormat): string {
    switch (format) {
      case 'pdf': return 'application/pdf';
      case 'excel': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'csv': return 'text/csv';
      case 'json': return 'application/json';
      case 'html': return 'text/html';
      default: return 'text/plain';
    }
  }

  // =================== REPORT RETRIEVAL ===================

  async getReport(reportId: string): Promise<Report | null> {
    return this.reports.get(reportId) || null;
  }

  async getReports(
    tenantId: string,
    filters?: {
      templateId?: string;
      status?: ReportStatus;
      createdBy?: string;
      limit?: number;
    },
  ): Promise<Report[]> {
    let reports = Array.from(this.reports.values())
      .filter(r => r.tenantId === tenantId);

    if (filters?.templateId) {
      reports = reports.filter(r => r.templateId === filters.templateId);
    }
    if (filters?.status) {
      reports = reports.filter(r => r.status === filters.status);
    }
    if (filters?.createdBy) {
      reports = reports.filter(r => r.createdBy === filters.createdBy);
    }

    reports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.limit) {
      reports = reports.slice(0, filters.limit);
    }

    return reports;
  }

  async downloadReport(reportId: string): Promise<GeneratedReport | null> {
    return this.generatedContent.get(reportId) || null;
  }

  async deleteReport(reportId: string): Promise<boolean> {
    this.generatedContent.delete(reportId);
    return this.reports.delete(reportId);
  }

  // =================== SCHEDULED REPORTS ===================

  async scheduleReport(
    tenantId: string,
    templateId: string,
    name: string,
    format: ReportFormat,
    frequency: ScheduleFrequency,
    recipients: string[],
    createdBy: string,
    parameters?: Record<string, any>,
  ): Promise<ScheduledReport> {
    const scheduled: ScheduledReport = {
      id: this.generateId('sch'),
      tenantId,
      templateId,
      name,
      format,
      frequency,
      parameters,
      recipients,
      nextRunAt: this.calculateNextRun(frequency),
      isActive: true,
      createdBy,
      createdAt: new Date(),
    };

    this.scheduledReports.set(scheduled.id, scheduled);
    this.logger.log(`Scheduled report: ${name} (${scheduled.id}) - ${frequency}`);
    return scheduled;
  }

  private calculateNextRun(frequency: ScheduleFrequency): Date {
    const now = new Date();
    switch (frequency) {
      case 'daily':
        now.setDate(now.getDate() + 1);
        now.setHours(6, 0, 0, 0);
        break;
      case 'weekly':
        now.setDate(now.getDate() + (7 - now.getDay() + 1) % 7 + 1);
        now.setHours(6, 0, 0, 0);
        break;
      case 'monthly':
        now.setMonth(now.getMonth() + 1);
        now.setDate(1);
        now.setHours(6, 0, 0, 0);
        break;
      case 'quarterly':
        now.setMonth(now.getMonth() + 3 - (now.getMonth() % 3));
        now.setDate(1);
        now.setHours(6, 0, 0, 0);
        break;
      case 'yearly':
        now.setFullYear(now.getFullYear() + 1);
        now.setMonth(0);
        now.setDate(1);
        now.setHours(6, 0, 0, 0);
        break;
      case 'once':
        now.setDate(now.getDate() + 1);
        break;
    }
    return now;
  }

  async getScheduledReport(scheduleId: string): Promise<ScheduledReport | null> {
    return this.scheduledReports.get(scheduleId) || null;
  }

  async getScheduledReports(tenantId: string, isActive?: boolean): Promise<ScheduledReport[]> {
    let reports = Array.from(this.scheduledReports.values())
      .filter(r => r.tenantId === tenantId);

    if (isActive !== undefined) {
      reports = reports.filter(r => r.isActive === isActive);
    }

    return reports.sort((a, b) => a.nextRunAt.getTime() - b.nextRunAt.getTime());
  }

  async updateScheduledReport(
    scheduleId: string,
    updates: Partial<Omit<ScheduledReport, 'id' | 'tenantId' | 'createdBy' | 'createdAt'>>,
  ): Promise<ScheduledReport | null> {
    const scheduled = this.scheduledReports.get(scheduleId);
    if (!scheduled) return null;

    const updated: ScheduledReport = {
      ...scheduled,
      ...updates,
    };

    if (updates.frequency) {
      updated.nextRunAt = this.calculateNextRun(updates.frequency);
    }

    this.scheduledReports.set(scheduleId, updated);
    return updated;
  }

  async deleteScheduledReport(scheduleId: string): Promise<boolean> {
    return this.scheduledReports.delete(scheduleId);
  }

  async runScheduledReport(scheduleId: string): Promise<Report | null> {
    const scheduled = this.scheduledReports.get(scheduleId);
    if (!scheduled) return null;

    const report = await this.generateReport(
      scheduled.tenantId,
      scheduled.templateId,
      scheduled.format,
      scheduled.createdBy,
      scheduled.parameters,
    );

    scheduled.lastRunAt = new Date();
    scheduled.nextRunAt = this.calculateNextRun(scheduled.frequency);
    this.scheduledReports.set(scheduleId, scheduled);

    return report;
  }

  // =================== METADATA ===================

  getReportCategories(): ReportCategory[] {
    return ['financial', 'hr', 'fleet', 'operations', 'compliance', 'custom'];
  }

  getReportFormats(): ReportFormat[] {
    return ['pdf', 'excel', 'csv', 'json', 'html'];
  }

  getScheduleFrequencies(): ScheduleFrequency[] {
    return ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'once'];
  }

  getColumnTypes(): string[] {
    return ['string', 'number', 'date', 'currency', 'percentage', 'boolean'];
  }

  getAggregationTypes(): string[] {
    return ['sum', 'avg', 'count', 'min', 'max'];
  }
}
