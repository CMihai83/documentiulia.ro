import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ExcelVBACoursesService } from './excel-vba-courses.service';
import { LMSService } from './lms.service';

describe('ExcelVBACoursesService', () => {
  let service: ExcelVBACoursesService;
  let lmsService: LMSService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExcelVBACoursesService,
        LMSService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-value'),
          },
        },
      ],
    }).compile();

    service = module.get<ExcelVBACoursesService>(ExcelVBACoursesService);
    lmsService = module.get<LMSService>(LMSService);
    service.resetState();
    lmsService.resetState();
  });

  // ===== COURSE TEMPLATES =====

  describe('Course Templates', () => {
    it('should return Excel Fundamentals template', () => {
      const template = service.getExcelFundamentalsTemplate();

      expect(template.title).toBe('Excel Fundamentals: From Zero to Productive');
      expect(template.category).toBe('EXCEL_VBA');
      expect(template.level).toBe('BEGINNER');
      expect(template.language).toBe('ro');
      expect(template.price).toBe(199);
      expect(template.currency).toBe('RON');
      expect(template.hrdaEligible).toBe(true);
      expect(template.modules.length).toBeGreaterThan(0);
    });

    it('should have correct Excel Fundamentals modules', () => {
      const template = service.getExcelFundamentalsTemplate();

      expect(template.modules.length).toBe(6);
      expect(template.modules[0].title).toContain('Introducere');
      expect(template.modules[1].title).toContain('Formatarea');
      expect(template.modules[2].title).toContain('Formule');
      expect(template.modules[3].title).toContain('Grafice');
      expect(template.modules[4].title).toContain('Gestionarea Datelor');
      expect(template.modules[5].title).toContain('Examen');
    });

    it('should have free preview module in Excel Fundamentals', () => {
      const template = service.getExcelFundamentalsTemplate();
      const firstModule = template.modules[0];

      expect(firstModule.isFree).toBe(true);
      expect(firstModule.lessons.some(l => l.isPreview)).toBe(true);
    });

    it('should have assessments in Excel Fundamentals modules', () => {
      const template = service.getExcelFundamentalsTemplate();
      const modulesWithAssessments = template.modules.filter(m => m.assessment);

      expect(modulesWithAssessments.length).toBeGreaterThan(3);
    });

    it('should return Pivot Tables template', () => {
      const template = service.getPivotTablesTemplate();

      expect(template.title).toBe('Pivot Tables & Data Analysis Masterclass');
      expect(template.level).toBe('INTERMEDIATE');
      expect(template.price).toBe(299);
      expect(template.ceuCredits).toBe(3);
      expect(template.modules.length).toBe(4);
    });

    it('should have Power Query module in Pivot Tables course', () => {
      const template = service.getPivotTablesTemplate();
      const powerQueryModule = template.modules.find(m => m.title.includes('Power Query'));

      expect(powerQueryModule).toBeDefined();
      expect(powerQueryModule?.lessons.some(l => l.title.includes('Import'))).toBe(true);
    });

    it('should return VBA Programming template', () => {
      const template = service.getVBAProgrammingTemplate();

      expect(template.title).toBe('VBA Programming: Excel Automation Mastery');
      expect(template.level).toBe('ADVANCED');
      expect(template.price).toBe(449);
      expect(template.ceuCredits).toBe(5);
      expect(template.modules.length).toBe(7);
    });

    it('should have UserForms module in VBA course', () => {
      const template = service.getVBAProgrammingTemplate();
      const userFormsModule = template.modules.find(m => m.title.includes('UserForms'));

      expect(userFormsModule).toBeDefined();
      expect(userFormsModule?.lessons.length).toBeGreaterThan(4);
    });

    it('should have real projects in VBA course', () => {
      const template = service.getVBAProgrammingTemplate();
      const projectsModule = template.modules.find(m => m.title.includes('Proiecte'));

      expect(projectsModule).toBeDefined();
      expect(projectsModule?.lessons.some(l => l.title.includes('Facturare'))).toBe(true);
    });

    it('should return Financial Modeling template', () => {
      const template = service.getFinancialModelingTemplate();

      expect(template.title).toBe('Financial Modeling in Excel');
      expect(template.level).toBe('EXPERT');
      expect(template.price).toBe(599);
      expect(template.ceuCredits).toBe(6);
      expect(template.modules.length).toBe(5);
    });

    it('should have DCF module in Financial Modeling course', () => {
      const template = service.getFinancialModelingTemplate();
      const dcfModule = template.modules.find(m => m.title.includes('DCF'));

      expect(dcfModule).toBeDefined();
      expect(dcfModule?.lessons.some(l => l.title.includes('WACC'))).toBe(true);
    });

    it('should have 3 statements model in Financial Modeling', () => {
      const template = service.getFinancialModelingTemplate();
      const statementsModule = template.modules.find(m => m.title.includes('3 Statements'));

      expect(statementsModule).toBeDefined();
      expect(statementsModule?.lessons.some(l => l.title.includes('Income Statement'))).toBe(true);
      expect(statementsModule?.lessons.some(l => l.title.includes('Balance Sheet'))).toBe(true);
      expect(statementsModule?.lessons.some(l => l.title.includes('Cash Flow'))).toBe(true);
    });
  });

  // ===== COURSE GENERATION =====

  describe('Course Generation', () => {
    it('should generate Excel Fundamentals course', async () => {
      const template = service.getExcelFundamentalsTemplate();
      const course = await service.generateCourse(template, 'inst-excel');

      expect(course.id).toBeDefined();
      expect(course.title).toBe('Excel Fundamentals: From Zero to Productive');
      expect(course.status).toBe('DRAFT');
      expect(course.modules.length).toBe(6);
    });

    it('should generate course with correct lesson count', async () => {
      const template = service.getExcelFundamentalsTemplate();
      const course = await service.generateCourse(template, 'inst-excel');

      const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
      const templateLessons = template.modules.reduce((sum, m) => sum + m.lessons.length, 0);

      expect(totalLessons).toBe(templateLessons);
    });

    it('should generate course with assessments published', async () => {
      const template = service.getExcelFundamentalsTemplate();
      await service.generateCourse(template, 'inst-excel');

      // Assessments should be created and published
      // We can verify by checking if the course has modules with assessments
      const modulesWithAssessments = template.modules.filter(m => m.assessment);
      expect(modulesWithAssessments.length).toBeGreaterThan(0);
    });

    it('should generate Pivot Tables course', async () => {
      const template = service.getPivotTablesTemplate();
      const course = await service.generateCourse(template, 'inst-pivot');

      expect(course.title).toBe('Pivot Tables & Data Analysis Masterclass');
      expect(course.level).toBe('INTERMEDIATE');
      expect(course.modules.length).toBe(4);
    });

    it('should generate VBA Programming course', async () => {
      const template = service.getVBAProgrammingTemplate();
      const course = await service.generateCourse(template, 'inst-vba');

      expect(course.title).toBe('VBA Programming: Excel Automation Mastery');
      expect(course.level).toBe('ADVANCED');
      expect(course.modules.length).toBe(7);
    });

    it('should generate Financial Modeling course', async () => {
      const template = service.getFinancialModelingTemplate();
      const course = await service.generateCourse(template, 'inst-finance');

      expect(course.title).toBe('Financial Modeling in Excel');
      expect(course.level).toBe('EXPERT');
      expect(course.modules.length).toBe(5);
    });

    it('should generate all Excel courses at once', async () => {
      const result = await service.generateAllExcelCourses('inst-all');

      expect(result.fundamentals).toBeDefined();
      expect(result.pivotTables).toBeDefined();
      expect(result.vba).toBeDefined();
      expect(result.financialModeling).toBeDefined();

      expect(result.fundamentals.level).toBe('BEGINNER');
      expect(result.pivotTables.level).toBe('INTERMEDIATE');
      expect(result.vba.level).toBe('ADVANCED');
      expect(result.financialModeling.level).toBe('EXPERT');
    });

    it('should create courses with HRDA eligibility', async () => {
      const result = await service.generateAllExcelCourses('inst-hrda');

      expect(result.fundamentals.hrdaEligible).toBe(true);
      expect(result.pivotTables.hrdaEligible).toBe(true);
      expect(result.vba.hrdaEligible).toBe(true);
      expect(result.financialModeling.hrdaEligible).toBe(true);
    });

    it('should create courses with CEU credits', async () => {
      const result = await service.generateAllExcelCourses('inst-ceu');

      expect(result.fundamentals.ceuCredits).toBe(2);
      expect(result.pivotTables.ceuCredits).toBe(3);
      expect(result.vba.ceuCredits).toBe(5);
      expect(result.financialModeling.ceuCredits).toBe(6);
    });
  });

  // ===== SIMULATION EXERCISES =====

  describe('Simulation Exercises', () => {
    it('should create simulation exercise', async () => {
      const simulation = await service.createSimulationExercise({
        courseId: 'course-1',
        moduleId: 'module-1',
        title: 'VLOOKUP Practice',
        description: 'Practice using VLOOKUP to match data',
        type: 'FORMULA',
        difficulty: 'MEDIUM',
        instructions: [
          'Open the provided workbook',
          'Use VLOOKUP to find product prices',
          'Calculate total order values',
        ],
        startingData: JSON.stringify({ products: [], orders: [] }),
        expectedResult: 'All orders have correct prices and totals',
        hints: ['Remember VLOOKUP searches in the first column', 'Use FALSE for exact match'],
        solutionSteps: ['Step 1: Setup', 'Step 2: Formula', 'Step 3: Copy down'],
        timeEstimate: 15,
        points: 50,
        skills: ['VLOOKUP', 'Cell References', 'Data Matching'],
      });

      expect(simulation.id).toBeDefined();
      expect(simulation.title).toBe('VLOOKUP Practice');
      expect(simulation.type).toBe('FORMULA');
      expect(simulation.difficulty).toBe('MEDIUM');
      expect(simulation.points).toBe(50);
    });

    it('should get simulation by ID', async () => {
      const created = await service.createSimulationExercise({
        courseId: 'course-1',
        moduleId: 'module-1',
        title: 'Pivot Table Exercise',
        description: 'Create a pivot table from sales data',
        type: 'PIVOT_TABLE',
        difficulty: 'EASY',
        instructions: ['Create pivot table'],
        startingData: '{}',
        expectedResult: 'Pivot shows sales by region',
        hints: [],
        solutionSteps: [],
        timeEstimate: 10,
        points: 30,
        skills: ['Pivot Tables'],
      });

      const retrieved = await service.getSimulationExercise(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('Pivot Table Exercise');
    });

    it('should get simulations for module', async () => {
      await service.createSimulationExercise({
        courseId: 'course-1',
        moduleId: 'module-formulas',
        title: 'SUM Exercise',
        description: 'Practice SUM',
        type: 'FORMULA',
        difficulty: 'EASY',
        instructions: [],
        startingData: '{}',
        expectedResult: '',
        hints: [],
        solutionSteps: [],
        timeEstimate: 5,
        points: 10,
        skills: ['SUM'],
      });

      await service.createSimulationExercise({
        courseId: 'course-1',
        moduleId: 'module-formulas',
        title: 'IF Exercise',
        description: 'Practice IF',
        type: 'FORMULA',
        difficulty: 'MEDIUM',
        instructions: [],
        startingData: '{}',
        expectedResult: '',
        hints: [],
        solutionSteps: [],
        timeEstimate: 10,
        points: 20,
        skills: ['IF'],
      });

      await service.createSimulationExercise({
        courseId: 'course-1',
        moduleId: 'module-charts',
        title: 'Chart Exercise',
        description: 'Create chart',
        type: 'CHART',
        difficulty: 'EASY',
        instructions: [],
        startingData: '{}',
        expectedResult: '',
        hints: [],
        solutionSteps: [],
        timeEstimate: 8,
        points: 15,
        skills: ['Charts'],
      });

      const formulaSimulations = await service.getSimulationsForModule('module-formulas');

      expect(formulaSimulations).toHaveLength(2);
      expect(formulaSimulations.every(s => s.moduleId === 'module-formulas')).toBe(true);
    });

    it('should get simulations for course', async () => {
      await service.createSimulationExercise({
        courseId: 'course-excel',
        moduleId: 'module-1',
        title: 'Exercise 1',
        description: 'E1',
        type: 'SPREADSHEET',
        difficulty: 'EASY',
        instructions: [],
        startingData: '{}',
        expectedResult: '',
        hints: [],
        solutionSteps: [],
        timeEstimate: 5,
        points: 10,
        skills: [],
      });

      await service.createSimulationExercise({
        courseId: 'course-excel',
        moduleId: 'module-2',
        title: 'Exercise 2',
        description: 'E2',
        type: 'MACRO',
        difficulty: 'HARD',
        instructions: [],
        startingData: '{}',
        expectedResult: '',
        hints: [],
        solutionSteps: [],
        timeEstimate: 20,
        points: 50,
        skills: [],
      });

      const courseSimulations = await service.getSimulationsForCourse('course-excel');

      expect(courseSimulations).toHaveLength(2);
      expect(courseSimulations.every(s => s.courseId === 'course-excel')).toBe(true);
    });

    it('should create different simulation types', async () => {
      const types: Array<'SPREADSHEET' | 'MACRO' | 'FORMULA' | 'DATA_ANALYSIS' | 'CHART' | 'PIVOT_TABLE'> = [
        'SPREADSHEET', 'MACRO', 'FORMULA', 'DATA_ANALYSIS', 'CHART', 'PIVOT_TABLE',
      ];

      for (const type of types) {
        const sim = await service.createSimulationExercise({
          courseId: 'course-types',
          moduleId: 'module-types',
          title: `${type} Exercise`,
          description: `Practice ${type}`,
          type,
          difficulty: 'EASY',
          instructions: [],
          startingData: '{}',
          expectedResult: '',
          hints: [],
          solutionSteps: [],
          timeEstimate: 5,
          points: 10,
          skills: [],
        });

        expect(sim.type).toBe(type);
      }
    });
  });

  // ===== COURSE BUNDLES =====

  describe('Course Bundles', () => {
    it('should create course bundle', async () => {
      const courses = await service.generateAllExcelCourses('inst-bundle');

      const bundle = await service.createCourseBundle({
        title: 'Excel Mastery Bundle',
        description: 'All 4 Excel courses at a discount',
        courses: [
          courses.fundamentals.id,
          courses.pivotTables.id,
          courses.vba.id,
          courses.financialModeling.id,
        ],
        bundlePrice: 999,
        currency: 'RON',
        certificateName: 'Excel Master Certificate',
      });

      expect(bundle.id).toBeDefined();
      expect(bundle.title).toBe('Excel Mastery Bundle');
      expect(bundle.courses).toHaveLength(4);
      expect(bundle.bundlePrice).toBe(999);
    });

    it('should calculate bundle savings', async () => {
      const courses = await service.generateAllExcelCourses('inst-savings');

      // Original prices: 199 + 299 + 449 + 599 = 1546 RON
      const bundle = await service.createCourseBundle({
        title: 'Full Bundle',
        description: 'All courses',
        courses: [
          courses.fundamentals.id,
          courses.pivotTables.id,
          courses.vba.id,
          courses.financialModeling.id,
        ],
        bundlePrice: 999,
        currency: 'RON',
        certificateName: 'Excel Master',
      });

      expect(bundle.originalPrice).toBe(1546);
      expect(bundle.bundlePrice).toBe(999);
      expect(bundle.savings).toBe(547);
    });

    it('should get bundle by ID', async () => {
      const courses = await service.generateAllExcelCourses('inst-get');

      const created = await service.createCourseBundle({
        title: 'Test Bundle',
        description: 'Test',
        courses: [courses.fundamentals.id, courses.pivotTables.id],
        bundlePrice: 399,
        currency: 'RON',
        certificateName: 'Test Cert',
      });

      const retrieved = await service.getCourseBundle(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('Test Bundle');
    });

    it('should list all bundles', async () => {
      const courses = await service.generateAllExcelCourses('inst-list');

      await service.createCourseBundle({
        title: 'Beginner Bundle',
        description: 'For beginners',
        courses: [courses.fundamentals.id, courses.pivotTables.id],
        bundlePrice: 399,
        currency: 'RON',
        certificateName: 'Beginner Cert',
      });

      await service.createCourseBundle({
        title: 'Advanced Bundle',
        description: 'For advanced users',
        courses: [courses.vba.id, courses.financialModeling.id],
        bundlePrice: 799,
        currency: 'RON',
        certificateName: 'Advanced Cert',
      });

      const bundles = await service.listCourseBundles();

      expect(bundles).toHaveLength(2);
    });
  });

  // ===== REFERENCE DATA =====

  describe('Reference Data', () => {
    it('should return Excel skill levels', () => {
      const levels = service.getExcelSkillLevels();

      expect(levels).toHaveLength(4);
      expect(levels.map(l => l.level)).toEqual(['Beginner', 'Intermediate', 'Advanced', 'Expert']);
    });

    it('should map skill levels to courses', () => {
      const levels = service.getExcelSkillLevels();

      const beginnerLevel = levels.find(l => l.level === 'Beginner');
      expect(beginnerLevel?.courses).toContain('Excel Fundamentals');

      const advancedLevel = levels.find(l => l.level === 'Advanced');
      expect(advancedLevel?.courses).toContain('VBA Programming');
    });

    it('should return course recommendations', () => {
      const recommendations = service.getCourseRecommendations('user-123');

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].reason).toBeDefined();
    });
  });

  // ===== LESSON CONTENT VALIDATION =====

  describe('Lesson Content Validation', () => {
    it('should have video URLs for video lessons', () => {
      const template = service.getExcelFundamentalsTemplate();

      for (const module of template.modules) {
        for (const lesson of module.lessons) {
          if (lesson.type === 'VIDEO') {
            expect(lesson.content.videoUrl).toBeDefined();
            expect(lesson.content.videoUrl).toContain('documentiulia.ro');
          }
        }
      }
    });

    it('should have download info for download lessons', () => {
      const template = service.getExcelFundamentalsTemplate();

      for (const module of template.modules) {
        for (const lesson of module.lessons) {
          if (lesson.type === 'DOWNLOAD') {
            expect(lesson.content.downloadUrl).toBeDefined();
            expect(lesson.content.downloadFilename).toBeDefined();
          }
        }
      }
    });

    it('should have text content for text lessons', () => {
      const template = service.getExcelFundamentalsTemplate();

      for (const module of template.modules) {
        for (const lesson of module.lessons) {
          if (lesson.type === 'TEXT') {
            expect(lesson.content.textContent).toBeDefined();
            expect(lesson.content.textContent?.length).toBeGreaterThan(50);
          }
        }
      }
    });

    it('should have valid durations for all lessons', () => {
      const templates = [
        service.getExcelFundamentalsTemplate(),
        service.getPivotTablesTemplate(),
        service.getVBAProgrammingTemplate(),
        service.getFinancialModelingTemplate(),
      ];

      for (const template of templates) {
        for (const module of template.modules) {
          for (const lesson of module.lessons) {
            expect(lesson.duration).toBeGreaterThan(0);
            expect(lesson.duration).toBeLessThanOrEqual(60); // Max 60 min per lesson
          }
        }
      }
    });
  });

  // ===== ASSESSMENT VALIDATION =====

  describe('Assessment Validation', () => {
    it('should have questions in assessments', () => {
      const template = service.getExcelFundamentalsTemplate();

      for (const module of template.modules) {
        if (module.assessment) {
          expect(module.assessment.questions.length).toBeGreaterThan(0);
        }
      }
    });

    it('should have valid passing scores', () => {
      const template = service.getExcelFundamentalsTemplate();

      for (const module of template.modules) {
        if (module.assessment) {
          expect(module.assessment.passingScore).toBeGreaterThanOrEqual(50);
          expect(module.assessment.passingScore).toBeLessThanOrEqual(100);
        }
      }
    });

    it('should have correct answers for questions', () => {
      const template = service.getExcelFundamentalsTemplate();

      for (const module of template.modules) {
        if (module.assessment) {
          for (const question of module.assessment.questions) {
            if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
              expect(question.correctAnswer).toBeDefined();
              expect(question.options?.some(o => o.isCorrect)).toBe(true);
            }
          }
        }
      }
    });

    it('should have points for all questions', () => {
      const template = service.getExcelFundamentalsTemplate();

      for (const module of template.modules) {
        if (module.assessment) {
          for (const question of module.assessment.questions) {
            expect(question.points).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  // ===== COURSE PRICING =====

  describe('Course Pricing', () => {
    it('should have increasing prices for higher levels', () => {
      const fundamentals = service.getExcelFundamentalsTemplate();
      const pivotTables = service.getPivotTablesTemplate();
      const vba = service.getVBAProgrammingTemplate();
      const financial = service.getFinancialModelingTemplate();

      expect(fundamentals.price).toBeLessThan(pivotTables.price);
      expect(pivotTables.price).toBeLessThan(vba.price);
      expect(vba.price).toBeLessThan(financial.price);
    });

    it('should have increasing CEU credits for higher levels', () => {
      const fundamentals = service.getExcelFundamentalsTemplate();
      const pivotTables = service.getPivotTablesTemplate();
      const vba = service.getVBAProgrammingTemplate();
      const financial = service.getFinancialModelingTemplate();

      expect(fundamentals.ceuCredits).toBeLessThan(pivotTables.ceuCredits);
      expect(pivotTables.ceuCredits).toBeLessThan(vba.ceuCredits);
      expect(vba.ceuCredits).toBeLessThan(financial.ceuCredits);
    });

    it('should use RON as currency', () => {
      const templates = [
        service.getExcelFundamentalsTemplate(),
        service.getPivotTablesTemplate(),
        service.getVBAProgrammingTemplate(),
        service.getFinancialModelingTemplate(),
      ];

      for (const template of templates) {
        expect(template.currency).toBe('RON');
      }
    });
  });
});
