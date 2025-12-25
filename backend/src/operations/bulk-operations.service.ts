import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Types
export type BulkOperationType = 'create' | 'update' | 'delete' | 'import' | 'export';
export type BulkOperationStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type ExportFormat = 'csv' | 'excel' | 'json' | 'pdf';
export type EntityType = 'invoice' | 'customer' | 'product' | 'employee' | 'transaction' | 'order';

// Interfaces
export interface BulkOperation {
  id: string;
  tenantId: string;
  userId: string;
  type: BulkOperationType;
  entityType: EntityType;
  status: BulkOperationStatus;
  totalItems: number;
  processedItems: number;
  successCount: number;
  errorCount: number;
  errors: BulkOperationError[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  options: BulkOperationOptions;
  result?: BulkOperationResult;
}

export interface BulkOperationOptions {
  batchSize?: number;
  skipValidation?: boolean;
  stopOnError?: boolean;
  dryRun?: boolean;
  mapping?: FieldMapping[];
  filters?: Record<string, any>;
  exportFormat?: ExportFormat;
  includeHeaders?: boolean;
  dateFormat?: string;
  numberFormat?: string;
}

export interface BulkOperationError {
  index: number;
  item: Record<string, any>;
  field?: string;
  message: string;
  code: string;
}

export interface BulkOperationResult {
  createdIds?: string[];
  updatedIds?: string[];
  deletedIds?: string[];
  exportData?: string;
  exportFilename?: string;
  summary: Record<string, any>;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: FieldTransform;
  defaultValue?: any;
  required?: boolean;
}

export type FieldTransform = 'uppercase' | 'lowercase' | 'trim' | 'number' | 'date' | 'boolean' | 'custom';

export interface ImportConfig {
  entityType: EntityType;
  mapping: FieldMapping[];
  validation: ValidationRule[];
  uniqueFields?: string[];
  updateOnConflict?: boolean;
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'range' | 'unique' | 'reference' | 'custom';
  value?: any;
  message: string;
}

export interface ExportConfig {
  entityType: EntityType;
  format: ExportFormat;
  columns: ExportColumn[];
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export interface ExportColumn {
  field: string;
  header: string;
  width?: number;
  format?: string;
}

export interface ImportTemplate {
  id: string;
  tenantId: string;
  name: string;
  entityType: EntityType;
  config: ImportConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportTemplate {
  id: string;
  tenantId: string;
  name: string;
  entityType: EntityType;
  config: ExportConfig;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class BulkOperationsService {
  private readonly logger = new Logger(BulkOperationsService.name);

  // In-memory storage
  private operations: Map<string, BulkOperation> = new Map();
  private importTemplates: Map<string, ImportTemplate> = new Map();
  private exportTemplates: Map<string, ExportTemplate> = new Map();

  // Mock data storage for operations
  private mockData: Map<string, Map<string, Record<string, any>>> = new Map();

  // ID counters
  private operationIdCounter = 0;
  private templateIdCounter = 0;

  constructor(private configService: ConfigService) {
    this.initializeDefaultTemplates();
  }

  private generateId(prefix: string, counter: number): string {
    return `${prefix}-${counter}-${Date.now()}`;
  }

  private initializeDefaultTemplates(): void {
    // Default invoice import template
    const invoiceImport: ImportTemplate = {
      id: 'import-template-invoice',
      tenantId: '*',
      name: 'Standard Invoice Import',
      entityType: 'invoice',
      config: {
        entityType: 'invoice',
        mapping: [
          { sourceField: 'invoice_number', targetField: 'invoiceNumber', required: true },
          { sourceField: 'customer_name', targetField: 'customerName', required: true },
          { sourceField: 'amount', targetField: 'amount', transform: 'number', required: true },
          { sourceField: 'date', targetField: 'date', transform: 'date' },
          { sourceField: 'due_date', targetField: 'dueDate', transform: 'date' },
          { sourceField: 'vat_rate', targetField: 'vatRate', transform: 'number', defaultValue: 19 },
        ],
        validation: [
          { field: 'invoiceNumber', type: 'required', message: 'Invoice number is required' },
          { field: 'amount', type: 'range', value: { min: 0 }, message: 'Amount must be positive' },
        ],
        uniqueFields: ['invoiceNumber'],
        updateOnConflict: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.importTemplates.set(invoiceImport.id, invoiceImport);
    this.logger.log('Initialized default templates');
  }

  // =================== BULK OPERATIONS ===================

  async createBulkOperation(
    tenantId: string,
    userId: string,
    type: BulkOperationType,
    entityType: EntityType,
    totalItems: number,
    options?: BulkOperationOptions,
  ): Promise<BulkOperation> {
    const operation: BulkOperation = {
      id: this.generateId('bulk', ++this.operationIdCounter),
      tenantId,
      userId,
      type,
      entityType,
      status: 'pending',
      totalItems,
      processedItems: 0,
      successCount: 0,
      errorCount: 0,
      errors: [],
      createdAt: new Date(),
      options: options || {},
    };

    this.operations.set(operation.id, operation);
    return operation;
  }

  async getOperation(operationId: string): Promise<BulkOperation | null> {
    return this.operations.get(operationId) || null;
  }

  async getOperations(
    tenantId: string,
    filters?: {
      type?: BulkOperationType;
      entityType?: EntityType;
      status?: BulkOperationStatus;
      userId?: string;
    },
    limit: number = 50,
  ): Promise<BulkOperation[]> {
    let operations = Array.from(this.operations.values())
      .filter(o => o.tenantId === tenantId);

    if (filters?.type) {
      operations = operations.filter(o => o.type === filters.type);
    }
    if (filters?.entityType) {
      operations = operations.filter(o => o.entityType === filters.entityType);
    }
    if (filters?.status) {
      operations = operations.filter(o => o.status === filters.status);
    }
    if (filters?.userId) {
      operations = operations.filter(o => o.userId === filters.userId);
    }

    return operations
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async cancelOperation(operationId: string): Promise<BulkOperation | null> {
    const operation = this.operations.get(operationId);
    if (!operation) return null;

    if (operation.status === 'completed' || operation.status === 'failed') {
      return operation;
    }

    operation.status = 'cancelled';
    operation.completedAt = new Date();
    this.operations.set(operationId, operation);
    return operation;
  }

  async getOperationProgress(operationId: string): Promise<{
    progress: number;
    status: BulkOperationStatus;
    processedItems: number;
    totalItems: number;
    successCount: number;
    errorCount: number;
  } | null> {
    const operation = this.operations.get(operationId);
    if (!operation) return null;

    return {
      progress: operation.totalItems > 0
        ? Math.round((operation.processedItems / operation.totalItems) * 100)
        : 0,
      status: operation.status,
      processedItems: operation.processedItems,
      totalItems: operation.totalItems,
      successCount: operation.successCount,
      errorCount: operation.errorCount,
    };
  }

  // =================== BULK CREATE ===================

  async bulkCreate(
    tenantId: string,
    userId: string,
    entityType: EntityType,
    items: Record<string, any>[],
    options?: BulkOperationOptions,
  ): Promise<BulkOperation> {
    const operation = await this.createBulkOperation(
      tenantId,
      userId,
      'create',
      entityType,
      items.length,
      options,
    );

    operation.status = 'processing';
    operation.startedAt = new Date();

    const batchSize = options?.batchSize || 100;
    const createdIds: string[] = [];

    // Initialize mock storage for tenant/entity if needed
    const storageKey = `${tenantId}:${entityType}`;
    if (!this.mockData.has(storageKey)) {
      this.mockData.set(storageKey, new Map());
    }
    const entityStorage = this.mockData.get(storageKey)!;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Validate if not skipped
      if (!options?.skipValidation) {
        const validation = this.validateItem(item, entityType);
        if (!validation.valid) {
          operation.errors.push({
            index: i,
            item,
            field: validation.field,
            message: validation.message || 'Validation failed',
            code: 'VALIDATION_ERROR',
          });
          operation.errorCount++;
          operation.processedItems++;

          if (options?.stopOnError) {
            operation.status = 'failed';
            break;
          }
          continue;
        }
      }

      // Create the item (mock)
      if (!options?.dryRun) {
        const id = this.generateId(entityType, Date.now() + i);
        const record = { id, ...item, createdAt: new Date() };
        entityStorage.set(id, record);
        createdIds.push(id);
      }

      operation.successCount++;
      operation.processedItems++;
    }

    operation.status = operation.errors.length > 0 && options?.stopOnError ? 'failed' : 'completed';
    operation.completedAt = new Date();
    operation.result = {
      createdIds,
      summary: {
        created: createdIds.length,
        errors: operation.errorCount,
      },
    };

    this.operations.set(operation.id, operation);
    return operation;
  }

  // =================== BULK UPDATE ===================

  async bulkUpdate(
    tenantId: string,
    userId: string,
    entityType: EntityType,
    updates: { id: string; data: Record<string, any> }[],
    options?: BulkOperationOptions,
  ): Promise<BulkOperation> {
    const operation = await this.createBulkOperation(
      tenantId,
      userId,
      'update',
      entityType,
      updates.length,
      options,
    );

    operation.status = 'processing';
    operation.startedAt = new Date();

    const updatedIds: string[] = [];
    const storageKey = `${tenantId}:${entityType}`;
    const entityStorage = this.mockData.get(storageKey);

    for (let i = 0; i < updates.length; i++) {
      const { id, data } = updates[i];

      // Check if exists
      if (!entityStorage?.has(id)) {
        operation.errors.push({
          index: i,
          item: { id, data },
          message: `Entity ${id} not found`,
          code: 'NOT_FOUND',
        });
        operation.errorCount++;
        operation.processedItems++;

        if (options?.stopOnError) {
          operation.status = 'failed';
          break;
        }
        continue;
      }

      // Validate if not skipped
      if (!options?.skipValidation) {
        const validation = this.validateItem(data, entityType);
        if (!validation.valid) {
          operation.errors.push({
            index: i,
            item: { id, data },
            field: validation.field,
            message: validation.message || 'Validation failed',
            code: 'VALIDATION_ERROR',
          });
          operation.errorCount++;
          operation.processedItems++;

          if (options?.stopOnError) {
            operation.status = 'failed';
            break;
          }
          continue;
        }
      }

      // Update the item
      if (!options?.dryRun) {
        const existing = entityStorage.get(id)!;
        const updated = { ...existing, ...data, updatedAt: new Date() };
        entityStorage.set(id, updated);
        updatedIds.push(id);
      }

      operation.successCount++;
      operation.processedItems++;
    }

    operation.status = operation.errors.length > 0 && options?.stopOnError ? 'failed' : 'completed';
    operation.completedAt = new Date();
    operation.result = {
      updatedIds,
      summary: {
        updated: updatedIds.length,
        errors: operation.errorCount,
      },
    };

    this.operations.set(operation.id, operation);
    return operation;
  }

  // =================== BULK DELETE ===================

  async bulkDelete(
    tenantId: string,
    userId: string,
    entityType: EntityType,
    ids: string[],
    options?: BulkOperationOptions,
  ): Promise<BulkOperation> {
    const operation = await this.createBulkOperation(
      tenantId,
      userId,
      'delete',
      entityType,
      ids.length,
      options,
    );

    operation.status = 'processing';
    operation.startedAt = new Date();

    const deletedIds: string[] = [];
    const storageKey = `${tenantId}:${entityType}`;
    const entityStorage = this.mockData.get(storageKey);

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];

      // Check if exists
      if (!entityStorage?.has(id)) {
        operation.errors.push({
          index: i,
          item: { id },
          message: `Entity ${id} not found`,
          code: 'NOT_FOUND',
        });
        operation.errorCount++;
        operation.processedItems++;

        if (options?.stopOnError) {
          operation.status = 'failed';
          break;
        }
        continue;
      }

      // Delete the item
      if (!options?.dryRun) {
        entityStorage.delete(id);
        deletedIds.push(id);
      }

      operation.successCount++;
      operation.processedItems++;
    }

    operation.status = operation.errors.length > 0 && options?.stopOnError ? 'failed' : 'completed';
    operation.completedAt = new Date();
    operation.result = {
      deletedIds,
      summary: {
        deleted: deletedIds.length,
        errors: operation.errorCount,
      },
    };

    this.operations.set(operation.id, operation);
    return operation;
  }

  // =================== IMPORT ===================

  async importData(
    tenantId: string,
    userId: string,
    entityType: EntityType,
    data: string,
    format: 'csv' | 'json',
    options?: BulkOperationOptions,
  ): Promise<BulkOperation> {
    // Parse the data
    const items = format === 'json'
      ? this.parseJsonImport(data)
      : this.parseCsvImport(data, options?.includeHeaders !== false);

    // Apply mapping if provided
    const mappedItems = options?.mapping
      ? items.map(item => this.applyMapping(item, options.mapping!))
      : items;

    // Create records
    return this.bulkCreate(tenantId, userId, entityType, mappedItems, options);
  }

  private parseJsonImport(data: string): Record<string, any>[] {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  }

  private parseCsvImport(data: string, hasHeaders: boolean): Record<string, any>[] {
    const lines = data.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = hasHeaders
      ? lines[0].split(',').map(h => h.trim())
      : lines[0].split(',').map((_, i) => `field${i}`);

    const dataLines = hasHeaders ? lines.slice(1) : lines;

    return dataLines.map(line => {
      const values = this.parseCsvLine(line);
      const record: Record<string, any> = {};
      headers.forEach((header, i) => {
        record[header] = values[i]?.trim() || '';
      });
      return record;
    });
  }

  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    return values;
  }

  private applyMapping(item: Record<string, any>, mapping: FieldMapping[]): Record<string, any> {
    const result: Record<string, any> = {};

    for (const map of mapping) {
      let value = item[map.sourceField];

      if (value === undefined || value === null || value === '') {
        value = map.defaultValue;
      }

      if (value !== undefined && value !== null && map.transform) {
        value = this.transformValue(value, map.transform);
      }

      if (value !== undefined && value !== null) {
        result[map.targetField] = value;
      }
    }

    return result;
  }

  private transformValue(value: any, transform: FieldTransform): any {
    const strValue = String(value);

    switch (transform) {
      case 'uppercase':
        return strValue.toUpperCase();
      case 'lowercase':
        return strValue.toLowerCase();
      case 'trim':
        return strValue.trim();
      case 'number':
        const num = parseFloat(strValue.replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? 0 : num;
      case 'date':
        const date = new Date(strValue);
        return isNaN(date.getTime()) ? null : date;
      case 'boolean':
        return ['true', '1', 'yes', 'da'].includes(strValue.toLowerCase());
      default:
        return value;
    }
  }

  // =================== EXPORT ===================

  async exportData(
    tenantId: string,
    userId: string,
    entityType: EntityType,
    format: ExportFormat,
    options?: BulkOperationOptions,
  ): Promise<BulkOperation> {
    const storageKey = `${tenantId}:${entityType}`;
    const entityStorage = this.mockData.get(storageKey);
    let items = entityStorage ? Array.from(entityStorage.values()) : [];

    // Apply filters if provided
    if (options?.filters) {
      items = items.filter(item => {
        return Object.entries(options.filters!).every(([key, value]) => {
          return item[key] === value;
        });
      });
    }

    const operation = await this.createBulkOperation(
      tenantId,
      userId,
      'export',
      entityType,
      items.length,
      { ...options, exportFormat: format },
    );

    operation.status = 'processing';
    operation.startedAt = new Date();

    let exportData: string;
    const filename = `${entityType}_export_${Date.now()}.${format === 'excel' ? 'xlsx' : format}`;

    switch (format) {
      case 'json':
        exportData = this.exportToJson(items);
        break;
      case 'csv':
        exportData = this.exportToCsv(items, options?.includeHeaders !== false);
        break;
      case 'excel':
        exportData = this.exportToExcel(items);
        break;
      case 'pdf':
        exportData = this.exportToPdf(items, entityType);
        break;
      default:
        exportData = JSON.stringify(items);
    }

    operation.processedItems = items.length;
    operation.successCount = items.length;
    operation.status = 'completed';
    operation.completedAt = new Date();
    operation.result = {
      exportData,
      exportFilename: filename,
      summary: {
        exported: items.length,
        format,
      },
    };

    this.operations.set(operation.id, operation);
    return operation;
  }

  private exportToJson(items: Record<string, any>[]): string {
    return JSON.stringify(items, null, 2);
  }

  private exportToCsv(items: Record<string, any>[], includeHeaders: boolean): string {
    if (items.length === 0) return '';

    const headers = Object.keys(items[0]);
    const rows: string[] = [];

    if (includeHeaders) {
      rows.push(headers.join(','));
    }

    for (const item of items) {
      const values = headers.map(h => {
        const value = item[h];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        if (value instanceof Date) {
          return value.toISOString();
        }
        return String(value);
      });
      rows.push(values.join(','));
    }

    return rows.join('\n');
  }

  private exportToExcel(items: Record<string, any>[]): string {
    // In production, would use a library like exceljs
    // For now, return CSV format as placeholder
    return `EXCEL_PLACEHOLDER:${this.exportToCsv(items, true)}`;
  }

  private exportToPdf(items: Record<string, any>[], entityType: EntityType): string {
    // In production, would use a library like pdfkit or puppeteer
    // For now, return a placeholder
    return `PDF_PLACEHOLDER:${entityType}:${items.length} records`;
  }

  // =================== VALIDATION ===================

  private validateItem(
    item: Record<string, any>,
    entityType: EntityType,
  ): { valid: boolean; field?: string; message?: string } {
    // Basic validation based on entity type
    switch (entityType) {
      case 'invoice':
        if (!item.invoiceNumber && !item.invoice_number) {
          return { valid: false, field: 'invoiceNumber', message: 'Invoice number is required' };
        }
        if (item.amount !== undefined && (isNaN(item.amount) || item.amount < 0)) {
          return { valid: false, field: 'amount', message: 'Amount must be a positive number' };
        }
        break;

      case 'customer':
        if (!item.name) {
          return { valid: false, field: 'name', message: 'Customer name is required' };
        }
        break;

      case 'employee':
        if (!item.name && !item.firstName) {
          return { valid: false, field: 'name', message: 'Employee name is required' };
        }
        break;

      case 'product':
        if (!item.name && !item.productName) {
          return { valid: false, field: 'name', message: 'Product name is required' };
        }
        break;
    }

    return { valid: true };
  }

  // =================== IMPORT TEMPLATES ===================

  async createImportTemplate(
    tenantId: string,
    name: string,
    entityType: EntityType,
    config: ImportConfig,
  ): Promise<ImportTemplate> {
    const template: ImportTemplate = {
      id: this.generateId('import-tpl', ++this.templateIdCounter),
      tenantId,
      name,
      entityType,
      config,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.importTemplates.set(template.id, template);
    return template;
  }

  async getImportTemplate(templateId: string): Promise<ImportTemplate | null> {
    return this.importTemplates.get(templateId) || null;
  }

  async getImportTemplates(tenantId: string, entityType?: EntityType): Promise<ImportTemplate[]> {
    let templates = Array.from(this.importTemplates.values())
      .filter(t => t.tenantId === tenantId || t.tenantId === '*');

    if (entityType) {
      templates = templates.filter(t => t.entityType === entityType);
    }

    return templates;
  }

  async deleteImportTemplate(templateId: string): Promise<boolean> {
    const template = this.importTemplates.get(templateId);
    if (!template || template.tenantId === '*') return false;
    return this.importTemplates.delete(templateId);
  }

  // =================== EXPORT TEMPLATES ===================

  async createExportTemplate(
    tenantId: string,
    name: string,
    entityType: EntityType,
    config: ExportConfig,
  ): Promise<ExportTemplate> {
    const template: ExportTemplate = {
      id: this.generateId('export-tpl', ++this.templateIdCounter),
      tenantId,
      name,
      entityType,
      config,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.exportTemplates.set(template.id, template);
    return template;
  }

  async getExportTemplate(templateId: string): Promise<ExportTemplate | null> {
    return this.exportTemplates.get(templateId) || null;
  }

  async getExportTemplates(tenantId: string, entityType?: EntityType): Promise<ExportTemplate[]> {
    let templates = Array.from(this.exportTemplates.values())
      .filter(t => t.tenantId === tenantId || t.tenantId === '*');

    if (entityType) {
      templates = templates.filter(t => t.entityType === entityType);
    }

    return templates;
  }

  async deleteExportTemplate(templateId: string): Promise<boolean> {
    const template = this.exportTemplates.get(templateId);
    if (!template || template.tenantId === '*') return false;
    return this.exportTemplates.delete(templateId);
  }

  // =================== BULK OPERATIONS STATS ===================

  async getOperationStats(tenantId: string): Promise<{
    totalOperations: number;
    operationsByType: { type: BulkOperationType; count: number }[];
    operationsByStatus: { status: BulkOperationStatus; count: number }[];
    totalItemsProcessed: number;
    successRate: number;
    averageProcessingTime: number;
  }> {
    const operations = Array.from(this.operations.values())
      .filter(o => o.tenantId === tenantId);

    const typeMap = new Map<BulkOperationType, number>();
    const statusMap = new Map<BulkOperationStatus, number>();
    let totalItems = 0;
    let successItems = 0;
    let totalTime = 0;
    let completedCount = 0;

    for (const op of operations) {
      typeMap.set(op.type, (typeMap.get(op.type) || 0) + 1);
      statusMap.set(op.status, (statusMap.get(op.status) || 0) + 1);
      totalItems += op.processedItems;
      successItems += op.successCount;

      if (op.completedAt && op.startedAt) {
        totalTime += op.completedAt.getTime() - op.startedAt.getTime();
        completedCount++;
      }
    }

    return {
      totalOperations: operations.length,
      operationsByType: Array.from(typeMap.entries())
        .map(([type, count]) => ({ type, count })),
      operationsByStatus: Array.from(statusMap.entries())
        .map(([status, count]) => ({ status, count })),
      totalItemsProcessed: totalItems,
      successRate: totalItems > 0 ? (successItems / totalItems) * 100 : 100,
      averageProcessingTime: completedCount > 0 ? totalTime / completedCount : 0,
    };
  }

  // =================== METADATA ===================

  getEntityTypes(): EntityType[] {
    return ['invoice', 'customer', 'product', 'employee', 'transaction', 'order'];
  }

  getExportFormats(): ExportFormat[] {
    return ['csv', 'excel', 'json', 'pdf'];
  }

  getOperationTypes(): BulkOperationType[] {
    return ['create', 'update', 'delete', 'import', 'export'];
  }

  getTransformTypes(): FieldTransform[] {
    return ['uppercase', 'lowercase', 'trim', 'number', 'date', 'boolean', 'custom'];
  }
}
