import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Sprint 23: AI-Powered Document Analysis Service
// OCR, classification, entity extraction, and intelligent document processing

// ===== TYPES =====

export type DocumentType =
  | 'INVOICE' | 'RECEIPT' | 'CONTRACT' | 'PAYSLIP' | 'TAX_FORM'
  | 'BANK_STATEMENT' | 'PURCHASE_ORDER' | 'DELIVERY_NOTE' | 'ID_DOCUMENT'
  | 'CERTIFICATE' | 'REPORT' | 'LETTER' | 'UNKNOWN';

export type ExtractionConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type ProcessingStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'NEEDS_REVIEW';
export type LanguageCode = 'ro' | 'en' | 'de' | 'fr' | 'es' | 'it';

export interface DocumentMetadata {
  id: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  pageCount: number;
  uploadedAt: Date;
  uploadedBy: string;
  tenantId?: string;
}

export interface ExtractedEntity {
  type: string;
  value: string;
  confidence: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
  pageNumber?: number;
  normalized?: string;
}

export interface ExtractedField {
  fieldName: string;
  fieldNameRo: string;
  value: string;
  confidence: number;
  dataType: 'STRING' | 'NUMBER' | 'DATE' | 'CURRENCY' | 'PERCENTAGE' | 'BOOLEAN';
  normalized?: any;
  validationStatus: 'VALID' | 'INVALID' | 'NEEDS_REVIEW';
  validationMessage?: string;
}

export interface InvoiceData {
  invoiceNumber?: string;
  invoiceDate?: Date;
  dueDate?: Date;
  vendorName?: string;
  vendorCUI?: string;
  vendorAddress?: string;
  buyerName?: string;
  buyerCUI?: string;
  buyerAddress?: string;
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    total: number;
  }[];
  subtotal?: number;
  vatAmount?: number;
  totalAmount?: number;
  currency?: string;
  paymentTerms?: string;
  bankAccount?: string;
}

export interface ReceiptData {
  merchantName?: string;
  merchantCUI?: string;
  receiptNumber?: string;
  receiptDate?: Date;
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
  subtotal?: number;
  vatAmount?: number;
  totalAmount?: number;
  paymentMethod?: string;
  cashierName?: string;
}

export interface ContractData {
  contractType?: string;
  contractNumber?: string;
  startDate?: Date;
  endDate?: Date;
  parties: {
    name: string;
    role: string;
    cui?: string;
    address?: string;
  }[];
  value?: number;
  currency?: string;
  terms: string[];
  signatures: {
    name: string;
    date?: Date;
    position?: string;
  }[];
}

export interface DocumentClassification {
  documentType: DocumentType;
  confidence: number;
  subType?: string;
  language: LanguageCode;
  isRomanian: boolean;
  hasANAFRelevance: boolean;
  suggestedWorkflow?: string;
}

export interface OCRResult {
  text: string;
  confidence: number;
  language: LanguageCode;
  pageResults: {
    pageNumber: number;
    text: string;
    confidence: number;
    words: { text: string; confidence: number; boundingBox: any }[];
  }[];
}

export interface AnalysisResult {
  id: string;
  documentId: string;
  status: ProcessingStatus;

  // Classification
  classification: DocumentClassification;

  // OCR
  ocrResult?: OCRResult;

  // Extracted data
  extractedFields: ExtractedField[];
  extractedEntities: ExtractedEntity[];

  // Structured data (based on document type)
  invoiceData?: InvoiceData;
  receiptData?: ReceiptData;
  contractData?: ContractData;

  // Quality metrics
  overallConfidence: number;
  needsManualReview: boolean;
  reviewReasons: string[];

  // AI insights
  insights: {
    type: string;
    message: string;
    messageRo: string;
    severity: 'INFO' | 'WARNING' | 'ERROR';
  }[];

  // Suggested actions
  suggestedActions: {
    action: string;
    actionRo: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    automated: boolean;
  }[];

  // Processing metadata
  processingTimeMs: number;
  processedAt: Date;
  modelVersion: string;
}

export interface BatchAnalysisJob {
  id: string;
  documentIds: string[];
  status: ProcessingStatus;
  progress: number;
  results: Map<string, AnalysisResult>;
  startedAt: Date;
  completedAt?: Date;
  errors: { documentId: string; error: string }[];
}

export interface ValidationRule {
  id: string;
  name: string;
  documentTypes: DocumentType[];
  field: string;
  rule: 'REQUIRED' | 'FORMAT' | 'RANGE' | 'LOOKUP' | 'CUSTOM';
  parameters: Record<string, any>;
  errorMessage: string;
  errorMessageRo: string;
}

// ===== CONSTANTS =====

const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/webp',
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const ROMANIAN_CUI_PATTERN = /^(RO)?[0-9]{2,10}$/;
const ROMANIAN_IBAN_PATTERN = /^RO[0-9]{2}[A-Z]{4}[0-9A-Z]{16}$/;

@Injectable()
export class DocumentAnalysisService {
  private readonly logger = new Logger(DocumentAnalysisService.name);

  // Storage
  private readonly documents: Map<string, DocumentMetadata> = new Map();
  private readonly analysisResults: Map<string, AnalysisResult> = new Map();
  private readonly batchJobs: Map<string, BatchAnalysisJob> = new Map();
  private readonly validationRules: Map<string, ValidationRule> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeValidationRules();
  }

  // ===== DOCUMENT UPLOAD =====

  async uploadDocument(
    file: { filename: string; mimeType: string; size: number; buffer?: Buffer },
    uploadedBy: string,
    tenantId?: string,
  ): Promise<DocumentMetadata> {
    // Validate file type
    if (!SUPPORTED_MIME_TYPES.includes(file.mimeType)) {
      throw new BadRequestException(`Unsupported file type: ${file.mimeType}`);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    const document: DocumentMetadata = {
      id: this.generateId('doc'),
      filename: file.filename,
      mimeType: file.mimeType,
      fileSize: file.size,
      pageCount: file.mimeType === 'application/pdf' ? this.estimatePageCount(file.size) : 1,
      uploadedAt: new Date(),
      uploadedBy,
      tenantId,
    };

    this.documents.set(document.id, document);

    this.eventEmitter.emit('document.uploaded', {
      documentId: document.id,
      filename: document.filename,
      uploadedBy,
    });

    this.logger.log(`Document uploaded: ${document.filename} (${document.id})`);
    return document;
  }

  private estimatePageCount(fileSize: number): number {
    // Rough estimate: ~100KB per page for PDF
    return Math.max(1, Math.ceil(fileSize / (100 * 1024)));
  }

  // ===== DOCUMENT ANALYSIS =====

  async analyzeDocument(documentId: string): Promise<AnalysisResult> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new BadRequestException(`Document ${documentId} not found`);
    }

    const startTime = Date.now();
    this.logger.log(`Starting analysis for document: ${documentId}`);

    // Create initial result
    const result: AnalysisResult = {
      id: this.generateId('analysis'),
      documentId,
      status: 'PROCESSING',
      classification: await this.classifyDocument(document),
      extractedFields: [],
      extractedEntities: [],
      overallConfidence: 0,
      needsManualReview: false,
      reviewReasons: [],
      insights: [],
      suggestedActions: [],
      processingTimeMs: 0,
      processedAt: new Date(),
      modelVersion: '1.0.0',
    };

    try {
      // Perform OCR
      result.ocrResult = await this.performOCR(document);

      // Extract entities
      result.extractedEntities = await this.extractEntities(result.ocrResult);

      // Extract fields based on document type
      result.extractedFields = await this.extractFields(
        result.ocrResult,
        result.classification.documentType,
      );

      // Extract structured data
      await this.extractStructuredData(result);

      // Validate extracted data
      await this.validateExtractedData(result);

      // Generate insights
      result.insights = this.generateInsights(result);

      // Generate suggested actions
      result.suggestedActions = this.generateSuggestedActions(result);

      // Calculate overall confidence
      result.overallConfidence = this.calculateOverallConfidence(result);

      // Determine if manual review is needed
      result.needsManualReview = result.overallConfidence < 0.85 || result.reviewReasons.length > 0;

      result.status = result.needsManualReview ? 'NEEDS_REVIEW' : 'COMPLETED';

    } catch (error) {
      result.status = 'FAILED';
      result.reviewReasons.push((error as Error).message);
    }

    result.processingTimeMs = Date.now() - startTime;
    result.processedAt = new Date();

    this.analysisResults.set(result.id, result);

    this.eventEmitter.emit('document.analyzed', {
      documentId,
      analysisId: result.id,
      documentType: result.classification.documentType,
      confidence: result.overallConfidence,
    });

    this.logger.log(`Analysis completed for ${documentId}: ${result.classification.documentType} (${result.overallConfidence.toFixed(2)} confidence)`);
    return result;
  }

  // ===== CLASSIFICATION =====

  private async classifyDocument(document: DocumentMetadata): Promise<DocumentClassification> {
    // Simulate AI classification based on filename patterns and content
    const filename = document.filename.toLowerCase();

    let documentType: DocumentType = 'UNKNOWN';
    let confidence = 0.75;
    let subType: string | undefined;

    // Pattern matching for classification
    if (filename.includes('factura') || filename.includes('invoice')) {
      documentType = 'INVOICE';
      confidence = 0.92;
    } else if (filename.includes('bon') || filename.includes('receipt')) {
      documentType = 'RECEIPT';
      confidence = 0.88;
    } else if (filename.includes('contract')) {
      documentType = 'CONTRACT';
      confidence = 0.90;
      subType = filename.includes('munca') ? 'EMPLOYMENT' : 'COMMERCIAL';
    } else if (filename.includes('fluturas') || filename.includes('payslip') || filename.includes('salariu')) {
      documentType = 'PAYSLIP';
      confidence = 0.91;
    } else if (filename.includes('declaratie') || filename.includes('d') && /d\d{3}/.test(filename)) {
      documentType = 'TAX_FORM';
      confidence = 0.85;
    } else if (filename.includes('extras') || filename.includes('statement')) {
      documentType = 'BANK_STATEMENT';
      confidence = 0.87;
    } else if (filename.includes('comanda') || filename.includes('po') || filename.includes('order')) {
      documentType = 'PURCHASE_ORDER';
      confidence = 0.84;
    } else if (filename.includes('aviz') || filename.includes('delivery')) {
      documentType = 'DELIVERY_NOTE';
      confidence = 0.83;
    } else if (filename.includes('ci') || filename.includes('buletin') || filename.includes('pasaport')) {
      documentType = 'ID_DOCUMENT';
      confidence = 0.89;
    } else if (filename.includes('certificat') || filename.includes('diploma')) {
      documentType = 'CERTIFICATE';
      confidence = 0.86;
    }

    // Add variance for realism
    confidence = Math.min(0.99, confidence + (Math.random() - 0.5) * 0.1);

    return {
      documentType,
      confidence,
      subType,
      language: this.detectLanguage(filename),
      isRomanian: filename.includes('ro') || ['factura', 'bon', 'contract', 'fluturas', 'declaratie'].some(w => filename.includes(w)),
      hasANAFRelevance: ['INVOICE', 'RECEIPT', 'TAX_FORM', 'PAYSLIP'].includes(documentType),
      suggestedWorkflow: this.getSuggestedWorkflow(documentType),
    };
  }

  private detectLanguage(text: string): LanguageCode {
    const romanianWords = ['factura', 'bon', 'contract', 'declaratie', 'certificat', 'aviz'];
    if (romanianWords.some(w => text.toLowerCase().includes(w))) return 'ro';
    return 'en';
  }

  private getSuggestedWorkflow(documentType: DocumentType): string | undefined {
    const workflows: Partial<Record<DocumentType, string>> = {
      INVOICE: 'invoice-approval-workflow',
      RECEIPT: 'expense-reimbursement-workflow',
      CONTRACT: 'contract-review-workflow',
      PAYSLIP: 'payroll-distribution-workflow',
      TAX_FORM: 'tax-submission-workflow',
      PURCHASE_ORDER: 'procurement-approval-workflow',
    };
    return workflows[documentType];
  }

  // ===== OCR =====

  private async performOCR(document: DocumentMetadata): Promise<OCRResult> {
    // Simulate OCR processing
    const pageResults = [];
    for (let i = 1; i <= document.pageCount; i++) {
      pageResults.push({
        pageNumber: i,
        text: this.generateSampleText(document, i),
        confidence: 0.92 + Math.random() * 0.06,
        words: this.generateSampleWords(),
      });
    }

    return {
      text: pageResults.map(p => p.text).join('\n\n'),
      confidence: pageResults.reduce((sum, p) => sum + p.confidence, 0) / pageResults.length,
      language: 'ro',
      pageResults,
    };
  }

  private generateSampleText(document: DocumentMetadata, pageNumber: number): string {
    // Generate realistic sample text based on filename
    const filename = document.filename.toLowerCase();

    if (filename.includes('factura') || filename.includes('invoice')) {
      return `FACTURA FISCALA Nr. ${1000 + Math.floor(Math.random() * 9000)}
Data: ${new Date().toLocaleDateString('ro-RO')}

Furnizor: SC EXEMPLU SRL
CUI: RO${10000000 + Math.floor(Math.random() * 90000000)}
Adresa: Str. Exemplu nr. 1, Bucuresti

Cumparator: SC CLIENT SA
CUI: RO${10000000 + Math.floor(Math.random() * 90000000)}

Nr. | Descriere | Cant. | Pret unitar | TVA | Total
1   | Servicii consultanta | 10 | 500.00 RON | 19% | 5,950.00 RON

Subtotal: 5,000.00 RON
TVA 19%: 950.00 RON
TOTAL: 5,950.00 RON

Cont bancar: RO49AAAA1B31007593840000`;
    }

    if (filename.includes('contract')) {
      return `CONTRACT DE PRESTARI SERVICII Nr. ${100 + Math.floor(Math.random() * 900)}/2025

Partile contractante:
1. SC PRESTATOR SRL, CUI RO12345678
2. SC BENEFICIAR SA, CUI RO87654321

Art. 1. Obiectul contractului
Prestarea de servicii de consultanta IT.

Art. 2. Durata contractului
Contract valabil 12 luni de la data semnarii.

Art. 3. Valoare contract
Valoare totala: 50,000 EUR

Semnaturi:
Prestator: ____________  Data: __/__/2025
Beneficiar: ____________  Data: __/__/2025`;
    }

    return `Document scanat - Pagina ${pageNumber}
Continut extras prin OCR.
Data procesarii: ${new Date().toLocaleDateString('ro-RO')}`;
  }

  private generateSampleWords(): { text: string; confidence: number; boundingBox: any }[] {
    const sampleWords = ['FACTURA', 'Nr.', 'Data:', 'Furnizor:', 'CUI:', 'Total:', 'RON', 'TVA'];
    return sampleWords.map((text, index) => ({
      text,
      confidence: 0.90 + Math.random() * 0.1,
      boundingBox: { x: 50 + (index % 4) * 150, y: 50 + Math.floor(index / 4) * 30, width: 100, height: 20 },
    }));
  }

  // ===== ENTITY EXTRACTION =====

  private async extractEntities(ocrResult: OCRResult): Promise<ExtractedEntity[]> {
    const entities: ExtractedEntity[] = [];
    const text = ocrResult.text;

    // Extract CUI (Romanian tax ID)
    const cuiMatches = text.match(/(?:CUI|CIF|C\.U\.I\.|C\.I\.F\.)?:?\s*(RO)?(\d{2,10})/gi);
    if (cuiMatches) {
      for (const match of cuiMatches) {
        const cui = match.replace(/[^0-9RO]/gi, '');
        if (ROMANIAN_CUI_PATTERN.test(cui)) {
          entities.push({
            type: 'CUI',
            value: cui,
            confidence: 0.95,
            normalized: cui.toUpperCase(),
          });
        }
      }
    }

    // Extract IBAN
    const ibanMatches = text.match(/RO\d{2}[A-Z]{4}[0-9A-Z]{16}/gi);
    if (ibanMatches) {
      for (const iban of ibanMatches) {
        entities.push({
          type: 'IBAN',
          value: iban,
          confidence: 0.97,
          normalized: iban.toUpperCase().replace(/\s/g, ''),
        });
      }
    }

    // Extract dates
    const datePatterns = [
      /(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/g,
      /(\d{4})[./-](\d{1,2})[./-](\d{1,2})/g,
    ];
    for (const pattern of datePatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        entities.push({
          type: 'DATE',
          value: match[0],
          confidence: 0.88,
        });
      }
    }

    // Extract monetary amounts
    const amountMatches = text.match(/[\d.,]+\s*(?:RON|EUR|USD|LEI)/gi);
    if (amountMatches) {
      for (const amount of amountMatches) {
        entities.push({
          type: 'AMOUNT',
          value: amount,
          confidence: 0.92,
        });
      }
    }

    // Extract invoice numbers
    const invoiceMatches = text.match(/(?:Nr\.?|Numar|Number)[:\s]*([A-Z0-9/-]+)/gi);
    if (invoiceMatches) {
      for (const match of invoiceMatches) {
        entities.push({
          type: 'INVOICE_NUMBER',
          value: match.replace(/^(?:Nr\.?|Numar|Number)[:\s]*/i, ''),
          confidence: 0.85,
        });
      }
    }

    return entities;
  }

  // ===== FIELD EXTRACTION =====

  private async extractFields(ocrResult: OCRResult, documentType: DocumentType): Promise<ExtractedField[]> {
    const fields: ExtractedField[] = [];
    const text = ocrResult.text;

    switch (documentType) {
      case 'INVOICE':
        fields.push(...this.extractInvoiceFields(text));
        break;
      case 'RECEIPT':
        fields.push(...this.extractReceiptFields(text));
        break;
      case 'CONTRACT':
        fields.push(...this.extractContractFields(text));
        break;
      default:
        fields.push(...this.extractGenericFields(text));
    }

    return fields;
  }

  private extractInvoiceFields(text: string): ExtractedField[] {
    const fields: ExtractedField[] = [];

    // Invoice number
    const invoiceNumMatch = text.match(/(?:FACTURA|Invoice).*?Nr\.?\s*([A-Z0-9/-]+)/i);
    if (invoiceNumMatch) {
      fields.push({
        fieldName: 'invoiceNumber',
        fieldNameRo: 'Numar factura',
        value: invoiceNumMatch[1],
        confidence: 0.92,
        dataType: 'STRING',
        validationStatus: 'VALID',
      });
    }

    // Total amount
    const totalMatch = text.match(/TOTAL[:\s]*([0-9.,]+)\s*(RON|EUR|USD)?/i);
    if (totalMatch) {
      fields.push({
        fieldName: 'totalAmount',
        fieldNameRo: 'Total',
        value: totalMatch[1],
        confidence: 0.94,
        dataType: 'CURRENCY',
        normalized: parseFloat(totalMatch[1].replace(/[.,]/g, m => m === '.' ? '' : '.')),
        validationStatus: 'VALID',
      });
    }

    // VAT amount
    const vatMatch = text.match(/TVA[:\s]*([0-9.,]+)\s*(RON|EUR|USD)?/i);
    if (vatMatch) {
      fields.push({
        fieldName: 'vatAmount',
        fieldNameRo: 'TVA',
        value: vatMatch[1],
        confidence: 0.93,
        dataType: 'CURRENCY',
        validationStatus: 'VALID',
      });
    }

    // Vendor name
    const vendorMatch = text.match(/(?:Furnizor|Vendor|Emitent)[:\s]*([A-Z\s]+(?:SRL|SA|PFA|II))/i);
    if (vendorMatch) {
      fields.push({
        fieldName: 'vendorName',
        fieldNameRo: 'Furnizor',
        value: vendorMatch[1].trim(),
        confidence: 0.88,
        dataType: 'STRING',
        validationStatus: 'VALID',
      });
    }

    return fields;
  }

  private extractReceiptFields(text: string): ExtractedField[] {
    const fields: ExtractedField[] = [];

    // Merchant name
    const merchantMatch = text.match(/^([A-Z\s]+(?:SRL|SA|PFA)?)/i);
    if (merchantMatch) {
      fields.push({
        fieldName: 'merchantName',
        fieldNameRo: 'Comerciant',
        value: merchantMatch[1].trim(),
        confidence: 0.85,
        dataType: 'STRING',
        validationStatus: 'VALID',
      });
    }

    // Total
    const totalMatch = text.match(/TOTAL[:\s]*([0-9.,]+)/i);
    if (totalMatch) {
      fields.push({
        fieldName: 'totalAmount',
        fieldNameRo: 'Total',
        value: totalMatch[1],
        confidence: 0.92,
        dataType: 'CURRENCY',
        validationStatus: 'VALID',
      });
    }

    return fields;
  }

  private extractContractFields(text: string): ExtractedField[] {
    const fields: ExtractedField[] = [];

    // Contract number
    const contractNumMatch = text.match(/CONTRACT.*?Nr\.?\s*([A-Z0-9/-]+)/i);
    if (contractNumMatch) {
      fields.push({
        fieldName: 'contractNumber',
        fieldNameRo: 'Numar contract',
        value: contractNumMatch[1],
        confidence: 0.90,
        dataType: 'STRING',
        validationStatus: 'VALID',
      });
    }

    // Contract value
    const valueMatch = text.match(/(?:Valoare|Value)[:\s]*([0-9.,]+)\s*(EUR|RON|USD)?/i);
    if (valueMatch) {
      fields.push({
        fieldName: 'contractValue',
        fieldNameRo: 'Valoare contract',
        value: valueMatch[1],
        confidence: 0.88,
        dataType: 'CURRENCY',
        validationStatus: 'VALID',
      });
    }

    return fields;
  }

  private extractGenericFields(text: string): ExtractedField[] {
    const fields: ExtractedField[] = [];

    // Extract any dates found
    const dateMatch = text.match(/Data[:\s]*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i);
    if (dateMatch) {
      fields.push({
        fieldName: 'documentDate',
        fieldNameRo: 'Data document',
        value: dateMatch[1],
        confidence: 0.85,
        dataType: 'DATE',
        validationStatus: 'VALID',
      });
    }

    return fields;
  }

  // ===== STRUCTURED DATA EXTRACTION =====

  private async extractStructuredData(result: AnalysisResult): Promise<void> {
    switch (result.classification.documentType) {
      case 'INVOICE':
        result.invoiceData = this.buildInvoiceData(result);
        break;
      case 'RECEIPT':
        result.receiptData = this.buildReceiptData(result);
        break;
      case 'CONTRACT':
        result.contractData = this.buildContractData(result);
        break;
    }
  }

  private buildInvoiceData(result: AnalysisResult): InvoiceData {
    const getField = (name: string) => result.extractedFields.find(f => f.fieldName === name)?.value;
    const getEntity = (type: string) => result.extractedEntities.find(e => e.type === type)?.value;

    return {
      invoiceNumber: getField('invoiceNumber'),
      invoiceDate: getField('invoiceDate') ? new Date(getField('invoiceDate')!) : undefined,
      vendorName: getField('vendorName'),
      vendorCUI: getEntity('CUI'),
      totalAmount: parseFloat(getField('totalAmount')?.replace(/[^0-9.,]/g, '') || '0'),
      vatAmount: parseFloat(getField('vatAmount')?.replace(/[^0-9.,]/g, '') || '0'),
      currency: 'RON',
      lineItems: [
        {
          description: 'Extracted item',
          quantity: 1,
          unitPrice: parseFloat(getField('totalAmount')?.replace(/[^0-9.,]/g, '') || '0'),
          vatRate: 19,
          total: parseFloat(getField('totalAmount')?.replace(/[^0-9.,]/g, '') || '0'),
        },
      ],
    };
  }

  private buildReceiptData(result: AnalysisResult): ReceiptData {
    const getField = (name: string) => result.extractedFields.find(f => f.fieldName === name)?.value;

    return {
      merchantName: getField('merchantName'),
      totalAmount: parseFloat(getField('totalAmount')?.replace(/[^0-9.,]/g, '') || '0'),
      items: [],
    };
  }

  private buildContractData(result: AnalysisResult): ContractData {
    const getField = (name: string) => result.extractedFields.find(f => f.fieldName === name)?.value;

    return {
      contractNumber: getField('contractNumber'),
      value: parseFloat(getField('contractValue')?.replace(/[^0-9.,]/g, '') || '0'),
      currency: 'EUR',
      parties: [],
      terms: [],
      signatures: [],
    };
  }

  // ===== VALIDATION =====

  private async validateExtractedData(result: AnalysisResult): Promise<void> {
    for (const field of result.extractedFields) {
      const rules = this.getValidationRulesForField(result.classification.documentType, field.fieldName);

      for (const rule of rules) {
        const valid = this.applyValidationRule(field, rule);
        if (!valid) {
          field.validationStatus = 'INVALID';
          field.validationMessage = rule.errorMessageRo;
          result.reviewReasons.push(`${field.fieldNameRo}: ${rule.errorMessageRo}`);
        }
      }
    }

    // Validate CUI entities
    for (const entity of result.extractedEntities) {
      if (entity.type === 'CUI' && !ROMANIAN_CUI_PATTERN.test(entity.value)) {
        result.reviewReasons.push(`CUI invalid: ${entity.value}`);
      }
    }
  }

  private getValidationRulesForField(documentType: DocumentType, fieldName: string): ValidationRule[] {
    return Array.from(this.validationRules.values()).filter(
      r => r.documentTypes.includes(documentType) && r.field === fieldName,
    );
  }

  private applyValidationRule(field: ExtractedField, rule: ValidationRule): boolean {
    switch (rule.rule) {
      case 'REQUIRED':
        return !!field.value && field.value.trim().length > 0;
      case 'FORMAT':
        return new RegExp(rule.parameters.pattern).test(field.value);
      case 'RANGE':
        const num = parseFloat(field.value);
        return num >= rule.parameters.min && num <= rule.parameters.max;
      default:
        return true;
    }
  }

  private initializeValidationRules(): void {
    const rules: Omit<ValidationRule, 'id'>[] = [
      {
        name: 'Invoice Number Required',
        documentTypes: ['INVOICE'],
        field: 'invoiceNumber',
        rule: 'REQUIRED',
        parameters: {},
        errorMessage: 'Invoice number is required',
        errorMessageRo: 'Numarul facturii este obligatoriu',
      },
      {
        name: 'Total Amount Required',
        documentTypes: ['INVOICE', 'RECEIPT'],
        field: 'totalAmount',
        rule: 'REQUIRED',
        parameters: {},
        errorMessage: 'Total amount is required',
        errorMessageRo: 'Suma totala este obligatorie',
      },
      {
        name: 'Total Amount Range',
        documentTypes: ['INVOICE', 'RECEIPT'],
        field: 'totalAmount',
        rule: 'RANGE',
        parameters: { min: 0.01, max: 10000000 },
        errorMessage: 'Total amount must be between 0.01 and 10,000,000',
        errorMessageRo: 'Suma totala trebuie sa fie intre 0.01 si 10,000,000',
      },
    ];

    for (const rule of rules) {
      const id = this.generateId('rule');
      this.validationRules.set(id, { ...rule, id });
    }
  }

  // ===== INSIGHTS & ACTIONS =====

  private generateInsights(result: AnalysisResult): AnalysisResult['insights'] {
    const insights: AnalysisResult['insights'] = [];

    // Low confidence warning
    if (result.overallConfidence < 0.8) {
      insights.push({
        type: 'LOW_CONFIDENCE',
        message: 'Document quality may affect extraction accuracy',
        messageRo: 'Calitatea documentului poate afecta acuratetea extragerii',
        severity: 'WARNING',
      });
    }

    // ANAF relevance
    if (result.classification.hasANAFRelevance) {
      insights.push({
        type: 'ANAF_RELEVANT',
        message: 'This document may need to be submitted to ANAF',
        messageRo: 'Acest document poate necesita transmitere catre ANAF',
        severity: 'INFO',
      });
    }

    // Missing fields
    const requiredFields = this.getRequiredFieldsForType(result.classification.documentType);
    const missingFields = requiredFields.filter(
      f => !result.extractedFields.some(ef => ef.fieldName === f),
    );
    if (missingFields.length > 0) {
      insights.push({
        type: 'MISSING_FIELDS',
        message: `Missing required fields: ${missingFields.join(', ')}`,
        messageRo: `Campuri obligatorii lipsa: ${missingFields.join(', ')}`,
        severity: 'WARNING',
      });
    }

    return insights;
  }

  private getRequiredFieldsForType(documentType: DocumentType): string[] {
    const required: Partial<Record<DocumentType, string[]>> = {
      INVOICE: ['invoiceNumber', 'totalAmount', 'vendorName'],
      RECEIPT: ['totalAmount', 'merchantName'],
      CONTRACT: ['contractNumber'],
    };
    return required[documentType] || [];
  }

  private generateSuggestedActions(result: AnalysisResult): AnalysisResult['suggestedActions'] {
    const actions: AnalysisResult['suggestedActions'] = [];

    if (result.classification.documentType === 'INVOICE' && result.invoiceData) {
      actions.push({
        action: 'Create accounting entry',
        actionRo: 'Creeaza inregistrare contabila',
        priority: 'HIGH',
        automated: true,
      });

      if (result.classification.hasANAFRelevance) {
        actions.push({
          action: 'Submit to e-Factura',
          actionRo: 'Transmite la e-Factura',
          priority: 'HIGH',
          automated: true,
        });
      }
    }

    if (result.needsManualReview) {
      actions.push({
        action: 'Manual review required',
        actionRo: 'Necesita verificare manuala',
        priority: 'MEDIUM',
        automated: false,
      });
    }

    return actions;
  }

  // ===== CONFIDENCE CALCULATION =====

  private calculateOverallConfidence(result: AnalysisResult): number {
    const weights = {
      classification: 0.2,
      ocr: 0.3,
      fields: 0.3,
      entities: 0.2,
    };

    let score = result.classification.confidence * weights.classification;

    if (result.ocrResult) {
      score += result.ocrResult.confidence * weights.ocr;
    }

    if (result.extractedFields.length > 0) {
      const avgFieldConfidence = result.extractedFields.reduce((sum, f) => sum + f.confidence, 0) / result.extractedFields.length;
      score += avgFieldConfidence * weights.fields;
    } else {
      score += 0.5 * weights.fields;
    }

    if (result.extractedEntities.length > 0) {
      const avgEntityConfidence = result.extractedEntities.reduce((sum, e) => sum + e.confidence, 0) / result.extractedEntities.length;
      score += avgEntityConfidence * weights.entities;
    } else {
      score += 0.5 * weights.entities;
    }

    return Math.min(0.99, Math.max(0, score));
  }

  // ===== BATCH PROCESSING =====

  async createBatchJob(documentIds: string[]): Promise<BatchAnalysisJob> {
    const job: BatchAnalysisJob = {
      id: this.generateId('batch'),
      documentIds,
      status: 'PENDING',
      progress: 0,
      results: new Map(),
      startedAt: new Date(),
      errors: [],
    };

    this.batchJobs.set(job.id, job);
    return job;
  }

  async processBatchJob(jobId: string): Promise<BatchAnalysisJob> {
    const job = this.batchJobs.get(jobId);
    if (!job) {
      throw new BadRequestException(`Batch job ${jobId} not found`);
    }

    job.status = 'PROCESSING';

    for (let i = 0; i < job.documentIds.length; i++) {
      const docId = job.documentIds[i];
      try {
        const result = await this.analyzeDocument(docId);
        job.results.set(docId, result);
      } catch (error) {
        job.errors.push({ documentId: docId, error: (error as Error).message });
      }
      job.progress = ((i + 1) / job.documentIds.length) * 100;
    }

    job.status = job.errors.length === 0 ? 'COMPLETED' : 'COMPLETED';
    job.completedAt = new Date();

    return job;
  }

  // ===== RETRIEVAL =====

  getDocument(documentId: string): DocumentMetadata | undefined {
    return this.documents.get(documentId);
  }

  getAnalysisResult(analysisId: string): AnalysisResult | undefined {
    return this.analysisResults.get(analysisId);
  }

  getAnalysisForDocument(documentId: string): AnalysisResult | undefined {
    return Array.from(this.analysisResults.values()).find(r => r.documentId === documentId);
  }

  getBatchJob(jobId: string): BatchAnalysisJob | undefined {
    return this.batchJobs.get(jobId);
  }

  // ===== HELPERS =====

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
