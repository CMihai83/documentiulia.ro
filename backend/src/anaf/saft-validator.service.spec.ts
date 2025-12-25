import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import {
  SaftValidatorService,
  SaftValidationResult,
  SaftValidationError,
} from './saft-validator.service';

// Mock fast-xml-parser
const mockValidatorValidate = jest.fn();
const mockParserParse = jest.fn();

jest.mock('fast-xml-parser', () => ({
  XMLValidator: {
    validate: (...args: any[]) => mockValidatorValidate(...args),
  },
  XMLParser: jest.fn().mockImplementation(() => ({
    parse: (...args: any[]) => mockParserParse(...args),
  })),
}));

describe('SaftValidatorService', () => {
  let service: SaftValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SaftValidatorService],
    }).compile();

    service = module.get<SaftValidatorService>(SaftValidatorService);

    // Reset mocks
    jest.clearAllMocks();
    mockValidatorValidate.mockReturnValue(true);
  });

  // Helper to create valid SAF-T structure
  const createValidSaftStructure = (): any => ({
    AuditFile: {
      Header: {
        AuditFileVersion: '1.0',
        AuditFileCountry: 'RO',
        AuditFileDateCreated: '2025-01-01',
        SoftwareCompanyName: 'DocumentIulia SRL',
        SoftwareID: 'DocumentIulia',
        SoftwareVersion: '1.0.0',
        Company: {
          RegistrationNumber: 'RO12345678',
          Name: 'Test Company SRL',
          Address: {
            StreetName: 'Str. Test 123',
            City: 'București',
            Country: 'RO',
          },
        },
        DefaultCurrencyCode: 'RON',
        SelectionCriteria: {
          SelectionStartDate: '2025-01-01',
          SelectionEndDate: '2025-01-31',
        },
        TaxAccountingBasis: 'A',
      },
      MasterFiles: {
        TaxTable: {
          TaxTableEntry: [
            { TaxPercentage: '19' },
            { TaxPercentage: '9' },
          ],
        },
        Customers: {
          Customer: [
            { CustomerID: 'CUST001', Name: 'Client Test SRL' },
          ],
        },
        Suppliers: {
          Supplier: [
            { SupplierID: 'SUPP001', Name: 'Furnizor Test SRL' },
          ],
        },
      },
      SourceDocuments: {
        SalesInvoices: {
          NumberOfEntries: '1',
          TotalCredit: '119',
          Invoice: {
            InvoiceNo: 'FV-001',
            InvoiceDate: '2025-01-15',
            InvoiceType: 'FV',
            CustomerID: 'CUST001',
            DocumentTotals: {
              NetTotal: '100',
              TaxPayable: '19',
              GrossTotal: '119',
            },
          },
        },
      },
    },
  });

  describe('Constructor', () => {
    it('should create service instance', () => {
      expect(service).toBeDefined();
    });
  });

  describe('validateXmlWellformed', () => {
    it('should return valid for well-formed XML', () => {
      mockValidatorValidate.mockReturnValue(true);
      const xml = '<?xml version="1.0"?><AuditFile></AuditFile>';

      const result = service.validateXmlWellformed(xml);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockValidatorValidate).toHaveBeenCalledWith(xml, expect.any(Object));
    });

    it('should return error for malformed XML', () => {
      mockValidatorValidate.mockReturnValue({
        err: {
          line: 5,
          msg: 'Unclosed tag AuditFile',
        },
      });
      const xml = '<?xml version="1.0"?><AuditFile>';

      const result = service.validateXmlWellformed(xml);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('XML-001');
      expect(result.errors[0].path).toBe('Line 5');
      expect(result.errors[0].message).toBe('Unclosed tag AuditFile');
    });

    it('should return error for XML with syntax errors', () => {
      mockValidatorValidate.mockReturnValue({
        err: {
          line: 3,
          msg: 'Invalid attribute value',
        },
      });
      const xml = '<?xml version="1.0"?><AuditFile attr=invalid>';

      const result = service.validateXmlWellformed(xml);

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('XML-001');
    });

    it('should initialize warnings array as empty', () => {
      mockValidatorValidate.mockReturnValue(true);
      const xml = '<?xml version="1.0"?><AuditFile></AuditFile>';

      const result = service.validateXmlWellformed(xml);

      expect(result.warnings).toEqual([]);
    });
  });

  describe('validateStructure', () => {
    describe('Root Element', () => {
      it('should validate valid SAF-T structure', () => {
        mockParserParse.mockReturnValue(createValidSaftStructure());

        const result = service.validateStructure('<xml>valid</xml>');

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should error when AuditFile root element is missing', () => {
        mockParserParse.mockReturnValue({ SomeOtherRoot: {} });

        const result = service.validateStructure('<xml></xml>');

        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual({
          path: '/AuditFile',
          message: 'Root element AuditFile not found',
          code: 'SAFT-001',
        });
      });

      it('should accept namespaced AuditFile (n1:AuditFile)', () => {
        const structure = createValidSaftStructure();
        const nsStructure = { 'n1:AuditFile': structure.AuditFile };
        mockParserParse.mockReturnValue(nsStructure);

        const result = service.validateStructure('<xml></xml>');

        expect(result.errors).not.toContainEqual(
          expect.objectContaining({ code: 'SAFT-001' }),
        );
      });

      it('should catch XML parsing errors', () => {
        mockParserParse.mockImplementation(() => {
          throw new Error('Unexpected token');
        });

        const result = service.validateStructure('<invalid>');

        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual({
          path: '/',
          message: 'XML parsing error: Unexpected token',
          code: 'XML-002',
        });
      });
    });

    describe('Header Validation', () => {
      it('should error when Header is missing', () => {
        mockParserParse.mockReturnValue({
          AuditFile: {},
        });

        const result = service.validateStructure('<xml></xml>');

        expect(result.errors).toContainEqual({
          path: '/AuditFile/Header',
          message: 'Header element is mandatory',
          code: 'SAFT-002',
        });
      });

      it('should validate mandatory header elements', () => {
        mockParserParse.mockReturnValue({
          AuditFile: {
            Header: {},
          },
        });

        const result = service.validateStructure('<xml></xml>');

        const mandatoryElements = [
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

        mandatoryElements.forEach((element) => {
          expect(result.errors).toContainEqual(
            expect.objectContaining({
              path: `/AuditFile/Header/${element}`,
              message: `${element} is mandatory in Header`,
            }),
          );
        });
      });

      it('should error for non-RO AuditFileCountry', () => {
        const structure = createValidSaftStructure();
        structure.AuditFile.Header.AuditFileCountry = 'DE';
        mockParserParse.mockReturnValue(structure);

        const result = service.validateStructure('<xml></xml>');

        expect(result.errors).toContainEqual({
          path: '/AuditFile/Header/AuditFileCountry',
          message: 'AuditFileCountry must be "RO" for Romanian SAF-T',
          code: 'SAFT-HDR-COUNTRY',
        });
      });

      it('should warn for unsupported AuditFileVersion', () => {
        const structure = createValidSaftStructure();
        structure.AuditFile.Header.AuditFileVersion = '3.0';
        mockParserParse.mockReturnValue(structure);

        const result = service.validateStructure('<xml></xml>');

        expect(result.warnings).toContain(
          'AuditFileVersion 3.0 may not be supported by ANAF',
        );
      });

      it('should accept AuditFileVersion 1.0', () => {
        const structure = createValidSaftStructure();
        structure.AuditFile.Header.AuditFileVersion = '1.0';
        mockParserParse.mockReturnValue(structure);

        const result = service.validateStructure('<xml></xml>');

        expect(result.warnings).not.toContain(
          expect.stringContaining('AuditFileVersion 1.0'),
        );
      });

      it('should accept AuditFileVersion 2.0', () => {
        const structure = createValidSaftStructure();
        structure.AuditFile.Header.AuditFileVersion = '2.0';
        mockParserParse.mockReturnValue(structure);

        const result = service.validateStructure('<xml></xml>');

        expect(result.warnings).not.toContain(
          expect.stringContaining('AuditFileVersion 2.0'),
        );
      });

      it('should error for invalid TaxAccountingBasis', () => {
        const structure = createValidSaftStructure();
        structure.AuditFile.Header.TaxAccountingBasis = 'X';
        mockParserParse.mockReturnValue(structure);

        const result = service.validateStructure('<xml></xml>');

        expect(result.errors).toContainEqual({
          path: '/AuditFile/Header/TaxAccountingBasis',
          message: 'TaxAccountingBasis must be "A" (Accrual) or "C" (Cash)',
          code: 'SAFT-HDR-TAXBASIS',
        });
      });

      it('should accept TaxAccountingBasis "A" (Accrual)', () => {
        const structure = createValidSaftStructure();
        structure.AuditFile.Header.TaxAccountingBasis = 'A';
        mockParserParse.mockReturnValue(structure);

        const result = service.validateStructure('<xml></xml>');

        expect(result.errors).not.toContainEqual(
          expect.objectContaining({ code: 'SAFT-HDR-TAXBASIS' }),
        );
      });

      it('should accept TaxAccountingBasis "C" (Cash)', () => {
        const structure = createValidSaftStructure();
        structure.AuditFile.Header.TaxAccountingBasis = 'C';
        mockParserParse.mockReturnValue(structure);

        const result = service.validateStructure('<xml></xml>');

        expect(result.errors).not.toContainEqual(
          expect.objectContaining({ code: 'SAFT-HDR-TAXBASIS' }),
        );
      });

      it('should warn for non-RON DefaultCurrencyCode', () => {
        const structure = createValidSaftStructure();
        structure.AuditFile.Header.DefaultCurrencyCode = 'EUR';
        mockParserParse.mockReturnValue(structure);

        const result = service.validateStructure('<xml></xml>');

        expect(result.warnings).toContain(
          'DefaultCurrencyCode should typically be RON for Romanian SAF-T',
        );
      });
    });

    describe('Company Validation', () => {
      it('should validate mandatory company elements', () => {
        const structure = createValidSaftStructure();
        structure.AuditFile.Header.Company = {};
        mockParserParse.mockReturnValue(structure);

        const result = service.validateStructure('<xml></xml>');

        expect(result.errors).toContainEqual(
          expect.objectContaining({
            path: '/AuditFile/Header/Company/RegistrationNumber',
            code: 'SAFT-COMP-REGISTRATIONNUMBER',
          }),
        );
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            path: '/AuditFile/Header/Company/Name',
            code: 'SAFT-COMP-NAME',
          }),
        );
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            path: '/AuditFile/Header/Company/Address',
            code: 'SAFT-COMP-ADDRESS',
          }),
        );
      });

      it('should warn for invalid CUI format', () => {
        const structure = createValidSaftStructure();
        structure.AuditFile.Header.Company.RegistrationNumber = 'X';
        mockParserParse.mockReturnValue(structure);

        const result = service.validateStructure('<xml></xml>');

        expect(result.warnings).toContain(
          'RegistrationNumber "X" may not be a valid Romanian CUI',
        );
      });

      it('should accept valid CUI format with RO prefix', () => {
        const structure = createValidSaftStructure();
        structure.AuditFile.Header.Company.RegistrationNumber = 'RO12345678';
        mockParserParse.mockReturnValue(structure);

        const result = service.validateStructure('<xml></xml>');

        expect(result.warnings).not.toContain(
          expect.stringContaining('may not be a valid Romanian CUI'),
        );
      });

      it('should accept valid CUI format without prefix', () => {
        const structure = createValidSaftStructure();
        structure.AuditFile.Header.Company.RegistrationNumber = '12345678';
        mockParserParse.mockReturnValue(structure);

        const result = service.validateStructure('<xml></xml>');

        expect(result.warnings).not.toContain(
          expect.stringContaining('may not be a valid Romanian CUI'),
        );
      });
    });

    describe('SelectionCriteria Validation', () => {
      it('should error when SelectionStartDate is missing', () => {
        const structure = createValidSaftStructure();
        structure.AuditFile.Header.SelectionCriteria = {
          SelectionEndDate: '2025-01-31',
        };
        mockParserParse.mockReturnValue(structure);

        const result = service.validateStructure('<xml></xml>');

        expect(result.errors).toContainEqual({
          path: '/AuditFile/Header/SelectionCriteria/SelectionStartDate',
          message: 'SelectionStartDate is mandatory',
          code: 'SAFT-SEL-START',
        });
      });

      it('should error when SelectionEndDate is missing', () => {
        const structure = createValidSaftStructure();
        structure.AuditFile.Header.SelectionCriteria = {
          SelectionStartDate: '2025-01-01',
        };
        mockParserParse.mockReturnValue(structure);

        const result = service.validateStructure('<xml></xml>');

        expect(result.errors).toContainEqual({
          path: '/AuditFile/Header/SelectionCriteria/SelectionEndDate',
          message: 'SelectionEndDate is mandatory',
          code: 'SAFT-SEL-END',
        });
      });

      it('should error when SelectionStartDate is after SelectionEndDate', () => {
        const structure = createValidSaftStructure();
        structure.AuditFile.Header.SelectionCriteria = {
          SelectionStartDate: '2025-01-31',
          SelectionEndDate: '2025-01-01',
        };
        mockParserParse.mockReturnValue(structure);

        const result = service.validateStructure('<xml></xml>');

        expect(result.errors).toContainEqual({
          path: '/AuditFile/Header/SelectionCriteria',
          message: 'SelectionStartDate must be before SelectionEndDate',
          code: 'SAFT-SEL-ORDER',
        });
      });

      it('should accept valid date range', () => {
        const structure = createValidSaftStructure();
        mockParserParse.mockReturnValue(structure);

        const result = service.validateStructure('<xml></xml>');

        expect(result.errors).not.toContainEqual(
          expect.objectContaining({ code: 'SAFT-SEL-ORDER' }),
        );
      });
    });

    describe('MasterFiles Validation', () => {
      it('should warn when MasterFiles is missing', () => {
        const structure = createValidSaftStructure();
        delete structure.AuditFile.MasterFiles;
        mockParserParse.mockReturnValue(structure);

        const result = service.validateStructure('<xml></xml>');

        expect(result.warnings).toContain(
          'MasterFiles element not found - may be empty if no data',
        );
      });

      describe('TaxTable Validation', () => {
        it('should warn when TaxTable has no entries', () => {
          const structure = createValidSaftStructure();
          structure.AuditFile.MasterFiles.TaxTable = {};
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.warnings).toContain(
            'TaxTable has no TaxTableEntry elements',
          );
        });

        it('should warn for non-standard VAT rates per Legea 141/2025', () => {
          const structure = createValidSaftStructure();
          structure.AuditFile.MasterFiles.TaxTable.TaxTableEntry = [
            { TaxPercentage: '24' },
          ];
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.warnings).toContain(
            'TaxTableEntry[0]: VAT rate 24% may not be valid per Legea 141/2025',
          );
        });

        it('should accept valid VAT rate 0%', () => {
          const structure = createValidSaftStructure();
          structure.AuditFile.MasterFiles.TaxTable.TaxTableEntry = [
            { TaxPercentage: '0' },
          ];
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.warnings).not.toContain(
            expect.stringContaining('VAT rate 0%'),
          );
        });

        it('should accept valid VAT rate 5%', () => {
          const structure = createValidSaftStructure();
          structure.AuditFile.MasterFiles.TaxTable.TaxTableEntry = [
            { TaxPercentage: '5' },
          ];
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.warnings).not.toContain(
            expect.stringContaining('VAT rate 5%'),
          );
        });

        it('should accept valid VAT rate 9%', () => {
          const structure = createValidSaftStructure();
          structure.AuditFile.MasterFiles.TaxTable.TaxTableEntry = [
            { TaxPercentage: '9' },
          ];
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.warnings).not.toContain(
            expect.stringContaining('VAT rate 9%'),
          );
        });

        it('should accept valid VAT rate 11% (Legea 141/2025)', () => {
          const structure = createValidSaftStructure();
          structure.AuditFile.MasterFiles.TaxTable.TaxTableEntry = [
            { TaxPercentage: '11' },
          ];
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.warnings).not.toContain(
            expect.stringContaining('VAT rate 11%'),
          );
        });

        it('should accept valid VAT rate 19%', () => {
          const structure = createValidSaftStructure();
          structure.AuditFile.MasterFiles.TaxTable.TaxTableEntry = [
            { TaxPercentage: '19' },
          ];
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.warnings).not.toContain(
            expect.stringContaining('VAT rate 19%'),
          );
        });

        it('should accept valid VAT rate 21% (Legea 141/2025)', () => {
          const structure = createValidSaftStructure();
          structure.AuditFile.MasterFiles.TaxTable.TaxTableEntry = [
            { TaxPercentage: '21' },
          ];
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.warnings).not.toContain(
            expect.stringContaining('VAT rate 21%'),
          );
        });

        it('should handle single TaxTableEntry (not array)', () => {
          const structure = createValidSaftStructure();
          structure.AuditFile.MasterFiles.TaxTable.TaxTableEntry = {
            TaxPercentage: '19',
          };
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.valid).toBe(true);
        });
      });

      describe('Customers Validation', () => {
        it('should error when Customer lacks CustomerID', () => {
          const structure = createValidSaftStructure();
          structure.AuditFile.MasterFiles.Customers.Customer = [
            { Name: 'Test Client' },
          ];
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.errors).toContainEqual({
            path: '/AuditFile/MasterFiles/Customers/Customer[0]/CustomerID',
            message: 'CustomerID is mandatory',
            code: 'SAFT-CUST-ID',
          });
        });

        it('should error when Customer lacks Name', () => {
          const structure = createValidSaftStructure();
          structure.AuditFile.MasterFiles.Customers.Customer = [
            { CustomerID: 'CUST001' },
          ];
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.errors).toContainEqual({
            path: '/AuditFile/MasterFiles/Customers/Customer[0]/Name',
            message: 'Customer Name is mandatory',
            code: 'SAFT-CUST-NAME',
          });
        });

        it('should handle single Customer (not array)', () => {
          const structure = createValidSaftStructure();
          structure.AuditFile.MasterFiles.Customers.Customer = {
            CustomerID: 'CUST001',
            Name: 'Client Test',
          };
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.errors).not.toContainEqual(
            expect.objectContaining({ code: 'SAFT-CUST-ID' }),
          );
        });

        it('should validate multiple customers', () => {
          const structure = createValidSaftStructure();
          structure.AuditFile.MasterFiles.Customers.Customer = [
            { CustomerID: 'CUST001', Name: 'Client 1' },
            { CustomerID: 'CUST002' }, // Missing Name
            { Name: 'Client 3' }, // Missing CustomerID
          ];
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.errors).toContainEqual(
            expect.objectContaining({
              path: '/AuditFile/MasterFiles/Customers/Customer[1]/Name',
            }),
          );
          expect(result.errors).toContainEqual(
            expect.objectContaining({
              path: '/AuditFile/MasterFiles/Customers/Customer[2]/CustomerID',
            }),
          );
        });
      });

      describe('Suppliers Validation', () => {
        it('should error when Supplier lacks SupplierID', () => {
          const structure = createValidSaftStructure();
          structure.AuditFile.MasterFiles.Suppliers.Supplier = [
            { Name: 'Test Supplier' },
          ];
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.errors).toContainEqual({
            path: '/AuditFile/MasterFiles/Suppliers/Supplier[0]/SupplierID',
            message: 'SupplierID is mandatory',
            code: 'SAFT-SUPP-ID',
          });
        });

        it('should error when Supplier lacks Name', () => {
          const structure = createValidSaftStructure();
          structure.AuditFile.MasterFiles.Suppliers.Supplier = [
            { SupplierID: 'SUPP001' },
          ];
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.errors).toContainEqual({
            path: '/AuditFile/MasterFiles/Suppliers/Supplier[0]/Name',
            message: 'Supplier Name is mandatory',
            code: 'SAFT-SUPP-NAME',
          });
        });

        it('should handle single Supplier (not array)', () => {
          const structure = createValidSaftStructure();
          structure.AuditFile.MasterFiles.Suppliers.Supplier = {
            SupplierID: 'SUPP001',
            Name: 'Furnizor Test',
          };
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.errors).not.toContainEqual(
            expect.objectContaining({ code: 'SAFT-SUPP-ID' }),
          );
        });
      });
    });

    describe('SourceDocuments Validation', () => {
      describe('SalesInvoices Validation', () => {
        it('should error when NumberOfEntries mismatches invoice count', () => {
          const structure = createValidSaftStructure();
          structure.AuditFile.SourceDocuments.SalesInvoices.NumberOfEntries = '5';
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.errors).toContainEqual({
            path: '/AuditFile/SourceDocuments/SalesInvoices/NumberOfEntries',
            message: 'NumberOfEntries (5) does not match actual invoice count (1)',
            code: 'SAFT-SALES-COUNT',
          });
        });

        it('should warn when TotalCredit mismatches sum of invoices', () => {
          const structure = createValidSaftStructure();
          structure.AuditFile.SourceDocuments.SalesInvoices.TotalCredit = '500';
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.warnings).toContainEqual(
            expect.stringContaining('SalesInvoices TotalCredit (500) does not match'),
          );
        });

        it('should validate multiple sales invoices', () => {
          const structure = createValidSaftStructure();
          structure.AuditFile.SourceDocuments.SalesInvoices = {
            NumberOfEntries: '2',
            TotalCredit: '238',
            Invoice: [
              {
                InvoiceNo: 'FV-001',
                InvoiceDate: '2025-01-15',
                InvoiceType: 'FV',
                CustomerID: 'CUST001',
                DocumentTotals: {
                  NetTotal: '100',
                  TaxPayable: '19',
                  GrossTotal: '119',
                },
              },
              {
                InvoiceNo: 'FV-002',
                InvoiceDate: '2025-01-16',
                InvoiceType: 'FV',
                CustomerID: 'CUST002',
                DocumentTotals: {
                  NetTotal: '100',
                  TaxPayable: '19',
                  GrossTotal: '119',
                },
              },
            ],
          };
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.errors).not.toContainEqual(
            expect.objectContaining({ code: 'SAFT-SALES-COUNT' }),
          );
        });

        it('should error when sales invoice lacks InvoiceNo', () => {
          const structure = createValidSaftStructure();
          delete structure.AuditFile.SourceDocuments.SalesInvoices.Invoice.InvoiceNo;
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.errors).toContainEqual({
            path: '/AuditFile/SourceDocuments/SalesInvoices/Invoice[0]/InvoiceNo',
            message: 'InvoiceNo is mandatory',
            code: 'SAFT-INV-NO',
          });
        });

        it('should error when sales invoice lacks InvoiceDate', () => {
          const structure = createValidSaftStructure();
          delete structure.AuditFile.SourceDocuments.SalesInvoices.Invoice.InvoiceDate;
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.errors).toContainEqual({
            path: '/AuditFile/SourceDocuments/SalesInvoices/Invoice[0]/InvoiceDate',
            message: 'InvoiceDate is mandatory',
            code: 'SAFT-INV-DATE',
          });
        });

        it('should error when sales invoice lacks InvoiceType', () => {
          const structure = createValidSaftStructure();
          delete structure.AuditFile.SourceDocuments.SalesInvoices.Invoice.InvoiceType;
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.errors).toContainEqual({
            path: '/AuditFile/SourceDocuments/SalesInvoices/Invoice[0]/InvoiceType',
            message: 'InvoiceType is mandatory',
            code: 'SAFT-INV-TYPE',
          });
        });

        it('should error when sales invoice lacks CustomerID', () => {
          const structure = createValidSaftStructure();
          delete structure.AuditFile.SourceDocuments.SalesInvoices.Invoice.CustomerID;
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.errors).toContainEqual({
            path: '/AuditFile/SourceDocuments/SalesInvoices/Invoice[0]/CustomerID',
            message: 'CustomerID is mandatory for sales invoices',
            code: 'SAFT-INV-CUSTID',
          });
        });

        it('should error when sales invoice lacks DocumentTotals', () => {
          const structure = createValidSaftStructure();
          delete structure.AuditFile.SourceDocuments.SalesInvoices.Invoice.DocumentTotals;
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.errors).toContainEqual({
            path: '/AuditFile/SourceDocuments/SalesInvoices/Invoice[0]/DocumentTotals',
            message: 'DocumentTotals is mandatory',
            code: 'SAFT-INV-TOTALS',
          });
        });
      });

      describe('PurchaseInvoices Validation', () => {
        it('should error when NumberOfEntries mismatches purchase invoice count', () => {
          const structure = createValidSaftStructure();
          structure.AuditFile.SourceDocuments.PurchaseInvoices = {
            NumberOfEntries: '3',
            Invoice: {
              InvoiceNo: 'FA-001',
              InvoiceDate: '2025-01-10',
              InvoiceType: 'FA',
              SupplierID: 'SUPP001',
              DocumentTotals: {
                NetTotal: '200',
                TaxPayable: '38',
                GrossTotal: '238',
              },
            },
          };
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.errors).toContainEqual({
            path: '/AuditFile/SourceDocuments/PurchaseInvoices/NumberOfEntries',
            message: 'NumberOfEntries (3) does not match actual invoice count (1)',
            code: 'SAFT-PURCH-COUNT',
          });
        });

        it('should error when purchase invoice lacks SupplierID', () => {
          const structure = createValidSaftStructure();
          structure.AuditFile.SourceDocuments.PurchaseInvoices = {
            NumberOfEntries: '1',
            Invoice: {
              InvoiceNo: 'FA-001',
              InvoiceDate: '2025-01-10',
              InvoiceType: 'FA',
              DocumentTotals: {
                NetTotal: '200',
                TaxPayable: '38',
                GrossTotal: '238',
              },
            },
          };
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.errors).toContainEqual({
            path: '/AuditFile/SourceDocuments/PurchaseInvoices/Invoice[0]/SupplierID',
            message: 'SupplierID is mandatory for purchase invoices',
            code: 'SAFT-INV-SUPPID',
          });
        });

        it('should validate valid purchase invoice', () => {
          const structure = createValidSaftStructure();
          structure.AuditFile.SourceDocuments.PurchaseInvoices = {
            NumberOfEntries: '1',
            Invoice: {
              InvoiceNo: 'FA-001',
              InvoiceDate: '2025-01-10',
              InvoiceType: 'FA',
              SupplierID: 'SUPP001',
              DocumentTotals: {
                NetTotal: '200',
                TaxPayable: '38',
                GrossTotal: '238',
              },
            },
          };
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.errors).not.toContainEqual(
            expect.objectContaining({ code: 'SAFT-INV-SUPPID' }),
          );
        });
      });

      describe('DocumentTotals Validation', () => {
        it('should error when Net + Tax does not equal Gross', () => {
          const structure = createValidSaftStructure();
          structure.AuditFile.SourceDocuments.SalesInvoices.Invoice.DocumentTotals = {
            NetTotal: '100',
            TaxPayable: '19',
            GrossTotal: '200', // Should be 119
          };
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.errors).toContainEqual(
            expect.objectContaining({
              code: 'SAFT-TOTALS-MATH',
              message: expect.stringContaining('Total mismatch'),
            }),
          );
        });

        it('should accept correct totals calculation', () => {
          const structure = createValidSaftStructure();
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.errors).not.toContainEqual(
            expect.objectContaining({ code: 'SAFT-TOTALS-MATH' }),
          );
        });

        it('should allow small rounding differences (< 0.01)', () => {
          const structure = createValidSaftStructure();
          structure.AuditFile.SourceDocuments.SalesInvoices.Invoice.DocumentTotals = {
            NetTotal: '100.004',
            TaxPayable: '19.001',
            GrossTotal: '119.01',
          };
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.errors).not.toContainEqual(
            expect.objectContaining({ code: 'SAFT-TOTALS-MATH' }),
          );
        });

        it('should warn for uncommon currency codes', () => {
          const structure = createValidSaftStructure();
          structure.AuditFile.SourceDocuments.SalesInvoices.Invoice.DocumentTotals.Currency = {
            CurrencyCode: 'JPY',
          };
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.warnings).toContainEqual(
            expect.stringContaining('Currency JPY may not be commonly accepted'),
          );
        });

        it('should accept RON currency', () => {
          const structure = createValidSaftStructure();
          structure.AuditFile.SourceDocuments.SalesInvoices.Invoice.DocumentTotals.Currency = {
            CurrencyCode: 'RON',
          };
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.warnings).not.toContain(
            expect.stringContaining('RON may not be commonly accepted'),
          );
        });

        it('should accept EUR currency', () => {
          const structure = createValidSaftStructure();
          structure.AuditFile.SourceDocuments.SalesInvoices.Invoice.DocumentTotals.Currency = {
            CurrencyCode: 'EUR',
          };
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.warnings).not.toContain(
            expect.stringContaining('EUR may not be commonly accepted'),
          );
        });

        it('should accept USD currency', () => {
          const structure = createValidSaftStructure();
          structure.AuditFile.SourceDocuments.SalesInvoices.Invoice.DocumentTotals.Currency = {
            CurrencyCode: 'USD',
          };
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.warnings).not.toContain(
            expect.stringContaining('USD may not be commonly accepted'),
          );
        });

        it('should accept GBP currency', () => {
          const structure = createValidSaftStructure();
          structure.AuditFile.SourceDocuments.SalesInvoices.Invoice.DocumentTotals.Currency = {
            CurrencyCode: 'GBP',
          };
          mockParserParse.mockReturnValue(structure);

          const result = service.validateStructure('<xml></xml>');

          expect(result.warnings).not.toContain(
            expect.stringContaining('GBP may not be commonly accepted'),
          );
        });
      });
    });

    describe('Namespace Support', () => {
      it('should handle namespaced Header (n1:Header)', () => {
        const structure = {
          AuditFile: {
            'n1:Header': createValidSaftStructure().AuditFile.Header,
            MasterFiles: createValidSaftStructure().AuditFile.MasterFiles,
          },
        };
        mockParserParse.mockReturnValue(structure);

        const result = service.validateStructure('<xml></xml>');

        expect(result.errors).not.toContainEqual(
          expect.objectContaining({ code: 'SAFT-002' }),
        );
      });

      it('should handle namespaced MasterFiles (n1:MasterFiles)', () => {
        const structure = createValidSaftStructure();
        structure.AuditFile['n1:MasterFiles'] = structure.AuditFile.MasterFiles;
        delete structure.AuditFile.MasterFiles;
        mockParserParse.mockReturnValue(structure);

        const result = service.validateStructure('<xml></xml>');

        expect(result.warnings).not.toContain(
          'MasterFiles element not found - may be empty if no data',
        );
      });

      it('should handle namespaced elements in Header', () => {
        const nsHeader = {
          'n1:AuditFileVersion': '1.0',
          'n1:AuditFileCountry': 'RO',
          'n1:AuditFileDateCreated': '2025-01-01',
          'n1:SoftwareCompanyName': 'Test',
          'n1:SoftwareID': 'Test',
          'n1:SoftwareVersion': '1.0',
          'n1:Company': {
            'n1:RegistrationNumber': 'RO12345',
            'n1:Name': 'Test',
            'n1:Address': 'Test',
          },
          'n1:DefaultCurrencyCode': 'RON',
          'n1:SelectionCriteria': {
            'n1:SelectionStartDate': '2025-01-01',
            'n1:SelectionEndDate': '2025-01-31',
          },
          'n1:TaxAccountingBasis': 'A',
        };
        mockParserParse.mockReturnValue({
          AuditFile: {
            Header: nsHeader,
            MasterFiles: {},
          },
        });

        const result = service.validateStructure('<xml></xml>');

        expect(result.errors).not.toContainEqual(
          expect.objectContaining({
            message: expect.stringContaining('is mandatory in Header'),
          }),
        );
      });
    });
  });

  describe('validate', () => {
    it('should first check well-formedness', () => {
      mockValidatorValidate.mockReturnValue({
        err: { line: 1, msg: 'Malformed XML' },
      });

      const result = service.validate('<bad>');

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('XML-001');
      expect(mockParserParse).not.toHaveBeenCalled();
    });

    it('should validate structure if XML is well-formed', () => {
      mockValidatorValidate.mockReturnValue(true);
      mockParserParse.mockReturnValue(createValidSaftStructure());

      const result = service.validate('<xml>valid</xml>');

      expect(result.valid).toBe(true);
      expect(mockParserParse).toHaveBeenCalled();
    });

    it('should return structure errors for well-formed but invalid SAF-T', () => {
      mockValidatorValidate.mockReturnValue(true);
      mockParserParse.mockReturnValue({ InvalidRoot: {} });

      const result = service.validate('<xml>invalid</xml>');

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('SAFT-001');
    });
  });

  describe('validateOrThrow', () => {
    it('should not throw for valid SAF-T', () => {
      mockValidatorValidate.mockReturnValue(true);
      mockParserParse.mockReturnValue(createValidSaftStructure());

      expect(() => service.validateOrThrow('<xml>valid</xml>')).not.toThrow();
    });

    it('should throw BadRequestException for invalid SAF-T', () => {
      mockValidatorValidate.mockReturnValue(true);
      mockParserParse.mockReturnValue({ InvalidRoot: {} });

      expect(() => service.validateOrThrow('<xml>invalid</xml>')).toThrow(
        BadRequestException,
      );
    });

    it('should include error details in exception', () => {
      mockValidatorValidate.mockReturnValue(true);
      mockParserParse.mockReturnValue({ InvalidRoot: {} });

      try {
        service.validateOrThrow('<xml>invalid</xml>');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = error.getResponse();
        expect(response.message).toBe('SAF-T validation failed');
        expect(response.errors).toBeDefined();
        expect(response.details).toContain('SAFT-001');
      }
    });

    it('should include warnings in exception response', () => {
      mockValidatorValidate.mockReturnValue(true);
      const structure = createValidSaftStructure();
      structure.AuditFile.Header.AuditFileVersion = '3.0';
      delete structure.AuditFile.MasterFiles;
      mockParserParse.mockReturnValue({
        AuditFile: {
          Header: {},
        },
      });

      try {
        service.validateOrThrow('<xml>invalid</xml>');
        fail('Should have thrown');
      } catch (error) {
        const response = error.getResponse();
        expect(response.warnings).toBeDefined();
      }
    });

    it('should format multiple errors in details', () => {
      mockValidatorValidate.mockReturnValue(true);
      mockParserParse.mockReturnValue({
        AuditFile: {
          Header: {},
        },
      });

      try {
        service.validateOrThrow('<xml>invalid</xml>');
        fail('Should have thrown');
      } catch (error) {
        const response = error.getResponse();
        expect(response.details).toContain(';');
      }
    });
  });

  describe('CUI Validation', () => {
    it('should validate short CUI (2 digits)', () => {
      const structure = createValidSaftStructure();
      structure.AuditFile.Header.Company.RegistrationNumber = '12';
      mockParserParse.mockReturnValue(structure);

      const result = service.validateStructure('<xml></xml>');

      expect(result.warnings).not.toContain(
        expect.stringContaining('may not be a valid Romanian CUI'),
      );
    });

    it('should validate long CUI (10 digits)', () => {
      const structure = createValidSaftStructure();
      structure.AuditFile.Header.Company.RegistrationNumber = '1234567890';
      mockParserParse.mockReturnValue(structure);

      const result = service.validateStructure('<xml></xml>');

      expect(result.warnings).not.toContain(
        expect.stringContaining('may not be a valid Romanian CUI'),
      );
    });

    it('should warn for CUI with only 1 digit', () => {
      const structure = createValidSaftStructure();
      structure.AuditFile.Header.Company.RegistrationNumber = '1';
      mockParserParse.mockReturnValue(structure);

      const result = service.validateStructure('<xml></xml>');

      expect(result.warnings).toContain(
        'RegistrationNumber "1" may not be a valid Romanian CUI',
      );
    });

    it('should warn for CUI with more than 10 digits', () => {
      const structure = createValidSaftStructure();
      structure.AuditFile.Header.Company.RegistrationNumber = '12345678901';
      mockParserParse.mockReturnValue(structure);

      const result = service.validateStructure('<xml></xml>');

      expect(result.warnings).toContain(
        'RegistrationNumber "12345678901" may not be a valid Romanian CUI',
      );
    });

    it('should strip RO prefix when validating CUI', () => {
      const structure = createValidSaftStructure();
      structure.AuditFile.Header.Company.RegistrationNumber = 'RO12345';
      mockParserParse.mockReturnValue(structure);

      const result = service.validateStructure('<xml></xml>');

      expect(result.warnings).not.toContain(
        expect.stringContaining('may not be a valid Romanian CUI'),
      );
    });

    it('should handle lowercase RO prefix', () => {
      const structure = createValidSaftStructure();
      structure.AuditFile.Header.Company.RegistrationNumber = 'ro12345';
      mockParserParse.mockReturnValue(structure);

      const result = service.validateStructure('<xml></xml>');

      expect(result.warnings).not.toContain(
        expect.stringContaining('may not be a valid Romanian CUI'),
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty SourceDocuments', () => {
      const structure = createValidSaftStructure();
      structure.AuditFile.SourceDocuments = {};
      mockParserParse.mockReturnValue(structure);

      const result = service.validateStructure('<xml></xml>');

      expect(result.valid).toBe(true);
    });

    it('should handle missing SourceDocuments', () => {
      const structure = createValidSaftStructure();
      delete structure.AuditFile.SourceDocuments;
      mockParserParse.mockReturnValue(structure);

      const result = service.validateStructure('<xml></xml>');

      expect(result.valid).toBe(true);
    });

    it('should handle empty invoice list in SalesInvoices', () => {
      const structure = createValidSaftStructure();
      structure.AuditFile.SourceDocuments.SalesInvoices = {
        NumberOfEntries: '0',
        TotalCredit: '0',
      };
      mockParserParse.mockReturnValue(structure);

      const result = service.validateStructure('<xml></xml>');

      expect(result.errors).not.toContainEqual(
        expect.objectContaining({ code: 'SAFT-SALES-COUNT' }),
      );
    });

    it('should handle null values in header elements', () => {
      const structure = createValidSaftStructure();
      structure.AuditFile.Header.AuditFileVersion = null;
      mockParserParse.mockReturnValue(structure);

      const result = service.validateStructure('<xml></xml>');

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: '/AuditFile/Header/AuditFileVersion',
        }),
      );
    });

    it('should handle empty string values in header elements', () => {
      const structure = createValidSaftStructure();
      structure.AuditFile.Header.AuditFileCountry = '';
      mockParserParse.mockReturnValue(structure);

      const result = service.validateStructure('<xml></xml>');

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: '/AuditFile/Header/AuditFileCountry',
        }),
      );
    });

    it('should handle zero values in totals', () => {
      const structure = createValidSaftStructure();
      structure.AuditFile.SourceDocuments.SalesInvoices.Invoice.DocumentTotals = {
        NetTotal: '0',
        TaxPayable: '0',
        GrossTotal: '0',
      };
      mockParserParse.mockReturnValue(structure);

      const result = service.validateStructure('<xml></xml>');

      expect(result.errors).not.toContainEqual(
        expect.objectContaining({ code: 'SAFT-TOTALS-MATH' }),
      );
    });
  });
});
