import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';

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

// MKT-001: Validation result interface
export interface SAFTValidationResult {
  valid: boolean;
  errors: SAFTValidationError[];
  warnings: SAFTValidationWarning[];
  summary: {
    totalInvoices: number;
    totalCustomers: number;
    totalSuppliers: number;
    totalSalesAmount: number;
    totalPurchaseAmount: number;
    totalVATCollected: number;
    totalVATDeductible: number;
  };
}

export interface SAFTValidationError {
  code: string;
  field: string;
  message: string;
  severity: 'error';
}

export interface SAFTValidationWarning {
  code: string;
  field: string;
  message: string;
  severity: 'warning';
}

// MKT-001: Compliance status interface
export interface SAFTComplianceStatus {
  isCompliant: boolean;
  submissionDeadline: Date;
  daysUntilDeadline: number;
  periodStatus: 'pending' | 'submitted' | 'accepted' | 'rejected' | 'overdue';
  gracePeriodActive: boolean;
  gracePeriodEnds?: Date;
  recommendations: string[];
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

  // MKT-001: Comprehensive SAF-T validation before submission
  async validateSAFT(userId: string, period: string): Promise<SAFTValidationResult> {
    const errors: SAFTValidationError[] = [];
    const warnings: SAFTValidationWarning[] = [];

    const [year, month] = period.split('-');
    const startDate = new Date(`${year}-${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Fetch all data for validation
    const [user, invoices] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.invoice.findMany({
        where: { userId, invoiceDate: { gte: startDate, lt: endDate } },
      }),
    ]);

    // 1. Validate company data
    if (!user?.cui) {
      errors.push({
        code: 'E001',
        field: 'Company.RegistrationNumber',
        message: 'CUI/CIF lipsă - obligatoriu pentru SAF-T',
        severity: 'error',
      });
    } else if (!/^RO?\d{2,10}$/.test(user.cui.replace(/\s/g, ''))) {
      errors.push({
        code: 'E002',
        field: 'Company.RegistrationNumber',
        message: 'Format CUI invalid - trebuie să conțină 2-10 cifre',
        severity: 'error',
      });
    }

    if (!user?.company) {
      errors.push({
        code: 'E003',
        field: 'Company.Name',
        message: 'Denumire companie lipsă',
        severity: 'error',
      });
    }

    // 2. Validate invoices
    const salesInvoices = invoices.filter((i) => i.type === 'ISSUED');
    const purchaseInvoices = invoices.filter((i) => i.type === 'RECEIVED');

    for (const inv of invoices) {
      // Check invoice number
      if (!inv.invoiceNumber || inv.invoiceNumber.trim() === '') {
        errors.push({
          code: 'E010',
          field: `Invoice.${inv.id}.InvoiceNo`,
          message: `Factură fără număr (ID: ${inv.id})`,
          severity: 'error',
        });
      }

      // Check partner CUI
      if (!inv.partnerCui || inv.partnerCui.trim() === '') {
        warnings.push({
          code: 'W010',
          field: `Invoice.${inv.invoiceNumber}.PartnerCUI`,
          message: `CUI partener lipsă pentru factura ${inv.invoiceNumber}`,
          severity: 'warning',
        });
      }

      // Check amounts
      if (Number(inv.grossAmount) <= 0) {
        errors.push({
          code: 'E011',
          field: `Invoice.${inv.invoiceNumber}.GrossTotal`,
          message: `Valoare totală invalidă pentru factura ${inv.invoiceNumber}`,
          severity: 'error',
        });
      }

      // Check VAT calculation
      const calculatedVAT = Number(inv.grossAmount) - Number(inv.netAmount);
      const reportedVAT = Number(inv.vatAmount);
      if (Math.abs(calculatedVAT - reportedVAT) > 0.01) {
        warnings.push({
          code: 'W011',
          field: `Invoice.${inv.invoiceNumber}.TaxPayable`,
          message: `Diferență TVA calculat vs raportat pentru ${inv.invoiceNumber}: ${calculatedVAT.toFixed(2)} vs ${reportedVAT.toFixed(2)}`,
          severity: 'warning',
        });
      }

      // Check for duplicate invoice numbers
      const duplicates = invoices.filter(
        (i) => i.invoiceNumber === inv.invoiceNumber && i.id !== inv.id && i.type === inv.type,
      );
      if (duplicates.length > 0) {
        errors.push({
          code: 'E012',
          field: `Invoice.${inv.invoiceNumber}.InvoiceNo`,
          message: `Număr factură duplicat: ${inv.invoiceNumber}`,
          severity: 'error',
        });
      }
    }

    // 3. Check for missing invoice sequences (sales only)
    const invoiceNumbers = salesInvoices
      .map((i) => {
        const match = i.invoiceNumber.match(/(\d+)$/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((n) => n !== null)
      .sort((a, b) => a! - b!);

    for (let i = 1; i < invoiceNumbers.length; i++) {
      if (invoiceNumbers[i]! - invoiceNumbers[i - 1]! > 1) {
        warnings.push({
          code: 'W020',
          field: 'SalesInvoices.Sequence',
          message: `Posibilă lipsă în seria de facturi între ${invoiceNumbers[i - 1]} și ${invoiceNumbers[i]}`,
          severity: 'warning',
        });
      }
    }

    // 4. Calculate summary
    const uniqueCustomers = new Set(salesInvoices.map((i) => i.partnerCui).filter(Boolean));
    const uniqueSuppliers = new Set(purchaseInvoices.map((i) => i.partnerCui).filter(Boolean));

    const totalSalesAmount = salesInvoices.reduce((sum, i) => sum + Number(i.grossAmount), 0);
    const totalPurchaseAmount = purchaseInvoices.reduce((sum, i) => sum + Number(i.grossAmount), 0);
    const totalVATCollected = salesInvoices.reduce((sum, i) => sum + Number(i.vatAmount), 0);
    const totalVATDeductible = purchaseInvoices.reduce((sum, i) => sum + Number(i.vatAmount), 0);

    this.logger.log(
      `SAF-T validation for ${period}: ${errors.length} errors, ${warnings.length} warnings`,
    );

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalInvoices: invoices.length,
        totalCustomers: uniqueCustomers.size,
        totalSuppliers: uniqueSuppliers.size,
        totalSalesAmount: Math.round(totalSalesAmount * 100) / 100,
        totalPurchaseAmount: Math.round(totalPurchaseAmount * 100) / 100,
        totalVATCollected: Math.round(totalVATCollected * 100) / 100,
        totalVATDeductible: Math.round(totalVATDeductible * 100) / 100,
      },
    };
  }

  // MKT-001: Check compliance status for a period
  async getComplianceStatus(userId: string, period: string): Promise<SAFTComplianceStatus> {
    const [year, month] = period.split('-').map(Number);
    const recommendations: string[] = [];

    // Calculate submission deadline (25th of the following month per Order 1783/2021)
    const deadlineMonth = month === 12 ? 1 : month + 1;
    const deadlineYear = month === 12 ? year + 1 : year;
    const submissionDeadline = new Date(deadlineYear, deadlineMonth - 1, 25);

    const now = new Date();
    const daysUntilDeadline = Math.ceil(
      (submissionDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Check if grace period is active (Sept 2025 - Feb 2027 pilot period)
    const gracePeriodStart = new Date(2025, 8, 1); // Sept 2025
    const gracePeriodEnd = new Date(2027, 1, 28); // Feb 2027 (6 months after Aug 2026)
    const gracePeriodActive = now >= gracePeriodStart && now <= gracePeriodEnd;

    // Check existing submission status
    const existingReport = await this.prisma.sAFTReport.findUnique({
      where: { userId_period: { userId, period } },
    });

    let periodStatus: SAFTComplianceStatus['periodStatus'] = 'pending';
    if (existingReport) {
      if (existingReport.status === 'SUBMITTED' || existingReport.status === 'ACCEPTED') {
        periodStatus = existingReport.status.toLowerCase() as 'submitted' | 'accepted';
      } else if (existingReport.status === 'REJECTED') {
        periodStatus = 'rejected';
      }
    } else if (daysUntilDeadline < 0 && !gracePeriodActive) {
      periodStatus = 'overdue';
    }

    // Generate recommendations
    if (periodStatus === 'pending') {
      if (daysUntilDeadline <= 5 && daysUntilDeadline > 0) {
        recommendations.push(
          `Termen limită în ${daysUntilDeadline} zile! Generați și validați SAF-T urgent.`,
        );
      } else if (daysUntilDeadline <= 0) {
        if (gracePeriodActive) {
          recommendations.push(
            'Termenul a expirat, dar sunteți în perioada de grație pilot. Depuneți cât mai curând.',
          );
        } else {
          recommendations.push(
            'Termenul a expirat! Depuneți SAF-T imediat pentru a evita penalitățile.',
          );
        }
      } else {
        recommendations.push(
          `Aveți ${daysUntilDeadline} zile până la termen. Validați datele din timp.`,
        );
      }
    } else if (periodStatus === 'rejected') {
      recommendations.push('SAF-T respins. Corectați erorile și redepuneți.');
    }

    // Add general compliance tips
    if (gracePeriodActive) {
      recommendations.push(
        'Perioada pilot activă (Sept 2025 - Aug 2026) - fără penalități pentru întârzieri.',
      );
    }

    return {
      isCompliant: periodStatus === 'submitted' || periodStatus === 'accepted',
      submissionDeadline,
      daysUntilDeadline,
      periodStatus,
      gracePeriodActive,
      gracePeriodEnds: gracePeriodActive ? gracePeriodEnd : undefined,
      recommendations,
    };
  }

  // MKT-001: Get compliance calendar for multiple periods
  async getComplianceCalendar(userId: string, months: number = 12): Promise<SAFTComplianceStatus[]> {
    const calendar: SAFTComplianceStatus[] = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const periodDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const period = periodDate.toISOString().slice(0, 7); // YYYY-MM format
      const status = await this.getComplianceStatus(userId, period);
      calendar.push(status);
    }

    return calendar;
  }

  // MKT-001: Pre-submission checklist
  async getPreSubmissionChecklist(
    userId: string,
    period: string,
  ): Promise<{
    ready: boolean;
    checklist: { item: string; status: 'ok' | 'warning' | 'error'; detail: string }[];
  }> {
    const validation = await this.validateSAFT(userId, period);
    const compliance = await this.getComplianceStatus(userId, period);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const checklist: { item: string; status: 'ok' | 'warning' | 'error'; detail: string }[] = [];

    // 1. Company registration
    checklist.push({
      item: 'Date companie complete',
      status: user?.cui && user?.company ? 'ok' : 'error',
      detail: user?.cui && user?.company ? 'CUI și denumire verificate' : 'Completați datele companiei',
    });

    // 2. Invoice validation
    checklist.push({
      item: 'Facturi validate',
      status: validation.errors.length === 0 ? 'ok' : 'error',
      detail:
        validation.errors.length === 0
          ? `${validation.summary.totalInvoices} facturi verificate`
          : `${validation.errors.length} erori de corectat`,
    });

    // 3. Warnings check
    checklist.push({
      item: 'Avertismente verificate',
      status: validation.warnings.length === 0 ? 'ok' : 'warning',
      detail:
        validation.warnings.length === 0
          ? 'Nicio problemă potențială'
          : `${validation.warnings.length} avertismente de revizuit`,
    });

    // 4. Deadline status
    checklist.push({
      item: 'Termen depunere',
      status: compliance.daysUntilDeadline >= 0 ? 'ok' : compliance.gracePeriodActive ? 'warning' : 'error',
      detail:
        compliance.daysUntilDeadline >= 0
          ? `${compliance.daysUntilDeadline} zile rămase`
          : compliance.gracePeriodActive
            ? 'Termen depășit (perioadă grație activă)'
            : 'Termen depășit!',
    });

    // 5. VAT reconciliation
    const vatDiff = Math.abs(
      validation.summary.totalVATCollected - validation.summary.totalVATDeductible,
    );
    checklist.push({
      item: 'Reconciliere TVA',
      status: 'ok',
      detail: `TVA colectat: ${validation.summary.totalVATCollected.toFixed(2)} RON, TVA deductibil: ${validation.summary.totalVATDeductible.toFixed(2)} RON`,
    });

    const ready = checklist.every((c) => c.status !== 'error');

    return { ready, checklist };
  }

  // Generate SAF-T D406 with Payroll section (Salaries) per Order 1783/2021
  async generateD406WithPayroll(userId: string, period: string): Promise<string> {
    const [year, month] = period.split('-');

    // Fetch user and company data
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // Fetch invoices for the period
    const startDate = new Date(`${year}-${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const [invoices, payrolls] = await Promise.all([
      this.prisma.invoice.findMany({
        where: {
          userId,
          invoiceDate: {
            gte: startDate,
            lt: endDate,
          },
        },
      }),
      this.prisma.payroll.findMany({
        where: {
          employee: { userId },
          period,
        },
        include: {
          employee: true,
        },
      }),
    ]);

    // Build SAF-T XML structure with Salaries
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
          'n1:TaxAccountingBasis': 'A',
        },
        'n1:MasterFiles': {
          'n1:GeneralLedgerAccounts': {},
          'n1:Customers': this.buildCustomers(invoices),
          'n1:Suppliers': this.buildSuppliers(invoices),
          'n1:TaxTable': this.buildTaxTable(),
          'n1:Employees': this.buildEmployees(payrolls),
        },
        'n1:SourceDocuments': {
          'n1:SalesInvoices': this.buildSalesInvoices(invoices.filter((i) => i.type === 'ISSUED')),
          'n1:PurchaseInvoices': this.buildPurchaseInvoices(invoices.filter((i) => i.type === 'RECEIVED')),
        },
        'n1:Salaries': this.buildSalaries(payrolls, period),
      },
    };

    const xml = this.xmlBuilder.build(saftData);

    // Store the report
    await this.prisma.sAFTReport.upsert({
      where: {
        userId_period: { userId, period },
      },
      update: {
        xmlUrl: null,
        status: 'DRAFT',
      },
      create: {
        userId,
        period,
        reportType: 'D406_PAYROLL',
        status: 'DRAFT',
      },
    });

    this.logger.log(`Generated SAF-T D406 with payroll for period ${period}`);
    return xml;
  }

  // Build Employees section for SAF-T MasterFiles
  private buildEmployees(payrolls: any[]) {
    const employees = payrolls.reduce((acc, p) => {
      const emp = p.employee;
      if (!acc[emp.id]) {
        acc[emp.id] = {
          'n1:EmployeeID': emp.id,
          'n1:Name': `${emp.firstName} ${emp.lastName}`,
          'n1:TaxID': emp.cnp || '',
          'n1:EmploymentStartDate': emp.hireDate?.toISOString().split('T')[0] || '',
          'n1:Department': emp.department || 'General',
          'n1:Position': emp.position || '',
        };
      }
      return acc;
    }, {});

    return { 'n1:Employee': Object.values(employees) };
  }

  // Build Salaries section per Order 1783/2021
  private buildSalaries(payrolls: any[], period: string) {
    const totalGross = payrolls.reduce((sum, p) => sum + Number(p.grossSalary || 0), 0);
    const totalNet = payrolls.reduce((sum, p) => sum + Number(p.netSalary || 0), 0);
    const totalTaxes = payrolls.reduce((sum, p) => sum + Number(p.taxes || 0), 0);
    const totalContributions = payrolls.reduce((sum, p) => sum + Number(p.contributions || 0), 0);

    return {
      'n1:NumberOfEmployees': payrolls.length,
      'n1:Period': period,
      'n1:TotalGrossSalary': totalGross.toFixed(2),
      'n1:TotalNetSalary': totalNet.toFixed(2),
      'n1:TotalTaxes': totalTaxes.toFixed(2),
      'n1:TotalContributions': totalContributions.toFixed(2),
      'n1:SalaryPayments': payrolls.map((p) => ({
        'n1:EmployeeID': p.employeeId,
        'n1:EmployeeName': `${p.employee.firstName} ${p.employee.lastName}`,
        'n1:GrossSalary': Number(p.grossSalary || 0).toFixed(2),
        'n1:NetSalary': Number(p.netSalary || 0).toFixed(2),
        'n1:Taxes': Number(p.taxes || 0).toFixed(2),
        'n1:Contributions': Number(p.contributions || 0).toFixed(2),
        'n1:TaxBreakdown': {
          'n1:CAS': (Number(p.grossSalary || 0) * 0.25).toFixed(2), // Social security 25%
          'n1:CASS': (Number(p.grossSalary || 0) * 0.10).toFixed(2), // Health 10%
          'n1:IncomeTax': Number(p.taxes || 0).toFixed(2), // Income tax 10%
        },
        'n1:PaymentDate': new Date().toISOString().split('T')[0],
        'n1:PaymentMethod': 'BANK_TRANSFER',
      })),
    };
  }
}
