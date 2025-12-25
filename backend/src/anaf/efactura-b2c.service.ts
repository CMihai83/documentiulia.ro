/**
 * B2C e-Factura Service
 * Sprint 41: B2C e-Factura Support (Jan 2025 mandate)
 *
 * Handles B2C (Business-to-Consumer) e-Factura submissions to ANAF.
 * Mandatory from January 2025 via RO platform with 10-year retention.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ANAFResilientService } from './anaf-resilient.service';

// B2C Invoice Types
export enum B2CInvoiceType {
  STANDARD = 'STANDARD',
  SIMPLIFIED = 'SIMPLIFIED', // For amounts under threshold
  CREDIT_NOTE = 'CREDIT_NOTE',
  DEBIT_NOTE = 'DEBIT_NOTE',
  SELF_BILLING = 'SELF_BILLING',
}

// Consumer Types
export enum ConsumerType {
  INDIVIDUAL = 'INDIVIDUAL',
  FOREIGN_INDIVIDUAL = 'FOREIGN_INDIVIDUAL',
  NON_VAT_ENTITY = 'NON_VAT_ENTITY',
}

// Interfaces
export interface B2CInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  invoiceType: B2CInvoiceType;

  // Seller (Business)
  seller: {
    cui: string;
    name: string;
    address: string;
    city: string;
    county: string;
    country: string;
    postalCode?: string;
    vatPayer: boolean;
    tradeRegister?: string;
    iban?: string;
    bank?: string;
    email?: string;
    phone?: string;
  };

  // Buyer (Consumer)
  buyer: {
    type: ConsumerType;
    name: string;
    cnp?: string; // Romanian personal ID (optional)
    address?: string;
    city?: string;
    country: string;
    email?: string;
    phone?: string;
  };

  // Items
  items: B2CInvoiceItem[];

  // Totals
  currency: string;
  netTotal: number;
  vatTotal: number;
  grossTotal: number;

  // Payment
  paymentMethod?: string;
  paymentTerms?: string;
  dueDate?: Date;
  isPaid: boolean;

  // e-Factura
  uploadIndex?: string;
  efacturaStatus?: string;
  submittedAt?: Date;

  // Metadata
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface B2CInvoiceItem {
  lineNumber: number;
  description: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  vatRate: number;
  vatCategory: string;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  productCode?: string;
  ncCode?: string; // Nomenclature code
  discount?: number;
}

export interface B2CSubmissionResult {
  success: boolean;
  invoiceId: string;
  uploadIndex?: string;
  status: string;
  message?: string;
  xmlGenerated: boolean;
  submittedAt?: Date;
  retentionExpiresAt?: Date;
}

export interface B2CStatusCheck {
  invoiceId: string;
  uploadIndex: string;
  status: 'PENDING' | 'PROCESSING' | 'ACCEPTED' | 'REJECTED' | 'ERROR';
  message?: string;
  downloadId?: string;
  checkedAt: Date;
}

@Injectable()
export class EFacturaB2CService {
  private readonly logger = new Logger(EFacturaB2CService.name);

  // Simplified invoice threshold (RON)
  private readonly simplifiedThreshold = 500;

  // Retention period (years)
  private readonly retentionYears = 10;

  // In-memory storage for demo
  private invoices: Map<string, B2CInvoice> = new Map();
  private submissionHistory: Map<string, B2CSubmissionResult[]> = new Map();

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
    private anafService: ANAFResilientService,
  ) {}

  /**
   * Create a B2C invoice
   */
  async createInvoice(
    invoiceData: Omit<B2CInvoice, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<B2CInvoice> {
    const invoice: B2CInvoice = {
      ...invoiceData,
      id: `B2C-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Determine invoice type based on amount
    if (
      invoice.invoiceType === B2CInvoiceType.STANDARD &&
      invoice.grossTotal <= this.simplifiedThreshold
    ) {
      invoice.invoiceType = B2CInvoiceType.SIMPLIFIED;
      this.logger.debug(`Invoice ${invoice.id} marked as simplified (amount <= ${this.simplifiedThreshold} RON)`);
    }

    this.invoices.set(invoice.id, invoice);
    this.eventEmitter.emit('efactura.b2c.created', invoice);

    this.logger.log(`B2C invoice created: ${invoice.invoiceNumber}`);
    return invoice;
  }

  /**
   * Generate UBL 2.1 XML for B2C e-Factura
   */
  generateXML(invoice: B2CInvoice): string {
    const issueDate = invoice.invoiceDate.toISOString().split('T')[0];
    const dueDate = invoice.dueDate?.toISOString().split('T')[0] || issueDate;

    // Determine document type code
    const typeCode = this.getInvoiceTypeCode(invoice.invoiceType);

    // Generate XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">

  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1</cbc:CustomizationID>
  <cbc:ID>${this.escapeXml(invoice.invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:DueDate>${dueDate}</cbc:DueDate>
  <cbc:InvoiceTypeCode>${typeCode}</cbc:InvoiceTypeCode>
  <cbc:Note>${this.escapeXml(invoice.notes || '')}</cbc:Note>
  <cbc:DocumentCurrencyCode>${invoice.currency}</cbc:DocumentCurrencyCode>

  <!-- Seller (Business) -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="RO">${invoice.seller.cui}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${this.escapeXml(invoice.seller.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${this.escapeXml(invoice.seller.address)}</cbc:StreetName>
        <cbc:CityName>${this.escapeXml(invoice.seller.city)}</cbc:CityName>
        <cbc:PostalZone>${invoice.seller.postalCode || ''}</cbc:PostalZone>
        <cbc:CountrySubentity>${this.escapeXml(invoice.seller.county)}</cbc:CountrySubentity>
        <cac:Country>
          <cbc:IdentificationCode>${invoice.seller.country}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>RO${invoice.seller.cui}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${this.escapeXml(invoice.seller.name)}</cbc:RegistrationName>
        <cbc:CompanyID>${invoice.seller.tradeRegister || ''}</cbc:CompanyID>
      </cac:PartyLegalEntity>
      ${invoice.seller.email ? `
      <cac:Contact>
        <cbc:ElectronicMail>${invoice.seller.email}</cbc:ElectronicMail>
        <cbc:Telephone>${invoice.seller.phone || ''}</cbc:Telephone>
      </cac:Contact>` : ''}
    </cac:Party>
  </cac:AccountingSupplierParty>

  <!-- Buyer (Consumer) -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      ${invoice.buyer.cnp ? `
      <cac:PartyIdentification>
        <cbc:ID schemeID="CNP">${invoice.buyer.cnp}</cbc:ID>
      </cac:PartyIdentification>` : ''}
      <cac:PartyName>
        <cbc:Name>${this.escapeXml(invoice.buyer.name)}</cbc:Name>
      </cac:PartyName>
      ${invoice.buyer.address ? `
      <cac:PostalAddress>
        <cbc:StreetName>${this.escapeXml(invoice.buyer.address)}</cbc:StreetName>
        <cbc:CityName>${this.escapeXml(invoice.buyer.city || '')}</cbc:CityName>
        <cac:Country>
          <cbc:IdentificationCode>${invoice.buyer.country}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>` : ''}
      ${invoice.buyer.email ? `
      <cac:Contact>
        <cbc:ElectronicMail>${invoice.buyer.email}</cbc:ElectronicMail>
        <cbc:Telephone>${invoice.buyer.phone || ''}</cbc:Telephone>
      </cac:Contact>` : ''}
    </cac:Party>
  </cac:AccountingCustomerParty>

  ${invoice.seller.iban ? `
  <!-- Payment Means -->
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>30</cbc:PaymentMeansCode>
    <cac:PayeeFinancialAccount>
      <cbc:ID>${invoice.seller.iban}</cbc:ID>
      <cbc:Name>${this.escapeXml(invoice.seller.name)}</cbc:Name>
      ${invoice.seller.bank ? `
      <cac:FinancialInstitutionBranch>
        <cbc:Name>${this.escapeXml(invoice.seller.bank)}</cbc:Name>
      </cac:FinancialInstitutionBranch>` : ''}
    </cac:PayeeFinancialAccount>
  </cac:PaymentMeans>` : ''}

  <!-- Tax Totals -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${invoice.currency}">${invoice.vatTotal.toFixed(2)}</cbc:TaxAmount>
    ${this.generateTaxSubtotals(invoice)}
  </cac:TaxTotal>

  <!-- Legal Monetary Total -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${invoice.currency}">${invoice.netTotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${invoice.currency}">${invoice.netTotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${invoice.currency}">${invoice.grossTotal.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${invoice.currency}">${invoice.grossTotal.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <!-- Invoice Lines -->
  ${invoice.items.map(item => this.generateInvoiceLine(item, invoice.currency)).join('\n')}

</Invoice>`;

    return xml;
  }

  /**
   * Get invoice type code
   */
  private getInvoiceTypeCode(type: B2CInvoiceType): string {
    switch (type) {
      case B2CInvoiceType.CREDIT_NOTE:
        return '381';
      case B2CInvoiceType.DEBIT_NOTE:
        return '383';
      case B2CInvoiceType.SELF_BILLING:
        return '389';
      default:
        return '380'; // Standard/Simplified
    }
  }

  /**
   * Generate tax subtotals XML
   */
  private generateTaxSubtotals(invoice: B2CInvoice): string {
    // Group items by VAT rate
    const vatGroups = new Map<number, { taxable: number; tax: number }>();

    for (const item of invoice.items) {
      const existing = vatGroups.get(item.vatRate) || { taxable: 0, tax: 0 };
      existing.taxable += item.netAmount;
      existing.tax += item.vatAmount;
      vatGroups.set(item.vatRate, existing);
    }

    return Array.from(vatGroups.entries())
      .map(
        ([rate, amounts]) => `
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${invoice.currency}">${amounts.taxable.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${invoice.currency}">${amounts.tax.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${rate}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`,
      )
      .join('');
  }

  /**
   * Generate invoice line XML
   */
  private generateInvoiceLine(item: B2CInvoiceItem, currency: string): string {
    return `
  <cac:InvoiceLine>
    <cbc:ID>${item.lineNumber}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${item.unitOfMeasure}">${item.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${currency}">${item.netAmount.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>${this.escapeXml(item.description)}</cbc:Description>
      <cbc:Name>${this.escapeXml(item.description.substring(0, 100))}</cbc:Name>
      ${item.productCode ? `
      <cac:SellersItemIdentification>
        <cbc:ID>${item.productCode}</cbc:ID>
      </cac:SellersItemIdentification>` : ''}
      ${item.ncCode ? `
      <cac:CommodityClassification>
        <cbc:ItemClassificationCode listID="NC">${item.ncCode}</cbc:ItemClassificationCode>
      </cac:CommodityClassification>` : ''}
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${item.vatRate}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${currency}">${item.unitPrice.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Submit B2C invoice to ANAF
   */
  async submitToANAF(invoiceId: string): Promise<B2CSubmissionResult> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      return {
        success: false,
        invoiceId,
        status: 'ERROR',
        message: 'Invoice not found',
        xmlGenerated: false,
      };
    }

    try {
      // Generate XML
      const xml = this.generateXML(invoice);
      this.logger.debug(`Generated XML for invoice ${invoice.invoiceNumber}`);

      // Submit via resilient service
      const response = await this.anafService.uploadEFactura(xml, invoice.seller.cui);

      if (response.success && response.data) {
        // Update invoice with submission details
        invoice.uploadIndex = response.data.uploadIndex;
        invoice.efacturaStatus = 'SUBMITTED';
        invoice.submittedAt = new Date();
        invoice.updatedAt = new Date();
        this.invoices.set(invoiceId, invoice);

        const result: B2CSubmissionResult = {
          success: true,
          invoiceId,
          uploadIndex: response.data.uploadIndex,
          status: 'SUBMITTED',
          xmlGenerated: true,
          submittedAt: invoice.submittedAt,
          retentionExpiresAt: new Date(
            invoice.submittedAt.getTime() + this.retentionYears * 365 * 24 * 60 * 60 * 1000,
          ),
        };

        // Store submission history
        const history = this.submissionHistory.get(invoiceId) || [];
        history.push(result);
        this.submissionHistory.set(invoiceId, history);

        this.eventEmitter.emit('efactura.b2c.submitted', result);
        this.logger.log(`B2C invoice ${invoice.invoiceNumber} submitted successfully`);

        return result;
      } else {
        const result: B2CSubmissionResult = {
          success: false,
          invoiceId,
          status: 'ERROR',
          message: response.error || 'Unknown error',
          xmlGenerated: true,
        };

        this.eventEmitter.emit('efactura.b2c.failed', result);
        return result;
      }
    } catch (error) {
      this.logger.error(`Failed to submit B2C invoice ${invoiceId}`, error);
      return {
        success: false,
        invoiceId,
        status: 'ERROR',
        message: error.message,
        xmlGenerated: false,
      };
    }
  }

  /**
   * Check submission status
   */
  async checkStatus(invoiceId: string): Promise<B2CStatusCheck> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice || !invoice.uploadIndex) {
      return {
        invoiceId,
        uploadIndex: '',
        status: 'ERROR',
        message: 'Invoice not found or not submitted',
        checkedAt: new Date(),
      };
    }

    try {
      const response = await this.anafService.getEFacturaStatus(
        invoice.uploadIndex,
        invoice.seller.cui,
      );

      if (response.success && response.data) {
        const status = this.mapANAFStatus(response.data.status);

        // Update invoice status
        invoice.efacturaStatus = status;
        invoice.updatedAt = new Date();
        this.invoices.set(invoiceId, invoice);

        return {
          invoiceId,
          uploadIndex: invoice.uploadIndex,
          status,
          message: response.data.message,
          downloadId: response.data.downloadId,
          checkedAt: new Date(),
        };
      } else {
        return {
          invoiceId,
          uploadIndex: invoice.uploadIndex,
          status: 'ERROR',
          message: response.error,
          checkedAt: new Date(),
        };
      }
    } catch (error) {
      this.logger.error(`Failed to check status for invoice ${invoiceId}`, error);
      return {
        invoiceId,
        uploadIndex: invoice.uploadIndex!,
        status: 'ERROR',
        message: error.message,
        checkedAt: new Date(),
      };
    }
  }

  /**
   * Map ANAF status to our status
   */
  private mapANAFStatus(anafStatus: string): B2CStatusCheck['status'] {
    const statusMap: Record<string, B2CStatusCheck['status']> = {
      'in prelucrare': 'PROCESSING',
      'ok': 'ACCEPTED',
      'nok': 'REJECTED',
      'eroare': 'ERROR',
    };

    return statusMap[anafStatus.toLowerCase()] || 'PENDING';
  }

  /**
   * Get invoice by ID
   */
  getInvoice(invoiceId: string): B2CInvoice | null {
    return this.invoices.get(invoiceId) || null;
  }

  /**
   * Get invoices by seller CUI
   */
  getInvoicesBySeller(cui: string): B2CInvoice[] {
    return Array.from(this.invoices.values()).filter(
      (inv) => inv.seller.cui === cui,
    );
  }

  /**
   * Get submission history for invoice
   */
  getSubmissionHistory(invoiceId: string): B2CSubmissionResult[] {
    return this.submissionHistory.get(invoiceId) || [];
  }

  /**
   * Calculate retention expiry date
   */
  calculateRetentionExpiry(submissionDate: Date): Date {
    return new Date(
      submissionDate.getTime() + this.retentionYears * 365 * 24 * 60 * 60 * 1000,
    );
  }

  /**
   * Validate B2C invoice before submission
   */
  validateInvoice(invoice: B2CInvoice): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required seller fields
    if (!invoice.seller.cui) errors.push('Seller CUI is required');
    if (!invoice.seller.name) errors.push('Seller name is required');
    if (!invoice.seller.address) errors.push('Seller address is required');

    // Required buyer fields
    if (!invoice.buyer.name) errors.push('Buyer name is required');
    if (!invoice.buyer.country) errors.push('Buyer country is required');

    // Invoice number
    if (!invoice.invoiceNumber) errors.push('Invoice number is required');

    // Items
    if (!invoice.items || invoice.items.length === 0) {
      errors.push('At least one invoice item is required');
    }

    // Totals validation
    const calculatedNet = invoice.items.reduce((sum, item) => sum + item.netAmount, 0);
    const calculatedVat = invoice.items.reduce((sum, item) => sum + item.vatAmount, 0);

    if (Math.abs(calculatedNet - invoice.netTotal) > 0.01) {
      errors.push('Net total does not match sum of items');
    }

    if (Math.abs(calculatedVat - invoice.vatTotal) > 0.01) {
      errors.push('VAT total does not match sum of items');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
