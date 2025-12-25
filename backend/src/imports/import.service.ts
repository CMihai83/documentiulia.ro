import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';

export enum ImportStatus {
  PENDING = 'pending',
  VALIDATING = 'validating',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PARTIALLY_COMPLETED = 'partially_completed',
}

export enum ImportType {
  CUSTOMERS = 'customers',
  PRODUCTS = 'products',
  INVOICES = 'invoices',
  TRANSACTIONS = 'transactions',
  EMPLOYEES = 'employees',
  INVENTORY = 'inventory',
  CHART_OF_ACCOUNTS = 'chart_of_accounts',
  VENDORS = 'vendors',
  BANK_STATEMENTS = 'bank_statements',
  SAF_T = 'saf_t',
}

export enum FileFormat {
  CSV = 'csv',
  XLSX = 'xlsx',
  JSON = 'json',
  XML = 'xml',
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  transform?: string;
  required?: boolean;
  defaultValue?: any;
}

export interface ImportOptions {
  skipFirstRow?: boolean;
  delimiter?: string;
  encoding?: string;
  dateFormat?: string;
  decimalSeparator?: string;
  thousandsSeparator?: string;
  validateOnly?: boolean;
  stopOnError?: boolean;
  batchSize?: number;
}

export interface ValidationError {
  row: number;
  column: string;
  value: any;
  error: string;
  errorRo: string;
}

export interface ImportResult {
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  skippedRows: number;
  errors: ValidationError[];
  warnings: string[];
  duration: number;
}

export interface ImportJob {
  id: string;
  tenantId: string;
  userId: string;
  type: ImportType;
  format: FileFormat;
  fileName: string;
  fileSize: number;
  status: ImportStatus;
  progress: number;
  columnMappings: ColumnMapping[];
  options: ImportOptions;
  result?: ImportResult;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  errorMessageRo?: string;
}

export interface ImportTemplate {
  id: string;
  tenantId: string;
  name: string;
  nameRo: string;
  description?: string;
  descriptionRo?: string;
  type: ImportType;
  format: FileFormat;
  columnMappings: ColumnMapping[];
  options: ImportOptions;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateImportDto {
  tenantId: string;
  userId: string;
  type: ImportType;
  format: FileFormat;
  fileName: string;
  fileSize: number;
  fileContent?: Buffer;
  columnMappings?: ColumnMapping[];
  options?: ImportOptions;
  templateId?: string;
}

export interface PreviewData {
  headers: string[];
  rows: any[][];
  totalRows: number;
  sampleSize: number;
}

export interface FieldDefinition {
  name: string;
  nameRo: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency';
  required: boolean;
  description?: string;
  descriptionRo?: string;
  validation?: string;
}

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);
  private readonly jobs = new Map<string, ImportJob>();
  private readonly templates = new Map<string, ImportTemplate>();
  private readonly DEFAULT_BATCH_SIZE = 100;
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly SUPPORTED_FORMATS = ['csv', 'xlsx', 'json', 'xml'];

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    const defaultTemplates: ImportTemplate[] = [
      {
        id: 'tpl_customers_csv',
        tenantId: 'system',
        name: 'Customers CSV Import',
        nameRo: 'Import Clienți CSV',
        description: 'Standard customer import from CSV',
        descriptionRo: 'Import standard clienți din CSV',
        type: ImportType.CUSTOMERS,
        format: FileFormat.CSV,
        columnMappings: [
          { sourceColumn: 'name', targetField: 'name', required: true },
          { sourceColumn: 'cui', targetField: 'taxId', required: true },
          { sourceColumn: 'email', targetField: 'email', required: false },
          { sourceColumn: 'phone', targetField: 'phone', required: false },
          { sourceColumn: 'address', targetField: 'address', required: false },
          { sourceColumn: 'city', targetField: 'city', required: false },
          { sourceColumn: 'country', targetField: 'country', required: false, defaultValue: 'RO' },
        ],
        options: { skipFirstRow: true, delimiter: ',', encoding: 'utf-8' },
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tpl_products_csv',
        tenantId: 'system',
        name: 'Products CSV Import',
        nameRo: 'Import Produse CSV',
        description: 'Standard product import from CSV',
        descriptionRo: 'Import standard produse din CSV',
        type: ImportType.PRODUCTS,
        format: FileFormat.CSV,
        columnMappings: [
          { sourceColumn: 'code', targetField: 'sku', required: true },
          { sourceColumn: 'name', targetField: 'name', required: true },
          { sourceColumn: 'price', targetField: 'price', required: true, transform: 'parseNumber' },
          { sourceColumn: 'vat', targetField: 'vatRate', required: false, defaultValue: 19 },
          { sourceColumn: 'unit', targetField: 'unit', required: false, defaultValue: 'buc' },
          { sourceColumn: 'category', targetField: 'category', required: false },
        ],
        options: { skipFirstRow: true, delimiter: ',', decimalSeparator: ',' },
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tpl_invoices_xlsx',
        tenantId: 'system',
        name: 'Invoices Excel Import',
        nameRo: 'Import Facturi Excel',
        description: 'Invoice import from Excel',
        descriptionRo: 'Import facturi din Excel',
        type: ImportType.INVOICES,
        format: FileFormat.XLSX,
        columnMappings: [
          { sourceColumn: 'invoice_number', targetField: 'number', required: true },
          { sourceColumn: 'date', targetField: 'date', required: true, transform: 'parseDate' },
          { sourceColumn: 'customer_cui', targetField: 'customerTaxId', required: true },
          { sourceColumn: 'total', targetField: 'totalAmount', required: true, transform: 'parseNumber' },
          { sourceColumn: 'vat', targetField: 'vatAmount', required: false, transform: 'parseNumber' },
          { sourceColumn: 'currency', targetField: 'currency', required: false, defaultValue: 'RON' },
        ],
        options: { skipFirstRow: true, dateFormat: 'DD.MM.YYYY' },
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tpl_saft_xml',
        tenantId: 'system',
        name: 'SAF-T D406 Import',
        nameRo: 'Import SAF-T D406',
        description: 'Romanian SAF-T D406 XML import',
        descriptionRo: 'Import XML SAF-T D406 conform ANAF',
        type: ImportType.SAF_T,
        format: FileFormat.XML,
        columnMappings: [],
        options: { encoding: 'utf-8' },
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    defaultTemplates.forEach((tpl) => this.templates.set(tpl.id, tpl));
  }

  async createImport(dto: CreateImportDto): Promise<ImportJob> {
    this.validateFileSize(dto.fileSize);
    this.validateFormat(dto.format);

    const jobId = this.generateJobId();
    let mappings = dto.columnMappings || [];
    let options = dto.options || {};

    if (dto.templateId) {
      const template = await this.getTemplate(dto.templateId);
      mappings = mappings.length > 0 ? mappings : template.columnMappings;
      options = { ...template.options, ...options };
    }

    const job: ImportJob = {
      id: jobId,
      tenantId: dto.tenantId,
      userId: dto.userId,
      type: dto.type,
      format: dto.format,
      fileName: dto.fileName,
      fileSize: dto.fileSize,
      status: ImportStatus.PENDING,
      progress: 0,
      columnMappings: mappings,
      options: {
        skipFirstRow: true,
        delimiter: ',',
        encoding: 'utf-8',
        dateFormat: 'DD.MM.YYYY',
        decimalSeparator: ',',
        thousandsSeparator: '.',
        batchSize: this.DEFAULT_BATCH_SIZE,
        ...options,
      },
      createdAt: new Date().toISOString(),
    };

    this.jobs.set(jobId, job);

    this.eventEmitter.emit('import.created', {
      jobId,
      type: dto.type,
      tenantId: dto.tenantId,
      userId: dto.userId,
    });

    this.logger.log(`Created import job ${jobId} for ${dto.type} (${dto.fileName})`);
    return job;
  }

  async getImport(jobId: string): Promise<ImportJob> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new NotFoundException(`Import job ${jobId} not found`);
    }
    return job;
  }

  async getImports(tenantId: string, filters?: {
    type?: ImportType;
    status?: ImportStatus;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: ImportJob[]; total: number }> {
    let jobs = Array.from(this.jobs.values()).filter((j) => j.tenantId === tenantId);

    if (filters?.type) {
      jobs = jobs.filter((j) => j.type === filters.type);
    }
    if (filters?.status) {
      jobs = jobs.filter((j) => j.status === filters.status);
    }
    if (filters?.userId) {
      jobs = jobs.filter((j) => j.userId === filters.userId);
    }

    jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = jobs.length;
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 20;

    return {
      jobs: jobs.slice(offset, offset + limit),
      total,
    };
  }

  async startImport(jobId: string, fileContent?: Buffer): Promise<ImportJob> {
    const job = await this.getImport(jobId);

    if (job.status !== ImportStatus.PENDING) {
      throw new BadRequestException(`Cannot start import in status ${job.status}`);
    }

    job.status = ImportStatus.VALIDATING;
    job.startedAt = new Date().toISOString();
    job.progress = 5;

    this.eventEmitter.emit('import.started', { jobId, type: job.type });

    // Simulate validation
    await this.simulateValidation(job);

    // Check if validation failed (status may have been changed by simulateValidation)
    if ((job.status as ImportStatus) === ImportStatus.FAILED) {
      return job;
    }

    // Process import
    job.status = ImportStatus.PROCESSING;
    job.progress = 20;

    await this.processImport(job, fileContent);

    return job;
  }

  private async simulateValidation(job: ImportJob): Promise<void> {
    const errors: ValidationError[] = [];

    // Simulate some validation based on type
    if (job.columnMappings.length === 0 && job.type !== ImportType.SAF_T) {
      job.status = ImportStatus.FAILED;
      job.errorMessage = 'No column mappings configured';
      job.errorMessageRo = 'Nu sunt configurate mapări de coloane';
      return;
    }

    job.progress = 15;
  }

  private async processImport(job: ImportJob, _fileContent?: Buffer): Promise<void> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Simulate processing based on file size
    const estimatedRows = Math.floor(job.fileSize / 100);
    const totalRows = Math.max(estimatedRows, 10);
    let processedRows = 0;
    let successfulRows = 0;
    let failedRows = 0;
    let skippedRows = 0;

    const batchSize = job.options.batchSize || this.DEFAULT_BATCH_SIZE;
    const batches = Math.ceil(totalRows / batchSize);

    for (let batch = 0; batch < batches; batch++) {
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, totalRows);
      const batchRows = batchEnd - batchStart;

      // Simulate batch processing with some random errors
      for (let i = batchStart; i < batchEnd; i++) {
        processedRows++;

        // Simulate 5% error rate
        if (Math.random() < 0.05) {
          failedRows++;
          errors.push({
            row: i + 1,
            column: 'name',
            value: null,
            error: 'Required field is empty',
            errorRo: 'Câmpul obligatoriu este gol',
          });

          if (job.options.stopOnError && errors.length >= 10) {
            job.status = ImportStatus.FAILED;
            job.errorMessage = 'Too many errors encountered';
            job.errorMessageRo = 'Prea multe erori întâlnite';
            break;
          }
        } else if (Math.random() < 0.02) {
          skippedRows++;
        } else {
          successfulRows++;
        }
      }

      // Update progress
      job.progress = 20 + Math.floor((processedRows / totalRows) * 75);

      this.eventEmitter.emit('import.progress', {
        jobId: job.id,
        progress: job.progress,
        processedRows,
        totalRows,
      });
    }

    const duration = Date.now() - startTime;

    job.result = {
      totalRows,
      processedRows,
      successfulRows,
      failedRows,
      skippedRows,
      errors: errors.slice(0, 100), // Limit errors to 100
      warnings,
      duration,
    };

    if (failedRows === 0) {
      job.status = ImportStatus.COMPLETED;
    } else if (successfulRows > 0) {
      job.status = ImportStatus.PARTIALLY_COMPLETED;
      warnings.push(`${failedRows} rows failed to import`);
    } else {
      job.status = ImportStatus.FAILED;
      job.errorMessage = 'All rows failed to import';
      job.errorMessageRo = 'Toate rândurile nu au putut fi importate';
    }

    job.progress = 100;
    job.completedAt = new Date().toISOString();

    this.eventEmitter.emit('import.completed', {
      jobId: job.id,
      status: job.status,
      result: job.result,
    });

    this.logger.log(
      `Import ${job.id} completed: ${successfulRows}/${totalRows} rows successful`
    );
  }

  async cancelImport(jobId: string): Promise<ImportJob> {
    const job = await this.getImport(jobId);

    if (
      job.status === ImportStatus.COMPLETED ||
      job.status === ImportStatus.PARTIALLY_COMPLETED ||
      job.status === ImportStatus.FAILED ||
      job.status === ImportStatus.CANCELLED
    ) {
      throw new BadRequestException(`Cannot cancel import in status ${job.status}`);
    }

    job.status = ImportStatus.CANCELLED;
    job.completedAt = new Date().toISOString();

    this.eventEmitter.emit('import.cancelled', { jobId });

    this.logger.log(`Import ${jobId} cancelled`);
    return job;
  }

  async deleteImport(jobId: string): Promise<void> {
    const job = await this.getImport(jobId);

    if (
      job.status === ImportStatus.PROCESSING ||
      job.status === ImportStatus.VALIDATING
    ) {
      throw new BadRequestException('Cannot delete import while in progress');
    }

    this.jobs.delete(jobId);

    this.eventEmitter.emit('import.deleted', { jobId });

    this.logger.log(`Import ${jobId} deleted`);
  }

  async previewFile(
    format: FileFormat,
    _fileContent: Buffer,
    options?: ImportOptions
  ): Promise<PreviewData> {
    // Simulate file preview
    const sampleSize = 10;
    const headers = ['name', 'cui', 'email', 'phone', 'address', 'city'];
    const rows: any[][] = [];

    for (let i = 0; i < sampleSize; i++) {
      rows.push([
        `Company ${i + 1} SRL`,
        `RO${12345678 + i}`,
        `contact${i + 1}@example.ro`,
        `07${String(i).padStart(8, '0')}`,
        `Strada Exemplu ${i + 1}`,
        i % 2 === 0 ? 'București' : 'Cluj-Napoca',
      ]);
    }

    return {
      headers,
      rows,
      totalRows: 100,
      sampleSize,
    };
  }

  async validateMapping(
    type: ImportType,
    columnMappings: ColumnMapping[]
  ): Promise<{ valid: boolean; errors: string[]; errorsRo: string[] }> {
    const errors: string[] = [];
    const errorsRo: string[] = [];
    const requiredFields = this.getRequiredFields(type);

    // Check all required fields are mapped
    for (const field of requiredFields) {
      const mapping = columnMappings.find((m) => m.targetField === field.name);
      if (!mapping) {
        errors.push(`Required field '${field.name}' is not mapped`);
        errorsRo.push(`Câmpul obligatoriu '${field.nameRo}' nu este mapat`);
      }
    }

    // Check for duplicate target fields
    const targetFields = columnMappings.map((m) => m.targetField);
    const duplicates = targetFields.filter(
      (f, i) => targetFields.indexOf(f) !== i
    );
    if (duplicates.length > 0) {
      errors.push(`Duplicate target fields: ${duplicates.join(', ')}`);
      errorsRo.push(`Câmpuri țintă duplicate: ${duplicates.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      errorsRo,
    };
  }

  getRequiredFields(type: ImportType): FieldDefinition[] {
    const fieldsByType: Record<ImportType, FieldDefinition[]> = {
      [ImportType.CUSTOMERS]: [
        { name: 'name', nameRo: 'Nume', type: 'string', required: true },
        { name: 'taxId', nameRo: 'CUI/CIF', type: 'string', required: true },
      ],
      [ImportType.PRODUCTS]: [
        { name: 'sku', nameRo: 'Cod', type: 'string', required: true },
        { name: 'name', nameRo: 'Denumire', type: 'string', required: true },
        { name: 'price', nameRo: 'Preț', type: 'currency', required: true },
      ],
      [ImportType.INVOICES]: [
        { name: 'number', nameRo: 'Număr Factură', type: 'string', required: true },
        { name: 'date', nameRo: 'Data', type: 'date', required: true },
        { name: 'customerTaxId', nameRo: 'CUI Client', type: 'string', required: true },
        { name: 'totalAmount', nameRo: 'Total', type: 'currency', required: true },
      ],
      [ImportType.TRANSACTIONS]: [
        { name: 'date', nameRo: 'Data', type: 'date', required: true },
        { name: 'amount', nameRo: 'Sumă', type: 'currency', required: true },
        { name: 'type', nameRo: 'Tip', type: 'string', required: true },
      ],
      [ImportType.EMPLOYEES]: [
        { name: 'firstName', nameRo: 'Prenume', type: 'string', required: true },
        { name: 'lastName', nameRo: 'Nume', type: 'string', required: true },
        { name: 'cnp', nameRo: 'CNP', type: 'string', required: true },
      ],
      [ImportType.INVENTORY]: [
        { name: 'sku', nameRo: 'Cod Produs', type: 'string', required: true },
        { name: 'quantity', nameRo: 'Cantitate', type: 'number', required: true },
      ],
      [ImportType.CHART_OF_ACCOUNTS]: [
        { name: 'code', nameRo: 'Cod Cont', type: 'string', required: true },
        { name: 'name', nameRo: 'Denumire', type: 'string', required: true },
      ],
      [ImportType.VENDORS]: [
        { name: 'name', nameRo: 'Nume', type: 'string', required: true },
        { name: 'taxId', nameRo: 'CUI/CIF', type: 'string', required: true },
      ],
      [ImportType.BANK_STATEMENTS]: [
        { name: 'date', nameRo: 'Data', type: 'date', required: true },
        { name: 'amount', nameRo: 'Sumă', type: 'currency', required: true },
        { name: 'reference', nameRo: 'Referință', type: 'string', required: true },
      ],
      [ImportType.SAF_T]: [],
    };

    return fieldsByType[type] || [];
  }

  getAllFields(type: ImportType): FieldDefinition[] {
    const allFieldsByType: Record<ImportType, FieldDefinition[]> = {
      [ImportType.CUSTOMERS]: [
        { name: 'name', nameRo: 'Nume', type: 'string', required: true },
        { name: 'taxId', nameRo: 'CUI/CIF', type: 'string', required: true },
        { name: 'email', nameRo: 'Email', type: 'string', required: false },
        { name: 'phone', nameRo: 'Telefon', type: 'string', required: false },
        { name: 'address', nameRo: 'Adresă', type: 'string', required: false },
        { name: 'city', nameRo: 'Oraș', type: 'string', required: false },
        { name: 'country', nameRo: 'Țară', type: 'string', required: false },
        { name: 'postalCode', nameRo: 'Cod Poștal', type: 'string', required: false },
      ],
      [ImportType.PRODUCTS]: [
        { name: 'sku', nameRo: 'Cod', type: 'string', required: true },
        { name: 'name', nameRo: 'Denumire', type: 'string', required: true },
        { name: 'price', nameRo: 'Preț', type: 'currency', required: true },
        { name: 'vatRate', nameRo: 'Cotă TVA', type: 'number', required: false },
        { name: 'unit', nameRo: 'Unitate Măsură', type: 'string', required: false },
        { name: 'category', nameRo: 'Categorie', type: 'string', required: false },
        { name: 'description', nameRo: 'Descriere', type: 'string', required: false },
      ],
      [ImportType.INVOICES]: [
        { name: 'number', nameRo: 'Număr Factură', type: 'string', required: true },
        { name: 'date', nameRo: 'Data', type: 'date', required: true },
        { name: 'customerTaxId', nameRo: 'CUI Client', type: 'string', required: true },
        { name: 'totalAmount', nameRo: 'Total', type: 'currency', required: true },
        { name: 'vatAmount', nameRo: 'TVA', type: 'currency', required: false },
        { name: 'currency', nameRo: 'Monedă', type: 'string', required: false },
        { name: 'dueDate', nameRo: 'Scadență', type: 'date', required: false },
      ],
      [ImportType.TRANSACTIONS]: [
        { name: 'date', nameRo: 'Data', type: 'date', required: true },
        { name: 'amount', nameRo: 'Sumă', type: 'currency', required: true },
        { name: 'type', nameRo: 'Tip', type: 'string', required: true },
        { name: 'description', nameRo: 'Descriere', type: 'string', required: false },
        { name: 'reference', nameRo: 'Referință', type: 'string', required: false },
      ],
      [ImportType.EMPLOYEES]: [
        { name: 'firstName', nameRo: 'Prenume', type: 'string', required: true },
        { name: 'lastName', nameRo: 'Nume', type: 'string', required: true },
        { name: 'cnp', nameRo: 'CNP', type: 'string', required: true },
        { name: 'email', nameRo: 'Email', type: 'string', required: false },
        { name: 'phone', nameRo: 'Telefon', type: 'string', required: false },
        { name: 'department', nameRo: 'Departament', type: 'string', required: false },
        { name: 'position', nameRo: 'Funcție', type: 'string', required: false },
        { name: 'startDate', nameRo: 'Data Angajării', type: 'date', required: false },
        { name: 'salary', nameRo: 'Salariu', type: 'currency', required: false },
      ],
      [ImportType.INVENTORY]: [
        { name: 'sku', nameRo: 'Cod Produs', type: 'string', required: true },
        { name: 'quantity', nameRo: 'Cantitate', type: 'number', required: true },
        { name: 'warehouse', nameRo: 'Depozit', type: 'string', required: false },
        { name: 'location', nameRo: 'Locație', type: 'string', required: false },
      ],
      [ImportType.CHART_OF_ACCOUNTS]: [
        { name: 'code', nameRo: 'Cod Cont', type: 'string', required: true },
        { name: 'name', nameRo: 'Denumire', type: 'string', required: true },
        { name: 'type', nameRo: 'Tip', type: 'string', required: false },
        { name: 'parentCode', nameRo: 'Cod Cont Părinte', type: 'string', required: false },
      ],
      [ImportType.VENDORS]: [
        { name: 'name', nameRo: 'Nume', type: 'string', required: true },
        { name: 'taxId', nameRo: 'CUI/CIF', type: 'string', required: true },
        { name: 'email', nameRo: 'Email', type: 'string', required: false },
        { name: 'phone', nameRo: 'Telefon', type: 'string', required: false },
        { name: 'address', nameRo: 'Adresă', type: 'string', required: false },
        { name: 'city', nameRo: 'Oraș', type: 'string', required: false },
        { name: 'country', nameRo: 'Țară', type: 'string', required: false },
        { name: 'iban', nameRo: 'IBAN', type: 'string', required: false },
      ],
      [ImportType.BANK_STATEMENTS]: [
        { name: 'date', nameRo: 'Data', type: 'date', required: true },
        { name: 'amount', nameRo: 'Sumă', type: 'currency', required: true },
        { name: 'reference', nameRo: 'Referință', type: 'string', required: true },
        { name: 'description', nameRo: 'Descriere', type: 'string', required: false },
        { name: 'counterparty', nameRo: 'Contrapartidă', type: 'string', required: false },
        { name: 'balance', nameRo: 'Sold', type: 'currency', required: false },
      ],
      [ImportType.SAF_T]: [],
    };

    return allFieldsByType[type] || [];
  }

  async getTemplates(tenantId: string, type?: ImportType): Promise<ImportTemplate[]> {
    let templates = Array.from(this.templates.values()).filter(
      (t) => t.tenantId === tenantId || t.tenantId === 'system'
    );

    if (type) {
      templates = templates.filter((t) => t.type === type);
    }

    return templates;
  }

  async getTemplate(templateId: string): Promise<ImportTemplate> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new NotFoundException(`Import template ${templateId} not found`);
    }
    return template;
  }

  async createTemplate(dto: Omit<ImportTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ImportTemplate> {
    const templateId = `tpl_${crypto.randomBytes(8).toString('hex')}`;

    const template: ImportTemplate = {
      ...dto,
      id: templateId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.templates.set(templateId, template);

    this.eventEmitter.emit('import.template.created', { templateId, type: dto.type });

    this.logger.log(`Created import template ${templateId}`);
    return template;
  }

  async updateTemplate(
    templateId: string,
    updates: Partial<Omit<ImportTemplate, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<ImportTemplate> {
    const template = await this.getTemplate(templateId);

    if (template.tenantId === 'system') {
      throw new BadRequestException('Cannot modify system templates');
    }

    Object.assign(template, updates, { updatedAt: new Date().toISOString() });

    this.eventEmitter.emit('import.template.updated', { templateId });

    return template;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    const template = await this.getTemplate(templateId);

    if (template.tenantId === 'system') {
      throw new BadRequestException('Cannot delete system templates');
    }

    this.templates.delete(templateId);

    this.eventEmitter.emit('import.template.deleted', { templateId });

    this.logger.log(`Deleted import template ${templateId}`);
  }

  getSupportedFormats(): FileFormat[] {
    return Object.values(FileFormat);
  }

  getSupportedTypes(): ImportType[] {
    return Object.values(ImportType);
  }

  getStats(tenantId: string): {
    totalImports: number;
    completedImports: number;
    failedImports: number;
    totalRowsImported: number;
    importsByType: Record<string, number>;
    importsByStatus: Record<string, number>;
  } {
    const jobs = Array.from(this.jobs.values()).filter((j) => j.tenantId === tenantId);

    const importsByType: Record<string, number> = {};
    const importsByStatus: Record<string, number> = {};
    let totalRowsImported = 0;

    jobs.forEach((job) => {
      importsByType[job.type] = (importsByType[job.type] || 0) + 1;
      importsByStatus[job.status] = (importsByStatus[job.status] || 0) + 1;
      if (job.result) {
        totalRowsImported += job.result.successfulRows;
      }
    });

    return {
      totalImports: jobs.length,
      completedImports: jobs.filter((j) => j.status === ImportStatus.COMPLETED).length,
      failedImports: jobs.filter((j) => j.status === ImportStatus.FAILED).length,
      totalRowsImported,
      importsByType,
      importsByStatus,
    };
  }

  private validateFileSize(size: number): void {
    if (size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size ${size} exceeds maximum allowed ${this.MAX_FILE_SIZE}`
      );
    }
  }

  private validateFormat(format: FileFormat): void {
    if (!this.SUPPORTED_FORMATS.includes(format)) {
      throw new BadRequestException(`Unsupported format: ${format}`);
    }
  }

  private generateJobId(): string {
    return `imp_${crypto.randomBytes(12).toString('hex')}`;
  }
}
