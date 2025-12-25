import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Document AI Processing Service for DocumentIulia.ro
// Provides intelligent document processing, OCR, classification, and entity extraction

// =================== INTERFACES ===================

export interface DocumentUpload {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
  userId: string;
  tenantId: string;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
}

export interface ProcessedDocument {
  id: string;
  documentId: string;
  classification: DocumentClassification;
  extractedText: string;
  entities: ExtractedEntity[];
  metadata: DocumentMetadata;
  confidence: number;
  processedAt: Date;
  processingTimeMs: number;
}

export interface DocumentClassification {
  type: DocumentType;
  subtype?: string;
  confidence: number;
  alternativeTypes?: { type: DocumentType; confidence: number }[];
}

export type DocumentType =
  | 'invoice'
  | 'receipt'
  | 'contract'
  | 'payslip'
  | 'bank_statement'
  | 'tax_declaration'
  | 'shipping_document'
  | 'identity_document'
  | 'certificate'
  | 'report'
  | 'correspondence'
  | 'unknown';

export interface ExtractedEntity {
  type: EntityType;
  value: string;
  normalizedValue?: any;
  confidence: number;
  location?: {
    page: number;
    boundingBox?: { x: number; y: number; width: number; height: number };
  };
}

export type EntityType =
  | 'company_name'
  | 'company_id'
  | 'vat_number'
  | 'address'
  | 'date'
  | 'amount'
  | 'currency'
  | 'invoice_number'
  | 'reference'
  | 'iban'
  | 'phone'
  | 'email'
  | 'person_name'
  | 'product'
  | 'quantity'
  | 'unit_price'
  | 'total'
  | 'vat_rate'
  | 'vat_amount';

export interface DocumentMetadata {
  pageCount: number;
  language: string;
  hasSignature: boolean;
  hasStamp: boolean;
  isScanned: boolean;
  quality: 'low' | 'medium' | 'high';
  orientation: 'portrait' | 'landscape';
  creationDate?: Date;
  modificationDate?: Date;
}

export interface InvoiceData {
  invoiceNumber: string;
  issueDate: Date;
  dueDate?: Date;
  supplier: {
    name: string;
    vatNumber?: string;
    address?: string;
    iban?: string;
  };
  customer: {
    name: string;
    vatNumber?: string;
    address?: string;
  };
  lineItems: InvoiceLineItem[];
  subtotal: number;
  vatAmount: number;
  total: number;
  currency: string;
  paymentTerms?: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  vatAmount: number;
  total: number;
}

export interface DocumentBatch {
  id: string;
  documents: DocumentUpload[];
  status: 'pending' | 'processing' | 'completed' | 'partial';
  progress: number;
  results: ProcessedDocument[];
  errors: { documentId: string; error: string }[];
  createdAt: Date;
  completedAt?: Date;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  type: DocumentType;
  fields: TemplateField[];
  rules: ExtractionRule[];
  tenantId: string;
  isActive: boolean;
}

export interface TemplateField {
  name: string;
  type: 'string' | 'number' | 'date' | 'currency' | 'boolean';
  required: boolean;
  patterns?: string[];
  defaultValue?: any;
}

export interface ExtractionRule {
  field: string;
  method: 'regex' | 'position' | 'keyword' | 'ai';
  pattern?: string;
  keywords?: string[];
  position?: { page: number; x: number; y: number; width: number; height: number };
}

// =================== SERVICE ===================

@Injectable()
export class DocumentAiService {
  private readonly logger = new Logger(DocumentAiService.name);

  // In-memory storage
  private documents: Map<string, DocumentUpload> = new Map();
  private processedDocuments: Map<string, ProcessedDocument> = new Map();
  private batches: Map<string, DocumentBatch> = new Map();
  private templates: Map<string, DocumentTemplate> = new Map();

  private documentIdCounter = 0;
  private batchIdCounter = 0;
  private templateIdCounter = 0;

  // Document type patterns for classification
  private readonly documentPatterns: Record<DocumentType, RegExp[]> = {
    invoice: [
      /factur[aă]/i,
      /invoice/i,
      /nr\.\s*factur/i,
      /invoice\s*#/i,
      /total\s*factur[aă]/i,
    ],
    receipt: [
      /bon\s*fiscal/i,
      /receipt/i,
      /chitan[țţ][aă]/i,
      /cas[aă]\s*de\s*marcat/i,
    ],
    contract: [
      /contract/i,
      /acord/i,
      /agreement/i,
      /p[aă]r[țţ]i\s*contractante/i,
    ],
    payslip: [
      /stat\s*de\s*plat[aă]/i,
      /fluturas/i,
      /salariu/i,
      /payslip/i,
      /salary\s*slip/i,
    ],
    bank_statement: [
      /extras\s*de\s*cont/i,
      /bank\s*statement/i,
      /sold\s*(ini[țţ]ial|final)/i,
    ],
    tax_declaration: [
      /declara[țţ]ie/i,
      /d\d{3}/i,
      /anaf/i,
      /fiscal/i,
      /tax\s*(return|declaration)/i,
    ],
    shipping_document: [
      /aviz\s*de\s*[îi]nso[țţ]ire/i,
      /cmr/i,
      /shipping/i,
      /delivery\s*note/i,
      /conosament/i,
    ],
    identity_document: [
      /carte\s*de\s*identitate/i,
      /pa[șş]aport/i,
      /permis\s*de\s*conducere/i,
      /passport/i,
      /id\s*card/i,
    ],
    certificate: [
      /certificat/i,
      /atest/i,
      /diploma/i,
      /certificate/i,
    ],
    report: [
      /raport/i,
      /report/i,
      /analiz[aă]/i,
      /situa[țţ]ie/i,
    ],
    correspondence: [
      /scrisoare/i,
      /adres[aă]/i,
      /notificare/i,
      /letter/i,
      /notification/i,
    ],
    unknown: [],
  };

  // Entity patterns for extraction
  private readonly entityPatterns: Record<EntityType, RegExp> = {
    company_name: /(?:S\.?C\.?\s+)?([A-ZĂÂÎȘȚăâîșț][A-Za-zĂÂÎȘȚăâîșț\s&.-]+)(?:\s+S\.?R\.?L\.?|S\.?A\.?|P\.?F\.?A\.?)/gi,
    company_id: /(?:CUI|CIF|J)\s*[:.]?\s*(\d{2}\/\d+\/\d{4}|\d{6,10})/gi,
    vat_number: /(?:RO|ro)?\s*(\d{2,10})/gi,
    address: /(?:str\.?|strada|bd\.?|bulevardul|calea)\s+([A-Za-zĂÂÎȘȚăâîșț\s\d.,/-]+),?\s*(?:nr\.?\s*\d+)?/gi,
    date: /(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/g,
    amount: /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)(?:\s*(?:RON|LEI|EUR|USD|€|\$))?/gi,
    currency: /(RON|LEI|EUR|USD|€|\$)/gi,
    invoice_number: /(?:factur[aă]|invoice|nr\.?)\s*#?\s*[:.]?\s*([A-Za-z]{0,3}\d+)/gi,
    reference: /(?:ref\.?|referin[țţ][aă])\s*[:.]?\s*([A-Za-z0-9-]+)/gi,
    iban: /([A-Z]{2}\d{2}[A-Z0-9]{4,30})/g,
    phone: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3}[-.\s]?\d{3,4}/g,
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    person_name: /(?:dl\.?|d-na\.?|domnul|doamna)\s+([A-ZĂÂÎȘȚ][a-zăâîșț]+(?:\s+[A-ZĂÂÎȘȚ][a-zăâîșț]+)+)/gi,
    product: /(\d+)\s*x\s+([A-Za-zĂÂÎȘȚăâîșț\s]+)/gi,
    quantity: /(\d+(?:[.,]\d+)?)\s*(?:buc\.?|kg|l|m|mp|mc)/gi,
    unit_price: /pre[țţ]\s*unitar\s*[:.]?\s*(\d+(?:[.,]\d+)?)/gi,
    total: /total\s*[:.]?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/gi,
    vat_rate: /(?:TVA|VAT)\s*[:.]?\s*(\d{1,2})\s*%/gi,
    vat_amount: /(?:TVA|VAT)\s*[:.]?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/gi,
  };

  constructor(private configService: ConfigService) {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    // Default invoice template
    const invoiceTemplate: DocumentTemplate = {
      id: 'tmpl-default-invoice',
      name: 'Default Invoice Template',
      type: 'invoice',
      fields: [
        { name: 'invoiceNumber', type: 'string', required: true },
        { name: 'issueDate', type: 'date', required: true },
        { name: 'dueDate', type: 'date', required: false },
        { name: 'supplierName', type: 'string', required: true },
        { name: 'supplierVat', type: 'string', required: false },
        { name: 'customerName', type: 'string', required: true },
        { name: 'total', type: 'currency', required: true },
        { name: 'vatAmount', type: 'currency', required: false },
        { name: 'currency', type: 'string', required: true },
      ],
      rules: [
        { field: 'invoiceNumber', method: 'regex', pattern: 'invoice_number' },
        { field: 'total', method: 'regex', pattern: 'total' },
      ],
      tenantId: 'system',
      isActive: true,
    };
    this.templates.set(invoiceTemplate.id, invoiceTemplate);
  }

  // =================== DOCUMENT UPLOAD ===================

  async uploadDocument(
    filename: string,
    mimeType: string,
    size: number,
    userId: string,
    tenantId: string,
  ): Promise<DocumentUpload> {
    const id = `doc-${++this.documentIdCounter}-${Date.now()}`;

    const document: DocumentUpload = {
      id,
      filename,
      mimeType,
      size,
      uploadedAt: new Date(),
      userId,
      tenantId,
      status: 'uploaded',
    };

    this.documents.set(id, document);
    this.logger.log(`Document ${id} uploaded: ${filename}`);

    return document;
  }

  async getDocument(documentId: string): Promise<DocumentUpload | null> {
    return this.documents.get(documentId) || null;
  }

  async getDocuments(tenantId: string): Promise<DocumentUpload[]> {
    return Array.from(this.documents.values())
      .filter((d) => d.tenantId === tenantId)
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  // =================== DOCUMENT PROCESSING ===================

  async processDocument(
    documentId: string,
    content: string,
    options?: { templateId?: string; language?: string },
  ): Promise<ProcessedDocument> {
    const startTime = Date.now();
    const document = this.documents.get(documentId);

    if (!document) {
      throw new Error('Document not found');
    }

    document.status = 'processing';

    try {
      // Classify document
      const classification = this.classifyDocument(content);

      // Extract entities
      const entities = this.extractEntities(content, classification.type);

      // Detect metadata
      const metadata = this.detectMetadata(content);

      // Calculate overall confidence
      const confidence = this.calculateConfidence(classification, entities);

      const processed: ProcessedDocument = {
        id: `proc-${documentId}`,
        documentId,
        classification,
        extractedText: content.substring(0, 10000), // Limit stored text
        entities,
        metadata,
        confidence,
        processedAt: new Date(),
        processingTimeMs: Date.now() - startTime,
      };

      this.processedDocuments.set(processed.id, processed);
      document.status = 'processed';

      this.logger.log(`Document ${documentId} processed in ${processed.processingTimeMs}ms`);

      return processed;
    } catch (error) {
      document.status = 'failed';
      throw error;
    }
  }

  async getProcessedDocument(documentId: string): Promise<ProcessedDocument | null> {
    return this.processedDocuments.get(`proc-${documentId}`) || null;
  }

  // =================== DOCUMENT CLASSIFICATION ===================

  classifyDocument(content: string): DocumentClassification {
    const scores: { type: DocumentType; score: number }[] = [];

    for (const [type, patterns] of Object.entries(this.documentPatterns)) {
      if (type === 'unknown') continue;

      let score = 0;
      for (const pattern of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          score += matches.length;
        }
      }
      if (score > 0) {
        scores.push({ type: type as DocumentType, score });
      }
    }

    scores.sort((a, b) => b.score - a.score);

    if (scores.length === 0) {
      return {
        type: 'unknown',
        confidence: 0.3,
      };
    }

    const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
    const topScore = scores[0];
    const confidence = Math.min(0.95, topScore.score / totalScore + 0.3);

    return {
      type: topScore.type,
      confidence,
      alternativeTypes: scores.slice(1, 4).map((s) => ({
        type: s.type,
        confidence: Math.min(0.8, s.score / totalScore + 0.1),
      })),
    };
  }

  // =================== ENTITY EXTRACTION ===================

  extractEntities(content: string, documentType: DocumentType): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    // Determine which entity types to look for based on document type
    const relevantTypes = this.getRelevantEntityTypes(documentType);

    for (const entityType of relevantTypes) {
      const pattern = this.entityPatterns[entityType];
      if (!pattern) continue;

      let match;
      const regex = new RegExp(pattern.source, pattern.flags);

      while ((match = regex.exec(content)) !== null) {
        const value = match[1] || match[0];
        const normalized = this.normalizeEntityValue(entityType, value);

        // Avoid duplicates
        if (!entities.some((e) => e.type === entityType && e.value === value)) {
          entities.push({
            type: entityType,
            value: value.trim(),
            normalizedValue: normalized,
            confidence: this.calculateEntityConfidence(entityType, value),
          });
        }
      }
    }

    return entities;
  }

  private getRelevantEntityTypes(documentType: DocumentType): EntityType[] {
    const common: EntityType[] = ['date', 'amount', 'company_name', 'address'];

    const typeSpecific: Record<DocumentType, EntityType[]> = {
      invoice: [
        'invoice_number', 'vat_number', 'company_id', 'iban', 'currency',
        'total', 'vat_amount', 'vat_rate', 'product', 'quantity', 'unit_price',
      ],
      receipt: ['amount', 'currency', 'vat_amount', 'vat_rate'],
      contract: ['person_name', 'company_id', 'email', 'phone', 'reference'],
      payslip: ['person_name', 'amount', 'company_name', 'company_id'],
      bank_statement: ['iban', 'amount', 'currency', 'reference'],
      tax_declaration: ['company_id', 'vat_number', 'amount', 'reference'],
      shipping_document: ['address', 'phone', 'reference', 'quantity'],
      identity_document: ['person_name', 'date'],
      certificate: ['person_name', 'date', 'reference'],
      report: ['date', 'amount', 'reference'],
      correspondence: ['person_name', 'email', 'phone', 'date'],
      unknown: [],
    };

    return [...common, ...(typeSpecific[documentType] || [])];
  }

  private normalizeEntityValue(type: EntityType, value: string): any {
    switch (type) {
      case 'date':
        // Try to parse as date
        const dateMatch = value.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
        if (dateMatch) {
          const [, day, month, year] = dateMatch;
          const fullYear = year.length === 2 ? `20${year}` : year;
          return new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
        }
        return null;

      case 'amount':
      case 'total':
      case 'vat_amount':
      case 'unit_price':
        // Parse as number
        const numStr = value.replace(/[^\d.,]/g, '').replace(',', '.');
        return parseFloat(numStr) || null;

      case 'vat_rate':
        return parseInt(value) || null;

      case 'currency':
        const currencyMap: Record<string, string> = {
          'RON': 'RON', 'LEI': 'RON', 'EUR': 'EUR', '€': 'EUR',
          'USD': 'USD', '$': 'USD',
        };
        return currencyMap[value.toUpperCase()] || value.toUpperCase();

      case 'email':
        return value.toLowerCase();

      case 'iban':
        return value.replace(/\s/g, '').toUpperCase();

      default:
        return value.trim();
    }
  }

  private calculateEntityConfidence(type: EntityType, value: string): number {
    let confidence = 0.7;

    // Adjust based on value characteristics
    switch (type) {
      case 'email':
        confidence = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 0.95 : 0.6;
        break;
      case 'iban':
        confidence = value.length >= 15 && value.length <= 34 ? 0.9 : 0.5;
        break;
      case 'vat_number':
        confidence = /^RO?\d{2,10}$/.test(value.replace(/\s/g, '')) ? 0.85 : 0.6;
        break;
      case 'date':
        confidence = 0.85;
        break;
      case 'amount':
      case 'total':
        confidence = 0.8;
        break;
    }

    return confidence;
  }

  // =================== METADATA DETECTION ===================

  private detectMetadata(content: string): DocumentMetadata {
    // Detect language
    const roWords = (content.match(/\b(și|în|la|de|pentru|sau|cu|din)\b/gi) || []).length;
    const enWords = (content.match(/\b(and|the|for|with|from|this|that)\b/gi) || []).length;
    const deWords = (content.match(/\b(und|der|die|das|für|mit|von)\b/gi) || []).length;

    let language = 'ro';
    if (enWords > roWords && enWords > deWords) language = 'en';
    else if (deWords > roWords && deWords > enWords) language = 'de';

    // Estimate page count from content length
    const avgCharsPerPage = 3000;
    const pageCount = Math.max(1, Math.ceil(content.length / avgCharsPerPage));

    // Check for signature/stamp indicators
    const hasSignature = /semn[aă]tur[aă]|signature|signed by/i.test(content);
    const hasStamp = /[șş]tampil[aă]|stamp|seal/i.test(content);

    // Detect if scanned (many OCR artifacts)
    const ocrArtifacts = (content.match(/[|l1Il0O]{3,}/g) || []).length;
    const isScanned = ocrArtifacts > 5;

    // Estimate quality
    const errorRate = (content.match(/[^a-zA-Z0-9\s.,;:!?-]/g) || []).length / content.length;
    const quality: 'low' | 'medium' | 'high' =
      errorRate > 0.1 ? 'low' : errorRate > 0.05 ? 'medium' : 'high';

    return {
      pageCount,
      language,
      hasSignature,
      hasStamp,
      isScanned,
      quality,
      orientation: 'portrait',
    };
  }

  private calculateConfidence(
    classification: DocumentClassification,
    entities: ExtractedEntity[],
  ): number {
    let confidence = classification.confidence;

    // Boost confidence if we found expected entities
    const expectedEntities = this.getRelevantEntityTypes(classification.type);
    const foundTypes = new Set(entities.map((e) => e.type));
    const matchRatio = expectedEntities.filter((t) => foundTypes.has(t)).length / expectedEntities.length;

    confidence = confidence * 0.6 + matchRatio * 0.4;

    return Math.round(confidence * 100) / 100;
  }

  // =================== INVOICE EXTRACTION ===================

  async extractInvoiceData(documentId: string): Promise<InvoiceData | null> {
    const processed = await this.getProcessedDocument(documentId);
    if (!processed || processed.classification.type !== 'invoice') {
      return null;
    }

    const entities = processed.entities;

    // Helper to find entity
    const find = (type: EntityType) => entities.find((e) => e.type === type);
    const findAll = (type: EntityType) => entities.filter((e) => e.type === type);

    // Extract invoice number
    const invoiceNum = find('invoice_number');

    // Extract dates
    const dates = findAll('date').map((e) => e.normalizedValue as Date).filter(Boolean);
    dates.sort((a, b) => a.getTime() - b.getTime());

    // Extract amounts
    const amounts = findAll('amount')
      .map((e) => e.normalizedValue as number)
      .filter(Boolean)
      .sort((a, b) => b - a);

    // Extract VAT
    const vatRate = find('vat_rate')?.normalizedValue || 21;
    const vatAmount = find('vat_amount')?.normalizedValue || 0;

    // Extract companies
    const companies = findAll('company_name');
    const vatNumbers = findAll('vat_number');

    // Detect currency
    const currency = find('currency')?.normalizedValue || 'RON';

    const invoiceData: InvoiceData = {
      invoiceNumber: invoiceNum?.value || 'Unknown',
      issueDate: dates[0] || new Date(),
      dueDate: dates[1],
      supplier: {
        name: companies[0]?.value || 'Unknown Supplier',
        vatNumber: vatNumbers[0]?.value,
        address: find('address')?.value,
        iban: find('iban')?.value,
      },
      customer: {
        name: companies[1]?.value || 'Unknown Customer',
        vatNumber: vatNumbers[1]?.value,
      },
      lineItems: [], // Would need more sophisticated parsing
      subtotal: amounts[1] || amounts[0] * (100 / (100 + vatRate)) || 0,
      vatAmount: vatAmount || amounts[0] * (vatRate / (100 + vatRate)) || 0,
      total: amounts[0] || 0,
      currency,
    };

    return invoiceData;
  }

  // =================== BATCH PROCESSING ===================

  async createBatch(
    documents: { filename: string; mimeType: string; size: number }[],
    userId: string,
    tenantId: string,
  ): Promise<DocumentBatch> {
    const id = `batch-${++this.batchIdCounter}-${Date.now()}`;

    const uploads: DocumentUpload[] = [];
    for (const doc of documents) {
      const uploaded = await this.uploadDocument(
        doc.filename,
        doc.mimeType,
        doc.size,
        userId,
        tenantId,
      );
      uploads.push(uploaded);
    }

    const batch: DocumentBatch = {
      id,
      documents: uploads,
      status: 'pending',
      progress: 0,
      results: [],
      errors: [],
      createdAt: new Date(),
    };

    this.batches.set(id, batch);
    return batch;
  }

  async processBatch(batchId: string, contents: Map<string, string>): Promise<DocumentBatch> {
    const batch = this.batches.get(batchId);
    if (!batch) {
      throw new Error('Batch not found');
    }

    batch.status = 'processing';
    const total = batch.documents.length;

    for (let i = 0; i < batch.documents.length; i++) {
      const doc = batch.documents[i];
      const content = contents.get(doc.id);

      try {
        if (content) {
          const processed = await this.processDocument(doc.id, content);
          batch.results.push(processed);
        } else {
          batch.errors.push({ documentId: doc.id, error: 'No content provided' });
        }
      } catch (error) {
        batch.errors.push({ documentId: doc.id, error: error.message });
      }

      batch.progress = Math.round(((i + 1) / total) * 100);
    }

    batch.status = batch.errors.length === 0 ? 'completed' :
                   batch.results.length === 0 ? 'partial' : 'completed';
    batch.completedAt = new Date();

    return batch;
  }

  async getBatch(batchId: string): Promise<DocumentBatch | null> {
    return this.batches.get(batchId) || null;
  }

  // =================== TEMPLATES ===================

  async createTemplate(
    name: string,
    type: DocumentType,
    fields: TemplateField[],
    tenantId: string,
  ): Promise<DocumentTemplate> {
    const id = `tmpl-${++this.templateIdCounter}-${Date.now()}`;

    const template: DocumentTemplate = {
      id,
      name,
      type,
      fields,
      rules: [],
      tenantId,
      isActive: true,
    };

    this.templates.set(id, template);
    return template;
  }

  async getTemplates(tenantId: string): Promise<DocumentTemplate[]> {
    return Array.from(this.templates.values())
      .filter((t) => t.tenantId === tenantId || t.tenantId === 'system');
  }

  async getTemplate(templateId: string): Promise<DocumentTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  // =================== STATISTICS ===================

  async getProcessingStats(tenantId: string): Promise<{
    totalDocuments: number;
    processedDocuments: number;
    failedDocuments: number;
    avgProcessingTime: number;
    documentsByType: Record<string, number>;
    avgConfidence: number;
  }> {
    const tenantDocs = Array.from(this.documents.values())
      .filter((d) => d.tenantId === tenantId);

    const processed = Array.from(this.processedDocuments.values())
      .filter((p) => tenantDocs.some((d) => d.id === p.documentId));

    const documentsByType: Record<string, number> = {};
    let totalConfidence = 0;
    let totalTime = 0;

    for (const proc of processed) {
      const type = proc.classification.type;
      documentsByType[type] = (documentsByType[type] || 0) + 1;
      totalConfidence += proc.confidence;
      totalTime += proc.processingTimeMs;
    }

    return {
      totalDocuments: tenantDocs.length,
      processedDocuments: processed.length,
      failedDocuments: tenantDocs.filter((d) => d.status === 'failed').length,
      avgProcessingTime: processed.length > 0 ? Math.round(totalTime / processed.length) : 0,
      documentsByType,
      avgConfidence: processed.length > 0 ? Math.round((totalConfidence / processed.length) * 100) / 100 : 0,
    };
  }
}
