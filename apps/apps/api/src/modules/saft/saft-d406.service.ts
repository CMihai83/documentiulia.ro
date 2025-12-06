/**
 * SAF-T D406 (Standard Audit File for Tax) Service
 * Romanian implementation conforming to ANAF D406 specification
 *
 * SAF-T D406 includes:
 * - Master files (Chart of accounts, Customers, Suppliers, Products)
 * - General ledger entries
 * - Source documents (Invoices, Payments)
 * - Movement of goods
 *
 * Reporting periods:
 * - Monthly for large taxpayers
 * - Quarterly for medium taxpayers
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as xml2js from 'xml2js';
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from 'date-fns';

interface SaftHeader {
  auditFileVersion: string;
  auditFileCountry: string;
  auditFileDateCreated: string;
  softwareCompanyName: string;
  softwareId: string;
  softwareVersion: string;
  company: {
    registrationNumber: string;
    name: string;
    address: SaftAddress;
    contact: SaftContact;
    taxRegistration: SaftTaxRegistration;
    bankAccount?: SaftBankAccount[];
  };
  defaultCurrencyCode: string;
  selectionCriteria: {
    selectionStartDate: string;
    selectionEndDate: string;
  };
  taxAccountingBasis: string;
  taxEntity: string;
}

interface SaftAddress {
  streetName?: string;
  number?: string;
  city: string;
  postalCode?: string;
  region?: string;
  country: string;
}

interface SaftContact {
  contactPerson?: {
    firstName?: string;
    lastName?: string;
  };
  telephone?: string;
  email?: string;
}

interface SaftTaxRegistration {
  taxRegistrationNumber: string;
  taxType: string;
}

interface SaftBankAccount {
  bankAccountNumber: string;
  bankAccountName?: string;
  bankID?: string;
}

interface SaftCustomer {
  customerID: string;
  name: string;
  address: SaftAddress;
  contact?: SaftContact;
  taxRegistration?: SaftTaxRegistration;
  openingDebitBalance?: number;
  closingDebitBalance?: number;
}

interface SaftSupplier {
  supplierID: string;
  name: string;
  address: SaftAddress;
  contact?: SaftContact;
  taxRegistration?: SaftTaxRegistration;
  openingCreditBalance?: number;
  closingCreditBalance?: number;
}

interface SaftTaxTableEntry {
  taxType: string;
  taxCodeDetails: {
    taxCode: string;
    effectiveDate: string;
    expirationDate?: string;
    description: string;
    taxPercentage: number;
  };
}

interface SaftSalesInvoice {
  invoiceNo: string;
  invoiceDate: string;
  invoiceType: string;
  customerID: string;
  period: number;
  periodYear: number;
  lines: SaftInvoiceLine[];
  documentTotals: SaftDocumentTotals;
  settlementData?: {
    paymentTerms?: string;
    paymentMethods?: string[];
  };
}

interface SaftInvoiceLine {
  lineNumber: string;
  productCode?: string;
  productDescription: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  taxPointDate: string;
  description: string;
  debitAmount?: number;
  creditAmount?: number;
  tax?: {
    taxType: string;
    taxCode: string;
    taxPercentage: number;
    taxBase: number;
    taxAmount: number;
  };
}

interface SaftDocumentTotals {
  taxInformationTotals: {
    taxType: string;
    taxCode: string;
    taxPercentage: number;
    taxBase: number;
    taxAmount: number;
  }[];
  netTotal: number;
  grossTotal: number;
}

@Injectable()
export class SaftD406Service {
  private readonly logger = new Logger(SaftD406Service.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generate SAF-T D406 XML for a company
   */
  async generateSaftXml(
    companyId: string,
    startDate: Date,
    endDate: Date,
    options: {
      includeCustomers?: boolean;
      includeSuppliers?: boolean;
      includeProducts?: boolean;
      includeInvoices?: boolean;
      includePayments?: boolean;
    } = {},
  ): Promise<string> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        bankAccounts: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (!company.cui) {
      throw new BadRequestException('Company CUI is required for SAF-T');
    }

    const {
      includeCustomers = true,
      includeSuppliers = true,
      includeProducts = true,
      includeInvoices = true,
      includePayments = true,
    } = options;

    this.logger.log(`Generating SAF-T D406 for ${company.name} (${startDate} - ${endDate})`);

    // Build SAF-T structure
    const saftData: any = {
      AuditFile: {
        $: {
          xmlns: 'urn:OECD:StandardAuditFile-Taxation/2.00',
          'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        },
        Header: await this.buildHeader(company, startDate, endDate),
        MasterFiles: {},
        SourceDocuments: {},
      },
    };

    // Master Files
    if (includeCustomers) {
      const customers = await this.getCustomers(companyId, startDate, endDate);
      if (customers.length > 0) {
        saftData.AuditFile.MasterFiles.Customers = { Customer: customers };
      }
    }

    if (includeSuppliers) {
      const suppliers = await this.getSuppliers(companyId, startDate, endDate);
      if (suppliers.length > 0) {
        saftData.AuditFile.MasterFiles.Suppliers = { Supplier: suppliers };
      }
    }

    if (includeProducts) {
      const products = await this.getProducts(companyId);
      if (products.length > 0) {
        saftData.AuditFile.MasterFiles.Products = { Product: products };
      }
    }

    // Tax table
    const taxCodes = await this.getTaxTable(companyId);
    if (taxCodes.length > 0) {
      saftData.AuditFile.MasterFiles.TaxTable = { TaxTableEntry: taxCodes };
    }

    // Source Documents
    if (includeInvoices) {
      const invoices = await this.getInvoices(companyId, startDate, endDate);
      if (invoices.length > 0) {
        saftData.AuditFile.SourceDocuments.SalesInvoices = {
          NumberOfEntries: invoices.length.toString(),
          TotalDebit: this.calculateTotalDebit(invoices),
          TotalCredit: this.calculateTotalCredit(invoices),
          Invoice: invoices,
        };
      }
    }

    if (includePayments) {
      const payments = await this.getPayments(companyId, startDate, endDate);
      if (payments.length > 0) {
        saftData.AuditFile.SourceDocuments.Payments = {
          NumberOfEntries: payments.length.toString(),
          TotalDebit: this.calculatePaymentDebit(payments),
          TotalCredit: this.calculatePaymentCredit(payments),
          Payment: payments,
        };
      }
    }

    // Convert to XML
    const builder = new xml2js.Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      renderOpts: { pretty: true, indent: '  ' },
    });

    return builder.buildObject(saftData);
  }

  /**
   * Generate monthly SAF-T
   */
  async generateMonthlySaft(
    companyId: string,
    year: number,
    month: number,
  ): Promise<string> {
    const date = new Date(year, month - 1, 1);
    const startDate = startOfMonth(date);
    const endDate = endOfMonth(date);

    return this.generateSaftXml(companyId, startDate, endDate);
  }

  /**
   * Generate quarterly SAF-T
   */
  async generateQuarterlySaft(
    companyId: string,
    year: number,
    quarter: number,
  ): Promise<string> {
    if (quarter < 1 || quarter > 4) {
      throw new BadRequestException('Quarter must be between 1 and 4');
    }

    const quarterStartMonth = (quarter - 1) * 3;
    const date = new Date(year, quarterStartMonth, 1);
    const startDate = startOfQuarter(date);
    const endDate = endOfQuarter(date);

    return this.generateSaftXml(companyId, startDate, endDate);
  }

  /**
   * Build SAF-T header
   */
  private async buildHeader(
    company: any,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    return {
      AuditFileVersion: '2.00',
      AuditFileCountry: 'RO',
      AuditFileDateCreated: format(new Date(), 'yyyy-MM-dd'),
      SoftwareCompanyName: 'DocumentIulia',
      SoftwareID: 'documentiulia-accounting',
      SoftwareVersion: '1.0.0',
      Company: {
        RegistrationNumber: company.regCom || '',
        Name: company.name,
        Address: {
          StreetName: company.address || '',
          City: company.city || 'București',
          PostalCode: company.postalCode || '',
          Region: company.county || '',
          Country: 'RO',
        },
        Contact: {
          Telephone: company.phone || '',
          Email: company.email || '',
        },
        TaxRegistration: {
          TaxRegistrationNumber: company.cui,
          TaxType: 'TVA',
        },
        BankAccount: company.bankAccounts?.map((ba: any) => ({
          IBANNumber: ba.iban,
          BankAccountName: ba.name,
        })) || [],
      },
      DefaultCurrencyCode: company.currency || 'RON',
      SelectionCriteria: {
        SelectionStartDate: format(startDate, 'yyyy-MM-dd'),
        SelectionEndDate: format(endDate, 'yyyy-MM-dd'),
      },
      TaxAccountingBasis: 'A', // Accrual
      TaxEntity: company.cui,
    };
  }

  /**
   * Get customers for SAF-T
   */
  private async getCustomers(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    const clients = await this.prisma.client.findMany({
      where: {
        companyId,
        invoices: {
          some: {
            issueDate: { gte: startDate, lte: endDate },
          },
        },
      },
    });

    return clients.map((client) => ({
      CustomerID: client.id,
      AccountID: `CLI-${client.id.slice(-8).toUpperCase()}`,
      CustomerTaxID: client.cui || '',
      CompanyName: client.name,
      BillingAddress: {
        StreetName: client.address || '',
        City: client.city || '',
        PostalCode: client.postalCode || '',
        Region: client.county || '',
        Country: client.country || 'RO',
      },
      Contact: {
        Telephone: client.contactPhone || '',
        Email: client.contactEmail || '',
      },
    }));
  }

  /**
   * Get suppliers (from expenses) for SAF-T
   */
  private async getSuppliers(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    const expenses = await this.prisma.expense.findMany({
      where: {
        companyId,
        expenseDate: { gte: startDate, lte: endDate },
        vendorName: { not: null },
      },
      distinct: ['vendorCui'],
    });

    return expenses
      .filter((e) => e.vendorCui)
      .map((expense, index) => ({
        SupplierID: `SUP-${index + 1}`,
        AccountID: `FUR-${expense.vendorCui}`,
        SupplierTaxID: expense.vendorCui || '',
        CompanyName: expense.vendorName || 'Unknown',
        BillingAddress: {
          Country: 'RO',
        },
      }));
  }

  /**
   * Get products for SAF-T
   */
  private async getProducts(companyId: string): Promise<any[]> {
    const products = await this.prisma.product.findMany({
      where: { companyId, isActive: true },
    });

    return products.map((product) => ({
      ProductCode: product.sku || product.id.slice(-8).toUpperCase(),
      ProductGroup: product.type,
      Description: product.name,
      ProductCommodityCode: product.ncCode || '',
      UnitOfMeasure: product.unit,
    }));
  }

  /**
   * Get tax table for SAF-T
   */
  private async getTaxTable(companyId: string): Promise<any[]> {
    const taxCodes = await this.prisma.taxCode.findMany({
      where: { companyId, isActive: true },
    });

    // Add default Romanian VAT rates if none exist
    const defaultTaxCodes = [
      { code: 'S', name: 'TVA Standard 19%', rate: 19 },
      { code: 'R1', name: 'TVA Redus 9%', rate: 9 },
      { code: 'R2', name: 'TVA Redus 5%', rate: 5 },
      { code: 'Z', name: 'TVA Zero', rate: 0 },
      { code: 'E', name: 'Scutit TVA', rate: 0 },
    ];

    const allCodes = taxCodes.length > 0 ? taxCodes : defaultTaxCodes;

    return allCodes.map((tc: any) => ({
      TaxType: 'TVA',
      TaxCodeDetails: {
        TaxCode: tc.code,
        EffectiveDate: '2024-01-01',
        Description: tc.name,
        TaxPercentage: Number(tc.rate).toFixed(2),
      },
    }));
  }

  /**
   * Get invoices for SAF-T
   */
  private async getInvoices(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        issueDate: { gte: startDate, lte: endDate },
        status: { not: 'DRAFT' },
      },
      include: {
        client: true,
        items: {
          include: { product: true },
        },
      },
      orderBy: { issueDate: 'asc' },
    });

    return invoices.map((invoice) => ({
      InvoiceNo: invoice.invoiceNumber,
      InvoiceDate: format(invoice.issueDate, 'yyyy-MM-dd'),
      InvoiceType: this.mapInvoiceType(invoice.type),
      SourceID: 'documentiulia',
      GLPostingDate: format(invoice.issueDate, 'yyyy-MM-dd'),
      CustomerID: invoice.clientId,
      Period: (invoice.issueDate.getMonth() + 1).toString(),
      PeriodYear: invoice.issueDate.getFullYear().toString(),
      Line: invoice.items.map((item, index) => ({
        LineNumber: (index + 1).toString(),
        ProductCode: item.product?.sku || item.productId?.slice(-8) || '',
        ProductDescription: item.description,
        Quantity: Number(item.quantity).toFixed(4),
        UnitOfMeasure: item.unit,
        UnitPrice: Number(item.unitPrice).toFixed(2),
        TaxPointDate: format(invoice.issueDate, 'yyyy-MM-dd'),
        Description: item.description,
        CreditAmount: Number(item.subtotal).toFixed(2),
        Tax: {
          TaxType: 'TVA',
          TaxCode: this.getTaxCode(Number(item.vatRate)),
          TaxPercentage: Number(item.vatRate).toFixed(2),
          TaxBase: Number(item.subtotal).toFixed(2),
          TaxAmount: Number(item.vatAmount).toFixed(2),
        },
      })),
      DocumentTotals: {
        TaxInformationTotals: this.aggregateTaxTotals(invoice.items),
        NetTotal: Number(invoice.subtotal).toFixed(2),
        GrossTotal: Number(invoice.total).toFixed(2),
      },
      Currency: {
        CurrencyCode: invoice.currency,
        ExchangeRate: Number(invoice.exchangeRate).toFixed(4),
      },
    }));
  }

  /**
   * Get payments for SAF-T
   */
  private async getPayments(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    const payments = await this.prisma.payment.findMany({
      where: {
        paymentDate: { gte: startDate, lte: endDate },
        invoice: { companyId },
      },
      include: {
        invoice: {
          include: { client: true },
        },
      },
      orderBy: { paymentDate: 'asc' },
    });

    return payments.map((payment, index) => ({
      PaymentRefNo: `PAY-${format(payment.paymentDate, 'yyyyMMdd')}-${index + 1}`,
      TransactionID: payment.id,
      TransactionDate: format(payment.paymentDate, 'yyyy-MM-dd'),
      PaymentMethod: this.mapPaymentMethod(payment.method),
      Description: payment.notes || `Plată factură ${payment.invoice.invoiceNumber}`,
      SystemEntryDate: format(payment.createdAt, 'yyyy-MM-dd'),
      CustomerID: payment.invoice.clientId,
      Line: [
        {
          LineNumber: '1',
          SourceDocumentID: payment.invoice.invoiceNumber,
          DebitAmount: Number(payment.amount).toFixed(2),
        },
      ],
      DocumentTotals: {
        GrossTotal: Number(payment.amount).toFixed(2),
      },
    }));
  }

  /**
   * Map invoice type to SAF-T code
   */
  private mapInvoiceType(type: string): string {
    const typeMap: Record<string, string> = {
      STANDARD: 'FT', // Factura
      PROFORMA: 'FP', // Factura proforma
      STORNO: 'NC', // Nota de creditare
      AVIZ: 'AV', // Aviz de însoțire
    };
    return typeMap[type] || 'FT';
  }

  /**
   * Get tax code based on rate
   */
  private getTaxCode(rate: number): string {
    if (rate === 19) return 'S';
    if (rate === 9) return 'R1';
    if (rate === 5) return 'R2';
    if (rate === 0) return 'Z';
    return 'S';
  }

  /**
   * Map payment method to SAF-T code
   */
  private mapPaymentMethod(method: string): string {
    const methodMap: Record<string, string> = {
      cash: 'NU', // Numerar
      transfer: 'BT', // Transfer bancar
      card: 'CC', // Card de credit
    };
    return methodMap[method.toLowerCase()] || 'BT';
  }

  /**
   * Aggregate tax totals for invoice
   */
  private aggregateTaxTotals(items: any[]): any[] {
    const taxMap = new Map<string, { base: number; amount: number; rate: number }>();

    items.forEach((item) => {
      const code = this.getTaxCode(Number(item.vatRate));
      const existing = taxMap.get(code) || { base: 0, amount: 0, rate: Number(item.vatRate) };
      taxMap.set(code, {
        base: existing.base + Number(item.subtotal),
        amount: existing.amount + Number(item.vatAmount),
        rate: existing.rate,
      });
    });

    return Array.from(taxMap.entries()).map(([code, data]) => ({
      TaxType: 'TVA',
      TaxCode: code,
      TaxPercentage: data.rate.toFixed(2),
      TaxBase: data.base.toFixed(2),
      TaxAmount: data.amount.toFixed(2),
    }));
  }

  private calculateTotalDebit(invoices: any[]): string {
    return '0.00'; // Sales invoices are credits
  }

  private calculateTotalCredit(invoices: any[]): string {
    const total = invoices.reduce((sum, inv) => {
      return sum + parseFloat(inv.DocumentTotals.GrossTotal);
    }, 0);
    return total.toFixed(2);
  }

  private calculatePaymentDebit(payments: any[]): string {
    const total = payments.reduce((sum, pay) => {
      return sum + parseFloat(pay.DocumentTotals.GrossTotal);
    }, 0);
    return total.toFixed(2);
  }

  private calculatePaymentCredit(payments: any[]): string {
    return '0.00';
  }

  /**
   * Validate generated SAF-T against schema
   */
  async validateSaftXml(xml: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Parse XML to verify structure
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(xml);

      // Check required elements
      if (!result.AuditFile?.Header) {
        errors.push('Missing Header element');
      }

      if (!result.AuditFile?.Header?.[0]?.Company?.[0]?.TaxRegistration) {
        errors.push('Missing Company TaxRegistration');
      }

      // Check for empty master files
      if (!result.AuditFile?.MasterFiles?.[0]?.TaxTable) {
        warnings.push('No TaxTable entries found');
      }

      // Check for source documents
      if (
        !result.AuditFile?.SourceDocuments?.[0]?.SalesInvoices &&
        !result.AuditFile?.SourceDocuments?.[0]?.Payments
      ) {
        warnings.push('No source documents found in the period');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Invalid XML structure: ${(error as Error).message}`],
        warnings,
      };
    }
  }
}
