import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';

export type TemplateType = 'INVOICE' | 'CONTRACT' | 'REPORT' | 'LETTER' | 'RECEIPT' | 'QUOTE' | 'ORDER' | 'CERTIFICATE' | 'CUSTOM';
export type OutputFormat = 'PDF' | 'DOCX' | 'HTML' | 'TXT' | 'XML';
export type VariableType = 'STRING' | 'NUMBER' | 'DATE' | 'CURRENCY' | 'BOOLEAN' | 'IMAGE' | 'LIST' | 'OBJECT';
export type TemplateStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'DEPRECATED';

export interface DocumentTemplate {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  type: TemplateType;
  status: TemplateStatus;
  version: number;
  content: TemplateContent;
  variables: TemplateVariable[];
  sections: TemplateSection[];
  styling: TemplateStyling;
  outputFormats: OutputFormat[];
  metadata: TemplateMetadata;
  createdBy: string;
  tenantId?: string;
  isSystem: boolean;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface TemplateContent {
  header?: string;
  body: string;
  footer?: string;
  language: 'RO' | 'EN' | 'BILINGUAL';
}

export interface TemplateVariable {
  name: string;
  label: string;
  labelRo: string;
  type: VariableType;
  required: boolean;
  defaultValue?: any;
  format?: string;
  validation?: VariableValidation;
  description?: string;
  descriptionRo?: string;
}

export interface VariableValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  allowedValues?: any[];
}

export interface TemplateSection {
  id: string;
  name: string;
  nameRo: string;
  type: 'STATIC' | 'CONDITIONAL' | 'REPEATABLE' | 'OPTIONAL';
  content: string;
  contentRo?: string;
  condition?: string;
  repeatVariable?: string;
  order: number;
  isVisible: boolean;
}

export interface TemplateStyling {
  fontFamily: string;
  fontSize: number;
  primaryColor: string;
  secondaryColor: string;
  headerBgColor?: string;
  pageSize: 'A4' | 'A3' | 'LETTER' | 'LEGAL';
  orientation: 'PORTRAIT' | 'LANDSCAPE';
  margins: { top: number; right: number; bottom: number; left: number };
  lineHeight: number;
  logo?: string;
  watermark?: string;
}

export interface TemplateMetadata {
  category: string;
  categoryRo: string;
  tags: string[];
  author: string;
  lastModifiedBy?: string;
  usageCount: number;
  rating?: number;
  isCompliant: boolean;
  complianceNotes?: string;
}

export interface GeneratedDocument {
  id: string;
  templateId: string;
  templateVersion: number;
  name: string;
  format: OutputFormat;
  content: string;
  variables: Record<string, any>;
  language: 'RO' | 'EN';
  fileSize: number;
  fileUrl?: string;
  generatedBy: string;
  tenantId?: string;
  generatedAt: Date;
  expiresAt?: Date;
  metadata: Record<string, any>;
}

export interface TemplateVersion {
  version: number;
  content: TemplateContent;
  variables: TemplateVariable[];
  sections: TemplateSection[];
  changelog: string;
  changelogRo?: string;
  createdBy: string;
  createdAt: Date;
}

export interface TemplateCategory {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  icon: string;
  templateCount: number;
  order: number;
}

export interface RenderOptions {
  format: OutputFormat;
  language: 'RO' | 'EN';
  includeWatermark?: boolean;
  includePageNumbers?: boolean;
  customStyling?: Partial<TemplateStyling>;
}

@Injectable()
export class DocumentTemplateService {
  private templates: Map<string, DocumentTemplate> = new Map();
  private documents: Map<string, GeneratedDocument> = new Map();
  private versions: Map<string, TemplateVersion[]> = new Map();
  private categories: Map<string, TemplateCategory> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeCategories();
    this.initializeSystemTemplates();
  }

  private initializeCategories(): void {
    const defaultCategories: Omit<TemplateCategory, 'id' | 'templateCount'>[] = [
      { name: 'Invoicing', nameRo: 'Facturare', description: 'Invoice and billing templates', descriptionRo: 'Șabloane pentru facturi și facturare', icon: 'receipt', order: 1 },
      { name: 'Contracts', nameRo: 'Contracte', description: 'Legal and business contracts', descriptionRo: 'Contracte legale și de afaceri', icon: 'description', order: 2 },
      { name: 'HR Documents', nameRo: 'Documente HR', description: 'Human resources templates', descriptionRo: 'Șabloane resurse umane', icon: 'people', order: 3 },
      { name: 'Financial Reports', nameRo: 'Rapoarte Financiare', description: 'Financial reporting templates', descriptionRo: 'Șabloane rapoarte financiare', icon: 'assessment', order: 4 },
      { name: 'Compliance', nameRo: 'Conformitate', description: 'Regulatory compliance documents', descriptionRo: 'Documente conformitate reglementări', icon: 'verified', order: 5 },
      { name: 'Correspondence', nameRo: 'Corespondență', description: 'Letters and communications', descriptionRo: 'Scrisori și comunicări', icon: 'mail', order: 6 },
    ];

    defaultCategories.forEach((cat) => {
      const category: TemplateCategory = {
        ...cat,
        id: `cat-${randomUUID()}`,
        templateCount: 0,
      };
      this.categories.set(category.id, category);
    });
  }

  private initializeSystemTemplates(): void {
    const defaultStyling: TemplateStyling = {
      fontFamily: 'Arial',
      fontSize: 11,
      primaryColor: '#1a365d',
      secondaryColor: '#2b6cb0',
      headerBgColor: '#f7fafc',
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margins: { top: 20, right: 15, bottom: 20, left: 15 },
      lineHeight: 1.5,
    };

    const invoiceTemplate: Omit<DocumentTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
      name: 'Standard Invoice',
      nameRo: 'Factură Standard',
      description: 'Standard invoice template compliant with Romanian regulations',
      descriptionRo: 'Șablon factură standard conform reglementărilor românești',
      type: 'INVOICE',
      status: 'ACTIVE',
      version: 1,
      content: {
        header: '<div class="header">{{company.name}} - {{company.cui}}</div>',
        body: `
<h1>{{#if language.ro}}FACTURĂ{{else}}INVOICE{{/if}} #{{invoice.number}}</h1>
<div class="invoice-info">
  <p>{{#if language.ro}}Data{{else}}Date{{/if}}: {{invoice.date | date}}</p>
  <p>{{#if language.ro}}Scadență{{else}}Due Date{{/if}}: {{invoice.dueDate | date}}</p>
</div>
<div class="parties">
  <div class="supplier">
    <h3>{{#if language.ro}}Furnizor{{else}}Supplier{{/if}}</h3>
    <p>{{company.name}}</p>
    <p>CUI: {{company.cui}}</p>
    <p>{{company.address}}</p>
  </div>
  <div class="customer">
    <h3>{{#if language.ro}}Client{{else}}Customer{{/if}}</h3>
    <p>{{customer.name}}</p>
    <p>CUI: {{customer.cui}}</p>
    <p>{{customer.address}}</p>
  </div>
</div>
<table class="items">
  <thead>
    <tr>
      <th>{{#if language.ro}}Descriere{{else}}Description{{/if}}</th>
      <th>{{#if language.ro}}Cantitate{{else}}Quantity{{/if}}</th>
      <th>{{#if language.ro}}Preț{{else}}Price{{/if}}</th>
      <th>{{#if language.ro}}Total{{else}}Total{{/if}}</th>
    </tr>
  </thead>
  <tbody>
    {{#each items}}
    <tr>
      <td>{{this.description}}</td>
      <td>{{this.quantity}}</td>
      <td>{{this.unitPrice | currency}}</td>
      <td>{{this.total | currency}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>
<div class="totals">
  <p>{{#if language.ro}}Subtotal{{else}}Subtotal{{/if}}: {{invoice.subtotal | currency}}</p>
  <p>TVA ({{invoice.vatRate}}%): {{invoice.vatAmount | currency}}</p>
  <p class="grand-total">{{#if language.ro}}TOTAL{{else}}TOTAL{{/if}}: {{invoice.total | currency}}</p>
</div>`,
        footer: '<div class="footer">{{company.name}} | {{company.email}} | {{company.phone}}</div>',
        language: 'BILINGUAL',
      },
      variables: [
        { name: 'company.name', label: 'Company Name', labelRo: 'Nume Companie', type: 'STRING', required: true },
        { name: 'company.cui', label: 'Company CUI', labelRo: 'CUI Companie', type: 'STRING', required: true },
        { name: 'company.address', label: 'Company Address', labelRo: 'Adresă Companie', type: 'STRING', required: true },
        { name: 'company.email', label: 'Company Email', labelRo: 'Email Companie', type: 'STRING', required: false },
        { name: 'company.phone', label: 'Company Phone', labelRo: 'Telefon Companie', type: 'STRING', required: false },
        { name: 'customer.name', label: 'Customer Name', labelRo: 'Nume Client', type: 'STRING', required: true },
        { name: 'customer.cui', label: 'Customer CUI', labelRo: 'CUI Client', type: 'STRING', required: false },
        { name: 'customer.address', label: 'Customer Address', labelRo: 'Adresă Client', type: 'STRING', required: true },
        { name: 'invoice.number', label: 'Invoice Number', labelRo: 'Număr Factură', type: 'STRING', required: true },
        { name: 'invoice.date', label: 'Invoice Date', labelRo: 'Data Facturii', type: 'DATE', required: true },
        { name: 'invoice.dueDate', label: 'Due Date', labelRo: 'Data Scadenței', type: 'DATE', required: true },
        { name: 'invoice.subtotal', label: 'Subtotal', labelRo: 'Subtotal', type: 'CURRENCY', required: true },
        { name: 'invoice.vatRate', label: 'VAT Rate', labelRo: 'Cotă TVA', type: 'NUMBER', required: true, defaultValue: 19 },
        { name: 'invoice.vatAmount', label: 'VAT Amount', labelRo: 'Sumă TVA', type: 'CURRENCY', required: true },
        { name: 'invoice.total', label: 'Total', labelRo: 'Total', type: 'CURRENCY', required: true },
        { name: 'items', label: 'Invoice Items', labelRo: 'Articole Factură', type: 'LIST', required: true },
      ],
      sections: [
        { id: 'header', name: 'Header', nameRo: 'Antet', type: 'STATIC', content: '', order: 1, isVisible: true },
        { id: 'parties', name: 'Parties', nameRo: 'Părți', type: 'STATIC', content: '', order: 2, isVisible: true },
        { id: 'items', name: 'Items', nameRo: 'Articole', type: 'REPEATABLE', content: '', repeatVariable: 'items', order: 3, isVisible: true },
        { id: 'totals', name: 'Totals', nameRo: 'Totaluri', type: 'STATIC', content: '', order: 4, isVisible: true },
      ],
      styling: defaultStyling,
      outputFormats: ['PDF', 'HTML', 'DOCX'],
      metadata: {
        category: 'Invoicing',
        categoryRo: 'Facturare',
        tags: ['invoice', 'billing', 'anaf', 'efactura'],
        author: 'DocumentIulia',
        usageCount: 0,
        isCompliant: true,
        complianceNotes: 'Compliant with Romanian e-Factura regulations',
      },
      createdBy: 'system',
      isSystem: true,
    };

    const contractTemplate: Omit<DocumentTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
      name: 'Employment Contract',
      nameRo: 'Contract de Muncă',
      description: 'Standard employment contract template',
      descriptionRo: 'Șablon contract de muncă standard',
      type: 'CONTRACT',
      status: 'ACTIVE',
      version: 1,
      content: {
        body: `
<h1>{{#if language.ro}}CONTRACT INDIVIDUAL DE MUNCĂ{{else}}EMPLOYMENT CONTRACT{{/if}}</h1>
<p>{{#if language.ro}}Nr.{{else}}No.{{/if}} {{contract.number}} / {{contract.date | date}}</p>

<h2>{{#if language.ro}}PĂRȚILE CONTRACTANTE{{else}}CONTRACTING PARTIES{{/if}}</h2>
<p><strong>{{#if language.ro}}Angajator{{else}}Employer{{/if}}:</strong> {{employer.name}}, CUI: {{employer.cui}}</p>
<p><strong>{{#if language.ro}}Angajat{{else}}Employee{{/if}}:</strong> {{employee.name}}, CNP: {{employee.cnp}}</p>

<h2>{{#if language.ro}}OBIECTUL CONTRACTULUI{{else}}CONTRACT OBJECT{{/if}}</h2>
<p>{{#if language.ro}}Funcția{{else}}Position{{/if}}: {{contract.position}}</p>
<p>{{#if language.ro}}Departament{{else}}Department{{/if}}: {{contract.department}}</p>
<p>{{#if language.ro}}Locul de muncă{{else}}Workplace{{/if}}: {{contract.workplace}}</p>

<h2>{{#if language.ro}}DURATA CONTRACTULUI{{else}}CONTRACT DURATION{{/if}}</h2>
<p>{{#if contract.indefinite}}{{#if language.ro}}Nedeterminată{{else}}Indefinite{{/if}}{{else}}{{contract.duration}} {{#if language.ro}}luni{{else}}months{{/if}}{{/if}}</p>
<p>{{#if language.ro}}Data începerii{{else}}Start date{{/if}}: {{contract.startDate | date}}</p>

<h2>{{#if language.ro}}SALARIUL{{else}}SALARY{{/if}}</h2>
<p>{{#if language.ro}}Salariu brut{{else}}Gross salary{{/if}}: {{contract.grossSalary | currency}} / {{#if language.ro}}lună{{else}}month{{/if}}</p>

{{#if contract.additionalClauses}}
<h2>{{#if language.ro}}CLAUZE SUPLIMENTARE{{else}}ADDITIONAL CLAUSES{{/if}}</h2>
{{#each contract.additionalClauses}}
<p>{{this}}</p>
{{/each}}
{{/if}}

<div class="signatures">
  <div class="employer-signature">
    <p>{{#if language.ro}}Angajator{{else}}Employer{{/if}}</p>
    <p>{{employer.name}}</p>
    <p>_____________________</p>
  </div>
  <div class="employee-signature">
    <p>{{#if language.ro}}Angajat{{else}}Employee{{/if}}</p>
    <p>{{employee.name}}</p>
    <p>_____________________</p>
  </div>
</div>`,
        language: 'BILINGUAL',
      },
      variables: [
        { name: 'employer.name', label: 'Employer Name', labelRo: 'Nume Angajator', type: 'STRING', required: true },
        { name: 'employer.cui', label: 'Employer CUI', labelRo: 'CUI Angajator', type: 'STRING', required: true },
        { name: 'employee.name', label: 'Employee Name', labelRo: 'Nume Angajat', type: 'STRING', required: true },
        { name: 'employee.cnp', label: 'Employee CNP', labelRo: 'CNP Angajat', type: 'STRING', required: true },
        { name: 'contract.number', label: 'Contract Number', labelRo: 'Număr Contract', type: 'STRING', required: true },
        { name: 'contract.date', label: 'Contract Date', labelRo: 'Data Contract', type: 'DATE', required: true },
        { name: 'contract.position', label: 'Position', labelRo: 'Funcție', type: 'STRING', required: true },
        { name: 'contract.department', label: 'Department', labelRo: 'Departament', type: 'STRING', required: true },
        { name: 'contract.workplace', label: 'Workplace', labelRo: 'Loc de Muncă', type: 'STRING', required: true },
        { name: 'contract.indefinite', label: 'Indefinite Duration', labelRo: 'Durată Nedeterminată', type: 'BOOLEAN', required: true, defaultValue: true },
        { name: 'contract.duration', label: 'Duration (months)', labelRo: 'Durată (luni)', type: 'NUMBER', required: false },
        { name: 'contract.startDate', label: 'Start Date', labelRo: 'Data Începerii', type: 'DATE', required: true },
        { name: 'contract.grossSalary', label: 'Gross Salary', labelRo: 'Salariu Brut', type: 'CURRENCY', required: true },
        { name: 'contract.additionalClauses', label: 'Additional Clauses', labelRo: 'Clauze Suplimentare', type: 'LIST', required: false },
      ],
      sections: [
        { id: 'header', name: 'Header', nameRo: 'Antet', type: 'STATIC', content: '', order: 1, isVisible: true },
        { id: 'parties', name: 'Parties', nameRo: 'Părți', type: 'STATIC', content: '', order: 2, isVisible: true },
        { id: 'object', name: 'Contract Object', nameRo: 'Obiect Contract', type: 'STATIC', content: '', order: 3, isVisible: true },
        { id: 'duration', name: 'Duration', nameRo: 'Durată', type: 'STATIC', content: '', order: 4, isVisible: true },
        { id: 'salary', name: 'Salary', nameRo: 'Salariu', type: 'STATIC', content: '', order: 5, isVisible: true },
        { id: 'clauses', name: 'Additional Clauses', nameRo: 'Clauze Suplimentare', type: 'CONDITIONAL', content: '', condition: 'contract.additionalClauses', order: 6, isVisible: true },
        { id: 'signatures', name: 'Signatures', nameRo: 'Semnături', type: 'STATIC', content: '', order: 7, isVisible: true },
      ],
      styling: defaultStyling,
      outputFormats: ['PDF', 'DOCX'],
      metadata: {
        category: 'HR Documents',
        categoryRo: 'Documente HR',
        tags: ['contract', 'employment', 'hr', 'legal'],
        author: 'DocumentIulia',
        usageCount: 0,
        isCompliant: true,
        complianceNotes: 'Compliant with Romanian Labor Code',
      },
      createdBy: 'system',
      isSystem: true,
    };

    const receiptTemplate: Omit<DocumentTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
      name: 'Payment Receipt',
      nameRo: 'Chitanță',
      description: 'Payment receipt template',
      descriptionRo: 'Șablon chitanță',
      type: 'RECEIPT',
      status: 'ACTIVE',
      version: 1,
      content: {
        body: `
<h1>{{#if language.ro}}CHITANȚĂ{{else}}RECEIPT{{/if}}</h1>
<p>{{#if language.ro}}Nr.{{else}}No.{{/if}} {{receipt.number}} / {{receipt.date | date}}</p>
<p>{{#if language.ro}}Am primit de la{{else}}Received from{{/if}}: {{payer.name}}</p>
<p>{{#if language.ro}}Suma de{{else}}The amount of{{/if}}: {{receipt.amount | currency}} ({{receipt.amountInWords}})</p>
<p>{{#if language.ro}}Reprezentând{{else}}Representing{{/if}}: {{receipt.description}}</p>
<div class="signature">
  <p>{{#if language.ro}}Casier{{else}}Cashier{{/if}}: _____________________</p>
</div>`,
        language: 'BILINGUAL',
      },
      variables: [
        { name: 'receipt.number', label: 'Receipt Number', labelRo: 'Număr Chitanță', type: 'STRING', required: true },
        { name: 'receipt.date', label: 'Receipt Date', labelRo: 'Data Chitanței', type: 'DATE', required: true },
        { name: 'payer.name', label: 'Payer Name', labelRo: 'Nume Plătitor', type: 'STRING', required: true },
        { name: 'receipt.amount', label: 'Amount', labelRo: 'Sumă', type: 'CURRENCY', required: true },
        { name: 'receipt.amountInWords', label: 'Amount in Words', labelRo: 'Suma în Litere', type: 'STRING', required: true },
        { name: 'receipt.description', label: 'Description', labelRo: 'Descriere', type: 'STRING', required: true },
      ],
      sections: [
        { id: 'main', name: 'Main Content', nameRo: 'Conținut Principal', type: 'STATIC', content: '', order: 1, isVisible: true },
      ],
      styling: { ...defaultStyling, pageSize: 'A4' as const },
      outputFormats: ['PDF', 'HTML'],
      metadata: {
        category: 'Invoicing',
        categoryRo: 'Facturare',
        tags: ['receipt', 'payment', 'cash'],
        author: 'DocumentIulia',
        usageCount: 0,
        isCompliant: true,
      },
      createdBy: 'system',
      isSystem: true,
    };

    [invoiceTemplate, contractTemplate, receiptTemplate].forEach((template) => {
      const fullTemplate: DocumentTemplate = {
        ...template,
        id: `template-${randomUUID()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: new Date(),
      };
      this.templates.set(fullTemplate.id, fullTemplate);
      this.versions.set(fullTemplate.id, [{
        version: 1,
        content: fullTemplate.content,
        variables: fullTemplate.variables,
        sections: fullTemplate.sections,
        changelog: 'Initial version',
        createdBy: 'system',
        createdAt: new Date(),
      }]);
    });
  }

  // Template Management
  createTemplate(data: {
    name: string;
    nameRo: string;
    description: string;
    descriptionRo: string;
    type: TemplateType;
    content: TemplateContent;
    variables: TemplateVariable[];
    sections?: TemplateSection[];
    styling?: Partial<TemplateStyling>;
    outputFormats?: OutputFormat[];
    metadata?: Partial<TemplateMetadata>;
    createdBy: string;
    tenantId?: string;
  }): DocumentTemplate {
    const defaultStyling: TemplateStyling = {
      fontFamily: 'Arial',
      fontSize: 11,
      primaryColor: '#1a365d',
      secondaryColor: '#2b6cb0',
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margins: { top: 20, right: 15, bottom: 20, left: 15 },
      lineHeight: 1.5,
    };

    const template: DocumentTemplate = {
      id: `template-${randomUUID()}`,
      name: data.name,
      nameRo: data.nameRo,
      description: data.description,
      descriptionRo: data.descriptionRo,
      type: data.type,
      status: 'DRAFT',
      version: 1,
      content: data.content,
      variables: data.variables,
      sections: data.sections || [],
      styling: { ...defaultStyling, ...data.styling },
      outputFormats: data.outputFormats || ['PDF', 'HTML'],
      metadata: {
        category: 'Custom',
        categoryRo: 'Personalizat',
        tags: [],
        author: data.createdBy,
        usageCount: 0,
        isCompliant: false,
        ...data.metadata,
      },
      createdBy: data.createdBy,
      tenantId: data.tenantId,
      isSystem: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(template.id, template);
    this.versions.set(template.id, [{
      version: 1,
      content: template.content,
      variables: template.variables,
      sections: template.sections,
      changelog: 'Initial version',
      createdBy: data.createdBy,
      createdAt: new Date(),
    }]);

    this.eventEmitter.emit('template.created', { templateId: template.id });

    return template;
  }

  getTemplate(templateId: string): DocumentTemplate {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }
    return template;
  }

  getAllTemplates(filters?: {
    type?: TemplateType;
    status?: TemplateStatus;
    category?: string;
    tenantId?: string;
    isSystem?: boolean;
  }): DocumentTemplate[] {
    let templates = Array.from(this.templates.values());

    if (filters?.type) {
      templates = templates.filter((t) => t.type === filters.type);
    }
    if (filters?.status) {
      templates = templates.filter((t) => t.status === filters.status);
    }
    if (filters?.category) {
      templates = templates.filter((t) => t.metadata.category === filters.category);
    }
    if (filters?.tenantId) {
      templates = templates.filter((t) => t.tenantId === filters.tenantId || t.isSystem);
    }
    if (filters?.isSystem !== undefined) {
      templates = templates.filter((t) => t.isSystem === filters.isSystem);
    }

    return templates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  updateTemplate(templateId: string, updates: Partial<DocumentTemplate>, updatedBy: string): DocumentTemplate {
    const template = this.getTemplate(templateId);

    if (template.isSystem) {
      throw new BadRequestException('Cannot modify system templates');
    }

    const updatedTemplate: DocumentTemplate = {
      ...template,
      ...updates,
      id: templateId,
      isSystem: template.isSystem,
      createdBy: template.createdBy,
      createdAt: template.createdAt,
      updatedAt: new Date(),
    };

    if (updates.metadata) {
      updatedTemplate.metadata = {
        ...template.metadata,
        ...updates.metadata,
        lastModifiedBy: updatedBy,
      };
    }

    this.templates.set(templateId, updatedTemplate);
    this.eventEmitter.emit('template.updated', { templateId });

    return updatedTemplate;
  }

  publishTemplate(templateId: string, changelog: string, publishedBy: string): DocumentTemplate {
    const template = this.getTemplate(templateId);

    if (template.status === 'ACTIVE') {
      template.version++;
    }

    template.status = 'ACTIVE';
    template.publishedAt = new Date();
    template.updatedAt = new Date();

    const versions = this.versions.get(templateId) || [];
    versions.push({
      version: template.version,
      content: template.content,
      variables: template.variables,
      sections: template.sections,
      changelog,
      createdBy: publishedBy,
      createdAt: new Date(),
    });
    this.versions.set(templateId, versions);

    this.templates.set(templateId, template);
    this.eventEmitter.emit('template.published', { templateId, version: template.version });

    return template;
  }

  archiveTemplate(templateId: string): DocumentTemplate {
    const template = this.getTemplate(templateId);

    if (template.isSystem) {
      throw new BadRequestException('Cannot archive system templates');
    }

    template.status = 'ARCHIVED';
    template.updatedAt = new Date();

    this.templates.set(templateId, template);
    this.eventEmitter.emit('template.archived', { templateId });

    return template;
  }

  deleteTemplate(templateId: string): void {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    if (template.isSystem) {
      throw new BadRequestException('Cannot delete system templates');
    }

    this.templates.delete(templateId);
    this.versions.delete(templateId);
    this.eventEmitter.emit('template.deleted', { templateId });
  }

  cloneTemplate(templateId: string, newName: string, newNameRo: string, createdBy: string, tenantId?: string): DocumentTemplate {
    const source = this.getTemplate(templateId);

    return this.createTemplate({
      name: newName,
      nameRo: newNameRo,
      description: source.description,
      descriptionRo: source.descriptionRo,
      type: source.type,
      content: { ...source.content },
      variables: [...source.variables],
      sections: source.sections.map((s) => ({ ...s, id: `section-${randomUUID()}` })),
      styling: { ...source.styling },
      outputFormats: [...source.outputFormats],
      metadata: {
        ...source.metadata,
        author: createdBy,
        usageCount: 0,
      },
      createdBy,
      tenantId,
    });
  }

  // Version Management
  getTemplateVersions(templateId: string): TemplateVersion[] {
    this.getTemplate(templateId);
    return this.versions.get(templateId) || [];
  }

  getTemplateVersion(templateId: string, version: number): TemplateVersion | undefined {
    const versions = this.getTemplateVersions(templateId);
    return versions.find((v) => v.version === version);
  }

  restoreVersion(templateId: string, version: number, restoredBy: string): DocumentTemplate {
    const template = this.getTemplate(templateId);
    const versionData = this.getTemplateVersion(templateId, version);

    if (!versionData) {
      throw new NotFoundException(`Version ${version} not found for template ${templateId}`);
    }

    template.content = versionData.content;
    template.variables = versionData.variables;
    template.sections = versionData.sections;
    template.version++;
    template.updatedAt = new Date();

    const versions = this.versions.get(templateId) || [];
    versions.push({
      version: template.version,
      content: template.content,
      variables: template.variables,
      sections: template.sections,
      changelog: `Restored from version ${version}`,
      createdBy: restoredBy,
      createdAt: new Date(),
    });
    this.versions.set(templateId, versions);

    this.templates.set(templateId, template);
    return template;
  }

  // Document Generation
  async renderDocument(templateId: string, variables: Record<string, any>, options: RenderOptions, generatedBy: string, tenantId?: string): Promise<GeneratedDocument> {
    const template = this.getTemplate(templateId);

    if (template.status !== 'ACTIVE') {
      throw new BadRequestException('Can only render active templates');
    }

    if (!template.outputFormats.includes(options.format)) {
      throw new BadRequestException(`Format ${options.format} not supported for this template`);
    }

    this.validateVariables(template, variables);

    const renderedContent = this.processTemplate(template, variables, options.language);

    const document: GeneratedDocument = {
      id: `doc-${randomUUID()}`,
      templateId,
      templateVersion: template.version,
      name: `${template.name} - ${new Date().toISOString().split('T')[0]}`,
      format: options.format,
      content: renderedContent,
      variables,
      language: options.language,
      fileSize: renderedContent.length,
      fileUrl: `/api/documents/${randomUUID()}/download`,
      generatedBy,
      tenantId,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 86400000),
      metadata: {
        templateName: template.name,
        templateType: template.type,
      },
    };

    this.documents.set(document.id, document);

    template.metadata.usageCount++;
    this.templates.set(templateId, template);

    this.eventEmitter.emit('document.generated', { documentId: document.id, templateId });

    return document;
  }

  private validateVariables(template: DocumentTemplate, variables: Record<string, any>): void {
    for (const varDef of template.variables) {
      const value = this.getNestedValue(variables, varDef.name);

      if (varDef.required && (value === undefined || value === null || value === '')) {
        throw new BadRequestException(`Required variable '${varDef.name}' is missing`);
      }

      if (value !== undefined && varDef.validation) {
        if (varDef.validation.minLength && String(value).length < varDef.validation.minLength) {
          throw new BadRequestException(`Variable '${varDef.name}' must be at least ${varDef.validation.minLength} characters`);
        }
        if (varDef.validation.maxLength && String(value).length > varDef.validation.maxLength) {
          throw new BadRequestException(`Variable '${varDef.name}' must be at most ${varDef.validation.maxLength} characters`);
        }
      }
    }
  }

  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private processTemplate(template: DocumentTemplate, variables: Record<string, any>, language: 'RO' | 'EN'): string {
    let content = template.content.body;

    content = content.replace(/\{\{#if language\.ro\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, roContent, enContent) => {
      return language === 'RO' ? roContent : enContent;
    });

    content = content.replace(/\{\{#if ([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, condition, conditionalContent) => {
      const value = this.getNestedValue(variables, condition.trim());
      return value ? conditionalContent : '';
    });

    content = content.replace(/\{\{#each ([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, arrayPath, itemContent) => {
      const array = this.getNestedValue(variables, arrayPath.trim());
      if (!Array.isArray(array)) return '';

      return array.map((item) => {
        return itemContent.replace(/\{\{this\.([^}|]+)(\|[^}]+)?\}\}/g, (__: string, prop: string, filter: string | undefined) => {
          let value = item[prop.trim()];
          if (filter) {
            value = this.applyFilter(value, filter.trim().slice(1), language);
          }
          return value !== undefined ? String(value) : '';
        });
      }).join('');
    });

    content = content.replace(/\{\{([^}|]+)(\|[^}]+)?\}\}/g, (_, path, filter) => {
      let value = this.getNestedValue(variables, path.trim());
      if (filter) {
        const filterName = filter.slice(1).trim();
        value = this.applyFilter(value, filterName, language);
      }
      return value !== undefined ? String(value) : '';
    });

    if (template.content.header) {
      content = this.processTemplate({ ...template, content: { ...template.content, body: template.content.header } }, variables, language) + content;
    }
    if (template.content.footer) {
      content = content + this.processTemplate({ ...template, content: { ...template.content, body: template.content.footer } }, variables, language);
    }

    return content;
  }

  private applyFilter(value: any, filter: string, language: 'RO' | 'EN'): string {
    switch (filter) {
      case 'date':
        if (value instanceof Date) {
          return value.toLocaleDateString(language === 'RO' ? 'ro-RO' : 'en-US');
        }
        return new Date(value).toLocaleDateString(language === 'RO' ? 'ro-RO' : 'en-US');

      case 'currency':
        const num = typeof value === 'number' ? value : parseFloat(value);
        return new Intl.NumberFormat(language === 'RO' ? 'ro-RO' : 'en-US', {
          style: 'currency',
          currency: 'RON',
        }).format(num);

      case 'uppercase':
        return String(value).toUpperCase();

      case 'lowercase':
        return String(value).toLowerCase();

      default:
        return String(value);
    }
  }

  getDocument(documentId: string): GeneratedDocument {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }
    return document;
  }

  getAllDocuments(filters?: {
    templateId?: string;
    generatedBy?: string;
    tenantId?: string;
    fromDate?: Date;
    toDate?: Date;
  }): GeneratedDocument[] {
    let documents = Array.from(this.documents.values());

    if (filters?.templateId) {
      documents = documents.filter((d) => d.templateId === filters.templateId);
    }
    if (filters?.generatedBy) {
      documents = documents.filter((d) => d.generatedBy === filters.generatedBy);
    }
    if (filters?.tenantId) {
      documents = documents.filter((d) => d.tenantId === filters.tenantId);
    }
    if (filters?.fromDate) {
      documents = documents.filter((d) => d.generatedAt >= filters.fromDate!);
    }
    if (filters?.toDate) {
      documents = documents.filter((d) => d.generatedAt <= filters.toDate!);
    }

    return documents.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
  }

  deleteDocument(documentId: string): void {
    if (!this.documents.has(documentId)) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }
    this.documents.delete(documentId);
    this.eventEmitter.emit('document.deleted', { documentId });
  }

  // Categories
  getCategories(): TemplateCategory[] {
    return Array.from(this.categories.values()).sort((a, b) => a.order - b.order);
  }

  getCategory(categoryId: string): TemplateCategory {
    const category = this.categories.get(categoryId);
    if (!category) {
      throw new NotFoundException(`Category ${categoryId} not found`);
    }
    return category;
  }

  // Statistics
  getServiceStats(): {
    totalTemplates: number;
    activeTemplates: number;
    systemTemplates: number;
    totalDocuments: number;
    templatesByType: Record<TemplateType, number>;
    documentsByFormat: Record<OutputFormat, number>;
  } {
    const templates = Array.from(this.templates.values());
    const documents = Array.from(this.documents.values());

    const templatesByType: Record<TemplateType, number> = {
      INVOICE: 0, CONTRACT: 0, REPORT: 0, LETTER: 0,
      RECEIPT: 0, QUOTE: 0, ORDER: 0, CERTIFICATE: 0, CUSTOM: 0,
    };

    const documentsByFormat: Record<OutputFormat, number> = {
      PDF: 0, DOCX: 0, HTML: 0, TXT: 0, XML: 0,
    };

    templates.forEach((t) => templatesByType[t.type]++);
    documents.forEach((d) => documentsByFormat[d.format]++);

    return {
      totalTemplates: templates.length,
      activeTemplates: templates.filter((t) => t.status === 'ACTIVE').length,
      systemTemplates: templates.filter((t) => t.isSystem).length,
      totalDocuments: documents.length,
      templatesByType,
      documentsByFormat,
    };
  }
}
