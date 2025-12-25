import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// =================== TYPES ===================

export type DocumentType =
  | 'invoice'
  | 'contract'
  | 'proposal'
  | 'report'
  | 'letter'
  | 'certificate'
  | 'receipt'
  | 'statement'
  | 'memo'
  | 'policy'
  | 'custom';

export type DocumentFormat = 'pdf' | 'docx' | 'xlsx' | 'html' | 'txt' | 'xml' | 'json';

export type DocumentStatus = 'draft' | 'generating' | 'completed' | 'failed' | 'archived';

export interface DocumentField {
  name: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'boolean' | 'list' | 'table' | 'image' | 'signature';
  label: string;
  required: boolean;
  defaultValue?: any;
  format?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
  };
}

export interface DocumentSection {
  id: string;
  name: string;
  type: 'header' | 'body' | 'footer' | 'table' | 'list' | 'signature' | 'custom';
  content?: string;
  fields: DocumentField[];
  conditional?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'exists';
    value: any;
  };
  repeatable?: boolean;
  pageBreakBefore?: boolean;
  pageBreakAfter?: boolean;
}

export interface DocumentTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: DocumentType;
  category?: string;
  language: string;
  outputFormats: DocumentFormat[];
  sections: DocumentSection[];
  styling: DocumentStyling;
  variables: Record<string, any>;
  metadata: Record<string, any>;
  isSystem: boolean;
  isActive: boolean;
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentStyling {
  pageSize: 'A4' | 'Letter' | 'Legal' | 'A3' | 'A5';
  orientation: 'portrait' | 'landscape';
  margins: { top: number; right: number; bottom: number; left: number };
  fonts: {
    primary: string;
    secondary?: string;
    monospace?: string;
  };
  colors: {
    primary: string;
    secondary: string;
    text: string;
    background: string;
  };
  logo?: {
    url: string;
    position: 'left' | 'center' | 'right';
    width: number;
    height: number;
  };
  watermark?: {
    text: string;
    opacity: number;
    rotation: number;
  };
  headerHeight?: number;
  footerHeight?: number;
}

export interface GeneratedDocument {
  id: string;
  tenantId: string;
  templateId: string;
  templateName: string;
  name: string;
  type: DocumentType;
  format: DocumentFormat;
  status: DocumentStatus;
  data: Record<string, any>;
  content?: string;
  fileUrl?: string;
  fileSize?: number;
  checksum?: string;
  metadata: Record<string, any>;
  generatedBy: string;
  generatedAt: Date;
  expiresAt?: Date;
  downloadCount: number;
  lastDownloadedAt?: Date;
}

export interface GenerationOptions {
  format: DocumentFormat;
  watermark?: boolean;
  password?: string;
  compress?: boolean;
  includeMetadata?: boolean;
  fileName?: string;
  expiresIn?: number;
}

export interface BatchGenerationJob {
  id: string;
  tenantId: string;
  templateId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  totalDocuments: number;
  completedDocuments: number;
  failedDocuments: number;
  dataSource: 'manual' | 'csv' | 'database' | 'api';
  data: Record<string, any>[];
  options: GenerationOptions;
  results: Array<{ index: number; documentId?: string; error?: string }>;
  createdBy: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// =================== SERVICE ===================

@Injectable()
export class DocumentGeneratorService {
  private templates: Map<string, DocumentTemplate> = new Map();
  private documents: Map<string, GeneratedDocument> = new Map();
  private batchJobs: Map<string, BatchGenerationJob> = new Map();

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeSystemTemplates();
  }

  private initializeSystemTemplates(): void {
    const systemTemplates: Omit<DocumentTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      // Invoice Template
      {
        tenantId: 'system',
        name: 'Standard Invoice',
        description: 'Professional invoice template with itemized billing',
        type: 'invoice',
        category: 'finance',
        language: 'en',
        outputFormats: ['pdf', 'html', 'xml'],
        sections: [
          {
            id: 'header',
            name: 'Invoice Header',
            type: 'header',
            fields: [
              { name: 'companyName', type: 'text', label: 'Company Name', required: true },
              { name: 'companyLogo', type: 'image', label: 'Logo', required: false },
              { name: 'companyAddress', type: 'text', label: 'Address', required: true },
              { name: 'companyVAT', type: 'text', label: 'VAT Number', required: true },
              { name: 'invoiceNumber', type: 'text', label: 'Invoice Number', required: true },
              { name: 'invoiceDate', type: 'date', label: 'Invoice Date', required: true, format: 'DD/MM/YYYY' },
              { name: 'dueDate', type: 'date', label: 'Due Date', required: true, format: 'DD/MM/YYYY' },
            ],
          },
          {
            id: 'customer',
            name: 'Customer Details',
            type: 'body',
            fields: [
              { name: 'customerName', type: 'text', label: 'Customer Name', required: true },
              { name: 'customerAddress', type: 'text', label: 'Customer Address', required: true },
              { name: 'customerVAT', type: 'text', label: 'Customer VAT', required: false },
              { name: 'customerEmail', type: 'text', label: 'Email', required: false },
            ],
          },
          {
            id: 'items',
            name: 'Invoice Items',
            type: 'table',
            repeatable: true,
            fields: [
              { name: 'description', type: 'text', label: 'Description', required: true },
              { name: 'quantity', type: 'number', label: 'Qty', required: true },
              { name: 'unitPrice', type: 'currency', label: 'Unit Price', required: true },
              { name: 'vatRate', type: 'number', label: 'VAT %', required: true, defaultValue: 21 },
              { name: 'total', type: 'currency', label: 'Total', required: true },
            ],
          },
          {
            id: 'totals',
            name: 'Totals',
            type: 'body',
            fields: [
              { name: 'subtotal', type: 'currency', label: 'Subtotal', required: true },
              { name: 'vatAmount', type: 'currency', label: 'VAT Amount', required: true },
              { name: 'totalAmount', type: 'currency', label: 'Total', required: true },
              { name: 'currency', type: 'text', label: 'Currency', required: true, defaultValue: 'RON' },
            ],
          },
          {
            id: 'payment',
            name: 'Payment Details',
            type: 'body',
            fields: [
              { name: 'bankName', type: 'text', label: 'Bank Name', required: true },
              { name: 'iban', type: 'text', label: 'IBAN', required: true },
              { name: 'swift', type: 'text', label: 'SWIFT/BIC', required: false },
              { name: 'paymentTerms', type: 'text', label: 'Payment Terms', required: false },
            ],
          },
          {
            id: 'footer',
            name: 'Footer',
            type: 'footer',
            fields: [
              { name: 'notes', type: 'text', label: 'Notes', required: false },
              { name: 'legalText', type: 'text', label: 'Legal Text', required: false },
            ],
          },
        ],
        styling: {
          pageSize: 'A4',
          orientation: 'portrait',
          margins: { top: 20, right: 20, bottom: 20, left: 20 },
          fonts: { primary: 'Helvetica', secondary: 'Arial' },
          colors: { primary: '#2563eb', secondary: '#64748b', text: '#1e293b', background: '#ffffff' },
        },
        variables: {},
        metadata: { version: '1.0', author: 'System' },
        isSystem: true,
        isActive: true,
        version: 1,
        createdBy: 'system',
      },

      // Contract Template
      {
        tenantId: 'system',
        name: 'Employment Contract',
        description: 'Standard employment contract template',
        type: 'contract',
        category: 'hr',
        language: 'en',
        outputFormats: ['pdf', 'docx'],
        sections: [
          {
            id: 'header',
            name: 'Contract Header',
            type: 'header',
            fields: [
              { name: 'contractNumber', type: 'text', label: 'Contract Number', required: true },
              { name: 'contractDate', type: 'date', label: 'Date', required: true },
              { name: 'contractTitle', type: 'text', label: 'Title', required: true, defaultValue: 'Employment Contract' },
            ],
          },
          {
            id: 'parties',
            name: 'Contracting Parties',
            type: 'body',
            fields: [
              { name: 'employerName', type: 'text', label: 'Employer Name', required: true },
              { name: 'employerAddress', type: 'text', label: 'Employer Address', required: true },
              { name: 'employerRep', type: 'text', label: 'Representative', required: true },
              { name: 'employeeName', type: 'text', label: 'Employee Name', required: true },
              { name: 'employeeAddress', type: 'text', label: 'Employee Address', required: true },
              { name: 'employeeID', type: 'text', label: 'ID Number', required: true },
            ],
          },
          {
            id: 'terms',
            name: 'Employment Terms',
            type: 'body',
            fields: [
              { name: 'position', type: 'text', label: 'Position', required: true },
              { name: 'department', type: 'text', label: 'Department', required: true },
              { name: 'startDate', type: 'date', label: 'Start Date', required: true },
              { name: 'contractType', type: 'text', label: 'Contract Type', required: true, validation: { options: ['Permanent', 'Fixed-term', 'Part-time'] } },
              { name: 'workHours', type: 'number', label: 'Weekly Hours', required: true, defaultValue: 40 },
              { name: 'probationPeriod', type: 'number', label: 'Probation (months)', required: false, defaultValue: 3 },
            ],
          },
          {
            id: 'compensation',
            name: 'Compensation',
            type: 'body',
            fields: [
              { name: 'baseSalary', type: 'currency', label: 'Base Salary', required: true },
              { name: 'paymentFrequency', type: 'text', label: 'Payment Frequency', required: true, defaultValue: 'Monthly' },
              { name: 'benefits', type: 'list', label: 'Benefits', required: false },
              { name: 'bonusStructure', type: 'text', label: 'Bonus Structure', required: false },
            ],
          },
          {
            id: 'clauses',
            name: 'Contract Clauses',
            type: 'body',
            fields: [
              { name: 'confidentiality', type: 'boolean', label: 'Include Confidentiality Clause', required: false, defaultValue: true },
              { name: 'nonCompete', type: 'boolean', label: 'Include Non-Compete Clause', required: false, defaultValue: false },
              { name: 'terminationNotice', type: 'number', label: 'Termination Notice (days)', required: true, defaultValue: 30 },
            ],
          },
          {
            id: 'signatures',
            name: 'Signatures',
            type: 'signature',
            fields: [
              { name: 'employerSignature', type: 'signature', label: 'Employer Signature', required: true },
              { name: 'employerSignDate', type: 'date', label: 'Date', required: true },
              { name: 'employeeSignature', type: 'signature', label: 'Employee Signature', required: true },
              { name: 'employeeSignDate', type: 'date', label: 'Date', required: true },
            ],
          },
        ],
        styling: {
          pageSize: 'A4',
          orientation: 'portrait',
          margins: { top: 25, right: 25, bottom: 25, left: 25 },
          fonts: { primary: 'Times New Roman', secondary: 'Arial' },
          colors: { primary: '#1e3a5f', secondary: '#6b7280', text: '#111827', background: '#ffffff' },
        },
        variables: {},
        metadata: { version: '1.0', author: 'System' },
        isSystem: true,
        isActive: true,
        version: 1,
        createdBy: 'system',
      },

      // Proposal Template
      {
        tenantId: 'system',
        name: 'Business Proposal',
        description: 'Professional business proposal template',
        type: 'proposal',
        category: 'sales',
        language: 'en',
        outputFormats: ['pdf', 'docx'],
        sections: [
          {
            id: 'cover',
            name: 'Cover Page',
            type: 'header',
            pageBreakAfter: true,
            fields: [
              { name: 'proposalTitle', type: 'text', label: 'Proposal Title', required: true },
              { name: 'clientName', type: 'text', label: 'Client Name', required: true },
              { name: 'preparedBy', type: 'text', label: 'Prepared By', required: true },
              { name: 'proposalDate', type: 'date', label: 'Date', required: true },
              { name: 'validUntil', type: 'date', label: 'Valid Until', required: true },
            ],
          },
          {
            id: 'executive',
            name: 'Executive Summary',
            type: 'body',
            fields: [
              { name: 'summary', type: 'text', label: 'Executive Summary', required: true },
              { name: 'objectives', type: 'list', label: 'Key Objectives', required: true },
            ],
          },
          {
            id: 'scope',
            name: 'Scope of Work',
            type: 'body',
            fields: [
              { name: 'scopeDescription', type: 'text', label: 'Scope Description', required: true },
              { name: 'deliverables', type: 'list', label: 'Deliverables', required: true },
              { name: 'timeline', type: 'text', label: 'Timeline', required: true },
            ],
          },
          {
            id: 'pricing',
            name: 'Pricing',
            type: 'table',
            fields: [
              { name: 'item', type: 'text', label: 'Item', required: true },
              { name: 'description', type: 'text', label: 'Description', required: true },
              { name: 'quantity', type: 'number', label: 'Qty', required: true },
              { name: 'price', type: 'currency', label: 'Price', required: true },
            ],
          },
          {
            id: 'terms',
            name: 'Terms & Conditions',
            type: 'body',
            fields: [
              { name: 'paymentTerms', type: 'text', label: 'Payment Terms', required: true },
              { name: 'warranty', type: 'text', label: 'Warranty', required: false },
              { name: 'additionalTerms', type: 'text', label: 'Additional Terms', required: false },
            ],
          },
          {
            id: 'acceptance',
            name: 'Acceptance',
            type: 'signature',
            fields: [
              { name: 'clientSignature', type: 'signature', label: 'Client Signature', required: false },
              { name: 'acceptanceDate', type: 'date', label: 'Date', required: false },
            ],
          },
        ],
        styling: {
          pageSize: 'A4',
          orientation: 'portrait',
          margins: { top: 20, right: 20, bottom: 20, left: 20 },
          fonts: { primary: 'Helvetica', secondary: 'Arial' },
          colors: { primary: '#0f766e', secondary: '#64748b', text: '#1e293b', background: '#ffffff' },
        },
        variables: {},
        metadata: { version: '1.0', author: 'System' },
        isSystem: true,
        isActive: true,
        version: 1,
        createdBy: 'system',
      },

      // Receipt Template
      {
        tenantId: 'system',
        name: 'Payment Receipt',
        description: 'Simple payment receipt template',
        type: 'receipt',
        category: 'finance',
        language: 'en',
        outputFormats: ['pdf', 'html'],
        sections: [
          {
            id: 'header',
            name: 'Receipt Header',
            type: 'header',
            fields: [
              { name: 'companyName', type: 'text', label: 'Company Name', required: true },
              { name: 'receiptNumber', type: 'text', label: 'Receipt Number', required: true },
              { name: 'receiptDate', type: 'date', label: 'Date', required: true },
            ],
          },
          {
            id: 'payment',
            name: 'Payment Details',
            type: 'body',
            fields: [
              { name: 'receivedFrom', type: 'text', label: 'Received From', required: true },
              { name: 'amount', type: 'currency', label: 'Amount', required: true },
              { name: 'amountInWords', type: 'text', label: 'Amount in Words', required: true },
              { name: 'paymentMethod', type: 'text', label: 'Payment Method', required: true },
              { name: 'paymentFor', type: 'text', label: 'Payment For', required: true },
            ],
          },
          {
            id: 'footer',
            name: 'Footer',
            type: 'footer',
            fields: [
              { name: 'receivedBy', type: 'text', label: 'Received By', required: true },
              { name: 'signature', type: 'signature', label: 'Signature', required: false },
            ],
          },
        ],
        styling: {
          pageSize: 'A5',
          orientation: 'landscape',
          margins: { top: 15, right: 15, bottom: 15, left: 15 },
          fonts: { primary: 'Arial' },
          colors: { primary: '#059669', secondary: '#6b7280', text: '#1f2937', background: '#ffffff' },
        },
        variables: {},
        metadata: { version: '1.0', author: 'System' },
        isSystem: true,
        isActive: true,
        version: 1,
        createdBy: 'system',
      },

      // Romanian Invoice (Factura)
      {
        tenantId: 'system',
        name: 'Factură Fiscală',
        description: 'Șablon factură fiscală conform legislației românești',
        type: 'invoice',
        category: 'finance',
        language: 'ro',
        outputFormats: ['pdf', 'xml'],
        sections: [
          {
            id: 'header',
            name: 'Antet Factură',
            type: 'header',
            fields: [
              { name: 'serieFact', type: 'text', label: 'Serie', required: true },
              { name: 'numarFact', type: 'text', label: 'Număr', required: true },
              { name: 'dataEmitere', type: 'date', label: 'Data Emiterii', required: true, format: 'DD.MM.YYYY' },
              { name: 'dataScadenta', type: 'date', label: 'Data Scadenței', required: true, format: 'DD.MM.YYYY' },
            ],
          },
          {
            id: 'furnizor',
            name: 'Date Furnizor',
            type: 'body',
            fields: [
              { name: 'denumireFurnizor', type: 'text', label: 'Denumire', required: true },
              { name: 'cuiFurnizor', type: 'text', label: 'CUI', required: true },
              { name: 'regComFurnizor', type: 'text', label: 'Reg. Com.', required: true },
              { name: 'adresaFurnizor', type: 'text', label: 'Adresă', required: true },
              { name: 'bancaFurnizor', type: 'text', label: 'Banca', required: true },
              { name: 'ibanFurnizor', type: 'text', label: 'IBAN', required: true },
            ],
          },
          {
            id: 'client',
            name: 'Date Client',
            type: 'body',
            fields: [
              { name: 'denumireClient', type: 'text', label: 'Denumire', required: true },
              { name: 'cuiClient', type: 'text', label: 'CUI', required: true },
              { name: 'regComClient', type: 'text', label: 'Reg. Com.', required: false },
              { name: 'adresaClient', type: 'text', label: 'Adresă', required: true },
            ],
          },
          {
            id: 'produse',
            name: 'Produse/Servicii',
            type: 'table',
            repeatable: true,
            fields: [
              { name: 'nrCrt', type: 'number', label: 'Nr.', required: true },
              { name: 'denumire', type: 'text', label: 'Denumire produs/serviciu', required: true },
              { name: 'um', type: 'text', label: 'U.M.', required: true },
              { name: 'cantitate', type: 'number', label: 'Cant.', required: true },
              { name: 'pretUnitar', type: 'currency', label: 'Preț unitar', required: true },
              { name: 'valoare', type: 'currency', label: 'Valoare', required: true },
              { name: 'cotaTVA', type: 'number', label: 'Cotă TVA %', required: true, defaultValue: 19 },
              { name: 'valoareTVA', type: 'currency', label: 'Valoare TVA', required: true },
            ],
          },
          {
            id: 'totaluri',
            name: 'Totaluri',
            type: 'body',
            fields: [
              { name: 'totalFaraTVA', type: 'currency', label: 'Total fără TVA', required: true },
              { name: 'totalTVA', type: 'currency', label: 'Total TVA', required: true },
              { name: 'totalGeneral', type: 'currency', label: 'TOTAL DE PLATĂ', required: true },
              { name: 'moneda', type: 'text', label: 'Moneda', required: true, defaultValue: 'RON' },
            ],
          },
          {
            id: 'semnaturi',
            name: 'Semnături',
            type: 'signature',
            fields: [
              { name: 'intocmit', type: 'text', label: 'Întocmit', required: true },
              { name: 'semnaturaFurnizor', type: 'signature', label: 'Semnătură Furnizor', required: false },
              { name: 'semnaturaClient', type: 'signature', label: 'Semnătură Client', required: false },
            ],
          },
        ],
        styling: {
          pageSize: 'A4',
          orientation: 'portrait',
          margins: { top: 15, right: 15, bottom: 15, left: 15 },
          fonts: { primary: 'Arial', secondary: 'Times New Roman' },
          colors: { primary: '#1e40af', secondary: '#6b7280', text: '#111827', background: '#ffffff' },
        },
        variables: {},
        metadata: { version: '1.0', author: 'System', compliance: 'ANAF' },
        isSystem: true,
        isActive: true,
        version: 1,
        createdBy: 'system',
      },
    ];

    for (const template of systemTemplates) {
      const id = `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.templates.set(id, {
        id,
        ...template,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  // =================== TEMPLATE MANAGEMENT ===================

  async getTemplates(
    tenantId: string,
    filters?: {
      type?: DocumentType;
      category?: string;
      language?: string;
      search?: string;
      isActive?: boolean;
    },
  ): Promise<DocumentTemplate[]> {
    let templates = Array.from(this.templates.values()).filter(
      (t) => t.tenantId === tenantId || t.isSystem,
    );

    if (filters?.type) {
      templates = templates.filter((t) => t.type === filters.type);
    }

    if (filters?.category) {
      templates = templates.filter((t) => t.category === filters.category);
    }

    if (filters?.language) {
      templates = templates.filter((t) => t.language === filters.language);
    }

    if (filters?.isActive !== undefined) {
      templates = templates.filter((t) => t.isActive === filters.isActive);
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(search) ||
          (t.description && t.description.toLowerCase().includes(search)),
      );
    }

    return templates.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getTemplate(id: string): Promise<DocumentTemplate | null> {
    return this.templates.get(id) || null;
  }

  async createTemplate(data: {
    tenantId: string;
    createdBy: string;
    name: string;
    description?: string;
    type: DocumentType;
    category?: string;
    language: string;
    outputFormats: DocumentFormat[];
    sections: DocumentSection[];
    styling: DocumentStyling;
    variables?: Record<string, any>;
    metadata?: Record<string, any>;
  }): Promise<DocumentTemplate> {
    const id = `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const template: DocumentTemplate = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      type: data.type,
      category: data.category,
      language: data.language,
      outputFormats: data.outputFormats,
      sections: data.sections,
      styling: data.styling,
      variables: data.variables || {},
      metadata: data.metadata || {},
      isSystem: false,
      isActive: true,
      version: 1,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(id, template);

    this.eventEmitter.emit('document.template.created', { template });

    return template;
  }

  async updateTemplate(
    id: string,
    updates: Partial<{
      name: string;
      description: string;
      category: string;
      language: string;
      outputFormats: DocumentFormat[];
      sections: DocumentSection[];
      styling: DocumentStyling;
      variables: Record<string, any>;
      metadata: Record<string, any>;
      isActive: boolean;
    }>,
  ): Promise<DocumentTemplate | null> {
    const template = this.templates.get(id);
    if (!template || template.isSystem) {
      return null;
    }

    const updated: DocumentTemplate = {
      ...template,
      ...updates,
      version: template.version + 1,
      updatedAt: new Date(),
    };

    this.templates.set(id, updated);

    this.eventEmitter.emit('document.template.updated', { template: updated });

    return updated;
  }

  async deleteTemplate(id: string): Promise<void> {
    const template = this.templates.get(id);
    if (template && !template.isSystem) {
      this.templates.delete(id);
      this.eventEmitter.emit('document.template.deleted', { templateId: id });
    }
  }

  async duplicateTemplate(
    id: string,
    name: string,
    tenantId: string,
    createdBy: string,
  ): Promise<DocumentTemplate | null> {
    const original = this.templates.get(id);
    if (!original) {
      return null;
    }

    return this.createTemplate({
      tenantId,
      createdBy,
      name,
      description: original.description,
      type: original.type,
      category: original.category,
      language: original.language,
      outputFormats: [...original.outputFormats],
      sections: JSON.parse(JSON.stringify(original.sections)),
      styling: JSON.parse(JSON.stringify(original.styling)),
      variables: JSON.parse(JSON.stringify(original.variables)),
      metadata: { ...original.metadata, duplicatedFrom: id },
    });
  }

  // =================== DOCUMENT GENERATION ===================

  async generateDocument(data: {
    tenantId: string;
    templateId: string;
    name: string;
    data: Record<string, any>;
    options: GenerationOptions;
    generatedBy: string;
  }): Promise<GeneratedDocument> {
    const template = this.templates.get(data.templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    if (!template.outputFormats.includes(data.options.format)) {
      throw new Error(`Format ${data.options.format} not supported by this template`);
    }

    const docId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const document: GeneratedDocument = {
      id: docId,
      tenantId: data.tenantId,
      templateId: data.templateId,
      templateName: template.name,
      name: data.name,
      type: template.type,
      format: data.options.format,
      status: 'generating',
      data: data.data,
      metadata: {
        templateVersion: template.version,
        ...data.options,
      },
      generatedBy: data.generatedBy,
      generatedAt: new Date(),
      downloadCount: 0,
    };

    if (data.options.expiresIn) {
      document.expiresAt = new Date(Date.now() + data.options.expiresIn * 1000);
    }

    this.documents.set(docId, document);

    // Generate document content
    try {
      const content = await this.renderDocument(template, data.data, data.options);

      document.content = content;
      document.status = 'completed';
      document.fileUrl = `/api/documents/${docId}/download`;
      document.fileSize = content.length;
      document.checksum = this.generateChecksum(content);

      this.eventEmitter.emit('document.generated', { document });

    } catch (error: any) {
      document.status = 'failed';
      document.metadata.error = error.message;

      this.eventEmitter.emit('document.generation.failed', {
        documentId: docId,
        error: error.message,
      });
    }

    this.documents.set(docId, document);

    return document;
  }

  private async renderDocument(
    template: DocumentTemplate,
    data: Record<string, any>,
    options: GenerationOptions,
  ): Promise<string> {
    // Build document structure
    const documentContent: string[] = [];

    // Add header
    documentContent.push(`<!-- Document: ${template.name} -->`);
    documentContent.push(`<!-- Generated: ${new Date().toISOString()} -->`);
    documentContent.push(`<!-- Format: ${options.format} -->`);
    documentContent.push('');

    // Process each section
    for (const section of template.sections) {
      // Check conditional
      if (section.conditional) {
        const fieldValue = data[section.conditional.field];
        const conditionMet = this.evaluateCondition(
          fieldValue,
          section.conditional.operator,
          section.conditional.value,
        );
        if (!conditionMet) continue;
      }

      documentContent.push(`<!-- Section: ${section.name} -->`);

      if (section.pageBreakBefore) {
        documentContent.push('<div class="page-break"></div>');
      }

      // Render section fields
      for (const field of section.fields) {
        const value = this.getFieldValue(data, field, section);
        documentContent.push(this.renderField(field, value));
      }

      if (section.pageBreakAfter) {
        documentContent.push('<div class="page-break"></div>');
      }

      documentContent.push('');
    }

    // Apply styling
    const styledContent = this.applyStyles(documentContent.join('\n'), template.styling);

    // Add watermark if requested
    if (options.watermark && template.styling.watermark) {
      return this.addWatermark(styledContent, template.styling.watermark);
    }

    return styledContent;
  }

  private evaluateCondition(
    value: any,
    operator: string,
    expected: any,
  ): boolean {
    switch (operator) {
      case 'equals':
        return value === expected;
      case 'not_equals':
        return value !== expected;
      case 'contains':
        return String(value).includes(String(expected));
      case 'exists':
        return value !== undefined && value !== null;
      default:
        return true;
    }
  }

  private getFieldValue(
    data: Record<string, any>,
    field: DocumentField,
    section: DocumentSection,
  ): any {
    const value = data[field.name] ?? field.defaultValue;

    // Format value based on type
    switch (field.type) {
      case 'date':
        if (value) {
          const date = new Date(value);
          return field.format ? this.formatDate(date, field.format) : date.toLocaleDateString();
        }
        return '';

      case 'currency':
        if (value !== undefined) {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: data.currency || 'RON',
          }).format(value);
        }
        return '';

      case 'number':
        return value !== undefined ? String(value) : '';

      case 'boolean':
        return value ? 'Yes' : 'No';

      case 'list':
        if (Array.isArray(value)) {
          return value.map((item) => `• ${item}`).join('\n');
        }
        return '';

      default:
        return value ?? '';
    }
  }

  private formatDate(date: Date, format: string): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return format
      .replace('DD', day)
      .replace('MM', month)
      .replace('YYYY', String(year));
  }

  private renderField(field: DocumentField, value: any): string {
    return `<div class="field field-${field.type}">
      <label>${field.label}:</label>
      <span>${value}</span>
    </div>`;
  }

  private applyStyles(content: string, styling: DocumentStyling): string {
    const css = `
      <style>
        @page {
          size: ${styling.pageSize} ${styling.orientation};
          margin: ${styling.margins.top}mm ${styling.margins.right}mm ${styling.margins.bottom}mm ${styling.margins.left}mm;
        }
        body {
          font-family: ${styling.fonts.primary}, sans-serif;
          color: ${styling.colors.text};
          background: ${styling.colors.background};
        }
        .primary { color: ${styling.colors.primary}; }
        .secondary { color: ${styling.colors.secondary}; }
        .page-break { page-break-after: always; }
        .field { margin-bottom: 8px; }
        .field label { font-weight: bold; margin-right: 8px; }
      </style>
    `;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  ${css}
</head>
<body>
  ${content}
</body>
</html>`;
  }

  private addWatermark(
    content: string,
    watermark: { text: string; opacity: number; rotation: number },
  ): string {
    const watermarkStyle = `
      <style>
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(${watermark.rotation}deg);
          font-size: 72px;
          color: rgba(0, 0, 0, ${watermark.opacity});
          z-index: -1;
          pointer-events: none;
        }
      </style>
      <div class="watermark">${watermark.text}</div>
    `;

    return content.replace('</body>', `${watermarkStyle}</body>`);
  }

  private generateChecksum(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  // =================== DOCUMENT RETRIEVAL ===================

  async getDocuments(
    tenantId: string,
    filters?: {
      templateId?: string;
      type?: DocumentType;
      status?: DocumentStatus;
      startDate?: Date;
      endDate?: Date;
      search?: string;
      limit?: number;
    },
  ): Promise<GeneratedDocument[]> {
    let documents = Array.from(this.documents.values()).filter(
      (d) => d.tenantId === tenantId,
    );

    if (filters?.templateId) {
      documents = documents.filter((d) => d.templateId === filters.templateId);
    }

    if (filters?.type) {
      documents = documents.filter((d) => d.type === filters.type);
    }

    if (filters?.status) {
      documents = documents.filter((d) => d.status === filters.status);
    }

    if (filters?.startDate) {
      documents = documents.filter((d) => d.generatedAt >= filters.startDate!);
    }

    if (filters?.endDate) {
      documents = documents.filter((d) => d.generatedAt <= filters.endDate!);
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      documents = documents.filter((d) => d.name.toLowerCase().includes(search));
    }

    documents = documents.sort(
      (a, b) => b.generatedAt.getTime() - a.generatedAt.getTime(),
    );

    if (filters?.limit) {
      documents = documents.slice(0, filters.limit);
    }

    return documents;
  }

  async getDocument(id: string): Promise<GeneratedDocument | null> {
    return this.documents.get(id) || null;
  }

  async downloadDocument(id: string): Promise<{ content: string; mimeType: string; fileName: string } | null> {
    const document = this.documents.get(id);
    if (!document || document.status !== 'completed') {
      return null;
    }

    // Update download stats
    document.downloadCount++;
    document.lastDownloadedAt = new Date();
    this.documents.set(id, document);

    const mimeTypes: Record<DocumentFormat, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      html: 'text/html',
      txt: 'text/plain',
      xml: 'application/xml',
      json: 'application/json',
    };

    return {
      content: document.content || '',
      mimeType: mimeTypes[document.format],
      fileName: `${document.name}.${document.format}`,
    };
  }

  async deleteDocument(id: string): Promise<void> {
    this.documents.delete(id);
    this.eventEmitter.emit('document.deleted', { documentId: id });
  }

  async archiveDocument(id: string): Promise<GeneratedDocument | null> {
    const document = this.documents.get(id);
    if (!document) {
      return null;
    }

    document.status = 'archived';
    this.documents.set(id, document);

    this.eventEmitter.emit('document.archived', { document });

    return document;
  }

  // =================== BATCH GENERATION ===================

  async createBatchJob(data: {
    tenantId: string;
    templateId: string;
    dataSource: BatchGenerationJob['dataSource'];
    data: Record<string, any>[];
    options: GenerationOptions;
    createdBy: string;
  }): Promise<BatchGenerationJob> {
    const template = this.templates.get(data.templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const jobId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const job: BatchGenerationJob = {
      id: jobId,
      tenantId: data.tenantId,
      templateId: data.templateId,
      status: 'pending',
      totalDocuments: data.data.length,
      completedDocuments: 0,
      failedDocuments: 0,
      dataSource: data.dataSource,
      data: data.data,
      options: data.options,
      results: [],
      createdBy: data.createdBy,
      createdAt: new Date(),
    };

    this.batchJobs.set(jobId, job);

    // Start processing asynchronously
    this.processBatchJob(job);

    return job;
  }

  private async processBatchJob(job: BatchGenerationJob): Promise<void> {
    job.status = 'processing';
    job.startedAt = new Date();
    this.batchJobs.set(job.id, job);

    for (let i = 0; i < job.data.length; i++) {
      try {
        const docData = job.data[i];
        const document = await this.generateDocument({
          tenantId: job.tenantId,
          templateId: job.templateId,
          name: `${job.id}-${i + 1}`,
          data: docData,
          options: job.options,
          generatedBy: job.createdBy,
        });

        job.results.push({ index: i, documentId: document.id });
        job.completedDocuments++;

      } catch (error: any) {
        job.results.push({ index: i, error: error.message });
        job.failedDocuments++;
      }

      this.batchJobs.set(job.id, job);
    }

    job.status = job.failedDocuments === job.totalDocuments ? 'failed' : 'completed';
    job.completedAt = new Date();
    this.batchJobs.set(job.id, job);

    this.eventEmitter.emit('document.batch.completed', { job });
  }

  async getBatchJob(id: string): Promise<BatchGenerationJob | null> {
    return this.batchJobs.get(id) || null;
  }

  async getBatchJobs(
    tenantId: string,
    filters?: {
      status?: BatchGenerationJob['status'];
      limit?: number;
    },
  ): Promise<BatchGenerationJob[]> {
    let jobs = Array.from(this.batchJobs.values()).filter(
      (j) => j.tenantId === tenantId,
    );

    if (filters?.status) {
      jobs = jobs.filter((j) => j.status === filters.status);
    }

    jobs = jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.limit) {
      jobs = jobs.slice(0, filters.limit);
    }

    return jobs;
  }

  async cancelBatchJob(id: string): Promise<BatchGenerationJob | null> {
    const job = this.batchJobs.get(id);
    if (!job || job.status !== 'processing') {
      return null;
    }

    job.status = 'cancelled';
    job.completedAt = new Date();
    this.batchJobs.set(id, job);

    return job;
  }

  // =================== STATS ===================

  async getStats(tenantId: string): Promise<{
    totalTemplates: number;
    customTemplates: number;
    totalDocuments: number;
    documentsByType: Record<string, number>;
    documentsByStatus: Record<string, number>;
    totalDownloads: number;
    recentDocuments: GeneratedDocument[];
  }> {
    const templates = await this.getTemplates(tenantId);
    const documents = await this.getDocuments(tenantId);

    const documentsByType: Record<string, number> = {};
    const documentsByStatus: Record<string, number> = {};
    let totalDownloads = 0;

    for (const doc of documents) {
      documentsByType[doc.type] = (documentsByType[doc.type] || 0) + 1;
      documentsByStatus[doc.status] = (documentsByStatus[doc.status] || 0) + 1;
      totalDownloads += doc.downloadCount;
    }

    return {
      totalTemplates: templates.length,
      customTemplates: templates.filter((t) => !t.isSystem).length,
      totalDocuments: documents.length,
      documentsByType,
      documentsByStatus,
      totalDownloads,
      recentDocuments: documents.slice(0, 5),
    };
  }
}
