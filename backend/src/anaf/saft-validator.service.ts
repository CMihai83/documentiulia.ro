import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

// SAF-T D406 Validator per ANAF Order 1783/2021
// Validates structure, mandatory fields, and business rules

export interface SaftValidationError {
  path: string;
  message: string;
  code: string;
}

export interface SaftValidationResult {
  valid: boolean;
  errors: SaftValidationError[];
  warnings: string[];
}

@Injectable()
export class SaftValidatorService {
  private readonly logger = new Logger(SaftValidatorService.name);
  private xmlParser: XMLParser;

  // Mandatory elements per ANAF SAF-T D406 schema
  private readonly mandatoryHeaderElements = [
    'AuditFileVersion',
    'AuditFileCountry',
    'AuditFileDateCreated',
    'SoftwareCompanyName',
    'SoftwareID',
    'SoftwareVersion',
    'Company',
    'DefaultCurrencyCode',
    'SelectionCriteria',
    'TaxAccountingBasis',
  ];

  private readonly mandatoryCompanyElements = [
    'RegistrationNumber',
    'Name',
    'Address',
  ];

  private readonly mandatorySalesInvoiceElements = [
    'InvoiceNo',
    'InvoiceDate',
    'InvoiceType',
    'CustomerID',
    'DocumentTotals',
  ];

  constructor() {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      removeNSPrefix: true,
      parseAttributeValue: true,
      allowBooleanAttributes: true,
    });
  }

  // Validate XML well-formedness
  validateXmlWellformed(xml: string): SaftValidationResult {
    const errors: SaftValidationError[] = [];
    const warnings: string[] = [];

    const result = XMLValidator.validate(xml, {
      allowBooleanAttributes: true,
    });

    if (result !== true) {
      errors.push({
        path: `Line ${result.err.line}`,
        message: result.err.msg,
        code: 'XML-001',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Validate SAF-T D406 structure
  validateStructure(xml: string): SaftValidationResult {
    const errors: SaftValidationError[] = [];
    const warnings: string[] = [];

    try {
      const parsed = this.xmlParser.parse(xml);
      const auditFile = parsed['AuditFile'] || parsed['n1:AuditFile'];

      if (!auditFile) {
        errors.push({
          path: '/AuditFile',
          message: 'Root element AuditFile not found',
          code: 'SAFT-001',
        });
        return { valid: false, errors, warnings };
      }

      // Validate Header
      const header = auditFile['Header'] || auditFile['n1:Header'];
      if (!header) {
        errors.push({
          path: '/AuditFile/Header',
          message: 'Header element is mandatory',
          code: 'SAFT-002',
        });
      } else {
        this.validateHeader(header, errors, warnings);
      }

      // Validate MasterFiles
      const masterFiles = auditFile['MasterFiles'] || auditFile['n1:MasterFiles'];
      if (!masterFiles) {
        warnings.push('MasterFiles element not found - may be empty if no data');
      } else {
        this.validateMasterFiles(masterFiles, errors, warnings);
      }

      // Validate SourceDocuments
      const sourceDocuments = auditFile['SourceDocuments'] || auditFile['n1:SourceDocuments'];
      if (sourceDocuments) {
        this.validateSourceDocuments(sourceDocuments, errors, warnings);
      }

    } catch (err) {
      errors.push({
        path: '/',
        message: `XML parsing error: ${err.message}`,
        code: 'XML-002',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Validate Header section
  private validateHeader(
    header: any,
    errors: SaftValidationError[],
    warnings: string[],
  ): void {
    const getElement = (name: string) =>
      header[name] || header[`n1:${name}`];

    // Check mandatory header elements
    for (const element of this.mandatoryHeaderElements) {
      const value = getElement(element);
      if (value === undefined || value === null || value === '') {
        errors.push({
          path: `/AuditFile/Header/${element}`,
          message: `${element} is mandatory in Header`,
          code: `SAFT-HDR-${element.toUpperCase()}`,
        });
      }
    }

    // Validate AuditFileCountry is RO
    const country = getElement('AuditFileCountry');
    if (country && country !== 'RO') {
      errors.push({
        path: '/AuditFile/Header/AuditFileCountry',
        message: 'AuditFileCountry must be "RO" for Romanian SAF-T',
        code: 'SAFT-HDR-COUNTRY',
      });
    }

    // Validate AuditFileVersion
    const version = getElement('AuditFileVersion');
    if (version && !['1.0', '2.0'].includes(version)) {
      warnings.push(`AuditFileVersion ${version} may not be supported by ANAF`);
    }

    // Validate Company
    const company = getElement('Company');
    if (company) {
      this.validateCompany(company, errors, warnings);
    }

    // Validate SelectionCriteria
    const selectionCriteria = getElement('SelectionCriteria');
    if (selectionCriteria) {
      this.validateSelectionCriteria(selectionCriteria, errors, warnings);
    }

    // Validate TaxAccountingBasis
    const taxBasis = getElement('TaxAccountingBasis');
    if (taxBasis && !['A', 'C'].includes(taxBasis)) {
      errors.push({
        path: '/AuditFile/Header/TaxAccountingBasis',
        message: 'TaxAccountingBasis must be "A" (Accrual) or "C" (Cash)',
        code: 'SAFT-HDR-TAXBASIS',
      });
    }

    // Validate DefaultCurrencyCode
    const currency = getElement('DefaultCurrencyCode');
    if (currency && currency !== 'RON') {
      warnings.push('DefaultCurrencyCode should typically be RON for Romanian SAF-T');
    }
  }

  // Validate Company section
  private validateCompany(
    company: any,
    errors: SaftValidationError[],
    warnings: string[],
  ): void {
    const getElement = (name: string) =>
      company[name] || company[`n1:${name}`];

    for (const element of this.mandatoryCompanyElements) {
      const value = getElement(element);
      if (value === undefined || value === null || value === '') {
        errors.push({
          path: `/AuditFile/Header/Company/${element}`,
          message: `${element} is mandatory in Company`,
          code: `SAFT-COMP-${element.toUpperCase()}`,
        });
      }
    }

    // Validate CUI format (RegistrationNumber)
    const cui = getElement('RegistrationNumber');
    if (cui && !this.validateCuiFormat(cui)) {
      warnings.push(`RegistrationNumber "${cui}" may not be a valid Romanian CUI`);
    }
  }

  // Validate SelectionCriteria
  private validateSelectionCriteria(
    criteria: any,
    errors: SaftValidationError[],
    warnings: string[],
  ): void {
    const getElement = (name: string) =>
      criteria[name] || criteria[`n1:${name}`];

    const startDate = getElement('SelectionStartDate');
    const endDate = getElement('SelectionEndDate');

    if (!startDate) {
      errors.push({
        path: '/AuditFile/Header/SelectionCriteria/SelectionStartDate',
        message: 'SelectionStartDate is mandatory',
        code: 'SAFT-SEL-START',
      });
    }

    if (!endDate) {
      errors.push({
        path: '/AuditFile/Header/SelectionCriteria/SelectionEndDate',
        message: 'SelectionEndDate is mandatory',
        code: 'SAFT-SEL-END',
      });
    }

    // Validate date order
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start > end) {
        errors.push({
          path: '/AuditFile/Header/SelectionCriteria',
          message: 'SelectionStartDate must be before SelectionEndDate',
          code: 'SAFT-SEL-ORDER',
        });
      }
    }
  }

  // Validate MasterFiles section
  private validateMasterFiles(
    masterFiles: any,
    errors: SaftValidationError[],
    warnings: string[],
  ): void {
    const getElement = (name: string) =>
      masterFiles[name] || masterFiles[`n1:${name}`];

    // Validate TaxTable if present
    const taxTable = getElement('TaxTable');
    if (taxTable) {
      this.validateTaxTable(taxTable, errors, warnings);
    }

    // Validate Customers if present
    const customers = getElement('Customers');
    if (customers) {
      const customerList = customers['Customer'] || customers['n1:Customer'];
      if (Array.isArray(customerList)) {
        customerList.forEach((customer, index) => {
          this.validateCustomer(customer, index, errors, warnings);
        });
      } else if (customerList) {
        this.validateCustomer(customerList, 0, errors, warnings);
      }
    }

    // Validate Suppliers if present
    const suppliers = getElement('Suppliers');
    if (suppliers) {
      const supplierList = suppliers['Supplier'] || suppliers['n1:Supplier'];
      if (Array.isArray(supplierList)) {
        supplierList.forEach((supplier, index) => {
          this.validateSupplier(supplier, index, errors, warnings);
        });
      } else if (supplierList) {
        this.validateSupplier(supplierList, 0, errors, warnings);
      }
    }
  }

  // Validate TaxTable
  private validateTaxTable(
    taxTable: any,
    errors: SaftValidationError[],
    warnings: string[],
  ): void {
    const entries = taxTable['TaxTableEntry'] || taxTable['n1:TaxTableEntry'];

    if (!entries) {
      warnings.push('TaxTable has no TaxTableEntry elements');
      return;
    }

    const entryList = Array.isArray(entries) ? entries : [entries];
    const validVatRates = [0, 5, 9, 11, 19, 21]; // Per Legea 141/2025

    entryList.forEach((entry, index) => {
      const rate = parseFloat(entry['TaxPercentage'] || entry['n1:TaxPercentage']);
      if (!isNaN(rate) && !validVatRates.includes(rate)) {
        warnings.push(`TaxTableEntry[${index}]: VAT rate ${rate}% may not be valid per Legea 141/2025`);
      }
    });
  }

  // Validate Customer
  private validateCustomer(
    customer: any,
    index: number,
    errors: SaftValidationError[],
    warnings: string[],
  ): void {
    const getElement = (name: string) =>
      customer[name] || customer[`n1:${name}`];

    if (!getElement('CustomerID')) {
      errors.push({
        path: `/AuditFile/MasterFiles/Customers/Customer[${index}]/CustomerID`,
        message: 'CustomerID is mandatory',
        code: 'SAFT-CUST-ID',
      });
    }

    if (!getElement('Name')) {
      errors.push({
        path: `/AuditFile/MasterFiles/Customers/Customer[${index}]/Name`,
        message: 'Customer Name is mandatory',
        code: 'SAFT-CUST-NAME',
      });
    }
  }

  // Validate Supplier
  private validateSupplier(
    supplier: any,
    index: number,
    errors: SaftValidationError[],
    warnings: string[],
  ): void {
    const getElement = (name: string) =>
      supplier[name] || supplier[`n1:${name}`];

    if (!getElement('SupplierID')) {
      errors.push({
        path: `/AuditFile/MasterFiles/Suppliers/Supplier[${index}]/SupplierID`,
        message: 'SupplierID is mandatory',
        code: 'SAFT-SUPP-ID',
      });
    }

    if (!getElement('Name')) {
      errors.push({
        path: `/AuditFile/MasterFiles/Suppliers/Supplier[${index}]/Name`,
        message: 'Supplier Name is mandatory',
        code: 'SAFT-SUPP-NAME',
      });
    }
  }

  // Validate SourceDocuments section
  private validateSourceDocuments(
    sourceDocuments: any,
    errors: SaftValidationError[],
    warnings: string[],
  ): void {
    const getElement = (name: string) =>
      sourceDocuments[name] || sourceDocuments[`n1:${name}`];

    // Validate SalesInvoices
    const salesInvoices = getElement('SalesInvoices');
    if (salesInvoices) {
      this.validateSalesInvoices(salesInvoices, errors, warnings);
    }

    // Validate PurchaseInvoices
    const purchaseInvoices = getElement('PurchaseInvoices');
    if (purchaseInvoices) {
      this.validatePurchaseInvoices(purchaseInvoices, errors, warnings);
    }
  }

  // Validate SalesInvoices
  private validateSalesInvoices(
    salesInvoices: any,
    errors: SaftValidationError[],
    warnings: string[],
  ): void {
    const getElement = (name: string) =>
      salesInvoices[name] || salesInvoices[`n1:${name}`];

    const numberOfEntries = parseInt(getElement('NumberOfEntries') || '0', 10);
    const invoices = getElement('Invoice');
    const invoiceList = Array.isArray(invoices) ? invoices : (invoices ? [invoices] : []);

    // Validate count matches
    if (numberOfEntries !== invoiceList.length) {
      errors.push({
        path: '/AuditFile/SourceDocuments/SalesInvoices/NumberOfEntries',
        message: `NumberOfEntries (${numberOfEntries}) does not match actual invoice count (${invoiceList.length})`,
        code: 'SAFT-SALES-COUNT',
      });
    }

    // Validate totals
    const totalCredit = parseFloat(getElement('TotalCredit') || '0');
    let calculatedTotal = 0;

    invoiceList.forEach((invoice, index) => {
      this.validateInvoice(invoice, index, 'Sales', errors, warnings);

      const docTotals = invoice['DocumentTotals'] || invoice['n1:DocumentTotals'];
      if (docTotals) {
        const gross = parseFloat(docTotals['GrossTotal'] || docTotals['n1:GrossTotal'] || '0');
        calculatedTotal += gross;
      }
    });

    if (Math.abs(totalCredit - calculatedTotal) > 0.01) {
      warnings.push(`SalesInvoices TotalCredit (${totalCredit}) does not match sum of invoices (${calculatedTotal.toFixed(2)})`);
    }
  }

  // Validate PurchaseInvoices
  private validatePurchaseInvoices(
    purchaseInvoices: any,
    errors: SaftValidationError[],
    warnings: string[],
  ): void {
    const getElement = (name: string) =>
      purchaseInvoices[name] || purchaseInvoices[`n1:${name}`];

    const numberOfEntries = parseInt(getElement('NumberOfEntries') || '0', 10);
    const invoices = getElement('Invoice');
    const invoiceList = Array.isArray(invoices) ? invoices : (invoices ? [invoices] : []);

    if (numberOfEntries !== invoiceList.length) {
      errors.push({
        path: '/AuditFile/SourceDocuments/PurchaseInvoices/NumberOfEntries',
        message: `NumberOfEntries (${numberOfEntries}) does not match actual invoice count (${invoiceList.length})`,
        code: 'SAFT-PURCH-COUNT',
      });
    }

    invoiceList.forEach((invoice, index) => {
      this.validateInvoice(invoice, index, 'Purchase', errors, warnings);
    });
  }

  // Validate individual invoice
  private validateInvoice(
    invoice: any,
    index: number,
    type: string,
    errors: SaftValidationError[],
    warnings: string[],
  ): void {
    const getElement = (name: string) =>
      invoice[name] || invoice[`n1:${name}`];

    const basePath = `/AuditFile/SourceDocuments/${type}Invoices/Invoice[${index}]`;

    // Check mandatory elements
    if (!getElement('InvoiceNo')) {
      errors.push({
        path: `${basePath}/InvoiceNo`,
        message: 'InvoiceNo is mandatory',
        code: `SAFT-INV-NO`,
      });
    }

    if (!getElement('InvoiceDate')) {
      errors.push({
        path: `${basePath}/InvoiceDate`,
        message: 'InvoiceDate is mandatory',
        code: `SAFT-INV-DATE`,
      });
    }

    if (!getElement('InvoiceType')) {
      errors.push({
        path: `${basePath}/InvoiceType`,
        message: 'InvoiceType is mandatory',
        code: `SAFT-INV-TYPE`,
      });
    }

    // Validate CustomerID/SupplierID
    if (type === 'Sales' && !getElement('CustomerID')) {
      errors.push({
        path: `${basePath}/CustomerID`,
        message: 'CustomerID is mandatory for sales invoices',
        code: `SAFT-INV-CUSTID`,
      });
    }

    if (type === 'Purchase' && !getElement('SupplierID')) {
      errors.push({
        path: `${basePath}/SupplierID`,
        message: 'SupplierID is mandatory for purchase invoices',
        code: `SAFT-INV-SUPPID`,
      });
    }

    // Validate DocumentTotals
    const docTotals = getElement('DocumentTotals');
    if (!docTotals) {
      errors.push({
        path: `${basePath}/DocumentTotals`,
        message: 'DocumentTotals is mandatory',
        code: `SAFT-INV-TOTALS`,
      });
    } else {
      this.validateDocumentTotals(docTotals, basePath, errors, warnings);
    }
  }

  // Validate DocumentTotals
  private validateDocumentTotals(
    totals: any,
    basePath: string,
    errors: SaftValidationError[],
    warnings: string[],
  ): void {
    const getElement = (name: string) =>
      totals[name] || totals[`n1:${name}`];

    const netTotal = parseFloat(getElement('NetTotal') || '0');
    const taxPayable = parseFloat(getElement('TaxPayable') || '0');
    const grossTotal = parseFloat(getElement('GrossTotal') || '0');

    // Validate math: Net + Tax = Gross
    const calculated = Math.round((netTotal + taxPayable) * 100) / 100;
    const actual = Math.round(grossTotal * 100) / 100;

    if (Math.abs(calculated - actual) > 0.01) {
      errors.push({
        path: `${basePath}/DocumentTotals`,
        message: `Total mismatch: Net (${netTotal}) + Tax (${taxPayable}) = ${calculated}, but GrossTotal is ${actual}`,
        code: 'SAFT-TOTALS-MATH',
      });
    }

    // Validate currency
    const currency = getElement('Currency');
    if (currency) {
      const currencyCode = currency['CurrencyCode'] || currency['n1:CurrencyCode'];
      if (currencyCode && !['RON', 'EUR', 'USD', 'GBP'].includes(currencyCode)) {
        warnings.push(`${basePath}: Currency ${currencyCode} may not be commonly accepted`);
      }
    }
  }

  // Helper: Validate CUI format
  private validateCuiFormat(cui: string): boolean {
    if (!cui) return false;
    const cleanCui = cui.replace(/^RO/i, '').replace(/\D/g, '');
    return cleanCui.length >= 2 && cleanCui.length <= 10;
  }

  // Full validation
  validate(xml: string): SaftValidationResult {
    // First check well-formedness
    const wellformedResult = this.validateXmlWellformed(xml);
    if (!wellformedResult.valid) {
      return wellformedResult;
    }

    // Then validate structure
    return this.validateStructure(xml);
  }

  // Validate and throw if invalid
  validateOrThrow(xml: string): void {
    const result = this.validate(xml);
    if (!result.valid) {
      const errorMessages = result.errors.map(e => `${e.code}: ${e.message}`).join('; ');
      throw new BadRequestException({
        message: 'SAF-T validation failed',
        errors: result.errors,
        warnings: result.warnings,
        details: errorMessages,
      });
    }
  }
}
