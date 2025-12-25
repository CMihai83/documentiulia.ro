import { Injectable, BadRequestException } from '@nestjs/common';

// Romanian e-Factura mandatory fields per CIUS-RO specification
// Reference: https://mfinante.gov.ro/documents/35673/10548327/CIUS-RO.pdf

export interface EfacturaValidationError {
  field: string;
  message: string;
  code: string;
}

export interface EfacturaInvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  supplier: {
    cui: string;
    name: string;
    address: string;
    city?: string;
    county?: string;
    country?: string;
    registrationNumber?: string; // J40/1234/2020
    bankAccount?: string;
    bankName?: string;
  };
  customer: {
    cui: string;
    name: string;
    address: string;
    city?: string;
    county?: string;
    country?: string;
  };
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    total: number;
    unitCode?: string;
  }>;
  totals: {
    net: number;
    vat: number;
    gross: number;
  };
  currency?: string;
  paymentTerms?: string;
}

@Injectable()
export class EfacturaValidatorService {
  // Validate Romanian CUI format
  validateCUI(cui: string): boolean {
    if (!cui) return false;

    // Remove RO prefix if present
    const cleanCui = cui.replace(/^RO/i, '').replace(/\D/g, '');

    if (cleanCui.length < 2 || cleanCui.length > 10) {
      return false;
    }

    // Validate using control digit algorithm
    const controlKey = [7, 5, 3, 2, 1, 7, 5, 3, 2];
    const digits = cleanCui.padStart(10, '0').split('').map(Number);
    const checkDigit = digits.pop();

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += digits[i] * controlKey[i];
    }

    const calculatedCheck = (sum * 10) % 11 % 10;
    return calculatedCheck === checkDigit;
  }

  // Validate invoice date format (YYYY-MM-DD)
  validateDateFormat(date: string): boolean {
    if (!date) return false;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(date)) return false;

    const parsed = new Date(date);
    return parsed instanceof Date && !isNaN(parsed.getTime());
  }

  // Validate VAT rate for Romania
  validateVatRate(rate: number): boolean {
    // Romanian VAT rates per Legea 141/2025
    const validRates = [0, 5, 9, 11, 19, 21]; // 0% exempt, 5% special, 9/11% reduced, 19/21% standard
    return validRates.includes(rate);
  }

  // Validate invoice number format
  validateInvoiceNumber(invoiceNumber: string): boolean {
    if (!invoiceNumber) return false;
    // Romanian invoice numbers should have at least 2 characters
    return invoiceNumber.length >= 2 && invoiceNumber.length <= 50;
  }

  // Validate mandatory e-Factura fields per CIUS-RO
  validateMandatoryFields(invoice: EfacturaInvoiceData): EfacturaValidationError[] {
    const errors: EfacturaValidationError[] = [];

    // BT-1: Invoice number (mandatory)
    if (!invoice.invoiceNumber) {
      errors.push({
        field: 'invoiceNumber',
        message: 'Invoice number is mandatory (BT-1)',
        code: 'CIUS-RO-001',
      });
    } else if (!this.validateInvoiceNumber(invoice.invoiceNumber)) {
      errors.push({
        field: 'invoiceNumber',
        message: 'Invoice number format is invalid',
        code: 'CIUS-RO-002',
      });
    }

    // BT-2: Invoice issue date (mandatory)
    if (!invoice.invoiceDate) {
      errors.push({
        field: 'invoiceDate',
        message: 'Invoice issue date is mandatory (BT-2)',
        code: 'CIUS-RO-003',
      });
    } else if (!this.validateDateFormat(invoice.invoiceDate)) {
      errors.push({
        field: 'invoiceDate',
        message: 'Invoice date must be in YYYY-MM-DD format',
        code: 'CIUS-RO-004',
      });
    }

    // Supplier validation (BG-4)
    if (!invoice.supplier) {
      errors.push({
        field: 'supplier',
        message: 'Supplier information is mandatory (BG-4)',
        code: 'CIUS-RO-010',
      });
    } else {
      // BT-27: Seller name
      if (!invoice.supplier.name) {
        errors.push({
          field: 'supplier.name',
          message: 'Supplier name is mandatory (BT-27)',
          code: 'CIUS-RO-011',
        });
      }

      // BT-31: Seller VAT identifier (CUI)
      if (!invoice.supplier.cui) {
        errors.push({
          field: 'supplier.cui',
          message: 'Supplier CUI/VAT identifier is mandatory (BT-31)',
          code: 'CIUS-RO-012',
        });
      } else if (!this.validateCUI(invoice.supplier.cui)) {
        errors.push({
          field: 'supplier.cui',
          message: 'Supplier CUI format is invalid',
          code: 'CIUS-RO-013',
        });
      }

      // BT-35: Seller address
      if (!invoice.supplier.address) {
        errors.push({
          field: 'supplier.address',
          message: 'Supplier address is mandatory (BT-35)',
          code: 'CIUS-RO-014',
        });
      }
    }

    // Customer validation (BG-7)
    if (!invoice.customer) {
      errors.push({
        field: 'customer',
        message: 'Customer information is mandatory (BG-7)',
        code: 'CIUS-RO-020',
      });
    } else {
      // BT-44: Buyer name
      if (!invoice.customer.name) {
        errors.push({
          field: 'customer.name',
          message: 'Customer name is mandatory (BT-44)',
          code: 'CIUS-RO-021',
        });
      }

      // BT-48: Buyer VAT identifier for B2B
      if (!invoice.customer.cui) {
        errors.push({
          field: 'customer.cui',
          message: 'Customer CUI/VAT identifier is mandatory for B2B (BT-48)',
          code: 'CIUS-RO-022',
        });
      } else if (!this.validateCUI(invoice.customer.cui)) {
        errors.push({
          field: 'customer.cui',
          message: 'Customer CUI format is invalid',
          code: 'CIUS-RO-023',
        });
      }

      // BT-50: Buyer address
      if (!invoice.customer.address) {
        errors.push({
          field: 'customer.address',
          message: 'Customer address is mandatory (BT-50)',
          code: 'CIUS-RO-024',
        });
      }
    }

    // Invoice lines validation (BG-25)
    if (!invoice.lines || invoice.lines.length === 0) {
      errors.push({
        field: 'lines',
        message: 'At least one invoice line is mandatory (BG-25)',
        code: 'CIUS-RO-030',
      });
    } else {
      invoice.lines.forEach((line, index) => {
        // BT-153: Item name
        if (!line.description) {
          errors.push({
            field: `lines[${index}].description`,
            message: `Line ${index + 1}: Item description is mandatory (BT-153)`,
            code: 'CIUS-RO-031',
          });
        }

        // BT-129: Invoiced quantity
        if (line.quantity === undefined || line.quantity === null) {
          errors.push({
            field: `lines[${index}].quantity`,
            message: `Line ${index + 1}: Quantity is mandatory (BT-129)`,
            code: 'CIUS-RO-032',
          });
        } else if (line.quantity <= 0) {
          errors.push({
            field: `lines[${index}].quantity`,
            message: `Line ${index + 1}: Quantity must be positive`,
            code: 'CIUS-RO-033',
          });
        }

        // BT-146: Item net price
        if (line.unitPrice === undefined || line.unitPrice === null) {
          errors.push({
            field: `lines[${index}].unitPrice`,
            message: `Line ${index + 1}: Unit price is mandatory (BT-146)`,
            code: 'CIUS-RO-034',
          });
        }

        // BT-151: VAT category rate
        if (line.vatRate === undefined || line.vatRate === null) {
          errors.push({
            field: `lines[${index}].vatRate`,
            message: `Line ${index + 1}: VAT rate is mandatory (BT-151)`,
            code: 'CIUS-RO-035',
          });
        } else if (!this.validateVatRate(line.vatRate)) {
          errors.push({
            field: `lines[${index}].vatRate`,
            message: `Line ${index + 1}: VAT rate ${line.vatRate}% is not valid for Romania`,
            code: 'CIUS-RO-036',
          });
        }
      });
    }

    // Totals validation (BG-22)
    if (!invoice.totals) {
      errors.push({
        field: 'totals',
        message: 'Invoice totals are mandatory (BG-22)',
        code: 'CIUS-RO-040',
      });
    } else {
      // BT-109: Invoice total amount without VAT
      if (invoice.totals.net === undefined || invoice.totals.net === null) {
        errors.push({
          field: 'totals.net',
          message: 'Net amount is mandatory (BT-109)',
          code: 'CIUS-RO-041',
        });
      }

      // BT-110: Invoice total VAT amount
      if (invoice.totals.vat === undefined || invoice.totals.vat === null) {
        errors.push({
          field: 'totals.vat',
          message: 'VAT amount is mandatory (BT-110)',
          code: 'CIUS-RO-042',
        });
      }

      // BT-112: Invoice total amount with VAT
      if (invoice.totals.gross === undefined || invoice.totals.gross === null) {
        errors.push({
          field: 'totals.gross',
          message: 'Gross amount is mandatory (BT-112)',
          code: 'CIUS-RO-043',
        });
      }

      // Validate totals consistency
      if (invoice.totals.net !== undefined &&
          invoice.totals.vat !== undefined &&
          invoice.totals.gross !== undefined) {
        const expectedGross = Math.round((invoice.totals.net + invoice.totals.vat) * 100) / 100;
        const actualGross = Math.round(invoice.totals.gross * 100) / 100;

        if (Math.abs(expectedGross - actualGross) > 0.01) {
          errors.push({
            field: 'totals',
            message: `Total mismatch: net (${invoice.totals.net}) + VAT (${invoice.totals.vat}) = ${expectedGross}, but gross is ${actualGross}`,
            code: 'CIUS-RO-044',
          });
        }
      }
    }

    return errors;
  }

  // Full validation with exception throwing
  validate(invoice: EfacturaInvoiceData): void {
    const errors = this.validateMandatoryFields(invoice);

    if (errors.length > 0) {
      const errorMessages = errors.map(e => `${e.code}: ${e.message}`).join('; ');
      throw new BadRequestException({
        message: 'e-Factura validation failed',
        errors,
        details: errorMessages,
      });
    }
  }

  // Get validation result without throwing
  getValidationResult(invoice: EfacturaInvoiceData): {
    valid: boolean;
    errors: EfacturaValidationError[];
  } {
    const errors = this.validateMandatoryFields(invoice);
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
