import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  ContractGeneratorService,
  ContractTemplateCategory,
} from './contract-generator.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ContractGeneratorService', () => {
  let service: ContractGeneratorService;

  const mockPrismaService = {
    hRContract: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(null),
  };

  const validContractData = {
    employerName: 'SC DocumentIulia SRL',
    employerCui: 'RO12345678',
    employerAddress: 'Str. Exemplu Nr. 10, București',
    employerRepresentative: 'Ion Popescu',
    employeeName: 'Maria Ionescu',
    employeeCnp: '1850101410014', // Valid Romanian CNP with correct checksum
    employeeAddress: 'Str. Test Nr. 5, Cluj-Napoca',
    position: 'Dezvoltator Software',
    department: 'IT',
    salary: 8000,
    currency: 'RON',
    workHours: 40,
    startDate: new Date('2025-02-01'),
    workLocation: 'București, sediul central',
    workSchedule: 'Luni-Vineri 09:00-18:00',
    probationDays: 90,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractGeneratorService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ContractGeneratorService>(ContractGeneratorService);
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize templates on construction', () => {
      const templates = service.getTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });
  });

  describe('Template Management', () => {
    describe('getTemplates', () => {
      it('should return all active templates', () => {
        const templates = service.getTemplates();

        expect(templates.length).toBeGreaterThan(0);
        templates.forEach(t => expect(t.active).toBe(true));
      });

      it('should filter by category', () => {
        const cimTemplates = service.getTemplates(ContractTemplateCategory.CIM);

        expect(cimTemplates.length).toBeGreaterThan(0);
        cimTemplates.forEach(t => expect(t.category).toBe(ContractTemplateCategory.CIM));
      });

      it('should filter by locale', () => {
        const roTemplates = service.getTemplates(undefined, 'ro');

        expect(roTemplates.length).toBeGreaterThan(0);
        roTemplates.forEach(t => expect(t.locale).toBe('ro'));
      });

      it('should filter by both category and locale', () => {
        const templates = service.getTemplates(ContractTemplateCategory.PART_TIME, 'ro');

        templates.forEach(t => {
          expect(t.category).toBe(ContractTemplateCategory.PART_TIME);
          expect(t.locale).toBe('ro');
        });
      });
    });

    describe('getTemplate', () => {
      it('should return template by ID', () => {
        const template = service.getTemplate('tpl-cim-standard');

        expect(template).toBeDefined();
        expect(template.id).toBe('tpl-cim-standard');
      });

      it('should throw NotFoundException for invalid template ID', () => {
        expect(() => service.getTemplate('non-existent')).toThrow(NotFoundException);
      });

      it('should return template with clauses', () => {
        const template = service.getTemplate('tpl-cim-standard');

        expect(template.clauses).toBeDefined();
        expect(template.clauses.length).toBeGreaterThan(0);
      });

      it('should return template with required fields', () => {
        const template = service.getTemplate('tpl-cim-standard');

        expect(template.requiredFields).toBeDefined();
        expect(template.requiredFields.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Template Categories', () => {
    it('should have CIM template', () => {
      const templates = service.getTemplates(ContractTemplateCategory.CIM);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have Part-Time template', () => {
      const templates = service.getTemplates(ContractTemplateCategory.PART_TIME);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have Fixed-Term template', () => {
      const templates = service.getTemplates(ContractTemplateCategory.FIXED_TERM);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have Telework template', () => {
      const templates = service.getTemplates(ContractTemplateCategory.TELEWORK);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have Management template', () => {
      const templates = service.getTemplates(ContractTemplateCategory.MANAGEMENT);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have Internship template', () => {
      const templates = service.getTemplates(ContractTemplateCategory.INTERNSHIP);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have Amendment template', () => {
      const templates = service.getTemplates(ContractTemplateCategory.AMENDMENT);
      expect(templates.length).toBeGreaterThan(0);
    });
  });

  describe('AI Clause Suggestions', () => {
    it('should suggest non-compete clause for managers', async () => {
      const suggestions = await service.suggestClauses('FULL_TIME' as any, {
        position: 'Director IT',
        salary: 20000,
        isManager: true,
      });

      const nonCompeteSuggestion = suggestions.find(s => s.clauseId === 'cl-noncompete');
      expect(nonCompeteSuggestion).toBeDefined();
    });

    it('should suggest non-compete clause for high-salary employees', async () => {
      const suggestions = await service.suggestClauses('FULL_TIME' as any, {
        position: 'Consultant Senior',
        salary: 18000,
        isManager: false,
      });

      const nonCompeteSuggestion = suggestions.find(s => s.clauseId === 'cl-noncompete');
      expect(nonCompeteSuggestion).toBeDefined();
    });

    it('should suggest confidentiality clause for confidential access', async () => {
      const suggestions = await service.suggestClauses('FULL_TIME' as any, {
        position: 'Analist Date',
        salary: 8000,
        hasAccessToConfidential: true,
      });

      const confidentialitySuggestion = suggestions.find(s => s.clauseId === 'cl-confidentiality');
      expect(confidentialitySuggestion).toBeDefined();
    });

    it('should suggest telework clause for remote workers', async () => {
      const suggestions = await service.suggestClauses('FULL_TIME' as any, {
        position: 'Developer',
        salary: 10000,
        workRemotely: true,
      });

      const teleworkSuggestion = suggestions.find(s => s.clauseId === 'cl-telework');
      expect(teleworkSuggestion).toBeDefined();
    });

    it('should suggest equipment clause for remote workers', async () => {
      const suggestions = await service.suggestClauses('FULL_TIME' as any, {
        position: 'Developer',
        salary: 10000,
        workRemotely: true,
      });

      const equipmentSuggestion = suggestions.find(s => s.clauseId === 'cl-equipment');
      expect(equipmentSuggestion).toBeDefined();
    });

    it('should suggest performance bonus for managers', async () => {
      const suggestions = await service.suggestClauses('FULL_TIME' as any, {
        position: 'Manager Vânzări',
        salary: 15000,
        isManager: true,
      });

      const bonusSuggestion = suggestions.find(s => s.clauseId === 'cl-performance-bonus');
      expect(bonusSuggestion).toBeDefined();
    });

    it('should include confidence scores', async () => {
      const suggestions = await service.suggestClauses('FULL_TIME' as any, {
        position: 'Manager',
        salary: 20000,
        isManager: true,
        workRemotely: true,
      });

      suggestions.forEach(s => {
        expect(s.confidence).toBeDefined();
        expect(s.confidence).toBeGreaterThan(0);
        expect(s.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Contract Generation', () => {
    it('should generate contract', async () => {
      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        validContractData
      );

      expect(contract).toBeDefined();
      expect(contract.id).toBeDefined();
      expect(contract.templateId).toBe('tpl-cim-standard');
    });

    it('should set initial status to draft', async () => {
      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        validContractData
      );

      expect(contract.status).toBe('draft');
    });

    it('should set createdAt timestamp', async () => {
      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        validContractData
      );

      expect(contract.createdAt).toBeInstanceOf(Date);
    });

    it('should generate content', async () => {
      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        validContractData
      );

      expect(contract.content).toBeDefined();
      expect(contract.content.length).toBeGreaterThan(0);
    });

    it('should generate HTML content', async () => {
      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        validContractData
      );

      expect(contract.contentHtml).toBeDefined();
      expect(contract.contentHtml).toContain('<!DOCTYPE html>');
    });

    it('should include employee name in content', async () => {
      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        validContractData
      );

      expect(contract.content).toContain(validContractData.employeeName);
    });

    it('should include employer name in content', async () => {
      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        validContractData
      );

      expect(contract.content).toContain(validContractData.employerName);
    });

    it('should include position in content', async () => {
      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        validContractData
      );

      expect(contract.content).toContain(validContractData.position);
    });

    it('should store metadata', async () => {
      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        validContractData
      );

      expect(contract.metadata).toBeDefined();
      expect(contract.metadata.employeeName).toBe(validContractData.employeeName);
      expect(contract.metadata.salary).toBe(validContractData.salary);
    });

    it('should default currency to RON', async () => {
      const dataWithoutCurrency = { ...validContractData };
      delete (dataWithoutCurrency as any).currency;

      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        dataWithoutCurrency
      );

      expect(contract.metadata.currency).toBe('RON');
    });

    it('should default work hours to 40', async () => {
      const dataWithoutHours = { ...validContractData };
      delete (dataWithoutHours as any).workHours;

      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        dataWithoutHours
      );

      expect(contract.metadata.workHours).toBe(40);
    });

    it('should throw for missing required fields', async () => {
      const incompleteData = { ...validContractData };
      delete (incompleteData as any).employeeName;

      await expect(
        service.generateContract('user_123', 'tpl-cim-standard', 'emp_123', incompleteData)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw for non-existent template', async () => {
      await expect(
        service.generateContract('user_123', 'non-existent', 'emp_123', validContractData)
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate probation end date', async () => {
      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        { ...validContractData, probationDays: 90 }
      );

      expect(contract.metadata.probationEnd).toBeDefined();
    });

    it('should generate clauses', async () => {
      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        validContractData
      );

      expect(contract.clauses).toBeDefined();
      expect(contract.clauses.length).toBeGreaterThan(0);
    });
  });

  describe('Probation Period Validation', () => {
    it('should allow 90 days for standard positions', async () => {
      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        { ...validContractData, position: 'Programator', probationDays: 90 }
      );

      expect(contract.metadata.probationDays).toBe(90);
    });

    it('should allow 120 days for management positions', async () => {
      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        { ...validContractData, position: 'Director IT', probationDays: 120 }
      );

      expect(contract.metadata.probationDays).toBe(120);
    });

    it('should reject exceeding probation for standard positions', async () => {
      await expect(
        service.generateContract('user_123', 'tpl-cim-standard', 'emp_123', {
          ...validContractData,
          position: 'Programator',
          probationDays: 100,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject exceeding probation for management', async () => {
      await expect(
        service.generateContract('user_123', 'tpl-cim-standard', 'emp_123', {
          ...validContractData,
          position: 'Director',
          probationDays: 150,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should recognize manager position variants', async () => {
      const managerVariants = ['Director', 'Manager', 'CEO', 'CFO', 'CTO', 'Șef departament', 'Coordonator'];

      for (const position of managerVariants) {
        const contract = await service.generateContract(
          'user_123',
          'tpl-cim-standard',
          'emp_123',
          { ...validContractData, position, probationDays: 120 }
        );
        expect(contract.metadata.probationDays).toBe(120);
      }
    });
  });

  describe('E-Signature Integration', () => {
    let contractId: string;

    beforeEach(async () => {
      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        validContractData
      );
      contractId = contract.id;
    });

    it('should request signature', async () => {
      const signatureRequest = await service.requestSignature(
        contractId,
        'employee',
        'maria.ionescu@email.com',
        'internal'
      );

      expect(signatureRequest).toBeDefined();
      expect(signatureRequest.id).toBeDefined();
      expect(signatureRequest.signerType).toBe('employee');
    });

    it('should set signer name from contract metadata', async () => {
      const signatureRequest = await service.requestSignature(
        contractId,
        'employee',
        'maria.ionescu@email.com'
      );

      expect(signatureRequest.signerName).toBe(validContractData.employeeName);
    });

    it('should generate signature URL for internal provider', async () => {
      const signatureRequest = await service.requestSignature(
        contractId,
        'employee',
        'test@email.com',
        'internal'
      );

      expect(signatureRequest.signatureUrl).toBeDefined();
      expect(signatureRequest.signatureUrl).toContain(contractId);
    });

    it('should set status to sent for DocuSign', async () => {
      const signatureRequest = await service.requestSignature(
        contractId,
        'employee',
        'test@email.com',
        'docusign'
      );

      expect(signatureRequest.status).toBe('sent');
      expect(signatureRequest.externalId).toBeDefined();
    });

    it('should set status to sent for AdobeSign', async () => {
      const signatureRequest = await service.requestSignature(
        contractId,
        'employee',
        'test@email.com',
        'adobesign'
      );

      expect(signatureRequest.status).toBe('sent');
      expect(signatureRequest.externalId).toBeDefined();
    });

    it('should update contract status to pending_signature', async () => {
      await service.requestSignature(contractId, 'employee', 'test@email.com');

      const contract = service.getGeneratedContract(contractId);
      expect(contract.status).toBe('pending_signature');
    });

    it('should throw for non-existent contract', async () => {
      await expect(
        service.requestSignature('non-existent', 'employee', 'test@email.com')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Record Signature', () => {
    let contractId: string;
    let employeeSignatureId: string;

    beforeEach(async () => {
      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        validContractData
      );
      contractId = contract.id;

      const employerSignature = await service.requestSignature(
        contractId,
        'employer',
        'hr@company.com'
      );
      const employeeSignature = await service.requestSignature(
        contractId,
        'employee',
        'employee@email.com'
      );
      employeeSignatureId = employeeSignature.id;
    });

    it('should record signature', async () => {
      const updatedContract = await service.recordSignature(
        contractId,
        employeeSignatureId,
        { signatureUrl: 'data:image/png;base64,...' }
      );

      const signature = updatedContract.signatures.find(s => s.id === employeeSignatureId);
      expect(signature?.status).toBe('signed');
    });

    it('should set signedAt timestamp', async () => {
      const updatedContract = await service.recordSignature(
        contractId,
        employeeSignatureId,
        { signatureUrl: 'data:image/png;base64,...' }
      );

      const signature = updatedContract.signatures.find(s => s.id === employeeSignatureId);
      expect(signature?.signedAt).toBeInstanceOf(Date);
    });

    it('should mark contract as signed when all signatures complete', async () => {
      const contract = service.getGeneratedContract(contractId);
      const employerSignatureId = contract.signatures.find(s => s.signerType === 'employer')!.id;

      await service.recordSignature(contractId, employerSignatureId, {
        signatureUrl: 'data:image/png;base64,...',
      });

      const updatedContract = await service.recordSignature(
        contractId,
        employeeSignatureId,
        { signatureUrl: 'data:image/png;base64,...' }
      );

      expect(updatedContract.status).toBe('signed');
      expect(updatedContract.signedAt).toBeInstanceOf(Date);
    });

    it('should throw for non-existent contract', async () => {
      await expect(
        service.recordSignature('non-existent', 'sig_123', { signatureUrl: 'test' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw for non-existent signature request', async () => {
      await expect(
        service.recordSignature(contractId, 'non-existent', { signatureUrl: 'test' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Contract Retrieval', () => {
    let contractId: string;

    beforeEach(async () => {
      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        validContractData
      );
      contractId = contract.id;
    });

    it('should get contract by ID', () => {
      const contract = service.getGeneratedContract(contractId);

      expect(contract).toBeDefined();
      expect(contract.id).toBe(contractId);
    });

    it('should throw for non-existent contract', () => {
      expect(() => service.getGeneratedContract('non-existent')).toThrow(NotFoundException);
    });

    it('should get contracts by employee', async () => {
      await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        validContractData
      );

      const contracts = service.getContractsByEmployee('emp_123');

      expect(contracts.length).toBeGreaterThanOrEqual(2);
      contracts.forEach(c => expect(c.employeeId).toBe('emp_123'));
    });

    it('should return empty array for unknown employee', () => {
      const contracts = service.getContractsByEmployee('unknown');
      expect(contracts).toEqual([]);
    });
  });

  describe('Contract Validation', () => {
    it('should validate valid contract', async () => {
      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        validContractData
      );

      const validation = service.validateContract(contract);

      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should reject salary below minimum wage', async () => {
      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        { ...validContractData, salary: 2000 }
      );

      const validation = service.validateContract(contract);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('salariu') || e.includes('minim'))).toBe(true);
    });

    it('should reject work hours exceeding 48/week', async () => {
      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        { ...validContractData, workHours: 50 }
      );

      const validation = service.validateContract(contract);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('ore') || e.includes('48'))).toBe(true);
    });

    it('should reject probation exceeding 120 days', async () => {
      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        { ...validContractData, position: 'Director', probationDays: 120 }
      );

      // Manually set invalid probation for validation test
      contract.metadata.probationDays = 150;

      const validation = service.validateContract(contract);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('probă') || e.includes('120'))).toBe(true);
    });

    it('should warn for long non-compete duration', async () => {
      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        {
          ...validContractData,
          nonCompete: {
            enabled: true,
            durationMonths: 30,
            geographicScope: 'România',
            compensation: 3000,
            activities: ['IT Services'],
          },
        }
      );

      const validation = service.validateContract(contract);

      expect(validation.warnings.some(w => w.includes('neconcurență'))).toBe(true);
    });

    it('should warn for low non-compete compensation', async () => {
      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        {
          ...validContractData,
          salary: 10000,
          nonCompete: {
            enabled: true,
            durationMonths: 12,
            geographicScope: 'România',
            compensation: 1000, // Less than 25% of salary
            activities: ['IT Services'],
          },
        }
      );

      const validation = service.validateContract(contract);

      expect(validation.warnings.some(w => w.includes('Compensația'))).toBe(true);
    });

    it('should reject invalid CNP', async () => {
      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        { ...validContractData, employeeCnp: '1234567890123' }
      );

      const validation = service.validateContract(contract);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('CNP'))).toBe(true);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await service.generateContract('user_1', 'tpl-cim-standard', 'emp_1', validContractData);
      await service.generateContract('user_2', 'tpl-cim-standard', 'emp_2', validContractData);
      await service.generateContract('user_3', 'tpl-part-time', 'emp_3', {
        ...validContractData,
        workHours: 20,
      });
    });

    it('should return statistics', () => {
      const stats = service.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalTemplates).toBeGreaterThan(0);
    });

    it('should count total generated contracts', () => {
      const stats = service.getStatistics();

      expect(stats.totalGenerated).toBeGreaterThanOrEqual(3);
    });

    it('should group by status', () => {
      const stats = service.getStatistics();

      expect(stats.byStatus).toBeDefined();
      expect(stats.byStatus.draft).toBeGreaterThanOrEqual(3);
    });

    it('should group by template', () => {
      const stats = service.getStatistics();

      expect(stats.byTemplate).toBeDefined();
      expect(stats.byTemplate['tpl-cim-standard']).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Romanian Labor Law Compliance', () => {
    it('should include Romanian legal references in templates', () => {
      const template = service.getTemplate('tpl-cim-standard');

      expect(template.legalReferences).toBeDefined();
      expect(template.legalReferences.some(ref => ref.includes('Codul Muncii'))).toBe(true);
    });

    it('should include mandatory clauses', () => {
      const template = service.getTemplate('tpl-cim-standard');

      const mandatoryClauses = template.clauses.filter(c => c.type === 'mandatory');
      expect(mandatoryClauses.length).toBeGreaterThan(0);
    });

    it('should use Romanian text in templates', () => {
      const template = service.getTemplate('tpl-cim-standard');

      expect(template.name).toContain('Contract');
      expect(template.description).toBeDefined();
    });

    it('should include clause for parties', () => {
      const template = service.getTemplate('tpl-cim-standard');

      const partiesClause = template.clauses.find(c => c.id === 'cl-parties');
      expect(partiesClause).toBeDefined();
      expect(partiesClause?.content).toContain('ANGAJATOR');
      expect(partiesClause?.content).toContain('SALARIAT');
    });

    it('should include salary clause', () => {
      const template = service.getTemplate('tpl-cim-standard');

      const salaryClause = template.clauses.find(c => c.id === 'cl-salary');
      expect(salaryClause).toBeDefined();
    });

    it('should include termination clause', () => {
      const template = service.getTemplate('tpl-cim-standard');

      const terminationClause = template.clauses.find(c => c.id === 'cl-termination');
      expect(terminationClause).toBeDefined();
      expect(terminationClause?.content).toContain('preaviz');
    });
  });

  describe('Telework Support', () => {
    it('should generate contract with telework clause', async () => {
      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        {
          ...validContractData,
          telework: {
            enabled: true,
            daysPerWeek: 3,
            equipment: ['Laptop', 'Monitor'],
            expenses: 200,
            schedule: 'Flexibil',
          },
        }
      );

      expect(contract.metadata.telework).toBeDefined();
      expect(contract.metadata.telework?.enabled).toBe(true);
      expect(contract.metadata.telework?.daysPerWeek).toBe(3);
    });
  });

  describe('Non-Compete Support', () => {
    it('should generate contract with non-compete clause', async () => {
      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        {
          ...validContractData,
          nonCompete: {
            enabled: true,
            durationMonths: 12,
            geographicScope: 'România și Europa de Est',
            compensation: 4000,
            activities: ['Dezvoltare software', 'Consultanță IT'],
          },
        }
      );

      expect(contract.metadata.nonCompete).toBeDefined();
      expect(contract.metadata.nonCompete?.enabled).toBe(true);
      expect(contract.metadata.nonCompete?.durationMonths).toBe(12);
    });
  });

  describe('HTML Output', () => {
    it('should generate valid HTML', async () => {
      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        validContractData
      );

      expect(contract.contentHtml).toContain('<html');
      expect(contract.contentHtml).toContain('</html>');
    });

    it('should include Romanian language attribute', async () => {
      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        validContractData
      );

      expect(contract.contentHtml).toContain('lang="ro"');
    });

    it('should include CSS styling', async () => {
      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        validContractData
      );

      expect(contract.contentHtml).toContain('<style>');
    });

    it('should include signature blocks', async () => {
      const contract = await service.generateContract(
        'user_123',
        'tpl-cim-standard',
        'emp_123',
        validContractData
      );

      expect(contract.contentHtml).toContain('ANGAJATOR');
      expect(contract.contentHtml).toContain('SALARIAT');
    });
  });
});
