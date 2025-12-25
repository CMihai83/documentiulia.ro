import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PMAgileCoursesService } from './pm-agile-courses.service';
import { LMSService } from './lms.service';

describe('PMAgileCoursesService', () => {
  let service: PMAgileCoursesService;
  let lmsService: LMSService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PMAgileCoursesService,
        LMSService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-value'),
          },
        },
      ],
    }).compile();

    service = module.get<PMAgileCoursesService>(PMAgileCoursesService);
    lmsService = module.get<LMSService>(LMSService);
    service.resetState();
    lmsService.resetState();
  });

  // ===== COURSE TEMPLATES =====

  describe('Course Templates', () => {
    it('should return PM Fundamentals template', () => {
      const template = service.getPMPFundamentalsTemplate();

      expect(template.title).toBe('Project Management Fundamentals (PMP-Aligned)');
      expect(template.category).toBe('PROJECT_MANAGEMENT');
      expect(template.level).toBe('INTERMEDIATE');
      expect(template.language).toBe('ro');
      expect(template.price).toBe(399);
      expect(template.ceuCredits).toBe(4);
      expect(template.pduCredits).toBe(35);
      expect(template.hrdaEligible).toBe(true);
    });

    it('should have correct PM Fundamentals modules', () => {
      const template = service.getPMPFundamentalsTemplate();

      expect(template.modules.length).toBe(7);
      expect(template.modules[0].title).toContain('Introducere');
      expect(template.modules[1].title).toContain('Inițierea');
      expect(template.modules[2].title).toContain('Planificarea');
      expect(template.modules[3].title).toContain('Riscurilor');
      expect(template.modules[4].title).toContain('Execuția');
      expect(template.modules[5].title).toContain('Închiderea');
      expect(template.modules[6].title).toContain('Examen');
    });

    it('should have free preview in PM Fundamentals', () => {
      const template = service.getPMPFundamentalsTemplate();
      const firstModule = template.modules[0];

      expect(firstModule.isFree).toBe(true);
      expect(firstModule.lessons.some(l => l.isPreview)).toBe(true);
    });

    it('should have assessments in PM modules', () => {
      const template = service.getPMPFundamentalsTemplate();
      const modulesWithAssessments = template.modules.filter(m => m.assessment);

      expect(modulesWithAssessments.length).toBeGreaterThan(3);
    });

    it('should return Agile Scrum template', () => {
      const template = service.getAgileScrumTemplate();

      expect(template.title).toBe('Agile & Scrum Mastery');
      expect(template.level).toBe('INTERMEDIATE');
      expect(template.price).toBe(349);
      expect(template.ceuCredits).toBe(3);
      expect(template.pduCredits).toBe(21);
    });

    it('should have Scrum ceremonies module', () => {
      const template = service.getAgileScrumTemplate();
      const ceremoniesModule = template.modules.find(m => m.title.includes('Ceremoniile'));

      expect(ceremoniesModule).toBeDefined();
      expect(ceremoniesModule?.lessons.some(l => l.title.includes('Sprint Planning'))).toBe(true);
      expect(ceremoniesModule?.lessons.some(l => l.title.includes('Daily Scrum'))).toBe(true);
      expect(ceremoniesModule?.lessons.some(l => l.title.includes('Retrospective'))).toBe(true);
    });

    it('should have User Stories module', () => {
      const template = service.getAgileScrumTemplate();
      const userStoriesModule = template.modules.find(m => m.title.includes('User Stories'));

      expect(userStoriesModule).toBeDefined();
      expect(userStoriesModule?.lessons.some(l => l.title.includes('INVEST'))).toBe(true);
    });

    it('should have Kanban content', () => {
      const template = service.getAgileScrumTemplate();
      const kanbanModule = template.modules.find(m => m.title.includes('Kanban'));

      expect(kanbanModule).toBeDefined();
    });
  });

  // ===== COURSE GENERATION =====

  describe('Course Generation', () => {
    it('should generate PM Fundamentals course', async () => {
      const template = service.getPMPFundamentalsTemplate();
      const course = await service.generateCourse(template, 'inst-pm');

      expect(course.id).toBeDefined();
      expect(course.title).toBe('Project Management Fundamentals (PMP-Aligned)');
      expect(course.status).toBe('DRAFT');
      expect(course.modules.length).toBe(7);
    });

    it('should generate Agile Scrum course', async () => {
      const template = service.getAgileScrumTemplate();
      const course = await service.generateCourse(template, 'inst-agile');

      expect(course.title).toBe('Agile & Scrum Mastery');
      expect(course.modules.length).toBe(6);
    });

    it('should generate all PM courses at once', async () => {
      const result = await service.generateAllPMCourses('inst-all');

      expect(result.pmFundamentals).toBeDefined();
      expect(result.agileScrum).toBeDefined();
      expect(result.pmFundamentals.title).toContain('Project Management');
      expect(result.agileScrum.title).toContain('Agile');
    });

    it('should create courses with PDU credits', async () => {
      const pmTemplate = service.getPMPFundamentalsTemplate();
      const agileTemplate = service.getAgileScrumTemplate();

      expect(pmTemplate.pduCredits).toBe(35);
      expect(agileTemplate.pduCredits).toBe(21);
    });
  });

  // ===== PRACTICE EXAMS =====

  describe('Practice Exams', () => {
    it('should create practice exam', async () => {
      const exam = await service.createPracticeExam({
        title: 'PMP Practice Exam 1',
        description: 'Full-length PMP practice exam',
        examType: 'PMP',
        questions: [
          { id: 'q1', type: 'MULTIPLE_CHOICE', text: 'Q1', points: 1, correctAnswer: 'a' },
          { id: 'q2', type: 'MULTIPLE_CHOICE', text: 'Q2', points: 1, correctAnswer: 'b' },
        ],
        totalQuestions: 2,
        passingScore: 70,
        timeLimit: 240,
        difficulty: 'EXAM_LEVEL',
      });

      expect(exam.id).toBeDefined();
      expect(exam.title).toBe('PMP Practice Exam 1');
      expect(exam.examType).toBe('PMP');
      expect(exam.totalQuestions).toBe(2);
    });

    it('should get practice exam by ID', async () => {
      const created = await service.createPracticeExam({
        title: 'CAPM Practice',
        description: 'CAPM practice questions',
        examType: 'CAPM',
        questions: [],
        totalQuestions: 0,
        passingScore: 65,
        timeLimit: 180,
        difficulty: 'MEDIUM',
      });

      const retrieved = await service.getPracticeExam(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('CAPM Practice');
    });

    it('should list practice exams by type', async () => {
      await service.createPracticeExam({
        title: 'PMP Exam 1',
        description: 'PMP',
        examType: 'PMP',
        questions: [],
        totalQuestions: 0,
        passingScore: 70,
        timeLimit: 240,
        difficulty: 'EXAM_LEVEL',
      });

      await service.createPracticeExam({
        title: 'PSM Exam 1',
        description: 'PSM',
        examType: 'PSM',
        questions: [],
        totalQuestions: 0,
        passingScore: 85,
        timeLimit: 60,
        difficulty: 'HARD',
      });

      const pmpExams = await service.listPracticeExams('PMP');
      expect(pmpExams).toHaveLength(1);
      expect(pmpExams[0].examType).toBe('PMP');

      const allExams = await service.listPracticeExams();
      expect(allExams).toHaveLength(2);
    });

    it('should start exam attempt', async () => {
      const exam = await service.createPracticeExam({
        title: 'Test Exam',
        description: 'Test',
        examType: 'PMP',
        questions: [
          { id: 'q1', type: 'MULTIPLE_CHOICE', text: 'Q1', points: 10, correctAnswer: 'a' },
        ],
        totalQuestions: 1,
        passingScore: 70,
        timeLimit: 30,
        difficulty: 'EASY',
      });

      const attempt = await service.startExamAttempt(exam.id, 'user-001');

      expect(attempt.id).toBeDefined();
      expect(attempt.examId).toBe(exam.id);
      expect(attempt.userId).toBe('user-001');
      expect(attempt.startedAt).toBeDefined();
    });

    it('should submit and grade exam attempt', async () => {
      const exam = await service.createPracticeExam({
        title: 'Grading Test',
        description: 'Test grading',
        examType: 'PMP',
        questions: [
          { id: 'q1', type: 'MULTIPLE_CHOICE', text: 'Q1', points: 50, correctAnswer: 'a', options: [] },
          { id: 'q2', type: 'MULTIPLE_CHOICE', text: 'Q2', points: 50, correctAnswer: 'b', options: [] },
        ],
        totalQuestions: 2,
        passingScore: 70,
        timeLimit: 30,
        difficulty: 'MEDIUM',
      });

      const attempt = await service.startExamAttempt(exam.id, 'user-001');

      const submitted = await service.submitExamAttempt(attempt.id, [
        { questionId: 'q1', answer: 'a', timeSpent: 60 },
        { questionId: 'q2', answer: 'b', timeSpent: 45 },
      ]);

      expect(submitted.score).toBe(100);
      expect(submitted.percentage).toBe(100);
      expect(submitted.passed).toBe(true);
      expect(submitted.completedAt).toBeDefined();
    });

    it('should fail exam with low score', async () => {
      const exam = await service.createPracticeExam({
        title: 'Fail Test',
        description: 'Test failing',
        examType: 'PMP',
        questions: [
          { id: 'q1', type: 'MULTIPLE_CHOICE', text: 'Q1', points: 50, correctAnswer: 'a', options: [] },
          { id: 'q2', type: 'MULTIPLE_CHOICE', text: 'Q2', points: 50, correctAnswer: 'b', options: [] },
        ],
        totalQuestions: 2,
        passingScore: 70,
        timeLimit: 30,
        difficulty: 'MEDIUM',
      });

      const attempt = await service.startExamAttempt(exam.id, 'user-001');

      const submitted = await service.submitExamAttempt(attempt.id, [
        { questionId: 'q1', answer: 'wrong', timeSpent: 60 },
        { questionId: 'q2', answer: 'wrong', timeSpent: 45 },
      ]);

      expect(submitted.score).toBe(0);
      expect(submitted.percentage).toBe(0);
      expect(submitted.passed).toBe(false);
    });

    it('should get user exam attempts', async () => {
      const exam = await service.createPracticeExam({
        title: 'User Attempts Test',
        description: 'Test',
        examType: 'PSM',
        questions: [],
        totalQuestions: 0,
        passingScore: 85,
        timeLimit: 60,
        difficulty: 'HARD',
      });

      await service.startExamAttempt(exam.id, 'user-001');
      await service.startExamAttempt(exam.id, 'user-001');

      const attempts = await service.getUserExamAttempts('user-001');
      expect(attempts).toHaveLength(2);
    });
  });

  // ===== MICRO-CREDENTIALS =====

  describe('Micro-Credentials', () => {
    it('should have default micro-credentials initialized', async () => {
      const credentials = await service.getMicroCredentials();

      expect(credentials.length).toBeGreaterThan(0);
      expect(credentials.some(c => c.name === 'Project Management Fundamentals')).toBe(true);
      expect(credentials.some(c => c.name === 'Agile Practitioner')).toBe(true);
    });

    it('should get micro-credential by ID', async () => {
      const credentials = await service.getMicroCredentials();
      const firstCred = credentials[0];

      const retrieved = await service.getMicroCredential(firstCred.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(firstCred.id);
    });

    it('should award micro-credential to user', async () => {
      const credentials = await service.getMicroCredentials();
      const credential = credentials[0];

      const userCredential = await service.awardMicroCredential('user-001', credential.id);

      expect(userCredential.id).toBeDefined();
      expect(userCredential.userId).toBe('user-001');
      expect(userCredential.credential.name).toBe(credential.name);
      expect(userCredential.verificationCode).toBeDefined();
      expect(userCredential.status).toBe('ACTIVE');
    });

    it('should set credential expiration based on validity months', async () => {
      const credentials = await service.getMicroCredentials();
      const credential = credentials[0];

      const userCredential = await service.awardMicroCredential('user-001', credential.id);

      const expectedExpiry = new Date(userCredential.earnedAt);
      expectedExpiry.setMonth(expectedExpiry.getMonth() + credential.validityMonths);

      expect(userCredential.expiresAt.getMonth()).toBe(expectedExpiry.getMonth());
    });

    it('should get user micro-credentials', async () => {
      const credentials = await service.getMicroCredentials();

      await service.awardMicroCredential('user-001', credentials[0].id);
      await service.awardMicroCredential('user-001', credentials[1].id);

      const userCredentials = await service.getUserMicroCredentials('user-001');

      expect(userCredentials).toHaveLength(2);
    });

    it('should verify micro-credential by code', async () => {
      const credentials = await service.getMicroCredentials();
      const awarded = await service.awardMicroCredential('user-001', credentials[0].id);

      const verified = await service.verifyMicroCredential(awarded.verificationCode);

      expect(verified).toBeDefined();
      expect(verified?.userId).toBe('user-001');
    });

    it('should have industry recognition info', async () => {
      const credentials = await service.getMicroCredentials();
      const pmCred = credentials.find(c => c.category === 'PROJECT_MANAGEMENT');

      expect(pmCred?.industryRecognition).toBeDefined();
      expect(pmCred?.industryRecognition.length).toBeGreaterThan(0);
    });
  });

  // ===== PROJECT TEMPLATES =====

  describe('Project Templates', () => {
    it('should have default project templates initialized', async () => {
      const templates = await service.getProjectTemplates();

      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have software development template', async () => {
      const templates = await service.getProjectTemplates();
      const softwareTemplate = templates.find(t => t.name.includes('Software'));

      expect(softwareTemplate).toBeDefined();
      expect(softwareTemplate?.methodology).toBe('AGILE');
      expect(softwareTemplate?.phases.length).toBeGreaterThan(0);
    });

    it('should have construction template', async () => {
      const templates = await service.getProjectTemplates();
      const constructionTemplate = templates.find(t => t.name.includes('Construction'));

      expect(constructionTemplate).toBeDefined();
      expect(constructionTemplate?.methodology).toBe('WATERFALL');
    });

    it('should have hybrid template', async () => {
      const templates = await service.getProjectTemplates();
      const hybridTemplate = templates.find(t => t.methodology === 'HYBRID');

      expect(hybridTemplate).toBeDefined();
    });

    it('should get template by ID', async () => {
      const templates = await service.getProjectTemplates();
      const template = templates[0];

      const retrieved = await service.getProjectTemplate(template.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(template.id);
    });

    it('should get templates by methodology', async () => {
      const agileTemplates = await service.getTemplatesByMethodology('AGILE');

      expect(agileTemplates.length).toBeGreaterThan(0);
      expect(agileTemplates.every(t => t.methodology === 'AGILE')).toBe(true);
    });

    it('should have phases with deliverables', async () => {
      const templates = await service.getProjectTemplates();
      const template = templates[0];

      expect(template.phases.length).toBeGreaterThan(0);
      expect(template.phases[0].deliverables.length).toBeGreaterThan(0);
    });

    it('should have artifacts with categories', async () => {
      const templates = await service.getProjectTemplates();
      const template = templates[0];

      expect(template.artifacts.length).toBeGreaterThan(0);
      expect(template.artifacts[0].category).toBeDefined();
    });

    it('should have roles defined', async () => {
      const templates = await service.getProjectTemplates();
      const template = templates[0];

      expect(template.roles.length).toBeGreaterThan(0);
    });
  });

  // ===== REFERENCE DATA =====

  describe('Reference Data', () => {
    it('should return certification paths', () => {
      const paths = service.getCertificationPaths();

      expect(paths.length).toBeGreaterThan(0);
      expect(paths.some(p => p.path === 'PMI Traditional')).toBe(true);
      expect(paths.some(p => p.path === 'Agile/Scrum')).toBe(true);
      expect(paths.some(p => p.path === 'PRINCE2')).toBe(true);
    });

    it('should have certifications in each path', () => {
      const paths = service.getCertificationPaths();

      for (const path of paths) {
        expect(path.certifications.length).toBeGreaterThan(0);
        expect(path.description).toBeDefined();
      }
    });

    it('should return PDU categories', () => {
      const categories = service.getPDUCategories();

      expect(categories.length).toBe(3);
      expect(categories.some(c => c.category === 'Technical')).toBe(true);
      expect(categories.some(c => c.category === 'Leadership')).toBe(true);
      expect(categories.some(c => c.category === 'Strategic')).toBe(true);
    });

    it('should have minimum PDU requirements', () => {
      const categories = service.getPDUCategories();

      for (const category of categories) {
        expect(category.minRequired).toBeGreaterThan(0);
      }
    });
  });

  // ===== LESSON CONTENT VALIDATION =====

  describe('Lesson Content', () => {
    it('should have video URLs for video lessons', () => {
      const pmTemplate = service.getPMPFundamentalsTemplate();

      for (const module of pmTemplate.modules) {
        for (const lesson of module.lessons) {
          if (lesson.type === 'VIDEO') {
            expect(lesson.content.videoUrl).toBeDefined();
          }
        }
      }
    });

    it('should have downloadable resources', () => {
      const pmTemplate = service.getPMPFundamentalsTemplate();
      const downloadLessons = pmTemplate.modules
        .flatMap(m => m.lessons)
        .filter(l => l.type === 'DOWNLOAD');

      expect(downloadLessons.length).toBeGreaterThan(0);
      for (const lesson of downloadLessons) {
        expect(lesson.content.downloadUrl).toBeDefined();
        expect(lesson.content.downloadFilename).toBeDefined();
      }
    });

    it('should have text content for text lessons', () => {
      const pmTemplate = service.getPMPFundamentalsTemplate();

      for (const module of pmTemplate.modules) {
        for (const lesson of module.lessons) {
          if (lesson.type === 'TEXT') {
            expect(lesson.content.textContent).toBeDefined();
            expect(lesson.content.textContent?.length).toBeGreaterThan(50);
          }
        }
      }
    });
  });

  // ===== ASSESSMENT VALIDATION =====

  describe('Assessments', () => {
    it('should have questions in quizzes', () => {
      const pmTemplate = service.getPMPFundamentalsTemplate();

      for (const module of pmTemplate.modules) {
        if (module.assessment && module.assessment.type === 'QUIZ') {
          expect(module.assessment.questions.length).toBeGreaterThan(0);
        }
      }
    });

    it('should have valid passing scores', () => {
      const pmTemplate = service.getPMPFundamentalsTemplate();

      for (const module of pmTemplate.modules) {
        if (module.assessment) {
          expect(module.assessment.passingScore).toBeGreaterThanOrEqual(60);
          expect(module.assessment.passingScore).toBeLessThanOrEqual(100);
        }
      }
    });

    it('should have final exam with high question count', () => {
      const pmTemplate = service.getPMPFundamentalsTemplate();
      const finalExamModule = pmTemplate.modules.find(m => m.title.includes('Examen'));

      expect(finalExamModule?.assessment).toBeDefined();
      expect(finalExamModule?.assessment?.type).toBe('PRACTICE_EXAM');
      expect(finalExamModule?.assessment?.questions.length).toBeGreaterThanOrEqual(10);
    });
  });

  // ===== COURSE PRICING =====

  describe('Course Pricing', () => {
    it('should use RON as currency', () => {
      const pmTemplate = service.getPMPFundamentalsTemplate();
      const agileTemplate = service.getAgileScrumTemplate();

      expect(pmTemplate.currency).toBe('RON');
      expect(agileTemplate.currency).toBe('RON');
    });

    it('should have HRDA eligibility', () => {
      const pmTemplate = service.getPMPFundamentalsTemplate();
      const agileTemplate = service.getAgileScrumTemplate();

      expect(pmTemplate.hrdaEligible).toBe(true);
      expect(agileTemplate.hrdaEligible).toBe(true);
    });
  });
});
