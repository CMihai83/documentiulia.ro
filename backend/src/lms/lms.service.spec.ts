import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LMSService, Course, CourseCategory, Lesson, Assessment, Question } from './lms.service';

describe('LMSService', () => {
  let service: LMSService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LMSService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-value'),
          },
        },
      ],
    }).compile();

    service = module.get<LMSService>(LMSService);
    service.resetState();
  });

  // ===== COURSE MANAGEMENT =====

  describe('Course Management', () => {
    it('should create a new course', async () => {
      const course = await service.createCourse({
        title: 'Excel VBA Masterclass',
        description: 'Learn Excel VBA from scratch to advanced',
        shortDescription: 'Master Excel automation',
        instructorId: 'inst-001',
        category: 'EXCEL_VBA',
        level: 'BEGINNER',
        language: 'ro',
        learningOutcomes: ['Write macros', 'Automate tasks', 'Create custom functions'],
        targetAudience: ['Accountants', 'Analysts', 'Managers'],
        price: 299,
        currency: 'RON',
      });

      expect(course.id).toBeDefined();
      expect(course.title).toBe('Excel VBA Masterclass');
      expect(course.slug).toBe('excel-vba-masterclass');
      expect(course.category).toBe('EXCEL_VBA');
      expect(course.status).toBe('DRAFT');
      expect(course.isFree).toBe(false);
      expect(course.enrollmentCount).toBe(0);
    });

    it('should create a free course', async () => {
      const course = await service.createCourse({
        title: 'Introduction to Finance',
        description: 'Free introductory finance course',
        shortDescription: 'Finance basics',
        instructorId: 'inst-001',
        category: 'FINANCE',
        level: 'BEGINNER',
        language: 'ro',
        learningOutcomes: ['Understand financial statements'],
        targetAudience: ['Anyone'],
        price: 0,
        currency: 'RON',
      });

      expect(course.isFree).toBe(true);
      expect(course.price).toBe(0);
    });

    it('should get course by ID', async () => {
      const created = await service.createCourse({
        title: 'Test Course',
        description: 'Test description',
        shortDescription: 'Test short',
        instructorId: 'inst-001',
        category: 'TECHNOLOGY',
        level: 'INTERMEDIATE',
        language: 'en',
        learningOutcomes: ['Learn testing'],
        targetAudience: ['Developers'],
        price: 100,
        currency: 'USD',
      });

      const retrieved = await service.getCourse(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should get course by slug', async () => {
      await service.createCourse({
        title: 'Project Management Basics',
        description: 'Learn PM fundamentals',
        shortDescription: 'PM basics',
        instructorId: 'inst-001',
        category: 'PROJECT_MANAGEMENT',
        level: 'BEGINNER',
        language: 'ro',
        learningOutcomes: ['Plan projects'],
        targetAudience: ['Managers'],
        price: 199,
        currency: 'RON',
      });

      const course = await service.getCourseBySlug('project-management-basics');
      expect(course).toBeDefined();
      expect(course?.title).toBe('Project Management Basics');
    });

    it('should update course', async () => {
      const course = await service.createCourse({
        title: 'Original Title',
        description: 'Original description',
        shortDescription: 'Original short',
        instructorId: 'inst-001',
        category: 'TECHNOLOGY',
        level: 'BEGINNER',
        language: 'ro',
        learningOutcomes: ['Learning'],
        targetAudience: ['All'],
        price: 100,
        currency: 'RON',
      });

      const updated = await service.updateCourse(course.id, {
        title: 'Updated Title',
        price: 150,
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.price).toBe(150);
    });

    it('should list courses with filters', async () => {
      await service.createCourse({
        title: 'Excel Course 1',
        description: 'Excel basics',
        shortDescription: 'Excel',
        instructorId: 'inst-001',
        category: 'EXCEL_VBA',
        level: 'BEGINNER',
        language: 'ro',
        learningOutcomes: ['Excel'],
        targetAudience: ['All'],
        price: 100,
        currency: 'RON',
      });

      await service.createCourse({
        title: 'Finance Course 1',
        description: 'Finance basics',
        shortDescription: 'Finance',
        instructorId: 'inst-002',
        category: 'FINANCE',
        level: 'INTERMEDIATE',
        language: 'ro',
        learningOutcomes: ['Finance'],
        targetAudience: ['All'],
        price: 200,
        currency: 'RON',
      });

      const excelCourses = await service.listCourses({ category: 'EXCEL_VBA' });
      expect(excelCourses).toHaveLength(1);
      expect(excelCourses[0].category).toBe('EXCEL_VBA');

      const allCourses = await service.listCourses();
      expect(allCourses).toHaveLength(2);
    });

    it('should search courses by keyword', async () => {
      await service.createCourse({
        title: 'Advanced Excel Formulas',
        description: 'Master complex formulas',
        shortDescription: 'Excel formulas',
        instructorId: 'inst-001',
        category: 'EXCEL_VBA',
        level: 'ADVANCED',
        language: 'ro',
        learningOutcomes: ['Formulas'],
        targetAudience: ['Analysts'],
        price: 250,
        currency: 'RON',
      });

      const results = await service.listCourses({ search: 'formula' });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Advanced Excel Formulas');
    });

    it('should throw error when publishing course without modules', async () => {
      const course = await service.createCourse({
        title: 'Empty Course',
        description: 'No modules yet',
        shortDescription: 'Empty',
        instructorId: 'inst-001',
        category: 'TECHNOLOGY',
        level: 'BEGINNER',
        language: 'ro',
        learningOutcomes: ['Nothing'],
        targetAudience: ['All'],
        price: 50,
        currency: 'RON',
      });

      await expect(service.publishCourse(course.id)).rejects.toThrow('Course must have at least one module');
    });
  });

  // ===== MODULE MANAGEMENT =====

  describe('Module Management', () => {
    let courseId: string;

    beforeEach(async () => {
      const course = await service.createCourse({
        title: 'Test Course with Modules',
        description: 'For module testing',
        shortDescription: 'Module test',
        instructorId: 'inst-001',
        category: 'TECHNOLOGY',
        level: 'BEGINNER',
        language: 'ro',
        learningOutcomes: ['Testing'],
        targetAudience: ['Testers'],
        price: 100,
        currency: 'RON',
      });
      courseId = course.id;
    });

    it('should add module to course', async () => {
      const module = await service.addModule(courseId, {
        title: 'Module 1: Introduction',
        description: 'Course introduction',
      });

      expect(module.id).toBeDefined();
      expect(module.title).toBe('Module 1: Introduction');
      expect(module.order).toBe(1);
      expect(module.courseId).toBe(courseId);
    });

    it('should maintain module order', async () => {
      const module1 = await service.addModule(courseId, { title: 'Module 1' });
      const module2 = await service.addModule(courseId, { title: 'Module 2' });
      const module3 = await service.addModule(courseId, { title: 'Module 3' });

      expect(module1.order).toBe(1);
      expect(module2.order).toBe(2);
      expect(module3.order).toBe(3);
    });

    it('should update module', async () => {
      const module = await service.addModule(courseId, { title: 'Original Module' });

      const updated = await service.updateModule(module.id, {
        title: 'Updated Module',
        isFree: true,
      });

      expect(updated.title).toBe('Updated Module');
      expect(updated.isFree).toBe(true);
    });

    it('should reorder modules', async () => {
      const m1 = await service.addModule(courseId, { title: 'Module A' });
      const m2 = await service.addModule(courseId, { title: 'Module B' });
      const m3 = await service.addModule(courseId, { title: 'Module C' });

      const reordered = await service.reorderModules(courseId, [m3.id, m1.id, m2.id]);

      expect(reordered.modules[0].id).toBe(m3.id);
      expect(reordered.modules[0].order).toBe(1);
      expect(reordered.modules[1].id).toBe(m1.id);
      expect(reordered.modules[1].order).toBe(2);
      expect(reordered.modules[2].id).toBe(m2.id);
      expect(reordered.modules[2].order).toBe(3);
    });
  });

  // ===== LESSON MANAGEMENT =====

  describe('Lesson Management', () => {
    let courseId: string;
    let moduleId: string;

    beforeEach(async () => {
      const course = await service.createCourse({
        title: 'Test Course for Lessons',
        description: 'Testing lessons',
        shortDescription: 'Lessons test',
        instructorId: 'inst-001',
        category: 'TECHNOLOGY',
        level: 'BEGINNER',
        language: 'ro',
        learningOutcomes: ['Learn lessons'],
        targetAudience: ['All'],
        price: 100,
        currency: 'RON',
      });
      courseId = course.id;

      const module = await service.addModule(courseId, { title: 'Test Module' });
      moduleId = module.id;
    });

    it('should add video lesson to module', async () => {
      const lesson = await service.addLesson(moduleId, {
        title: 'Introduction Video',
        type: 'VIDEO',
        content: {
          videoUrl: 'https://bunny.net/video/123',
          videoProvider: 'BUNNY',
          videoDuration: 600,
        },
        duration: 10,
      });

      expect(lesson.id).toBeDefined();
      expect(lesson.title).toBe('Introduction Video');
      expect(lesson.type).toBe('VIDEO');
      expect(lesson.content.videoProvider).toBe('BUNNY');
    });

    it('should add text lesson', async () => {
      const lesson = await service.addLesson(moduleId, {
        title: 'Reading Material',
        type: 'TEXT',
        content: {
          textContent: '# Chapter 1\n\nThis is the content...',
        },
        duration: 15,
      });

      expect(lesson.type).toBe('TEXT');
      expect(lesson.content.textContent).toContain('Chapter 1');
    });

    it('should add downloadable resource', async () => {
      const lesson = await service.addLesson(moduleId, {
        title: 'Exercise Files',
        type: 'DOWNLOAD',
        content: {
          downloadUrl: 'https://cdn.example.com/files/exercise.xlsx',
          downloadFilename: 'exercise.xlsx',
          downloadSize: 1024000,
        },
        duration: 5,
      });

      expect(lesson.type).toBe('DOWNLOAD');
      expect(lesson.content.downloadFilename).toBe('exercise.xlsx');
    });

    it('should update course duration when adding lessons', async () => {
      await service.addLesson(moduleId, {
        title: 'Lesson 1',
        type: 'VIDEO',
        content: { videoUrl: 'url1' },
        duration: 10,
      });

      await service.addLesson(moduleId, {
        title: 'Lesson 2',
        type: 'VIDEO',
        content: { videoUrl: 'url2' },
        duration: 15,
      });

      const course = await service.getCourse(courseId);
      expect(course?.duration).toBe(25);
    });

    it('should mark lesson as preview', async () => {
      const lesson = await service.addLesson(moduleId, {
        title: 'Free Preview',
        type: 'VIDEO',
        content: { videoUrl: 'preview-url' },
        duration: 5,
        isFree: true,
        isPreview: true,
      });

      expect(lesson.isFree).toBe(true);
      expect(lesson.isPreview).toBe(true);
    });

    it('should update lesson', async () => {
      const lesson = await service.addLesson(moduleId, {
        title: 'Original Lesson',
        type: 'VIDEO',
        content: { videoUrl: 'original' },
        duration: 10,
      });

      const updated = await service.updateLesson(lesson.id, {
        title: 'Updated Lesson',
        duration: 12,
      });

      expect(updated.title).toBe('Updated Lesson');
      expect(updated.duration).toBe(12);
    });
  });

  // ===== ENROLLMENT MANAGEMENT =====

  describe('Enrollment Management', () => {
    let courseId: string;
    let moduleId: string;

    beforeEach(async () => {
      const course = await service.createCourse({
        title: 'Enrollment Test Course',
        description: 'For enrollment testing',
        shortDescription: 'Enroll test',
        instructorId: 'inst-001',
        category: 'TECHNOLOGY',
        level: 'BEGINNER',
        language: 'ro',
        learningOutcomes: ['Test'],
        targetAudience: ['All'],
        price: 100,
        currency: 'RON',
      });
      courseId = course.id;

      const module = await service.addModule(courseId, { title: 'Module 1' });
      moduleId = module.id;

      await service.addLesson(moduleId, {
        title: 'Lesson 1',
        type: 'VIDEO',
        content: { videoUrl: 'url1' },
        duration: 10,
      });
    });

    it('should enroll user in course', async () => {
      const enrollment = await service.enrollUser('user-001', courseId);

      expect(enrollment.id).toBeDefined();
      expect(enrollment.userId).toBe('user-001');
      expect(enrollment.courseId).toBe(courseId);
      expect(enrollment.status).toBe('ACTIVE');
      expect(enrollment.progress.overallProgress).toBe(0);
    });

    it('should enroll with different access types', async () => {
      const purchased = await service.enrollUser('user-001', courseId, 'PURCHASED', 'pay-001');
      expect(purchased.accessType).toBe('PURCHASED');
      expect(purchased.paymentId).toBe('pay-001');

      // Create another course for free enrollment
      const freeCourse = await service.createCourse({
        title: 'Free Course',
        description: 'Free',
        shortDescription: 'Free',
        instructorId: 'inst-001',
        category: 'TECHNOLOGY',
        level: 'BEGINNER',
        language: 'ro',
        learningOutcomes: ['Free'],
        targetAudience: ['All'],
        price: 0,
        currency: 'RON',
      });

      const free = await service.enrollUser('user-002', freeCourse.id, 'FREE');
      expect(free.accessType).toBe('FREE');
    });

    it('should prevent duplicate enrollment', async () => {
      await service.enrollUser('user-001', courseId);

      await expect(service.enrollUser('user-001', courseId))
        .rejects.toThrow('User is already enrolled in this course');
    });

    it('should increment course enrollment count', async () => {
      await service.enrollUser('user-001', courseId);
      await service.enrollUser('user-002', courseId);

      const course = await service.getCourse(courseId);
      expect(course?.enrollmentCount).toBe(2);
    });

    it('should get user enrollments', async () => {
      await service.enrollUser('user-001', courseId);

      const course2 = await service.createCourse({
        title: 'Second Course',
        description: 'Second',
        shortDescription: 'Second',
        instructorId: 'inst-001',
        category: 'FINANCE',
        level: 'BEGINNER',
        language: 'ro',
        learningOutcomes: ['Second'],
        targetAudience: ['All'],
        price: 100,
        currency: 'RON',
      });
      await service.enrollUser('user-001', course2.id);

      const enrollments = await service.getUserEnrollments('user-001');
      expect(enrollments).toHaveLength(2);
    });
  });

  // ===== PROGRESS TRACKING =====

  describe('Progress Tracking', () => {
    let courseId: string;
    let moduleId: string;
    let lessonId1: string;
    let lessonId2: string;
    let enrollmentId: string;

    beforeEach(async () => {
      const course = await service.createCourse({
        title: 'Progress Test Course',
        description: 'Progress tracking test',
        shortDescription: 'Progress test',
        instructorId: 'inst-001',
        category: 'TECHNOLOGY',
        level: 'BEGINNER',
        language: 'ro',
        learningOutcomes: ['Track progress'],
        targetAudience: ['All'],
        price: 100,
        currency: 'RON',
        certificateEnabled: true,
      });
      courseId = course.id;

      const module = await service.addModule(courseId, { title: 'Module 1' });
      moduleId = module.id;

      const l1 = await service.addLesson(moduleId, {
        title: 'Lesson 1',
        type: 'VIDEO',
        content: { videoUrl: 'url1' },
        duration: 10,
      });
      lessonId1 = l1.id;

      const l2 = await service.addLesson(moduleId, {
        title: 'Lesson 2',
        type: 'VIDEO',
        content: { videoUrl: 'url2' },
        duration: 10,
      });
      lessonId2 = l2.id;

      const enrollment = await service.enrollUser('user-001', courseId);
      enrollmentId = enrollment.id;
    });

    it('should mark lesson as complete', async () => {
      const enrollment = await service.markLessonComplete(enrollmentId, lessonId1, 12);

      expect(enrollment.progress.completedLessons).toContain(lessonId1);
      expect(enrollment.progress.totalTimeSpent).toBe(12);
    });

    it('should calculate overall progress', async () => {
      await service.markLessonComplete(enrollmentId, lessonId1, 10);
      const enrollment = await service.markLessonComplete(enrollmentId, lessonId2, 10);

      expect(enrollment.progress.overallProgress).toBe(100);
    });

    it('should mark module complete when all lessons done', async () => {
      await service.markLessonComplete(enrollmentId, lessonId1, 10);
      const enrollment = await service.markLessonComplete(enrollmentId, lessonId2, 10);

      expect(enrollment.progress.completedModules).toContain(moduleId);
    });

    it('should complete course and generate certificate', async () => {
      await service.markLessonComplete(enrollmentId, lessonId1, 10);
      const enrollment = await service.markLessonComplete(enrollmentId, lessonId2, 10);

      expect(enrollment.status).toBe('COMPLETED');
      expect(enrollment.completedAt).toBeDefined();
      expect(enrollment.certificateId).toBeDefined();
    });

    it('should set current lesson', async () => {
      const enrollment = await service.setCurrentLesson(enrollmentId, lessonId1);

      expect(enrollment.progress.currentLessonId).toBe(lessonId1);
      expect(enrollment.progress.currentModuleId).toBe(moduleId);
    });
  });

  // ===== ASSESSMENTS =====

  describe('Assessment Engine', () => {
    let courseId: string;
    let enrollmentId: string;

    beforeEach(async () => {
      const course = await service.createCourse({
        title: 'Assessment Course',
        description: 'For assessment testing',
        shortDescription: 'Assessment test',
        instructorId: 'inst-001',
        category: 'TECHNOLOGY',
        level: 'BEGINNER',
        language: 'ro',
        learningOutcomes: ['Assess'],
        targetAudience: ['All'],
        price: 100,
        currency: 'RON',
      });
      courseId = course.id;

      const module = await service.addModule(courseId, { title: 'Module 1' });
      await service.addLesson(module.id, {
        title: 'Lesson 1',
        type: 'VIDEO',
        content: { videoUrl: 'url' },
        duration: 10,
      });

      const enrollment = await service.enrollUser('user-001', courseId);
      enrollmentId = enrollment.id;
    });

    it('should create quiz assessment', async () => {
      const questions: Question[] = [
        {
          id: 'q1',
          type: 'MULTIPLE_CHOICE',
          text: 'What is 2+2?',
          points: 10,
          options: [
            { id: 'a', text: '3', isCorrect: false },
            { id: 'b', text: '4', isCorrect: true },
            { id: 'c', text: '5', isCorrect: false },
          ],
          correctAnswer: 'b',
        },
        {
          id: 'q2',
          type: 'TRUE_FALSE',
          text: 'The sky is blue',
          points: 10,
          options: [
            { id: 't', text: 'True', isCorrect: true },
            { id: 'f', text: 'False', isCorrect: false },
          ],
          correctAnswer: 't',
        },
      ];

      const assessment = await service.createAssessment({
        courseId,
        title: 'Module 1 Quiz',
        type: 'QUIZ',
        questions,
        passingScore: 70,
        maxAttempts: 3,
        timeLimit: 30,
      });

      expect(assessment.id).toBeDefined();
      expect(assessment.type).toBe('QUIZ');
      expect(assessment.questions).toHaveLength(2);
      expect(assessment.passingScore).toBe(70);
      expect(assessment.status).toBe('DRAFT');
    });

    it('should create assignment assessment', async () => {
      const questions: Question[] = [
        {
          id: 'a1',
          type: 'FILE_UPLOAD',
          text: 'Upload your completed exercise file',
          points: 100,
          rubric: 'Grading criteria: completeness, accuracy, presentation',
        },
      ];

      const assessment = await service.createAssessment({
        courseId,
        title: 'Practical Assignment',
        type: 'ASSIGNMENT',
        questions,
        passingScore: 60,
        maxAttempts: 1,
      });

      expect(assessment.type).toBe('ASSIGNMENT');
    });

    it('should publish assessment', async () => {
      const assessment = await service.createAssessment({
        courseId,
        title: 'Test Quiz',
        type: 'QUIZ',
        questions: [
          { id: 'q1', type: 'TRUE_FALSE', text: 'Test', points: 10, correctAnswer: 't' },
        ],
        passingScore: 70,
        maxAttempts: 3,
      });

      const published = await service.publishAssessment(assessment.id);
      expect(published.status).toBe('PUBLISHED');
    });

    it('should start assessment attempt', async () => {
      const assessment = await service.createAssessment({
        courseId,
        title: 'Quiz',
        type: 'QUIZ',
        questions: [
          { id: 'q1', type: 'TRUE_FALSE', text: 'Test', points: 10, correctAnswer: 't' },
        ],
        passingScore: 70,
        maxAttempts: 3,
      });

      const attempt = await service.startAssessmentAttempt(assessment.id, 'user-001', enrollmentId);

      expect(attempt.id).toBeDefined();
      expect(attempt.status).toBe('IN_PROGRESS');
      expect(attempt.attemptNumber).toBe(1);
    });

    it('should grade quiz and pass', async () => {
      const assessment = await service.createAssessment({
        courseId,
        title: 'Quiz',
        type: 'QUIZ',
        questions: [
          { id: 'q1', type: 'MULTIPLE_CHOICE', text: 'Q1', points: 50, correctAnswer: 'a' },
          { id: 'q2', type: 'MULTIPLE_CHOICE', text: 'Q2', points: 50, correctAnswer: 'b' },
        ],
        passingScore: 70,
        maxAttempts: 3,
      });

      const attempt = await service.startAssessmentAttempt(assessment.id, 'user-001', enrollmentId);

      const submitted = await service.submitAssessmentAttempt(attempt.id, [
        { questionId: 'q1', answer: 'a', pointsAwarded: 0 },
        { questionId: 'q2', answer: 'b', pointsAwarded: 0 },
      ]);

      expect(submitted.score).toBe(100);
      expect(submitted.percentage).toBe(100);
      expect(submitted.passed).toBe(true);
      expect(submitted.status).toBe('PASSED');
    });

    it('should grade quiz and fail', async () => {
      const assessment = await service.createAssessment({
        courseId,
        title: 'Quiz',
        type: 'QUIZ',
        questions: [
          { id: 'q1', type: 'MULTIPLE_CHOICE', text: 'Q1', points: 50, correctAnswer: 'a' },
          { id: 'q2', type: 'MULTIPLE_CHOICE', text: 'Q2', points: 50, correctAnswer: 'b' },
        ],
        passingScore: 70,
        maxAttempts: 3,
      });

      const attempt = await service.startAssessmentAttempt(assessment.id, 'user-001', enrollmentId);

      const submitted = await service.submitAssessmentAttempt(attempt.id, [
        { questionId: 'q1', answer: 'wrong', pointsAwarded: 0 },
        { questionId: 'q2', answer: 'wrong', pointsAwarded: 0 },
      ]);

      expect(submitted.score).toBe(0);
      expect(submitted.passed).toBe(false);
      expect(submitted.status).toBe('FAILED');
    });

    it('should enforce max attempts', async () => {
      const assessment = await service.createAssessment({
        courseId,
        title: 'Limited Quiz',
        type: 'QUIZ',
        questions: [
          { id: 'q1', type: 'TRUE_FALSE', text: 'Test', points: 10, correctAnswer: 't' },
        ],
        passingScore: 70,
        maxAttempts: 1,
      });

      const attempt1 = await service.startAssessmentAttempt(assessment.id, 'user-001', enrollmentId);
      await service.submitAssessmentAttempt(attempt1.id, [
        { questionId: 'q1', answer: 'f', pointsAwarded: 0 },
      ]);

      await expect(service.startAssessmentAttempt(assessment.id, 'user-001', enrollmentId))
        .rejects.toThrow('Maximum attempts reached');
    });
  });

  // ===== CERTIFICATES =====

  describe('Certificate Generation', () => {
    it('should generate certificate for completed course', async () => {
      const course = await service.createCourse({
        title: 'Certificate Course',
        description: 'For certificate testing',
        shortDescription: 'Cert test',
        instructorId: 'inst-001',
        category: 'TECHNOLOGY',
        level: 'BEGINNER',
        language: 'ro',
        learningOutcomes: ['Certify'],
        targetAudience: ['All'],
        price: 100,
        currency: 'RON',
        certificateEnabled: true,
        ceuCredits: 2,
      });

      const module = await service.addModule(course.id, { title: 'Module' });
      await service.addLesson(module.id, {
        title: 'Lesson',
        type: 'VIDEO',
        content: { videoUrl: 'url' },
        duration: 10,
      });

      const enrollment = await service.enrollUser('user-001', course.id);
      const lesson = course.modules[0]?.lessons[0];

      // Complete course
      await service.markLessonComplete(enrollment.id, lesson?.id || '', 10);

      const updatedEnrollment = await service.getEnrollment(enrollment.id);
      expect(updatedEnrollment?.certificateId).toBeDefined();

      const certificate = await service.getCertificate(updatedEnrollment?.certificateId || '');
      expect(certificate).toBeDefined();
      expect(certificate?.courseName).toBe('Certificate Course');
      expect(certificate?.ceuCredits).toBe(2);
      expect(certificate?.status).toBe('ISSUED');
    });

    it('should verify certificate by number', async () => {
      const course = await service.createCourse({
        title: 'Verify Course',
        description: 'Test',
        shortDescription: 'Test',
        instructorId: 'inst-001',
        category: 'TECHNOLOGY',
        level: 'BEGINNER',
        language: 'ro',
        learningOutcomes: ['Test'],
        targetAudience: ['All'],
        price: 0,
        currency: 'RON',
        certificateEnabled: true,
      });

      const module = await service.addModule(course.id, { title: 'M' });
      const lesson = await service.addLesson(module.id, {
        title: 'L',
        type: 'VIDEO',
        content: { videoUrl: 'u' },
        duration: 5,
      });

      const enrollment = await service.enrollUser('user-001', course.id);
      await service.markLessonComplete(enrollment.id, lesson.id, 5);

      const updatedEnrollment = await service.getEnrollment(enrollment.id);
      const cert = await service.getCertificate(updatedEnrollment?.certificateId || '');

      const verified = await service.getCertificateByNumber(cert?.certificateNumber || '');
      expect(verified).toBeDefined();
      expect(verified?.id).toBe(cert?.id);
    });

    it('should get user certificates', async () => {
      // Complete first course
      const course1 = await service.createCourse({
        title: 'Course 1',
        description: 'C1',
        shortDescription: 'C1',
        instructorId: 'inst-001',
        category: 'TECHNOLOGY',
        level: 'BEGINNER',
        language: 'ro',
        learningOutcomes: ['L'],
        targetAudience: ['A'],
        price: 0,
        currency: 'RON',
        certificateEnabled: true,
      });

      const m1 = await service.addModule(course1.id, { title: 'M1' });
      const l1 = await service.addLesson(m1.id, {
        title: 'L1',
        type: 'VIDEO',
        content: { videoUrl: 'u1' },
        duration: 5,
      });

      const e1 = await service.enrollUser('user-001', course1.id);
      await service.markLessonComplete(e1.id, l1.id, 5);

      const certs = await service.getUserCertificates('user-001');
      expect(certs).toHaveLength(1);
    });
  });

  // ===== GAMIFICATION =====

  describe('Gamification', () => {
    it('should have default badges initialized', async () => {
      const badges = await service.getAllBadges();
      expect(badges.length).toBeGreaterThan(0);
      expect(badges.some(b => b.name === 'First Steps')).toBe(true);
      expect(badges.some(b => b.name === 'Knowledge Seeker')).toBe(true);
    });

    it('should award badge manually', async () => {
      const badges = await service.getAllBadges();
      const badge = badges[0];

      const userBadge = await service.awardBadge('user-001', badge.id);

      expect(userBadge.userId).toBe('user-001');
      expect(userBadge.badge.name).toBe(badge.name);
    });

    it('should get user badges', async () => {
      const badges = await service.getAllBadges();
      await service.awardBadge('user-001', badges[0].id);
      await service.awardBadge('user-001', badges[1].id);

      const userBadges = await service.getUserBadges('user-001');
      expect(userBadges).toHaveLength(2);
    });

    it('should award perfect score badge', async () => {
      const course = await service.createCourse({
        title: 'Perfect Score Course',
        description: 'Test',
        shortDescription: 'Test',
        instructorId: 'inst-001',
        category: 'TECHNOLOGY',
        level: 'BEGINNER',
        language: 'ro',
        learningOutcomes: ['Test'],
        targetAudience: ['All'],
        price: 0,
        currency: 'RON',
      });

      const module = await service.addModule(course.id, { title: 'M' });
      await service.addLesson(module.id, {
        title: 'L',
        type: 'VIDEO',
        content: { videoUrl: 'u' },
        duration: 5,
      });

      const enrollment = await service.enrollUser('user-001', course.id);

      const assessment = await service.createAssessment({
        courseId: course.id,
        title: 'Quiz',
        type: 'QUIZ',
        questions: [
          { id: 'q1', type: 'MULTIPLE_CHOICE', text: 'Q', points: 100, correctAnswer: 'a' },
        ],
        passingScore: 70,
        maxAttempts: 3,
      });

      const attempt = await service.startAssessmentAttempt(assessment.id, 'user-001', enrollment.id);
      await service.submitAssessmentAttempt(attempt.id, [
        { questionId: 'q1', answer: 'a', pointsAwarded: 0 },
      ]);

      const userBadges = await service.getUserBadges('user-001');
      expect(userBadges.some(ub => ub.badge.name === 'Perfect Score')).toBe(true);
    });

    it('should calculate leaderboard', async () => {
      // Create and complete course for user-001
      const course = await service.createCourse({
        title: 'Leaderboard Course',
        description: 'Test',
        shortDescription: 'Test',
        instructorId: 'inst-001',
        category: 'TECHNOLOGY',
        level: 'BEGINNER',
        language: 'ro',
        learningOutcomes: ['Test'],
        targetAudience: ['All'],
        price: 0,
        currency: 'RON',
        certificateEnabled: true,
      });

      const module = await service.addModule(course.id, { title: 'M' });
      const lesson = await service.addLesson(module.id, {
        title: 'L',
        type: 'VIDEO',
        content: { videoUrl: 'u' },
        duration: 5,
      });

      const enrollment = await service.enrollUser('user-001', course.id);
      await service.markLessonComplete(enrollment.id, lesson.id, 5);

      const leaderboard = await service.getLeaderboard('ALL_TIME', 10);

      expect(leaderboard.length).toBeGreaterThan(0);
      expect(leaderboard[0].rank).toBe(1);
      expect(leaderboard[0].coursesCompleted).toBeGreaterThanOrEqual(1);
    });
  });

  // ===== REVIEWS =====

  describe('Course Reviews', () => {
    let courseId: string;

    beforeEach(async () => {
      const course = await service.createCourse({
        title: 'Review Course',
        description: 'For review testing',
        shortDescription: 'Review test',
        instructorId: 'inst-001',
        category: 'TECHNOLOGY',
        level: 'BEGINNER',
        language: 'ro',
        learningOutcomes: ['Review'],
        targetAudience: ['All'],
        price: 100,
        currency: 'RON',
      });
      courseId = course.id;

      await service.enrollUser('user-001', courseId);
    });

    it('should add review to course', async () => {
      const review = await service.addReview(courseId, 'user-001', {
        rating: 5,
        title: 'Excellent course!',
        content: 'Very comprehensive and well-structured.',
      });

      expect(review.id).toBeDefined();
      expect(review.rating).toBe(5);
      expect(review.content).toBe('Very comprehensive and well-structured.');
    });

    it('should update course rating', async () => {
      await service.enrollUser('user-002', courseId);

      await service.addReview(courseId, 'user-001', {
        rating: 5,
        content: 'Great!',
      });

      await service.addReview(courseId, 'user-002', {
        rating: 3,
        content: 'Good but could be better.',
      });

      const course = await service.getCourse(courseId);
      expect(course?.reviewCount).toBe(2);
      expect(course?.rating).toBe(4); // Average of 5 and 3
    });

    it('should prevent duplicate reviews', async () => {
      await service.addReview(courseId, 'user-001', {
        rating: 5,
        content: 'First review',
      });

      await expect(service.addReview(courseId, 'user-001', {
        rating: 4,
        content: 'Second review',
      })).rejects.toThrow('User has already reviewed this course');
    });

    it('should require enrollment to review', async () => {
      await expect(service.addReview(courseId, 'non-enrolled-user', {
        rating: 5,
        content: 'Trying to review without enrollment',
      })).rejects.toThrow('User must be enrolled to review');
    });

    it('should get course reviews', async () => {
      await service.addReview(courseId, 'user-001', {
        rating: 5,
        content: 'Review content',
      });

      const reviews = await service.getCourseReviews(courseId);
      expect(reviews).toHaveLength(1);
    });
  });

  // ===== LEARNING PATHS =====

  describe('Learning Paths', () => {
    it('should create learning path', async () => {
      const course1 = await service.createCourse({
        title: 'Path Course 1',
        description: 'C1',
        shortDescription: 'C1',
        instructorId: 'inst-001',
        category: 'EXCEL_VBA',
        level: 'BEGINNER',
        language: 'ro',
        learningOutcomes: ['L1'],
        targetAudience: ['All'],
        price: 100,
        currency: 'RON',
      });

      const course2 = await service.createCourse({
        title: 'Path Course 2',
        description: 'C2',
        shortDescription: 'C2',
        instructorId: 'inst-001',
        category: 'EXCEL_VBA',
        level: 'INTERMEDIATE',
        language: 'ro',
        learningOutcomes: ['L2'],
        targetAudience: ['All'],
        price: 150,
        currency: 'RON',
      });

      const path = await service.createLearningPath({
        title: 'Excel Mastery Path',
        description: 'Become an Excel expert',
        courses: [course1.id, course2.id],
        skills: ['Excel', 'VBA', 'Automation'],
        certificateName: 'Excel Master Certificate',
      });

      expect(path.id).toBeDefined();
      expect(path.title).toBe('Excel Mastery Path');
      expect(path.courses).toHaveLength(2);
      expect(path.skills).toContain('Excel');
      expect(path.status).toBe('DRAFT');
    });

    it('should list learning paths', async () => {
      await service.createLearningPath({
        title: 'Path 1',
        description: 'P1',
        courses: [],
        skills: ['Skill'],
      });

      await service.createLearningPath({
        title: 'Path 2',
        description: 'P2',
        courses: [],
        skills: ['Skill'],
      });

      const paths = await service.listLearningPaths();
      expect(paths).toHaveLength(2);
    });

    it('should get learning path by ID', async () => {
      const created = await service.createLearningPath({
        title: 'Test Path',
        description: 'Test',
        courses: [],
        skills: ['Test'],
      });

      const retrieved = await service.getLearningPath(created.id);
      expect(retrieved?.title).toBe('Test Path');
    });
  });

  // ===== INSTRUCTOR MANAGEMENT =====

  describe('Instructor Management', () => {
    it('should create instructor', async () => {
      const instructor = await service.createInstructor({
        id: 'inst-new',
        name: 'Dr. John Smith',
        title: 'Senior Data Scientist',
        bio: '15 years of experience in data analytics and machine learning',
        expertise: ['Data Science', 'Machine Learning', 'Python'],
      });

      expect(instructor.id).toBe('inst-new');
      expect(instructor.name).toBe('Dr. John Smith');
      expect(instructor.courseCount).toBe(0);
      expect(instructor.studentCount).toBe(0);
    });

    it('should get instructor by ID', async () => {
      await service.createInstructor({
        id: 'inst-test',
        name: 'Test Instructor',
        title: 'Instructor',
        bio: 'Test bio',
        expertise: ['Testing'],
      });

      const instructor = await service.getInstructor('inst-test');
      expect(instructor?.name).toBe('Test Instructor');
    });
  });

  // ===== REFERENCE DATA =====

  describe('Reference Data', () => {
    it('should return course categories', () => {
      const categories = service.getCourseCategories();
      expect(categories.length).toBeGreaterThan(0);
      expect(categories.some(c => c.category === 'EXCEL_VBA')).toBe(true);
      expect(categories.some(c => c.category === 'FINANCE')).toBe(true);
    });

    it('should return course levels', () => {
      const levels = service.getCourseLevels();
      expect(levels).toHaveLength(4);
      expect(levels.some(l => l.level === 'BEGINNER')).toBe(true);
      expect(levels.some(l => l.level === 'EXPERT')).toBe(true);
    });

    it('should return assessment types', () => {
      const types = service.getAssessmentTypes();
      expect(types.some(t => t.type === 'QUIZ')).toBe(true);
      expect(types.some(t => t.type === 'ASSIGNMENT')).toBe(true);
      expect(types.some(t => t.type === 'FINAL_EXAM')).toBe(true);
    });

    it('should return lesson types', () => {
      const types = service.getLessonTypes();
      expect(types.some(t => t.type === 'VIDEO')).toBe(true);
      expect(types.some(t => t.type === 'TEXT')).toBe(true);
      expect(types.some(t => t.type === 'DOWNLOAD')).toBe(true);
      expect(types.some(t => t.type === 'LIVE_SESSION')).toBe(true);
    });
  });
});
