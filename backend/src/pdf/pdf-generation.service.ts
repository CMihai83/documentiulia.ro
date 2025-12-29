import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import puppeteer, { Browser, Page } from 'puppeteer';

export type PdfTemplateType =
  | 'INVOICE'
  | 'RECEIPT'
  | 'CONTRACT'
  | 'REPORT'
  | 'STATEMENT'
  | 'CERTIFICATE'
  | 'OFFER'
  | 'ORDER'
  | 'DELIVERY_NOTE'
  | 'TAX_REPORT'
  | 'ANAF_DECLARATION'
  | 'PAYROLL'
  | 'CUSTOM';

export type PdfStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED' | 'CACHED';

export type PdfPageSize = 'A4' | 'A3' | 'A5' | 'LETTER' | 'LEGAL';

export type PdfOrientation = 'PORTRAIT' | 'LANDSCAPE';

export interface PdfMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PdfHeader {
  content?: string;
  height?: number;
  showPageNumber?: boolean;
  showDate?: boolean;
  logo?: string;
}

export interface PdfFooter {
  content?: string;
  height?: number;
  showPageNumber?: boolean;
  showPageCount?: boolean;
}

export interface PdfWatermark {
  text: string;
  opacity: number;
  rotation?: number;
  fontSize?: number;
  color?: string;
}

export interface PdfGenerationOptions {
  pageSize?: PdfPageSize;
  orientation?: PdfOrientation;
  margins?: Partial<PdfMargins>;
  header?: PdfHeader;
  footer?: PdfFooter;
  watermark?: PdfWatermark;
  compression?: boolean;
  encrypt?: boolean;
  password?: string;
  metadata?: PdfMetadata;
  language?: 'ro' | 'en';
}

export interface PdfMetadata {
  title?: string;
  titleRo?: string;
  author?: string;
  subject?: string;
  subjectRo?: string;
  keywords?: string[];
  creator?: string;
  producer?: string;
}

export interface PdfTemplate {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  type: PdfTemplateType;
  htmlContent: string;
  htmlContentRo: string;
  cssStyles: string;
  variables: TemplateVariable[];
  defaultOptions: PdfGenerationOptions;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateVariable {
  name: string;
  description: string;
  descriptionRo: string;
  type: 'STRING' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'ARRAY' | 'OBJECT' | 'CURRENCY' | 'IMAGE';
  required: boolean;
  defaultValue?: any;
  format?: string;
}

export interface GeneratedPdf {
  id: string;
  templateId?: string;
  type: PdfTemplateType;
  name: string;
  nameRo?: string;
  status: PdfStatus;
  content?: Buffer;
  size?: number;
  pageCount?: number;
  options: PdfGenerationOptions;
  data: Record<string, any>;
  organizationId?: string;
  userId?: string;
  error?: string;
  generatedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PdfBatch {
  id: string;
  name: string;
  nameRo: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalCount: number;
  completedCount: number;
  failedCount: number;
  pdfs: string[];
  errors: { pdfId: string; error: string }[];
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface PdfStats {
  totalGenerated: number;
  totalSize: number;
  averageSize: number;
  averageGenerationTime: number;
  byType: Record<PdfTemplateType, number>;
  byStatus: Record<PdfStatus, number>;
  recentPdfs: GeneratedPdf[];
}

@Injectable()
export class PdfGenerationService {
  private readonly logger = new Logger(PdfGenerationService.name);
  private templates: Map<string, PdfTemplate> = new Map();
  private pdfs: Map<string, GeneratedPdf> = new Map();
  private batches: Map<string, PdfBatch> = new Map();
  private cache: Map<string, { pdf: GeneratedPdf; expiresAt: number }> = new Map();
  private generationTimes: number[] = [];

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    const defaultTemplates: Omit<PdfTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Standard Invoice',
        nameRo: 'Factură Standard',
        description: 'Standard invoice template for B2B transactions',
        descriptionRo: 'Șablon factură standard pentru tranzacții B2B',
        type: 'INVOICE',
        htmlContent: `
          <div class="invoice">
            <header>
              <h1>INVOICE #{{invoiceNumber}}</h1>
              <p>Date: {{issueDate}}</p>
            </header>
            <section class="parties">
              <div class="seller">
                <h3>From:</h3>
                <p>{{sellerName}}</p>
                <p>CUI: {{sellerCUI}}</p>
                <p>{{sellerAddress}}</p>
              </div>
              <div class="buyer">
                <h3>To:</h3>
                <p>{{buyerName}}</p>
                <p>CUI: {{buyerCUI}}</p>
                <p>{{buyerAddress}}</p>
              </div>
            </section>
            <table class="items">
              <thead>
                <tr><th>Description</th><th>Qty</th><th>Price</th><th>VAT</th><th>Total</th></tr>
              </thead>
              <tbody>{{#items}}<tr><td>{{description}}</td><td>{{quantity}}</td><td>{{price}}</td><td>{{vat}}%</td><td>{{total}}</td></tr>{{/items}}</tbody>
            </table>
            <section class="totals">
              <p>Subtotal: {{subtotal}} {{currency}}</p>
              <p>VAT ({{vatRate}}%): {{vatAmount}} {{currency}}</p>
              <p><strong>Total: {{total}} {{currency}}</strong></p>
            </section>
            <footer>
              <p>Due Date: {{dueDate}}</p>
              <p>Bank: {{bankName}} | IBAN: {{iban}}</p>
            </footer>
          </div>
        `,
        htmlContentRo: `
          <div class="invoice">
            <header>
              <h1>FACTURĂ #{{invoiceNumber}}</h1>
              <p>Data: {{issueDate}}</p>
            </header>
            <section class="parties">
              <div class="seller">
                <h3>Furnizor:</h3>
                <p>{{sellerName}}</p>
                <p>CUI: {{sellerCUI}}</p>
                <p>{{sellerAddress}}</p>
              </div>
              <div class="buyer">
                <h3>Client:</h3>
                <p>{{buyerName}}</p>
                <p>CUI: {{buyerCUI}}</p>
                <p>{{buyerAddress}}</p>
              </div>
            </section>
            <table class="items">
              <thead>
                <tr><th>Descriere</th><th>Cant.</th><th>Preț</th><th>TVA</th><th>Total</th></tr>
              </thead>
              <tbody>{{#items}}<tr><td>{{description}}</td><td>{{quantity}}</td><td>{{price}}</td><td>{{vat}}%</td><td>{{total}}</td></tr>{{/items}}</tbody>
            </table>
            <section class="totals">
              <p>Subtotal: {{subtotal}} {{currency}}</p>
              <p>TVA ({{vatRate}}%): {{vatAmount}} {{currency}}</p>
              <p><strong>Total: {{total}} {{currency}}</strong></p>
            </section>
            <footer>
              <p>Data scadentă: {{dueDate}}</p>
              <p>Banca: {{bankName}} | IBAN: {{iban}}</p>
            </footer>
          </div>
        `,
        cssStyles: `
          .invoice { font-family: Arial, sans-serif; padding: 20px; }
          header h1 { color: #333; border-bottom: 2px solid #007bff; }
          .parties { display: flex; justify-content: space-between; margin: 20px 0; }
          .items { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .items th, .items td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .items th { background-color: #007bff; color: white; }
          .totals { text-align: right; margin: 20px 0; }
          footer { border-top: 1px solid #ddd; padding-top: 10px; font-size: 12px; }
        `,
        variables: [
          { name: 'invoiceNumber', description: 'Invoice number', descriptionRo: 'Număr factură', type: 'STRING', required: true },
          { name: 'issueDate', description: 'Issue date', descriptionRo: 'Data emiterii', type: 'DATE', required: true },
          { name: 'dueDate', description: 'Due date', descriptionRo: 'Data scadentă', type: 'DATE', required: true },
          { name: 'sellerName', description: 'Seller company name', descriptionRo: 'Nume furnizor', type: 'STRING', required: true },
          { name: 'sellerCUI', description: 'Seller CUI/CIF', descriptionRo: 'CUI furnizor', type: 'STRING', required: true },
          { name: 'sellerAddress', description: 'Seller address', descriptionRo: 'Adresă furnizor', type: 'STRING', required: true },
          { name: 'buyerName', description: 'Buyer company name', descriptionRo: 'Nume client', type: 'STRING', required: true },
          { name: 'buyerCUI', description: 'Buyer CUI/CIF', descriptionRo: 'CUI client', type: 'STRING', required: true },
          { name: 'buyerAddress', description: 'Buyer address', descriptionRo: 'Adresă client', type: 'STRING', required: true },
          { name: 'items', description: 'Invoice line items', descriptionRo: 'Articole factură', type: 'ARRAY', required: true },
          { name: 'subtotal', description: 'Subtotal amount', descriptionRo: 'Subtotal', type: 'CURRENCY', required: true },
          { name: 'vatRate', description: 'VAT rate', descriptionRo: 'Cota TVA', type: 'NUMBER', required: true, defaultValue: 19 },
          { name: 'vatAmount', description: 'VAT amount', descriptionRo: 'Valoare TVA', type: 'CURRENCY', required: true },
          { name: 'total', description: 'Total amount', descriptionRo: 'Total', type: 'CURRENCY', required: true },
          { name: 'currency', description: 'Currency code', descriptionRo: 'Monedă', type: 'STRING', required: true, defaultValue: 'RON' },
          { name: 'bankName', description: 'Bank name', descriptionRo: 'Nume bancă', type: 'STRING', required: false },
          { name: 'iban', description: 'IBAN', descriptionRo: 'IBAN', type: 'STRING', required: false },
        ],
        defaultOptions: {
          pageSize: 'A4',
          orientation: 'PORTRAIT',
          margins: { top: 20, right: 15, bottom: 20, left: 15 },
        },
        isActive: true,
        version: 1,
      },
      {
        name: 'Employment Contract',
        nameRo: 'Contract Individual de Muncă',
        description: 'Standard employment contract template',
        descriptionRo: 'Șablon contract individual de muncă standard',
        type: 'CONTRACT',
        htmlContent: `
          <div class="contract">
            <h1>EMPLOYMENT CONTRACT</h1>
            <h2>Contract No: {{contractNumber}}</h2>
            <section>
              <h3>PARTIES</h3>
              <p><strong>Employer:</strong> {{employerName}}, CUI: {{employerCUI}}</p>
              <p><strong>Employee:</strong> {{employeeName}}, CNP: {{employeeCNP}}</p>
            </section>
            <section>
              <h3>TERMS</h3>
              <p>Position: {{position}}</p>
              <p>Department: {{department}}</p>
              <p>Start Date: {{startDate}}</p>
              <p>Contract Type: {{contractType}}</p>
              <p>Working Hours: {{workingHours}} hours/week</p>
            </section>
            <section>
              <h3>COMPENSATION</h3>
              <p>Gross Salary: {{grossSalary}} {{currency}}/month</p>
              <p>Payment Day: {{paymentDay}} of each month</p>
            </section>
            <section class="signatures">
              <div class="signature">
                <p>Employer</p>
                <p>{{employerRepresentative}}</p>
                <p>Date: {{signatureDate}}</p>
              </div>
              <div class="signature">
                <p>Employee</p>
                <p>{{employeeName}}</p>
                <p>Date: {{signatureDate}}</p>
              </div>
            </section>
          </div>
        `,
        htmlContentRo: `
          <div class="contract">
            <h1>CONTRACT INDIVIDUAL DE MUNCĂ</h1>
            <h2>Nr. Contract: {{contractNumber}}</h2>
            <section>
              <h3>PĂRȚILE CONTRACTANTE</h3>
              <p><strong>Angajator:</strong> {{employerName}}, CUI: {{employerCUI}}</p>
              <p><strong>Salariat:</strong> {{employeeName}}, CNP: {{employeeCNP}}</p>
            </section>
            <section>
              <h3>OBIECTUL CONTRACTULUI</h3>
              <p>Funcția: {{position}}</p>
              <p>Departament: {{department}}</p>
              <p>Data începerii: {{startDate}}</p>
              <p>Tipul contractului: {{contractType}}</p>
              <p>Durata muncii: {{workingHours}} ore/săptămână</p>
            </section>
            <section>
              <h3>SALARIZARE</h3>
              <p>Salariul brut: {{grossSalary}} {{currency}}/lună</p>
              <p>Data plății: {{paymentDay}} ale fiecărei luni</p>
            </section>
            <section class="signatures">
              <div class="signature">
                <p>Angajator</p>
                <p>{{employerRepresentative}}</p>
                <p>Data: {{signatureDate}}</p>
              </div>
              <div class="signature">
                <p>Salariat</p>
                <p>{{employeeName}}</p>
                <p>Data: {{signatureDate}}</p>
              </div>
            </section>
          </div>
        `,
        cssStyles: `
          .contract { font-family: 'Times New Roman', serif; padding: 30px; line-height: 1.6; }
          h1 { text-align: center; margin-bottom: 5px; }
          h2 { text-align: center; font-weight: normal; margin-top: 0; }
          section { margin: 20px 0; }
          h3 { border-bottom: 1px solid #333; padding-bottom: 5px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
          .signature { text-align: center; width: 40%; }
          .signature p:first-child { font-weight: bold; }
        `,
        variables: [
          { name: 'contractNumber', description: 'Contract number', descriptionRo: 'Număr contract', type: 'STRING', required: true },
          { name: 'employerName', description: 'Employer name', descriptionRo: 'Nume angajator', type: 'STRING', required: true },
          { name: 'employerCUI', description: 'Employer CUI', descriptionRo: 'CUI angajator', type: 'STRING', required: true },
          { name: 'employerRepresentative', description: 'Employer representative', descriptionRo: 'Reprezentant angajator', type: 'STRING', required: true },
          { name: 'employeeName', description: 'Employee name', descriptionRo: 'Nume salariat', type: 'STRING', required: true },
          { name: 'employeeCNP', description: 'Employee CNP', descriptionRo: 'CNP salariat', type: 'STRING', required: true },
          { name: 'position', description: 'Job position', descriptionRo: 'Funcția', type: 'STRING', required: true },
          { name: 'department', description: 'Department', descriptionRo: 'Departament', type: 'STRING', required: true },
          { name: 'startDate', description: 'Start date', descriptionRo: 'Data începerii', type: 'DATE', required: true },
          { name: 'contractType', description: 'Contract type', descriptionRo: 'Tip contract', type: 'STRING', required: true, defaultValue: 'Permanent' },
          { name: 'workingHours', description: 'Working hours per week', descriptionRo: 'Ore lucru/săptămână', type: 'NUMBER', required: true, defaultValue: 40 },
          { name: 'grossSalary', description: 'Gross monthly salary', descriptionRo: 'Salariu brut lunar', type: 'CURRENCY', required: true },
          { name: 'currency', description: 'Currency', descriptionRo: 'Monedă', type: 'STRING', required: true, defaultValue: 'RON' },
          { name: 'paymentDay', description: 'Payment day', descriptionRo: 'Ziua plății', type: 'NUMBER', required: true, defaultValue: 10 },
          { name: 'signatureDate', description: 'Signature date', descriptionRo: 'Data semnării', type: 'DATE', required: true },
        ],
        defaultOptions: {
          pageSize: 'A4',
          orientation: 'PORTRAIT',
          margins: { top: 25, right: 20, bottom: 25, left: 20 },
        },
        isActive: true,
        version: 1,
      },
      {
        name: 'ANAF Declaration Receipt',
        nameRo: 'Confirmare Declarație ANAF',
        description: 'Receipt for ANAF declaration submission',
        descriptionRo: 'Confirmare pentru depunere declarație ANAF',
        type: 'ANAF_DECLARATION',
        htmlContent: `
          <div class="anaf-receipt">
            <header>
              <h1>ANAF DECLARATION RECEIPT</h1>
              <p>Confirmation of Submission</p>
            </header>
            <section class="details">
              <p><strong>Declaration Type:</strong> {{declarationType}}</p>
              <p><strong>Reference Number:</strong> {{referenceNumber}}</p>
              <p><strong>Submission Date:</strong> {{submissionDate}}</p>
              <p><strong>Status:</strong> {{status}}</p>
            </section>
            <section class="taxpayer">
              <h3>Taxpayer Information</h3>
              <p>Company: {{companyName}}</p>
              <p>CUI: {{cui}}</p>
              <p>Address: {{address}}</p>
            </section>
            <section class="summary">
              <h3>Declaration Summary</h3>
              <p>Period: {{period}}</p>
              <p>Total Amount: {{totalAmount}} {{currency}}</p>
            </section>
            <footer>
              <p>This document was generated automatically by DocumentIulia.ro</p>
              <p>Verified against ANAF SPV on {{verificationDate}}</p>
            </footer>
          </div>
        `,
        htmlContentRo: `
          <div class="anaf-receipt">
            <header>
              <h1>CONFIRMARE DECLARAȚIE ANAF</h1>
              <p>Confirmare de Depunere</p>
            </header>
            <section class="details">
              <p><strong>Tip Declarație:</strong> {{declarationType}}</p>
              <p><strong>Număr Referință:</strong> {{referenceNumber}}</p>
              <p><strong>Data Depunerii:</strong> {{submissionDate}}</p>
              <p><strong>Status:</strong> {{status}}</p>
            </section>
            <section class="taxpayer">
              <h3>Informații Contribuabil</h3>
              <p>Societate: {{companyName}}</p>
              <p>CUI: {{cui}}</p>
              <p>Adresă: {{address}}</p>
            </section>
            <section class="summary">
              <h3>Sumar Declarație</h3>
              <p>Perioada: {{period}}</p>
              <p>Valoare Totală: {{totalAmount}} {{currency}}</p>
            </section>
            <footer>
              <p>Acest document a fost generat automat de DocumentIulia.ro</p>
              <p>Verificat în SPV ANAF la data {{verificationDate}}</p>
            </footer>
          </div>
        `,
        cssStyles: `
          .anaf-receipt { font-family: Arial, sans-serif; padding: 20px; }
          header { text-align: center; border-bottom: 2px solid #1a237e; margin-bottom: 20px; }
          header h1 { color: #1a237e; margin-bottom: 5px; }
          section { margin: 15px 0; padding: 10px; background: #f5f5f5; border-radius: 4px; }
          h3 { color: #1a237e; margin-top: 0; }
          footer { margin-top: 30px; font-size: 11px; color: #666; text-align: center; }
        `,
        variables: [
          { name: 'declarationType', description: 'Declaration type', descriptionRo: 'Tip declarație', type: 'STRING', required: true },
          { name: 'referenceNumber', description: 'Reference number', descriptionRo: 'Număr referință', type: 'STRING', required: true },
          { name: 'submissionDate', description: 'Submission date', descriptionRo: 'Data depunerii', type: 'DATE', required: true },
          { name: 'status', description: 'Status', descriptionRo: 'Status', type: 'STRING', required: true },
          { name: 'companyName', description: 'Company name', descriptionRo: 'Nume societate', type: 'STRING', required: true },
          { name: 'cui', description: 'CUI/CIF', descriptionRo: 'CUI', type: 'STRING', required: true },
          { name: 'address', description: 'Address', descriptionRo: 'Adresă', type: 'STRING', required: true },
          { name: 'period', description: 'Declaration period', descriptionRo: 'Perioada declarației', type: 'STRING', required: true },
          { name: 'totalAmount', description: 'Total amount', descriptionRo: 'Valoare totală', type: 'CURRENCY', required: true },
          { name: 'currency', description: 'Currency', descriptionRo: 'Monedă', type: 'STRING', required: true, defaultValue: 'RON' },
          { name: 'verificationDate', description: 'Verification date', descriptionRo: 'Data verificării', type: 'DATE', required: true },
        ],
        defaultOptions: {
          pageSize: 'A4',
          orientation: 'PORTRAIT',
          margins: { top: 20, right: 15, bottom: 20, left: 15 },
        },
        isActive: true,
        version: 1,
      },
      {
        name: 'Monthly Report',
        nameRo: 'Raport Lunar',
        description: 'Monthly financial report template',
        descriptionRo: 'Șablon raport financiar lunar',
        type: 'REPORT',
        htmlContent: `
          <div class="report">
            <header>
              <h1>{{companyName}}</h1>
              <h2>Monthly Financial Report - {{month}} {{year}}</h2>
            </header>
            <section class="summary">
              <h3>Executive Summary</h3>
              <div class="metrics">
                <div class="metric"><span>Revenue</span><strong>{{revenue}} {{currency}}</strong></div>
                <div class="metric"><span>Expenses</span><strong>{{expenses}} {{currency}}</strong></div>
                <div class="metric"><span>Profit</span><strong>{{profit}} {{currency}}</strong></div>
              </div>
            </section>
            <section class="details">
              <h3>Revenue Breakdown</h3>
              {{revenueDetails}}
            </section>
            <section class="details">
              <h3>Expense Breakdown</h3>
              {{expenseDetails}}
            </section>
            <footer>
              <p>Generated on {{generatedDate}} by {{generatedBy}}</p>
            </footer>
          </div>
        `,
        htmlContentRo: `
          <div class="report">
            <header>
              <h1>{{companyName}}</h1>
              <h2>Raport Financiar Lunar - {{month}} {{year}}</h2>
            </header>
            <section class="summary">
              <h3>Sumar Executiv</h3>
              <div class="metrics">
                <div class="metric"><span>Venituri</span><strong>{{revenue}} {{currency}}</strong></div>
                <div class="metric"><span>Cheltuieli</span><strong>{{expenses}} {{currency}}</strong></div>
                <div class="metric"><span>Profit</span><strong>{{profit}} {{currency}}</strong></div>
              </div>
            </section>
            <section class="details">
              <h3>Detalii Venituri</h3>
              {{revenueDetails}}
            </section>
            <section class="details">
              <h3>Detalii Cheltuieli</h3>
              {{expenseDetails}}
            </section>
            <footer>
              <p>Generat la {{generatedDate}} de {{generatedBy}}</p>
            </footer>
          </div>
        `,
        cssStyles: `
          .report { font-family: Arial, sans-serif; padding: 20px; }
          header { text-align: center; margin-bottom: 30px; }
          header h1 { color: #2e7d32; margin-bottom: 5px; }
          .summary { background: #e8f5e9; padding: 20px; border-radius: 8px; }
          .metrics { display: flex; justify-content: space-around; margin-top: 15px; }
          .metric { text-align: center; }
          .metric span { display: block; color: #666; }
          .metric strong { font-size: 24px; color: #2e7d32; }
          .details { margin: 20px 0; }
          h3 { border-bottom: 2px solid #2e7d32; padding-bottom: 5px; }
          footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        `,
        variables: [
          { name: 'companyName', description: 'Company name', descriptionRo: 'Nume companie', type: 'STRING', required: true },
          { name: 'month', description: 'Month', descriptionRo: 'Luna', type: 'STRING', required: true },
          { name: 'year', description: 'Year', descriptionRo: 'Anul', type: 'NUMBER', required: true },
          { name: 'revenue', description: 'Total revenue', descriptionRo: 'Venituri totale', type: 'CURRENCY', required: true },
          { name: 'expenses', description: 'Total expenses', descriptionRo: 'Cheltuieli totale', type: 'CURRENCY', required: true },
          { name: 'profit', description: 'Net profit', descriptionRo: 'Profit net', type: 'CURRENCY', required: true },
          { name: 'currency', description: 'Currency', descriptionRo: 'Monedă', type: 'STRING', required: true, defaultValue: 'RON' },
          { name: 'revenueDetails', description: 'Revenue breakdown HTML', descriptionRo: 'Detalii venituri HTML', type: 'STRING', required: false },
          { name: 'expenseDetails', description: 'Expense breakdown HTML', descriptionRo: 'Detalii cheltuieli HTML', type: 'STRING', required: false },
          { name: 'generatedDate', description: 'Generation date', descriptionRo: 'Data generării', type: 'DATE', required: true },
          { name: 'generatedBy', description: 'Generated by', descriptionRo: 'Generat de', type: 'STRING', required: true },
        ],
        defaultOptions: {
          pageSize: 'A4',
          orientation: 'LANDSCAPE',
          margins: { top: 15, right: 15, bottom: 15, left: 15 },
        },
        isActive: true,
        version: 1,
      },
    ];

    const now = new Date();
    defaultTemplates.forEach((template) => {
      const id = this.generateId('tmpl');
      this.templates.set(id, { ...template, id, createdAt: now, updatedAt: now });
    });
  }

  // PDF Generation

  async generatePdf(
    htmlContent: string,
    options: PdfGenerationOptions = {},
    metadata?: { name?: string; type?: PdfTemplateType; organizationId?: string; userId?: string },
  ): Promise<GeneratedPdf> {
    const pdfId = this.generateId('pdf');
    const now = new Date();
    const startTime = Date.now();

    const pdf: GeneratedPdf = {
      id: pdfId,
      type: metadata?.type || 'CUSTOM',
      name: metadata?.name || `PDF_${pdfId}`,
      status: 'PENDING',
      options: this.mergeOptions(options),
      data: { htmlContent },
      organizationId: metadata?.organizationId,
      userId: metadata?.userId,
      createdAt: now,
      updatedAt: now,
    };

    this.pdfs.set(pdfId, pdf);

    try {
      pdf.status = 'GENERATING';
      pdf.updatedAt = new Date();
      this.pdfs.set(pdfId, pdf);

      // Simulate PDF generation
      const result = await this.simulateGeneration(htmlContent, options);

      pdf.status = 'COMPLETED';
      pdf.content = result.content;
      pdf.size = result.size;
      pdf.pageCount = result.pageCount;
      pdf.generatedAt = new Date();
      pdf.updatedAt = new Date();

      const generationTime = Date.now() - startTime;
      this.generationTimes.push(generationTime);
      if (this.generationTimes.length > 1000) {
        this.generationTimes = this.generationTimes.slice(-500);
      }

      this.eventEmitter.emit('pdf.generated', {
        pdfId,
        type: pdf.type,
        size: pdf.size,
        pageCount: pdf.pageCount,
        generationTime,
      });

      this.logger.log(`PDF generated: ${pdfId} (${pdf.size} bytes, ${pdf.pageCount} pages)`);

    } catch (err) {
      pdf.status = 'FAILED';
      pdf.error = err instanceof Error ? err.message : 'Unknown error';
      pdf.updatedAt = new Date();

      this.eventEmitter.emit('pdf.failed', {
        pdfId,
        error: pdf.error,
      });

      this.logger.error(`PDF generation failed: ${pdfId} - ${pdf.error}`);
    }

    this.pdfs.set(pdfId, pdf);
    return pdf;
  }

  async generateFromTemplate(
    templateId: string,
    data: Record<string, any>,
    options: PdfGenerationOptions = {},
  ): Promise<GeneratedPdf> {
    const template = this.templates.get(templateId);
    if (!template) {
      const byName = Array.from(this.templates.values()).find((t) => t.name === templateId);
      if (!byName) {
        throw new Error(`Template not found: ${templateId}`);
      }
      return this.generateFromTemplateObject(byName, data, options);
    }

    return this.generateFromTemplateObject(template, data, options);
  }

  private async generateFromTemplateObject(
    template: PdfTemplate,
    data: Record<string, any>,
    options: PdfGenerationOptions = {},
  ): Promise<GeneratedPdf> {
    if (!template.isActive) {
      throw new Error('Template is not active');
    }

    // Validate required variables
    for (const variable of template.variables) {
      if (variable.required && data[variable.name] === undefined) {
        if (variable.defaultValue !== undefined) {
          data[variable.name] = variable.defaultValue;
        } else {
          throw new Error(`Missing required variable: ${variable.name}`);
        }
      }
    }

    const language = options.language || 'ro';
    const htmlContent = this.renderTemplate(
      language === 'ro' ? template.htmlContentRo : template.htmlContent,
      data,
    );

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="${language}">
      <head>
        <meta charset="UTF-8">
        <style>${template.cssStyles}</style>
      </head>
      <body>${htmlContent}</body>
      </html>
    `;

    const mergedOptions = { ...template.defaultOptions, ...options };
    const pdfId = this.generateId('pdf');
    const now = new Date();
    const startTime = Date.now();

    const pdf: GeneratedPdf = {
      id: pdfId,
      templateId: template.id,
      type: template.type,
      name: `${template.name}_${Date.now()}`,
      nameRo: template.nameRo,
      status: 'PENDING',
      options: this.mergeOptions(mergedOptions),
      data,
      createdAt: now,
      updatedAt: now,
    };

    this.pdfs.set(pdfId, pdf);

    try {
      pdf.status = 'GENERATING';
      this.pdfs.set(pdfId, pdf);

      const result = await this.simulateGeneration(fullHtml, mergedOptions);

      pdf.status = 'COMPLETED';
      pdf.content = result.content;
      pdf.size = result.size;
      pdf.pageCount = result.pageCount;
      pdf.generatedAt = new Date();
      pdf.updatedAt = new Date();

      const generationTime = Date.now() - startTime;
      this.generationTimes.push(generationTime);

      this.eventEmitter.emit('pdf.generated', {
        pdfId,
        templateId: template.id,
        type: pdf.type,
        size: pdf.size,
        pageCount: pdf.pageCount,
        generationTime,
      });

    } catch (err) {
      pdf.status = 'FAILED';
      pdf.error = err instanceof Error ? err.message : 'Unknown error';
      pdf.updatedAt = new Date();

      this.eventEmitter.emit('pdf.failed', { pdfId, error: pdf.error });
    }

    this.pdfs.set(pdfId, pdf);
    return pdf;
  }

  async generateBatch(
    items: { templateId: string; data: Record<string, any>; options?: PdfGenerationOptions }[],
    batchName: string,
    batchNameRo?: string,
  ): Promise<PdfBatch> {
    const batchId = this.generateId('batch');
    const now = new Date();

    const batch: PdfBatch = {
      id: batchId,
      name: batchName,
      nameRo: batchNameRo || batchName,
      status: 'PENDING',
      totalCount: items.length,
      completedCount: 0,
      failedCount: 0,
      pdfs: [],
      errors: [],
      createdAt: now,
    };

    this.batches.set(batchId, batch);

    batch.status = 'PROCESSING';
    batch.startedAt = new Date();
    this.batches.set(batchId, batch);

    for (const item of items) {
      try {
        const pdf = await this.generateFromTemplate(item.templateId, item.data, item.options);
        batch.pdfs.push(pdf.id);

        if (pdf.status === 'COMPLETED') {
          batch.completedCount++;
        } else {
          batch.failedCount++;
          batch.errors.push({ pdfId: pdf.id, error: pdf.error || 'Unknown error' });
        }
      } catch (err) {
        batch.failedCount++;
        const errorId = this.generateId('err');
        batch.errors.push({
          pdfId: errorId,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }

      this.batches.set(batchId, batch);
    }

    batch.status = batch.failedCount === items.length ? 'FAILED' : 'COMPLETED';
    batch.completedAt = new Date();
    this.batches.set(batchId, batch);

    this.eventEmitter.emit('pdf.batch.completed', {
      batchId,
      totalCount: batch.totalCount,
      completedCount: batch.completedCount,
      failedCount: batch.failedCount,
    });

    return batch;
  }

  // PDF Retrieval

  async getPdf(pdfId: string): Promise<GeneratedPdf | undefined> {
    return this.pdfs.get(pdfId);
  }

  async getPdfContent(pdfId: string): Promise<Buffer | undefined> {
    const pdf = this.pdfs.get(pdfId);
    return pdf?.content;
  }

  async getPdfsByOrganization(organizationId: string, limit: number = 50): Promise<GeneratedPdf[]> {
    return Array.from(this.pdfs.values())
      .filter((p) => p.organizationId === organizationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getPdfsByUser(userId: string, limit: number = 50): Promise<GeneratedPdf[]> {
    return Array.from(this.pdfs.values())
      .filter((p) => p.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getPdfsByType(type: PdfTemplateType): Promise<GeneratedPdf[]> {
    return Array.from(this.pdfs.values()).filter((p) => p.type === type);
  }

  async getPdfsByStatus(status: PdfStatus): Promise<GeneratedPdf[]> {
    return Array.from(this.pdfs.values()).filter((p) => p.status === status);
  }

  async getBatch(batchId: string): Promise<PdfBatch | undefined> {
    return this.batches.get(batchId);
  }

  // PDF Operations

  async deletePdf(pdfId: string): Promise<void> {
    const pdf = this.pdfs.get(pdfId);
    if (!pdf) {
      throw new Error('PDF not found');
    }

    this.pdfs.delete(pdfId);

    this.eventEmitter.emit('pdf.deleted', { pdfId });

    this.logger.log(`PDF deleted: ${pdfId}`);
  }

  async mergePdfs(pdfIds: string[], name: string): Promise<GeneratedPdf> {
    const pdfsToMerge: GeneratedPdf[] = [];

    for (const id of pdfIds) {
      const pdf = this.pdfs.get(id);
      if (!pdf) {
        throw new Error(`PDF not found: ${id}`);
      }
      if (pdf.status !== 'COMPLETED') {
        throw new Error(`PDF not ready for merge: ${id}`);
      }
      pdfsToMerge.push(pdf);
    }

    const mergedId = this.generateId('pdf');
    const now = new Date();

    // Simulate merge
    const totalSize = pdfsToMerge.reduce((sum, p) => sum + (p.size || 0), 0);
    const totalPages = pdfsToMerge.reduce((sum, p) => sum + (p.pageCount || 0), 0);

    const merged: GeneratedPdf = {
      id: mergedId,
      type: 'CUSTOM',
      name,
      status: 'COMPLETED',
      content: Buffer.from(`Merged PDF content from ${pdfIds.length} files`),
      size: totalSize + 1000, // Overhead for merge
      pageCount: totalPages,
      options: {},
      data: { mergedFrom: pdfIds },
      generatedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    this.pdfs.set(mergedId, merged);

    this.eventEmitter.emit('pdf.merged', {
      pdfId: mergedId,
      sourceIds: pdfIds,
      pageCount: totalPages,
    });

    return merged;
  }

  async splitPdf(pdfId: string, pageRanges: { start: number; end: number }[]): Promise<GeneratedPdf[]> {
    const pdf = this.pdfs.get(pdfId);
    if (!pdf) {
      throw new Error('PDF not found');
    }
    if (pdf.status !== 'COMPLETED') {
      throw new Error('PDF not ready for split');
    }

    const splits: GeneratedPdf[] = [];
    const now = new Date();

    for (let i = 0; i < pageRanges.length; i++) {
      const range = pageRanges[i];
      const pageCount = range.end - range.start + 1;

      const splitId = this.generateId('pdf');
      const split: GeneratedPdf = {
        id: splitId,
        type: pdf.type,
        name: `${pdf.name}_part${i + 1}`,
        status: 'COMPLETED',
        content: Buffer.from(`Split PDF content pages ${range.start}-${range.end}`),
        size: Math.floor((pdf.size || 0) * (pageCount / (pdf.pageCount || 1))),
        pageCount,
        options: pdf.options,
        data: { splitFrom: pdfId, pageRange: range },
        organizationId: pdf.organizationId,
        userId: pdf.userId,
        generatedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      this.pdfs.set(splitId, split);
      splits.push(split);
    }

    this.eventEmitter.emit('pdf.split', {
      sourcePdfId: pdfId,
      resultIds: splits.map((s) => s.id),
      ranges: pageRanges,
    });

    return splits;
  }

  // Caching

  async getCachedPdf(cacheKey: string): Promise<GeneratedPdf | undefined> {
    const cached = this.cache.get(cacheKey);
    if (!cached) {
      return undefined;
    }

    if (cached.expiresAt < Date.now()) {
      this.cache.delete(cacheKey);
      return undefined;
    }

    return cached.pdf;
  }

  async cachePdf(pdf: GeneratedPdf, cacheKey: string, ttlMs: number = 3600000): Promise<void> {
    const cachedPdf = { ...pdf, status: 'CACHED' as PdfStatus };
    this.cache.set(cacheKey, {
      pdf: cachedPdf,
      expiresAt: Date.now() + ttlMs,
    });

    this.logger.debug(`PDF cached: ${pdf.id} with key ${cacheKey}`);
  }

  clearCache(): void {
    this.cache.clear();
    this.logger.log('PDF cache cleared');
  }

  // Template Management

  async createTemplate(
    template: Omit<PdfTemplate, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<PdfTemplate> {
    const id = this.generateId('tmpl');
    const now = new Date();

    const newTemplate: PdfTemplate = {
      ...template,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.templates.set(id, newTemplate);

    this.eventEmitter.emit('pdf.template.created', { templateId: id, name: template.name });

    return newTemplate;
  }

  async updateTemplate(
    templateId: string,
    updates: Partial<Omit<PdfTemplate, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<PdfTemplate> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const updated: PdfTemplate = {
      ...template,
      ...updates,
      version: template.version + 1,
      updatedAt: new Date(),
    };

    this.templates.set(templateId, updated);

    this.eventEmitter.emit('pdf.template.updated', { templateId });

    return updated;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    if (!this.templates.has(templateId)) {
      throw new Error('Template not found');
    }

    this.templates.delete(templateId);

    this.eventEmitter.emit('pdf.template.deleted', { templateId });
  }

  async getTemplate(templateId: string): Promise<PdfTemplate | undefined> {
    return this.templates.get(templateId);
  }

  async getTemplateByName(name: string): Promise<PdfTemplate | undefined> {
    return Array.from(this.templates.values()).find((t) => t.name === name);
  }

  async getAllTemplates(): Promise<PdfTemplate[]> {
    return Array.from(this.templates.values());
  }

  async getTemplatesByType(type: PdfTemplateType): Promise<PdfTemplate[]> {
    return Array.from(this.templates.values()).filter((t) => t.type === type);
  }

  async activateTemplate(templateId: string): Promise<PdfTemplate> {
    return this.updateTemplate(templateId, { isActive: true });
  }

  async deactivateTemplate(templateId: string): Promise<PdfTemplate> {
    return this.updateTemplate(templateId, { isActive: false });
  }

  // Statistics

  async getStats(since?: Date): Promise<PdfStats> {
    let pdfs = Array.from(this.pdfs.values());
    if (since) {
      pdfs = pdfs.filter((p) => p.createdAt >= since);
    }

    const completed = pdfs.filter((p) => p.status === 'COMPLETED');
    const totalSize = completed.reduce((sum, p) => sum + (p.size || 0), 0);

    const byType: Record<PdfTemplateType, number> = {} as any;
    const byStatus: Record<PdfStatus, number> = {} as any;

    for (const pdf of pdfs) {
      byType[pdf.type] = (byType[pdf.type] || 0) + 1;
      byStatus[pdf.status] = (byStatus[pdf.status] || 0) + 1;
    }

    return {
      totalGenerated: pdfs.length,
      totalSize,
      averageSize: completed.length > 0 ? Math.floor(totalSize / completed.length) : 0,
      averageGenerationTime:
        this.generationTimes.length > 0
          ? Math.floor(this.generationTimes.reduce((a, b) => a + b, 0) / this.generationTimes.length)
          : 0,
      byType,
      byStatus,
      recentPdfs: pdfs.slice(-10).reverse(),
    };
  }

  // Helper Methods

  private async simulateGeneration(
    htmlContent: string,
    options: PdfGenerationOptions,
  ): Promise<{ content: Buffer; size: number; pageCount: number }> {
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      // Launch Puppeteer browser
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });

      // Create new page
      page = await browser.newPage();

      // Set content
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Configure PDF options
      const pdfOptions: any = {
        format: options.pageSize || 'A4',
        orientation: options.orientation || 'portrait',
        printBackground: true,
        margin: options.margins ? {
          top: `${options.margins.top}mm`,
          right: `${options.margins.right}mm`,
          bottom: `${options.margins.bottom}mm`,
          left: `${options.margins.left}mm`,
        } : {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
        displayHeaderFooter: !!(options.header || options.footer),
      };

      // Add header if specified
      if (options.header) {
        pdfOptions.headerTemplate = options.header.content || '';
        pdfOptions.displayHeaderFooter = true;
      }

      // Add footer if specified
      if (options.footer) {
        pdfOptions.footerTemplate = options.footer.content || '';
        pdfOptions.displayHeaderFooter = true;
      }

      // Generate PDF
      const pdfBuffer = await page.pdf(pdfOptions);

      // Calculate page count (rough estimate based on buffer size and typical page size)
      const averagePageSize = 50000; // bytes per page
      const pageCount = Math.max(1, Math.ceil(pdfBuffer.length / averagePageSize));

      this.logger.log(`PDF generated successfully: ${pdfBuffer.length} bytes, ~${pageCount} pages`);

      return {
        content: pdfBuffer,
        size: pdfBuffer.length,
        pageCount
      };

    } catch (error) {
      this.logger.error(`PDF generation failed: ${error.message}`);
      throw new Error(`PDF generation failed: ${error.message}`);
    } finally {
      // Clean up resources
      if (page) {
        await page.close().catch(err => this.logger.warn(`Failed to close page: ${err.message}`));
      }
      if (browser) {
        await browser.close().catch(err => this.logger.warn(`Failed to close browser: ${err.message}`));
      }
    }
  }

  private renderTemplate(template: string, data: Record<string, any>): string {
    let result = template;

    // Handle simple variable replacement {{var}}
    result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });

    // Handle array iteration {{#items}}...{{/items}}
    result = result.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
      const items = data[key];
      if (!Array.isArray(items)) return '';

      return items
        .map((item) => {
          return content.replace(/\{\{(\w+)\}\}/g, (m: string, k: string) => {
            return item[k] !== undefined ? String(item[k]) : m;
          });
        })
        .join('');
    });

    return result;
  }

  private mergeOptions(options: PdfGenerationOptions): PdfGenerationOptions {
    return {
      pageSize: options.pageSize || 'A4',
      orientation: options.orientation || 'PORTRAIT',
      margins: {
        top: options.margins?.top ?? 20,
        right: options.margins?.right ?? 15,
        bottom: options.margins?.bottom ?? 20,
        left: options.margins?.left ?? 15,
      },
      compression: options.compression ?? true,
      ...options,
    };
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
