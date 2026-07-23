import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import { SpvService } from './spv.service';
import { AccountingService, JournalEntry, TrialBalanceRow } from '../accounting/accounting.service';
import { ROMANIAN_CHART_OF_ACCOUNTS, saftAccountType } from '../accounting/romanian-chart-of-accounts';
import * as crypto from 'crypto';

/**
 * Format date as YYYY-MM-DD using local timezone to avoid UTC conversion issues
 * This ensures dates like 2025-01-01 don't become 2024-12-31 due to timezone offset
 */
function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * SAFT-001: SAF-T D406 Monthly XML Generation Service
 * Per Order 1783/2021 - Monthly submission starting Jan 2025
 *
 * Key Requirements:
 * - Header with company identification (CUI, CAEN, address)
 * - MasterFiles: GeneralLedgerAccounts, Customers, Suppliers, TaxTable
 * - SourceDocuments: SalesInvoices, PurchaseInvoices
 * - GeneralLedgerEntries (optional but recommended)
 * - File size < 500MB
 * - UTF-8 encoding
 */

// Detailed interfaces for D406 structure
export interface D406Header {
  auditFileVersion: string;
  auditFileCountry: string;
  auditFileDateCreated: string;
  softwareCompanyName: string;
  softwareId: string;
  softwareVersion: string;
  company: D406Company;
  defaultCurrencyCode: string;
  selectionCriteria: D406SelectionCriteria;
  headerComment?: string;
  taxAccountingBasis: 'A' | 'C' | 'I' | 'K' | 'O'; // Accrual, Cash, Invoice, etc.
  taxEntity?: string;
}

export interface D406Company {
  registrationNumber: string; // CUI
  name: string;
  address: D406Address;
  contact?: D406Contact;
  taxRegistration?: D406TaxRegistration[];
  bankAccount?: D406BankAccount[];
}

export interface D406Address {
  streetName?: string;
  number?: string;
  building?: string;
  city?: string;
  postalCode?: string;
  region?: string;
  country: string;
  addressDetail?: string;
}

export interface D406Contact {
  contactPerson?: {
    title?: string;
    firstName?: string;
    lastName?: string;
  };
  telephone?: string;
  fax?: string;
  email?: string;
  website?: string;
}

export interface D406TaxRegistration {
  taxRegistrationNumber: string;
  taxType: string;
  taxNumber?: string;
  taxAuthority?: string;
}

export interface D406BankAccount {
  bankAccountNumber: string;
  bankAccountName?: string;
  sortCode?: string;
  bic?: string;
  currencyCode?: string;
}

export interface D406SelectionCriteria {
  selectionStartDate: string;
  selectionEndDate: string;
  periodStart?: string;
  periodEnd?: string;
  periodStartYear?: string;
  periodStartMonth?: string;
  periodEndYear?: string;
  periodEndMonth?: string;
}

export interface D406GenerationResult {
  success: boolean;
  xml?: string;
  xmlSize: number;
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  summary: {
    invoicesCount: number;
    customersCount: number;
    suppliersCount: number;
    totalSales: number;
    totalPurchases: number;
    totalVATCollected: number;
    totalVATDeductible: number;
    vatBalance: number;
  };
  hash: string;
  period: string;
  generatedAt: Date;
}

export interface D406SubmissionResult {
  success: boolean;
  reference?: string;
  submissionId?: string;
  status: 'pending' | 'submitted' | 'accepted' | 'rejected' | 'error';
  errors?: string[];
  submittedAt?: Date;
  estimatedProcessingTime?: string;
}

@Injectable()
export class SaftD406MonthlyService {
  private readonly logger = new Logger(SaftD406MonthlyService.name);
  private xmlBuilder: XMLBuilder;
  private xmlParser: XMLParser;

  // ANAF namespace for SAF-T RO 2.0
  private readonly NS = 'urn:OECD:StandardAuditFile-Taxation/RO_2.0';
  private readonly XSI = 'http://www.w3.org/2001/XMLSchema-instance';

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private spvService: SpvService,
    private accountingService: AccountingService,
  ) {
    this.xmlBuilder = new XMLBuilder({
      ignoreAttributes: false,
      format: true,
      indentBy: '  ',
      suppressEmptyNode: true,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      processEntities: true,
    });

    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
  }

  /**
   * Generate SAF-T D406 Monthly XML per Order 1783/2021
   * Complete implementation with all required sections
   */
  async generateMonthlyD406(userId: string, period: string): Promise<D406GenerationResult> {
    const startTime = Date.now();
    this.logger.log(`Starting D406 generation for user ${userId}, period ${period}`);

    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Fetch all required data in parallel
      const [user, invoices, payments, products, employees, payrolls, orgMembership, journalEntries, trialBalance] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: userId } }),
        this.prisma.invoice.findMany({
          where: {
            userId,
            invoiceDate: { gte: startDate, lte: endDate },
          },
          orderBy: { invoiceDate: 'asc' },
        }),
        this.prisma.payment.findMany({
          where: {
            invoice: { userId },
            paymentDate: { gte: startDate, lte: endDate },
          },
        }),
        // Products are not stored in the database - omitted from SAF-T
        Promise.resolve([]),
        this.prisma.employee.findMany({
          where: { userId },
        }),
        this.prisma.payroll.findMany({
          where: {
            employee: { userId },
            period,
          },
          include: { employee: true },
        }),
        this.prisma.organizationMember.findFirst({
          where: { userId, isActive: true },
          include: { organization: true },
        }),
        this.accountingService.getJournalEntries(userId, { startDate, endDate }),
        this.accountingService.getTrialBalance(userId, { startDate, endDate }),
      ]);

      // Company profile: Organization is authoritative (has full address/bank
      // data); User fields are the standalone-mode fallback.
      const org = orgMembership?.organization;
      const companyProfile = {
        cui: org?.cui || user?.cui,
        company: org?.name || user?.company,
        address: org?.address || user?.address,
        city: org?.city || (user as any)?.city,
        postalCode: org?.postalCode || (user as any)?.postalCode,
        county: org?.county || (user as any)?.county,
        phone: org?.phone || (user as any)?.phone,
        email: org?.email || user?.email,
        website: org?.website || (user as any)?.website,
        iban: org?.bankAccount || (user as any)?.iban,
        bankName: org?.bankName || (user as any)?.bankName,
      };

      // Validate required company data
      if (!user) {
        errors.push('E001: Utilizator inexistent');
        return this.createErrorResult(period, errors);
      }

      if (!companyProfile.cui) {
        errors.push('E002: CUI/CIF lipsă - obligatoriu pentru SAF-T D406');
      }

      if (!companyProfile.company) {
        errors.push('E003: Denumire companie lipsă');
      }

      if (errors.length > 0) {
        return this.createErrorResult(period, errors);
      }

      // Separate sales and purchase invoices
      const salesInvoices = invoices.filter((i: any) => i.type === 'ISSUED');
      const purchaseInvoices = invoices.filter((i: any) => i.type === 'RECEIVED');

      // Build unique customers and suppliers
      const customersMap = new Map<string, any>();
      const suppliersMap = new Map<string, any>();

      for (const inv of salesInvoices) {
        if (inv.partnerCui && !customersMap.has(inv.partnerCui)) {
          customersMap.set(inv.partnerCui, {
            id: inv.partnerCui,
            name: inv.partnerName || 'Necunoscut',
            address: inv.partnerAddress,
          });
        }
      }

      for (const inv of purchaseInvoices) {
        if (inv.partnerCui && !suppliersMap.has(inv.partnerCui)) {
          suppliersMap.set(inv.partnerCui, {
            id: inv.partnerCui,
            name: inv.partnerName || 'Necunoscut',
            address: inv.partnerAddress,
          });
        }
      }

      // Calculate totals
      const totalSales = salesInvoices.reduce((sum: number, i: any) => sum + Number(i.grossAmount || 0), 0);
      const totalPurchases = purchaseInvoices.reduce((sum: number, i: any) => sum + Number(i.grossAmount || 0), 0);
      const totalVATCollected = salesInvoices.reduce((sum: number, i: any) => sum + Number(i.vatAmount || 0), 0);
      const totalVATDeductible = purchaseInvoices.reduce((sum: number, i: any) => sum + Number(i.vatAmount || 0), 0);

      // Build complete SAF-T D406 structure
      const saftData = this.buildD406Structure({
        user,
        companyProfile,
        journalEntries,
        trialBalance,
        period,
        startDate,
        endDate,
        salesInvoices,
        purchaseInvoices,
        customers: Array.from(customersMap.values()),
        suppliers: Array.from(suppliersMap.values()),
        products,
        payments,
        employees,
        payrolls,
      });

      // Generate XML with declaration header (per SAF-T RO 2.0 standard)
      const xmlContent = this.xmlBuilder.build(saftData);
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${xmlContent}`;

      // Validate XML size (must be < 500MB per ANAF)
      const xmlSize = Buffer.byteLength(xml, 'utf8');
      if (xmlSize > 500 * 1024 * 1024) {
        errors.push(`E100: Fișier XML prea mare (${(xmlSize / 1024 / 1024).toFixed(2)} MB). Limită ANAF: 500MB`);
      }

      // Generate hash for integrity
      const hash = crypto.createHash('sha256').update(xml).digest('hex');

      // Validate invoice sequences
      const invoiceWarnings = this.validateInvoiceSequences(salesInvoices);
      warnings.push(...invoiceWarnings);

      // Store the report
      await this.prisma.sAFTReport.upsert({
        where: {
          userId_period: { userId, period },
        },
        update: {
          xmlUrl: null,
          status: 'DRAFT',
          reportType: 'D406_MONTHLY',
        },
        create: {
          userId,
          period,
          reportType: 'D406_MONTHLY',
          status: 'DRAFT',
        },
      });

      const duration = Date.now() - startTime;
      this.logger.log(`D406 generated in ${duration}ms for period ${period}`);

      return {
        success: errors.length === 0,
        xml,
        xmlSize,
        validation: {
          valid: errors.length === 0,
          errors,
          warnings,
        },
        summary: {
          invoicesCount: invoices.length,
          customersCount: customersMap.size,
          suppliersCount: suppliersMap.size,
          totalSales: Math.round(totalSales * 100) / 100,
          totalPurchases: Math.round(totalPurchases * 100) / 100,
          totalVATCollected: Math.round(totalVATCollected * 100) / 100,
          totalVATDeductible: Math.round(totalVATDeductible * 100) / 100,
          vatBalance: Math.round((totalVATCollected - totalVATDeductible) * 100) / 100,
        },
        hash,
        period,
        generatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`D406 generation failed: ${error.message}`, error.stack);
      errors.push(`E999: Eroare internă - ${error.message}`);
      return this.createErrorResult(period, errors);
    }
  }

  /**
   * Build complete D406 XML structure per Order 1783/2021
   */
  private buildD406Structure(data: {
    user: any;
    companyProfile: any;
    journalEntries: JournalEntry[];
    trialBalance: TrialBalanceRow[];
    period: string;
    startDate: Date;
    endDate: Date;
    salesInvoices: any[];
    purchaseInvoices: any[];
    customers: any[];
    suppliers: any[];
    products: any[];
    payments: any[];
    employees: any[];
    payrolls: any[];
  }): any {
    const { user, companyProfile, journalEntries, trialBalance, period, startDate, endDate, salesInvoices, purchaseInvoices, customers, suppliers, products, payments, employees, payrolls } = data;

    return {
      'n1:AuditFile': {
        '@_xmlns:n1': this.NS,
        '@_xmlns:xsi': this.XSI,
        '@_xsi:schemaLocation': `${this.NS} SAF-T_RO_2.0.xsd`,

        // Header Section
        'n1:Header': {
          'n1:AuditFileVersion': '2.0',
          'n1:AuditFileCountry': 'RO',
          'n1:AuditFileDateCreated': formatLocalDate(new Date()),
          'n1:SoftwareCompanyName': 'DocumentIulia.ro',
          'n1:SoftwareID': 'DOCUMENTIULIA-ERP-V1',
          'n1:SoftwareVersion': '1.0.0',
          'n1:Company': this.buildCompanyInfo(companyProfile),
          'n1:DefaultCurrencyCode': 'RON',
          'n1:SelectionCriteria': {
            'n1:SelectionStartDate': formatLocalDate(startDate),
            'n1:SelectionEndDate': formatLocalDate(endDate),
            'n1:PeriodStart': period,
            'n1:PeriodEnd': period,
          },
          'n1:TaxAccountingBasis': 'A', // Accrual basis
          'n1:HeaderComment': `SAF-T D406 generat pentru perioada ${period} conform Ordinului 1783/2021`,
        },

        // MasterFiles Section
        'n1:MasterFiles': {
          'n1:GeneralLedgerAccounts': this.buildGeneralLedgerAccounts(trialBalance),
          'n1:Customers': this.buildCustomers(customers),
          'n1:Suppliers': this.buildSuppliers(suppliers),
          'n1:TaxTable': this.buildTaxTable(period, [...salesInvoices, ...purchaseInvoices]),
          'n1:Products': this.buildProducts(products),
          ...(employees.length > 0 ? { 'n1:Owners': this.buildOwners(user) } : {}),
        },

        // GeneralLedgerEntries Section (recommended)
        'n1:GeneralLedgerEntries': this.buildGeneralLedgerEntries(journalEntries, period),

        // SourceDocuments Section
        'n1:SourceDocuments': {
          'n1:SalesInvoices': this.buildSalesInvoices(salesInvoices),
          'n1:PurchaseInvoices': this.buildPurchaseInvoices(purchaseInvoices),
          'n1:Payments': this.buildPayments(payments),
        },
      },
    };
  }

  /**
   * Build company information for Header
   */
  private buildCompanyInfo(user: any): any {
    return {
      'n1:RegistrationNumber': user.cui || '',
      'n1:Name': user.company || '',
      'n1:Address': {
        'n1:StreetName': user.address?.split(',')[0] || '',
        'n1:City': user.city || '',
        'n1:PostalCode': user.postalCode || '',
        'n1:Region': user.county || '',
        'n1:Country': 'RO',
        'n1:AddressDetail': user.address || '',
      },
      'n1:Contact': {
        'n1:Telephone': user.phone || '',
        'n1:Email': user.email || '',
        'n1:Website': user.website || 'https://documentiulia.ro',
      },
      'n1:TaxRegistration': {
        'n1:TaxRegistrationNumber': user.cui || '',
        'n1:TaxType': 'TVA',
        'n1:TaxAuthority': 'ANAF',
      },
      'n1:BankAccount': user.iban ? {
        'n1:IBANNumber': user.iban,
        'n1:BankAccountName': user.bankName || '',
        'n1:CurrencyCode': 'RON',
      } : undefined,
    };
  }

  /**
   * Build Romanian Chart of Accounts (Planul de Conturi General - PCG)
   */
  private buildGeneralLedgerAccounts(trialBalance: TrialBalanceRow[]): any {
    // Shared OMFP 1802 chart (single source with the accounting module) merged
    // with the period trial balance so D406 ties out with accounting reports.
    const balanceByCode = new Map(trialBalance.map((r) => [r.accountCode, r]));

    return {
      'n1:Account': ROMANIAN_CHART_OF_ACCOUNTS.map((acc) => {
        const bal = balanceByCode.get(acc.code);
        return {
          'n1:AccountID': acc.code,
          'n1:AccountDescription': acc.name,
          'n1:StandardAccountID': acc.code,
          'n1:AccountType': saftAccountType(acc.type),
          'n1:OpeningDebitBalance': (bal?.openingDebit ?? 0).toFixed(2),
          'n1:ClosingDebitBalance': (bal?.closingDebit ?? 0).toFixed(2),
          'n1:OpeningCreditBalance': (bal?.openingCredit ?? 0).toFixed(2),
          'n1:ClosingCreditBalance': (bal?.closingCredit ?? 0).toFixed(2),
        };
      }),
    };
  }

  /**
   * Build Customers section for MasterFiles
   */
  private buildCustomers(customers: any[]): any {
    if (customers.length === 0) {
      return { 'n1:NumberOfEntries': '0' };
    }

    return {
      'n1:NumberOfEntries': customers.length.toString(),
      'n1:Customer': customers.map((c) => ({
        'n1:CustomerID': c.id,
        'n1:AccountID': '4111',
        'n1:CustomerTaxID': c.id,
        'n1:CompanyName': c.name,
        'n1:Contact': {},
        'n1:BillingAddress': {
          'n1:AddressDetail': c.address || '',
          'n1:City': '',
          'n1:Country': 'RO',
        },
        'n1:SelfBillingIndicator': '0',
      })),
    };
  }

  /**
   * Build Suppliers section for MasterFiles
   */
  private buildSuppliers(suppliers: any[]): any {
    if (suppliers.length === 0) {
      return { 'n1:NumberOfEntries': '0' };
    }

    return {
      'n1:NumberOfEntries': suppliers.length.toString(),
      'n1:Supplier': suppliers.map((s) => ({
        'n1:SupplierID': s.id,
        'n1:AccountID': '401',
        'n1:SupplierTaxID': s.id,
        'n1:CompanyName': s.name,
        'n1:Contact': {},
        'n1:BillingAddress': {
          'n1:AddressDetail': s.address || '',
          'n1:City': '',
          'n1:Country': 'RO',
        },
        'n1:SelfBillingIndicator': '0',
      })),
    };
  }

  /**
   * Build Tax Table per Legea 141/2025
   */
  private buildTaxTable(period: string, invoices: any[] = []): any {
    const entry = (code: string, description: string, pct: string) => ({
      'n1:TaxType': 'TVA',
      'n1:TaxCode': code,
      'n1:TaxCodeDetails': {
        'n1:TaxCode': code,
        'n1:Description': description,
        'n1:TaxPercentage': pct,
        'n1:Country': 'RO',
        'n1:StandardTaxCode': code,
        'n1:BaseRate': '100.00',
        'n1:FlatTaxRate': {},
      },
    });

    // Legea 141/2025: standard 21% / reduced 11% from Aug 2025; earlier
    // periods (and transition months containing old-rate invoices) also need
    // the historical 19% / 9% codes.
    const preLegea141 = period < '2025-08';
    const ratesUsed = new Set(invoices.map((i) => Number(i.vatRate)));
    const entries = [
      entry('S', 'TVA standard 21% - Legea 141/2025', '21.00'),
      entry('R1', 'TVA redus 11% - alimente/medicamente - Legea 141/2025', '11.00'),
      entry('R2', 'TVA redus 5% - locuinte sociale', '5.00'),
      entry('Z', 'TVA 0% - export/intracomunitar', '0.00'),
      entry('E', 'Scutit de TVA', '0.00'),
    ];
    if (preLegea141 || ratesUsed.has(19)) {
      entries.push(entry('S19', 'TVA standard 19% (istoric, pana la 31.07.2025)', '19.00'));
    }
    if (preLegea141 || ratesUsed.has(9)) {
      entries.push(entry('R9', 'TVA redus 9% (istoric, pana la 31.07.2025)', '9.00'));
    }

    return { 'n1:TaxTableEntry': entries };
  }

  /**
   * Build Products section for MasterFiles
   */
  private buildProducts(products: any[]): any {
    if (products.length === 0) {
      return undefined;
    }

    return {
      'n1:Product': products.slice(0, 1000).map((p) => ({ // Limit to 1000 products
        'n1:ProductCode': p.code || p.id,
        'n1:ProductGroup': p.category || 'General',
        'n1:Description': p.name || '',
        'n1:ProductCommodityCode': p.ncCode || '',
        'n1:UOMBase': p.unit || 'BUC',
        'n1:UOMStandard': p.unit || 'BUC',
      })),
    };
  }

  /**
   * Build Owners section
   */
  private buildOwners(user: any): any {
    return {
      'n1:Owner': {
        'n1:OwnerID': user.id,
        'n1:AccountID': '456',
        'n1:OwnerName': user.name || user.company,
      },
    };
  }

  /**
   * Build General Ledger Entries (Journal entries)
   */
  private buildGeneralLedgerEntries(journalEntries: JournalEntry[], period: string): any {
    // Double-entry journal synthesized by AccountingService (411/70x/4427 for
    // sales, 6xx/4426/401 for purchases, 5121/411 for receipts) — the same
    // source as the trial balance, so the D406 ledger is balanced and ties out.
    const posted = journalEntries.filter((e) => e.status === 'POSTED');

    let totalDebit = 0;
    let totalCredit = 0;
    const transactions = posted.map((entry) => {
      const lines = entry.lines.map((line, idx) => {
        totalDebit += line.debit;
        totalCredit += line.credit;
        return {
          'n1:RecordID': `${entry.id}-${idx + 1}`,
          'n1:AccountID': line.accountCode,
          'n1:Description': line.description || entry.description,
          ...(line.debit > 0
            ? { 'n1:DebitAmount': { 'n1:Amount': line.debit.toFixed(2) } }
            : { 'n1:CreditAmount': { 'n1:Amount': line.credit.toFixed(2) } }),
        };
      });
      return {
        'n1:TransactionID': entry.id,
        'n1:Period': period.split('-')[1],
        'n1:PeriodYear': period.split('-')[0],
        'n1:TransactionDate': entry.date?.toISOString?.().split('T')[0] || `${period}-01`,
        'n1:Description': entry.description,
        'n1:SystemEntryDate': entry.createdAt?.toISOString?.().split('T')[0] || `${period}-01`,
        'n1:GLPostingDate': entry.date?.toISOString?.().split('T')[0] || `${period}-01`,
        'n1:Line': lines,
      };
    });

    return {
      'n1:NumberOfEntries': posted.length.toString(),
      'n1:TotalDebit': totalDebit.toFixed(2),
      'n1:TotalCredit': totalCredit.toFixed(2),
      'n1:Journal': posted.length > 0 ? {
        'n1:JournalID': 'GEN',
        'n1:Description': `Registru jurnal ${period}`,
        'n1:Type': 'GEN',
        'n1:Transaction': transactions.slice(0, 10000),
      } : undefined,
    };
  }

  /**
   * Build Sales Invoices section
   */
  private buildSalesInvoices(invoices: any[]): any {
    const totalDebit = 0;
    const totalCredit = invoices.reduce((sum, i) => sum + Number(i.grossAmount || 0), 0);

    return {
      'n1:NumberOfEntries': invoices.length.toString(),
      'n1:TotalDebit': totalDebit.toFixed(2),
      'n1:TotalCredit': totalCredit.toFixed(2),
      'n1:Invoice': invoices.map((inv) => this.buildInvoice(inv, 'sales')),
    };
  }

  /**
   * Build Purchase Invoices section
   */
  private buildPurchaseInvoices(invoices: any[]): any {
    const totalDebit = invoices.reduce((sum, i) => sum + Number(i.grossAmount || 0), 0);
    const totalCredit = 0;

    return {
      'n1:NumberOfEntries': invoices.length.toString(),
      'n1:TotalDebit': totalDebit.toFixed(2),
      'n1:TotalCredit': totalCredit.toFixed(2),
      'n1:Invoice': invoices.map((inv) => this.buildInvoice(inv, 'purchase')),
    };
  }

  /**
   * Build individual invoice
   */
  private buildInvoice(inv: any, type: 'sales' | 'purchase'): any {
    const netAmount = Number(inv.netAmount || 0);
    const vatAmount = Number(inv.vatAmount || 0);
    const grossAmount = Number(inv.grossAmount || 0);

    // Determine VAT rate
    let vatCode = 'S'; // Standard 21%
    const vatRate = vatAmount > 0 && netAmount > 0 ? (vatAmount / netAmount) * 100 : 0;
    if (vatRate < 1) vatCode = 'Z';
    else if (vatRate >= 4 && vatRate <= 6) vatCode = 'R2';
    else if (vatRate >= 10 && vatRate <= 12) vatCode = 'R1';

    return {
      'n1:InvoiceNo': inv.invoiceNumber || inv.id,
      'n1:ATCUD': '', // Optional: unique document code
      'n1:CustomerInfo': type === 'sales' ? {
        'n1:CustomerID': inv.partnerCui || '',
        'n1:BillingAddress': {
          'n1:AddressDetail': inv.partnerAddress || '',
          'n1:City': '',
          'n1:Country': 'RO',
        },
      } : undefined,
      'n1:SupplierInfo': type === 'purchase' ? {
        'n1:SupplierID': inv.partnerCui || '',
        'n1:BillingAddress': {
          'n1:AddressDetail': inv.partnerAddress || '',
          'n1:City': '',
          'n1:Country': 'RO',
        },
      } : undefined,
      'n1:Period': inv.invoiceDate?.toISOString().slice(0, 7) || '',
      'n1:InvoiceDate': inv.invoiceDate?.toISOString().split('T')[0] || '',
      'n1:InvoiceType': this.getInvoiceType(inv),
      'n1:SpecialRegimes': {},
      'n1:SourceID': 'DocumentIulia-ERP',
      'n1:GLPostingDate': inv.invoiceDate?.toISOString().split('T')[0] || '',
      'n1:TransactionID': inv.id,
      'n1:SystemEntryDate': inv.createdAt?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
      'n1:Line': {
        'n1:LineNumber': '1',
        'n1:AccountID': type === 'sales' ? '4111' : '401',
        'n1:OrderReferences': {},
        'n1:ProductCode': '',
        'n1:ProductDescription': inv.description || 'Servicii/Produse',
        'n1:Quantity': '1',
        'n1:UnitOfMeasure': 'BUC',
        'n1:UnitPrice': netAmount.toFixed(2),
        'n1:TaxPointDate': inv.invoiceDate?.toISOString().split('T')[0] || '',
        'n1:References': {},
        'n1:Description': inv.description || '',
        ...(type === 'sales'
          ? {
              'n1:CreditAmount': {
                'n1:Amount': grossAmount.toFixed(2),
                'n1:CurrencyCode': inv.currency || 'RON',
              },
            }
          : {
              'n1:DebitAmount': {
                'n1:Amount': grossAmount.toFixed(2),
                'n1:CurrencyCode': inv.currency || 'RON',
              },
            }),
        'n1:Tax': {
          'n1:TaxType': 'TVA',
          'n1:TaxCode': vatCode,
          'n1:TaxPercentage': vatRate.toFixed(2),
          'n1:TaxBase': netAmount.toFixed(2),
          'n1:TaxAmount': {
            'n1:Amount': vatAmount.toFixed(2),
            'n1:CurrencyCode': inv.currency || 'RON',
          },
        },
        'n1:SettlementAmount': {},
      },
      'n1:DocumentTotals': {
        'n1:TaxPayable': vatAmount.toFixed(2),
        'n1:NetTotal': netAmount.toFixed(2),
        'n1:GrossTotal': grossAmount.toFixed(2),
        'n1:Currency': {
          'n1:CurrencyCode': inv.currency || 'RON',
          'n1:CurrencyAmount': grossAmount.toFixed(2),
          'n1:ExchangeRate': '1.0000',
        },
      },
    };
  }

  /**
   * Build Payments section
   */
  private buildPayments(payments: any[]): any {
    if (payments.length === 0) {
      return {
        'n1:NumberOfEntries': '0',
        'n1:TotalDebit': '0.00',
        'n1:TotalCredit': '0.00',
      };
    }

    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    return {
      'n1:NumberOfEntries': payments.length.toString(),
      'n1:TotalDebit': totalAmount.toFixed(2),
      'n1:TotalCredit': totalAmount.toFixed(2),
      'n1:Payment': payments.map((p) => ({
        'n1:PaymentRefNo': p.reference || p.id,
        'n1:Period': p.paymentDate?.toISOString().slice(0, 7) || '',
        'n1:TransactionID': p.id,
        'n1:TransactionDate': p.paymentDate?.toISOString().split('T')[0] || '',
        'n1:PaymentType': this.getPaymentType(p),
        'n1:Description': p.description || 'Plată',
        'n1:SystemID': 'DocumentIulia-ERP',
        'n1:DocumentTotals': {
          'n1:TaxPayable': '0.00',
          'n1:NetTotal': Number(p.amount || 0).toFixed(2),
          'n1:GrossTotal': Number(p.amount || 0).toFixed(2),
          'n1:Currency': {
            'n1:CurrencyCode': p.currency || 'RON',
          },
        },
        'n1:Line': {
          'n1:LineNumber': '1',
          'n1:AccountID': p.type === 'CASH' ? '5311' : '5121',
          'n1:SourceDocumentID': p.invoiceId || '',
          'n1:DebitAmount': {
            'n1:Amount': Number(p.amount || 0).toFixed(2),
          },
        },
      })),
    };
  }

  /**
   * Get invoice type code per SAF-T RO
   */
  private getInvoiceType(inv: any): string {
    if (inv.isCreditNote) return 'NC'; // Nota de credit
    if (inv.isDebitNote) return 'ND'; // Nota de debit
    if (inv.isProforma) return 'FP'; // Factura proforma
    return 'FT'; // Factura standard
  }

  /**
   * Get payment type code
   */
  private getPaymentType(payment: any): string {
    const type = payment.method || payment.type || '';
    if (type === 'CASH' || type === 'cash') return 'RC'; // Numerar
    if (type === 'CARD') return 'CC'; // Card
    return 'TB'; // Transfer bancar
  }

  /**
   * Validate invoice number sequences for warnings
   */
  private validateInvoiceSequences(invoices: any[]): string[] {
    const warnings: string[] = [];

    const invoiceNumbers = invoices
      .map((i) => {
        const match = i.invoiceNumber?.match(/(\d+)$/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((n) => n !== null)
      .sort((a, b) => a! - b!);

    for (let i = 1; i < invoiceNumbers.length; i++) {
      const gap = invoiceNumbers[i]! - invoiceNumbers[i - 1]!;
      if (gap > 1) {
        warnings.push(`W020: Posibilă lipsă în seria de facturi între ${invoiceNumbers[i - 1]} și ${invoiceNumbers[i]}`);
      }
    }

    return warnings;
  }

  /**
   * Create error result
   */
  private createErrorResult(period: string, errors: string[]): D406GenerationResult {
    return {
      success: false,
      xmlSize: 0,
      validation: {
        valid: false,
        errors,
        warnings: [],
      },
      summary: {
        invoicesCount: 0,
        customersCount: 0,
        suppliersCount: 0,
        totalSales: 0,
        totalPurchases: 0,
        totalVATCollected: 0,
        totalVATDeductible: 0,
        vatBalance: 0,
      },
      hash: '',
      period,
      generatedAt: new Date(),
    };
  }

  /**
   * SAFT-002: Submit SAF-T D406 to ANAF via SPV API
   */
  async submitToANAF(userId: string, period: string): Promise<D406SubmissionResult> {
    this.logger.log(`Starting D406 submission for user ${userId}, period ${period}`);

    try {
      // First generate the XML
      const result = await this.generateMonthlyD406(userId, period);

      if (!result.success || !result.xml) {
        return {
          success: false,
          status: 'error',
          errors: result.validation.errors,
        };
      }

      // Get user's CUI
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user?.cui) {
        return {
          success: false,
          status: 'error',
          errors: ['CUI lipsă - nu se poate face depunerea'],
        };
      }

      // Submit via SPV service
      const submission = await this.spvService.submitSaft(userId, result.xml, user.cui, period);

      // Update SAF-T report status
      await this.prisma.sAFTReport.update({
        where: {
          userId_period: { userId, period },
        },
        data: {
          status: 'SUBMITTED',
          submittedAt: new Date(),
          spvRef: submission.reference,
        },
      });

      this.logger.log(`D406 submitted successfully: ${submission.reference}`);

      return {
        success: true,
        reference: submission.reference,
        submissionId: submission.submissionId,
        status: 'pending',
        submittedAt: new Date(),
        estimatedProcessingTime: '24-48 ore',
      };
    } catch (error) {
      this.logger.error(`D406 submission failed: ${error.message}`, error.stack);

      return {
        success: false,
        status: 'error',
        errors: [error.message],
      };
    }
  }

  /**
   * Preview XML (formatted for display)
   */
  async previewXML(userId: string, period: string): Promise<{ xml: string; formatted: string }> {
    const result = await this.generateMonthlyD406(userId, period);

    if (!result.xml) {
      throw new Error('Failed to generate XML');
    }

    // Parse and re-format with better indentation
    const formatted = result.xml
      .replace(/></g, '>\n<')
      .split('\n')
      .map((line, i) => {
        const indent = (line.match(/^<\//) ? -1 : line.match(/\/>$/) ? 0 : line.match(/^<[^\/]/) ? 1 : 0);
        return line;
      })
      .join('\n');

    return {
      xml: result.xml,
      formatted,
    };
  }

  /**
   * Get submission status from ANAF
   */
  async getSubmissionStatus(userId: string, reference: string): Promise<{
    status: string;
    anafStatus?: string;
    errors?: string[];
    completedAt?: Date;
  }> {
    const submission = await this.prisma.spvSubmission.findFirst({
      where: { userId, uploadIndex: reference },
    });

    if (!submission) {
      return { status: 'not_found' };
    }

    return {
      status: submission.status,
      anafStatus: submission.anafStatus || undefined,
      errors: submission.errorMessage ? JSON.parse(submission.errorMessage) : undefined,
      completedAt: submission.completedAt || undefined,
    };
  }

  /**
   * Get all D406 reports for a user
   */
  async getReports(userId: string, year?: number): Promise<any[]> {
    const where: any = { userId, reportType: { contains: 'D406' } };

    if (year) {
      where.period = { startsWith: year.toString() };
    }

    return this.prisma.sAFTReport.findMany({
      where,
      orderBy: { period: 'desc' },
    });
  }
}
