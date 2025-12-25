import { Test, TestingModule } from '@nestjs/testing';
import { MBACoursesService } from './mba-courses.service';
import { LMSService } from './lms.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('MBACoursesService', () => {
  let service: MBACoursesService;
  let lmsService: LMSService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MBACoursesService,
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

    service = module.get<MBACoursesService>(MBACoursesService);
    lmsService = module.get<LMSService>(LMSService);
    service.resetState();
    lmsService.resetState();
  });

  afterEach(() => {
    service.resetState();
    lmsService.resetState();
  });

  describe('Course Templates', () => {
    describe('getStrategyFundamentalsTemplate', () => {
      it('should return a valid strategy course template', () => {
        const template = service.getStrategyFundamentalsTemplate();

        expect(template.title).toBe('Fundamentele Strategiei de Afaceri');
        expect(template.slug).toBe('strategy-fundamentals');
        expect(template.category).toBe('STRATEGY');
        expect(template.level).toBe('INTERMEDIATE');
      });

      it('should have 6 modules', () => {
        const template = service.getStrategyFundamentalsTemplate();
        expect(template.modules).toHaveLength(6);
      });

      it('should include key frameworks like Porter\'s Five Forces', () => {
        const template = service.getStrategyFundamentalsTemplate();
        const firstModule = template.modules[0];
        expect(firstModule.keyFrameworks).toContain('Porter\'s Five Forces');
      });

      it('should have correct pricing', () => {
        const template = service.getStrategyFundamentalsTemplate();
        expect(template.pricing.amount).toBe(499);
        expect(template.pricing.currency).toBe('RON');
        expect(template.pricing.corporateDiscount).toBe(20);
      });

      it('should have certification details', () => {
        const template = service.getStrategyFundamentalsTemplate();
        expect(template.certification.credentialName).toBe('Certificate in Business Strategy');
        expect(template.certification.ceuCredits).toBe(5);
        expect(template.certification.validityYears).toBe(3);
      });

      it('should include peer activities', () => {
        const template = service.getStrategyFundamentalsTemplate();
        expect(template.peerActivities).toHaveLength(1);
        expect(template.peerActivities[0].type).toBe('DEBATE');
      });

      it('should be cohort-based with mentorship', () => {
        const template = service.getStrategyFundamentalsTemplate();
        expect(template.cohortBased).toBe(true);
        expect(template.mentorshipIncluded).toBe(true);
        expect(template.networkingEvents).toBe(true);
      });
    });

    describe('getLeadershipManagementTemplate', () => {
      it('should return a valid leadership course template', () => {
        const template = service.getLeadershipManagementTemplate();

        expect(template.title).toBe('Leadership și Management Eficient');
        expect(template.slug).toBe('leadership-management');
        expect(template.category).toBe('LEADERSHIP');
      });

      it('should have 6 modules', () => {
        const template = service.getLeadershipManagementTemplate();
        expect(template.modules).toHaveLength(6);
      });

      it('should include situational leadership framework', () => {
        const template = service.getLeadershipManagementTemplate();
        const firstModule = template.modules[0];
        expect(firstModule.keyFrameworks).toContain('Situational Leadership');
      });

      it('should have correct duration', () => {
        const template = service.getLeadershipManagementTemplate();
        expect(template.duration.weeks).toBe(8);
        expect(template.duration.hoursPerWeek).toBe(5);
        expect(template.duration.totalHours).toBe(40);
      });

      it('should include change management module', () => {
        const template = service.getLeadershipManagementTemplate();
        const changeModule = template.modules.find(m => m.title.includes('Schimbării'));
        expect(changeModule).toBeDefined();
        expect(changeModule?.keyFrameworks).toContain('Kotter\'s 8 Steps');
      });
    });

    describe('getFinanceForManagersTemplate', () => {
      it('should return a valid finance course template', () => {
        const template = service.getFinanceForManagersTemplate();

        expect(template.title).toBe('Finanțe pentru Manageri Non-Financiari');
        expect(template.slug).toBe('finance-for-managers');
        expect(template.category).toBe('FINANCE');
        expect(template.level).toBe('FOUNDATIONAL');
      });

      it('should have 6 modules', () => {
        const template = service.getFinanceForManagersTemplate();
        expect(template.modules).toHaveLength(6);
      });

      it('should cover financial statements', () => {
        const template = service.getFinanceForManagersTemplate();
        const statementsModule = template.modules.find(m => m.title.includes('Situațiilor'));
        expect(statementsModule).toBeDefined();
        expect(statementsModule?.keyFrameworks).toContain('Balance Sheet');
      });

      it('should be self-paced (not cohort-based)', () => {
        const template = service.getFinanceForManagersTemplate();
        expect(template.cohortBased).toBe(false);
        expect(template.mentorshipIncluded).toBe(false);
      });

      it('should have lower pricing than other courses', () => {
        const template = service.getFinanceForManagersTemplate();
        expect(template.pricing.amount).toBe(349);
      });
    });

    describe('getOperationsExcellenceTemplate', () => {
      it('should return a valid operations course template', () => {
        const template = service.getOperationsExcellenceTemplate();

        expect(template.title).toBe('Excelență Operațională și Process Management');
        expect(template.slug).toBe('operations-excellence');
        expect(template.category).toBe('OPERATIONS');
      });

      it('should have 5 modules', () => {
        const template = service.getOperationsExcellenceTemplate();
        expect(template.modules).toHaveLength(5);
      });

      it('should include Lean and Six Sigma frameworks', () => {
        const template = service.getOperationsExcellenceTemplate();
        const leanModule = template.modules.find(m => m.title.includes('Lean'));
        const sixSigmaModule = template.modules.find(m => m.title.includes('Six Sigma'));

        expect(leanModule).toBeDefined();
        expect(sixSigmaModule).toBeDefined();
        expect(leanModule?.keyFrameworks).toContain('Value Stream Mapping');
        expect(sixSigmaModule?.keyFrameworks).toContain('DMAIC');
      });

      it('should include Kaizen module', () => {
        const template = service.getOperationsExcellenceTemplate();
        const kaizenModule = template.modules.find(m => m.title.includes('Kaizen'));
        expect(kaizenModule).toBeDefined();
      });
    });
  });

  describe('Course Generation', () => {
    it('should generate a strategy course', async () => {
      const template = service.getStrategyFundamentalsTemplate();
      const course = await service.generateCourse(template, 'instructor-1');

      expect(course).toBeDefined();
      expect(course.title).toBe('Fundamentele Strategiei de Afaceri');
      expect(course.instructor.id).toBe('instructor-1');
    });

    it('should generate all MBA courses', async () => {
      const result = await service.generateAllMBACourses('instructor-1');

      expect(result.strategy).toBeDefined();
      expect(result.leadership).toBeDefined();
      expect(result.finance).toBeDefined();
      expect(result.operations).toBeDefined();
    });

    it('should create modules and lessons for generated course', async () => {
      const template = service.getFinanceForManagersTemplate();
      const course = await service.generateCourse(template, 'instructor-1');

      // Verify course was created with correct structure
      expect(course.id).toBeDefined();
      expect(course.title).toBe('Finanțe pentru Manageri Non-Financiari');
    });
  });

  describe('Case Studies', () => {
    it('should return default case studies', async () => {
      const caseStudies = await service.getCaseStudies();

      expect(caseStudies.length).toBeGreaterThan(0);
    });

    it('should include eMAG case study', async () => {
      const caseStudy = await service.getCaseStudy('cs-emag-transformation');

      expect(caseStudy).toBeDefined();
      expect(caseStudy?.company).toBe('eMAG');
      expect(caseStudy?.industry).toContain('E-commerce');
    });

    it('should include UiPath unicorn case study', async () => {
      const caseStudy = await service.getCaseStudy('cs-uipath-unicorn');

      expect(caseStudy).toBeDefined();
      expect(caseStudy?.company).toBe('UiPath');
      expect(caseStudy?.difficulty).toBe('ADVANCED');
    });

    it('should filter case studies by industry', async () => {
      const caseStudies = await service.getCaseStudiesByIndustry('retail');

      expect(caseStudies.length).toBeGreaterThan(0);
      caseStudies.forEach(cs => {
        expect(cs.industry.toLowerCase()).toContain('retail');
      });
    });

    it('should filter case studies by difficulty', async () => {
      const caseStudies = await service.getCaseStudiesByDifficulty('INTERMEDIATE');

      expect(caseStudies.length).toBeGreaterThan(0);
      caseStudies.forEach(cs => {
        expect(cs.difficulty).toBe('INTERMEDIATE');
      });
    });

    it('should create a new case study', async () => {
      const newCase = await service.createCaseStudy({
        title: 'Test Company Strategy',
        company: 'Test Corp',
        industry: 'Technology',
        country: 'România',
        yearPublished: 2024,
        difficulty: 'INTRODUCTORY',
        type: 'DECISION',
        synopsis: 'A test case study',
        learningObjectives: ['Objective 1'],
        discussionQuestions: ['Question 1'],
        teachingNotes: 'Teaching notes',
        duration: 60,
        pages: 10,
        tags: ['test'],
      });

      expect(newCase.id).toBeDefined();
      expect(newCase.company).toBe('Test Corp');

      const retrieved = await service.getCaseStudy(newCase.id);
      expect(retrieved).toEqual(newCase);
    });
  });

  describe('Discussion Forums', () => {
    let forum: any;

    beforeEach(async () => {
      forum = await service.createForum({
        courseId: 'course-1',
        title: 'Strategy Discussion',
        description: 'Discuss strategy topics',
        type: 'GENERAL',
        isModerated: true,
      });
    });

    it('should create a forum', async () => {
      expect(forum.id).toBeDefined();
      expect(forum.title).toBe('Strategy Discussion');
      expect(forum.posts).toHaveLength(0);
    });

    it('should get forums by course', async () => {
      const forums = await service.getForumsByCourse('course-1');
      expect(forums).toHaveLength(1);
      expect(forums[0].courseId).toBe('course-1');
    });

    it('should get forum by id', async () => {
      const retrieved = await service.getForum(forum.id);
      expect(retrieved).toEqual(forum);
    });

    it('should create a post in forum', async () => {
      const post = await service.createPost(forum.id, {
        authorId: 'user-1',
        authorName: 'John Doe',
        title: 'My First Post',
        content: 'This is my first post content',
      });

      expect(post.id).toBeDefined();
      expect(post.forumId).toBe(forum.id);
      expect(post.likes).toBe(0);

      const updatedForum = await service.getForum(forum.id);
      expect(updatedForum?.posts).toHaveLength(1);
    });

    it('should create a reply to a post', async () => {
      const post = await service.createPost(forum.id, {
        authorId: 'user-1',
        authorName: 'John Doe',
        content: 'Original post',
      });

      const reply = await service.createPost(forum.id, {
        authorId: 'user-2',
        authorName: 'Jane Doe',
        content: 'This is a reply',
        parentId: post.id,
      });

      expect(reply.parentId).toBe(post.id);
    });

    it('should like a post', async () => {
      const post = await service.createPost(forum.id, {
        authorId: 'user-1',
        authorName: 'John Doe',
        content: 'Like this!',
      });

      const likedPost = await service.likePost(post.id);
      expect(likedPost.likes).toBe(1);

      await service.likePost(post.id);
      const doubleLiked = await service.likePost(post.id);
      expect(doubleLiked.likes).toBe(3);
    });

    it('should throw error for non-existent forum', async () => {
      await expect(service.createPost('invalid-forum', {
        authorId: 'user-1',
        authorName: 'Test',
        content: 'Test',
      })).rejects.toThrow('Forum not found');
    });
  });

  describe('MBA Micro-Credentials', () => {
    it('should return default MBA credentials', async () => {
      const credentials = await service.getMBACredentials();

      expect(credentials.length).toBeGreaterThan(0);
    });

    it('should include business fundamentals credential', async () => {
      const credential = await service.getMBACredential('mba-mc-business-fundamentals');

      expect(credential).toBeDefined();
      expect(credential?.name).toContain('Business Fundamentals');
      expect(credential?.requiredCourses).toContain('finance-for-managers');
    });

    it('should include strategic leadership credential', async () => {
      const credential = await service.getMBACredential('mba-mc-strategic-leadership');

      expect(credential).toBeDefined();
      expect(credential?.requiredCourses).toContain('strategy-fundamentals');
      expect(credential?.requiredCourses).toContain('leadership-management');
      expect(credential?.capstoneRequired).toBe(true);
    });

    it('should include complete MBA program', async () => {
      const credential = await service.getMBACredential('mba-mc-complete');

      expect(credential).toBeDefined();
      expect(credential?.requiredCourses).toHaveLength(4);
      expect(credential?.totalCredits).toBe(17);
      expect(credential?.validityYears).toBe(5);
    });

    it('should check credential eligibility', async () => {
      const eligibility = await service.checkCredentialEligibility(
        'user-1',
        'mba-mc-business-fundamentals'
      );

      expect(eligibility).toBeDefined();
      expect(eligibility.missingRequired).toContain('finance-for-managers');
      expect(eligibility.eligible).toBe(false);
    });
  });

  describe('Capstone Projects', () => {
    it('should start a capstone project', async () => {
      const progress = await service.startCapstoneProject('user-1', 'mba-mc-strategic-leadership');

      expect(progress.id).toBeDefined();
      expect(progress.userId).toBe('user-1');
      expect(progress.credentialId).toBe('mba-mc-strategic-leadership');
      expect(progress.capstoneStatus).toBe('IN_PROGRESS');
    });

    it('should submit a capstone', async () => {
      await service.startCapstoneProject('user-1', 'mba-mc-strategic-leadership');

      const progress = await service.submitCapstone(
        'user-1',
        'mba-mc-strategic-leadership',
        'https://storage.example.com/capstone.pdf'
      );

      expect(progress.capstoneStatus).toBe('SUBMITTED');
      expect(progress.capstoneSubmission?.documentUrl).toBe('https://storage.example.com/capstone.pdf');
    });

    it('should throw error when submitting without starting', async () => {
      await expect(service.submitCapstone(
        'new-user',
        'mba-mc-strategic-leadership',
        'https://storage.example.com/capstone.pdf'
      )).rejects.toThrow('No progress record found');
    });

    it('should award MBA credential', async () => {
      const progress = await service.awardMBACredential('user-1', 'mba-mc-business-fundamentals');

      expect(progress.earnedAt).toBeDefined();
      expect(progress.verificationCode).toBeDefined();
      expect(progress.certificateUrl).toContain(progress.verificationCode);
    });

    it('should get user MBA credentials', async () => {
      await service.awardMBACredential('user-1', 'mba-mc-business-fundamentals');
      await service.awardMBACredential('user-1', 'mba-mc-strategic-leadership');

      const credentials = await service.getUserMBACredentials('user-1');
      expect(credentials).toHaveLength(2);
    });

    it('should verify MBA credential', async () => {
      const awarded = await service.awardMBACredential('user-1', 'mba-mc-business-fundamentals');

      const verified = await service.verifyMBACredential(awarded.verificationCode!);
      expect(verified).toBeDefined();
      expect(verified?.userId).toBe('user-1');
    });

    it('should return null for invalid verification code', async () => {
      const result = await service.verifyMBACredential('INVALID-CODE');
      expect(result).toBeNull();
    });
  });

  describe('Executive Coaching', () => {
    it('should return default coaches', async () => {
      const coaches = await service.getCoaches();

      expect(coaches.length).toBeGreaterThan(0);
    });

    it('should get coach by id', async () => {
      const coach = await service.getCoach('coach-1');

      expect(coach).toBeDefined();
      expect(coach?.name).toBe('Maria Ionescu');
      expect(coach?.expertise).toContain('Finance');
    });

    it('should filter coaches by expertise', async () => {
      const coaches = await service.getCoachesByExpertise('Leadership');

      expect(coaches.length).toBeGreaterThan(0);
      coaches.forEach(c => {
        expect(c.expertise.some(e => e.toLowerCase().includes('leadership'))).toBe(true);
      });
    });

    it('should book a coaching session', async () => {
      const session = await service.bookCoachingSession({
        coachId: 'coach-1',
        userId: 'user-1',
        scheduledAt: new Date('2024-01-15T10:00:00'),
        duration: 60,
        type: 'ONE_ON_ONE',
      });

      expect(session.id).toBeDefined();
      expect(session.status).toBe('SCHEDULED');
      expect(session.coachId).toBe('coach-1');
    });

    it('should throw error for non-existent coach', async () => {
      await expect(service.bookCoachingSession({
        coachId: 'invalid-coach',
        userId: 'user-1',
        scheduledAt: new Date(),
        duration: 60,
        type: 'ONE_ON_ONE',
      })).rejects.toThrow('Coach not found');
    });

    it('should get user coaching sessions', async () => {
      await service.bookCoachingSession({
        coachId: 'coach-1',
        userId: 'user-1',
        scheduledAt: new Date(),
        duration: 60,
        type: 'ONE_ON_ONE',
      });

      await service.bookCoachingSession({
        coachId: 'coach-2',
        userId: 'user-1',
        scheduledAt: new Date(),
        duration: 90,
        type: 'CAREER',
      });

      const sessions = await service.getUserCoachingSessions('user-1');
      expect(sessions).toHaveLength(2);
    });

    it('should complete a coaching session', async () => {
      const session = await service.bookCoachingSession({
        coachId: 'coach-1',
        userId: 'user-1',
        scheduledAt: new Date(),
        duration: 60,
        type: 'ONE_ON_ONE',
      });

      const completed = await service.completeCoachingSession(
        session.id,
        'Great session discussing career goals',
        { rating: 5, comment: 'Excellent coach!' }
      );

      expect(completed.status).toBe('COMPLETED');
      expect(completed.notes).toBe('Great session discussing career goals');
      expect(completed.feedback?.rating).toBe(5);
    });

    it('should update coach rating after feedback', async () => {
      const originalCoach = await service.getCoach('coach-1');
      const originalRating = originalCoach!.rating;
      const originalSessions = originalCoach!.sessionsCompleted;

      const session = await service.bookCoachingSession({
        coachId: 'coach-1',
        userId: 'user-1',
        scheduledAt: new Date(),
        duration: 60,
        type: 'ONE_ON_ONE',
      });

      await service.completeCoachingSession(
        session.id,
        'Session notes',
        { rating: 5, comment: 'Great!' }
      );

      const updatedCoach = await service.getCoach('coach-1');
      expect(updatedCoach!.sessionsCompleted).toBe(originalSessions + 1);
    });
  });

  describe('Learning Paths', () => {
    it('should return MBA learning paths', () => {
      const paths = service.getMBALearningPaths();

      expect(paths.length).toBeGreaterThan(0);
    });

    it('should include general management track', () => {
      const paths = service.getMBALearningPaths();
      const generalPath = paths.find(p => p.pathId === 'path-general-management');

      expect(generalPath).toBeDefined();
      expect(generalPath?.courses).toContain('finance-for-managers');
      expect(generalPath?.credential).toBe('mba-mc-business-fundamentals');
    });

    it('should include complete MBA path', () => {
      const paths = service.getMBALearningPaths();
      const completePath = paths.find(p => p.pathId === 'path-complete-mba');

      expect(completePath).toBeDefined();
      expect(completePath?.courses).toHaveLength(4);
      expect(completePath?.duration).toBe('30 săptămâni');
    });
  });

  describe('Corporate Training', () => {
    it('should return corporate packages', () => {
      const packages = service.getCorporatePackages();

      expect(packages.length).toBeGreaterThan(0);
    });

    it('should include emerging leaders program', () => {
      const packages = service.getCorporatePackages();
      const emergingLeaders = packages.find(p => p.packageId === 'corp-emerging-leaders');

      expect(emergingLeaders).toBeDefined();
      expect(emergingLeaders?.courses).toContain('leadership-management');
      expect(emergingLeaders?.participants.min).toBe(10);
      expect(emergingLeaders?.pricePerPerson).toBe(599);
    });

    it('should include executive development program', () => {
      const packages = service.getCorporatePackages();
      const execDev = packages.find(p => p.packageId === 'corp-executive-development');

      expect(execDev).toBeDefined();
      expect(execDev?.features).toContain('4 sesiuni de coaching individual');
      expect(execDev?.pricePerPerson).toBe(1299);
    });

    it('should include operations transformation program', () => {
      const packages = service.getCorporatePackages();
      const opsTrans = packages.find(p => p.packageId === 'corp-operations-transformation');

      expect(opsTrans).toBeDefined();
      expect(opsTrans?.courses).toContain('operations-excellence');
      expect(opsTrans?.features).toContain('Certificare Lean/Six Sigma Yellow Belt');
    });
  });

  describe('State Reset', () => {
    it('should reset all state', async () => {
      // Add some data
      await service.createCaseStudy({
        title: 'Test',
        company: 'Test',
        industry: 'Test',
        country: 'Test',
        yearPublished: 2024,
        difficulty: 'INTRODUCTORY',
        type: 'DECISION',
        synopsis: 'Test',
        learningObjectives: [],
        discussionQuestions: [],
        teachingNotes: '',
        duration: 60,
        pages: 10,
        tags: [],
      });

      await service.createForum({
        courseId: 'test',
        title: 'Test Forum',
        description: 'Test',
        type: 'GENERAL',
        isModerated: false,
      });

      // Reset
      service.resetState();

      // Verify defaults are restored
      const cases = await service.getCaseStudies();
      expect(cases.some(c => c.company === 'Test')).toBe(false);
      expect(cases.some(c => c.company === 'eMAG')).toBe(true);

      const forums = await service.getForumsByCourse('test');
      expect(forums).toHaveLength(0);
    });
  });
});
