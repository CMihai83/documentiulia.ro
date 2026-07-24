import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SaftD406MonthlyService } from './saft-d406-monthly.service';
import { SaftXsdValidatorService } from './saft-xsd-validator.service';
import { SpvService } from './spv.service';
import { AccountingService } from '../accounting/accounting.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * REQ-045 XSD conformance harness: generates a D406 through the service with
 * realistic fixtures and validates it against ANAF's official schema
 * (Ro_SAFT_Schema_v249_2025.xsd) via the real SaftXsdValidatorService.
 * On failure it prints the exact schema errors — the working loop for
 * conformance work without a docker rebuild.
 */
describe('SAF-T D406 XSD conformance (ANAF Ro_SAFT_Schema v2.4.9)', () => {
  let service: SaftD406MonthlyService;

  const org = {
    name: 'Conformance SRL', cui: 'RO40123456', address: 'Str. Exemplu 10',
    city: 'Bucuresti', postalCode: '010101', county: 'Bucuresti',
    phone: '+40711111111', email: 'firma@test.ro', website: 'https://test.ro',
    bankAccount: 'RO12BTRL0000000000000001', bankName: 'BT',
  };

  const invoices = [
    { id: 'i1', type: 'ISSUED', invoiceNumber: 'FV-100', invoiceDate: new Date('2025-09-10'),
      partnerName: 'Client Demo SRL', partnerCui: 'RO30111222', partnerAddress: 'Str. C 1, Bucuresti',
      netAmount: 1000, vatRate: 21, vatAmount: 210, grossAmount: 1210, currency: 'RON' },
    { id: 'i2', type: 'RECEIVED', invoiceNumber: 'FA-200', invoiceDate: new Date('2025-09-15'),
      partnerName: 'Furnizor Demo SRL', partnerCui: 'RO30999888', partnerAddress: 'Str. F 2, Cluj',
      netAmount: 600, vatRate: 21, vatAmount: 126, grossAmount: 726, currency: 'RON' },
  ];

  const journalEntries = [
    { id: 'J1', date: new Date('2025-09-10'), description: 'Factura vanzare FV-100',
      reference: 'FV-100', status: 'POSTED' as const, createdAt: new Date('2025-09-10'),
      lines: [
        { accountCode: '411', accountName: 'Clienti', debit: 1210, credit: 0 },
        { accountCode: '704', accountName: 'Venituri', debit: 0, credit: 1000 },
        { accountCode: '4427', accountName: 'TVA colectata', debit: 0, credit: 210 },
      ] },
    { id: 'J2', date: new Date('2025-09-15'), description: 'Factura achizitie FA-200',
      reference: 'FA-200', status: 'POSTED' as const, createdAt: new Date('2025-09-15'),
      lines: [
        { accountCode: '628', accountName: 'Servicii', debit: 600, credit: 0 },
        { accountCode: '4426', accountName: 'TVA deductibila', debit: 126, credit: 0 },
        { accountCode: '401', accountName: 'Furnizori', debit: 0, credit: 726 },
      ] },
  ];

  const trialBalance = [
    { accountCode: '411', accountName: 'Clienti', accountType: 'ASSET',
      openingDebit: 0, openingCredit: 0, periodDebit: 1210, periodCredit: 0,
      closingDebit: 1210, closingCredit: 0 },
  ];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SaftD406MonthlyService,
        SaftXsdValidatorService, // the REAL validator with ANAF's XSD
        { provide: PrismaService, useValue: {
          user: { findUnique: jest.fn().mockResolvedValue({
            id: 'u1', email: 'u@test.ro', name: 'Ion Popescu', company: 'Fallback SRL', cui: 'RO99', address: 'x' }) },
          invoice: { findMany: jest.fn().mockResolvedValue(invoices) },
          payment: { findMany: jest.fn().mockResolvedValue([]) },
          employee: { findMany: jest.fn().mockResolvedValue([]) },
          payroll: { findMany: jest.fn().mockResolvedValue([]) },
          organizationMember: { findFirst: jest.fn().mockResolvedValue({ organization: org }) },
          sAFTReport: { upsert: jest.fn().mockResolvedValue({ id: 'r1' }) },
        } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: SpvService, useValue: {} },
        { provide: AccountingService, useValue: {
          getJournalEntries: jest.fn().mockResolvedValue(journalEntries),
          getTrialBalance: jest.fn().mockResolvedValue(trialBalance),
        } },
      ],
    }).compile();
    service = module.get(SaftD406MonthlyService);
    module.get(SaftXsdValidatorService).onModuleInit();
  });

  it('generated D406 validates against the official ANAF XSD', async () => {
    const result = await service.generateMonthlyD406('u1', '2025-09');
    expect(result.success).toBe(true);
    const xsd = result.validation.xsd!;
    expect(xsd.available).toBe(true);
    if (!xsd.valid) {
      // Print the full conformance report for the iteration loop
      // eslint-disable-next-line no-console
      console.log('XSD CONFORMANCE ERRORS:\n' + xsd.errors.join('\n'));
    }
    expect(xsd.valid).toBe(true);
  });
});
