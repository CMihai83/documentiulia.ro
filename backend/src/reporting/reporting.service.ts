import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type ReportType =
  | 'FINANCIAL_SUMMARY'
  | 'INCOME_STATEMENT'
  | 'BALANCE_SHEET'
  | 'CASH_FLOW'
  | 'VAT_REPORT'
  | 'SAF_T_D406'
  | 'E_FACTURA'
  | 'PAYROLL'
  | 'ATTENDANCE'
  | 'INVENTORY'
  | 'SALES'
  | 'PURCHASES'
  | 'CUSTOMER'
  | 'SUPPLIER'
  | 'CUSTOM';

export type ReportFormat = 'PDF' | 'EXCEL' | 'CSV' | 'JSON' | 'XML' | 'HTML';

export type ReportStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type ReportFrequency = 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface ReportColumn {
  field: string;
  header: string;
  headerRo: string;
  width?: number;
  format?: 'text' | 'number' | 'currency' | 'date' | 'percentage';
  align?: 'left' | 'center' | 'right';
  formula?: string;
}

export interface ReportFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'between';
  value: any;
}

export interface ReportTemplate {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  type: ReportType;
  columns: ReportColumn[];
  filters: ReportFilter[];
  groupBy?: string[];
  sortBy?: { field: string; order: 'asc' | 'desc' }[];
  defaultFormat: ReportFormat;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface Report {
  id: string;
  templateId?: string;
  name: string;
  nameRo: string;
  description?: string;
  descriptionRo?: string;
  type: ReportType;
  format: ReportFormat;
  status: ReportStatus;
  filters: ReportFilter[];
  parameters: Record<string, any>;
  period: { start: Date; end: Date };
  generatedAt?: Date;
  completedAt?: Date;
  fileUrl?: string;
  fileSize?: number;
  rowCount?: number;
  error?: string;
  metadata: Record<string, any>;
  createdBy: string;
  tenantId?: string;
}

export interface ReportSchedule {
  id: string;
  templateId: string;
  name: string;
  nameRo: string;
  frequency: ReportFrequency;
  format: ReportFormat;
  recipients: string[];
  isActive: boolean;
  lastRun?: Date;
  nextRun: Date;
  filters: ReportFilter[];
  createdBy: string;
}

export interface ReportData {
  columns: ReportColumn[];
  rows: Record<string, any>[];
  totals?: Record<string, any>;
  summary?: Record<string, any>;
}

// Romanian translations for report types
const REPORT_TYPE_TRANSLATIONS: Record<ReportType, string> = {
  FINANCIAL_SUMMARY: 'Sumar Financiar',
  INCOME_STATEMENT: 'Cont de Profit și Pierdere',
  BALANCE_SHEET: 'Bilanț Contabil',
  CASH_FLOW: 'Flux de Numerar',
  VAT_REPORT: 'Raport TVA',
  SAF_T_D406: 'Declarație SAF-T D406',
  E_FACTURA: 'Raport e-Factura',
  PAYROLL: 'Stat de Plată',
  ATTENDANCE: 'Pontaj',
  INVENTORY: 'Raport Stocuri',
  SALES: 'Raport Vânzări',
  PURCHASES: 'Raport Achiziții',
  CUSTOMER: 'Raport Clienți',
  SUPPLIER: 'Raport Furnizori',
  CUSTOM: 'Raport Personalizat',
};

// Romanian translations for formats
const FORMAT_TRANSLATIONS: Record<ReportFormat, string> = {
  PDF: 'Document PDF',
  EXCEL: 'Foaie de calcul Excel',
  CSV: 'Fișier CSV',
  JSON: 'Format JSON',
  XML: 'Format XML',
  HTML: 'Pagină Web HTML',
};

// Built-in report templates
const DEFAULT_TEMPLATES: Partial<ReportTemplate>[] = [
  {
    id: 'tpl-financial-summary',
    name: 'Financial Summary Report',
    nameRo: 'Raport Sumar Financiar',
    description: 'Monthly financial overview with key metrics',
    descriptionRo: 'Privire de ansamblu financiară lunară cu indicatori cheie',
    type: 'FINANCIAL_SUMMARY',
    columns: [
      { field: 'metric', header: 'Metric', headerRo: 'Indicator', format: 'text' },
      { field: 'value', header: 'Value', headerRo: 'Valoare', format: 'currency', align: 'right' },
      { field: 'change', header: 'Change %', headerRo: 'Variație %', format: 'percentage', align: 'right' },
    ],
    defaultFormat: 'PDF',
  },
  {
    id: 'tpl-vat-report',
    name: 'VAT Report',
    nameRo: 'Raport TVA',
    description: 'VAT declaration report for ANAF submission',
    descriptionRo: 'Raport declarație TVA pentru depunere ANAF',
    type: 'VAT_REPORT',
    columns: [
      { field: 'invoiceNumber', header: 'Invoice No.', headerRo: 'Nr. Factură', format: 'text' },
      { field: 'partnerName', header: 'Partner', headerRo: 'Partener', format: 'text' },
      { field: 'partnerCUI', header: 'CUI', headerRo: 'CUI', format: 'text' },
      { field: 'taxableAmount', header: 'Taxable', headerRo: 'Bază Impozabilă', format: 'currency', align: 'right' },
      { field: 'vatRate', header: 'VAT %', headerRo: 'TVA %', format: 'percentage', align: 'right' },
      { field: 'vatAmount', header: 'VAT Amount', headerRo: 'Sumă TVA', format: 'currency', align: 'right' },
    ],
    defaultFormat: 'EXCEL',
  },
  {
    id: 'tpl-saft-d406',
    name: 'SAF-T D406 Declaration',
    nameRo: 'Declarație SAF-T D406',
    description: 'Standard Audit File for Tax - Romanian D406 format',
    descriptionRo: 'Fișier Standard de Audit pentru Taxe - format D406 România',
    type: 'SAF_T_D406',
    columns: [
      { field: 'transactionId', header: 'Transaction ID', headerRo: 'ID Tranzacție', format: 'text' },
      { field: 'date', header: 'Date', headerRo: 'Data', format: 'date' },
      { field: 'accountCode', header: 'Account', headerRo: 'Cont', format: 'text' },
      { field: 'debit', header: 'Debit', headerRo: 'Debit', format: 'currency', align: 'right' },
      { field: 'credit', header: 'Credit', headerRo: 'Credit', format: 'currency', align: 'right' },
    ],
    defaultFormat: 'XML',
  },
  {
    id: 'tpl-payroll',
    name: 'Payroll Report',
    nameRo: 'Stat de Plată',
    description: 'Monthly payroll with all deductions and contributions',
    descriptionRo: 'Stat de plată lunar cu toate deducerile și contribuțiile',
    type: 'PAYROLL',
    columns: [
      { field: 'employeeName', header: 'Employee', headerRo: 'Angajat', format: 'text' },
      { field: 'grossSalary', header: 'Gross Salary', headerRo: 'Salariu Brut', format: 'currency', align: 'right' },
      { field: 'cas', header: 'CAS', headerRo: 'CAS', format: 'currency', align: 'right' },
      { field: 'cass', header: 'CASS', headerRo: 'CASS', format: 'currency', align: 'right' },
      { field: 'incomeTax', header: 'Income Tax', headerRo: 'Impozit', format: 'currency', align: 'right' },
      { field: 'netSalary', header: 'Net Salary', headerRo: 'Salariu Net', format: 'currency', align: 'right' },
    ],
    defaultFormat: 'PDF',
  },
  {
    id: 'tpl-sales',
    name: 'Sales Report',
    nameRo: 'Raport Vânzări',
    description: 'Sales analysis by product, customer and period',
    descriptionRo: 'Analiză vânzări pe produs, client și perioadă',
    type: 'SALES',
    columns: [
      { field: 'date', header: 'Date', headerRo: 'Data', format: 'date' },
      { field: 'invoiceNumber', header: 'Invoice', headerRo: 'Factură', format: 'text' },
      { field: 'customerName', header: 'Customer', headerRo: 'Client', format: 'text' },
      { field: 'product', header: 'Product', headerRo: 'Produs', format: 'text' },
      { field: 'quantity', header: 'Qty', headerRo: 'Cantitate', format: 'number', align: 'right' },
      { field: 'unitPrice', header: 'Unit Price', headerRo: 'Preț Unitar', format: 'currency', align: 'right' },
      { field: 'total', header: 'Total', headerRo: 'Total', format: 'currency', align: 'right' },
    ],
    defaultFormat: 'EXCEL',
  },
  {
    id: 'tpl-inventory',
    name: 'Inventory Report',
    nameRo: 'Raport Stocuri',
    description: 'Current inventory levels with valuation',
    descriptionRo: 'Niveluri curente stocuri cu evaluare',
    type: 'INVENTORY',
    columns: [
      { field: 'sku', header: 'SKU', headerRo: 'Cod Produs', format: 'text' },
      { field: 'name', header: 'Product', headerRo: 'Produs', format: 'text' },
      { field: 'quantity', header: 'Stock', headerRo: 'Stoc', format: 'number', align: 'right' },
      { field: 'unitCost', header: 'Unit Cost', headerRo: 'Cost Unitar', format: 'currency', align: 'right' },
      { field: 'totalValue', header: 'Total Value', headerRo: 'Valoare Totală', format: 'currency', align: 'right' },
    ],
    defaultFormat: 'EXCEL',
  },
];

@Injectable()
export class ReportingService implements OnModuleInit {
  private reports: Map<string, Report> = new Map();
  private templates: Map<string, ReportTemplate> = new Map();
  private schedules: Map<string, ReportSchedule> = new Map();
  private reportData: Map<string, ReportData> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async onModuleInit(): Promise<void> {
    // Initialize default templates
    for (const template of DEFAULT_TEMPLATES) {
      const fullTemplate: ReportTemplate = {
        id: template.id!,
        name: template.name!,
        nameRo: template.nameRo!,
        description: template.description!,
        descriptionRo: template.descriptionRo!,
        type: template.type!,
        columns: template.columns!,
        filters: [],
        defaultFormat: template.defaultFormat!,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
      };
      this.templates.set(fullTemplate.id, fullTemplate);
    }
  }

  // Template Management
  async createTemplate(
    name: string,
    nameRo: string,
    type: ReportType,
    columns: ReportColumn[],
    createdBy: string,
    options: {
      description?: string;
      descriptionRo?: string;
      filters?: ReportFilter[];
      groupBy?: string[];
      sortBy?: { field: string; order: 'asc' | 'desc' }[];
      defaultFormat?: ReportFormat;
    } = {},
  ): Promise<ReportTemplate> {
    const template: ReportTemplate = {
      id: this.generateId('tpl'),
      name,
      nameRo,
      description: options.description || '',
      descriptionRo: options.descriptionRo || '',
      type,
      columns,
      filters: options.filters || [],
      groupBy: options.groupBy,
      sortBy: options.sortBy,
      defaultFormat: options.defaultFormat || 'PDF',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
    };

    this.templates.set(template.id, template);

    this.eventEmitter.emit('report.template.created', {
      templateId: template.id,
      name: template.name,
      type: template.type,
    });

    return template;
  }

  async getTemplate(templateId: string): Promise<ReportTemplate | undefined> {
    return this.templates.get(templateId);
  }

  async listTemplates(type?: ReportType): Promise<ReportTemplate[]> {
    let templates = Array.from(this.templates.values());
    if (type) {
      templates = templates.filter((t) => t.type === type);
    }
    return templates.filter((t) => t.isActive);
  }

  async updateTemplate(
    templateId: string,
    updates: Partial<Omit<ReportTemplate, 'id' | 'createdAt' | 'createdBy'>>,
  ): Promise<ReportTemplate> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

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
    if (!template) {
      return false;
    }

    template.isActive = false;
    this.templates.set(templateId, template);
    return true;
  }

  // Report Generation
  async generateReport(
    type: ReportType,
    format: ReportFormat,
    period: { start: Date; end: Date },
    createdBy: string,
    options: {
      name?: string;
      nameRo?: string;
      templateId?: string;
      filters?: ReportFilter[];
      parameters?: Record<string, any>;
      tenantId?: string;
    } = {},
  ): Promise<Report> {
    const typeName = REPORT_TYPE_TRANSLATIONS[type];

    const report: Report = {
      id: this.generateId('rpt'),
      templateId: options.templateId,
      name: options.name || `${type} Report`,
      nameRo: options.nameRo || `Raport ${typeName}`,
      type,
      format,
      status: 'PENDING',
      filters: options.filters || [],
      parameters: options.parameters || {},
      period,
      metadata: {
        formatName: FORMAT_TRANSLATIONS[format],
        typeName,
      },
      createdBy,
      tenantId: options.tenantId,
    };

    this.reports.set(report.id, report);

    // Start async generation
    this.processReport(report.id);

    this.eventEmitter.emit('report.requested', {
      reportId: report.id,
      type,
      format,
    });

    return report;
  }

  private async processReport(reportId: string): Promise<void> {
    // Yield to allow cancel/delete operations to complete first
    await Promise.resolve();

    const report = this.reports.get(reportId);
    if (!report || report.status === 'CANCELLED') return;

    try {
      // Update status to generating
      report.status = 'GENERATING';
      report.generatedAt = new Date();
      this.reports.set(reportId, report);

      // Generate report data based on type
      const data = await this.generateReportData(report);

      // Check if report was cancelled or deleted during processing
      const currentReport = this.reports.get(reportId);
      if (!currentReport || currentReport.status === 'CANCELLED') {
        return;
      }

      this.reportData.set(reportId, data);

      // Simulate file generation
      const fileContent = await this.formatReportData(data, report.format);

      // Check again before completing
      const finalReport = this.reports.get(reportId);
      if (!finalReport || finalReport.status === 'CANCELLED') {
        return;
      }

      // Complete report
      finalReport.status = 'COMPLETED';
      finalReport.completedAt = new Date();
      finalReport.fileUrl = `/reports/${reportId}.${finalReport.format.toLowerCase()}`;
      finalReport.fileSize = fileContent.length;
      finalReport.rowCount = data.rows.length;

      this.reports.set(reportId, finalReport);

      this.eventEmitter.emit('report.completed', {
        reportId: finalReport.id,
        type: finalReport.type,
        rowCount: finalReport.rowCount,
      });
    } catch (error) {
      const errorReport = this.reports.get(reportId);
      if (!errorReport || errorReport.status === 'CANCELLED') {
        return;
      }
      errorReport.status = 'FAILED';
      errorReport.error = error instanceof Error ? error.message : 'Unknown error';
      this.reports.set(reportId, errorReport);

      this.eventEmitter.emit('report.failed', {
        reportId: errorReport.id,
        error: errorReport.error,
      });
    }
  }

  private async generateReportData(report: Report): Promise<ReportData> {
    // Get template columns or default columns for type
    let columns: ReportColumn[] = [];
    if (report.templateId) {
      const template = this.templates.get(report.templateId);
      if (template) {
        columns = template.columns;
      }
    }

    if (columns.length === 0) {
      columns = this.getDefaultColumns(report.type);
    }

    // Generate sample data based on report type
    const rows = this.generateSampleData(report.type, report.period, report.filters);

    // Calculate totals for numeric columns
    const totals: Record<string, any> = {};
    for (const col of columns) {
      if (col.format === 'currency' || col.format === 'number') {
        totals[col.field] = rows.reduce((sum, row) => sum + (row[col.field] || 0), 0);
      }
    }

    return {
      columns,
      rows,
      totals,
      summary: {
        totalRows: rows.length,
        generatedAt: new Date(),
        periodStart: report.period.start,
        periodEnd: report.period.end,
      },
    };
  }

  private getDefaultColumns(type: ReportType): ReportColumn[] {
    const template = Array.from(this.templates.values()).find((t) => t.type === type);
    return template?.columns || [];
  }

  private generateSampleData(
    type: ReportType,
    period: { start: Date; end: Date },
    filters: ReportFilter[],
  ): Record<string, any>[] {
    // Generate sample data based on report type
    const data: Record<string, any>[] = [];

    switch (type) {
      case 'VAT_REPORT':
        data.push(
          {
            invoiceNumber: 'FV-2024-001',
            partnerName: 'SC Exemplu SRL',
            partnerCUI: 'RO12345674',
            taxableAmount: 10000,
            vatRate: 19,
            vatAmount: 1900,
          },
          {
            invoiceNumber: 'FV-2024-002',
            partnerName: 'SC Test SRL',
            partnerCUI: 'RO11111110',
            taxableAmount: 5000,
            vatRate: 9,
            vatAmount: 450,
          },
        );
        break;

      case 'PAYROLL':
        data.push(
          {
            employeeName: 'Ion Popescu',
            grossSalary: 8000,
            cas: 2000,
            cass: 800,
            incomeTax: 520,
            netSalary: 4680,
          },
          {
            employeeName: 'Maria Ionescu',
            grossSalary: 6000,
            cas: 1500,
            cass: 600,
            incomeTax: 390,
            netSalary: 3510,
          },
        );
        break;

      case 'SALES':
        data.push(
          {
            date: period.start,
            invoiceNumber: 'FV-001',
            customerName: 'Client A',
            product: 'Produs 1',
            quantity: 10,
            unitPrice: 100,
            total: 1000,
          },
          {
            date: period.end,
            invoiceNumber: 'FV-002',
            customerName: 'Client B',
            product: 'Produs 2',
            quantity: 5,
            unitPrice: 200,
            total: 1000,
          },
        );
        break;

      case 'INVENTORY':
        data.push(
          {
            sku: 'PROD-001',
            name: 'Produs Principal',
            quantity: 100,
            unitCost: 50,
            totalValue: 5000,
          },
          {
            sku: 'PROD-002',
            name: 'Produs Secundar',
            quantity: 50,
            unitCost: 30,
            totalValue: 1500,
          },
        );
        break;

      case 'FINANCIAL_SUMMARY':
        data.push(
          { metric: 'Venituri Totale', value: 150000, change: 12.5 },
          { metric: 'Cheltuieli Totale', value: 100000, change: 8.2 },
          { metric: 'Profit Net', value: 50000, change: 25.0 },
          { metric: 'Flux Numerar', value: 35000, change: 15.3 },
        );
        break;

      default:
        // Generic data for other types
        data.push(
          { id: 1, description: 'Item 1', amount: 1000 },
          { id: 2, description: 'Item 2', amount: 2000 },
        );
    }

    // Apply filters
    return this.applyFilters(data, filters);
  }

  private applyFilters(data: Record<string, any>[], filters: ReportFilter[]): Record<string, any>[] {
    if (filters.length === 0) return data;

    return data.filter((row) => {
      return filters.every((filter) => {
        const value = row[filter.field];
        switch (filter.operator) {
          case 'eq':
            return value === filter.value;
          case 'ne':
            return value !== filter.value;
          case 'gt':
            return value > filter.value;
          case 'gte':
            return value >= filter.value;
          case 'lt':
            return value < filter.value;
          case 'lte':
            return value <= filter.value;
          case 'contains':
            return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
          case 'in':
            return Array.isArray(filter.value) && filter.value.includes(value);
          case 'between':
            return (
              Array.isArray(filter.value) &&
              filter.value.length === 2 &&
              value >= filter.value[0] &&
              value <= filter.value[1]
            );
          default:
            return true;
        }
      });
    });
  }

  private async formatReportData(data: ReportData, format: ReportFormat): Promise<string> {
    switch (format) {
      case 'JSON':
        return JSON.stringify(data, null, 2);

      case 'CSV':
        return this.formatAsCsv(data);

      case 'XML':
        return this.formatAsXml(data);

      case 'HTML':
        return this.formatAsHtml(data);

      case 'PDF':
      case 'EXCEL':
        // Simulate binary content
        return `[Binary ${format} content - ${data.rows.length} rows]`;

      default:
        return JSON.stringify(data);
    }
  }

  private formatAsCsv(data: ReportData): string {
    const headers = data.columns.map((c) => c.header).join(',');
    const rows = data.rows.map((row) => data.columns.map((col) => this.escapeCsvValue(row[col.field])).join(','));
    return [headers, ...rows].join('\n');
  }

  private escapeCsvValue(value: any): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  private formatAsXml(data: ReportData): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<Report>\n';
    xml += '  <Rows>\n';
    for (const row of data.rows) {
      xml += '    <Row>\n';
      for (const col of data.columns) {
        const value = row[col.field];
        xml += `      <${col.field}>${this.escapeXml(value)}</${col.field}>\n`;
      }
      xml += '    </Row>\n';
    }
    xml += '  </Rows>\n';
    if (data.totals) {
      xml += '  <Totals>\n';
      for (const [key, value] of Object.entries(data.totals)) {
        xml += `    <${key}>${value}</${key}>\n`;
      }
      xml += '  </Totals>\n';
    }
    xml += '</Report>';
    return xml;
  }

  private escapeXml(value: any): string {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private formatAsHtml(data: ReportData): string {
    let html = '<!DOCTYPE html>\n<html>\n<head>\n';
    html += '<style>table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px}</style>\n';
    html += '</head>\n<body>\n<table>\n<thead>\n<tr>\n';
    for (const col of data.columns) {
      html += `<th>${col.header}</th>\n`;
    }
    html += '</tr>\n</thead>\n<tbody>\n';
    for (const row of data.rows) {
      html += '<tr>\n';
      for (const col of data.columns) {
        html += `<td>${row[col.field] ?? ''}</td>\n`;
      }
      html += '</tr>\n';
    }
    html += '</tbody>\n</table>\n</body>\n</html>';
    return html;
  }

  // Report Management
  async getReport(reportId: string): Promise<Report | undefined> {
    return this.reports.get(reportId);
  }

  async getReportData(reportId: string): Promise<ReportData | undefined> {
    return this.reportData.get(reportId);
  }

  async listReports(options: {
    type?: ReportType;
    status?: ReportStatus;
    userId?: string;
    limit?: number;
  } = {}): Promise<Report[]> {
    let reports = Array.from(this.reports.values());

    if (options.type) {
      reports = reports.filter((r) => r.type === options.type);
    }
    if (options.status) {
      reports = reports.filter((r) => r.status === options.status);
    }
    if (options.userId) {
      reports = reports.filter((r) => r.createdBy === options.userId);
    }

    reports.sort((a, b) => (b.generatedAt?.getTime() || 0) - (a.generatedAt?.getTime() || 0));

    if (options.limit) {
      reports = reports.slice(0, options.limit);
    }

    return reports;
  }

  async cancelReport(reportId: string): Promise<boolean> {
    const report = this.reports.get(reportId);
    if (!report || report.status !== 'PENDING' && report.status !== 'GENERATING') {
      return false;
    }

    report.status = 'CANCELLED';
    this.reports.set(reportId, report);

    this.eventEmitter.emit('report.cancelled', {
      reportId: report.id,
    });

    return true;
  }

  async deleteReport(reportId: string): Promise<boolean> {
    const report = this.reports.get(reportId);
    if (!report) {
      return false;
    }

    this.reports.delete(reportId);
    this.reportData.delete(reportId);
    return true;
  }

  // Schedule Management
  async createSchedule(
    templateId: string,
    name: string,
    nameRo: string,
    frequency: ReportFrequency,
    createdBy: string,
    options: {
      format?: ReportFormat;
      recipients?: string[];
      filters?: ReportFilter[];
    } = {},
  ): Promise<ReportSchedule> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const schedule: ReportSchedule = {
      id: this.generateId('sch'),
      templateId,
      name,
      nameRo,
      frequency,
      format: options.format || template.defaultFormat,
      recipients: options.recipients || [],
      isActive: true,
      nextRun: this.calculateNextRun(frequency),
      filters: options.filters || [],
      createdBy,
    };

    this.schedules.set(schedule.id, schedule);

    this.eventEmitter.emit('report.schedule.created', {
      scheduleId: schedule.id,
      templateId,
      frequency,
    });

    return schedule;
  }

  async getSchedule(scheduleId: string): Promise<ReportSchedule | undefined> {
    return this.schedules.get(scheduleId);
  }

  async listSchedules(isActive?: boolean): Promise<ReportSchedule[]> {
    let schedules = Array.from(this.schedules.values());
    if (isActive !== undefined) {
      schedules = schedules.filter((s) => s.isActive === isActive);
    }
    return schedules;
  }

  async updateSchedule(
    scheduleId: string,
    updates: Partial<Omit<ReportSchedule, 'id' | 'templateId' | 'createdBy'>>,
  ): Promise<ReportSchedule> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    const updated: ReportSchedule = {
      ...schedule,
      ...updates,
    };

    if (updates.frequency && updates.frequency !== schedule.frequency) {
      updated.nextRun = this.calculateNextRun(updates.frequency);
    }

    this.schedules.set(scheduleId, updated);
    return updated;
  }

  async deleteSchedule(scheduleId: string): Promise<boolean> {
    return this.schedules.delete(scheduleId);
  }

  async runScheduledReport(scheduleId: string): Promise<Report> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    const template = this.templates.get(schedule.templateId);
    if (!template) {
      throw new Error(`Template not found: ${schedule.templateId}`);
    }

    // Calculate period based on frequency
    const period = this.calculatePeriodForFrequency(schedule.frequency);

    const report = await this.generateReport(template.type, schedule.format, period, schedule.createdBy, {
      templateId: template.id,
      filters: schedule.filters,
    });

    // Update schedule
    schedule.lastRun = new Date();
    schedule.nextRun = this.calculateNextRun(schedule.frequency);
    this.schedules.set(scheduleId, schedule);

    this.eventEmitter.emit('report.schedule.executed', {
      scheduleId: schedule.id,
      reportId: report.id,
    });

    return report;
  }

  private calculateNextRun(frequency: ReportFrequency): Date {
    const now = new Date();
    switch (frequency) {
      case 'ONCE':
        return now;
      case 'DAILY':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'WEEKLY':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'MONTHLY':
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
      case 'QUARTERLY':
        return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 1);
      case 'YEARLY':
        return new Date(now.getFullYear() + 1, 0, 1);
      default:
        return now;
    }
  }

  private calculatePeriodForFrequency(frequency: ReportFrequency): { start: Date; end: Date } {
    const now = new Date();
    let start: Date;
    const end = now;

    switch (frequency) {
      case 'DAILY':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        break;
      case 'WEEKLY':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'MONTHLY':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      case 'QUARTERLY':
        start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 3, 1);
        break;
      case 'YEARLY':
        start = new Date(now.getFullYear() - 1, 0, 1);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { start, end };
  }

  // VAT Report Helpers
  async generateVatReport(
    period: { start: Date; end: Date },
    createdBy: string,
    options: { format?: ReportFormat } = {},
  ): Promise<Report> {
    return this.generateReport('VAT_REPORT', options.format || 'EXCEL', period, createdBy, {
      templateId: 'tpl-vat-report',
      nameRo: 'Raport TVA',
    });
  }

  async generateSafTReport(
    period: { start: Date; end: Date },
    createdBy: string,
  ): Promise<Report> {
    return this.generateReport('SAF_T_D406', 'XML', period, createdBy, {
      templateId: 'tpl-saft-d406',
      nameRo: 'Declarație SAF-T D406',
      parameters: {
        complianceStandard: 'ANAF Order 1783/2021',
        version: '2.0',
      },
    });
  }

  async generatePayrollReport(
    period: { start: Date; end: Date },
    createdBy: string,
    options: { format?: ReportFormat } = {},
  ): Promise<Report> {
    return this.generateReport('PAYROLL', options.format || 'PDF', period, createdBy, {
      templateId: 'tpl-payroll',
      nameRo: 'Stat de Plată',
    });
  }

  // Statistics
  async getReportStats(): Promise<{
    totalReports: number;
    reportsByType: Record<ReportType, number>;
    reportsByStatus: Record<ReportStatus, number>;
    reportsByFormat: Record<ReportFormat, number>;
    averageRowCount: number;
  }> {
    const reports = Array.from(this.reports.values());

    const reportsByType: Record<string, number> = {};
    const reportsByStatus: Record<string, number> = {};
    const reportsByFormat: Record<string, number> = {};
    let totalRows = 0;
    let reportsWithRows = 0;

    for (const report of reports) {
      reportsByType[report.type] = (reportsByType[report.type] || 0) + 1;
      reportsByStatus[report.status] = (reportsByStatus[report.status] || 0) + 1;
      reportsByFormat[report.format] = (reportsByFormat[report.format] || 0) + 1;

      if (report.rowCount) {
        totalRows += report.rowCount;
        reportsWithRows++;
      }
    }

    return {
      totalReports: reports.length,
      reportsByType: reportsByType as Record<ReportType, number>,
      reportsByStatus: reportsByStatus as Record<ReportStatus, number>,
      reportsByFormat: reportsByFormat as Record<ReportFormat, number>,
      averageRowCount: reportsWithRows > 0 ? totalRows / reportsWithRows : 0,
    };
  }

  // Romanian Localization Helpers
  getReportTypeName(type: ReportType): string {
    return REPORT_TYPE_TRANSLATIONS[type];
  }

  getFormatName(format: ReportFormat): string {
    return FORMAT_TRANSLATIONS[format];
  }

  getAllReportTypes(): Array<{ type: ReportType; name: string; nameRo: string }> {
    return (Object.keys(REPORT_TYPE_TRANSLATIONS) as ReportType[]).map((type) => ({
      type,
      name: type.replace(/_/g, ' '),
      nameRo: REPORT_TYPE_TRANSLATIONS[type],
    }));
  }

  getAllFormats(): Array<{ format: ReportFormat; name: string; nameRo: string }> {
    return (Object.keys(FORMAT_TRANSLATIONS) as ReportFormat[]).map((format) => ({
      format,
      name: format,
      nameRo: FORMAT_TRANSLATIONS[format],
    }));
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
