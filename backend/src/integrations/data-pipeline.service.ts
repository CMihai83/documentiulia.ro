import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Data Pipeline Service
 * Handle data import/export operations
 *
 * Features:
 * - File imports (CSV, Excel, JSON)
 * - Data exports
 * - Field mapping
 * - Data transformation
 * - Scheduled pipelines
 */

// =================== TYPES ===================

export interface ImportJob {
  id: string;
  tenantId: string;
  name: string;
  type: 'csv' | 'excel' | 'json' | 'xml';
  entityType: EntityType;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  sourceFile: {
    name: string;
    size: number;
    mimeType: string;
    uploadedAt: Date;
  };
  mapping: FieldMapping[];
  options: ImportOptions;
  progress: {
    totalRows: number;
    processedRows: number;
    successRows: number;
    failedRows: number;
    percentage: number;
  };
  errors?: ImportError[];
  result?: {
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  createdBy: string;
}

export interface ExportJob {
  id: string;
  tenantId: string;
  name: string;
  format: 'csv' | 'excel' | 'json' | 'xml' | 'pdf';
  entityType: EntityType;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  filters?: Record<string, any>;
  fields?: string[];
  options: ExportOptions;
  progress: {
    totalRecords: number;
    processedRecords: number;
    percentage: number;
  };
  result?: {
    fileUrl?: string;
    fileName: string;
    fileSize: number;
    recordCount: number;
  };
  startedAt?: Date;
  completedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  createdBy: string;
}

export type EntityType =
  | 'invoices'
  | 'partners'
  | 'products'
  | 'transactions'
  | 'employees'
  | 'inventory'
  | 'orders';

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transformation?: FieldTransformation;
  defaultValue?: any;
  required: boolean;
  format?: string;
}

export interface FieldTransformation {
  type: 'uppercase' | 'lowercase' | 'trim' | 'date_format' | 'number_format' | 'lookup' | 'concat' | 'split' | 'custom';
  config?: Record<string, any>;
}

export interface ImportOptions {
  skipFirstRow: boolean;
  updateExisting: boolean;
  matchField?: string;
  validateOnly: boolean;
  batchSize: number;
  delimiter?: string;
  encoding?: string;
  dateFormat?: string;
  decimalSeparator?: string;
}

export interface ExportOptions {
  includeHeaders: boolean;
  delimiter?: string;
  dateFormat?: string;
  decimalSeparator?: string;
  encoding?: string;
  compress?: boolean;
  splitFiles?: boolean;
  maxRowsPerFile?: number;
}

export interface ImportError {
  row: number;
  field?: string;
  value?: any;
  error: string;
}

export interface Pipeline {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: 'import' | 'export';
  entityType: EntityType;
  source: PipelineSource;
  destination: PipelineDestination;
  mapping: FieldMapping[];
  schedule?: string; // Cron expression
  isActive: boolean;
  lastRunAt?: Date;
  lastRunStatus?: 'success' | 'partial' | 'failed';
  stats: {
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    lastRecordCount?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface PipelineSource {
  type: 'file' | 'api' | 'database' | 'ftp' | 'sftp' | 's3';
  config: Record<string, any>;
}

export interface PipelineDestination {
  type: 'database' | 'api' | 'file' | 'email' | 's3';
  config: Record<string, any>;
}

export interface ImportTemplate {
  id: string;
  name: string;
  description: string;
  entityType: EntityType;
  format: 'csv' | 'excel';
  fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    example?: string;
    description?: string;
  }>;
  sampleFileUrl?: string;
}

// =================== SERVICE ===================

@Injectable()
export class DataPipelineService {
  private readonly logger = new Logger(DataPipelineService.name);

  // Storage
  private importJobs = new Map<string, ImportJob>();
  private exportJobs = new Map<string, ExportJob>();
  private pipelines = new Map<string, Pipeline>();
  private templates: ImportTemplate[] = [];

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    this.templates = [
      {
        id: 'tpl-invoices',
        name: 'Invoices Import',
        description: 'Import invoices from CSV or Excel',
        entityType: 'invoices',
        format: 'csv',
        fields: [
          { name: 'number', label: 'Invoice Number', type: 'string', required: true, example: 'INV-001' },
          { name: 'series', label: 'Series', type: 'string', required: true, example: 'DOC' },
          { name: 'issueDate', label: 'Issue Date', type: 'date', required: true, example: '2025-01-15' },
          { name: 'dueDate', label: 'Due Date', type: 'date', required: true, example: '2025-02-15' },
          { name: 'partnerName', label: 'Partner Name', type: 'string', required: true, example: 'Partner SRL' },
          { name: 'partnerCui', label: 'Partner CUI', type: 'string', required: false, example: 'RO12345678' },
          { name: 'netAmount', label: 'Net Amount', type: 'number', required: true, example: '1000.00' },
          { name: 'vatRate', label: 'VAT Rate (%)', type: 'number', required: true, example: '19' },
          { name: 'currency', label: 'Currency', type: 'string', required: true, example: 'RON' },
        ],
      },
      {
        id: 'tpl-partners',
        name: 'Partners Import',
        description: 'Import partners (customers/suppliers)',
        entityType: 'partners',
        format: 'csv',
        fields: [
          { name: 'name', label: 'Partner Name', type: 'string', required: true, example: 'Company SRL' },
          { name: 'cui', label: 'CUI/VAT Number', type: 'string', required: false, example: 'RO12345678' },
          { name: 'regCom', label: 'Trade Register', type: 'string', required: false, example: 'J40/1234/2020' },
          { name: 'type', label: 'Type', type: 'string', required: true, example: 'customer', description: 'customer, supplier, or both' },
          { name: 'email', label: 'Email', type: 'email', required: false, example: 'contact@company.ro' },
          { name: 'phone', label: 'Phone', type: 'string', required: false, example: '+40 721 234 567' },
          { name: 'address', label: 'Address', type: 'string', required: false, example: 'Strada Example nr. 1' },
          { name: 'city', label: 'City', type: 'string', required: false, example: 'București' },
          { name: 'country', label: 'Country', type: 'string', required: true, example: 'Romania' },
        ],
      },
      {
        id: 'tpl-products',
        name: 'Products Import',
        description: 'Import products/services catalog',
        entityType: 'products',
        format: 'csv',
        fields: [
          { name: 'code', label: 'Product Code', type: 'string', required: true, example: 'PROD001' },
          { name: 'name', label: 'Product Name', type: 'string', required: true, example: 'Consulting Service' },
          { name: 'description', label: 'Description', type: 'string', required: false },
          { name: 'category', label: 'Category', type: 'string', required: false, example: 'Services' },
          { name: 'unitPrice', label: 'Unit Price', type: 'number', required: true, example: '100.00' },
          { name: 'vatRate', label: 'VAT Rate (%)', type: 'number', required: true, example: '19' },
          { name: 'unit', label: 'Unit', type: 'string', required: true, example: 'hour' },
          { name: 'stock', label: 'Stock Quantity', type: 'number', required: false, example: '100' },
        ],
      },
      {
        id: 'tpl-employees',
        name: 'Employees Import',
        description: 'Import employee records',
        entityType: 'employees',
        format: 'csv',
        fields: [
          { name: 'firstName', label: 'First Name', type: 'string', required: true },
          { name: 'lastName', label: 'Last Name', type: 'string', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'phone', label: 'Phone', type: 'string', required: false },
          { name: 'department', label: 'Department', type: 'string', required: false },
          { name: 'position', label: 'Position', type: 'string', required: false },
          { name: 'hireDate', label: 'Hire Date', type: 'date', required: true },
          { name: 'salary', label: 'Salary', type: 'number', required: false },
        ],
      },
    ];

    this.logger.log(`Initialized ${this.templates.length} import templates`);
  }

  // =================== IMPORT ===================

  async createImportJob(params: {
    tenantId: string;
    name: string;
    type: ImportJob['type'];
    entityType: EntityType;
    sourceFile: ImportJob['sourceFile'];
    mapping: FieldMapping[];
    options?: Partial<ImportOptions>;
    createdBy: string;
  }): Promise<ImportJob> {
    const jobId = `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const job: ImportJob = {
      id: jobId,
      tenantId: params.tenantId,
      name: params.name,
      type: params.type,
      entityType: params.entityType,
      status: 'pending',
      sourceFile: params.sourceFile,
      mapping: params.mapping,
      options: {
        skipFirstRow: params.options?.skipFirstRow ?? true,
        updateExisting: params.options?.updateExisting ?? false,
        matchField: params.options?.matchField,
        validateOnly: params.options?.validateOnly ?? false,
        batchSize: params.options?.batchSize ?? 100,
        delimiter: params.options?.delimiter ?? ',',
        encoding: params.options?.encoding ?? 'utf-8',
        dateFormat: params.options?.dateFormat ?? 'YYYY-MM-DD',
        decimalSeparator: params.options?.decimalSeparator ?? '.',
      },
      progress: {
        totalRows: 0,
        processedRows: 0,
        successRows: 0,
        failedRows: 0,
        percentage: 0,
      },
      createdAt: new Date(),
      createdBy: params.createdBy,
    };

    this.importJobs.set(jobId, job);
    this.eventEmitter.emit('import.job.created', { job });

    return job;
  }

  async startImportJob(jobId: string): Promise<ImportJob> {
    const job = this.importJobs.get(jobId);
    if (!job) {
      throw new NotFoundException('Import job not found');
    }

    if (job.status !== 'pending') {
      throw new BadRequestException('Job is not in pending status');
    }

    job.status = 'processing';
    job.startedAt = new Date();
    this.importJobs.set(jobId, job);

    // Simulate import process
    this.processImportJob(job);

    return job;
  }

  private async processImportJob(job: ImportJob): Promise<void> {
    // Simulate processing
    const totalRows = Math.floor(Math.random() * 500) + 50;
    job.progress.totalRows = totalRows;

    const processInterval = setInterval(() => {
      if (job.status === 'cancelled') {
        clearInterval(processInterval);
        return;
      }

      const increment = Math.min(10, totalRows - job.progress.processedRows);
      job.progress.processedRows += increment;
      job.progress.successRows += Math.floor(increment * 0.95);
      job.progress.failedRows += Math.ceil(increment * 0.05);
      job.progress.percentage = Math.round((job.progress.processedRows / totalRows) * 100);

      if (job.progress.processedRows >= totalRows) {
        clearInterval(processInterval);
        job.status = job.progress.failedRows > totalRows * 0.1 ? 'failed' : 'completed';
        job.completedAt = new Date();
        job.result = {
          created: job.progress.successRows,
          updated: 0,
          skipped: 0,
          failed: job.progress.failedRows,
        };

        if (job.progress.failedRows > 0) {
          job.errors = Array.from({ length: Math.min(job.progress.failedRows, 10) }, (_, i) => ({
            row: Math.floor(Math.random() * totalRows) + 1,
            field: 'email',
            value: 'invalid-email',
            error: 'Invalid email format',
          }));
        }

        this.eventEmitter.emit('import.job.completed', { job });
      }

      this.importJobs.set(job.id, job);
    }, 500);
  }

  async cancelImportJob(jobId: string): Promise<void> {
    const job = this.importJobs.get(jobId);
    if (!job) {
      throw new NotFoundException('Import job not found');
    }

    if (job.status !== 'processing') {
      throw new BadRequestException('Can only cancel processing jobs');
    }

    job.status = 'cancelled';
    this.importJobs.set(jobId, job);
  }

  async getImportJob(jobId: string): Promise<ImportJob | null> {
    return this.importJobs.get(jobId) || null;
  }

  async getImportJobs(tenantId: string, limit?: number): Promise<ImportJob[]> {
    let jobs = Array.from(this.importJobs.values())
      .filter(j => j.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (limit) {
      jobs = jobs.slice(0, limit);
    }

    return jobs;
  }

  // =================== EXPORT ===================

  async createExportJob(params: {
    tenantId: string;
    name: string;
    format: ExportJob['format'];
    entityType: EntityType;
    filters?: Record<string, any>;
    fields?: string[];
    options?: Partial<ExportOptions>;
    createdBy: string;
  }): Promise<ExportJob> {
    const jobId = `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const job: ExportJob = {
      id: jobId,
      tenantId: params.tenantId,
      name: params.name,
      format: params.format,
      entityType: params.entityType,
      status: 'pending',
      filters: params.filters,
      fields: params.fields,
      options: {
        includeHeaders: params.options?.includeHeaders ?? true,
        delimiter: params.options?.delimiter ?? ',',
        dateFormat: params.options?.dateFormat ?? 'YYYY-MM-DD',
        decimalSeparator: params.options?.decimalSeparator ?? '.',
        encoding: params.options?.encoding ?? 'utf-8',
        compress: params.options?.compress ?? false,
      },
      progress: {
        totalRecords: 0,
        processedRecords: 0,
        percentage: 0,
      },
      createdAt: new Date(),
      createdBy: params.createdBy,
    };

    this.exportJobs.set(jobId, job);
    return job;
  }

  async startExportJob(jobId: string): Promise<ExportJob> {
    const job = this.exportJobs.get(jobId);
    if (!job) {
      throw new NotFoundException('Export job not found');
    }

    job.status = 'processing';
    job.startedAt = new Date();
    this.exportJobs.set(jobId, job);

    // Simulate export process
    this.processExportJob(job);

    return job;
  }

  private async processExportJob(job: ExportJob): Promise<void> {
    const totalRecords = Math.floor(Math.random() * 1000) + 100;
    job.progress.totalRecords = totalRecords;

    const processInterval = setInterval(() => {
      const increment = Math.min(50, totalRecords - job.progress.processedRecords);
      job.progress.processedRecords += increment;
      job.progress.percentage = Math.round((job.progress.processedRecords / totalRecords) * 100);

      if (job.progress.processedRecords >= totalRecords) {
        clearInterval(processInterval);
        job.status = 'completed';
        job.completedAt = new Date();
        job.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        job.result = {
          fileName: `${job.entityType}-export-${Date.now()}.${job.format}`,
          fileSize: Math.floor(Math.random() * 1000000) + 10000,
          recordCount: totalRecords,
          fileUrl: `/exports/${job.id}`,
        };

        this.eventEmitter.emit('export.job.completed', { job });
      }

      this.exportJobs.set(job.id, job);
    }, 200);
  }

  async getExportJob(jobId: string): Promise<ExportJob | null> {
    return this.exportJobs.get(jobId) || null;
  }

  async getExportJobs(tenantId: string, limit?: number): Promise<ExportJob[]> {
    let jobs = Array.from(this.exportJobs.values())
      .filter(j => j.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (limit) {
      jobs = jobs.slice(0, limit);
    }

    return jobs;
  }

  // =================== PIPELINES ===================

  async createPipeline(params: {
    tenantId: string;
    name: string;
    description?: string;
    type: Pipeline['type'];
    entityType: EntityType;
    source: PipelineSource;
    destination: PipelineDestination;
    mapping: FieldMapping[];
    schedule?: string;
  }): Promise<Pipeline> {
    const pipelineId = `pipeline-${Date.now()}`;

    const pipeline: Pipeline = {
      id: pipelineId,
      tenantId: params.tenantId,
      name: params.name,
      description: params.description,
      type: params.type,
      entityType: params.entityType,
      source: params.source,
      destination: params.destination,
      mapping: params.mapping,
      schedule: params.schedule,
      isActive: true,
      stats: {
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.pipelines.set(pipelineId, pipeline);
    return pipeline;
  }

  async updatePipeline(
    id: string,
    updates: Partial<Pick<Pipeline, 'name' | 'description' | 'mapping' | 'schedule' | 'isActive'>>,
  ): Promise<Pipeline | null> {
    const pipeline = this.pipelines.get(id);
    if (!pipeline) return null;

    Object.assign(pipeline, updates, { updatedAt: new Date() });
    this.pipelines.set(id, pipeline);
    return pipeline;
  }

  async deletePipeline(id: string): Promise<void> {
    this.pipelines.delete(id);
  }

  async getPipelines(tenantId: string): Promise<Pipeline[]> {
    return Array.from(this.pipelines.values())
      .filter(p => p.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async runPipeline(id: string): Promise<{ success: boolean; message: string }> {
    const pipeline = this.pipelines.get(id);
    if (!pipeline) {
      throw new NotFoundException('Pipeline not found');
    }

    pipeline.lastRunAt = new Date();
    pipeline.stats.totalRuns++;

    // Simulate pipeline run
    const success = Math.random() > 0.1;
    if (success) {
      pipeline.lastRunStatus = 'success';
      pipeline.stats.successfulRuns++;
      pipeline.stats.lastRecordCount = Math.floor(Math.random() * 100) + 10;
    } else {
      pipeline.lastRunStatus = 'failed';
      pipeline.stats.failedRuns++;
    }

    this.pipelines.set(id, pipeline);
    return { success, message: success ? 'Pipeline completed' : 'Pipeline failed' };
  }

  // =================== TEMPLATES ===================

  async getTemplates(entityType?: EntityType): Promise<ImportTemplate[]> {
    if (entityType) {
      return this.templates.filter(t => t.entityType === entityType);
    }
    return this.templates;
  }

  async getTemplate(id: string): Promise<ImportTemplate | null> {
    return this.templates.find(t => t.id === id) || null;
  }

  // =================== FIELD DETECTION ===================

  async detectFields(params: {
    type: 'csv' | 'excel' | 'json';
    sampleData: string;
    delimiter?: string;
  }): Promise<Array<{ name: string; type: string; sample: any }>> {
    // In production, would actually parse the file
    // Returning mock detected fields
    return [
      { name: 'column_a', type: 'string', sample: 'Sample text' },
      { name: 'column_b', type: 'number', sample: 123.45 },
      { name: 'column_c', type: 'date', sample: '2025-01-15' },
      { name: 'column_d', type: 'email', sample: 'test@example.com' },
    ];
  }

  async suggestMapping(params: {
    sourceFields: string[];
    entityType: EntityType;
  }): Promise<FieldMapping[]> {
    const template = this.templates.find(t => t.entityType === params.entityType);
    if (!template) return [];

    return params.sourceFields.map(sourceField => {
      const normalizedSource = sourceField.toLowerCase().replace(/[_\s-]/g, '');
      const matchedField = template.fields.find(f =>
        f.name.toLowerCase() === normalizedSource ||
        f.label.toLowerCase().replace(/[_\s-]/g, '') === normalizedSource,
      );

      return {
        sourceField,
        targetField: matchedField?.name || '',
        required: matchedField?.required || false,
      };
    });
  }

  // =================== STATS ===================

  async getStats(tenantId?: string): Promise<{
    totalImports: number;
    successfulImports: number;
    totalExports: number;
    totalPipelines: number;
    activePipelines: number;
    recentActivity: Array<{ type: string; name: string; status: string; timestamp: Date }>;
  }> {
    let imports = Array.from(this.importJobs.values());
    let exports = Array.from(this.exportJobs.values());
    let pipelines = Array.from(this.pipelines.values());

    if (tenantId) {
      imports = imports.filter(i => i.tenantId === tenantId);
      exports = exports.filter(e => e.tenantId === tenantId);
      pipelines = pipelines.filter(p => p.tenantId === tenantId);
    }

    const recentActivity = [
      ...imports.slice(-5).map(i => ({
        type: 'import',
        name: i.name,
        status: i.status,
        timestamp: i.createdAt,
      })),
      ...exports.slice(-5).map(e => ({
        type: 'export',
        name: e.name,
        status: e.status,
        timestamp: e.createdAt,
      })),
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10);

    return {
      totalImports: imports.length,
      successfulImports: imports.filter(i => i.status === 'completed').length,
      totalExports: exports.length,
      totalPipelines: pipelines.length,
      activePipelines: pipelines.filter(p => p.isActive).length,
      recentActivity,
    };
  }
}
