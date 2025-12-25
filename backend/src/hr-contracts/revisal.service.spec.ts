import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  RevisalService,
  RevisalOperationType,
  RevisalSubmissionStatus,
  RevisalEmployee,
  RevisalContract,
} from './revisal.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RevisalService', () => {
  let service: RevisalService;

  const mockPrismaService = {
    employee: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      const config: Record<string, string> = {
        COMPANY_CUI: '12345678',
        COMPANY_NAME: 'SC Test SRL',
      };
      return config[key] || null;
    }),
  };

  const validEmployeeData: RevisalEmployee = {
    cnp: '1850101410014', // Valid Romanian CNP
    nume: 'Popescu',
    prenume: 'Ion',
    dataNastere: new Date('1985-01-01'),
    locNastere: 'București',
    cetatenie: 'Română',
    adresa: 'Str. Exemplu Nr. 10, București',
    actIdentitate: {
      tip: 'CI',
      serie: 'RX',
      numar: '123456',
      dataEliberare: new Date('2020-01-01'),
      dataExpirare: new Date('2030-01-01'),
    },
    studii: {
      nivel: 'UNIVERSITAR',
      specializare: 'Informatică',
    },
  };

  const validContractData: RevisalContract = {
    numarContract: 'CIM-001/2025',
    dataContract: new Date('2025-01-15'),
    tipContract: 'NEDETERMINAT',
    dataInceput: new Date('2025-02-01'),
    functie: 'Programator',
    codCOR: '251201',
    salariu: 8000,
    norma: 40,
    locMunca: 'București, sediul central',
    conditiiMunca: 'NORMALE',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RevisalService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<RevisalService>(RevisalService);
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('Submission Management', () => {
    describe('createSubmission', () => {
      it('should create a submission', async () => {
        const submission = await service.createSubmission(
          'user_123',
          'emp_123',
          'contract_123',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          validContractData
        );

        expect(submission).toBeDefined();
        expect(submission.id).toBeDefined();
        expect(submission.operationType).toBe(RevisalOperationType.ANGAJARE);
      });

      it('should set initial status to DRAFT', async () => {
        const submission = await service.createSubmission(
          'user_123',
          'emp_123',
          'contract_123',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          validContractData
        );

        expect(submission.status).toBe(RevisalSubmissionStatus.DRAFT);
      });

      it('should set timestamps', async () => {
        const submission = await service.createSubmission(
          'user_123',
          'emp_123',
          'contract_123',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          validContractData
        );

        expect(submission.createdAt).toBeInstanceOf(Date);
        expect(submission.updatedAt).toBeInstanceOf(Date);
      });

      it('should store employee data', async () => {
        const submission = await service.createSubmission(
          'user_123',
          'emp_123',
          'contract_123',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          validContractData
        );

        expect(submission.employeeData).toEqual(validEmployeeData);
      });

      it('should store contract data', async () => {
        const submission = await service.createSubmission(
          'user_123',
          'emp_123',
          'contract_123',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          validContractData
        );

        expect(submission.contractData).toEqual(validContractData);
      });

      it('should store changes for modification operations', async () => {
        const changes = {
          salariu: { old: 7000, new: 8000 },
        };

        const submission = await service.createSubmission(
          'user_123',
          'emp_123',
          'contract_123',
          RevisalOperationType.MODIFICARE_SALARIU,
          validEmployeeData,
          validContractData,
          changes
        );

        expect(submission.changes).toEqual(changes);
      });
    });
  });

  describe('Validation', () => {
    describe('validateSubmission', () => {
      it('should validate a valid submission', async () => {
        const submission = await service.createSubmission(
          'user_123',
          'emp_123',
          'contract_123',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          validContractData
        );

        const result = await service.validateSubmission(submission.id);

        expect(result.valid).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should update status to VALIDATED on success', async () => {
        const submission = await service.createSubmission(
          'user_123',
          'emp_123',
          'contract_123',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          validContractData
        );

        await service.validateSubmission(submission.id);
        const updated = service.getSubmission(submission.id);

        expect(updated.status).toBe(RevisalSubmissionStatus.VALIDATED);
      });

      it('should reject invalid CNP', async () => {
        const invalidEmployee = {
          ...validEmployeeData,
          cnp: '1234567890123', // Invalid checksum
        };

        const submission = await service.createSubmission(
          'user_123',
          'emp_123',
          'contract_123',
          RevisalOperationType.ANGAJARE,
          invalidEmployee,
          validContractData
        );

        const result = await service.validateSubmission(submission.id);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('CNP'))).toBe(true);
      });

      it('should reject invalid COR code', async () => {
        const invalidContract = {
          ...validContractData,
          codCOR: 'INVALID',
        };

        const submission = await service.createSubmission(
          'user_123',
          'emp_123',
          'contract_123',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          invalidContract
        );

        const result = await service.validateSubmission(submission.id);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('COR'))).toBe(true);
      });

      it('should reject salary below minimum wage', async () => {
        const lowSalaryContract = {
          ...validContractData,
          salariu: 2000,
        };

        const submission = await service.createSubmission(
          'user_123',
          'emp_123',
          'contract_123',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          lowSalaryContract
        );

        const result = await service.validateSubmission(submission.id);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('salariu') || e.includes('minim'))).toBe(true);
      });

      it('should reject work hours exceeding 48/week', async () => {
        const excessiveHoursContract = {
          ...validContractData,
          norma: 50,
        };

        const submission = await service.createSubmission(
          'user_123',
          'emp_123',
          'contract_123',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          excessiveHoursContract
        );

        const result = await service.validateSubmission(submission.id);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('48'))).toBe(true);
      });

      it('should require end date for fixed-term contracts', async () => {
        const fixedTermContract = {
          ...validContractData,
          tipContract: 'DETERMINAT' as const,
          dataSfarsit: undefined,
        };

        const submission = await service.createSubmission(
          'user_123',
          'emp_123',
          'contract_123',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          fixedTermContract
        );

        const result = await service.validateSubmission(submission.id);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('determinat') || e.includes('sfârșit'))).toBe(true);
      });

      it('should reject fixed-term contract exceeding 36 months', async () => {
        const longFixedTerm = {
          ...validContractData,
          tipContract: 'DETERMINAT' as const,
          dataSfarsit: new Date('2029-01-01'), // 4 years
        };

        const submission = await service.createSubmission(
          'user_123',
          'emp_123',
          'contract_123',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          longFixedTerm
        );

        const result = await service.validateSubmission(submission.id);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('36') || e.includes('luni'))).toBe(true);
      });

      it('should reject probation period exceeding 120 days', async () => {
        const longProbation = {
          ...validContractData,
          perioadaProba: 150,
        };

        const submission = await service.createSubmission(
          'user_123',
          'emp_123',
          'contract_123',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          longProbation
        );

        const result = await service.validateSubmission(submission.id);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('probă'))).toBe(true);
      });

      it('should warn for expired identity document', async () => {
        const expiredId = {
          ...validEmployeeData,
          actIdentitate: {
            ...validEmployeeData.actIdentitate,
            dataExpirare: new Date('2020-01-01'),
          },
        };

        const submission = await service.createSubmission(
          'user_123',
          'emp_123',
          'contract_123',
          RevisalOperationType.ANGAJARE,
          expiredId,
          validContractData
        );

        const result = await service.validateSubmission(submission.id);

        expect(result.warnings.some(w => w.includes('expirat'))).toBe(true);
      });

      it('should require contract number for ANGAJARE', async () => {
        const noContractNumber = {
          ...validContractData,
          numarContract: '',
        };

        const submission = await service.createSubmission(
          'user_123',
          'emp_123',
          'contract_123',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          noContractNumber
        );

        const result = await service.validateSubmission(submission.id);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('contract'))).toBe(true);
      });

      it('should require salary change for MODIFICARE_SALARIU', async () => {
        const submission = await service.createSubmission(
          'user_123',
          'emp_123',
          'contract_123',
          RevisalOperationType.MODIFICARE_SALARIU,
          validEmployeeData,
          validContractData,
          {} // No salary change
        );

        const result = await service.validateSubmission(submission.id);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('salariu'))).toBe(true);
      });

      it('should throw for non-existent submission', async () => {
        await expect(service.validateSubmission('non-existent'))
          .rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('Submit to REVISAL', () => {
    it('should submit validated submission', async () => {
      const submission = await service.createSubmission(
        'user_123',
        'emp_123',
        'contract_123',
        RevisalOperationType.ANGAJARE,
        validEmployeeData,
        validContractData
      );

      await service.validateSubmission(submission.id);
      const submitted = await service.submitToRevisal(submission.id);

      expect(submitted.status).toBe(RevisalSubmissionStatus.PENDING);
      expect(submitted.revisalId).toBeDefined();
      expect(submitted.receiptNumber).toBeDefined();
    });

    it('should set submittedAt timestamp', async () => {
      const submission = await service.createSubmission(
        'user_123',
        'emp_123',
        'contract_123',
        RevisalOperationType.ANGAJARE,
        validEmployeeData,
        validContractData
      );

      await service.validateSubmission(submission.id);
      const submitted = await service.submitToRevisal(submission.id);

      expect(submitted.submittedAt).toBeInstanceOf(Date);
    });

    it('should generate XML content', async () => {
      const submission = await service.createSubmission(
        'user_123',
        'emp_123',
        'contract_123',
        RevisalOperationType.ANGAJARE,
        validEmployeeData,
        validContractData
      );

      await service.validateSubmission(submission.id);
      const submitted = await service.submitToRevisal(submission.id);

      expect(submitted.xmlContent).toBeDefined();
      expect(submitted.xmlContent).toContain('<?xml');
      expect(submitted.xmlContent).toContain('REVISAL');
    });

    it('should reject unvalidated submission', async () => {
      const submission = await service.createSubmission(
        'user_123',
        'emp_123',
        'contract_123',
        RevisalOperationType.ANGAJARE,
        validEmployeeData,
        validContractData
      );

      await expect(service.submitToRevisal(submission.id))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw for non-existent submission', async () => {
      await expect(service.submitToRevisal('non-existent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('Check Submission Status', () => {
    it('should return current status', async () => {
      const submission = await service.createSubmission(
        'user_123',
        'emp_123',
        'contract_123',
        RevisalOperationType.ANGAJARE,
        validEmployeeData,
        validContractData
      );

      const status = await service.checkSubmissionStatus(submission.id);

      expect(status.status).toBe(RevisalSubmissionStatus.DRAFT);
    });

    it('should throw for non-existent submission', async () => {
      await expect(service.checkSubmissionStatus('non-existent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('XML Generation', () => {
    it('should include HEADER with employer info', async () => {
      const submission = await service.createSubmission(
        'user_123',
        'emp_123',
        'contract_123',
        RevisalOperationType.ANGAJARE,
        validEmployeeData,
        validContractData
      );

      await service.validateSubmission(submission.id);
      const submitted = await service.submitToRevisal(submission.id);

      expect(submitted.xmlContent).toContain('HEADER');
      expect(submitted.xmlContent).toContain('CUI_ANGAJATOR');
    });

    it('should include ANGAJAT with employee data', async () => {
      const submission = await service.createSubmission(
        'user_123',
        'emp_123',
        'contract_123',
        RevisalOperationType.ANGAJARE,
        validEmployeeData,
        validContractData
      );

      await service.validateSubmission(submission.id);
      const submitted = await service.submitToRevisal(submission.id);

      expect(submitted.xmlContent).toContain('ANGAJAT');
      expect(submitted.xmlContent).toContain(validEmployeeData.cnp);
      expect(submitted.xmlContent).toContain(validEmployeeData.nume);
    });

    it('should include CONTRACT with contract data', async () => {
      const submission = await service.createSubmission(
        'user_123',
        'emp_123',
        'contract_123',
        RevisalOperationType.ANGAJARE,
        validEmployeeData,
        validContractData
      );

      await service.validateSubmission(submission.id);
      const submitted = await service.submitToRevisal(submission.id);

      expect(submitted.xmlContent).toContain('CONTRACT');
      expect(submitted.xmlContent).toContain(validContractData.codCOR);
      expect(submitted.xmlContent).toContain(validContractData.salariu.toString());
    });

    it('should include MODIFICARI for change operations', async () => {
      const changes = {
        salariu: { old: 7000, new: 8000 },
      };

      const submission = await service.createSubmission(
        'user_123',
        'emp_123',
        'contract_123',
        RevisalOperationType.MODIFICARE_SALARIU,
        validEmployeeData,
        validContractData,
        changes
      );

      await service.validateSubmission(submission.id);
      const submitted = await service.submitToRevisal(submission.id);

      expect(submitted.xmlContent).toContain('MODIFICARI');
      expect(submitted.xmlContent).toContain('VALOARE_VECHE');
      expect(submitted.xmlContent).toContain('VALOARE_NOUA');
    });
  });

  describe('COR Codes', () => {
    it('should return COR code for position', () => {
      const code = service.getCORCode('Programator');
      expect(code).toBe('251201');
    });

    it('should return default code for unknown position', () => {
      const code = service.getCORCode('Unknown Position');
      expect(code).toBe('961101'); // Default unskilled worker
    });

    it('should return all COR codes', () => {
      const codes = service.getCORCodes();

      expect(codes).toBeDefined();
      expect(Object.keys(codes).length).toBeGreaterThan(0);
      expect(codes['Programator']).toBe('251201');
    });

    it('should include management positions', () => {
      const codes = service.getCORCodes();

      expect(codes['Director General']).toBeDefined();
      expect(codes['Manager']).toBeDefined();
    });

    it('should include common positions', () => {
      const codes = service.getCORCodes();

      expect(codes['Contabil']).toBeDefined();
      expect(codes['Secretară']).toBeDefined();
      expect(codes['Șofer']).toBeDefined();
    });
  });

  describe('D112 Declaration', () => {
    it('should generate D112 declaration', async () => {
      const declaration = await service.generateD112('user_123', 1, 2025);

      expect(declaration).toBeDefined();
      expect(declaration.id).toBeDefined();
      expect(declaration.month).toBe(1);
      expect(declaration.year).toBe(2025);
    });

    it('should set initial status to draft', async () => {
      const declaration = await service.generateD112('user_123', 1, 2025);

      expect(declaration.status).toBe('draft');
    });

    it('should generate XML content', async () => {
      const declaration = await service.generateD112('user_123', 1, 2025);

      expect(declaration.xmlContent).toBeDefined();
      expect(declaration.xmlContent).toContain('D112');
      expect(declaration.xmlContent).toContain('LUNA');
    });

    it('should include employer CUI', async () => {
      const declaration = await service.generateD112('user_123', 1, 2025);

      expect(declaration.employerCui).toBeDefined();
      expect(declaration.xmlContent).toContain(declaration.employerCui);
    });

    it('should calculate totals', async () => {
      const declaration = await service.generateD112('user_123', 1, 2025);

      expect(declaration.totalSalaries).toBeDefined();
      expect(declaration.totalContributions).toBeDefined();
      expect(declaration.totalContributions.cas).toBeDefined();
      expect(declaration.totalContributions.cass).toBeDefined();
      expect(declaration.totalContributions.impozit).toBeDefined();
      expect(declaration.totalContributions.cam).toBeDefined();
    });
  });

  describe('Submit D112', () => {
    it('should submit D112 declaration', async () => {
      const declaration = await service.generateD112('user_123', 1, 2025);
      const submitted = await service.submitD112(declaration.id);

      expect(submitted.status).toBe('submitted');
      expect(submitted.submittedAt).toBeInstanceOf(Date);
    });

    it('should throw for non-existent declaration', async () => {
      await expect(service.submitD112('non-existent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('Retrieval', () => {
    describe('getSubmission', () => {
      it('should get submission by ID', async () => {
        const created = await service.createSubmission(
          'user_123',
          'emp_123',
          'contract_123',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          validContractData
        );

        const retrieved = service.getSubmission(created.id);

        expect(retrieved).toBeDefined();
        expect(retrieved.id).toBe(created.id);
      });

      it('should throw for non-existent submission', () => {
        expect(() => service.getSubmission('non-existent'))
          .toThrow(NotFoundException);
      });
    });

    describe('getUserSubmissions', () => {
      it('should get all submissions for user', async () => {
        await service.createSubmission(
          'user_123',
          'emp_1',
          'contract_1',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          validContractData
        );
        await service.createSubmission(
          'user_123',
          'emp_2',
          'contract_2',
          RevisalOperationType.MODIFICARE_SALARIU,
          validEmployeeData,
          validContractData
        );

        const submissions = service.getUserSubmissions('user_123');

        expect(submissions.length).toBeGreaterThanOrEqual(2);
      });

      it('should filter by status', async () => {
        const submission = await service.createSubmission(
          'user_123',
          'emp_1',
          'contract_1',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          validContractData
        );

        await service.validateSubmission(submission.id);

        const drafts = service.getUserSubmissions('user_123', RevisalSubmissionStatus.DRAFT);
        const validated = service.getUserSubmissions('user_123', RevisalSubmissionStatus.VALIDATED);

        validated.forEach(s => expect(s.status).toBe(RevisalSubmissionStatus.VALIDATED));
        drafts.forEach(s => expect(s.status).toBe(RevisalSubmissionStatus.DRAFT));
      });

      it('should sort by creation date descending', async () => {
        await service.createSubmission(
          'sort_user',
          'emp_1',
          'contract_1',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          validContractData
        );

        await new Promise(resolve => setTimeout(resolve, 10));

        await service.createSubmission(
          'sort_user',
          'emp_2',
          'contract_2',
          RevisalOperationType.ANGAJARE,
          validEmployeeData,
          validContractData
        );

        const submissions = service.getUserSubmissions('sort_user');

        for (let i = 1; i < submissions.length; i++) {
          expect(submissions[i - 1].createdAt.getTime())
            .toBeGreaterThanOrEqual(submissions[i].createdAt.getTime());
        }
      });
    });

    describe('getD112Declaration', () => {
      it('should get D112 declaration by ID', async () => {
        const created = await service.generateD112('user_123', 1, 2025);
        const retrieved = service.getD112Declaration(created.id);

        expect(retrieved).toBeDefined();
        expect(retrieved.id).toBe(created.id);
      });

      it('should throw for non-existent declaration', () => {
        expect(() => service.getD112Declaration('non-existent'))
          .toThrow(NotFoundException);
      });
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      // Create submissions with different statuses
      const sub1 = await service.createSubmission(
        'stats_user',
        'emp_1',
        'contract_1',
        RevisalOperationType.ANGAJARE,
        validEmployeeData,
        validContractData
      );
      await service.validateSubmission(sub1.id);

      await service.createSubmission(
        'stats_user',
        'emp_2',
        'contract_2',
        RevisalOperationType.MODIFICARE_SALARIU,
        validEmployeeData,
        validContractData
      );

      await service.createSubmission(
        'stats_user',
        'emp_3',
        'contract_3',
        RevisalOperationType.INCETARE,
        validEmployeeData,
        validContractData
      );
    });

    it('should return statistics', () => {
      const stats = service.getStatistics('stats_user');

      expect(stats).toBeDefined();
      expect(stats.totalSubmissions).toBeGreaterThanOrEqual(3);
    });

    it('should count by status', () => {
      const stats = service.getStatistics('stats_user');

      expect(stats.byStatus).toBeDefined();
      expect(stats.byStatus[RevisalSubmissionStatus.VALIDATED]).toBeGreaterThanOrEqual(1);
      expect(stats.byStatus[RevisalSubmissionStatus.DRAFT]).toBeGreaterThanOrEqual(2);
    });

    it('should count by operation type', () => {
      const stats = service.getStatistics('stats_user');

      expect(stats.byOperation).toBeDefined();
      expect(stats.byOperation[RevisalOperationType.ANGAJARE]).toBeGreaterThanOrEqual(1);
      expect(stats.byOperation[RevisalOperationType.MODIFICARE_SALARIU]).toBeGreaterThanOrEqual(1);
      expect(stats.byOperation[RevisalOperationType.INCETARE]).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Operation Types', () => {
    it('should support ANGAJARE', async () => {
      const submission = await service.createSubmission(
        'user_123',
        'emp_123',
        'contract_123',
        RevisalOperationType.ANGAJARE,
        validEmployeeData,
        validContractData
      );

      expect(submission.operationType).toBe(RevisalOperationType.ANGAJARE);
    });

    it('should support MODIFICARE_SALARIU', async () => {
      const submission = await service.createSubmission(
        'user_123',
        'emp_123',
        'contract_123',
        RevisalOperationType.MODIFICARE_SALARIU,
        validEmployeeData,
        validContractData,
        { salariu: { old: 7000, new: 8000 } }
      );

      expect(submission.operationType).toBe(RevisalOperationType.MODIFICARE_SALARIU);
    });

    it('should support MODIFICARE_FUNCTIE', async () => {
      const submission = await service.createSubmission(
        'user_123',
        'emp_123',
        'contract_123',
        RevisalOperationType.MODIFICARE_FUNCTIE,
        validEmployeeData,
        validContractData
      );

      expect(submission.operationType).toBe(RevisalOperationType.MODIFICARE_FUNCTIE);
    });

    it('should support INCETARE', async () => {
      const submission = await service.createSubmission(
        'user_123',
        'emp_123',
        'contract_123',
        RevisalOperationType.INCETARE,
        validEmployeeData,
        validContractData
      );

      expect(submission.operationType).toBe(RevisalOperationType.INCETARE);
    });

    it('should support SUSPENDARE', async () => {
      const submission = await service.createSubmission(
        'user_123',
        'emp_123',
        'contract_123',
        RevisalOperationType.SUSPENDARE,
        validEmployeeData,
        validContractData
      );

      expect(submission.operationType).toBe(RevisalOperationType.SUSPENDARE);
    });

    it('should support DETASARE', async () => {
      const submission = await service.createSubmission(
        'user_123',
        'emp_123',
        'contract_123',
        RevisalOperationType.DETASARE,
        validEmployeeData,
        validContractData
      );

      expect(submission.operationType).toBe(RevisalOperationType.DETASARE);
    });
  });

  describe('Contract Types', () => {
    it('should validate NEDETERMINAT contract', async () => {
      const contract = {
        ...validContractData,
        tipContract: 'NEDETERMINAT' as const,
      };

      const submission = await service.createSubmission(
        'user_123',
        'emp_123',
        'contract_123',
        RevisalOperationType.ANGAJARE,
        validEmployeeData,
        contract
      );

      const result = await service.validateSubmission(submission.id);

      expect(result.valid).toBe(true);
    });

    it('should validate DETERMINAT contract with end date', async () => {
      const contract = {
        ...validContractData,
        tipContract: 'DETERMINAT' as const,
        dataSfarsit: new Date('2026-01-31'),
      };

      const submission = await service.createSubmission(
        'user_123',
        'emp_123',
        'contract_123',
        RevisalOperationType.ANGAJARE,
        validEmployeeData,
        contract
      );

      const result = await service.validateSubmission(submission.id);

      expect(result.valid).toBe(true);
    });

    it('should validate PARTIAL contract', async () => {
      const contract = {
        ...validContractData,
        tipContract: 'PARTIAL' as const,
        norma: 20,
        salariu: 4000,
      };

      const submission = await service.createSubmission(
        'user_123',
        'emp_123',
        'contract_123',
        RevisalOperationType.ANGAJARE,
        validEmployeeData,
        contract
      );

      const result = await service.validateSubmission(submission.id);

      expect(result.valid).toBe(true);
    });
  });

  describe('Education Levels', () => {
    const educationLevels = [
      'FARA', 'PRIMAR', 'GIMNAZIAL', 'LICEAL',
      'PROFESIONAL', 'POSTLICEAL', 'UNIVERSITAR',
      'MASTER', 'DOCTORAT'
    ];

    educationLevels.forEach(level => {
      it(`should accept ${level} education level`, async () => {
        const employee = {
          ...validEmployeeData,
          studii: {
            nivel: level as any,
          },
        };

        const submission = await service.createSubmission(
          'user_123',
          'emp_123',
          'contract_123',
          RevisalOperationType.ANGAJARE,
          employee,
          validContractData
        );

        expect(submission.employeeData.studii.nivel).toBe(level);
      });
    });
  });

  describe('Working Conditions', () => {
    it('should accept NORMALE conditions', async () => {
      const contract = {
        ...validContractData,
        conditiiMunca: 'NORMALE' as const,
      };

      const submission = await service.createSubmission(
        'user_123',
        'emp_123',
        'contract_123',
        RevisalOperationType.ANGAJARE,
        validEmployeeData,
        contract
      );

      expect(submission.contractData.conditiiMunca).toBe('NORMALE');
    });

    it('should accept DEOSEBITE conditions', async () => {
      const contract = {
        ...validContractData,
        conditiiMunca: 'DEOSEBITE' as const,
      };

      const submission = await service.createSubmission(
        'user_123',
        'emp_123',
        'contract_123',
        RevisalOperationType.ANGAJARE,
        validEmployeeData,
        contract
      );

      expect(submission.contractData.conditiiMunca).toBe('DEOSEBITE');
    });

    it('should accept SPECIALE conditions', async () => {
      const contract = {
        ...validContractData,
        conditiiMunca: 'SPECIALE' as const,
      };

      const submission = await service.createSubmission(
        'user_123',
        'emp_123',
        'contract_123',
        RevisalOperationType.ANGAJARE,
        validEmployeeData,
        contract
      );

      expect(submission.contractData.conditiiMunca).toBe('SPECIALE');
    });
  });

  describe('Identity Document Types', () => {
    it('should accept CI', async () => {
      expect(validEmployeeData.actIdentitate.tip).toBe('CI');
    });

    it('should accept BI', async () => {
      const employee = {
        ...validEmployeeData,
        actIdentitate: {
          ...validEmployeeData.actIdentitate,
          tip: 'BI' as const,
        },
      };

      const submission = await service.createSubmission(
        'user_123',
        'emp_123',
        'contract_123',
        RevisalOperationType.ANGAJARE,
        employee,
        validContractData
      );

      expect(submission.employeeData.actIdentitate.tip).toBe('BI');
    });

    it('should accept PASAPORT', async () => {
      const employee = {
        ...validEmployeeData,
        actIdentitate: {
          ...validEmployeeData.actIdentitate,
          tip: 'PASAPORT' as const,
        },
      };

      const submission = await service.createSubmission(
        'user_123',
        'emp_123',
        'contract_123',
        RevisalOperationType.ANGAJARE,
        employee,
        validContractData
      );

      expect(submission.employeeData.actIdentitate.tip).toBe('PASAPORT');
    });
  });
});
