import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { EfacturaValidatorService, EfacturaInvoiceData, EfacturaValidationError } from './efactura-validator.service';

// e-Factura Service - ANAF SPV Integration
// B2B mandatory mid-2026 per ANAF regulations

/**
 * Invoice type codes per EN16931 / CIUS-RO
 */
export enum InvoiceTypeCode {
  STANDARD = '380',           // Commercial invoice
  CREDIT_NOTE = '381',        // Credit note
  DEBIT_NOTE = '383',         // Debit note
  CORRECTIVE = '384',         // Corrective invoice
  SELF_BILLED = '389',        // Self-billed invoice
  PREPAYMENT = '386',         // Prepayment invoice
}

/**
 * Payment means codes per UN/CEFACT
 */
export enum PaymentMeansCode {
  CASH = '10',
  CHEQUE = '20',
  CREDIT_TRANSFER = '30',
  DEBIT_TRANSFER = '31',
  BANK_CARD = '48',
  DIRECT_DEBIT = '49',
  STANDING_AGREEMENT = '57',
  SEPA_CREDIT_TRANSFER = '58',
  SEPA_DIRECT_DEBIT = '59',
  COMPENSATION = '97',
}

/**
 * VAT category codes per EN16931
 */
export enum VATCategoryCode {
  STANDARD = 'S',             // Standard rate
  ZERO_RATED = 'Z',           // Zero rated
  EXEMPT = 'E',               // Exempt from VAT
  REVERSE_CHARGE = 'AE',      // VAT Reverse Charge
  INTRA_COMMUNITY = 'K',      // Intra-community supply
  EXPORT = 'G',               // Export outside EU
  NOT_SUBJECT = 'O',          // Not subject to VAT
}

/**
 * B2B Invoice status per ANAF SPV
 */
export enum EfacturaStatus {
  DRAFT = 'draft',
  VALIDATED = 'validated',
  SUBMITTED = 'submitted',
  PENDING = 'in_processing',
  ACCEPTED = 'ok',
  REJECTED = 'nok',
  ERROR = 'eroare',
}

/**
 * Enhanced B2B invoice interface for e-Factura
 */
interface EfacturaInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  invoiceTypeCode?: InvoiceTypeCode;
  taxPointDate?: string;
  note?: string;
  buyerReference?: string;
  contractReference?: string;
  orderReference?: string;
  deliveryDate?: string;
  supplier: {
    cui: string;
    name: string;
    tradeName?: string;
    address: string;
    city?: string;
    county?: string;
    postalCode?: string;
    country?: string;
    registrationNumber?: string;
    bankAccount?: string;
    bankName?: string;
    email?: string;
    phone?: string;
    contactName?: string;
  };
  customer: {
    cui: string;
    name: string;
    tradeName?: string;
    address: string;
    city?: string;
    county?: string;
    postalCode?: string;
    country?: string;
    email?: string;
    phone?: string;
    contactName?: string;
  };
  delivery?: {
    address: string;
    city?: string;
    county?: string;
    postalCode?: string;
    country?: string;
    deliveryDate?: string;
  };
  paymentMeans?: {
    code: PaymentMeansCode;
    iban?: string;
    bic?: string;
    bankName?: string;
    paymentId?: string;
  };
  paymentTerms?: {
    note?: string;
    dueDate?: string;
    penaltyPercentage?: number;
  };
  allowances?: Array<{
    chargeIndicator: boolean;
    reason: string;
    amount: number;
    vatRate?: number;
    vatCategoryCode?: VATCategoryCode;
  }>;
  lines: Array<{
    id?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    vatCategoryCode?: VATCategoryCode;
    total: number;
    unitCode?: string;
    itemClassificationCode?: string;
    sellerItemId?: string;
    buyerItemId?: string;
    standardItemId?: string;
    originCountry?: string;
    allowances?: Array<{
      chargeIndicator: boolean;
      reason: string;
      amount: number;
    }>;
  }>;
  totals: {
    net: number;
    vat: number;
    gross: number;
    prepaidAmount?: number;
    roundingAmount?: number;
  };
  vatBreakdown?: Array<{
    taxableAmount: number;
    taxAmount: number;
    vatRate: number;
    vatCategoryCode: VATCategoryCode;
    exemptionReason?: string;
  }>;
  currency?: string;
  attachments?: Array<{
    filename: string;
    mimeType: string;
    content: string; // base64
    description?: string;
  }>;
}

/**
 * B2B submission result
 */
export interface EfacturaSubmissionResult {
  uploadIndex: string;
  status: EfacturaStatus;
  submittedAt: string;
  xml?: string;
  errors?: string[];
  warnings?: string[];
}

/**
 * B2B readiness check result
 */
export interface B2BReadinessResult {
  ready: boolean;
  missingFields: string[];
  warnings: string[];
  recommendations: string[];
  complianceScore: number;
}

@Injectable()
export class EfacturaService {
  private readonly logger = new Logger(EfacturaService.name);
  private client: AxiosInstance;

  constructor(
    private configService: ConfigService,
    private validator: EfacturaValidatorService,
  ) {
    this.client = axios.create({
      baseURL: this.configService.get('ANAF_EFACTURA_URL') || 'https://api.anaf.ro/efactura',
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  }

  // Validate invoice before processing
  validateInvoice(invoice: EfacturaInvoice): { valid: boolean; errors: EfacturaValidationError[] } {
    return this.validator.getValidationResult(invoice as EfacturaInvoiceData);
  }

  // Validate and throw if invalid
  validateOrThrow(invoice: EfacturaInvoice): void {
    this.validator.validate(invoice as EfacturaInvoiceData);
  }

  // Generate UBL 2.1 XML for e-Factura
  generateUBL(invoice: EfacturaInvoice): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1</cbc:CustomizationID>
  <cbc:ID>${invoice.invoiceNumber}</cbc:ID>
  <cbc:IssueDate>${invoice.invoiceDate}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>RON</cbc:DocumentCurrencyCode>

  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${invoice.supplier.name}</cbc:Name>
      </cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>RO${invoice.supplier.cui}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${invoice.customer.name}</cbc:Name>
      </cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>RO${invoice.customer.cui}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="RON">${invoice.totals.vat.toFixed(2)}</cbc:TaxAmount>
  </cac:TaxTotal>

  <cac:LegalMonetaryTotal>
    <cbc:TaxExclusiveAmount currencyID="RON">${invoice.totals.net.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="RON">${invoice.totals.gross.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="RON">${invoice.totals.gross.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  ${invoice.lines
    .map(
      (line, i) => `
  <cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">${line.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="RON">${line.total.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${line.description}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${line.vatRate}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="RON">${line.unitPrice.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`,
    )
    .join('')}
</Invoice>`;
  }

  // Submit to ANAF SPV
  async submitToSPV(xml: string, cui: string): Promise<{ uploadIndex: string; status: string }> {
    try {
      const response = await this.client.post(
        '/upload',
        xml,
        {
          params: { cif: cui },
          headers: {
            'Content-Type': 'application/xml',
            Authorization: `Bearer ${this.configService.get('ANAF_API_KEY')}`,
          },
        },
      );

      this.logger.log(`e-Factura submitted to SPV: ${response.data.uploadIndex}`);
      return {
        uploadIndex: response.data.uploadIndex,
        status: 'submitted',
      };
    } catch (error) {
      this.logger.error('Failed to submit e-Factura to SPV', error);
      throw error;
    }
  }

  // Check submission status
  async checkStatus(uploadIndex: string): Promise<{ status: string; messages: string[] }> {
    try {
      const response = await this.client.get(`/status/${uploadIndex}`, {
        headers: {
          Authorization: `Bearer ${this.configService.get('ANAF_API_KEY')}`,
        },
      });

      return {
        status: response.data.stare,
        messages: response.data.mesaje || [],
      };
    } catch (error) {
      this.logger.error('Failed to check e-Factura status', error);
      throw error;
    }
  }

  // Download received invoices
  async downloadReceived(cui: string, days: number = 60): Promise<any[]> {
    try {
      const response = await this.client.get('/download', {
        params: { cif: cui, zile: days },
        headers: {
          Authorization: `Bearer ${this.configService.get('ANAF_API_KEY')}`,
        },
      });

      return response.data.facturi || [];
    } catch (error) {
      this.logger.error('Failed to download received invoices', error);
      throw error;
    }
  }

  // ============================================
  // B2B Enhanced Features (MKT-002)
  // ============================================

  /**
   * Check B2B readiness for mid-2026 mandate
   * Validates company data against ANAF requirements
   */
  checkB2BReadiness(companyData: {
    cui: string;
    name: string;
    address: string;
    city?: string;
    county?: string;
    postalCode?: string;
    bankAccount?: string;
    email?: string;
    registrationNumber?: string;
  }): B2BReadinessResult {
    const missingFields: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Required fields for B2B
    if (!companyData.cui || companyData.cui.length < 2) {
      missingFields.push('CUI/CIF (Cod Unic de Identificare)');
      score -= 20;
    } else if (!this.validateCUI(companyData.cui)) {
      warnings.push('CUI format invalid - verificați codul');
      score -= 10;
    }

    if (!companyData.name || companyData.name.length < 3) {
      missingFields.push('Denumire societate');
      score -= 15;
    }

    if (!companyData.address || companyData.address.length < 5) {
      missingFields.push('Adresă completă');
      score -= 15;
    }

    if (!companyData.city) {
      missingFields.push('Localitate');
      score -= 10;
    }

    if (!companyData.county) {
      missingFields.push('Județ');
      score -= 5;
    }

    if (!companyData.postalCode) {
      warnings.push('Cod poștal lipsă - recomandat pentru e-Factura B2B');
      score -= 5;
    }

    // Recommended fields
    if (!companyData.bankAccount) {
      recommendations.push('Adăugați cont IBAN pentru plăți automate');
      score -= 5;
    } else if (!this.validateIBAN(companyData.bankAccount)) {
      warnings.push('Format IBAN invalid');
      score -= 5;
    }

    if (!companyData.email) {
      recommendations.push('Adăugați email pentru notificări e-Factura');
      score -= 5;
    }

    if (!companyData.registrationNumber) {
      recommendations.push('Adăugați număr registru comerț (J../...)');
      score -= 5;
    }

    // Additional recommendations
    if (score >= 80) {
      recommendations.push('Configurați integrarea SPV pentru transmitere automată');
      recommendations.push('Activați notificările pentru facturi primite');
    }

    return {
      ready: missingFields.length === 0 && score >= 60,
      missingFields,
      warnings,
      recommendations,
      complianceScore: Math.max(0, score),
    };
  }

  /**
   * Generate enhanced UBL 2.1 XML for B2B e-Factura
   * Full CIUS-RO 1.0.1 compliance
   */
  generateB2BUBL(invoice: EfacturaInvoice): string {
    const invoiceType = invoice.invoiceTypeCode || InvoiceTypeCode.STANDARD;
    const currency = invoice.currency || 'RON';
    const supplierCountry = invoice.supplier.country || 'RO';
    const customerCountry = invoice.customer.country || 'RO';

    // Generate VAT breakdown if not provided
    const vatBreakdown = invoice.vatBreakdown || this.calculateVATBreakdown(invoice);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${this.escapeXml(invoice.invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${invoice.invoiceDate}</cbc:IssueDate>`;

    if (invoice.dueDate) {
      xml += `\n  <cbc:DueDate>${invoice.dueDate}</cbc:DueDate>`;
    }

    xml += `\n  <cbc:InvoiceTypeCode>${invoiceType}</cbc:InvoiceTypeCode>`;

    if (invoice.taxPointDate) {
      xml += `\n  <cbc:TaxPointDate>${invoice.taxPointDate}</cbc:TaxPointDate>`;
    }

    xml += `\n  <cbc:DocumentCurrencyCode>${currency}</cbc:DocumentCurrencyCode>`;

    if (invoice.buyerReference) {
      xml += `\n  <cbc:BuyerReference>${this.escapeXml(invoice.buyerReference)}</cbc:BuyerReference>`;
    }

    if (invoice.note) {
      xml += `\n  <cbc:Note>${this.escapeXml(invoice.note)}</cbc:Note>`;
    }

    // Order reference
    if (invoice.orderReference) {
      xml += `
  <cac:OrderReference>
    <cbc:ID>${this.escapeXml(invoice.orderReference)}</cbc:ID>
  </cac:OrderReference>`;
    }

    // Contract reference
    if (invoice.contractReference) {
      xml += `
  <cac:ContractDocumentReference>
    <cbc:ID>${this.escapeXml(invoice.contractReference)}</cbc:ID>
  </cac:ContractDocumentReference>`;
    }

    // Attachments
    if (invoice.attachments && invoice.attachments.length > 0) {
      for (const attachment of invoice.attachments) {
        xml += `
  <cac:AdditionalDocumentReference>
    <cbc:ID>${this.escapeXml(attachment.filename)}</cbc:ID>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="${attachment.mimeType}" filename="${this.escapeXml(attachment.filename)}">${attachment.content}</cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>`;
      }
    }

    // Supplier
    xml += `
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cbc:EndpointID schemeID="0088">${invoice.supplier.cui}</cbc:EndpointID>
      <cac:PartyIdentification>
        <cbc:ID>${invoice.supplier.cui}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${this.escapeXml(invoice.supplier.name)}</cbc:Name>
      </cac:PartyName>`;

    if (invoice.supplier.tradeName) {
      xml += `
      <cac:PartyName>
        <cbc:Name>${this.escapeXml(invoice.supplier.tradeName)}</cbc:Name>
      </cac:PartyName>`;
    }

    xml += `
      <cac:PostalAddress>
        <cbc:StreetName>${this.escapeXml(invoice.supplier.address)}</cbc:StreetName>
        <cbc:CityName>${this.escapeXml(invoice.supplier.city || '')}</cbc:CityName>`;

    if (invoice.supplier.postalCode) {
      xml += `\n        <cbc:PostalZone>${invoice.supplier.postalCode}</cbc:PostalZone>`;
    }

    if (invoice.supplier.county) {
      xml += `\n        <cbc:CountrySubentity>${this.escapeXml(invoice.supplier.county)}</cbc:CountrySubentity>`;
    }

    xml += `
        <cac:Country>
          <cbc:IdentificationCode>${supplierCountry}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${supplierCountry}${invoice.supplier.cui}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${this.escapeXml(invoice.supplier.name)}</cbc:RegistrationName>`;

    if (invoice.supplier.registrationNumber) {
      xml += `\n        <cbc:CompanyID>${this.escapeXml(invoice.supplier.registrationNumber)}</cbc:CompanyID>`;
    }

    xml += `
      </cac:PartyLegalEntity>`;

    if (invoice.supplier.contactName || invoice.supplier.email || invoice.supplier.phone) {
      xml += `
      <cac:Contact>`;
      if (invoice.supplier.contactName) {
        xml += `\n        <cbc:Name>${this.escapeXml(invoice.supplier.contactName)}</cbc:Name>`;
      }
      if (invoice.supplier.phone) {
        xml += `\n        <cbc:Telephone>${invoice.supplier.phone}</cbc:Telephone>`;
      }
      if (invoice.supplier.email) {
        xml += `\n        <cbc:ElectronicMail>${invoice.supplier.email}</cbc:ElectronicMail>`;
      }
      xml += `
      </cac:Contact>`;
    }

    xml += `
    </cac:Party>
  </cac:AccountingSupplierParty>`;

    // Customer
    xml += `
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cbc:EndpointID schemeID="0088">${invoice.customer.cui}</cbc:EndpointID>
      <cac:PartyIdentification>
        <cbc:ID>${invoice.customer.cui}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${this.escapeXml(invoice.customer.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${this.escapeXml(invoice.customer.address)}</cbc:StreetName>
        <cbc:CityName>${this.escapeXml(invoice.customer.city || '')}</cbc:CityName>`;

    if (invoice.customer.postalCode) {
      xml += `\n        <cbc:PostalZone>${invoice.customer.postalCode}</cbc:PostalZone>`;
    }

    if (invoice.customer.county) {
      xml += `\n        <cbc:CountrySubentity>${this.escapeXml(invoice.customer.county)}</cbc:CountrySubentity>`;
    }

    xml += `
        <cac:Country>
          <cbc:IdentificationCode>${customerCountry}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${customerCountry}${invoice.customer.cui}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${this.escapeXml(invoice.customer.name)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>`;

    if (invoice.customer.contactName || invoice.customer.email || invoice.customer.phone) {
      xml += `
      <cac:Contact>`;
      if (invoice.customer.contactName) {
        xml += `\n        <cbc:Name>${this.escapeXml(invoice.customer.contactName)}</cbc:Name>`;
      }
      if (invoice.customer.phone) {
        xml += `\n        <cbc:Telephone>${invoice.customer.phone}</cbc:Telephone>`;
      }
      if (invoice.customer.email) {
        xml += `\n        <cbc:ElectronicMail>${invoice.customer.email}</cbc:ElectronicMail>`;
      }
      xml += `
      </cac:Contact>`;
    }

    xml += `
    </cac:Party>
  </cac:AccountingCustomerParty>`;

    // Delivery
    if (invoice.delivery) {
      xml += `
  <cac:Delivery>`;
      if (invoice.delivery.deliveryDate || invoice.deliveryDate) {
        xml += `\n    <cbc:ActualDeliveryDate>${invoice.delivery.deliveryDate || invoice.deliveryDate}</cbc:ActualDeliveryDate>`;
      }
      xml += `
    <cac:DeliveryLocation>
      <cac:Address>
        <cbc:StreetName>${this.escapeXml(invoice.delivery.address)}</cbc:StreetName>
        <cbc:CityName>${this.escapeXml(invoice.delivery.city || '')}</cbc:CityName>`;
      if (invoice.delivery.postalCode) {
        xml += `\n        <cbc:PostalZone>${invoice.delivery.postalCode}</cbc:PostalZone>`;
      }
      xml += `
        <cac:Country>
          <cbc:IdentificationCode>${invoice.delivery.country || 'RO'}</cbc:IdentificationCode>
        </cac:Country>
      </cac:Address>
    </cac:DeliveryLocation>
  </cac:Delivery>`;
    }

    // Payment means
    if (invoice.paymentMeans) {
      xml += `
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>${invoice.paymentMeans.code}</cbc:PaymentMeansCode>`;
      if (invoice.paymentMeans.paymentId) {
        xml += `\n    <cbc:PaymentID>${this.escapeXml(invoice.paymentMeans.paymentId)}</cbc:PaymentID>`;
      }
      if (invoice.paymentMeans.iban) {
        xml += `
    <cac:PayeeFinancialAccount>
      <cbc:ID>${invoice.paymentMeans.iban}</cbc:ID>`;
        if (invoice.paymentMeans.bankName) {
          xml += `\n      <cbc:Name>${this.escapeXml(invoice.paymentMeans.bankName)}</cbc:Name>`;
        }
        if (invoice.paymentMeans.bic) {
          xml += `
      <cac:FinancialInstitutionBranch>
        <cbc:ID>${invoice.paymentMeans.bic}</cbc:ID>
      </cac:FinancialInstitutionBranch>`;
        }
        xml += `
    </cac:PayeeFinancialAccount>`;
      }
      xml += `
  </cac:PaymentMeans>`;
    }

    // Payment terms
    if (invoice.paymentTerms) {
      xml += `
  <cac:PaymentTerms>
    <cbc:Note>${this.escapeXml(invoice.paymentTerms.note || `Termen plată: ${invoice.dueDate || 'la vedere'}`)}</cbc:Note>
  </cac:PaymentTerms>`;
    }

    // Document level allowances/charges
    if (invoice.allowances && invoice.allowances.length > 0) {
      for (const allowance of invoice.allowances) {
        xml += `
  <cac:AllowanceCharge>
    <cbc:ChargeIndicator>${allowance.chargeIndicator}</cbc:ChargeIndicator>
    <cbc:AllowanceChargeReason>${this.escapeXml(allowance.reason)}</cbc:AllowanceChargeReason>
    <cbc:Amount currencyID="${currency}">${allowance.amount.toFixed(2)}</cbc:Amount>
    <cac:TaxCategory>
      <cbc:ID>${allowance.vatCategoryCode || VATCategoryCode.STANDARD}</cbc:ID>
      <cbc:Percent>${allowance.vatRate || 21}</cbc:Percent>
      <cac:TaxScheme>
        <cbc:ID>VAT</cbc:ID>
      </cac:TaxScheme>
    </cac:TaxCategory>
  </cac:AllowanceCharge>`;
      }
    }

    // VAT breakdown (TaxTotal)
    xml += `
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${currency}">${invoice.totals.vat.toFixed(2)}</cbc:TaxAmount>`;

    for (const vat of vatBreakdown) {
      xml += `
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${currency}">${vat.taxableAmount.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${currency}">${vat.taxAmount.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>${vat.vatCategoryCode}</cbc:ID>
        <cbc:Percent>${vat.vatRate}</cbc:Percent>`;
      if (vat.exemptionReason) {
        xml += `\n        <cbc:TaxExemptionReason>${this.escapeXml(vat.exemptionReason)}</cbc:TaxExemptionReason>`;
      }
      xml += `
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`;
    }

    xml += `
  </cac:TaxTotal>`;

    // Legal monetary total
    xml += `
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${currency}">${invoice.totals.net.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${currency}">${invoice.totals.net.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${currency}">${invoice.totals.gross.toFixed(2)}</cbc:TaxInclusiveAmount>`;

    if (invoice.totals.prepaidAmount) {
      xml += `\n    <cbc:PrepaidAmount currencyID="${currency}">${invoice.totals.prepaidAmount.toFixed(2)}</cbc:PrepaidAmount>`;
    }

    if (invoice.totals.roundingAmount) {
      xml += `\n    <cbc:PayableRoundingAmount currencyID="${currency}">${invoice.totals.roundingAmount.toFixed(2)}</cbc:PayableRoundingAmount>`;
    }

    const payableAmount = invoice.totals.gross - (invoice.totals.prepaidAmount || 0);
    xml += `
    <cbc:PayableAmount currencyID="${currency}">${payableAmount.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>`;

    // Invoice lines
    invoice.lines.forEach((line, index) => {
      const lineId = line.id || String(index + 1);
      const unitCode = line.unitCode || 'C62'; // C62 = unit
      const vatCategory = line.vatCategoryCode || VATCategoryCode.STANDARD;

      xml += `
  <cac:InvoiceLine>
    <cbc:ID>${lineId}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${unitCode}">${line.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${currency}">${line.total.toFixed(2)}</cbc:LineExtensionAmount>`;

      // Line level allowances
      if (line.allowances && line.allowances.length > 0) {
        for (const allowance of line.allowances) {
          xml += `
    <cac:AllowanceCharge>
      <cbc:ChargeIndicator>${allowance.chargeIndicator}</cbc:ChargeIndicator>
      <cbc:AllowanceChargeReason>${this.escapeXml(allowance.reason)}</cbc:AllowanceChargeReason>
      <cbc:Amount currencyID="${currency}">${allowance.amount.toFixed(2)}</cbc:Amount>
    </cac:AllowanceCharge>`;
        }
      }

      xml += `
    <cac:Item>
      <cbc:Description>${this.escapeXml(line.description)}</cbc:Description>
      <cbc:Name>${this.escapeXml(line.description.substring(0, 50))}</cbc:Name>`;

      if (line.sellerItemId) {
        xml += `
      <cac:SellersItemIdentification>
        <cbc:ID>${this.escapeXml(line.sellerItemId)}</cbc:ID>
      </cac:SellersItemIdentification>`;
      }

      if (line.buyerItemId) {
        xml += `
      <cac:BuyersItemIdentification>
        <cbc:ID>${this.escapeXml(line.buyerItemId)}</cbc:ID>
      </cac:BuyersItemIdentification>`;
      }

      if (line.standardItemId) {
        xml += `
      <cac:StandardItemIdentification>
        <cbc:ID schemeID="0160">${this.escapeXml(line.standardItemId)}</cbc:ID>
      </cac:StandardItemIdentification>`;
      }

      if (line.originCountry) {
        xml += `
      <cac:OriginCountry>
        <cbc:IdentificationCode>${line.originCountry}</cbc:IdentificationCode>
      </cac:OriginCountry>`;
      }

      if (line.itemClassificationCode) {
        xml += `
      <cac:CommodityClassification>
        <cbc:ItemClassificationCode listID="STI">${line.itemClassificationCode}</cbc:ItemClassificationCode>
      </cac:CommodityClassification>`;
      }

      xml += `
      <cac:ClassifiedTaxCategory>
        <cbc:ID>${vatCategory}</cbc:ID>
        <cbc:Percent>${line.vatRate}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${currency}">${line.unitPrice.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`;
    });

    xml += `
</Invoice>`;

    return xml;
  }

  /**
   * Submit B2B invoice to ANAF SPV with enhanced tracking
   */
  async submitB2BInvoice(
    invoice: EfacturaInvoice,
    cui: string,
  ): Promise<EfacturaSubmissionResult> {
    try {
      // Validate first
      this.validateOrThrow(invoice);

      // Generate enhanced B2B UBL
      const xml = this.generateB2BUBL(invoice);

      // Submit to SPV
      const response = await this.client.post(
        '/upload',
        xml,
        {
          params: { cif: cui, standard: 'UBL' },
          headers: {
            'Content-Type': 'application/xml',
            Authorization: `Bearer ${this.configService.get('ANAF_API_KEY')}`,
          },
        },
      );

      this.logger.log(`B2B e-Factura submitted: ${response.data.uploadIndex}`);

      return {
        uploadIndex: response.data.uploadIndex,
        status: EfacturaStatus.SUBMITTED,
        submittedAt: new Date().toISOString(),
        xml,
        warnings: response.data.atentionari || [],
      };
    } catch (error: any) {
      this.logger.error('Failed to submit B2B e-Factura', error);
      return {
        uploadIndex: '',
        status: EfacturaStatus.ERROR,
        submittedAt: new Date().toISOString(),
        errors: [error.message || 'Eroare la transmiterea facturii'],
      };
    }
  }

  /**
   * Generate credit note for B2B
   */
  generateCreditNote(
    originalInvoice: EfacturaInvoice,
    creditNoteNumber: string,
    reason: string,
    linesToCredit?: number[], // Line indices to credit, if partial
  ): EfacturaInvoice {
    const creditNote: EfacturaInvoice = {
      ...originalInvoice,
      invoiceNumber: creditNoteNumber,
      invoiceDate: new Date().toISOString().split('T')[0],
      invoiceTypeCode: InvoiceTypeCode.CREDIT_NOTE,
      note: `Stornare pentru factura ${originalInvoice.invoiceNumber}. Motiv: ${reason}`,
      orderReference: originalInvoice.invoiceNumber,
      lines: [],
      totals: { net: 0, vat: 0, gross: 0 },
    };

    // Credit specified lines or all lines
    const linesToProcess = linesToCredit
      ? originalInvoice.lines.filter((_, i) => linesToCredit.includes(i))
      : originalInvoice.lines;

    creditNote.lines = linesToProcess.map((line, i) => ({
      ...line,
      id: String(i + 1),
      quantity: -Math.abs(line.quantity),
      total: -Math.abs(line.total),
    }));

    // Calculate totals
    creditNote.totals.net = creditNote.lines.reduce((sum, l) => sum + l.total, 0);
    creditNote.totals.vat = creditNote.lines.reduce(
      (sum, l) => sum + (l.total * l.vatRate / 100),
      0,
    );
    creditNote.totals.gross = creditNote.totals.net + creditNote.totals.vat;

    return creditNote;
  }

  /**
   * Get B2B compliance calendar and deadlines
   */
  getB2BComplianceCalendar(): {
    mandateStartDate: string;
    currentPhase: string;
    nextDeadline: string;
    recommendations: string[];
  } {
    const now = new Date();
    const b2bMandateDate = new Date('2026-07-01'); // Mid-2026

    const daysUntilMandate = Math.ceil(
      (b2bMandateDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    let currentPhase = 'Pregătire';
    let recommendations: string[] = [];

    if (daysUntilMandate > 365) {
      currentPhase = 'Pregătire timpurie';
      recommendations = [
        'Actualizați datele companiei pentru conformitate B2B',
        'Testați integrarea SPV în mediul de testare',
        'Formați echipa pe noile cerințe e-Factura B2B',
      ];
    } else if (daysUntilMandate > 180) {
      currentPhase = 'Pregătire activă';
      recommendations = [
        'Finalizați integrarea cu sistemul SPV',
        'Validați toate facturile în format UBL 2.1',
        'Configurați procesarea automată a facturilor primite',
      ];
    } else if (daysUntilMandate > 90) {
      currentPhase = 'Implementare finală';
      recommendations = [
        'Testați fluxul complet B2B cu parteneri',
        'Verificați conformitatea CIUS-RO pentru toate tipurile de facturi',
        'Pregătiți proceduri de backup pentru transmitere',
      ];
    } else if (daysUntilMandate > 0) {
      currentPhase = 'Pre-lansare';
      recommendations = [
        'Verificare finală a tuturor configurărilor',
        'Monitorizare activă a transmiterilor de test',
        'Pregătire suport tehnic pentru tranziție',
      ];
    } else {
      currentPhase = 'Obligatoriu';
      recommendations = [
        'Toate facturile B2B trebuie transmise prin SPV',
        'Monitorizați statusul facturilor trimise și primite',
        'Respectați termenele de răspuns pentru facturi primite',
      ];
    }

    return {
      mandateStartDate: b2bMandateDate.toISOString().split('T')[0],
      currentPhase,
      nextDeadline: daysUntilMandate > 0
        ? `${daysUntilMandate} zile până la obligativitate B2B`
        : 'e-Factura B2B obligatorie',
      recommendations,
    };
  }

  /**
   * Validate Romanian CUI format
   */
  private validateCUI(cui: string): boolean {
    const cleanCUI = cui.replace(/[^0-9]/g, '');
    if (cleanCUI.length < 2 || cleanCUI.length > 10) return false;

    // Checksum validation
    const weights = [7, 5, 3, 2, 1, 7, 5, 3, 2];
    const digits = cleanCUI.padStart(10, '0').split('').map(Number);
    const checkDigit = digits.pop()!;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += digits[i] * weights[i];
    }

    const remainder = (sum * 10) % 11;
    const expectedCheck = remainder === 10 ? 0 : remainder;

    return checkDigit === expectedCheck;
  }

  /**
   * Validate IBAN format
   */
  private validateIBAN(iban: string): boolean {
    const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();
    if (!/^RO[0-9]{2}[A-Z]{4}[A-Z0-9]{16}$/.test(cleanIBAN)) {
      return false;
    }
    // Could add checksum validation here
    return true;
  }

  /**
   * Calculate VAT breakdown from invoice lines
   */
  private calculateVATBreakdown(invoice: EfacturaInvoice): Array<{
    taxableAmount: number;
    taxAmount: number;
    vatRate: number;
    vatCategoryCode: VATCategoryCode;
    exemptionReason?: string;
  }> {
    const breakdown = new Map<string, {
      taxableAmount: number;
      taxAmount: number;
      vatRate: number;
      vatCategoryCode: VATCategoryCode;
      exemptionReason?: string;
    }>();

    for (const line of invoice.lines) {
      const vatCategory = line.vatCategoryCode || VATCategoryCode.STANDARD;
      const key = `${line.vatRate}-${vatCategory}`;
      const existing = breakdown.get(key) || {
        taxableAmount: 0,
        taxAmount: 0,
        vatRate: line.vatRate,
        vatCategoryCode: vatCategory,
        exemptionReason: this.getExemptionReason(vatCategory, line.vatRate),
      };

      existing.taxableAmount += line.total;
      existing.taxAmount += line.total * line.vatRate / 100;
      breakdown.set(key, existing);
    }

    return Array.from(breakdown.values());
  }

  /**
   * Get exemption reason for VAT category
   */
  private getExemptionReason(category: VATCategoryCode, rate: number): string | undefined {
    if (rate > 0 && category === VATCategoryCode.STANDARD) return undefined;

    const reasons: Record<VATCategoryCode, string> = {
      [VATCategoryCode.STANDARD]: '',
      [VATCategoryCode.ZERO_RATED]: 'VATEX-EU-O - Zero rated per Art. 143 Cod Fiscal',
      [VATCategoryCode.EXEMPT]: 'VATEX-EU-79 - Exempt per Art. 141 Cod Fiscal',
      [VATCategoryCode.REVERSE_CHARGE]: 'VATEX-EU-AE - Taxare inversă per Art. 331 Cod Fiscal',
      [VATCategoryCode.INTRA_COMMUNITY]: 'VATEX-EU-IC - Livrare intracomunitară',
      [VATCategoryCode.EXPORT]: 'VATEX-EU-G - Export în afara UE',
      [VATCategoryCode.NOT_SUBJECT]: 'VATEX-EU-O - Nu face obiectul TVA',
    };

    return reasons[category] || undefined;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
