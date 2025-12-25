import { Test, TestingModule } from '@nestjs/testing';
import { FinanceOpsCoursesService } from './finance-ops-courses.service';
import { LMSService } from './lms.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('FinanceOpsCoursesService', () => {
  let service: FinanceOpsCoursesService;
  let lmsService: LMSService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceOpsCoursesService,
        LMSService,
        {
          provide: PrismaService,
          useValue: {
            course: { findMany: jest.fn(), create: jest.fn() },
            enrollment: { findMany: jest.fn() },
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-value') },
        },
      ],
    }).compile();

    service = module.get<FinanceOpsCoursesService>(FinanceOpsCoursesService);
    lmsService = module.get<LMSService>(LMSService);
    service.resetState();
    lmsService.resetState();
  });

  afterEach(() => {
    service.resetState();
    lmsService.resetState();
  });

  describe('Course Templates', () => {
    describe('getBudgetingFundamentalsTemplate', () => {
      it('should return a valid budgeting course template', () => {
        const template = service.getBudgetingFundamentalsTemplate();

        expect(template.title).toBe('Fundamentele Bugetării pentru Manageri Operaționali');
        expect(template.slug).toBe('budgeting-fundamentals');
        expect(template.category).toBe('BUDGETING');
        expect(template.level).toBe('FOUNDATIONAL');
      });

      it('should have 6 modules', () => {
        const template = service.getBudgetingFundamentalsTemplate();
        expect(template.modules).toHaveLength(6);
      });

      it('should cover zero-based budgeting', () => {
        const template = service.getBudgetingFundamentalsTemplate();
        const zbbModule = template.modules.find(m => m.title.includes('Zero-Based'));
        expect(zbbModule).toBeDefined();
      });

      it('should have correct pricing', () => {
        const template = service.getBudgetingFundamentalsTemplate();
        expect(template.pricing.amount).toBe(299);
        expect(template.pricing.currency).toBe('RON');
      });

      it('should be HRDA eligible', () => {
        const template = service.getBudgetingFundamentalsTemplate();
        expect(template.hrdaEligible).toBe(true);
      });
    });

    describe('getCashFlowForecastingTemplate', () => {
      it('should return a valid cash flow course template', () => {
        const template = service.getCashFlowForecastingTemplate();

        expect(template.title).toBe('Prognoza și Managementul Cash Flow-ului');
        expect(template.slug).toBe('cash-flow-forecasting');
        expect(template.category).toBe('CASH_FLOW');
        expect(template.level).toBe('INTERMEDIATE');
      });

      it('should have 5 modules', () => {
        const template = service.getCashFlowForecastingTemplate();
        expect(template.modules).toHaveLength(5);
      });

      it('should cover working capital management', () => {
        const template = service.getCashFlowForecastingTemplate();
        const wcModule = template.modules.find(m => m.title.includes('Working Capital'));
        expect(wcModule).toBeDefined();
      });

      it('should have correct duration', () => {
        const template = service.getCashFlowForecastingTemplate();
        expect(template.duration.weeks).toBe(6);
        expect(template.duration.totalHours).toBe(30);
      });
    });

    describe('getROGAAPComplianceTemplate', () => {
      it('should return a valid RO GAAP course template', () => {
        const template = service.getROGAAPComplianceTemplate();

        expect(template.title).toBe('Conformitate RO GAAP - Reglementările Contabile Românești');
        expect(template.slug).toBe('ro-gaap-compliance');
        expect(template.category).toBe('GAAP_COMPLIANCE');
        expect(template.level).toBe('PROFESSIONAL');
      });

      it('should have 6 modules', () => {
        const template = service.getROGAAPComplianceTemplate();
        expect(template.modules).toHaveLength(6);
      });

      it('should cover SAF-T D406', () => {
        const template = service.getROGAAPComplianceTemplate();
        const saftModule = template.modules.find(m => m.title.includes('SAF-T'));
        expect(saftModule).toBeDefined();
      });

      it('should include regulatory references', () => {
        const template = service.getROGAAPComplianceTemplate();
        expect(template.complianceFrameworks).toContain('OMFP 1802/2014');
        expect(template.complianceFrameworks).toContain('SAF-T D406');
      });

      it('should have CECCAR credits', () => {
        const template = service.getROGAAPComplianceTemplate();
        expect(template.certification.cecpaCredits).toBe(40);
      });

      it('should have regulatory updates enabled', () => {
        const template = service.getROGAAPComplianceTemplate();
        expect(template.regulatoryUpdates).toBe(true);
      });
    });

    describe('getIFRSFundamentalsTemplate', () => {
      it('should return a valid IFRS course template', () => {
        const template = service.getIFRSFundamentalsTemplate();

        expect(template.title).toBe('IFRS Fundamentals pentru Afaceri Românești');
        expect(template.slug).toBe('ifrs-fundamentals');
        expect(template.category).toBe('IFRS');
        expect(template.level).toBe('INTERMEDIATE');
      });

      it('should have 6 modules', () => {
        const template = service.getIFRSFundamentalsTemplate();
        expect(template.modules).toHaveLength(6);
      });

      it('should cover IFRS 15 and IFRS 9', () => {
        const template = service.getIFRSFundamentalsTemplate();
        const revenueModule = template.modules.find(m => m.title.includes('Venituri'));
        expect(revenueModule).toBeDefined();
      });

      it('should cover first-time adoption', () => {
        const template = service.getIFRSFundamentalsTemplate();
        const adoptionModule = template.modules.find(m => m.title.includes('Prima Adoptare'));
        expect(adoptionModule).toBeDefined();
      });
    });

    describe('getCostAccountingTemplate', () => {
      it('should return a valid cost accounting course template', () => {
        const template = service.getCostAccountingTemplate();

        expect(template.title).toBe('Contabilitate de Gestiune și Costuri');
        expect(template.slug).toBe('cost-accounting');
        expect(template.category).toBe('COST_ACCOUNTING');
      });

      it('should have 5 modules', () => {
        const template = service.getCostAccountingTemplate();
        expect(template.modules).toHaveLength(5);
      });

      it('should cover ABC costing', () => {
        const template = service.getCostAccountingTemplate();
        const systemsModule = template.modules.find(m => m.title.includes('Sisteme'));
        expect(systemsModule).toBeDefined();
      });

      it('should cover standard costing and variances', () => {
        const template = service.getCostAccountingTemplate();
        const varianceModule = template.modules.find(m => m.title.includes('Standard Costing'));
        expect(varianceModule).toBeDefined();
      });
    });

    describe('getFinancialAnalysisTemplate', () => {
      it('should return a valid financial analysis course template', () => {
        const template = service.getFinancialAnalysisTemplate();

        expect(template.title).toBe('Analiza Financiară pentru Operaționali');
        expect(template.slug).toBe('financial-analysis');
        expect(template.category).toBe('FINANCIAL_ANALYSIS');
        expect(template.level).toBe('FOUNDATIONAL');
      });

      it('should have 5 modules', () => {
        const template = service.getFinancialAnalysisTemplate();
        expect(template.modules).toHaveLength(5);
      });

      it('should cover all three financial statements', () => {
        const template = service.getFinancialAnalysisTemplate();
        const moduleNames = template.modules.map(m => m.title);
        expect(moduleNames.some(n => n.includes('Bilanț'))).toBe(true);
        expect(moduleNames.some(n => n.includes('Profit'))).toBe(true);
        expect(moduleNames.some(n => n.includes('Cash Flow'))).toBe(true);
      });

      it('should cover financial ratios', () => {
        const template = service.getFinancialAnalysisTemplate();
        const ratiosModule = template.modules.find(m => m.title.includes('Rate'));
        expect(ratiosModule).toBeDefined();
      });

      it('should have lower pricing as foundational course', () => {
        const template = service.getFinancialAnalysisTemplate();
        expect(template.pricing.amount).toBe(249);
      });
    });
  });

  describe('Course Generation', () => {
    it('should generate a budgeting course', async () => {
      const template = service.getBudgetingFundamentalsTemplate();
      const course = await service.generateCourse(template, 'instructor-1');

      expect(course).toBeDefined();
      expect(course.title).toBe('Fundamentele Bugetării pentru Manageri Operaționali');
      expect(course.instructor.id).toBe('instructor-1');
    });

    it('should generate all finance courses', async () => {
      const result = await service.generateAllFinanceCourses('instructor-1');

      expect(result.budgeting).toBeDefined();
      expect(result.cashFlow).toBeDefined();
      expect(result.roGaap).toBeDefined();
      expect(result.ifrs).toBeDefined();
      expect(result.costAccounting).toBeDefined();
      expect(result.financialAnalysis).toBeDefined();
    });

    it('should generate RO GAAP course with compliance category', async () => {
      const template = service.getROGAAPComplianceTemplate();
      const course = await service.generateCourse(template, 'instructor-1');

      expect(course.category).toBe('COMPLIANCE');
    });
  });

  describe('Practical Exercises', () => {
    it('should return default exercises', async () => {
      const exercises = await service.getExercises();

      expect(exercises.length).toBeGreaterThan(0);
    });

    it('should include budget exercise', async () => {
      const exercise = await service.getExercise('ex-dept-budget');

      expect(exercise).toBeDefined();
      expect(exercise?.type).toBe('EXCEL_MODEL');
      expect(exercise?.tools).toContain('Excel');
    });

    it('should include variance analysis exercise', async () => {
      const exercise = await service.getExercise('ex-variance-analysis');

      expect(exercise).toBeDefined();
      expect(exercise?.type).toBe('CASE_ANALYSIS');
    });

    it('should include SAF-T generation exercise', async () => {
      const exercise = await service.getExercise('ex-saft-generation');

      expect(exercise).toBeDefined();
      expect(exercise?.type).toBe('PLATFORM_INTEGRATION');
      expect(exercise?.difficulty).toBe('HARD');
    });

    it('should filter exercises by difficulty', async () => {
      const mediumExercises = await service.getExercisesByDifficulty('MEDIUM');

      expect(mediumExercises.length).toBeGreaterThan(0);
      mediumExercises.forEach(ex => {
        expect(ex.difficulty).toBe('MEDIUM');
      });
    });
  });

  describe('Regulations', () => {
    it('should return default regulations', async () => {
      const regulations = await service.getRegulations();

      expect(regulations.length).toBeGreaterThan(0);
    });

    it('should include OMFP 1802/2014', async () => {
      const regulation = await service.getRegulation('reg-omfp-1802');

      expect(regulation).toBeDefined();
      expect(regulation?.code).toBe('OMFP 1802/2014');
      expect(regulation?.source).toBe('MF');
    });

    it('should include SAF-T D406 regulation', async () => {
      const regulation = await service.getRegulation('reg-saft-d406');

      expect(regulation).toBeDefined();
      expect(regulation?.code).toBe('OPANAF 1783/2021');
    });

    it('should filter regulations by course', async () => {
      const courseRegs = await service.getRegulationsByCourse('ro-gaap-compliance');

      expect(courseRegs.length).toBeGreaterThan(0);
      courseRegs.forEach(reg => {
        expect(reg.relevantCourses).toContain('ro-gaap-compliance');
      });
    });
  });

  describe('Accounting Standards', () => {
    it('should return default standards', async () => {
      const standards = await service.getStandards();

      expect(standards.length).toBeGreaterThan(0);
    });

    it('should include RO GAAP standard', async () => {
      const standard = await service.getStandard('std-rogaap-imob');

      expect(standard).toBeDefined();
      expect(standard?.framework).toBe('RO_GAAP');
      expect(standard?.keyRequirements.length).toBeGreaterThan(0);
    });

    it('should include IFRS 16 standard', async () => {
      const standard = await service.getStandard('std-ifrs16');

      expect(standard).toBeDefined();
      expect(standard?.framework).toBe('IFRS');
      expect(standard?.code).toBe('IFRS 16');
    });

    it('should filter standards by framework', async () => {
      const ifrsStandards = await service.getStandardsByFramework('IFRS');

      expect(ifrsStandards.length).toBeGreaterThan(0);
      ifrsStandards.forEach(std => {
        expect(std.framework).toBe('IFRS');
      });
    });

    it('should include common mistakes and practical tips', async () => {
      const standard = await service.getStandard('std-rogaap-imob');

      expect(standard?.commonMistakes.length).toBeGreaterThan(0);
      expect(standard?.practicalTips.length).toBeGreaterThan(0);
    });
  });

  describe('Finance Credentials', () => {
    it('should return default credentials', async () => {
      const credentials = await service.getCredentials();

      expect(credentials.length).toBeGreaterThan(0);
    });

    it('should include operations finance credential', async () => {
      const credential = await service.getCredential('fin-cred-ops-finance');

      expect(credential).toBeDefined();
      expect(credential?.requiredCourses).toContain('budgeting-fundamentals');
      expect(credential?.examRequired).toBe(true);
    });

    it('should include compliance specialist credential', async () => {
      const credential = await service.getCredential('fin-cred-compliance-specialist');

      expect(credential).toBeDefined();
      expect(credential?.requiredCourses).toContain('ro-gaap-compliance');
      expect(credential?.professionalRecognition).toContain('CECCAR CPD credits');
    });

    it('should include complete finance master credential', async () => {
      const credential = await service.getCredential('fin-cred-complete');

      expect(credential).toBeDefined();
      expect(credential?.requiredCourses).toHaveLength(4);
      expect(credential?.totalCredits).toBe(18);
    });

    it('should have exam details for credentials', async () => {
      const credential = await service.getCredential('fin-cred-ops-finance');

      expect(credential?.examDetails).toBeDefined();
      expect(credential?.examDetails?.duration).toBe(90);
      expect(credential?.examDetails?.passingScore).toBe(70);
    });

    it('should check credential eligibility', async () => {
      const eligibility = await service.checkCredentialEligibility(
        'user-1',
        'fin-cred-ops-finance'
      );

      expect(eligibility).toBeDefined();
      expect(eligibility.missingRequired.length).toBeGreaterThan(0);
      expect(eligibility.eligible).toBe(false);
    });

    it('should award credential', async () => {
      const progress = await service.awardCredential('user-1', 'fin-cred-ops-finance');

      expect(progress.earnedAt).toBeDefined();
      expect(progress.verificationCode).toBeDefined();
      expect(progress.certificateUrl).toContain(progress.verificationCode);
    });

    it('should get user credentials', async () => {
      await service.awardCredential('user-1', 'fin-cred-ops-finance');
      await service.awardCredential('user-1', 'fin-cred-compliance-specialist');

      const credentials = await service.getUserCredentials('user-1');
      expect(credentials).toHaveLength(2);
    });

    it('should verify credential', async () => {
      const awarded = await service.awardCredential('user-1', 'fin-cred-ops-finance');

      const verified = await service.verifyCredential(awarded.verificationCode!);
      expect(verified).toBeDefined();
      expect(verified?.userId).toBe('user-1');
    });

    it('should return null for invalid verification code', async () => {
      const result = await service.verifyCredential('INVALID-CODE');
      expect(result).toBeNull();
    });
  });

  describe('Learning Paths', () => {
    it('should return learning paths', () => {
      const paths = service.getLearningPaths();

      expect(paths.length).toBeGreaterThan(0);
    });

    it('should include operations manager path', () => {
      const paths = service.getLearningPaths();
      const opsPath = paths.find(p => p.pathId === 'path-ops-manager');

      expect(opsPath).toBeDefined();
      expect(opsPath?.courses).toContain('budgeting-fundamentals');
      expect(opsPath?.targetRole).toContain('Operations Manager');
    });

    it('should include advanced accountant path', () => {
      const paths = service.getLearningPaths();
      const accountantPath = paths.find(p => p.pathId === 'path-accountant-advanced');

      expect(accountantPath).toBeDefined();
      expect(accountantPath?.courses).toContain('ro-gaap-compliance');
      expect(accountantPath?.courses).toContain('ifrs-fundamentals');
    });

    it('should include complete finance path', () => {
      const paths = service.getLearningPaths();
      const completePath = paths.find(p => p.pathId === 'path-finance-complete');

      expect(completePath).toBeDefined();
      expect(completePath?.courses.length).toBe(5);
      expect(completePath?.duration).toBe('30 săptămâni');
    });
  });

  describe('Corporate Training', () => {
    it('should return corporate packages', () => {
      const packages = service.getCorporateTrainingPackages();

      expect(packages.length).toBeGreaterThan(0);
    });

    it('should include finance fundamentals package', () => {
      const packages = service.getCorporateTrainingPackages();
      const fundamentals = packages.find(p => p.packageId === 'corp-finance-fundamentals');

      expect(fundamentals).toBeDefined();
      expect(fundamentals?.courses).toContain('budgeting-fundamentals');
      expect(fundamentals?.pricePerPerson).toBe(449);
    });

    it('should include compliance program', () => {
      const packages = service.getCorporateTrainingPackages();
      const compliance = packages.find(p => p.packageId === 'corp-compliance-program');

      expect(compliance).toBeDefined();
      expect(compliance?.courses).toContain('ro-gaap-compliance');
      expect(compliance?.features).toContain('Credite CECCAR pentru participanți');
    });

    it('should include transformation program', () => {
      const packages = service.getCorporateTrainingPackages();
      const transformation = packages.find(p => p.packageId === 'corp-finance-transformation');

      expect(transformation).toBeDefined();
      expect(transformation?.courses).toHaveLength(4);
      expect(transformation?.pricePerPerson).toBe(1499);
    });

    it('should have participant limits', () => {
      const packages = service.getCorporateTrainingPackages();

      packages.forEach(pkg => {
        expect(pkg.participants.min).toBeGreaterThan(0);
        expect(pkg.participants.max).toBeGreaterThan(pkg.participants.min);
      });
    });
  });

  describe('State Reset', () => {
    it('should reset all state', async () => {
      // Award a credential
      await service.awardCredential('user-1', 'fin-cred-ops-finance');

      // Reset
      service.resetState();

      // Verify credentials reset
      const credentials = await service.getUserCredentials('user-1');
      expect(credentials).toHaveLength(0);

      // Verify defaults restored
      const exercises = await service.getExercises();
      expect(exercises.length).toBeGreaterThan(0);

      const regulations = await service.getRegulations();
      expect(regulations.length).toBeGreaterThan(0);
    });
  });
});
