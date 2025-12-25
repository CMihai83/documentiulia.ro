import { Test, TestingModule } from '@nestjs/testing';
import { HRContractsService } from './hr-contracts.service';
import { ContractGeneratorService, ContractTemplateCategory } from './contract-generator.service';
import { RevisalService, RevisalOperationType, RevisalSubmissionStatus } from './revisal.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { HRContractType, HRContractStatus } from '@prisma/client';

describe('HR Contracts Module', () => {
  let hrContractsService: HRContractsService;
  let contractGenerator: ContractGeneratorService;
  let revisalService: RevisalService;
  let prismaService: PrismaService;
  let configService: ConfigService;

  const mockPrismaService = {
    employee: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    hRContract: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    hRContractAmendment: {
      create: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        COMPANY_CUI: '34167616',
        COMPANY_NAME: 'S.C. Document & Iulia S.R.L.',
        VAPID_PUBLIC_KEY: 'test-vapid-key',
        DOCUSIGN_API_KEY: 'test-docusign-key',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HRContractsService,
        ContractGeneratorService,
        RevisalService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    hrContractsService = module.get<HRContractsService>(HRContractsService);
    contractGenerator = module.get<ContractGeneratorService>(ContractGeneratorService);
    revisalService = module.get<RevisalService>(RevisalService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ContractGeneratorService', () => {
    describe('getTemplates', () => {
      it('should return all active templates', () => {
        const templates = contractGenerator.getTemplates();
        expect(templates.length).toBeGreaterThan(0);
        expect(templates.every(t => t.active)).toBe(true);
      });

      it('should filter templates by category', () => {
        const templates = contractGenerator.getTemplates(ContractTemplateCategory.CIM);
        expect(templates.every(t => t.category === ContractTemplateCategory.CIM)).toBe(true);
      });

      it('should filter templates by locale', () => {
        const templates = contractGenerator.getTemplates(undefined, 'ro');
        expect(templates.every(t => t.locale === 'ro')).toBe(true);
      });

      it('should filter by both category and locale', () => {
        const templates = contractGenerator.getTemplates(ContractTemplateCategory.CIM, 'ro');
        expect(templates.every(t => t.category === ContractTemplateCategory.CIM && t.locale === 'ro')).toBe(true);
      });
    });

    describe('getTemplate', () => {
      it('should return a specific template by ID', () => {
        const template = contractGenerator.getTemplate('tpl-cim-standard');
        expect(template).toBeDefined();
        expect(template.id).toBe('tpl-cim-standard');
        expect(template.name).toContain('Contract Individual');
      });

      it('should throw NotFoundException for non-existent template', () => {
        expect(() => contractGenerator.getTemplate('non-existent')).toThrow(NotFoundException);
      });

      it('should include clauses in template', () => {
        const template = contractGenerator.getTemplate('tpl-cim-standard');
        expect(template.clauses).toBeDefined();
        expect(template.clauses.length).toBeGreaterThan(0);
      });

      it('should have legal references for compliance', () => {
        const template = contractGenerator.getTemplate('tpl-cim-standard');
        expect(template.legalReferences).toBeDefined();
        expect(template.legalReferences.length).toBeGreaterThan(0);
        expect(template.legalReferences.some(ref => ref.includes('Codul Muncii'))).toBe(true);
      });
    });

    describe('suggestClauses', () => {
      it('should suggest non-compete clause for managers', async () => {
        const suggestions = await contractGenerator.suggestClauses(HRContractType.HR_FULL_TIME, {
          position: 'Director General',
          salary: 20000,
          isManager: true,
        });

        const nonCompeteSuggestion = suggestions.find(s => s.clauseId === 'cl-noncompete');
        expect(nonCompeteSuggestion).toBeDefined();
        expect(nonCompeteSuggestion!.confidence).toBeGreaterThan(0.8);
      });

      it('should suggest non-compete for high-salary employees', async () => {
        const suggestions = await contractGenerator.suggestClauses(HRContractType.HR_FULL_TIME, {
          position: 'Senior Developer',
          salary: 18000,
          isManager: false,
        });

        const nonCompeteSuggestion = suggestions.find(s => s.clauseId === 'cl-noncompete');
        expect(nonCompeteSuggestion).toBeDefined();
      });

      it('should suggest confidentiality clause for employees with sensitive data access', async () => {
        const suggestions = await contractGenerator.suggestClauses(HRContractType.HR_FULL_TIME, {
          position: 'Data Analyst',
          salary: 8000,
          hasAccessToConfidential: true,
        });

        const confidentialitySuggestion = suggestions.find(s => s.clauseId === 'cl-confidentiality');
        expect(confidentialitySuggestion).toBeDefined();
        expect(confidentialitySuggestion!.confidence).toBeGreaterThan(0.9);
      });

      it('should suggest telework clause for remote workers', async () => {
        const suggestions = await contractGenerator.suggestClauses(HRContractType.HR_TELEWORK, {
          position: 'Remote Developer',
          salary: 10000,
          workRemotely: true,
        });

        const teleworkSuggestion = suggestions.find(s => s.clauseId === 'cl-telework');
        expect(teleworkSuggestion).toBeDefined();
        expect(teleworkSuggestion!.confidence).toBeGreaterThan(0.95);
      });

      it('should suggest equipment clause for remote workers', async () => {
        const suggestions = await contractGenerator.suggestClauses(HRContractType.HR_TELEWORK, {
          position: 'Remote Developer',
          salary: 10000,
          workRemotely: true,
        });

        const equipmentSuggestion = suggestions.find(s => s.clauseId === 'cl-equipment');
        expect(equipmentSuggestion).toBeDefined();
      });

      it('should include legal source in suggestions', async () => {
        const suggestions = await contractGenerator.suggestClauses(HRContractType.HR_FULL_TIME, {
          position: 'Manager',
          salary: 15000,
          isManager: true,
        });

        expect(suggestions.every(s => s.source && s.source.length > 0)).toBe(true);
      });
    });

    describe('generateContract', () => {
      const validContractData = {
        employerName: 'S.C. Document & Iulia S.R.L.',
        employerCui: '34167616',
        employerAddress: 'Reșița, Caraș-Severin',
        employerRepresentative: 'Ion Popescu',
        employeeName: 'Maria Ionescu',
        employeeCnp: '2900101120001',
        employeeAddress: 'Str. Victoriei 10, Reșița',
        position: 'Contabil',
        salary: 5000,
        currency: 'RON',
        workHours: 40,
        startDate: new Date('2025-01-15'),
        workLocation: 'Sediul companiei din Reșița',
      };

      it('should generate a contract from template', async () => {
        const contract = await contractGenerator.generateContract(
          'user-123',
          'tpl-cim-standard',
          'employee-456',
          validContractData,
        );

        expect(contract).toBeDefined();
        expect(contract.id).toBeDefined();
        expect(contract.templateId).toBe('tpl-cim-standard');
        expect(contract.employeeId).toBe('employee-456');
        expect(contract.status).toBe('draft');
      });

      it('should include text content in generated contract', async () => {
        const contract = await contractGenerator.generateContract(
          'user-123',
          'tpl-cim-standard',
          'employee-456',
          validContractData,
        );

        expect(contract.content).toBeDefined();
        expect(contract.content).toContain('CONTRACT INDIVIDUAL DE MUNCĂ');
        expect(contract.content).toContain(validContractData.employeeName);
        expect(contract.content).toContain(validContractData.employerName);
      });

      it('should include HTML content in generated contract', async () => {
        const contract = await contractGenerator.generateContract(
          'user-123',
          'tpl-cim-standard',
          'employee-456',
          validContractData,
        );

        expect(contract.contentHtml).toBeDefined();
        expect(contract.contentHtml).toContain('<html');
        expect(contract.contentHtml).toContain(validContractData.employeeName);
      });

      it('should include metadata in generated contract', async () => {
        const contract = await contractGenerator.generateContract(
          'user-123',
          'tpl-cim-standard',
          'employee-456',
          validContractData,
        );

        expect(contract.metadata).toBeDefined();
        expect(contract.metadata.employerName).toBe(validContractData.employerName);
        expect(contract.metadata.employeeName).toBe(validContractData.employeeName);
        expect(contract.metadata.salary).toBe(validContractData.salary);
      });

      it('should throw error for missing required fields', async () => {
        const incompleteData = { ...validContractData };
        delete (incompleteData as any).position;

        await expect(
          contractGenerator.generateContract('user-123', 'tpl-cim-standard', 'employee-456', incompleteData),
        ).rejects.toThrow(BadRequestException);
      });

      it('should enforce maximum probation period of 90 days for standard positions', async () => {
        const dataWithLongProbation = {
          ...validContractData,
          probationDays: 120, // Exceeds 90 days for non-management
        };

        await expect(
          contractGenerator.generateContract('user-123', 'tpl-cim-standard', 'employee-456', dataWithLongProbation),
        ).rejects.toThrow(BadRequestException);
      });

      it('should allow 120 days probation for management positions', async () => {
        const managerData = {
          ...validContractData,
          position: 'Director General',
          probationDays: 120,
        };

        const contract = await contractGenerator.generateContract(
          'user-123',
          'tpl-cim-standard',
          'employee-456',
          managerData,
        );

        expect(contract.metadata.probationDays).toBe(120);
      });

      it('should calculate probation end date correctly', async () => {
        const dataWithProbation = {
          ...validContractData,
          probationDays: 60,
        };

        const contract = await contractGenerator.generateContract(
          'user-123',
          'tpl-cim-standard',
          'employee-456',
          dataWithProbation,
        );

        expect(contract.metadata.probationEnd).toBeDefined();
        const expectedEnd = new Date(validContractData.startDate.getTime() + 60 * 24 * 60 * 60 * 1000);
        expect(contract.metadata.probationEnd!.getTime()).toBe(expectedEnd.getTime());
      });

      it('should handle telework clause when enabled', async () => {
        const teleworkData = {
          ...validContractData,
          telework: {
            enabled: true,
            daysPerWeek: 3,
            equipment: ['Laptop', 'Monitor'],
            expenses: 300,
            schedule: 'Luni, Miercuri, Vineri',
          },
        };

        const contract = await contractGenerator.generateContract(
          'user-123',
          'tpl-cim-standard',
          'employee-456',
          teleworkData,
        );

        expect(contract.metadata.telework).toBeDefined();
        expect(contract.metadata.telework!.enabled).toBe(true);
        expect(contract.metadata.telework!.daysPerWeek).toBe(3);
      });

      it('should handle non-compete clause when enabled', async () => {
        const nonCompeteData = {
          ...validContractData,
          nonCompete: {
            enabled: true,
            durationMonths: 12,
            geographicScope: 'România',
            compensation: 2500,
            activities: ['Consultanță contabilă', 'Audit financiar'],
          },
        };

        const contract = await contractGenerator.generateContract(
          'user-123',
          'tpl-cim-standard',
          'employee-456',
          nonCompeteData,
        );

        expect(contract.metadata.nonCompete).toBeDefined();
        expect(contract.metadata.nonCompete!.enabled).toBe(true);
        expect(contract.metadata.nonCompete!.durationMonths).toBe(12);
      });
    });

    describe('validateContract', () => {
      it('should validate contract against minimum wage', async () => {
        const contract = await contractGenerator.generateContract(
          'user-123',
          'tpl-cim-standard',
          'employee-456',
          {
            employerName: 'Test Company',
            employerCui: '12345678',
            employerAddress: 'Test Address',
            employerRepresentative: 'Test Rep',
            employeeName: 'Test Employee',
            employeeCnp: '1900101120012',
            employeeAddress: 'Test Employee Address',
            position: 'Worker',
            salary: 2000, // Below minimum wage
            startDate: new Date(),
            workLocation: 'Test Location',
          },
        );

        const validation = contractGenerator.validateContract(contract);
        expect(validation.valid).toBe(false);
        expect(validation.errors.some(e => e.includes('sub salariul minim'))).toBe(true);
      });

      it('should validate CNP format', async () => {
        const contract = await contractGenerator.generateContract(
          'user-123',
          'tpl-cim-standard',
          'employee-456',
          {
            employerName: 'Test Company',
            employerCui: '12345678',
            employerAddress: 'Test Address',
            employerRepresentative: 'Test Rep',
            employeeName: 'Test Employee',
            employeeCnp: '1234567890123', // Invalid CNP
            employeeAddress: 'Test Employee Address',
            position: 'Worker',
            salary: 5000,
            startDate: new Date(),
            workLocation: 'Test Location',
          },
        );

        const validation = contractGenerator.validateContract(contract);
        expect(validation.errors.some(e => e.includes('CNP'))).toBe(true);
      });

      it('should warn about long non-compete duration', async () => {
        const contract = await contractGenerator.generateContract(
          'user-123',
          'tpl-cim-standard',
          'employee-456',
          {
            employerName: 'Test Company',
            employerCui: '12345678',
            employerAddress: 'Test Address',
            employerRepresentative: 'Test Rep',
            employeeName: 'Test Employee',
            employeeCnp: '1900101120012',
            employeeAddress: 'Test Employee Address',
            position: 'Manager',
            salary: 15000,
            startDate: new Date(),
            workLocation: 'Test Location',
            nonCompete: {
              enabled: true,
              durationMonths: 36,
              geographicScope: 'Romania',
              compensation: 3000,
              activities: ['Test'],
            },
          },
        );

        const validation = contractGenerator.validateContract(contract);
        expect(validation.warnings.some(w => w.includes('neconcurență'))).toBe(true);
      });
    });

    describe('requestSignature', () => {
      it('should create signature request', async () => {
        const contract = await contractGenerator.generateContract(
          'user-123',
          'tpl-cim-standard',
          'employee-456',
          {
            employerName: 'Test Company',
            employerCui: '12345678',
            employerAddress: 'Test Address',
            employerRepresentative: 'Test Rep',
            employeeName: 'Test Employee',
            employeeCnp: '1900101120012',
            employeeAddress: 'Test Employee Address',
            position: 'Developer',
            salary: 8000,
            startDate: new Date(),
            workLocation: 'Test Location',
          },
        );

        const signatureRequest = await contractGenerator.requestSignature(
          contract.id,
          'employer',
          'employer@test.com',
          'internal',
        );

        expect(signatureRequest).toBeDefined();
        expect(signatureRequest.signerType).toBe('employer');
        expect(signatureRequest.signerEmail).toBe('employer@test.com');
        expect(signatureRequest.status).toBe('pending');
      });

      it('should update contract status to pending_signature', async () => {
        const contract = await contractGenerator.generateContract(
          'user-123',
          'tpl-cim-standard',
          'employee-456',
          {
            employerName: 'Test Company',
            employerCui: '12345678',
            employerAddress: 'Test Address',
            employerRepresentative: 'Test Rep',
            employeeName: 'Test Employee',
            employeeCnp: '1900101120012',
            employeeAddress: 'Test Employee Address',
            position: 'Developer',
            salary: 8000,
            startDate: new Date(),
            workLocation: 'Test Location',
          },
        );

        await contractGenerator.requestSignature(contract.id, 'employer', 'test@test.com', 'internal');
        const updatedContract = contractGenerator.getGeneratedContract(contract.id);

        expect(updatedContract.status).toBe('pending_signature');
      });
    });

    describe('getStatistics', () => {
      it('should return statistics', () => {
        const stats = contractGenerator.getStatistics();

        expect(stats).toBeDefined();
        expect(stats.totalTemplates).toBeGreaterThan(0);
        expect(typeof stats.totalGenerated).toBe('number');
        expect(stats.byStatus).toBeDefined();
        expect(stats.byTemplate).toBeDefined();
      });
    });
  });

  describe('RevisalService', () => {
    // Valid Romanian CNP (passes checksum validation)
    const validEmployeeData = {
      cnp: '1850101221145',
      nume: 'Popescu',
      prenume: 'Ion',
      dataNastere: new Date('1990-01-01'),
      locNastere: 'București',
      cetatenie: 'Română',
      adresa: 'Str. Victoriei 10, București',
      actIdentitate: {
        tip: 'CI' as const,
        serie: 'RD',
        numar: '123456',
        dataEliberare: new Date('2020-01-01'),
        dataExpirare: new Date('2030-01-01'),
      },
      studii: {
        nivel: 'UNIVERSITAR' as const,
        specializare: 'Contabilitate',
      },
    };

    const validContractData = {
      numarContract: 'CIM-001',
      dataContract: new Date('2025-01-15'),
      tipContract: 'NEDETERMINAT' as const,
      dataInceput: new Date('2025-01-15'),
      functie: 'Contabil',
      codCOR: '241101',
      salariu: 5000,
      norma: 40,
      locMunca: 'București',
      conditiiMunca: 'NORMALE' as const,
    };

    describe('createSubmission', () => {
      it('should create a REVISAL submission', async () => {
        const submission = await revisalService.createSubmission(
          'user-123',
          'employee-456',
          'contract-789',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          validContractData,
        );

        expect(submission).toBeDefined();
        expect(submission.id).toBeDefined();
        expect(submission.operationType).toBe(RevisalOperationType.ANGAJARE);
        expect(submission.status).toBe(RevisalSubmissionStatus.DRAFT);
      });

      it('should include employee data in submission', async () => {
        const submission = await revisalService.createSubmission(
          'user-123',
          'employee-456',
          'contract-789',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          validContractData,
        );

        expect(submission.employeeData.cnp).toBe(validEmployeeData.cnp);
        expect(submission.employeeData.nume).toBe(validEmployeeData.nume);
      });

      it('should include contract data in submission', async () => {
        const submission = await revisalService.createSubmission(
          'user-123',
          'employee-456',
          'contract-789',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          validContractData,
        );

        expect(submission.contractData.salariu).toBe(validContractData.salariu);
        expect(submission.contractData.codCOR).toBe(validContractData.codCOR);
      });

      it('should track changes for modification operations', async () => {
        const changes = {
          salariu: { old: 5000, new: 6000 },
        };

        const submission = await revisalService.createSubmission(
          'user-123',
          'employee-456',
          'contract-789',
          RevisalOperationType.MODIFICARE_SALARIU,
          validEmployeeData,
          validContractData,
          changes,
        );

        expect(submission.changes).toBeDefined();
        expect(submission.changes!.salariu.old).toBe(5000);
        expect(submission.changes!.salariu.new).toBe(6000);
      });
    });

    describe('validateSubmission', () => {
      it('should validate CNP', async () => {
        const invalidEmployee = { ...validEmployeeData, cnp: 'invalid-cnp' };

        const submission = await revisalService.createSubmission(
          'user-123',
          'employee-456',
          'contract-789',
          RevisalOperationType.ANGAJARE,
          invalidEmployee,
          validContractData,
        );

        const result = await revisalService.validateSubmission(submission.id);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('CNP'))).toBe(true);
      });

      it('should validate COR code format', async () => {
        const invalidContract = { ...validContractData, codCOR: 'invalid' };

        const submission = await revisalService.createSubmission(
          'user-123',
          'employee-456',
          'contract-789',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          invalidContract,
        );

        const result = await revisalService.validateSubmission(submission.id);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('COR'))).toBe(true);
      });

      it('should validate salary against minimum wage', async () => {
        const lowSalaryContract = { ...validContractData, salariu: 2000 };

        const submission = await revisalService.createSubmission(
          'user-123',
          'employee-456',
          'contract-789',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          lowSalaryContract,
        );

        const result = await revisalService.validateSubmission(submission.id);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('minim'))).toBe(true);
      });

      it('should validate fixed-term contract has end date', async () => {
        const fixedTermContract = { ...validContractData, tipContract: 'DETERMINAT' as const };

        const submission = await revisalService.createSubmission(
          'user-123',
          'employee-456',
          'contract-789',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          fixedTermContract,
        );

        const result = await revisalService.validateSubmission(submission.id);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('durată determinată'))).toBe(true);
      });

      it('should validate fixed-term contract duration (max 36 months)', async () => {
        const longFixedTermContract = {
          ...validContractData,
          tipContract: 'DETERMINAT' as const,
          dataSfarsit: new Date('2029-01-15'), // 4 years
        };

        const submission = await revisalService.createSubmission(
          'user-123',
          'employee-456',
          'contract-789',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          longFixedTermContract,
        );

        const result = await revisalService.validateSubmission(submission.id);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('36 luni'))).toBe(true);
      });

      it('should validate work hours (max 48)', async () => {
        const excessiveHoursContract = { ...validContractData, norma: 50 };

        const submission = await revisalService.createSubmission(
          'user-123',
          'employee-456',
          'contract-789',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          excessiveHoursContract,
        );

        const result = await revisalService.validateSubmission(submission.id);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('48 ore'))).toBe(true);
      });

      it('should warn about expired identity document', async () => {
        const expiredIdEmployee = {
          ...validEmployeeData,
          actIdentitate: {
            ...validEmployeeData.actIdentitate,
            dataExpirare: new Date('2020-01-01'), // Expired
          },
        };

        const submission = await revisalService.createSubmission(
          'user-123',
          'employee-456',
          'contract-789',
          RevisalOperationType.ANGAJARE,
          expiredIdEmployee,
          validContractData,
        );

        const result = await revisalService.validateSubmission(submission.id);
        expect(result.warnings.some(w => w.includes('expirat'))).toBe(true);
      });

      it('should update status to VALIDATED on success', async () => {
        const submission = await revisalService.createSubmission(
          'user-123',
          'employee-456',
          'contract-789',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          validContractData,
        );

        await revisalService.validateSubmission(submission.id);
        const updated = revisalService.getSubmission(submission.id);

        expect(updated.status).toBe(RevisalSubmissionStatus.VALIDATED);
      });
    });

    describe('submitToRevisal', () => {
      it('should require validation before submission', async () => {
        const submission = await revisalService.createSubmission(
          'user-123',
          'employee-456',
          'contract-789',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          validContractData,
        );

        await expect(revisalService.submitToRevisal(submission.id)).rejects.toThrow(BadRequestException);
      });

      it('should generate XML content on submission', async () => {
        const submission = await revisalService.createSubmission(
          'user-123',
          'employee-456',
          'contract-789',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          validContractData,
        );

        await revisalService.validateSubmission(submission.id);
        const submitted = await revisalService.submitToRevisal(submission.id);

        expect(submitted.xmlContent).toBeDefined();
        expect(submitted.xmlContent).toContain('<?xml');
        expect(submitted.xmlContent).toContain('REVISAL');
        expect(submitted.xmlContent).toContain(validEmployeeData.cnp);
      });

      it('should generate REVISAL ID on submission', async () => {
        const submission = await revisalService.createSubmission(
          'user-123',
          'employee-456',
          'contract-789',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          validContractData,
        );

        await revisalService.validateSubmission(submission.id);
        const submitted = await revisalService.submitToRevisal(submission.id);

        expect(submitted.revisalId).toBeDefined();
        expect(submitted.receiptNumber).toBeDefined();
      });

      it('should update status to PENDING/SUBMITTED', async () => {
        const submission = await revisalService.createSubmission(
          'user-123',
          'employee-456',
          'contract-789',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          validContractData,
        );

        await revisalService.validateSubmission(submission.id);
        const submitted = await revisalService.submitToRevisal(submission.id);

        expect([RevisalSubmissionStatus.PENDING, RevisalSubmissionStatus.SUBMITTED]).toContain(submitted.status);
      });

      it('should record submission timestamp', async () => {
        const submission = await revisalService.createSubmission(
          'user-123',
          'employee-456',
          'contract-789',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          validContractData,
        );

        await revisalService.validateSubmission(submission.id);
        const submitted = await revisalService.submitToRevisal(submission.id);

        expect(submitted.submittedAt).toBeDefined();
        expect(submitted.submittedAt instanceof Date).toBe(true);
      });
    });

    describe('getCORCodes', () => {
      it('should return COR codes mapping', () => {
        const codes = revisalService.getCORCodes();

        expect(codes).toBeDefined();
        expect(codes['Contabil']).toBe('241101');
        expect(codes['Programator']).toBe('251201');
        expect(codes['Director General']).toBe('112001');
      });

      it('should return default code for unknown position', () => {
        const code = revisalService.getCORCode('Unknown Position');
        expect(code).toBeDefined();
        expect(code).toBe('961101'); // Default to unskilled worker
      });
    });

    describe('generateD112', () => {
      beforeEach(() => {
        mockPrismaService.employee.findMany.mockResolvedValue([
          {
            id: 'emp-1',
            firstName: 'Ion',
            lastName: 'Popescu',
            cnp: '1900101120012',
            status: 'ACTIVE',
            hrContracts: [{ salary: 5000, status: 'ACTIVE' }],
          },
          {
            id: 'emp-2',
            firstName: 'Maria',
            lastName: 'Ionescu',
            cnp: '2850615120012',
            status: 'ACTIVE',
            hrContracts: [{ salary: 6000, status: 'ACTIVE' }],
          },
        ]);
      });

      it('should generate D112 declaration', async () => {
        const declaration = await revisalService.generateD112('user-123', 12, 2025);

        expect(declaration).toBeDefined();
        expect(declaration.id).toBeDefined();
        expect(declaration.month).toBe(12);
        expect(declaration.year).toBe(2025);
      });

      it('should calculate employee contributions', async () => {
        const declaration = await revisalService.generateD112('user-123', 12, 2025);

        expect(declaration.employees.length).toBe(2);
        expect(declaration.employees[0].cas).toBe(5000 * 0.25); // 25% CAS
        expect(declaration.employees[0].cass).toBe(5000 * 0.10); // 10% CASS
      });

      it('should calculate total contributions', async () => {
        const declaration = await revisalService.generateD112('user-123', 12, 2025);

        expect(declaration.totalContributions.cas).toBe((5000 + 6000) * 0.25);
        expect(declaration.totalContributions.cass).toBe((5000 + 6000) * 0.10);
        expect(declaration.totalContributions.cam).toBe((5000 + 6000) * 0.0225);
      });

      it('should generate XML for D112', async () => {
        const declaration = await revisalService.generateD112('user-123', 12, 2025);

        expect(declaration.xmlContent).toBeDefined();
        expect(declaration.xmlContent).toContain('<?xml');
        expect(declaration.xmlContent).toContain('D112');
        expect(declaration.xmlContent).toContain('TOTALURI');
      });
    });

    describe('getStatistics', () => {
      it('should return submission statistics', async () => {
        await revisalService.createSubmission(
          'user-123',
          'emp-1',
          'contract-1',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          validContractData,
        );

        const stats = revisalService.getStatistics('user-123');

        expect(stats).toBeDefined();
        expect(stats.totalSubmissions).toBeGreaterThan(0);
        expect(stats.byStatus).toBeDefined();
        expect(stats.byOperation).toBeDefined();
      });
    });
  });

  describe('HRContractsService', () => {
    describe('create', () => {
      it('should create a new HR contract', async () => {
        const mockEmployee = { id: 'emp-1', userId: 'user-123', firstName: 'Ion', lastName: 'Popescu' };
        mockPrismaService.employee.findFirst.mockResolvedValue(mockEmployee);
        mockPrismaService.hRContract.findFirst.mockResolvedValue(null);
        mockPrismaService.hRContract.create.mockResolvedValue({
          id: 'contract-1',
          userId: 'user-123',
          employeeId: 'emp-1',
          type: HRContractType.HR_FULL_TIME,
          status: HRContractStatus.DRAFT,
          employee: mockEmployee,
        });

        const result = await hrContractsService.create('user-123', {
          employeeId: 'emp-1',
          type: HRContractType.HR_FULL_TIME,
          startDate: '2025-01-15',
          salary: 5000,
          position: 'Developer',
        });

        expect(result).toBeDefined();
        expect(result.status).toBe(HRContractStatus.DRAFT);
      });

      it('should throw error if employee not found', async () => {
        mockPrismaService.employee.findFirst.mockResolvedValue(null);

        await expect(
          hrContractsService.create('user-123', {
            employeeId: 'non-existent',
            type: HRContractType.HR_FULL_TIME,
            startDate: '2025-01-15',
            salary: 5000,
            position: 'Developer',
          }),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw error if employee has active contract', async () => {
        mockPrismaService.employee.findFirst.mockResolvedValue({ id: 'emp-1' });
        mockPrismaService.hRContract.findFirst.mockResolvedValue({ id: 'existing-contract' });

        await expect(
          hrContractsService.create('user-123', {
            employeeId: 'emp-1',
            type: HRContractType.HR_FULL_TIME,
            startDate: '2025-01-15',
            salary: 5000,
            position: 'Developer',
          }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('findAll', () => {
      it('should return paginated contracts', async () => {
        mockPrismaService.hRContract.findMany.mockResolvedValue([]);
        mockPrismaService.hRContract.count.mockResolvedValue(0);

        const result = await hrContractsService.findAll('user-123', { page: 1, limit: 10 });

        expect(result).toBeDefined();
        expect(result.data).toBeDefined();
        expect(result.meta).toBeDefined();
        expect(result.meta.page).toBe(1);
        expect(result.meta.limit).toBe(10);
      });

      it('should filter by status', async () => {
        mockPrismaService.hRContract.findMany.mockResolvedValue([]);
        mockPrismaService.hRContract.count.mockResolvedValue(0);

        await hrContractsService.findAll('user-123', { status: HRContractStatus.ACTIVE });

        expect(mockPrismaService.hRContract.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ status: HRContractStatus.ACTIVE }),
          }),
        );
      });
    });

    describe('getStatistics', () => {
      it('should return contract statistics', async () => {
        mockPrismaService.hRContract.count.mockResolvedValue(10);
        mockPrismaService.hRContract.findMany.mockResolvedValue([]);

        const stats = await hrContractsService.getStatistics('user-123');

        expect(stats).toBeDefined();
        expect(stats.total).toBe(10);
        expect(stats.byStatus).toBeDefined();
      });
    });
  });
});
