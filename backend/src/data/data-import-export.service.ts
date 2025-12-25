import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Types
export type ImportFormat = 'csv' | 'excel' | 'json' | 'xml';
export type ExportFormat = 'csv' | 'excel' | 'json' | 'xml' | 'pdf';
export type ImportStatus = 'pending' | 'validating' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type ExportStatus = 'pending' | 'generating' | 'completed' | 'failed';
export type DataType = 'customers' | 'products' | 'invoices' | 'transactions' | 'employees' | 'vehicles' | 'routes' | 'inventory';

// Interfaces
export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: 'string' | 'number' | 'date' | 'boolean' | 'currency' | 'custom';
  defaultValue?: any;
  required?: boolean;
  customTransform?: string;
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'type' | 'format' | 'range' | 'unique' | 'reference' | 'custom';
  params?: Record<string, any>;
  message?: string;
}

export interface ImportConfig {
  id: string;
  name: string;
  tenantId: string;
  dataType: DataType;
  format: ImportFormat;
  fieldMappings: FieldMapping[];
  validationRules: ValidationRule[];
  skipDuplicates: boolean;
  updateExisting: boolean;
  batchSize: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImportJob {
  id: string;
  tenantId: string;
  configId: string;
  fileName: string;
  fileSize: number;
  format: ImportFormat;
  dataType: DataType;
  status: ImportStatus;
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  errors: ImportError[];
  warnings: string[];
  startedAt?: Date;
  completedAt?: Date;
  createdBy: string;
  createdAt: Date;
}

export interface ImportError {
  row: number;
  field: string;
  value: any;
  message: string;
  severity: 'error' | 'warning';
}

export interface ExportConfig {
  id: string;
  name: string;
  tenantId: string;
  dataType: DataType;
  format: ExportFormat;
  fields: string[];
  filters?: Record<string, any>;
  sorting?: { field: string; order: 'asc' | 'desc' }[];
  includeHeaders: boolean;
  dateFormat: string;
  createdBy: string;
  createdAt: Date;
}

export interface ExportJob {
  id: string;
  tenantId: string;
  configId?: string;
  dataType: DataType;
  format: ExportFormat;
  status: ExportStatus;
  totalRecords: number;
  exportedRecords: number;
  fileUrl?: string;
  fileSize?: number;
  startedAt?: Date;
  completedAt?: Date;
  expiresAt?: Date;
  createdBy: string;
  createdAt: Date;
}

export interface DataSchema {
  dataType: DataType;
  fields: SchemaField[];
  requiredFields: string[];
  uniqueFields: string[];
  referenceFields: { field: string; refType: DataType }[];
}

export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  format?: string;
  description?: string;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  enum?: any[];
}

export interface ImportPreview {
  sampleData: Record<string, any>[];
  detectedFields: string[];
  suggestedMappings: FieldMapping[];
  totalRows: number;
  format: ImportFormat;
}

export interface ImportResult {
  jobId: string;
  status: ImportStatus;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: ImportError[];
  duration: number;
}

export interface ExportResult {
  jobId: string;
  status: ExportStatus;
  fileUrl: string;
  fileSize: number;
  recordCount: number;
  expiresAt: Date;
}

@Injectable()
export class DataImportExportService {
  private readonly logger = new Logger(DataImportExportService.name);

  // Storage
  private importConfigs: Map<string, ImportConfig> = new Map();
  private importJobs: Map<string, ImportJob> = new Map();
  private exportConfigs: Map<string, ExportConfig> = new Map();
  private exportJobs: Map<string, ExportJob> = new Map();
  private dataSchemas: Map<DataType, DataSchema> = new Map();

  // Counters
  private importConfigIdCounter = 0;
  private importJobIdCounter = 0;
  private exportConfigIdCounter = 0;
  private exportJobIdCounter = 0;

  constructor(private configService: ConfigService) {
    this.initializeSchemas();
  }

  private generateId(prefix: string, counter: number): string {
    return `${prefix}-${counter}-${Date.now()}`;
  }

  // =================== SCHEMA INITIALIZATION ===================

  private initializeSchemas(): void {
    // Customers schema
    this.dataSchemas.set('customers', {
      dataType: 'customers',
      fields: [
        { name: 'name', type: 'string', maxLength: 200, description: 'Customer name' },
        { name: 'email', type: 'string', format: 'email', description: 'Email address' },
        { name: 'phone', type: 'string', format: 'phone', description: 'Phone number' },
        { name: 'address', type: 'string', description: 'Street address' },
        { name: 'city', type: 'string', description: 'City' },
        { name: 'country', type: 'string', description: 'Country code' },
        { name: 'vatNumber', type: 'string', description: 'VAT registration number' },
        { name: 'isActive', type: 'boolean', description: 'Active status' },
      ],
      requiredFields: ['name', 'email'],
      uniqueFields: ['email', 'vatNumber'],
      referenceFields: [],
    });

    // Products schema
    this.dataSchemas.set('products', {
      dataType: 'products',
      fields: [
        { name: 'sku', type: 'string', maxLength: 50, description: 'Stock keeping unit' },
        { name: 'name', type: 'string', maxLength: 200, description: 'Product name' },
        { name: 'description', type: 'string', description: 'Product description' },
        { name: 'price', type: 'number', minValue: 0, description: 'Unit price' },
        { name: 'vatRate', type: 'number', enum: [0, 5, 9, 19], description: 'VAT rate percentage' },
        { name: 'quantity', type: 'number', minValue: 0, description: 'Stock quantity' },
        { name: 'category', type: 'string', description: 'Product category' },
        { name: 'unit', type: 'string', enum: ['piece', 'kg', 'liter', 'meter'], description: 'Unit of measure' },
      ],
      requiredFields: ['sku', 'name', 'price'],
      uniqueFields: ['sku'],
      referenceFields: [],
    });

    // Invoices schema
    this.dataSchemas.set('invoices', {
      dataType: 'invoices',
      fields: [
        { name: 'invoiceNumber', type: 'string', maxLength: 50, description: 'Invoice number' },
        { name: 'customerId', type: 'string', description: 'Customer ID' },
        { name: 'issueDate', type: 'date', format: 'YYYY-MM-DD', description: 'Issue date' },
        { name: 'dueDate', type: 'date', format: 'YYYY-MM-DD', description: 'Due date' },
        { name: 'items', type: 'array', description: 'Invoice line items' },
        { name: 'subtotal', type: 'number', description: 'Subtotal before VAT' },
        { name: 'vatAmount', type: 'number', description: 'VAT amount' },
        { name: 'total', type: 'number', description: 'Total with VAT' },
        { name: 'currency', type: 'string', enum: ['RON', 'EUR', 'USD'], description: 'Currency code' },
        { name: 'status', type: 'string', enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'], description: 'Invoice status' },
      ],
      requiredFields: ['invoiceNumber', 'customerId', 'issueDate', 'total'],
      uniqueFields: ['invoiceNumber'],
      referenceFields: [{ field: 'customerId', refType: 'customers' }],
    });

    // Employees schema
    this.dataSchemas.set('employees', {
      dataType: 'employees',
      fields: [
        { name: 'employeeId', type: 'string', description: 'Employee ID' },
        { name: 'firstName', type: 'string', maxLength: 100, description: 'First name' },
        { name: 'lastName', type: 'string', maxLength: 100, description: 'Last name' },
        { name: 'email', type: 'string', format: 'email', description: 'Email address' },
        { name: 'phone', type: 'string', format: 'phone', description: 'Phone number' },
        { name: 'department', type: 'string', description: 'Department' },
        { name: 'position', type: 'string', description: 'Job position' },
        { name: 'hireDate', type: 'date', format: 'YYYY-MM-DD', description: 'Hire date' },
        { name: 'salary', type: 'number', minValue: 0, description: 'Monthly salary' },
        { name: 'isActive', type: 'boolean', description: 'Employment status' },
      ],
      requiredFields: ['employeeId', 'firstName', 'lastName', 'email'],
      uniqueFields: ['employeeId', 'email'],
      referenceFields: [],
    });

    // Vehicles schema
    this.dataSchemas.set('vehicles', {
      dataType: 'vehicles',
      fields: [
        { name: 'licensePlate', type: 'string', maxLength: 20, description: 'License plate' },
        { name: 'make', type: 'string', description: 'Vehicle make' },
        { name: 'model', type: 'string', description: 'Vehicle model' },
        { name: 'year', type: 'number', description: 'Manufacturing year' },
        { name: 'vin', type: 'string', maxLength: 17, description: 'VIN number' },
        { name: 'type', type: 'string', enum: ['van', 'truck', 'car'], description: 'Vehicle type' },
        { name: 'capacity', type: 'number', description: 'Cargo capacity kg' },
        { name: 'status', type: 'string', enum: ['available', 'in_use', 'maintenance'], description: 'Current status' },
      ],
      requiredFields: ['licensePlate', 'make', 'model'],
      uniqueFields: ['licensePlate', 'vin'],
      referenceFields: [],
    });

    // Transactions schema
    this.dataSchemas.set('transactions', {
      dataType: 'transactions',
      fields: [
        { name: 'transactionId', type: 'string', description: 'Transaction ID' },
        { name: 'date', type: 'date', format: 'YYYY-MM-DD', description: 'Transaction date' },
        { name: 'type', type: 'string', enum: ['income', 'expense', 'transfer'], description: 'Transaction type' },
        { name: 'amount', type: 'number', description: 'Amount' },
        { name: 'currency', type: 'string', description: 'Currency' },
        { name: 'category', type: 'string', description: 'Category' },
        { name: 'description', type: 'string', description: 'Description' },
        { name: 'reference', type: 'string', description: 'Reference number' },
      ],
      requiredFields: ['transactionId', 'date', 'type', 'amount'],
      uniqueFields: ['transactionId'],
      referenceFields: [],
    });

    // Routes schema
    this.dataSchemas.set('routes', {
      dataType: 'routes',
      fields: [
        { name: 'routeId', type: 'string', description: 'Route ID' },
        { name: 'name', type: 'string', description: 'Route name' },
        { name: 'vehicleId', type: 'string', description: 'Assigned vehicle ID' },
        { name: 'driverId', type: 'string', description: 'Assigned driver ID' },
        { name: 'date', type: 'date', format: 'YYYY-MM-DD', description: 'Route date' },
        { name: 'stops', type: 'array', description: 'Delivery stops' },
        { name: 'distance', type: 'number', description: 'Total distance km' },
        { name: 'status', type: 'string', enum: ['planned', 'in_progress', 'completed'], description: 'Route status' },
      ],
      requiredFields: ['routeId', 'name', 'date'],
      uniqueFields: ['routeId'],
      referenceFields: [
        { field: 'vehicleId', refType: 'vehicles' },
        { field: 'driverId', refType: 'employees' },
      ],
    });

    // Inventory schema
    this.dataSchemas.set('inventory', {
      dataType: 'inventory',
      fields: [
        { name: 'sku', type: 'string', description: 'Product SKU' },
        { name: 'warehouseId', type: 'string', description: 'Warehouse ID' },
        { name: 'quantity', type: 'number', minValue: 0, description: 'Current quantity' },
        { name: 'minQuantity', type: 'number', minValue: 0, description: 'Minimum stock level' },
        { name: 'maxQuantity', type: 'number', description: 'Maximum stock level' },
        { name: 'location', type: 'string', description: 'Bin/shelf location' },
        { name: 'lastCounted', type: 'date', description: 'Last inventory count date' },
      ],
      requiredFields: ['sku', 'warehouseId', 'quantity'],
      uniqueFields: [],
      referenceFields: [{ field: 'sku', refType: 'products' }],
    });

    this.logger.log(`Initialized ${this.dataSchemas.size} data schemas`);
  }

  // =================== IMPORT CONFIGURATION ===================

  async createImportConfig(
    tenantId: string,
    name: string,
    dataType: DataType,
    format: ImportFormat,
    fieldMappings: FieldMapping[],
    createdBy: string,
    options?: {
      validationRules?: ValidationRule[];
      skipDuplicates?: boolean;
      updateExisting?: boolean;
      batchSize?: number;
    },
  ): Promise<ImportConfig> {
    const config: ImportConfig = {
      id: this.generateId('ic', ++this.importConfigIdCounter),
      name,
      tenantId,
      dataType,
      format,
      fieldMappings,
      validationRules: options?.validationRules || [],
      skipDuplicates: options?.skipDuplicates ?? true,
      updateExisting: options?.updateExisting ?? false,
      batchSize: options?.batchSize || 100,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.importConfigs.set(config.id, config);
    this.logger.log(`Created import config: ${name} (${config.id})`);
    return config;
  }

  async getImportConfig(configId: string): Promise<ImportConfig | null> {
    return this.importConfigs.get(configId) || null;
  }

  async getImportConfigs(tenantId: string, dataType?: DataType): Promise<ImportConfig[]> {
    let configs = Array.from(this.importConfigs.values())
      .filter(c => c.tenantId === tenantId);

    if (dataType) {
      configs = configs.filter(c => c.dataType === dataType);
    }

    return configs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateImportConfig(
    configId: string,
    updates: Partial<Omit<ImportConfig, 'id' | 'tenantId' | 'createdBy' | 'createdAt'>>,
  ): Promise<ImportConfig | null> {
    const config = this.importConfigs.get(configId);
    if (!config) return null;

    const updated: ImportConfig = {
      ...config,
      ...updates,
      updatedAt: new Date(),
    };

    this.importConfigs.set(configId, updated);
    return updated;
  }

  async deleteImportConfig(configId: string): Promise<boolean> {
    return this.importConfigs.delete(configId);
  }

  // =================== IMPORT PREVIEW ===================

  async previewImport(
    tenantId: string,
    fileContent: string,
    format: ImportFormat,
    dataType: DataType,
  ): Promise<ImportPreview> {
    const parsedData = this.parseFileContent(fileContent, format);
    const detectedFields = this.detectFields(parsedData);
    const suggestedMappings = this.suggestMappings(detectedFields, dataType);

    return {
      sampleData: parsedData.slice(0, 5),
      detectedFields,
      suggestedMappings,
      totalRows: parsedData.length,
      format,
    };
  }

  private parseFileContent(content: string, format: ImportFormat): Record<string, any>[] {
    switch (format) {
      case 'csv':
        return this.parseCsv(content);
      case 'json':
        return this.parseJson(content);
      case 'xml':
        return this.parseXml(content);
      default:
        return [];
    }
  }

  private parseCsv(content: string): Record<string, any>[] {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data: Record<string, any>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: Record<string, any> = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      data.push(row);
    }

    return data;
  }

  private parseJson(content: string): Record<string, any>[] {
    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  }

  private parseXml(content: string): Record<string, any>[] {
    // Simplified XML parsing - in production use xml2js or similar
    const records: Record<string, any>[] = [];
    const recordRegex = /<record>([\s\S]*?)<\/record>/g;
    const fieldRegex = /<(\w+)>([\s\S]*?)<\/\1>/g;

    let match;
    while ((match = recordRegex.exec(content)) !== null) {
      const record: Record<string, any> = {};
      let fieldMatch;
      while ((fieldMatch = fieldRegex.exec(match[1])) !== null) {
        record[fieldMatch[1]] = fieldMatch[2];
      }
      if (Object.keys(record).length > 0) {
        records.push(record);
      }
    }

    return records;
  }

  private detectFields(data: Record<string, any>[]): string[] {
    if (data.length === 0) return [];

    const allFields = new Set<string>();
    data.forEach(row => {
      Object.keys(row).forEach(key => allFields.add(key));
    });

    return Array.from(allFields);
  }

  private suggestMappings(sourceFields: string[], dataType: DataType): FieldMapping[] {
    const schema = this.dataSchemas.get(dataType);
    if (!schema) return [];

    const mappings: FieldMapping[] = [];
    const normalizedSourceFields = sourceFields.map(f => ({
      original: f,
      normalized: f.toLowerCase().replace(/[_\s-]/g, ''),
    }));

    for (const schemaField of schema.fields) {
      const normalizedTarget = schemaField.name.toLowerCase();

      // Find best match
      const match = normalizedSourceFields.find(
        sf => sf.normalized === normalizedTarget ||
          sf.normalized.includes(normalizedTarget) ||
          normalizedTarget.includes(sf.normalized),
      );

      if (match) {
        mappings.push({
          sourceField: match.original,
          targetField: schemaField.name,
          transform: this.getTransformType(schemaField.type),
          required: schema.requiredFields.includes(schemaField.name),
        });
      }
    }

    return mappings;
  }

  private getTransformType(type: string): 'string' | 'number' | 'date' | 'boolean' {
    switch (type) {
      case 'number': return 'number';
      case 'date': return 'date';
      case 'boolean': return 'boolean';
      default: return 'string';
    }
  }

  // =================== IMPORT EXECUTION ===================

  async startImport(
    tenantId: string,
    configId: string,
    fileContent: string,
    fileName: string,
    createdBy: string,
  ): Promise<ImportJob> {
    const config = await this.getImportConfig(configId);
    if (!config) {
      throw new Error('Import config not found');
    }

    const parsedData = this.parseFileContent(fileContent, config.format);

    const job: ImportJob = {
      id: this.generateId('ij', ++this.importJobIdCounter),
      tenantId,
      configId,
      fileName,
      fileSize: fileContent.length,
      format: config.format,
      dataType: config.dataType,
      status: 'pending',
      totalRows: parsedData.length,
      processedRows: 0,
      successCount: 0,
      errorCount: 0,
      errors: [],
      warnings: [],
      createdBy,
      createdAt: new Date(),
    };

    this.importJobs.set(job.id, job);
    this.logger.log(`Created import job: ${job.id} for ${fileName}`);

    // Start async processing
    this.processImport(job.id, parsedData, config);

    return job;
  }

  private async processImport(
    jobId: string,
    data: Record<string, any>[],
    config: ImportConfig,
  ): Promise<void> {
    const job = this.importJobs.get(jobId);
    if (!job) return;

    job.status = 'validating';
    job.startedAt = new Date();
    this.importJobs.set(jobId, job);

    // Validate all rows first
    const validationErrors = await this.validateImportData(data, config);
    job.errors = validationErrors.filter(e => e.severity === 'error');
    job.warnings = validationErrors.filter(e => e.severity === 'warning').map(e => e.message);

    if (job.errors.length > data.length * 0.5) {
      job.status = 'failed';
      job.completedAt = new Date();
      this.importJobs.set(jobId, job);
      return;
    }

    job.status = 'processing';
    this.importJobs.set(jobId, job);

    // Process in batches
    const errorRows = new Set(job.errors.map(e => e.row));

    for (let i = 0; i < data.length; i += config.batchSize) {
      const batch = data.slice(i, i + config.batchSize);

      for (let j = 0; j < batch.length; j++) {
        const rowIndex = i + j;
        job.processedRows++;

        if (errorRows.has(rowIndex)) {
          job.errorCount++;
          continue;
        }

        try {
          const transformedRow = this.transformRow(batch[j], config.fieldMappings);
          // In production, would save to database here
          job.successCount++;
        } catch (error: any) {
          job.errorCount++;
          job.errors.push({
            row: rowIndex,
            field: '',
            value: null,
            message: error.message,
            severity: 'error',
          });
        }
      }

      this.importJobs.set(jobId, job);
    }

    job.status = 'completed';
    job.completedAt = new Date();
    this.importJobs.set(jobId, job);
    this.logger.log(`Import job ${jobId} completed: ${job.successCount} success, ${job.errorCount} errors`);
  }

  private async validateImportData(
    data: Record<string, any>[],
    config: ImportConfig,
  ): Promise<ImportError[]> {
    const errors: ImportError[] = [];
    const schema = this.dataSchemas.get(config.dataType);

    data.forEach((row, index) => {
      // Check required fields
      for (const mapping of config.fieldMappings) {
        if (mapping.required) {
          const value = row[mapping.sourceField];
          if (value === undefined || value === null || value === '') {
            errors.push({
              row: index,
              field: mapping.sourceField,
              value,
              message: `Required field '${mapping.targetField}' is missing`,
              severity: 'error',
            });
          }
        }
      }

      // Apply custom validation rules
      for (const rule of config.validationRules) {
        const mapping = config.fieldMappings.find(m => m.targetField === rule.field);
        if (!mapping) continue;

        const value = row[mapping.sourceField];
        const error = this.applyValidationRule(value, rule, index);
        if (error) errors.push(error);
      }
    });

    return errors;
  }

  private applyValidationRule(
    value: any,
    rule: ValidationRule,
    rowIndex: number,
  ): ImportError | null {
    switch (rule.type) {
      case 'type':
        if (rule.params?.expectedType === 'number' && isNaN(Number(value))) {
          return {
            row: rowIndex,
            field: rule.field,
            value,
            message: rule.message || `${rule.field} must be a number`,
            severity: 'error',
          };
        }
        break;

      case 'format':
        if (rule.params?.pattern && !new RegExp(rule.params.pattern).test(String(value))) {
          return {
            row: rowIndex,
            field: rule.field,
            value,
            message: rule.message || `${rule.field} has invalid format`,
            severity: 'error',
          };
        }
        break;

      case 'range':
        const numValue = Number(value);
        if (rule.params?.min !== undefined && numValue < rule.params.min) {
          return {
            row: rowIndex,
            field: rule.field,
            value,
            message: rule.message || `${rule.field} must be at least ${rule.params.min}`,
            severity: 'error',
          };
        }
        if (rule.params?.max !== undefined && numValue > rule.params.max) {
          return {
            row: rowIndex,
            field: rule.field,
            value,
            message: rule.message || `${rule.field} must be at most ${rule.params.max}`,
            severity: 'error',
          };
        }
        break;
    }

    return null;
  }

  private transformRow(
    row: Record<string, any>,
    mappings: FieldMapping[],
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const mapping of mappings) {
      let value = row[mapping.sourceField];

      // Apply default if missing
      if ((value === undefined || value === null || value === '') && mapping.defaultValue !== undefined) {
        value = mapping.defaultValue;
      }

      // Apply transform
      if (value !== undefined && value !== null) {
        switch (mapping.transform) {
          case 'number':
            value = Number(value);
            break;
          case 'boolean':
            value = ['true', '1', 'yes', 'da'].includes(String(value).toLowerCase());
            break;
          case 'date':
            value = new Date(value);
            break;
          case 'currency':
            value = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
            break;
        }
      }

      result[mapping.targetField] = value;
    }

    return result;
  }

  // =================== IMPORT JOB MANAGEMENT ===================

  async getImportJob(jobId: string): Promise<ImportJob | null> {
    return this.importJobs.get(jobId) || null;
  }

  async getImportJobs(
    tenantId: string,
    options?: {
      status?: ImportStatus;
      dataType?: DataType;
      limit?: number;
    },
  ): Promise<ImportJob[]> {
    let jobs = Array.from(this.importJobs.values())
      .filter(j => j.tenantId === tenantId);

    if (options?.status) {
      jobs = jobs.filter(j => j.status === options.status);
    }
    if (options?.dataType) {
      jobs = jobs.filter(j => j.dataType === options.dataType);
    }

    jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (options?.limit) {
      jobs = jobs.slice(0, options.limit);
    }

    return jobs;
  }

  async cancelImport(jobId: string): Promise<boolean> {
    const job = this.importJobs.get(jobId);
    if (!job || !['pending', 'validating', 'processing'].includes(job.status)) {
      return false;
    }

    job.status = 'cancelled';
    job.completedAt = new Date();
    this.importJobs.set(jobId, job);
    return true;
  }

  async getImportProgress(jobId: string): Promise<{
    status: ImportStatus;
    progress: number;
    processedRows: number;
    totalRows: number;
    successCount: number;
    errorCount: number;
  } | null> {
    const job = this.importJobs.get(jobId);
    if (!job) return null;

    return {
      status: job.status,
      progress: job.totalRows > 0 ? (job.processedRows / job.totalRows) * 100 : 0,
      processedRows: job.processedRows,
      totalRows: job.totalRows,
      successCount: job.successCount,
      errorCount: job.errorCount,
    };
  }

  // =================== EXPORT CONFIGURATION ===================

  async createExportConfig(
    tenantId: string,
    name: string,
    dataType: DataType,
    format: ExportFormat,
    fields: string[],
    createdBy: string,
    options?: {
      filters?: Record<string, any>;
      sorting?: { field: string; order: 'asc' | 'desc' }[];
      includeHeaders?: boolean;
      dateFormat?: string;
    },
  ): Promise<ExportConfig> {
    const config: ExportConfig = {
      id: this.generateId('ec', ++this.exportConfigIdCounter),
      name,
      tenantId,
      dataType,
      format,
      fields,
      filters: options?.filters,
      sorting: options?.sorting,
      includeHeaders: options?.includeHeaders ?? true,
      dateFormat: options?.dateFormat || 'YYYY-MM-DD',
      createdBy,
      createdAt: new Date(),
    };

    this.exportConfigs.set(config.id, config);
    this.logger.log(`Created export config: ${name} (${config.id})`);
    return config;
  }

  async getExportConfig(configId: string): Promise<ExportConfig | null> {
    return this.exportConfigs.get(configId) || null;
  }

  async getExportConfigs(tenantId: string, dataType?: DataType): Promise<ExportConfig[]> {
    let configs = Array.from(this.exportConfigs.values())
      .filter(c => c.tenantId === tenantId);

    if (dataType) {
      configs = configs.filter(c => c.dataType === dataType);
    }

    return configs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async deleteExportConfig(configId: string): Promise<boolean> {
    return this.exportConfigs.delete(configId);
  }

  // =================== EXPORT EXECUTION ===================

  async startExport(
    tenantId: string,
    dataType: DataType,
    format: ExportFormat,
    createdBy: string,
    options?: {
      configId?: string;
      fields?: string[];
      filters?: Record<string, any>;
    },
  ): Promise<ExportJob> {
    const config = options?.configId ? await this.getExportConfig(options.configId) : null;
    const fields = options?.fields || config?.fields || this.getDefaultFields(dataType);

    const job: ExportJob = {
      id: this.generateId('ej', ++this.exportJobIdCounter),
      tenantId,
      configId: options?.configId,
      dataType,
      format,
      status: 'pending',
      totalRecords: 0,
      exportedRecords: 0,
      createdBy,
      createdAt: new Date(),
    };

    this.exportJobs.set(job.id, job);
    this.logger.log(`Created export job: ${job.id}`);

    // Start async processing
    this.processExport(job.id, fields, format, options?.filters || config?.filters);

    return job;
  }

  private getDefaultFields(dataType: DataType): string[] {
    const schema = this.dataSchemas.get(dataType);
    return schema?.fields.map(f => f.name) || [];
  }

  private async processExport(
    jobId: string,
    fields: string[],
    format: ExportFormat,
    filters?: Record<string, any>,
  ): Promise<void> {
    const job = this.exportJobs.get(jobId);
    if (!job) return;

    job.status = 'generating';
    job.startedAt = new Date();
    this.exportJobs.set(jobId, job);

    // Generate mock data for export
    const mockData = this.generateMockExportData(job.dataType, 100);
    job.totalRecords = mockData.length;

    // Generate file content
    let content: string;
    switch (format) {
      case 'csv':
        content = this.generateCsv(mockData, fields);
        break;
      case 'json':
        content = this.generateJson(mockData, fields);
        break;
      case 'xml':
        content = this.generateXml(mockData, fields);
        break;
      default:
        content = this.generateJson(mockData, fields);
    }

    job.exportedRecords = mockData.length;
    job.fileSize = content.length;
    job.fileUrl = `/exports/${job.id}.${format}`;
    job.status = 'completed';
    job.completedAt = new Date();
    job.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    this.exportJobs.set(jobId, job);
    this.logger.log(`Export job ${jobId} completed: ${job.exportedRecords} records`);
  }

  private generateMockExportData(dataType: DataType, count: number): Record<string, any>[] {
    const data: Record<string, any>[] = [];
    const schema = this.dataSchemas.get(dataType);
    if (!schema) return data;

    for (let i = 0; i < count; i++) {
      const record: Record<string, any> = {};
      for (const field of schema.fields) {
        record[field.name] = this.generateMockValue(field, i);
      }
      data.push(record);
    }

    return data;
  }

  private generateMockValue(field: SchemaField, index: number): any {
    switch (field.type) {
      case 'string':
        if (field.format === 'email') return `user${index}@example.com`;
        if (field.format === 'phone') return `+4072${String(index).padStart(7, '0')}`;
        return `${field.name}_${index}`;
      case 'number':
        return field.minValue !== undefined ? field.minValue + index : index;
      case 'date':
        const date = new Date();
        date.setDate(date.getDate() - index);
        return date.toISOString().split('T')[0];
      case 'boolean':
        return index % 2 === 0;
      case 'array':
        return [];
      default:
        return null;
    }
  }

  private generateCsv(data: Record<string, any>[], fields: string[]): string {
    const rows: string[] = [];
    rows.push(fields.join(','));

    for (const record of data) {
      const values = fields.map(f => {
        const value = record[f];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return String(value);
      });
      rows.push(values.join(','));
    }

    return rows.join('\n');
  }

  private generateJson(data: Record<string, any>[], fields: string[]): string {
    const filtered = data.map(record => {
      const obj: Record<string, any> = {};
      fields.forEach(f => {
        if (f in record) obj[f] = record[f];
      });
      return obj;
    });
    return JSON.stringify(filtered, null, 2);
  }

  private generateXml(data: Record<string, any>[], fields: string[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<records>\n';

    for (const record of data) {
      xml += '  <record>\n';
      for (const field of fields) {
        const value = record[field] ?? '';
        xml += `    <${field}>${value}</${field}>\n`;
      }
      xml += '  </record>\n';
    }

    xml += '</records>';
    return xml;
  }

  // =================== EXPORT JOB MANAGEMENT ===================

  async getExportJob(jobId: string): Promise<ExportJob | null> {
    return this.exportJobs.get(jobId) || null;
  }

  async getExportJobs(
    tenantId: string,
    options?: {
      status?: ExportStatus;
      dataType?: DataType;
      limit?: number;
    },
  ): Promise<ExportJob[]> {
    let jobs = Array.from(this.exportJobs.values())
      .filter(j => j.tenantId === tenantId);

    if (options?.status) {
      jobs = jobs.filter(j => j.status === options.status);
    }
    if (options?.dataType) {
      jobs = jobs.filter(j => j.dataType === options.dataType);
    }

    jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (options?.limit) {
      jobs = jobs.slice(0, options.limit);
    }

    return jobs;
  }

  // =================== SCHEMAS ===================

  getSchema(dataType: DataType): DataSchema | null {
    return this.dataSchemas.get(dataType) || null;
  }

  getSchemas(): DataSchema[] {
    return Array.from(this.dataSchemas.values());
  }

  // =================== METADATA ===================

  getImportFormats(): ImportFormat[] {
    return ['csv', 'excel', 'json', 'xml'];
  }

  getExportFormats(): ExportFormat[] {
    return ['csv', 'excel', 'json', 'xml', 'pdf'];
  }

  getDataTypes(): DataType[] {
    return ['customers', 'products', 'invoices', 'transactions', 'employees', 'vehicles', 'routes', 'inventory'];
  }

  getImportStatuses(): ImportStatus[] {
    return ['pending', 'validating', 'processing', 'completed', 'failed', 'cancelled'];
  }

  getExportStatuses(): ExportStatus[] {
    return ['pending', 'generating', 'completed', 'failed'];
  }
}
