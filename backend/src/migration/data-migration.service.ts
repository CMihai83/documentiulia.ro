import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type MigrationType = 'IMPORT' | 'EXPORT' | 'TRANSFORM' | 'SYNC' | 'BACKUP' | 'RESTORE';
export type MigrationStatus = 'PENDING' | 'VALIDATING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
export type DataSource = 'CSV' | 'EXCEL' | 'JSON' | 'XML' | 'DATABASE' | 'API' | 'SAGA' | 'ANAF';
export type EntityType = 'CLIENT' | 'INVOICE' | 'PRODUCT' | 'EMPLOYEE' | 'TRANSACTION' | 'DOCUMENT' | 'SETTING';

export interface MigrationJob {
  id: string;
  tenantId: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  type: MigrationType;
  source: DataSource;
  target: DataSource;
  entities: EntityType[];
  status: MigrationStatus;
  config: MigrationConfig;
  progress: MigrationProgress;
  validation: ValidationResult;
  rollback?: RollbackInfo;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface MigrationConfig {
  batchSize: number;
  skipErrors: boolean;
  dryRun: boolean;
  validateBefore: boolean;
  backupBefore: boolean;
  fieldMappings: FieldMapping[];
  transformations: DataTransformation[];
  filters?: DataFilter[];
  deduplication?: DeduplicationConfig;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  required: boolean;
  defaultValue?: any;
  transform?: string;
}

export interface DataTransformation {
  field: string;
  operation: 'UPPERCASE' | 'LOWERCASE' | 'TRIM' | 'DATE_FORMAT' | 'NUMBER_FORMAT' | 'CURRENCY' | 'REPLACE' | 'CUSTOM';
  params?: Record<string, any>;
}

export interface DataFilter {
  field: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'GREATER_THAN' | 'LESS_THAN' | 'IS_NULL' | 'IS_NOT_NULL';
  value?: any;
}

export interface DeduplicationConfig {
  enabled: boolean;
  keyFields: string[];
  strategy: 'SKIP' | 'UPDATE' | 'ERROR';
}

export interface MigrationProgress {
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  skippedRecords: number;
  currentBatch: number;
  totalBatches: number;
  percentComplete: number;
  estimatedTimeRemaining?: number;
  errors: MigrationError[];
}

export interface MigrationError {
  recordId: string;
  recordIndex: number;
  field?: string;
  message: string;
  messageRo: string;
  severity: 'WARNING' | 'ERROR' | 'CRITICAL';
  timestamp: Date;
}

export interface ValidationResult {
  isValid: boolean;
  checkedAt?: Date;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  warnings: ValidationIssue[];
  errors: ValidationIssue[];
}

export interface ValidationIssue {
  recordIndex: number;
  field: string;
  value: any;
  message: string;
  messageRo: string;
  type: 'MISSING_REQUIRED' | 'INVALID_FORMAT' | 'OUT_OF_RANGE' | 'DUPLICATE' | 'REFERENCE_NOT_FOUND';
}

export interface RollbackInfo {
  canRollback: boolean;
  backupId?: string;
  rollbackAt?: Date;
  rolledBackRecords: number;
}

export interface MigrationTemplate {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  type: MigrationType;
  source: DataSource;
  target: DataSource;
  entities: EntityType[];
  config: MigrationConfig;
  isSystem: boolean;
  createdAt: Date;
  createdBy: string;
}

export interface DataPreview {
  totalRecords: number;
  sampleRecords: Record<string, any>[];
  detectedFields: { name: string; type: string; sampleValues: any[] }[];
  suggestedMappings: FieldMapping[];
}

export interface MigrationStats {
  totalJobs: number;
  byStatus: Record<MigrationStatus, number>;
  byType: Record<MigrationType, number>;
  totalRecordsMigrated: number;
  averageJobDuration: number;
  successRate: number;
}

export interface CreateMigrationDto {
  tenantId: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  type: MigrationType;
  source: DataSource;
  target: DataSource;
  entities: EntityType[];
  config?: Partial<MigrationConfig>;
  scheduledAt?: Date;
  createdBy: string;
}

@Injectable()
export class DataMigrationService {
  private jobs = new Map<string, MigrationJob>();
  private templates = new Map<string, MigrationTemplate>();
  private backups = new Map<string, { jobId: string; data: Record<string, any>[]; createdAt: Date }>();
  private jobDurations: number[] = [];

  private readonly defaultConfig: MigrationConfig = {
    batchSize: 100,
    skipErrors: false,
    dryRun: false,
    validateBefore: true,
    backupBefore: true,
    fieldMappings: [],
    transformations: [],
  };

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeSystemTemplates();
  }

  private initializeSystemTemplates(): void {
    const systemTemplates: Omit<MigrationTemplate, 'id' | 'createdAt'>[] = [
      {
        name: 'SAGA Import',
        nameRo: 'Import SAGA',
        description: 'Import data from SAGA accounting software',
        descriptionRo: 'Import date din software-ul contabil SAGA',
        type: 'IMPORT',
        source: 'SAGA',
        target: 'DATABASE',
        entities: ['CLIENT', 'INVOICE', 'PRODUCT'],
        config: {
          ...this.defaultConfig,
          fieldMappings: [
            { sourceField: 'Denumire', targetField: 'name', required: true },
            { sourceField: 'CUI', targetField: 'cui', required: true },
            { sourceField: 'Adresa', targetField: 'address', required: false },
          ],
        },
        isSystem: true,
        createdBy: 'system',
      },
      {
        name: 'Excel Client Import',
        nameRo: 'Import Clienți Excel',
        description: 'Import clients from Excel spreadsheet',
        descriptionRo: 'Import clienți din foaie de calcul Excel',
        type: 'IMPORT',
        source: 'EXCEL',
        target: 'DATABASE',
        entities: ['CLIENT'],
        config: {
          ...this.defaultConfig,
          fieldMappings: [
            { sourceField: 'Nume Companie', targetField: 'name', required: true },
            { sourceField: 'CUI/CIF', targetField: 'cui', required: true },
            { sourceField: 'Email', targetField: 'email', required: false },
            { sourceField: 'Telefon', targetField: 'phone', required: false },
          ],
          deduplication: { enabled: true, keyFields: ['cui'], strategy: 'UPDATE' },
        },
        isSystem: true,
        createdBy: 'system',
      },
      {
        name: 'ANAF e-Factura Export',
        nameRo: 'Export e-Factură ANAF',
        description: 'Export invoices for ANAF e-Factura submission',
        descriptionRo: 'Export facturi pentru depunere e-Factură ANAF',
        type: 'EXPORT',
        source: 'DATABASE',
        target: 'ANAF',
        entities: ['INVOICE'],
        config: {
          ...this.defaultConfig,
          transformations: [
            { field: 'amount', operation: 'CURRENCY', params: { currency: 'RON', decimals: 2 } },
            { field: 'issueDate', operation: 'DATE_FORMAT', params: { format: 'YYYY-MM-DD' } },
          ],
        },
        isSystem: true,
        createdBy: 'system',
      },
      {
        name: 'Full Backup',
        nameRo: 'Backup Complet',
        description: 'Create full backup of all data',
        descriptionRo: 'Creare backup complet al tuturor datelor',
        type: 'BACKUP',
        source: 'DATABASE',
        target: 'JSON',
        entities: ['CLIENT', 'INVOICE', 'PRODUCT', 'EMPLOYEE', 'TRANSACTION', 'DOCUMENT', 'SETTING'],
        config: { ...this.defaultConfig, backupBefore: false },
        isSystem: true,
        createdBy: 'system',
      },
    ];

    systemTemplates.forEach((template) => {
      const id = `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.templates.set(id, { ...template, id, createdAt: new Date() });
    });
  }

  // Job Management
  createJob(dto: CreateMigrationDto): MigrationJob {
    const job: MigrationJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenantId: dto.tenantId,
      name: dto.name,
      nameRo: dto.nameRo,
      description: dto.description,
      descriptionRo: dto.descriptionRo,
      type: dto.type,
      source: dto.source,
      target: dto.target,
      entities: dto.entities,
      status: 'PENDING',
      config: { ...this.defaultConfig, ...dto.config },
      progress: this.createInitialProgress(),
      validation: { isValid: false, totalRecords: 0, validRecords: 0, invalidRecords: 0, warnings: [], errors: [] },
      scheduledAt: dto.scheduledAt,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: dto.createdBy,
    };

    this.jobs.set(job.id, job);
    this.eventEmitter.emit('migration.job.created', { jobId: job.id });
    return job;
  }

  createJobFromTemplate(templateId: string, tenantId: string, createdBy: string, overrides?: Partial<CreateMigrationDto>): MigrationJob {
    const template = this.getTemplate(templateId);

    return this.createJob({
      tenantId,
      name: overrides?.name || template.name,
      nameRo: overrides?.nameRo || template.nameRo,
      description: overrides?.description || template.description,
      descriptionRo: overrides?.descriptionRo || template.descriptionRo,
      type: template.type,
      source: template.source,
      target: template.target,
      entities: template.entities,
      config: { ...template.config, ...overrides?.config },
      createdBy,
    });
  }

  getJob(jobId: string): MigrationJob {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new NotFoundException(`Migration job ${jobId} not found`);
    }
    return job;
  }

  getJobs(filters?: { tenantId?: string; status?: MigrationStatus; type?: MigrationType }): MigrationJob[] {
    let jobs = Array.from(this.jobs.values());

    if (filters?.tenantId) {
      jobs = jobs.filter((j) => j.tenantId === filters.tenantId);
    }
    if (filters?.status) {
      jobs = jobs.filter((j) => j.status === filters.status);
    }
    if (filters?.type) {
      jobs = jobs.filter((j) => j.type === filters.type);
    }

    return jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  updateJobConfig(jobId: string, config: Partial<MigrationConfig>): MigrationJob {
    const job = this.getJob(jobId);

    if (job.status !== 'PENDING') {
      throw new BadRequestException('Can only update config for pending jobs');
    }

    job.config = { ...job.config, ...config };
    job.updatedAt = new Date();
    this.jobs.set(jobId, job);
    return job;
  }

  deleteJob(jobId: string): void {
    const job = this.getJob(jobId);

    if (['RUNNING', 'VALIDATING'].includes(job.status)) {
      throw new BadRequestException('Cannot delete running job');
    }

    this.jobs.delete(jobId);
    this.eventEmitter.emit('migration.job.deleted', { jobId });
  }

  // Validation
  async validateJob(jobId: string): Promise<ValidationResult> {
    const job = this.getJob(jobId);

    if (job.status !== 'PENDING') {
      throw new BadRequestException('Can only validate pending jobs');
    }

    job.status = 'VALIDATING';
    job.updatedAt = new Date();
    this.jobs.set(jobId, job);

    // Simulate validation
    await new Promise((resolve) => setTimeout(resolve, 100));

    const mockRecords = 50;
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    // Simulate some validation errors
    errors.push({
      recordIndex: 10,
      field: 'email',
      value: 'invalid-email',
      message: 'Invalid email format',
      messageRo: 'Format email invalid',
      type: 'INVALID_FORMAT',
    });

    if (mockRecords > 100) {
      warnings.push({
        recordIndex: 0,
        field: '',
        value: null,
        message: 'Large dataset may take longer to process',
        messageRo: 'Set de date mare, procesarea poate dura mai mult',
        type: 'OUT_OF_RANGE',
      });
    }

    const invalidRecords = errors.length;
    const validRecords = mockRecords - invalidRecords;

    job.validation = {
      isValid: errors.length === 0 || job.config.skipErrors,
      checkedAt: new Date(),
      totalRecords: mockRecords,
      validRecords,
      invalidRecords,
      warnings,
      errors,
    };

    job.progress.totalRecords = mockRecords;
    job.status = 'PENDING';
    job.updatedAt = new Date();
    this.jobs.set(jobId, job);

    this.eventEmitter.emit('migration.job.validated', { jobId, isValid: job.validation.isValid });
    return job.validation;
  }

  // Execution
  async runJob(jobId: string): Promise<MigrationJob> {
    const job = this.getJob(jobId);

    if (job.status !== 'PENDING') {
      throw new BadRequestException('Job must be in pending status to run');
    }

    if (job.config.validateBefore && !job.validation.isValid) {
      await this.validateJob(jobId);
      if (!job.validation.isValid && !job.config.skipErrors) {
        throw new BadRequestException('Validation failed. Fix errors or enable skipErrors');
      }
    }

    job.status = 'RUNNING';
    job.startedAt = new Date();
    job.updatedAt = new Date();

    if (job.config.backupBefore) {
      this.createBackup(job);
    }

    // Process in batches
    const totalRecords = job.progress.totalRecords || 50;
    const batchSize = job.config.batchSize;
    const totalBatches = Math.ceil(totalRecords / batchSize);

    job.progress.totalRecords = totalRecords;
    job.progress.totalBatches = totalBatches;

    for (let batch = 1; batch <= totalBatches; batch++) {
      job.progress.currentBatch = batch;
      const recordsInBatch = Math.min(batchSize, totalRecords - (batch - 1) * batchSize);

      // Simulate batch processing
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Simulate some failures
      const failures = batch === 1 ? 2 : 0;
      const successes = recordsInBatch - failures;

      job.progress.processedRecords += recordsInBatch;
      job.progress.successfulRecords += successes;
      job.progress.failedRecords += failures;
      job.progress.percentComplete = Math.round((job.progress.processedRecords / totalRecords) * 100);

      if (failures > 0 && !job.config.skipErrors) {
        job.progress.errors.push({
          recordId: `record-${batch}-1`,
          recordIndex: (batch - 1) * batchSize,
          message: 'Simulated processing error',
          messageRo: 'Eroare simulată de procesare',
          severity: 'ERROR',
          timestamp: new Date(),
        });
      }

      this.jobs.set(jobId, job);
      this.eventEmitter.emit('migration.job.progress', { jobId, progress: job.progress });
    }

    job.status = job.progress.failedRecords > 0 && !job.config.skipErrors ? 'FAILED' : 'COMPLETED';
    job.completedAt = new Date();
    job.updatedAt = new Date();

    if (job.startedAt) {
      this.jobDurations.push(job.completedAt.getTime() - job.startedAt.getTime());
    }

    if (job.config.backupBefore) {
      job.rollback = { canRollback: true, backupId: `backup-${jobId}`, rolledBackRecords: 0 };
    }

    this.jobs.set(jobId, job);
    this.eventEmitter.emit('migration.job.completed', { jobId, status: job.status });
    return job;
  }

  pauseJob(jobId: string): MigrationJob {
    const job = this.getJob(jobId);

    if (job.status !== 'RUNNING') {
      throw new BadRequestException('Can only pause running jobs');
    }

    job.status = 'PAUSED';
    job.updatedAt = new Date();
    this.jobs.set(jobId, job);

    this.eventEmitter.emit('migration.job.paused', { jobId });
    return job;
  }

  resumeJob(jobId: string): MigrationJob {
    const job = this.getJob(jobId);

    if (job.status !== 'PAUSED') {
      throw new BadRequestException('Can only resume paused jobs');
    }

    job.status = 'RUNNING';
    job.updatedAt = new Date();
    this.jobs.set(jobId, job);

    this.eventEmitter.emit('migration.job.resumed', { jobId });
    return job;
  }

  // Rollback
  async rollbackJob(jobId: string): Promise<MigrationJob> {
    const job = this.getJob(jobId);

    if (!job.rollback?.canRollback) {
      throw new BadRequestException('This job cannot be rolled back');
    }

    if (job.status !== 'COMPLETED' && job.status !== 'FAILED') {
      throw new BadRequestException('Can only rollback completed or failed jobs');
    }

    const backup = this.backups.get(job.rollback.backupId!);
    if (!backup) {
      throw new BadRequestException('Backup not found');
    }

    // Simulate rollback
    await new Promise((resolve) => setTimeout(resolve, 100));

    job.rollback.rollbackAt = new Date();
    job.rollback.rolledBackRecords = job.progress.successfulRecords;
    job.status = 'ROLLED_BACK';
    job.updatedAt = new Date();
    this.jobs.set(jobId, job);

    this.eventEmitter.emit('migration.job.rolledback', { jobId });
    return job;
  }

  private createBackup(job: MigrationJob): void {
    const backupId = `backup-${job.id}`;
    this.backups.set(backupId, {
      jobId: job.id,
      data: [], // Would contain actual data in production
      createdAt: new Date(),
    });
  }

  // Data Preview
  previewData(source: DataSource, sampleData?: Record<string, any>[]): DataPreview {
    const mockData = sampleData || [
      { 'Nume Companie': 'Test SRL', 'CUI/CIF': 'RO12345678', Email: 'test@example.com' },
      { 'Nume Companie': 'Exemplu SA', 'CUI/CIF': 'RO87654321', Email: 'contact@exemplu.ro' },
    ];

    const detectedFields = Object.keys(mockData[0] || {}).map((name) => ({
      name,
      type: typeof mockData[0][name],
      sampleValues: mockData.slice(0, 3).map((r) => r[name]),
    }));

    const suggestedMappings = this.generateSuggestedMappings(detectedFields);

    return {
      totalRecords: mockData.length,
      sampleRecords: mockData.slice(0, 5),
      detectedFields,
      suggestedMappings,
    };
  }

  private generateSuggestedMappings(fields: { name: string; type: string }[]): FieldMapping[] {
    const mappingRules: Record<string, string> = {
      'Nume Companie': 'name',
      'Denumire': 'name',
      'Company Name': 'name',
      'CUI/CIF': 'cui',
      'CUI': 'cui',
      'Email': 'email',
      'Telefon': 'phone',
      'Phone': 'phone',
      'Adresa': 'address',
      'Address': 'address',
    };

    return fields.map((field) => ({
      sourceField: field.name,
      targetField: mappingRules[field.name] || field.name.toLowerCase().replace(/\s+/g, '_'),
      required: ['name', 'cui'].includes(mappingRules[field.name] || ''),
    }));
  }

  // Templates
  getTemplate(templateId: string): MigrationTemplate {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }
    return template;
  }

  getTemplates(filters?: { type?: MigrationType; source?: DataSource }): MigrationTemplate[] {
    let templates = Array.from(this.templates.values());

    if (filters?.type) {
      templates = templates.filter((t) => t.type === filters.type);
    }
    if (filters?.source) {
      templates = templates.filter((t) => t.source === filters.source);
    }

    return templates;
  }

  createTemplate(template: Omit<MigrationTemplate, 'id' | 'createdAt' | 'isSystem'>): MigrationTemplate {
    const newTemplate: MigrationTemplate = {
      ...template,
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isSystem: false,
      createdAt: new Date(),
    };

    this.templates.set(newTemplate.id, newTemplate);
    this.eventEmitter.emit('migration.template.created', { templateId: newTemplate.id });
    return newTemplate;
  }

  deleteTemplate(templateId: string): void {
    const template = this.getTemplate(templateId);

    if (template.isSystem) {
      throw new BadRequestException('Cannot delete system templates');
    }

    this.templates.delete(templateId);
    this.eventEmitter.emit('migration.template.deleted', { templateId });
  }

  // Statistics
  getStats(tenantId?: string): MigrationStats {
    let jobs = Array.from(this.jobs.values());

    if (tenantId) {
      jobs = jobs.filter((j) => j.tenantId === tenantId);
    }

    const byStatus: Record<MigrationStatus, number> = {
      PENDING: 0, VALIDATING: 0, RUNNING: 0, PAUSED: 0, COMPLETED: 0, FAILED: 0, ROLLED_BACK: 0,
    };

    const byType: Record<MigrationType, number> = {
      IMPORT: 0, EXPORT: 0, TRANSFORM: 0, SYNC: 0, BACKUP: 0, RESTORE: 0,
    };

    let totalRecordsMigrated = 0;

    jobs.forEach((job) => {
      byStatus[job.status]++;
      byType[job.type]++;
      if (job.status === 'COMPLETED') {
        totalRecordsMigrated += job.progress.successfulRecords;
      }
    });

    const completedJobs = jobs.filter((j) => j.status === 'COMPLETED' || j.status === 'FAILED');
    const successRate = completedJobs.length > 0
      ? (completedJobs.filter((j) => j.status === 'COMPLETED').length / completedJobs.length) * 100
      : 100;

    const averageJobDuration = this.jobDurations.length > 0
      ? this.jobDurations.reduce((a, b) => a + b, 0) / this.jobDurations.length
      : 0;

    return {
      totalJobs: jobs.length,
      byStatus,
      byType,
      totalRecordsMigrated,
      averageJobDuration,
      successRate,
    };
  }

  // Utility
  private createInitialProgress(): MigrationProgress {
    return {
      totalRecords: 0,
      processedRecords: 0,
      successfulRecords: 0,
      failedRecords: 0,
      skippedRecords: 0,
      currentBatch: 0,
      totalBatches: 0,
      percentComplete: 0,
      errors: [],
    };
  }

  getSupportedSources(): { source: DataSource; label: string; labelRo: string; supportedTypes: MigrationType[] }[] {
    return [
      { source: 'CSV', label: 'CSV File', labelRo: 'Fișier CSV', supportedTypes: ['IMPORT', 'EXPORT'] },
      { source: 'EXCEL', label: 'Excel Spreadsheet', labelRo: 'Foaie de calcul Excel', supportedTypes: ['IMPORT', 'EXPORT'] },
      { source: 'JSON', label: 'JSON Data', labelRo: 'Date JSON', supportedTypes: ['IMPORT', 'EXPORT', 'BACKUP', 'RESTORE'] },
      { source: 'XML', label: 'XML Document', labelRo: 'Document XML', supportedTypes: ['IMPORT', 'EXPORT'] },
      { source: 'DATABASE', label: 'Database', labelRo: 'Bază de date', supportedTypes: ['IMPORT', 'EXPORT', 'SYNC', 'BACKUP', 'RESTORE'] },
      { source: 'API', label: 'External API', labelRo: 'API Extern', supportedTypes: ['IMPORT', 'EXPORT', 'SYNC'] },
      { source: 'SAGA', label: 'SAGA Software', labelRo: 'Software SAGA', supportedTypes: ['IMPORT', 'SYNC'] },
      { source: 'ANAF', label: 'ANAF Platform', labelRo: 'Platforma ANAF', supportedTypes: ['EXPORT', 'SYNC'] },
    ];
  }

  getSupportedEntities(): { entity: EntityType; label: string; labelRo: string }[] {
    return [
      { entity: 'CLIENT', label: 'Clients', labelRo: 'Clienți' },
      { entity: 'INVOICE', label: 'Invoices', labelRo: 'Facturi' },
      { entity: 'PRODUCT', label: 'Products', labelRo: 'Produse' },
      { entity: 'EMPLOYEE', label: 'Employees', labelRo: 'Angajați' },
      { entity: 'TRANSACTION', label: 'Transactions', labelRo: 'Tranzacții' },
      { entity: 'DOCUMENT', label: 'Documents', labelRo: 'Documente' },
      { entity: 'SETTING', label: 'Settings', labelRo: 'Setări' },
    ];
  }
}
