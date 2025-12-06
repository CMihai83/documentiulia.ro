import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { XMLBuilder } from 'fast-xml-parser';

// SAF-T D406 Service - Order 1783/2021
// Monthly XML submission from Jan 2025 (small/non-residents)
// Pilot Sept 2025 - Aug 2026 with 6-month grace period

interface SAFTHeader {
  fiscalYear: string;
  period: string;
  companyName: string;
  cui: string;
  address: string;
}

interface SAFTData {
  header: SAFTHeader;
  invoices: any[];
  payments: any[];
  inventory?: any[];
}

@Injectable()
export class SaftService {
  private readonly logger = new Logger(SaftService.name);
  private xmlBuilder: XMLBuilder;

  constructor(private prisma: PrismaService) {
    this.xmlBuilder = new XMLBuilder({
      ignoreAttributes: false,
      format: true,
      indentBy: '  ',
    });
  }

  // Generate SAF-T D406 XML per Order 1783/2021
  async generateD406(userId: string, period: string): Promise<string> {
    const [year, month] = period.split('-');

    // Fetch user and company data
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // Fetch invoices for the period
    const startDate = new Date(`${year}-${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        invoiceDate: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    // Build SAF-T XML structure
    const saftData = {
      'n1:AuditFile': {
        '@_xmlns:n1': 'urn:OECD:StandardAuditFile-Taxation/RO_2.0',
        '@_xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        'n1:Header': {
          'n1:AuditFileVersion': '2.0',
          'n1:AuditFileCountry': 'RO',
          'n1:AuditFileDateCreated': new Date().toISOString().split('T')[0],
          'n1:SoftwareCompanyName': 'DocumentIulia.ro',
          'n1:SoftwareID': 'DOCUMENTIULIA-ERP',
          'n1:SoftwareVersion': '1.0',
          'n1:Company': {
            'n1:RegistrationNumber': user?.cui || '',
            'n1:Name': user?.company || '',
            'n1:Address': {
              'n1:Country': 'RO',
            },
          },
          'n1:DefaultCurrencyCode': 'RON',
          'n1:SelectionCriteria': {
            'n1:SelectionStartDate': startDate.toISOString().split('T')[0],
            'n1:SelectionEndDate': new Date(endDate.getTime() - 86400000).toISOString().split('T')[0],
          },
          'n1:TaxAccountingBasis': 'A', // Accrual
        },
        'n1:MasterFiles': {
          'n1:GeneralLedgerAccounts': {},
          'n1:Customers': this.buildCustomers(invoices),
          'n1:Suppliers': this.buildSuppliers(invoices),
          'n1:TaxTable': this.buildTaxTable(),
        },
        'n1:SourceDocuments': {
          'n1:SalesInvoices': this.buildSalesInvoices(invoices.filter((i) => i.type === 'ISSUED')),
          'n1:PurchaseInvoices': this.buildPurchaseInvoices(invoices.filter((i) => i.type === 'RECEIVED')),
        },
      },
    };

    const xml = this.xmlBuilder.build(saftData);

    // Store the report
    await this.prisma.sAFTReport.upsert({
      where: {
        userId_period: { userId, period },
      },
      update: {
        xmlUrl: null, // Will be set after upload
        status: 'DRAFT',
      },
      create: {
        userId,
        period,
        reportType: 'D406',
        status: 'DRAFT',
      },
    });

    this.logger.log(`Generated SAF-T D406 for period ${period}`);
    return xml;
  }

  private buildCustomers(invoices: any[]) {
    const customers = invoices
      .filter((i) => i.type === 'ISSUED')
      .reduce((acc, inv) => {
        if (!acc[inv.partnerCui]) {
          acc[inv.partnerCui] = {
            'n1:CustomerID': inv.partnerCui,
            'n1:Name': inv.partnerName,
            'n1:Address': { 'n1:Country': 'RO' },
          };
        }
        return acc;
      }, {});

    return { 'n1:Customer': Object.values(customers) };
  }

  private buildSuppliers(invoices: any[]) {
    const suppliers = invoices
      .filter((i) => i.type === 'RECEIVED')
      .reduce((acc, inv) => {
        if (!acc[inv.partnerCui]) {
          acc[inv.partnerCui] = {
            'n1:SupplierID': inv.partnerCui,
            'n1:Name': inv.partnerName,
            'n1:Address': { 'n1:Country': 'RO' },
          };
        }
        return acc;
      }, {});

    return { 'n1:Supplier': Object.values(suppliers) };
  }

  private buildTaxTable() {
    return {
      'n1:TaxTableEntry': [
        {
          'n1:TaxType': 'TVA',
          'n1:TaxCode': '21',
          'n1:Description': 'TVA standard 21% - Legea 141/2025',
          'n1:TaxPercentage': '21.00',
        },
        {
          'n1:TaxType': 'TVA',
          'n1:TaxCode': '11',
          'n1:Description': 'TVA redus 11% - alimente/medicamente',
          'n1:TaxPercentage': '11.00',
        },
        {
          'n1:TaxType': 'TVA',
          'n1:TaxCode': '5',
          'n1:Description': 'TVA redus 5% - locuinte sociale',
          'n1:TaxPercentage': '5.00',
        },
      ],
    };
  }

  private buildSalesInvoices(invoices: any[]) {
    return {
      'n1:NumberOfEntries': invoices.length,
      'n1:TotalDebit': '0.00',
      'n1:TotalCredit': invoices.reduce((sum, i) => sum + Number(i.grossAmount), 0).toFixed(2),
      'n1:Invoice': invoices.map((inv) => ({
        'n1:InvoiceNo': inv.invoiceNumber,
        'n1:InvoiceDate': inv.invoiceDate.toISOString().split('T')[0],
        'n1:InvoiceType': 'FT',
        'n1:CustomerID': inv.partnerCui,
        'n1:DocumentTotals': {
          'n1:TaxPayable': Number(inv.vatAmount).toFixed(2),
          'n1:NetTotal': Number(inv.netAmount).toFixed(2),
          'n1:GrossTotal': Number(inv.grossAmount).toFixed(2),
          'n1:Currency': { 'n1:CurrencyCode': inv.currency },
        },
      })),
    };
  }

  private buildPurchaseInvoices(invoices: any[]) {
    return {
      'n1:NumberOfEntries': invoices.length,
      'n1:TotalDebit': invoices.reduce((sum, i) => sum + Number(i.grossAmount), 0).toFixed(2),
      'n1:TotalCredit': '0.00',
      'n1:Invoice': invoices.map((inv) => ({
        'n1:InvoiceNo': inv.invoiceNumber,
        'n1:InvoiceDate': inv.invoiceDate.toISOString().split('T')[0],
        'n1:InvoiceType': 'FT',
        'n1:SupplierID': inv.partnerCui,
        'n1:DocumentTotals': {
          'n1:TaxPayable': Number(inv.vatAmount).toFixed(2),
          'n1:NetTotal': Number(inv.netAmount).toFixed(2),
          'n1:GrossTotal': Number(inv.grossAmount).toFixed(2),
          'n1:Currency': { 'n1:CurrencyCode': inv.currency },
        },
      })),
    };
  }

  // Validate XML size (must be < 500MB per ANAF)
  validateXmlSize(xml: string): { valid: boolean; sizeMB: number } {
    const sizeMB = Buffer.byteLength(xml, 'utf8') / (1024 * 1024);
    return {
      valid: sizeMB < 500,
      sizeMB: Math.round(sizeMB * 100) / 100,
    };
  }
}
