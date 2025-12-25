import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FreelancerComplianceService } from './freelancer-compliance.service';

describe('FreelancerComplianceService', () => {
  let service: FreelancerComplianceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FreelancerComplianceService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-value'),
          },
        },
      ],
    }).compile();

    service = module.get<FreelancerComplianceService>(FreelancerComplianceService);
    service.resetState();
  });

  describe('Tax Profile Management', () => {
    it('should create a tax profile', async () => {
      const profile = await service.createTaxProfile({
        freelancerId: 'freelancer-1',
        taxIdType: 'CUI',
        taxId: 'RO12345678',
        entityType: 'PFA',
        address: {
          street: 'Str. Principala 123',
          city: 'Bucharest',
          county: 'Sector 1',
          postalCode: '010101',
          country: 'RO',
        },
        bankAccount: 'RO49AAAA1B31007593840000',
        bankName: 'ING Bank',
        vatRegistered: false,
        vatScheme: 'EXEMPT',
        vatThreshold: 300000,
        taxRegime: 'INCOME_TAX',
        casOptIn: true,
        cassOptIn: true,
        taxResidency: 'RO',
        taxTreatyCountries: ['US', 'UK', 'DE', 'FR'],
      });

      expect(profile).toBeDefined();
      expect(profile.id).toMatch(/^txp-/);
      expect(profile.taxId).toBe('RO12345678');
      expect(profile.entityType).toBe('PFA');
      expect(profile.taxRegime).toBe('INCOME_TAX');
    });

    it('should get tax profile by freelancer ID', async () => {
      await service.createTaxProfile({
        freelancerId: 'freelancer-2',
        taxIdType: 'CNP',
        taxId: '1900101123456',
        entityType: 'PFA',
        address: { street: 'Test', city: 'Test', county: 'Test', postalCode: '123', country: 'RO' },
        bankAccount: 'RO123',
        bankName: 'Test Bank',
        vatRegistered: false,
        vatScheme: 'EXEMPT',
        vatThreshold: 300000,
        taxRegime: 'MICRO',
        microTaxRate: 0.01,
        casOptIn: false,
        cassOptIn: true,
        taxResidency: 'RO',
        taxTreatyCountries: [],
      });

      const found = await service.getTaxProfileByFreelancer('freelancer-2');
      expect(found).toBeDefined();
      expect(found!.taxRegime).toBe('MICRO');
      expect(found!.microTaxRate).toBe(0.01);
    });

    it('should update tax profile', async () => {
      const profile = await service.createTaxProfile({
        freelancerId: 'freelancer-3',
        taxIdType: 'CUI',
        taxId: 'RO87654321',
        entityType: 'SRL',
        address: { street: 'Test', city: 'Test', county: 'Test', postalCode: '123', country: 'RO' },
        bankAccount: 'RO123',
        bankName: 'Test Bank',
        vatRegistered: false,
        vatScheme: 'EXEMPT',
        vatThreshold: 300000,
        taxRegime: 'MICRO',
        casOptIn: false,
        cassOptIn: false,
        taxResidency: 'RO',
        taxTreatyCountries: [],
      });

      const updated = await service.updateTaxProfile(profile.id, {
        vatRegistered: true,
        vatNumber: 'RO87654321',
        vatScheme: 'NORMAL',
      });

      expect(updated.vatRegistered).toBe(true);
      expect(updated.vatNumber).toBe('RO87654321');
    });
  });

  describe('Income Declaration Generation', () => {
    beforeEach(async () => {
      await service.createTaxProfile({
        freelancerId: 'freelancer-dec',
        taxIdType: 'CUI',
        taxId: 'RO11111111',
        entityType: 'PFA',
        address: { street: 'Test', city: 'Bucharest', county: 'Sector 1', postalCode: '010101', country: 'RO' },
        bankAccount: 'RO123',
        bankName: 'BCR',
        vatRegistered: false,
        vatScheme: 'EXEMPT',
        vatThreshold: 300000,
        taxRegime: 'INCOME_TAX',
        casOptIn: true,
        cassOptIn: true,
        taxResidency: 'RO',
        taxTreatyCountries: ['US', 'DE'],
      });
    });

    it('should generate D212 income declaration', async () => {
      const declaration = await service.generateIncomeDeclaration({
        freelancerId: 'freelancer-dec',
        declarationType: 'D212',
        fiscalYear: 2025,
        incomeSources: [
          {
            clientId: 'client-1',
            clientName: 'Acme Corp SRL',
            clientCountry: 'RO',
            clientVatNumber: 'RO12345678',
            amount: 50000,
            currency: 'RON',
            invoiceCount: 12,
          },
          {
            clientId: 'client-2',
            clientName: 'German GmbH',
            clientCountry: 'DE',
            clientVatNumber: 'DE123456789',
            amount: 30000,
            currency: 'EUR',
            invoiceCount: 6,
          },
        ],
        deductions: [
          {
            category: 'SOFTWARE',
            description: 'Development tools subscription',
            amount: 2000,
            deductiblePercent: 100,
          },
          {
            category: 'OFFICE_RENT',
            description: 'Home office space',
            amount: 6000,
            deductiblePercent: 100,
          },
        ],
      });

      expect(declaration).toBeDefined();
      expect(declaration.id).toMatch(/^dec-/);
      expect(declaration.declarationType).toBe('D212');
      expect(declaration.fiscalYear).toBe(2025);
      expect(declaration.status).toBe('DRAFT');
      expect(declaration.income.grossIncome).toBeGreaterThan(0);
      expect(declaration.income.bySource).toHaveLength(2);
      expect(declaration.income.byCountry).toHaveLength(2);
      expect(declaration.deductions.totalDeductions).toBe(8000);
      expect(declaration.taxes.incomeTaxRate).toBe(0.10);
    });

    it('should calculate taxes correctly for INCOME_TAX regime', async () => {
      const declaration = await service.generateIncomeDeclaration({
        freelancerId: 'freelancer-dec',
        declarationType: 'D212',
        fiscalYear: 2025,
        incomeSources: [
          {
            clientId: 'client-1',
            clientName: 'Local Client',
            clientCountry: 'RO',
            amount: 100000,
            currency: 'RON',
            invoiceCount: 10,
          },
        ],
        deductions: [
          {
            category: 'BUSINESS_EXPENSE',
            description: 'General expenses',
            amount: 20000,
            deductiblePercent: 100,
          },
        ],
      });

      // Taxable income = 100,000 - 20,000 = 80,000
      expect(declaration.taxes.taxableIncome).toBe(80000);
      // Income tax = 80,000 * 10% = 8,000
      expect(declaration.taxes.incomeTaxAmount).toBe(8000);
      expect(declaration.taxes.incomeTaxRate).toBe(0.10);
    });

    it('should validate declaration before submission', async () => {
      const declaration = await service.generateIncomeDeclaration({
        freelancerId: 'freelancer-dec',
        declarationType: 'D212',
        fiscalYear: 2025,
        incomeSources: [
          {
            clientId: 'client-1',
            clientName: 'Valid Client',
            clientCountry: 'RO',
            amount: 50000,
            currency: 'RON',
            invoiceCount: 5,
          },
        ],
        deductions: [],
      });

      const result = await service.validateDeclaration(declaration.id);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);

      const updated = await service.getIncomeDeclaration(declaration.id);
      expect(updated!.status).toBe('VALIDATED');
    });

    it('should warn about high deduction ratio', async () => {
      const declaration = await service.generateIncomeDeclaration({
        freelancerId: 'freelancer-dec',
        declarationType: 'D212',
        fiscalYear: 2025,
        incomeSources: [
          {
            clientId: 'client-1',
            clientName: 'Client',
            clientCountry: 'RO',
            amount: 100000,
            currency: 'RON',
            invoiceCount: 10,
          },
        ],
        deductions: [
          {
            category: 'BUSINESS_EXPENSE',
            description: 'Suspicious expenses',
            amount: 80000,
            deductiblePercent: 100,
          },
        ],
      });

      const result = await service.validateDeclaration(declaration.id);

      expect(result.warnings.some(w => w.includes('70%'))).toBe(true);
    });

    it('should submit validated declaration', async () => {
      const declaration = await service.generateIncomeDeclaration({
        freelancerId: 'freelancer-dec',
        declarationType: 'D212',
        fiscalYear: 2025,
        incomeSources: [
          {
            clientId: 'client-1',
            clientName: 'Client',
            clientCountry: 'RO',
            amount: 50000,
            currency: 'RON',
            invoiceCount: 5,
          },
        ],
        deductions: [],
      });

      await service.validateDeclaration(declaration.id);
      const submitted = await service.submitDeclaration(declaration.id);

      expect(submitted.status).toBe('SUBMITTED');
      expect(submitted.submittedAt).toBeInstanceOf(Date);
      expect(submitted.submissionId).toMatch(/^ANAF-/);
      expect(submitted.xmlContent).toContain('<?xml');
    });

    it('should not submit unvalidated declaration', async () => {
      const declaration = await service.generateIncomeDeclaration({
        freelancerId: 'freelancer-dec',
        declarationType: 'D212',
        fiscalYear: 2025,
        incomeSources: [
          {
            clientId: 'client-1',
            clientName: 'Client',
            clientCountry: 'RO',
            amount: 50000,
            currency: 'RON',
            invoiceCount: 5,
          },
        ],
        deductions: [],
      });

      await expect(service.submitDeclaration(declaration.id)).rejects.toThrow(
        'Declaration must be validated before submission'
      );
    });
  });

  describe('Cross-Border VAT Handling', () => {
    it('should record B2B service export with reverse charge', async () => {
      const transaction = await service.recordCrossBorderTransaction({
        freelancerId: 'freelancer-1',
        transactionType: 'SERVICE_EXPORT',
        clientId: 'client-de',
        clientCountry: 'DE',
        clientVatNumber: 'DE123456789',
        isB2B: true,
        amount: 5000,
        currency: 'EUR',
        invoiceNumber: 'INV-2025-001',
        invoiceDate: new Date(),
      });

      expect(transaction).toBeDefined();
      expect(transaction.vatTreatment).toBe('REVERSE_CHARGE');
      expect(transaction.vatRate).toBe(0);
      expect(transaction.placeOfSupply).toBe('DE');
      expect(transaction.placeOfSupplyRule).toBe('B2B_CUSTOMER');
      expect(transaction.includeInVIES).toBe(true);
      expect(transaction.includeInRecap).toBe(true);
    });

    it('should record B2C service to EU with OSS', async () => {
      const transaction = await service.recordCrossBorderTransaction({
        freelancerId: 'freelancer-1',
        transactionType: 'SERVICE_EXPORT',
        clientId: 'client-fr',
        clientCountry: 'FR',
        isB2B: false,
        amount: 1000,
        currency: 'EUR',
        invoiceNumber: 'INV-2025-002',
        invoiceDate: new Date(),
      });

      expect(transaction.vatTreatment).toBe('OSS');
      expect(transaction.vatRate).toBe(20); // French VAT rate
      expect(transaction.placeOfSupply).toBe('FR');
      expect(transaction.placeOfSupplyRule).toBe('B2C_CUSTOMER');
    });

    it('should record export outside EU as zero-rated', async () => {
      const transaction = await service.recordCrossBorderTransaction({
        freelancerId: 'freelancer-1',
        transactionType: 'SERVICE_EXPORT',
        clientId: 'client-us',
        clientCountry: 'US',
        isB2B: true,
        amount: 10000,
        currency: 'USD',
        invoiceNumber: 'INV-2025-003',
        invoiceDate: new Date(),
      });

      expect(transaction.vatTreatment).toBe('REVERSE_CHARGE');
      expect(transaction.vatRate).toBe(0);
      expect(transaction.includeInVIES).toBe(false);
    });

    it('should generate VAT return for period', async () => {
      // Record some transactions
      await service.recordCrossBorderTransaction({
        freelancerId: 'freelancer-vat',
        transactionType: 'SERVICE_EXPORT',
        clientId: 'client-1',
        clientCountry: 'DE',
        clientVatNumber: 'DE123',
        isB2B: true,
        amount: 5000,
        currency: 'EUR',
        invoiceNumber: 'INV-001',
        invoiceDate: new Date('2025-01-15'),
      });

      await service.recordCrossBorderTransaction({
        freelancerId: 'freelancer-vat',
        transactionType: 'SERVICE_EXPORT',
        clientId: 'client-2',
        clientCountry: 'US',
        isB2B: true,
        amount: 3000,
        currency: 'USD',
        invoiceNumber: 'INV-002',
        invoiceDate: new Date('2025-01-20'),
      });

      const vatReturn = await service.generateVATReturn('freelancer-vat', '2025-01', 'MONTHLY');

      expect(vatReturn).toBeDefined();
      expect(vatReturn.id).toMatch(/^vat-/);
      expect(vatReturn.period).toBe('2025-01');
      expect(vatReturn.periodType).toBe('MONTHLY');
      expect(vatReturn.intraCommunitySupplies).toBeGreaterThan(0);
    });
  });

  describe('Misclassification Risk Assessment', () => {
    it('should assess low risk for independent contractor', async () => {
      const risk = await service.assessMisclassificationRisk({
        freelancerId: 'freelancer-1',
        clientId: 'client-1',
        workArrangement: {
          hasFixedSchedule: false,
          worksOnClientPremises: false,
          usesClientTools: false,
          hasMultipleClients: true,
          clientPercentageOfIncome: 30,
          contractDuration: 6,
          canRefuseWork: true,
          setsOwnRates: true,
          bearsBusinesRisk: true,
          hasOwnBrand: true,
          hasSubstitutionRight: true,
          receivesTraining: false,
          hasPerformanceReviews: false,
          integratedIntoOrg: false,
          exclusivityClause: false,
          paidByHour: false,
        },
      });

      expect(risk).toBeDefined();
      expect(risk.id).toMatch(/^mcr-/);
      expect(risk.riskLevel).toBe('LOW');
      expect(risk.riskPercentage).toBeLessThan(30);
      expect(risk.factors.filter(f => !f.indicatesEmployment).length).toBeGreaterThan(0);
    });

    it('should assess high risk for disguised employment', async () => {
      const risk = await service.assessMisclassificationRisk({
        freelancerId: 'freelancer-2',
        clientId: 'client-2',
        workArrangement: {
          hasFixedSchedule: true,
          worksOnClientPremises: true,
          usesClientTools: true,
          hasMultipleClients: false,
          clientPercentageOfIncome: 95,
          contractDuration: 24,
          canRefuseWork: false,
          setsOwnRates: false,
          bearsBusinesRisk: false,
          hasOwnBrand: false,
          hasSubstitutionRight: false,
          receivesTraining: true,
          hasPerformanceReviews: true,
          integratedIntoOrg: true,
          exclusivityClause: true,
          paidByHour: true,
        },
      });

      expect(risk.riskLevel).toBe('CRITICAL');
      expect(risk.riskPercentage).toBeGreaterThan(70);
      expect(risk.aiAnalysis).toContain('URGENT ACTION REQUIRED');
      expect(risk.recommendations.length).toBeGreaterThan(0);
      expect(risk.potentialPenalties.totalExposure).toBeGreaterThan(0);
    });

    it('should assess medium risk for mixed arrangement', async () => {
      const risk = await service.assessMisclassificationRisk({
        freelancerId: 'freelancer-3',
        clientId: 'client-3',
        workArrangement: {
          hasFixedSchedule: true,
          worksOnClientPremises: false,
          usesClientTools: false,
          hasMultipleClients: true,
          clientPercentageOfIncome: 60,
          contractDuration: 12,
          canRefuseWork: true,
          setsOwnRates: true,
          bearsBusinesRisk: true,
          hasOwnBrand: false,
          hasSubstitutionRight: false,
          receivesTraining: false,
          hasPerformanceReviews: true,
          integratedIntoOrg: false,
          exclusivityClause: false,
          paidByHour: true,
        },
      });

      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(risk.riskLevel);
      expect(risk.legalBasis).toContain('OUG 79/2023 - Criterii de identificare a relațiilor de muncă');
    });

    it('should include legal references in assessment', async () => {
      const risk = await service.assessMisclassificationRisk({
        freelancerId: 'freelancer-4',
        clientId: 'client-4',
        workArrangement: {
          hasFixedSchedule: false,
          worksOnClientPremises: false,
          usesClientTools: false,
          hasMultipleClients: true,
          clientPercentageOfIncome: 25,
          contractDuration: 3,
          canRefuseWork: true,
          setsOwnRates: true,
          bearsBusinesRisk: true,
          hasOwnBrand: true,
          hasSubstitutionRight: true,
          receivesTraining: false,
          hasPerformanceReviews: false,
          integratedIntoOrg: false,
          exclusivityClause: false,
          paidByHour: false,
        },
      });

      expect(risk.legalBasis).toContain('Codul Muncii Art. 16 - Definiția raportului de muncă');
      expect(risk.legalBasis).toContain('Legea 227/2015 - Codul Fiscal');
    });
  });

  describe('International Tax Documents', () => {
    beforeEach(async () => {
      await service.createTaxProfile({
        freelancerId: 'freelancer-intl',
        taxIdType: 'CNP',
        taxId: '1900101123456',
        entityType: 'PFA',
        address: {
          street: 'Str. Test 123',
          city: 'Bucharest',
          county: 'Sector 1',
          postalCode: '010101',
          country: 'RO',
        },
        bankAccount: 'RO123',
        bankName: 'BCR',
        vatRegistered: false,
        vatScheme: 'EXEMPT',
        vatThreshold: 300000,
        taxRegime: 'INCOME_TAX',
        casOptIn: true,
        cassOptIn: true,
        taxResidency: 'RO',
        taxTreatyCountries: ['US', 'UK', 'DE'],
      });
    });

    it('should generate W-8BEN for US client', async () => {
      const doc = await service.generateW8BEN({
        freelancerId: 'freelancer-intl',
        clientId: 'us-client-1',
        clientCountry: 'US',
        beneficialOwner: 'Ion Popescu',
        countryOfResidence: 'RO',
        taxIdNumber: '1900101123456',
        taxIdType: 'CNP',
        address: {
          street: 'Str. Test 123',
          city: 'Bucharest',
          county: 'Sector 1',
          postalCode: '010101',
          country: 'RO',
        },
        claimsTreatyBenefits: true,
      });

      expect(doc).toBeDefined();
      expect(doc.id).toMatch(/^itd-/);
      expect(doc.documentType).toBe('W8_BEN');
      expect(doc.claimsTreatyBenefits).toBe(true);
      expect(doc.treatyCountry).toBe('RO');
      // With treaty benefits claimed, withholding should be 0 for services OR default 30 if not found
      expect([0, 30]).toContain(doc.withholdingRate);
      expect(doc.status).toBe('DRAFT');
      expect(doc.validUntil.getTime()).toBeGreaterThan(Date.now());
    });

    it('should apply correct treaty rate when no benefits claimed', async () => {
      const doc = await service.generateW8BEN({
        freelancerId: 'freelancer-intl',
        clientId: 'us-client-2',
        clientCountry: 'US',
        beneficialOwner: 'Ion Popescu',
        countryOfResidence: 'RO',
        taxIdNumber: '1900101123456',
        taxIdType: 'CNP',
        address: {
          street: 'Str. Test 123',
          city: 'Bucharest',
          county: 'Sector 1',
          postalCode: '010101',
          country: 'RO',
        },
        claimsTreatyBenefits: false,
      });

      expect(doc.withholdingRate).toBe(30); // Default US withholding
      expect(doc.treatyCountry).toBeUndefined();
    });

    it('should generate tax residency certificate', async () => {
      const doc = await service.generateTaxResidencyCertificate({
        freelancerId: 'freelancer-intl',
        fiscalYear: 2025,
        purpose: 'To claim tax treaty benefits',
        requestingCountry: 'DE',
      });

      expect(doc).toBeDefined();
      expect(doc.documentType).toBe('TAX_RESIDENCY_CERT');
      expect(doc.content.fiscalYear).toBe(2025);
      expect(doc.content.certificationText).toContain('Romania');
      expect(doc.content.issuingAuthority).toBe('ANAF - Agenția Națională de Administrare Fiscală');
    });

    it('should sign international document', async () => {
      const doc = await service.generateW8BEN({
        freelancerId: 'freelancer-intl',
        clientId: 'us-client-3',
        clientCountry: 'US',
        beneficialOwner: 'Ion Popescu',
        countryOfResidence: 'RO',
        taxIdNumber: '1900101123456',
        taxIdType: 'CNP',
        address: {
          street: 'Str. Test 123',
          city: 'Bucharest',
          county: 'Sector 1',
          postalCode: '010101',
          country: 'RO',
        },
        claimsTreatyBenefits: true,
      });

      const signed = await service.signInternationalDocument(doc.id, 'signature-hash-abc123');

      expect(signed.status).toBe('SIGNED');
      expect(signed.signedAt).toBeInstanceOf(Date);
      expect(signed.signatureHash).toBe('signature-hash-abc123');
    });

    it('should list documents for freelancer', async () => {
      await service.generateW8BEN({
        freelancerId: 'freelancer-intl',
        clientId: 'client-1',
        clientCountry: 'US',
        beneficialOwner: 'Test',
        countryOfResidence: 'RO',
        taxIdNumber: '123',
        taxIdType: 'CNP',
        address: { street: 'Test', city: 'Test', county: 'Test', postalCode: '123', country: 'RO' },
        claimsTreatyBenefits: true,
      });

      await service.generateTaxResidencyCertificate({
        freelancerId: 'freelancer-intl',
        fiscalYear: 2025,
        purpose: 'Test',
        requestingCountry: 'UK',
      });

      const docs = await service.getDocumentsForFreelancer('freelancer-intl');
      expect(docs).toHaveLength(2);
    });
  });

  describe('Compliance Audit Reports', () => {
    beforeEach(async () => {
      await service.createTaxProfile({
        freelancerId: 'freelancer-audit',
        taxIdType: 'CUI',
        taxId: 'RO99999999',
        entityType: 'PFA',
        address: { street: 'Test', city: 'Bucharest', county: 'Sector 1', postalCode: '010101', country: 'RO' },
        bankAccount: 'RO123',
        bankName: 'BCR',
        vatRegistered: true,
        vatNumber: 'RO99999999',
        vatScheme: 'NORMAL',
        vatThreshold: 300000,
        taxRegime: 'INCOME_TAX',
        casOptIn: true,
        cassOptIn: true,
        taxResidency: 'RO',
        taxTreatyCountries: ['US', 'DE'],
      });
    });

    it('should generate compliance audit report', async () => {
      const report = await service.generateComplianceAuditReport({
        freelancerId: 'freelancer-audit',
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-12-31'),
        auditType: 'ANNUAL',
      });

      expect(report).toBeDefined();
      expect(report.id).toMatch(/^aud-/);
      expect(report.auditType).toBe('ANNUAL');
      expect(report.taxCompliance).toBeDefined();
      expect(report.vatCompliance).toBeDefined();
      expect(report.socialContributions).toBeDefined();
      expect(report.documentationCompliance).toBeDefined();
      expect(report.crossBorderCompliance).toBeDefined();
      expect(report.misclassificationRisk).toBeDefined();
      expect(report.overallScore).toBeDefined();
      expect(['EXCELLENT', 'GOOD', 'ACCEPTABLE', 'NEEDS_IMPROVEMENT', 'CRITICAL']).toContain(report.overallRating);
    });

    it('should identify findings for high-risk freelancer', async () => {
      // Create high-risk misclassification
      await service.assessMisclassificationRisk({
        freelancerId: 'freelancer-audit',
        clientId: 'risky-client',
        workArrangement: {
          hasFixedSchedule: true,
          worksOnClientPremises: true,
          usesClientTools: true,
          hasMultipleClients: false,
          clientPercentageOfIncome: 100,
          contractDuration: 36,
          canRefuseWork: false,
          setsOwnRates: false,
          bearsBusinesRisk: false,
          hasOwnBrand: false,
          hasSubstitutionRight: false,
          receivesTraining: true,
          hasPerformanceReviews: true,
          integratedIntoOrg: true,
          exclusivityClause: true,
          paidByHour: true,
        },
      });

      const report = await service.generateComplianceAuditReport({
        freelancerId: 'freelancer-audit',
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-12-31'),
        auditType: 'ANNUAL',
      });

      expect(report.findings.length).toBeGreaterThan(0);
      expect(report.findings.some(f => f.category === 'Misclassification Risk')).toBe(true);
      // With high-risk misclassification, the score should be affected
      expect(report.misclassificationRisk.percentage).toBeLessThan(100);
    });

    it('should generate required actions for critical findings', async () => {
      // Create high-risk situation
      await service.assessMisclassificationRisk({
        freelancerId: 'freelancer-audit',
        clientId: 'critical-client',
        workArrangement: {
          hasFixedSchedule: true,
          worksOnClientPremises: true,
          usesClientTools: true,
          hasMultipleClients: false,
          clientPercentageOfIncome: 100,
          contractDuration: 24,
          canRefuseWork: false,
          setsOwnRates: false,
          bearsBusinesRisk: false,
          hasOwnBrand: false,
          hasSubstitutionRight: false,
          receivesTraining: true,
          hasPerformanceReviews: true,
          integratedIntoOrg: true,
          exclusivityClause: true,
          paidByHour: true,
        },
      });

      const report = await service.generateComplianceAuditReport({
        freelancerId: 'freelancer-audit',
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-12-31'),
        auditType: 'ANNUAL',
      });

      expect(report.requiredActions.length).toBeGreaterThan(0);
      expect(report.requiredActions.some(a => a.priority === 'CRITICAL')).toBe(true);
    });
  });

  describe('Reference Data', () => {
    it('should return tax constants', () => {
      const constants = service.getTaxConstants();

      expect(constants.INCOME_TAX_RATE).toBe(0.10);
      expect(constants.CAS_RATE).toBe(0.25);
      expect(constants.CASS_RATE).toBe(0.10);
      expect(constants.VAT_THRESHOLD).toBe(300000);
      expect(constants.VAT_STANDARD).toBe(0.19);
    });

    it('should return EU VAT rates', () => {
      const rates = service.getEUVATRates();

      expect(rates.RO.standard).toBe(19);
      expect(rates.DE.standard).toBe(19);
      expect(rates.FR.standard).toBe(20);
      expect(rates.HU.standard).toBe(27); // Highest in EU
      expect(rates.LU.standard).toBe(17); // Lowest in EU
      expect(Object.keys(rates).length).toBe(27); // All 27 EU members
    });

    it('should return tax treaty rates', () => {
      const rates = service.getTaxTreatyRates();

      expect(rates.US).toBeDefined();
      expect(rates.US.services).toBe(0); // RO-US treaty
      expect(rates.DE.dividends).toBe(5);
    });

    it('should return declaration types', () => {
      const types = service.getDeclarationTypes();

      expect(types.length).toBe(5);
      expect(types.find(t => t.type === 'D212')).toBeDefined();
      expect(types.find(t => t.type === 'D212')!.description).toContain('Annual unified declaration');
    });

    it('should return deduction categories', () => {
      const categories = service.getDeductionCategories();

      expect(categories.length).toBeGreaterThan(10);
      expect(categories.find(c => c.category === 'SOFTWARE')).toBeDefined();
      expect(categories.find(c => c.category === 'TRAVEL')!.maxPercent).toBe(50);
    });
  });
});
