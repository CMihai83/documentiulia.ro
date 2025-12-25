import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Learning Management System (LMS) Service
// Course management, progress tracking, assessments, certificates, and gamification

// ===== TYPES =====

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  thumbnail?: string;
  previewVideo?: string;
  instructor: Instructor;
  category: CourseCategory;
  subcategory?: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  language: string;
  duration: number; // total minutes
  modules: CourseModule[];
  prerequisites: string[];
  learningOutcomes: string[];
  targetAudience: string[];
  tags: string[];
  price: number;
  currency: string;
  discountPrice?: number;
  isFree: boolean;
  enrollmentCount: number;
  rating: number;
  reviewCount: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt?: Date;
  certificateEnabled: boolean;
  certificateTemplate?: string;
  hrdaEligible: boolean; // Romanian HRDA subsidies
  ceuCredits?: number; // Continuing Education Units
  createdAt: Date;
  updatedAt: Date;
}

export type CourseCategory =
  | 'EXCEL_VBA'
  | 'PROJECT_MANAGEMENT'
  | 'FINANCE'
  | 'LEADERSHIP'
  | 'COMPLIANCE'
  | 'TECHNOLOGY'
  | 'HR'
  | 'OPERATIONS'
  | 'MARKETING'
  | 'SOFT_SKILLS';

export interface Instructor {
  id: string;
  name: string;
  title: string;
  bio: string;
  avatar?: string;
  expertise: string[];
  rating: number;
  courseCount: number;
  studentCount: number;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
  duration: number; // minutes
  isFree: boolean; // Preview module
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  description?: string;
  order: number;
  type: 'VIDEO' | 'TEXT' | 'QUIZ' | 'ASSIGNMENT' | 'DOWNLOAD' | 'LIVE_SESSION';
  content: LessonContent;
  duration: number; // minutes
  isFree: boolean;
  isPreview: boolean;
}

export interface LessonContent {
  // Video content
  videoUrl?: string;
  videoProvider?: 'BUNNY' | 'VIMEO' | 'YOUTUBE' | 'SELF_HOSTED';
  videoDuration?: number;
  transcript?: string;
  captions?: { language: string; url: string }[];
  // Text content
  textContent?: string;
  // Download content
  downloadUrl?: string;
  downloadFilename?: string;
  downloadSize?: number;
  // Quiz/Assignment reference
  assessmentId?: string;
  // Live session
  liveSessionUrl?: string;
  scheduledAt?: Date;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'REFUNDED';
  enrolledAt: Date;
  completedAt?: Date;
  expiresAt?: Date;
  progress: EnrollmentProgress;
  certificateId?: string;
  paymentId?: string;
  accessType: 'PURCHASED' | 'FREE' | 'SUBSCRIPTION' | 'GIFT' | 'CORPORATE';
}

export interface EnrollmentProgress {
  completedLessons: string[];
  completedModules: string[];
  completedAssessments: string[];
  currentLessonId?: string;
  currentModuleId?: string;
  overallProgress: number; // 0-100
  totalTimeSpent: number; // minutes
  lastAccessedAt: Date;
  streakDays: number;
  longestStreak: number;
}

export interface Assessment {
  id: string;
  courseId: string;
  moduleId?: string;
  lessonId?: string;
  title: string;
  description?: string;
  type: 'QUIZ' | 'ASSIGNMENT' | 'PRACTICAL' | 'FINAL_EXAM';
  questions: Question[];
  settings: AssessmentSettings;
  passingScore: number;
  maxAttempts: number;
  timeLimit?: number; // minutes
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: Date;
}

export interface AssessmentSettings {
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showCorrectAnswers: boolean;
  showExplanations: boolean;
  allowReview: boolean;
  requireProctoring: boolean;
}

export interface Question {
  id: string;
  type: 'MULTIPLE_CHOICE' | 'MULTIPLE_SELECT' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY' | 'CODE' | 'FILE_UPLOAD';
  text: string;
  explanation?: string;
  points: number;
  options?: QuestionOption[];
  correctAnswer?: string | string[];
  codeLanguage?: string;
  codeTemplate?: string;
  rubric?: string; // For essay/assignment grading
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface AssessmentAttempt {
  id: string;
  assessmentId: string;
  userId: string;
  enrollmentId: string;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | 'PASSED' | 'FAILED';
  startedAt: Date;
  submittedAt?: Date;
  gradedAt?: Date;
  answers: AttemptAnswer[];
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  timeSpent: number; // minutes
  attemptNumber: number;
  feedback?: string;
  gradedBy?: string;
}

export interface AttemptAnswer {
  questionId: string;
  answer: string | string[] | null;
  isCorrect?: boolean;
  pointsAwarded: number;
  feedback?: string;
}

export interface Certificate {
  id: string;
  enrollmentId: string;
  userId: string;
  courseId: string;
  courseName: string;
  userName: string;
  instructorName: string;
  issuedAt: Date;
  expiresAt?: Date;
  certificateNumber: string;
  verificationUrl: string;
  pdfUrl?: string;
  ceuCredits?: number;
  skills: string[];
  grade?: string;
  status: 'ISSUED' | 'REVOKED' | 'EXPIRED';
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'ACHIEVEMENT' | 'SKILL' | 'STREAK' | 'SOCIAL' | 'MILESTONE';
  criteria: BadgeCriteria;
  points: number;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  createdAt: Date;
}

export interface BadgeCriteria {
  type: 'COURSE_COMPLETE' | 'COURSES_COUNT' | 'STREAK_DAYS' | 'ASSESSMENT_SCORE' |
        'TIME_SPENT' | 'FIRST_COURSE' | 'CATEGORY_MASTER' | 'PERFECT_SCORE' | 'CUSTOM';
  threshold?: number;
  courseId?: string;
  category?: string;
  customRule?: string;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  badge: Badge;
  earnedAt: Date;
  courseId?: string;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  avatar?: string;
  points: number;
  coursesCompleted: number;
  certificatesEarned: number;
  streak: number;
  rank: number;
  change: number; // position change from last period
}

export interface CourseReview {
  id: string;
  courseId: string;
  userId: string;
  userName: string;
  rating: number;
  title?: string;
  content: string;
  helpful: number;
  reported: boolean;
  instructorResponse?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  courses: string[]; // courseIds in order
  estimatedDuration: number; // hours
  skills: string[];
  certificateName?: string;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: Date;
}

@Injectable()
export class LMSService {
  // In-memory storage
  private courses = new Map<string, Course>();
  private modules = new Map<string, CourseModule>();
  private lessons = new Map<string, Lesson>();
  private enrollments = new Map<string, Enrollment>();
  private assessments = new Map<string, Assessment>();
  private attempts = new Map<string, AssessmentAttempt>();
  private certificates = new Map<string, Certificate>();
  private badges = new Map<string, Badge>();
  private userBadges = new Map<string, UserBadge>();
  private reviews = new Map<string, CourseReview>();
  private learningPaths = new Map<string, LearningPath>();
  private instructors = new Map<string, Instructor>();

  constructor(private configService: ConfigService) {
    this.initializeDefaultBadges();
  }

  resetState(): void {
    this.courses.clear();
    this.modules.clear();
    this.lessons.clear();
    this.enrollments.clear();
    this.assessments.clear();
    this.attempts.clear();
    this.certificates.clear();
    this.badges.clear();
    this.userBadges.clear();
    this.reviews.clear();
    this.learningPaths.clear();
    this.instructors.clear();
    this.initializeDefaultBadges();
  }

  private initializeDefaultBadges(): void {
    const defaultBadges: Omit<Badge, 'id' | 'createdAt'>[] = [
      {
        name: 'First Steps',
        description: 'Complete your first course',
        icon: '🎓',
        category: 'ACHIEVEMENT',
        criteria: { type: 'FIRST_COURSE' },
        points: 100,
        rarity: 'COMMON',
      },
      {
        name: 'Knowledge Seeker',
        description: 'Complete 5 courses',
        icon: '📚',
        category: 'MILESTONE',
        criteria: { type: 'COURSES_COUNT', threshold: 5 },
        points: 500,
        rarity: 'UNCOMMON',
      },
      {
        name: 'Learning Master',
        description: 'Complete 20 courses',
        icon: '🏆',
        category: 'MILESTONE',
        criteria: { type: 'COURSES_COUNT', threshold: 20 },
        points: 2000,
        rarity: 'EPIC',
      },
      {
        name: 'Week Warrior',
        description: 'Maintain a 7-day learning streak',
        icon: '🔥',
        category: 'STREAK',
        criteria: { type: 'STREAK_DAYS', threshold: 7 },
        points: 200,
        rarity: 'COMMON',
      },
      {
        name: 'Month Champion',
        description: 'Maintain a 30-day learning streak',
        icon: '⚡',
        category: 'STREAK',
        criteria: { type: 'STREAK_DAYS', threshold: 30 },
        points: 1000,
        rarity: 'RARE',
      },
      {
        name: 'Perfect Score',
        description: 'Score 100% on any assessment',
        icon: '💯',
        category: 'ACHIEVEMENT',
        criteria: { type: 'PERFECT_SCORE' },
        points: 300,
        rarity: 'UNCOMMON',
      },
      {
        name: 'Excel Expert',
        description: 'Complete all Excel & VBA courses',
        icon: '📊',
        category: 'SKILL',
        criteria: { type: 'CATEGORY_MASTER', category: 'EXCEL_VBA' },
        points: 1500,
        rarity: 'RARE',
      },
      {
        name: 'Finance Guru',
        description: 'Complete all Finance courses',
        icon: '💰',
        category: 'SKILL',
        criteria: { type: 'CATEGORY_MASTER', category: 'FINANCE' },
        points: 1500,
        rarity: 'RARE',
      },
    ];

    defaultBadges.forEach(badge => {
      const id = `badge-${badge.name.toLowerCase().replace(/\s+/g, '-')}`;
      this.badges.set(id, { ...badge, id, createdAt: new Date() });
    });
  }

  // ===== COURSE MANAGEMENT =====

  async createCourse(data: {
    title: string;
    description: string;
    shortDescription: string;
    instructorId: string;
    category: CourseCategory;
    subcategory?: string;
    level: Course['level'];
    language: string;
    prerequisites?: string[];
    learningOutcomes: string[];
    targetAudience: string[];
    tags?: string[];
    price: number;
    currency: string;
    certificateEnabled?: boolean;
    hrdaEligible?: boolean;
    ceuCredits?: number;
    thumbnail?: string;
    previewVideo?: string;
  }): Promise<Course> {
    const courseId = `course-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Get or create instructor
    let instructor = this.instructors.get(data.instructorId);
    if (!instructor) {
      instructor = {
        id: data.instructorId,
        name: 'Instructor',
        title: 'Course Instructor',
        bio: '',
        expertise: [],
        rating: 0,
        courseCount: 0,
        studentCount: 0,
      };
      this.instructors.set(data.instructorId, instructor);
    }

    const course: Course = {
      id: courseId,
      title: data.title,
      slug,
      description: data.description,
      shortDescription: data.shortDescription,
      thumbnail: data.thumbnail,
      previewVideo: data.previewVideo,
      instructor,
      category: data.category,
      subcategory: data.subcategory,
      level: data.level,
      language: data.language,
      duration: 0,
      modules: [],
      prerequisites: data.prerequisites || [],
      learningOutcomes: data.learningOutcomes,
      targetAudience: data.targetAudience,
      tags: data.tags || [],
      price: data.price,
      currency: data.currency,
      isFree: data.price === 0,
      enrollmentCount: 0,
      rating: 0,
      reviewCount: 0,
      status: 'DRAFT',
      certificateEnabled: data.certificateEnabled ?? true,
      hrdaEligible: data.hrdaEligible ?? false,
      ceuCredits: data.ceuCredits,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.courses.set(courseId, course);

    // Update instructor course count
    instructor.courseCount++;
    this.instructors.set(instructor.id, instructor);

    return course;
  }

  async getCourse(courseId: string): Promise<Course | null> {
    return this.courses.get(courseId) || null;
  }

  async getCourseBySlug(slug: string): Promise<Course | null> {
    return Array.from(this.courses.values()).find(c => c.slug === slug) || null;
  }

  async updateCourse(courseId: string, updates: Partial<Course>): Promise<Course> {
    const course = this.courses.get(courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    const updated = { ...course, ...updates, updatedAt: new Date() };
    this.courses.set(courseId, updated);
    return updated;
  }

  async publishCourse(courseId: string): Promise<Course> {
    const course = this.courses.get(courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    if (course.modules.length === 0) {
      throw new Error('Course must have at least one module');
    }

    const hasLessons = course.modules.some(m => m.lessons.length > 0);
    if (!hasLessons) {
      throw new Error('Course must have at least one lesson');
    }

    course.status = 'PUBLISHED';
    course.publishedAt = new Date();
    course.updatedAt = new Date();

    this.courses.set(courseId, course);
    return course;
  }

  async listCourses(filters?: {
    category?: CourseCategory;
    level?: Course['level'];
    status?: Course['status'];
    isFree?: boolean;
    instructorId?: string;
    search?: string;
  }): Promise<Course[]> {
    let courses = Array.from(this.courses.values());

    if (filters?.category) {
      courses = courses.filter(c => c.category === filters.category);
    }
    if (filters?.level) {
      courses = courses.filter(c => c.level === filters.level);
    }
    if (filters?.status) {
      courses = courses.filter(c => c.status === filters.status);
    }
    if (filters?.isFree !== undefined) {
      courses = courses.filter(c => c.isFree === filters.isFree);
    }
    if (filters?.instructorId) {
      courses = courses.filter(c => c.instructor.id === filters.instructorId);
    }
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      courses = courses.filter(c =>
        c.title.toLowerCase().includes(searchLower) ||
        c.description.toLowerCase().includes(searchLower) ||
        c.tags.some(t => t.toLowerCase().includes(searchLower))
      );
    }

    return courses.sort((a, b) => b.enrollmentCount - a.enrollmentCount);
  }

  // ===== MODULE MANAGEMENT =====

  async addModule(courseId: string, data: {
    title: string;
    description?: string;
    isFree?: boolean;
  }): Promise<CourseModule> {
    const course = this.courses.get(courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    const moduleId = `module-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const module: CourseModule = {
      id: moduleId,
      courseId,
      title: data.title,
      description: data.description,
      order: course.modules.length + 1,
      lessons: [],
      duration: 0,
      isFree: data.isFree ?? false,
    };

    this.modules.set(moduleId, module);
    course.modules.push(module);
    course.updatedAt = new Date();
    this.courses.set(courseId, course);

    return module;
  }

  async updateModule(moduleId: string, updates: Partial<CourseModule>): Promise<CourseModule> {
    const module = this.modules.get(moduleId);
    if (!module) {
      throw new Error('Module not found');
    }

    const updated = { ...module, ...updates };
    this.modules.set(moduleId, updated);

    // Update in course
    const course = this.courses.get(module.courseId);
    if (course) {
      const idx = course.modules.findIndex(m => m.id === moduleId);
      if (idx !== -1) {
        course.modules[idx] = updated;
        this.courses.set(course.id, course);
      }
    }

    return updated;
  }

  async reorderModules(courseId: string, moduleOrder: string[]): Promise<Course> {
    const course = this.courses.get(courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    const reorderedModules = moduleOrder.map((id, index) => {
      const module = course.modules.find(m => m.id === id);
      if (!module) throw new Error(`Module ${id} not found`);
      module.order = index + 1;
      this.modules.set(id, module);
      return module;
    });

    course.modules = reorderedModules;
    course.updatedAt = new Date();
    this.courses.set(courseId, course);

    return course;
  }

  // ===== LESSON MANAGEMENT =====

  async addLesson(moduleId: string, data: {
    title: string;
    description?: string;
    type: Lesson['type'];
    content: LessonContent;
    duration: number;
    isFree?: boolean;
    isPreview?: boolean;
  }): Promise<Lesson> {
    const module = this.modules.get(moduleId);
    if (!module) {
      throw new Error('Module not found');
    }

    const lessonId = `lesson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const lesson: Lesson = {
      id: lessonId,
      moduleId,
      title: data.title,
      description: data.description,
      order: module.lessons.length + 1,
      type: data.type,
      content: data.content,
      duration: data.duration,
      isFree: data.isFree ?? false,
      isPreview: data.isPreview ?? false,
    };

    this.lessons.set(lessonId, lesson);
    module.lessons.push(lesson);
    module.duration += data.duration;
    this.modules.set(moduleId, module);

    // Update course duration
    const course = this.courses.get(module.courseId);
    if (course) {
      course.duration += data.duration;
      const moduleIdx = course.modules.findIndex(m => m.id === moduleId);
      if (moduleIdx !== -1) {
        course.modules[moduleIdx] = module;
      }
      this.courses.set(course.id, course);
    }

    return lesson;
  }

  async updateLesson(lessonId: string, updates: Partial<Lesson>): Promise<Lesson> {
    const lesson = this.lessons.get(lessonId);
    if (!lesson) {
      throw new Error('Lesson not found');
    }

    const durationDiff = (updates.duration || lesson.duration) - lesson.duration;
    const updated = { ...lesson, ...updates };
    this.lessons.set(lessonId, updated);

    // Update module
    const module = this.modules.get(lesson.moduleId);
    if (module) {
      const idx = module.lessons.findIndex(l => l.id === lessonId);
      if (idx !== -1) {
        module.lessons[idx] = updated;
        module.duration += durationDiff;
        this.modules.set(module.id, module);

        // Update course
        const course = this.courses.get(module.courseId);
        if (course) {
          course.duration += durationDiff;
          const moduleIdx = course.modules.findIndex(m => m.id === module.id);
          if (moduleIdx !== -1) {
            course.modules[moduleIdx] = module;
          }
          this.courses.set(course.id, course);
        }
      }
    }

    return updated;
  }

  async getLesson(lessonId: string): Promise<Lesson | null> {
    return this.lessons.get(lessonId) || null;
  }

  // ===== ENROLLMENT MANAGEMENT =====

  async enrollUser(userId: string, courseId: string, accessType: Enrollment['accessType'] = 'PURCHASED', paymentId?: string): Promise<Enrollment> {
    const course = this.courses.get(courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    // Check for existing enrollment
    const existing = Array.from(this.enrollments.values()).find(
      e => e.userId === userId && e.courseId === courseId && e.status === 'ACTIVE'
    );
    if (existing) {
      throw new Error('User is already enrolled in this course');
    }

    const enrollmentId = `enroll-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const enrollment: Enrollment = {
      id: enrollmentId,
      userId,
      courseId,
      status: 'ACTIVE',
      enrolledAt: new Date(),
      progress: {
        completedLessons: [],
        completedModules: [],
        completedAssessments: [],
        overallProgress: 0,
        totalTimeSpent: 0,
        lastAccessedAt: new Date(),
        streakDays: 0,
        longestStreak: 0,
      },
      accessType,
      paymentId,
    };

    this.enrollments.set(enrollmentId, enrollment);

    // Update course enrollment count
    course.enrollmentCount++;
    this.courses.set(courseId, course);

    // Update instructor student count
    const instructor = this.instructors.get(course.instructor.id);
    if (instructor) {
      instructor.studentCount++;
      this.instructors.set(instructor.id, instructor);
    }

    // Check for first course badge
    await this.checkAndAwardBadges(userId, 'FIRST_COURSE');

    return enrollment;
  }

  async getEnrollment(enrollmentId: string): Promise<Enrollment | null> {
    return this.enrollments.get(enrollmentId) || null;
  }

  async getUserEnrollments(userId: string): Promise<Enrollment[]> {
    return Array.from(this.enrollments.values())
      .filter(e => e.userId === userId)
      .sort((a, b) => b.enrolledAt.getTime() - a.enrolledAt.getTime());
  }

  async getCourseEnrollments(courseId: string): Promise<Enrollment[]> {
    return Array.from(this.enrollments.values())
      .filter(e => e.courseId === courseId);
  }

  // ===== PROGRESS TRACKING =====

  async markLessonComplete(enrollmentId: string, lessonId: string, timeSpent: number): Promise<Enrollment> {
    const enrollment = this.enrollments.get(enrollmentId);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    const lesson = this.lessons.get(lessonId);
    if (!lesson) {
      throw new Error('Lesson not found');
    }

    // Add to completed lessons if not already
    if (!enrollment.progress.completedLessons.includes(lessonId)) {
      enrollment.progress.completedLessons.push(lessonId);
    }

    enrollment.progress.totalTimeSpent += timeSpent;
    enrollment.progress.lastAccessedAt = new Date();

    // Update streak
    const today = new Date().toDateString();
    const lastAccess = enrollment.progress.lastAccessedAt.toDateString();
    if (today !== lastAccess) {
      enrollment.progress.streakDays++;
      if (enrollment.progress.streakDays > enrollment.progress.longestStreak) {
        enrollment.progress.longestStreak = enrollment.progress.streakDays;
      }
    }

    // Check if module is complete
    const module = this.modules.get(lesson.moduleId);
    if (module) {
      const moduleLessonIds = module.lessons.map(l => l.id);
      const allLessonsComplete = moduleLessonIds.every(id =>
        enrollment.progress.completedLessons.includes(id)
      );
      if (allLessonsComplete && !enrollment.progress.completedModules.includes(module.id)) {
        enrollment.progress.completedModules.push(module.id);
      }
    }

    // Calculate overall progress
    const course = this.courses.get(enrollment.courseId);
    if (course) {
      const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
      enrollment.progress.overallProgress = totalLessons > 0
        ? Math.round((enrollment.progress.completedLessons.length / totalLessons) * 100)
        : 0;

      // Check if course is complete
      if (enrollment.progress.overallProgress === 100 && enrollment.status !== 'COMPLETED') {
        enrollment.status = 'COMPLETED';
        enrollment.completedAt = new Date();

        // Generate certificate if enabled
        if (course.certificateEnabled) {
          await this.generateCertificate(enrollmentId);
        }

        // Check badges
        await this.checkAndAwardBadges(enrollment.userId, 'COURSES_COUNT');
      }
    }

    this.enrollments.set(enrollmentId, enrollment);

    // Check streak badges
    await this.checkAndAwardBadges(enrollment.userId, 'STREAK_DAYS', enrollment.progress.streakDays);

    return enrollment;
  }

  async setCurrentLesson(enrollmentId: string, lessonId: string): Promise<Enrollment> {
    const enrollment = this.enrollments.get(enrollmentId);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    const lesson = this.lessons.get(lessonId);
    if (!lesson) {
      throw new Error('Lesson not found');
    }

    enrollment.progress.currentLessonId = lessonId;
    enrollment.progress.currentModuleId = lesson.moduleId;
    enrollment.progress.lastAccessedAt = new Date();

    this.enrollments.set(enrollmentId, enrollment);
    return enrollment;
  }

  // ===== ASSESSMENTS =====

  async createAssessment(data: {
    courseId: string;
    moduleId?: string;
    lessonId?: string;
    title: string;
    description?: string;
    type: Assessment['type'];
    questions: Question[];
    passingScore: number;
    maxAttempts: number;
    timeLimit?: number;
    settings?: Partial<AssessmentSettings>;
  }): Promise<Assessment> {
    const assessmentId = `assess-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const defaultSettings: AssessmentSettings = {
      shuffleQuestions: false,
      shuffleAnswers: false,
      showCorrectAnswers: true,
      showExplanations: true,
      allowReview: true,
      requireProctoring: false,
    };

    const assessment: Assessment = {
      id: assessmentId,
      courseId: data.courseId,
      moduleId: data.moduleId,
      lessonId: data.lessonId,
      title: data.title,
      description: data.description,
      type: data.type,
      questions: data.questions,
      settings: { ...defaultSettings, ...data.settings },
      passingScore: data.passingScore,
      maxAttempts: data.maxAttempts,
      timeLimit: data.timeLimit,
      status: 'DRAFT',
      createdAt: new Date(),
    };

    this.assessments.set(assessmentId, assessment);
    return assessment;
  }

  async getAssessment(assessmentId: string): Promise<Assessment | null> {
    return this.assessments.get(assessmentId) || null;
  }

  async publishAssessment(assessmentId: string): Promise<Assessment> {
    const assessment = this.assessments.get(assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    if (assessment.questions.length === 0) {
      throw new Error('Assessment must have at least one question');
    }

    assessment.status = 'PUBLISHED';
    this.assessments.set(assessmentId, assessment);
    return assessment;
  }

  async startAssessmentAttempt(assessmentId: string, userId: string, enrollmentId: string): Promise<AssessmentAttempt> {
    const assessment = this.assessments.get(assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    // Check previous attempts
    const previousAttempts = Array.from(this.attempts.values()).filter(
      a => a.assessmentId === assessmentId && a.userId === userId
    );

    if (previousAttempts.length >= assessment.maxAttempts) {
      throw new Error('Maximum attempts reached');
    }

    const attemptId = `attempt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const attempt: AssessmentAttempt = {
      id: attemptId,
      assessmentId,
      userId,
      enrollmentId,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      answers: [],
      score: 0,
      maxScore: assessment.questions.reduce((sum, q) => sum + q.points, 0),
      percentage: 0,
      passed: false,
      timeSpent: 0,
      attemptNumber: previousAttempts.length + 1,
    };

    this.attempts.set(attemptId, attempt);
    return attempt;
  }

  async submitAssessmentAttempt(attemptId: string, answers: AttemptAnswer[]): Promise<AssessmentAttempt> {
    const attempt = this.attempts.get(attemptId);
    if (!attempt) {
      throw new Error('Attempt not found');
    }

    if (attempt.status !== 'IN_PROGRESS') {
      throw new Error('Attempt is not in progress');
    }

    const assessment = this.assessments.get(attempt.assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    // Grade the attempt
    let score = 0;
    const gradedAnswers = answers.map(answer => {
      const question = assessment.questions.find(q => q.id === answer.questionId);
      if (!question) return answer;

      let isCorrect = false;
      let points = 0;

      if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
        isCorrect = answer.answer === question.correctAnswer;
        points = isCorrect ? question.points : 0;
      } else if (question.type === 'MULTIPLE_SELECT') {
        const correctAnswers = question.correctAnswer as string[];
        const userAnswers = answer.answer as string[];
        isCorrect = correctAnswers.length === userAnswers.length &&
                    correctAnswers.every(a => userAnswers.includes(a));
        points = isCorrect ? question.points : 0;
      } else {
        // Short answer, essay, code, file - needs manual grading
        points = 0;
      }

      score += points;

      return {
        ...answer,
        isCorrect,
        pointsAwarded: points,
      };
    });

    attempt.answers = gradedAnswers;
    attempt.score = score;
    attempt.percentage = Math.round((score / attempt.maxScore) * 100);
    attempt.passed = attempt.percentage >= assessment.passingScore;
    attempt.status = attempt.passed ? 'PASSED' : 'FAILED';
    attempt.submittedAt = new Date();
    attempt.timeSpent = Math.round((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 60000);

    this.attempts.set(attemptId, attempt);

    // Update enrollment progress
    if (attempt.passed) {
      const enrollment = this.enrollments.get(attempt.enrollmentId);
      if (enrollment && !enrollment.progress.completedAssessments.includes(assessment.id)) {
        enrollment.progress.completedAssessments.push(assessment.id);
        this.enrollments.set(enrollment.id, enrollment);
      }

      // Check perfect score badge
      if (attempt.percentage === 100) {
        await this.checkAndAwardBadges(attempt.userId, 'PERFECT_SCORE');
      }
    }

    return attempt;
  }

  async getAttempt(attemptId: string): Promise<AssessmentAttempt | null> {
    return this.attempts.get(attemptId) || null;
  }

  async getUserAttempts(userId: string, assessmentId?: string): Promise<AssessmentAttempt[]> {
    let attempts = Array.from(this.attempts.values()).filter(a => a.userId === userId);

    if (assessmentId) {
      attempts = attempts.filter(a => a.assessmentId === assessmentId);
    }

    return attempts.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  // ===== CERTIFICATES =====

  async generateCertificate(enrollmentId: string, grade?: string): Promise<Certificate> {
    const enrollment = this.enrollments.get(enrollmentId);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    if (enrollment.status !== 'COMPLETED') {
      throw new Error('Course must be completed to generate certificate');
    }

    const course = this.courses.get(enrollment.courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    const certificateId = `cert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const certificateNumber = `CERT-${new Date().getFullYear()}-${String(this.certificates.size + 1).padStart(6, '0')}`;

    const certificate: Certificate = {
      id: certificateId,
      enrollmentId,
      userId: enrollment.userId,
      courseId: course.id,
      courseName: course.title,
      userName: enrollment.userId, // Would be actual name in production
      instructorName: course.instructor.name,
      issuedAt: new Date(),
      certificateNumber,
      verificationUrl: `https://documentiulia.ro/verify/${certificateNumber}`,
      ceuCredits: course.ceuCredits,
      skills: course.learningOutcomes,
      grade,
      status: 'ISSUED',
    };

    this.certificates.set(certificateId, certificate);

    // Update enrollment
    enrollment.certificateId = certificateId;
    this.enrollments.set(enrollmentId, enrollment);

    return certificate;
  }

  async getCertificate(certificateId: string): Promise<Certificate | null> {
    return this.certificates.get(certificateId) || null;
  }

  async getCertificateByNumber(certificateNumber: string): Promise<Certificate | null> {
    return Array.from(this.certificates.values()).find(c => c.certificateNumber === certificateNumber) || null;
  }

  async getUserCertificates(userId: string): Promise<Certificate[]> {
    return Array.from(this.certificates.values())
      .filter(c => c.userId === userId)
      .sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime());
  }

  // ===== GAMIFICATION =====

  private async checkAndAwardBadges(userId: string, criteriaType: string, value?: number): Promise<void> {
    const userBadgeIds = Array.from(this.userBadges.values())
      .filter(ub => ub.userId === userId)
      .map(ub => ub.badgeId);

    for (const [badgeId, badge] of this.badges) {
      if (userBadgeIds.includes(badgeId)) continue;
      if (badge.criteria.type !== criteriaType) continue;

      let earned = false;

      switch (criteriaType) {
        case 'FIRST_COURSE': {
          const completedCourses = Array.from(this.enrollments.values())
            .filter(e => e.userId === userId && e.status === 'COMPLETED');
          earned = completedCourses.length >= 1;
          break;
        }
        case 'COURSES_COUNT': {
          const completedCourses = Array.from(this.enrollments.values())
            .filter(e => e.userId === userId && e.status === 'COMPLETED');
          earned = completedCourses.length >= (badge.criteria.threshold || 0);
          break;
        }
        case 'STREAK_DAYS': {
          earned = (value || 0) >= (badge.criteria.threshold || 0);
          break;
        }
        case 'PERFECT_SCORE': {
          earned = true;
          break;
        }
      }

      if (earned) {
        await this.awardBadge(userId, badgeId);
      }
    }
  }

  async awardBadge(userId: string, badgeId: string, courseId?: string): Promise<UserBadge> {
    const badge = this.badges.get(badgeId);
    if (!badge) {
      throw new Error('Badge not found');
    }

    const userBadgeId = `ub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const userBadge: UserBadge = {
      id: userBadgeId,
      userId,
      badgeId,
      badge,
      earnedAt: new Date(),
      courseId,
    };

    this.userBadges.set(userBadgeId, userBadge);
    return userBadge;
  }

  async getUserBadges(userId: string): Promise<UserBadge[]> {
    return Array.from(this.userBadges.values())
      .filter(ub => ub.userId === userId)
      .sort((a, b) => b.earnedAt.getTime() - a.earnedAt.getTime());
  }

  async getAllBadges(): Promise<Badge[]> {
    return Array.from(this.badges.values());
  }

  async getLeaderboard(period: 'WEEKLY' | 'MONTHLY' | 'ALL_TIME' = 'ALL_TIME', limit: number = 10): Promise<LeaderboardEntry[]> {
    // Calculate user stats
    const userStats = new Map<string, {
      points: number;
      coursesCompleted: number;
      certificatesEarned: number;
      streak: number;
    }>();

    // Count completed courses and certificates
    for (const enrollment of this.enrollments.values()) {
      const stats = userStats.get(enrollment.userId) || {
        points: 0,
        coursesCompleted: 0,
        certificatesEarned: 0,
        streak: 0,
      };

      if (enrollment.status === 'COMPLETED') {
        stats.coursesCompleted++;
        stats.points += 100; // Points per course
        if (enrollment.certificateId) {
          stats.certificatesEarned++;
          stats.points += 50; // Points per certificate
        }
      }

      stats.streak = Math.max(stats.streak, enrollment.progress.longestStreak);
      stats.points += enrollment.progress.streakDays * 5; // Points for streak

      userStats.set(enrollment.userId, stats);
    }

    // Add badge points
    for (const userBadge of this.userBadges.values()) {
      const stats = userStats.get(userBadge.userId);
      if (stats) {
        stats.points += userBadge.badge.points;
      }
    }

    // Create leaderboard entries
    const entries: LeaderboardEntry[] = Array.from(userStats.entries())
      .map(([userId, stats]) => ({
        userId,
        userName: userId,
        points: stats.points,
        coursesCompleted: stats.coursesCompleted,
        certificatesEarned: stats.certificatesEarned,
        streak: stats.streak,
        rank: 0,
        change: 0,
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, limit)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    return entries;
  }

  // ===== REVIEWS =====

  async addReview(courseId: string, userId: string, data: {
    rating: number;
    title?: string;
    content: string;
  }): Promise<CourseReview> {
    const course = this.courses.get(courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    // Check if user has completed the course
    const enrollment = Array.from(this.enrollments.values()).find(
      e => e.courseId === courseId && e.userId === userId
    );
    if (!enrollment) {
      throw new Error('User must be enrolled to review');
    }

    // Check for existing review
    const existing = Array.from(this.reviews.values()).find(
      r => r.courseId === courseId && r.userId === userId
    );
    if (existing) {
      throw new Error('User has already reviewed this course');
    }

    const reviewId = `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const review: CourseReview = {
      id: reviewId,
      courseId,
      userId,
      userName: userId,
      rating: Math.max(1, Math.min(5, data.rating)),
      title: data.title,
      content: data.content,
      helpful: 0,
      reported: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.reviews.set(reviewId, review);

    // Update course rating
    const courseReviews = Array.from(this.reviews.values()).filter(r => r.courseId === courseId);
    course.reviewCount = courseReviews.length;
    course.rating = courseReviews.reduce((sum, r) => sum + r.rating, 0) / courseReviews.length;
    this.courses.set(courseId, course);

    return review;
  }

  async getCourseReviews(courseId: string): Promise<CourseReview[]> {
    return Array.from(this.reviews.values())
      .filter(r => r.courseId === courseId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // ===== LEARNING PATHS =====

  async createLearningPath(data: {
    title: string;
    description: string;
    thumbnail?: string;
    courses: string[];
    skills: string[];
    certificateName?: string;
  }): Promise<LearningPath> {
    const pathId = `path-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Calculate duration
    let duration = 0;
    for (const courseId of data.courses) {
      const course = this.courses.get(courseId);
      if (course) {
        duration += course.duration;
      }
    }

    const path: LearningPath = {
      id: pathId,
      title: data.title,
      description: data.description,
      thumbnail: data.thumbnail,
      courses: data.courses,
      estimatedDuration: Math.round(duration / 60), // Convert to hours
      skills: data.skills,
      certificateName: data.certificateName,
      status: 'DRAFT',
      createdAt: new Date(),
    };

    this.learningPaths.set(pathId, path);
    return path;
  }

  async getLearningPath(pathId: string): Promise<LearningPath | null> {
    return this.learningPaths.get(pathId) || null;
  }

  async listLearningPaths(): Promise<LearningPath[]> {
    return Array.from(this.learningPaths.values());
  }

  // ===== INSTRUCTOR MANAGEMENT =====

  async createInstructor(data: {
    id: string;
    name: string;
    title: string;
    bio: string;
    avatar?: string;
    expertise: string[];
  }): Promise<Instructor> {
    const instructor: Instructor = {
      id: data.id,
      name: data.name,
      title: data.title,
      bio: data.bio,
      avatar: data.avatar,
      expertise: data.expertise,
      rating: 0,
      courseCount: 0,
      studentCount: 0,
    };

    this.instructors.set(data.id, instructor);
    return instructor;
  }

  async getInstructor(instructorId: string): Promise<Instructor | null> {
    return this.instructors.get(instructorId) || null;
  }

  // ===== REFERENCE DATA =====

  getCourseCategories(): { category: CourseCategory; name: string; description: string }[] {
    return [
      { category: 'EXCEL_VBA', name: 'Excel & VBA', description: 'Spreadsheet mastery and automation' },
      { category: 'PROJECT_MANAGEMENT', name: 'Project Management', description: 'PMP, Agile, Scrum methodologies' },
      { category: 'FINANCE', name: 'Finance', description: 'Financial analysis, budgeting, accounting' },
      { category: 'LEADERSHIP', name: 'Leadership', description: 'Management and leadership skills' },
      { category: 'COMPLIANCE', name: 'Compliance', description: 'Regulatory and legal compliance' },
      { category: 'TECHNOLOGY', name: 'Technology', description: 'IT skills and software development' },
      { category: 'HR', name: 'Human Resources', description: 'HR management and practices' },
      { category: 'OPERATIONS', name: 'Operations', description: 'Business operations and efficiency' },
      { category: 'MARKETING', name: 'Marketing', description: 'Digital and traditional marketing' },
      { category: 'SOFT_SKILLS', name: 'Soft Skills', description: 'Communication, teamwork, presentation' },
    ];
  }

  getCourseLevels(): { level: Course['level']; name: string; description: string }[] {
    return [
      { level: 'BEGINNER', name: 'Beginner', description: 'No prior knowledge required' },
      { level: 'INTERMEDIATE', name: 'Intermediate', description: 'Basic understanding assumed' },
      { level: 'ADVANCED', name: 'Advanced', description: 'Significant experience required' },
      { level: 'EXPERT', name: 'Expert', description: 'Professional-level content' },
    ];
  }

  getAssessmentTypes(): { type: Assessment['type']; name: string; description: string }[] {
    return [
      { type: 'QUIZ', name: 'Quiz', description: 'Multiple choice and short questions' },
      { type: 'ASSIGNMENT', name: 'Assignment', description: 'Practical exercise submission' },
      { type: 'PRACTICAL', name: 'Practical Exam', description: 'Hands-on demonstration' },
      { type: 'FINAL_EXAM', name: 'Final Exam', description: 'Comprehensive course assessment' },
    ];
  }

  getLessonTypes(): { type: Lesson['type']; name: string; description: string }[] {
    return [
      { type: 'VIDEO', name: 'Video', description: 'Video lecture or tutorial' },
      { type: 'TEXT', name: 'Text', description: 'Reading material or article' },
      { type: 'QUIZ', name: 'Quiz', description: 'Interactive quiz' },
      { type: 'ASSIGNMENT', name: 'Assignment', description: 'Practical assignment' },
      { type: 'DOWNLOAD', name: 'Download', description: 'Downloadable resource' },
      { type: 'LIVE_SESSION', name: 'Live Session', description: 'Scheduled live class' },
    ];
  }
}
