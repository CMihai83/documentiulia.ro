import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type ExportFormat = 'CSV' | 'XLSX' | 'PDF' | 'JSON' | 'XML' | 'SAF_T' | 'E_FACTURA';

export type ExportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'EXPIRED';

export interface ExportColumn {
  field: string;
  header: string;
  headerRo: string;
  type: 'STRING' | 'NUMBER' | 'DATE' | 'CURRENCY' | 'BOOLEAN' | 'PERCENTAGE';
  format?: string;
  width?: number;
  alignment?: 'LEFT' | 'CENTER' | 'RIGHT';
}

export interface ExportFilter {
  field: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'BETWEEN' | 'IN' | 'CONTAINS' | 'IS_NULL';
  value: any;
  valueEnd?: any;
}

export interface ExportSort {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface ExportTemplate {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  dataType: ExportDataType;
  format: ExportFormat;
  columns: ExportColumn[];
  filters?: ExportFilter[];
  sortBy?: ExportSort[];
  isDefault: boolean;
  isBuiltIn: boolean;
  organizationId?: string;
  createdBy?: string;
  createdAt: Date;
}

export type ExportDataType =
  | 'INVOICES'
  | 'CUSTOMERS'
  | 'PRODUCTS'
  | 'TRANSACTIONS'
  | 'EMPLOYEES'
  | 'PAYROLL'
  | 'INVENTORY'
  | 'ORDERS'
  | 'PAYMENTS'
  | 'VAT_REPORT'
  | 'AUDIT_LOG'
  | 'CUSTOM';

export interface ExportRequest {
  id: string;
  templateId?: string;
  dataType: ExportDataType;
  format: ExportFormat;
  columns: ExportColumn[];
  filters?: ExportFilter[];
  sortBy?: ExportSort[];
  dateRange?: { start: Date; end: Date };
  locale: 'ro' | 'en';
  currency: 'RON' | 'EUR' | 'USD';
  includeHeaders: boolean;
  includeTotals: boolean;
  fileName: string;
  status: ExportStatus;
  progress: number;
  totalRecords: number;
  processedRecords: number;
  fileSize: number;
  filePath?: string;
  downloadUrl?: string;
  errorMessage?: string;
  organizationId: string;
  requestedBy: string;
  requestedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  expiresAt?: Date;
}

export interface ExportResult {
  id: string;
  fileName: string;
  format: ExportFormat;
  fileSize: number;
  downloadUrl: string;
  recordCount: number;
  generatedAt: Date;
  expiresAt: Date;
}

export interface ExportPreview {
  columns: string[];
  rows: any[][];
  totalRecords: number;
  hasMore: boolean;
}

export interface CreateExportDto {
  dataType: ExportDataType;
  format: ExportFormat;
  templateId?: string;
  columns?: ExportColumn[];
  filters?: ExportFilter[];
  sortBy?: ExportSort[];
  dateRange?: { start: Date; end: Date };
  locale?: 'ro' | 'en';
  currency?: 'RON' | 'EUR' | 'USD';
  includeHeaders?: boolean;
  includeTotals?: boolean;
  fileName?: string;
  organizationId: string;
  requestedBy: string;
}

export interface CreateTemplateDto {
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  dataType: ExportDataType;
  format: ExportFormat;
  columns: ExportColumn[];
  filters?: ExportFilter[];
  sortBy?: ExportSort[];
  organizationId: string;
  createdBy: string;
}

export interface ExportStats {
  totalExports: number;
  completedExports: number;
  failedExports: number;
  totalSize: number;
  exportsByFormat: Record<ExportFormat, number>;
  exportsByDataType: Record<ExportDataType, number>;
  averageProcessingTime: number;
}

@Injectable()
export class DataExportService {
  private exports: Map<string, ExportRequest> = new Map();
  private templates: Map<string, ExportTemplate> = new Map();
  private mockData: Map<ExportDataType, any[]> = new Map();

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeBuiltInTemplates();
    this.initializeMockData();
  }

  private generateId(prefix: string): string {
    return prefix + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  private initializeMockData(): void {
    this.mockData.set('INVOICES', [
      { id: 'INV-001', number: 'F2025-0001', customer: 'SC Example SRL', cui: 'RO12345678', date: new Date('2025-01-15'), amount: 1000, vat: 190, total: 1190, status: 'PAID' },
      { id: 'INV-002', number: 'F2025-0002', customer: 'SC Test SA', cui: 'RO87654321', date: new Date('2025-01-20'), amount: 2500, vat: 475, total: 2975, status: 'PENDING' },
      { id: 'INV-003', number: 'F2025-0003', customer: 'SC Demo SRL', cui: 'RO11223344', date: new Date('2025-02-01'), amount: 500, vat: 95, total: 595, status: 'PAID' },
    ]);

    this.mockData.set('CUSTOMERS', [
      { id: 'C001', name: 'SC Example SRL', cui: 'RO12345678', address: 'Strada Principală 1, București', email: 'contact@example.ro', phone: '0721000001', balance: 1190 },
      { id: 'C002', name: 'SC Test SA', cui: 'RO87654321', address: 'Bulevardul Unirii 10, Cluj', email: 'office@test.ro', phone: '0722000002', balance: 2975 },
    ]);

    this.mockData.set('PRODUCTS', [
      { id: 'P001', code: 'PROD-001', name: 'Produs Standard', nameRo: 'Produs Standard', price: 100, vat: 19, stock: 50, category: 'Electronics' },
      { id: 'P002', code: 'PROD-002', name: 'Serviciu Premium', nameRo: 'Serviciu Premium', price: 250, vat: 19, stock: 0, category: 'Services' },
    ]);

    this.mockData.set('EMPLOYEES', [
      { id: 'E001', name: 'Ion Popescu', cnp: '1900101123456', position: 'Manager', department: 'Sales', salary: 8000, startDate: new Date('2020-01-15') },
      { id: 'E002', name: 'Maria Ionescu', cnp: '2950202234567', position: 'Contabil', department: 'Finance', salary: 6000, startDate: new Date('2021-03-01') },
    ]);

    this.mockData.set('TRANSACTIONS', [
      { id: 'T001', date: new Date('2025-01-15'), type: 'INCOME', description: 'Plată factură F2025-0001', amount: 1190, balance: 10190 },
      { id: 'T002', date: new Date('2025-01-18'), type: 'EXPENSE', description: 'Plată furnizor', amount: -500, balance: 9690 },
    ]);
  }

  private initializeBuiltInTemplates(): void {
    const invoiceTemplate: ExportTemplate = {
      id: 'tpl-invoices-default',
      name: 'Invoice Export',
      nameRo: 'Export Facturi',
      description: 'Default invoice export template',
      descriptionRo: 'Șablon implicit pentru export facturi',
      dataType: 'INVOICES',
      format: 'XLSX',
      columns: [
        { field: 'number', header: 'Invoice Number', headerRo: 'Număr Factură', type: 'STRING', width: 15 },
        { field: 'customer', header: 'Customer', headerRo: 'Client', type: 'STRING', width: 30 },
        { field: 'cui', header: 'CUI', headerRo: 'CUI', type: 'STRING', width: 15 },
        { field: 'date', header: 'Date', headerRo: 'Data', type: 'DATE', format: 'DD.MM.YYYY', width: 12 },
        { field: 'amount', header: 'Amount', headerRo: 'Suma', type: 'CURRENCY', width: 15, alignment: 'RIGHT' },
        { field: 'vat', header: 'VAT', headerRo: 'TVA', type: 'CURRENCY', width: 12, alignment: 'RIGHT' },
        { field: 'total', header: 'Total', headerRo: 'Total', type: 'CURRENCY', width: 15, alignment: 'RIGHT' },
        { field: 'status', header: 'Status', headerRo: 'Status', type: 'STRING', width: 12 },
      ],
      isDefault: true,
      isBuiltIn: true,
      createdAt: new Date(),
    };

    const customerTemplate: ExportTemplate = {
      id: 'tpl-customers-default',
      name: 'Customer Export',
      nameRo: 'Export Clienți',
      description: 'Default customer export template',
      descriptionRo: 'Șablon implicit pentru export clienți',
      dataType: 'CUSTOMERS',
      format: 'XLSX',
      columns: [
        { field: 'name', header: 'Name', headerRo: 'Nume', type: 'STRING', width: 30 },
        { field: 'cui', header: 'CUI', headerRo: 'CUI', type: 'STRING', width: 15 },
        { field: 'address', header: 'Address', headerRo: 'Adresa', type: 'STRING', width: 40 },
        { field: 'email', header: 'Email', headerRo: 'Email', type: 'STRING', width: 25 },
        { field: 'phone', header: 'Phone', headerRo: 'Telefon', type: 'STRING', width: 15 },
        { field: 'balance', header: 'Balance', headerRo: 'Sold', type: 'CURRENCY', width: 15, alignment: 'RIGHT' },
      ],
      isDefault: true,
      isBuiltIn: true,
      createdAt: new Date(),
    };

    const vatReportTemplate: ExportTemplate = {
      id: 'tpl-vat-report',
      name: 'VAT Report Export',
      nameRo: 'Export Raport TVA',
      description: 'VAT report for ANAF submission',
      descriptionRo: 'Raport TVA pentru depunere ANAF',
      dataType: 'VAT_REPORT',
      format: 'XML',
      columns: [
        { field: 'period', header: 'Period', headerRo: 'Perioada', type: 'STRING', width: 15 },
        { field: 'taxableBase', header: 'Taxable Base', headerRo: 'Baza Impozabilă', type: 'CURRENCY', width: 15 },
        { field: 'vatCollected', header: 'VAT Collected', headerRo: 'TVA Colectat', type: 'CURRENCY', width: 15 },
        { field: 'vatDeductible', header: 'VAT Deductible', headerRo: 'TVA Deductibil', type: 'CURRENCY', width: 15 },
        { field: 'vatDue', header: 'VAT Due', headerRo: 'TVA de Plată', type: 'CURRENCY', width: 15 },
      ],
      isDefault: true,
      isBuiltIn: true,
      createdAt: new Date(),
    };

    const employeeTemplate: ExportTemplate = {
      id: 'tpl-employees-default',
      name: 'Employee Export',
      nameRo: 'Export Angajați',
      description: 'Default employee export template',
      descriptionRo: 'Șablon implicit pentru export angajați',
      dataType: 'EMPLOYEES',
      format: 'XLSX',
      columns: [
        { field: 'name', header: 'Name', headerRo: 'Nume', type: 'STRING', width: 25 },
        { field: 'position', header: 'Position', headerRo: 'Funcție', type: 'STRING', width: 20 },
        { field: 'department', header: 'Department', headerRo: 'Departament', type: 'STRING', width: 15 },
        { field: 'salary', header: 'Salary', headerRo: 'Salariu', type: 'CURRENCY', width: 15, alignment: 'RIGHT' },
        { field: 'startDate', header: 'Start Date', headerRo: 'Data Angajării', type: 'DATE', format: 'DD.MM.YYYY', width: 15 },
      ],
      isDefault: true,
      isBuiltIn: true,
      createdAt: new Date(),
    };

    const transactionTemplate: ExportTemplate = {
      id: 'tpl-transactions-default',
      name: 'Transaction Export',
      nameRo: 'Export Tranzacții',
      description: 'Default transaction export template',
      descriptionRo: 'Șablon implicit pentru export tranzacții',
      dataType: 'TRANSACTIONS',
      format: 'CSV',
      columns: [
        { field: 'date', header: 'Date', headerRo: 'Data', type: 'DATE', format: 'DD.MM.YYYY', width: 12 },
        { field: 'type', header: 'Type', headerRo: 'Tip', type: 'STRING', width: 10 },
        { field: 'description', header: 'Description', headerRo: 'Descriere', type: 'STRING', width: 40 },
        { field: 'amount', header: 'Amount', headerRo: 'Suma', type: 'CURRENCY', width: 15, alignment: 'RIGHT' },
        { field: 'balance', header: 'Balance', headerRo: 'Sold', type: 'CURRENCY', width: 15, alignment: 'RIGHT' },
      ],
      isDefault: true,
      isBuiltIn: true,
      createdAt: new Date(),
    };

    this.templates.set(invoiceTemplate.id, invoiceTemplate);
    this.templates.set(customerTemplate.id, customerTemplate);
    this.templates.set(vatReportTemplate.id, vatReportTemplate);
    this.templates.set(employeeTemplate.id, employeeTemplate);
    this.templates.set(transactionTemplate.id, transactionTemplate);
  }

  async createExport(dto: CreateExportDto): Promise<ExportRequest> {
    let columns = dto.columns;
    let filters = dto.filters;
    let sortBy = dto.sortBy;

    if (dto.templateId) {
      const template = this.templates.get(dto.templateId);
      if (template) {
        columns = columns || template.columns;
        filters = filters || template.filters;
        sortBy = sortBy || template.sortBy;
      }
    }

    if (!columns || columns.length === 0) {
      throw new Error('Export columns are required');
    }

    const data = this.mockData.get(dto.dataType) || [];
    const fileName = dto.fileName || this.generateFileName(dto.dataType, dto.format);

    const exportRequest: ExportRequest = {
      id: this.generateId('exp'),
      templateId: dto.templateId,
      dataType: dto.dataType,
      format: dto.format,
      columns,
      filters,
      sortBy,
      dateRange: dto.dateRange,
      locale: dto.locale || 'ro',
      currency: dto.currency || 'RON',
      includeHeaders: dto.includeHeaders !== false,
      includeTotals: dto.includeTotals || false,
      fileName,
      status: 'PENDING',
      progress: 0,
      totalRecords: data.length,
      processedRecords: 0,
      fileSize: 0,
      organizationId: dto.organizationId,
      requestedBy: dto.requestedBy,
      requestedAt: new Date(),
    };

    this.exports.set(exportRequest.id, exportRequest);
    this.eventEmitter.emit('export.created', { export: exportRequest });

    // Process export
    await this.processExport(exportRequest.id);

    return this.exports.get(exportRequest.id)!;
  }

  private generateFileName(dataType: ExportDataType, format: ExportFormat): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const extension = this.getExtension(format);
    return dataType.toLowerCase() + '_export_' + timestamp + '.' + extension;
  }

  private getExtension(format: ExportFormat): string {
    const extensions: Record<ExportFormat, string> = {
      CSV: 'csv',
      XLSX: 'xlsx',
      PDF: 'pdf',
      JSON: 'json',
      XML: 'xml',
      SAF_T: 'xml',
      E_FACTURA: 'xml',
    };
    return extensions[format];
  }

  private async processExport(exportId: string): Promise<void> {
    const exportRequest = this.exports.get(exportId);
    if (!exportRequest) {
      throw new Error('Export not found');
    }

    exportRequest.status = 'PROCESSING';
    exportRequest.startedAt = new Date();
    this.eventEmitter.emit('export.started', { exportId });

    try {
      const data = this.mockData.get(exportRequest.dataType) || [];
      let filteredData = this.applyFilters(data, exportRequest.filters);
      filteredData = this.applySorting(filteredData, exportRequest.sortBy);

      if (exportRequest.dateRange) {
        filteredData = this.applyDateRange(filteredData, exportRequest.dateRange);
      }

      const content = await this.generateContent(filteredData, exportRequest);
      const fileSize = content.length;

      exportRequest.status = 'COMPLETED';
      exportRequest.progress = 100;
      exportRequest.processedRecords = filteredData.length;
      exportRequest.fileSize = fileSize;
      exportRequest.completedAt = new Date();
      exportRequest.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      exportRequest.downloadUrl = '/api/exports/' + exportRequest.id + '/download';
      exportRequest.filePath = '/exports/' + exportRequest.fileName;

      this.eventEmitter.emit('export.completed', { exportId, fileSize, recordCount: filteredData.length });
    } catch (error: any) {
      exportRequest.status = 'FAILED';
      exportRequest.errorMessage = error.message;
      exportRequest.completedAt = new Date();
      this.eventEmitter.emit('export.failed', { exportId, error: error.message });
    }
  }

  private applyFilters(data: any[], filters?: ExportFilter[]): any[] {
    if (!filters || filters.length === 0) return data;

    return data.filter(item => {
      return filters.every(filter => {
        const value = item[filter.field];
        switch (filter.operator) {
          case 'EQUALS':
            return value === filter.value;
          case 'NOT_EQUALS':
            return value !== filter.value;
          case 'GREATER_THAN':
            return value > filter.value;
          case 'LESS_THAN':
            return value < filter.value;
          case 'BETWEEN':
            return value >= filter.value && value <= filter.valueEnd;
          case 'IN':
            return Array.isArray(filter.value) && filter.value.includes(value);
          case 'CONTAINS':
            return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
          case 'IS_NULL':
            return value === null || value === undefined;
          default:
            return true;
        }
      });
    });
  }

  private applySorting(data: any[], sortBy?: ExportSort[]): any[] {
    if (!sortBy || sortBy.length === 0) return data;

    return [...data].sort((a, b) => {
      for (const sort of sortBy) {
        const aVal = a[sort.field];
        const bVal = b[sort.field];
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        if (comparison !== 0) {
          return sort.direction === 'ASC' ? comparison : -comparison;
        }
      }
      return 0;
    });
  }

  private applyDateRange(data: any[], dateRange: { start: Date; end: Date }): any[] {
    return data.filter(item => {
      const date = item.date || item.createdAt;
      if (!date) return true;
      const itemDate = new Date(date);
      return itemDate >= dateRange.start && itemDate <= dateRange.end;
    });
  }

  private async generateContent(data: any[], exportRequest: ExportRequest): Promise<string> {
    const locale = exportRequest.locale;
    const columns = exportRequest.columns;

    switch (exportRequest.format) {
      case 'CSV':
        return this.generateCSV(data, columns, locale, exportRequest.includeHeaders);
      case 'JSON':
        return this.generateJSON(data, columns);
      case 'XML':
        return this.generateXML(data, columns, exportRequest.dataType);
      case 'XLSX':
        return this.generateXLSX(data, columns, locale);
      case 'PDF':
        return this.generatePDF(data, columns, locale);
      case 'SAF_T':
        return this.generateSAFT(data);
      case 'E_FACTURA':
        return this.generateEFactura(data);
      default:
        return this.generateCSV(data, columns, locale, true);
    }
  }

  private generateCSV(data: any[], columns: ExportColumn[], locale: string, includeHeaders: boolean): string {
    const lines: string[] = [];

    if (includeHeaders) {
      const headers = columns.map(col => locale === 'ro' ? col.headerRo : col.header);
      lines.push(headers.join(','));
    }

    for (const row of data) {
      const values = columns.map(col => {
        const value = row[col.field];
        return this.formatValue(value, col);
      });
      lines.push(values.join(','));
    }

    return lines.join('\n');
  }

  private generateJSON(data: any[], columns: ExportColumn[]): string {
    const filtered = data.map(row => {
      const obj: Record<string, any> = {};
      columns.forEach(col => {
        obj[col.field] = row[col.field];
      });
      return obj;
    });
    return JSON.stringify(filtered, null, 2);
  }

  private generateXML(data: any[], columns: ExportColumn[], dataType: ExportDataType): string {
    const lines: string[] = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<export>');
    lines.push('  <metadata>');
    lines.push('    <dataType>' + dataType + '</dataType>');
    lines.push('    <generatedAt>' + new Date().toISOString() + '</generatedAt>');
    lines.push('    <recordCount>' + data.length + '</recordCount>');
    lines.push('  </metadata>');
    lines.push('  <records>');

    for (const row of data) {
      lines.push('    <record>');
      columns.forEach(col => {
        const value = row[col.field];
        lines.push('      <' + col.field + '>' + this.escapeXML(String(value || '')) + '</' + col.field + '>');
      });
      lines.push('    </record>');
    }

    lines.push('  </records>');
    lines.push('</export>');
    return lines.join('\n');
  }

  private generateXLSX(data: any[], columns: ExportColumn[], locale: string): string {
    // Simulate XLSX content - in production would use xlsx library
    return 'XLSX:' + JSON.stringify({ data, columns, locale });
  }

  private generatePDF(data: any[], columns: ExportColumn[], locale: string): string {
    // Simulate PDF content - in production would use pdfkit/puppeteer
    return 'PDF:' + JSON.stringify({ data, columns, locale });
  }

  private generateSAFT(data: any[]): string {
    // SAF-T Romania format
    const lines: string[] = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:RO_1.0">');
    lines.push('  <Header>');
    lines.push('    <AuditFileVersion>RO_1.0</AuditFileVersion>');
    lines.push('    <AuditFileCountry>RO</AuditFileCountry>');
    lines.push('    <AuditFileDateCreated>' + new Date().toISOString().slice(0, 10) + '</AuditFileDateCreated>');
    lines.push('    <SoftwareCompanyName>DocumentIulia</SoftwareCompanyName>');
    lines.push('    <SoftwareID>DOCUMENTIULIA-ERP</SoftwareID>');
    lines.push('    <SoftwareVersion>1.0</SoftwareVersion>');
    lines.push('  </Header>');
    lines.push('  <MasterFiles>');
    lines.push('    <!-- Master data would go here -->');
    lines.push('  </MasterFiles>');
    lines.push('  <GeneralLedgerEntries>');
    lines.push('    <NumberOfEntries>' + data.length + '</NumberOfEntries>');
    lines.push('    <!-- Entries would go here -->');
    lines.push('  </GeneralLedgerEntries>');
    lines.push('</AuditFile>');
    return lines.join('\n');
  }

  private generateEFactura(data: any[]): string {
    // e-Factura Romania format (UBL 2.1)
    const lines: string[] = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"');
    lines.push('  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"');
    lines.push('  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">');
    lines.push('  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1</cbc:CustomizationID>');
    lines.push('  <cbc:ID>E-FACTURA-BATCH</cbc:ID>');
    lines.push('  <cbc:IssueDate>' + new Date().toISOString().slice(0, 10) + '</cbc:IssueDate>');
    lines.push('  <!-- Invoice details would go here -->');
    lines.push('</Invoice>');
    return lines.join('\n');
  }

  private formatValue(value: any, column: ExportColumn): string {
    if (value === null || value === undefined) return '';

    switch (column.type) {
      case 'DATE':
        const date = new Date(value);
        if (column.format === 'DD.MM.YYYY') {
          return date.getDate().toString().padStart(2, '0') + '.' +
                 (date.getMonth() + 1).toString().padStart(2, '0') + '.' +
                 date.getFullYear();
        }
        return date.toISOString().slice(0, 10);
      case 'CURRENCY':
        return Number(value).toFixed(2);
      case 'PERCENTAGE':
        return (Number(value) * 100).toFixed(2) + '%';
      case 'BOOLEAN':
        return value ? 'Da' : 'Nu';
      default:
        return String(value).includes(',') ? '"' + value + '"' : String(value);
    }
  }

  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  async getExport(exportId: string): Promise<ExportRequest | null> {
    return this.exports.get(exportId) || null;
  }

  async listExports(organizationId: string, options?: {
    dataType?: ExportDataType;
    format?: ExportFormat;
    status?: ExportStatus;
    page?: number;
    limit?: number;
  }): Promise<{ exports: ExportRequest[]; total: number }> {
    let exports = Array.from(this.exports.values())
      .filter(e => e.organizationId === organizationId);

    if (options?.dataType) {
      exports = exports.filter(e => e.dataType === options.dataType);
    }
    if (options?.format) {
      exports = exports.filter(e => e.format === options.format);
    }
    if (options?.status) {
      exports = exports.filter(e => e.status === options.status);
    }

    exports.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());

    const total = exports.length;
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const start = (page - 1) * limit;

    return {
      exports: exports.slice(start, start + limit),
      total,
    };
  }

  async cancelExport(exportId: string): Promise<ExportRequest> {
    const exportRequest = this.exports.get(exportId);
    if (!exportRequest) {
      throw new Error('Export not found');
    }

    if (!['PENDING', 'PROCESSING'].includes(exportRequest.status)) {
      throw new Error('Export cannot be cancelled');
    }

    exportRequest.status = 'CANCELLED';
    exportRequest.completedAt = new Date();
    this.eventEmitter.emit('export.cancelled', { exportId });
    return exportRequest;
  }

  async deleteExport(exportId: string): Promise<void> {
    const exportRequest = this.exports.get(exportId);
    if (!exportRequest) {
      throw new Error('Export not found');
    }

    this.exports.delete(exportId);
    this.eventEmitter.emit('export.deleted', { exportId });
  }

  async downloadExport(exportId: string): Promise<{ content: string; fileName: string; contentType: string }> {
    const exportRequest = this.exports.get(exportId);
    if (!exportRequest) {
      throw new Error('Export not found');
    }

    if (exportRequest.status !== 'COMPLETED') {
      throw new Error('Export is not ready for download');
    }

    if (exportRequest.expiresAt && new Date() > exportRequest.expiresAt) {
      exportRequest.status = 'EXPIRED';
      throw new Error('Export has expired');
    }

    const data = this.mockData.get(exportRequest.dataType) || [];
    const content = await this.generateContent(data, exportRequest);

    const contentTypes: Record<ExportFormat, string> = {
      CSV: 'text/csv',
      XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      PDF: 'application/pdf',
      JSON: 'application/json',
      XML: 'application/xml',
      SAF_T: 'application/xml',
      E_FACTURA: 'application/xml',
    };

    return {
      content,
      fileName: exportRequest.fileName,
      contentType: contentTypes[exportRequest.format],
    };
  }

  async previewExport(dto: CreateExportDto, limit: number = 10): Promise<ExportPreview> {
    const data = this.mockData.get(dto.dataType) || [];
    let filteredData = this.applyFilters(data, dto.filters);

    if (dto.dateRange) {
      filteredData = this.applyDateRange(filteredData, dto.dateRange);
    }

    const columns = dto.columns || this.getDefaultColumns(dto.dataType);
    const previewData = filteredData.slice(0, limit);

    return {
      columns: columns.map(c => dto.locale === 'en' ? c.header : c.headerRo),
      rows: previewData.map(row => columns.map(col => row[col.field])),
      totalRecords: filteredData.length,
      hasMore: filteredData.length > limit,
    };
  }

  private getDefaultColumns(dataType: ExportDataType): ExportColumn[] {
    const template = Array.from(this.templates.values())
      .find(t => t.dataType === dataType && t.isDefault);
    return template?.columns || [];
  }

  async createTemplate(dto: CreateTemplateDto): Promise<ExportTemplate> {
    const template: ExportTemplate = {
      id: this.generateId('tpl'),
      name: dto.name,
      nameRo: dto.nameRo,
      description: dto.description,
      descriptionRo: dto.descriptionRo,
      dataType: dto.dataType,
      format: dto.format,
      columns: dto.columns,
      filters: dto.filters,
      sortBy: dto.sortBy,
      isDefault: false,
      isBuiltIn: false,
      organizationId: dto.organizationId,
      createdBy: dto.createdBy,
      createdAt: new Date(),
    };

    this.templates.set(template.id, template);
    this.eventEmitter.emit('template.created', { template });
    return template;
  }

  async getTemplate(templateId: string): Promise<ExportTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  async listTemplates(options?: {
    organizationId?: string;
    dataType?: ExportDataType;
    format?: ExportFormat;
  }): Promise<ExportTemplate[]> {
    let templates = Array.from(this.templates.values());

    if (options?.organizationId) {
      templates = templates.filter(t => t.isBuiltIn || t.organizationId === options.organizationId);
    }
    if (options?.dataType) {
      templates = templates.filter(t => t.dataType === options.dataType);
    }
    if (options?.format) {
      templates = templates.filter(t => t.format === options.format);
    }

    return templates.sort((a, b) => {
      if (a.isBuiltIn !== b.isBuiltIn) return a.isBuiltIn ? -1 : 1;
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  async updateTemplate(templateId: string, updates: Partial<ExportTemplate>): Promise<ExportTemplate> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    if (template.isBuiltIn) {
      throw new Error('Built-in templates cannot be modified');
    }

    const updated = { ...template, ...updates };
    this.templates.set(templateId, updated);
    this.eventEmitter.emit('template.updated', { template: updated });
    return updated;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    if (template.isBuiltIn) {
      throw new Error('Built-in templates cannot be deleted');
    }

    this.templates.delete(templateId);
    this.eventEmitter.emit('template.deleted', { templateId });
  }

  async getExportStats(organizationId: string): Promise<ExportStats> {
    const exports = Array.from(this.exports.values())
      .filter(e => e.organizationId === organizationId);

    const completed = exports.filter(e => e.status === 'COMPLETED');
    const processingTimes = completed
      .filter(e => e.startedAt && e.completedAt)
      .map(e => e.completedAt!.getTime() - e.startedAt!.getTime());

    const exportsByFormat: Record<ExportFormat, number> = {
      CSV: 0, XLSX: 0, PDF: 0, JSON: 0, XML: 0, SAF_T: 0, E_FACTURA: 0,
    };
    const exportsByDataType: Record<ExportDataType, number> = {
      INVOICES: 0, CUSTOMERS: 0, PRODUCTS: 0, TRANSACTIONS: 0, EMPLOYEES: 0,
      PAYROLL: 0, INVENTORY: 0, ORDERS: 0, PAYMENTS: 0, VAT_REPORT: 0, AUDIT_LOG: 0, CUSTOM: 0,
    };

    exports.forEach(e => {
      exportsByFormat[e.format]++;
      exportsByDataType[e.dataType]++;
    });

    return {
      totalExports: exports.length,
      completedExports: completed.length,
      failedExports: exports.filter(e => e.status === 'FAILED').length,
      totalSize: completed.reduce((sum, e) => sum + e.fileSize, 0),
      exportsByFormat,
      exportsByDataType,
      averageProcessingTime: processingTimes.length > 0
        ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
        : 0,
    };
  }

  async getSupportedFormats(): Promise<{ format: ExportFormat; name: string; nameRo: string; extension: string }[]> {
    return [
      { format: 'CSV', name: 'Comma-Separated Values', nameRo: 'Valori Separate prin Virgulă', extension: 'csv' },
      { format: 'XLSX', name: 'Excel Spreadsheet', nameRo: 'Foaie de Calcul Excel', extension: 'xlsx' },
      { format: 'PDF', name: 'PDF Document', nameRo: 'Document PDF', extension: 'pdf' },
      { format: 'JSON', name: 'JSON Data', nameRo: 'Date JSON', extension: 'json' },
      { format: 'XML', name: 'XML Document', nameRo: 'Document XML', extension: 'xml' },
      { format: 'SAF_T', name: 'SAF-T Romania', nameRo: 'SAF-T România', extension: 'xml' },
      { format: 'E_FACTURA', name: 'e-Factura UBL', nameRo: 'e-Factura UBL', extension: 'xml' },
    ];
  }

  async getDataTypes(): Promise<{ type: ExportDataType; name: string; nameRo: string }[]> {
    return [
      { type: 'INVOICES', name: 'Invoices', nameRo: 'Facturi' },
      { type: 'CUSTOMERS', name: 'Customers', nameRo: 'Clienți' },
      { type: 'PRODUCTS', name: 'Products', nameRo: 'Produse' },
      { type: 'TRANSACTIONS', name: 'Transactions', nameRo: 'Tranzacții' },
      { type: 'EMPLOYEES', name: 'Employees', nameRo: 'Angajați' },
      { type: 'PAYROLL', name: 'Payroll', nameRo: 'Salarizare' },
      { type: 'INVENTORY', name: 'Inventory', nameRo: 'Inventar' },
      { type: 'ORDERS', name: 'Orders', nameRo: 'Comenzi' },
      { type: 'PAYMENTS', name: 'Payments', nameRo: 'Plăți' },
      { type: 'VAT_REPORT', name: 'VAT Report', nameRo: 'Raport TVA' },
      { type: 'AUDIT_LOG', name: 'Audit Log', nameRo: 'Jurnal Audit' },
      { type: 'CUSTOM', name: 'Custom', nameRo: 'Personalizat' },
    ];
  }

  async scheduleExport(dto: CreateExportDto, schedule: { cron: string; timezone: string }): Promise<{ scheduleId: string; nextRun: Date }> {
    // In production, would integrate with a scheduler like Bull/Agenda
    const scheduleId = this.generateId('sched');
    const nextRun = new Date(Date.now() + 3600000); // 1 hour from now

    this.eventEmitter.emit('export.scheduled', { scheduleId, dto, schedule });

    return { scheduleId, nextRun };
  }

  async cleanupExpiredExports(): Promise<number> {
    const now = new Date();
    let cleaned = 0;

    for (const [id, exp] of this.exports) {
      if (exp.expiresAt && exp.expiresAt < now) {
        exp.status = 'EXPIRED';
        this.exports.delete(id);
        cleaned++;
      }
    }

    this.eventEmitter.emit('exports.cleaned', { count: cleaned });
    return cleaned;
  }
}
