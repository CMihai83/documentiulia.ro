import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

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
  private assessments = new Map<string, Assessment>();
  private attempts = new Map<string, AssessmentAttempt>();
  private certificates = new Map<string, Certificate>();
  private badges = new Map<string, Badge>();
  private userBadges = new Map<string, UserBadge>();
  private reviews = new Map<string, CourseReview>();
  private learningPaths = new Map<string, LearningPath>();
  private instructors = new Map<string, Instructor>();

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {
    this.initializeDefaultBadges();
  }

  // ===== F-1: Prisma mappers + Redis cache helpers =====

  private readonly COURSE_TTL = 3600;

  private courseKey(id: string): string {
    return `lms:course:${id}`;
  }

  private listKey(filters?: Record<string, unknown>): string {
    return filters && Object.keys(filters).length
      ? `lms:courses:${JSON.stringify(filters)}`
      : 'lms:courses:all';
  }

  private async invalidateCourseCache(courseId?: string): Promise<void> {
    try {
      if (courseId) await this.redis.del(this.courseKey(courseId));
      await this.redis.delPattern('lms:courses:*');
    } catch {
      // cache is best-effort; never fail a write on cache errors
    }
  }

  private defaultInstructor(id = 'instructor'): Instructor {
    return { id, name: 'Instructor', title: 'Course Instructor', bio: '', expertise: [], rating: 0, courseCount: 0, studentCount: 0 };
  }

  private readonly courseStatusToDb: Record<Course['status'], any> = {
    DRAFT: 'LMS_DRAFT',
    PUBLISHED: 'LMS_PUBLISHED',
    ARCHIVED: 'LMS_ARCHIVED',
  };

  private courseStatusFromDb(s: string): Course['status'] {
    if (s === 'LMS_PUBLISHED') return 'PUBLISHED';
    if (s === 'LMS_ARCHIVED') return 'ARCHIVED';
    return 'DRAFT';
  }

  private mapLesson(row: any): Lesson {
    return {
      id: row.id,
      moduleId: row.moduleId,
      title: row.title,
      description: row.description ?? undefined,
      order: row.order,
      type: row.type,
      content: (row.contentJson as LessonContent) ?? { textContent: row.content ?? undefined, videoUrl: row.videoUrl ?? undefined },
      duration: row.duration,
      isFree: row.isFree,
      isPreview: row.isPreview,
    };
  }

  private mapModule(row: any): CourseModule {
    return {
      id: row.id,
      courseId: row.courseId,
      title: row.title,
      description: row.description ?? undefined,
      order: row.order,
      duration: row.duration,
      isFree: row.isFree,
      lessons: (row.lessons ?? []).map((l: any) => this.mapLesson(l)),
    };
  }

  private mapCourse(row: any): Course {
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      shortDescription: row.shortDescription ?? '',
      thumbnail: row.thumbnailUrl ?? undefined,
      previewVideo: row.previewVideo ?? undefined,
      instructor: (row.instructor as Instructor) ?? this.defaultInstructor(),
      category: row.category,
      subcategory: row.subcategory ?? undefined,
      level: row.level,
      language: row.language,
      duration: row.duration,
      modules: (row.modules ?? []).map((m: any) => this.mapModule(m)),
      prerequisites: row.prerequisites ?? [],
      learningOutcomes: row.learningOutcomes ?? [],
      targetAudience: row.targetAudience ?? [],
      tags: row.tags ?? [],
      price: row.price != null ? Number(row.price) : 0,
      currency: row.currency,
      discountPrice: row.discountPrice != null ? Number(row.discountPrice) : undefined,
      isFree: row.isFree,
      enrollmentCount: row.enrollmentCount,
      rating: row.rating,
      reviewCount: row.reviewCount,
      status: this.courseStatusFromDb(row.status),
      publishedAt: row.publishedAt ?? undefined,
      certificateEnabled: row.hasCertificate,
      certificateTemplate: row.certificateTemplate ?? undefined,
      hrdaEligible: row.hrdaEligible,
      ceuCredits: row.ceuCredits ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapEnrollment(row: any): Enrollment {
    const completedLessons = (row.lessonProgress ?? []).filter((p: any) => p.completed).map((p: any) => p.lessonId);
    return {
      id: row.id,
      userId: row.userId,
      courseId: row.courseId,
      status: row.status,
      enrolledAt: row.startedAt,
      completedAt: row.completedAt ?? undefined,
      expiresAt: row.expiresAt ?? undefined,
      progress: {
        completedLessons,
        completedModules: row.completedModules ?? [],
        completedAssessments: row.completedAssessments ?? [],
        currentLessonId: row.currentLessonId ?? undefined,
        currentModuleId: row.currentModuleId ?? undefined,
        overallProgress: row.progress,
        totalTimeSpent: row.totalTimeSpent,
        lastAccessedAt: row.lastAccessedAt ?? row.startedAt,
        streakDays: row.streakDays,
        longestStreak: row.longestStreak,
      },
      certificateId: row.certificateId ?? undefined,
      paymentId: row.paymentId ?? undefined,
      accessType: row.accessType,
    };
  }

  async resetState(): Promise<void> {
    // Migrated entities live in the DB now
    await this.prisma.lMSLessonProgress.deleteMany({});
    await this.prisma.lMSEnrollment.deleteMany({});
    await this.prisma.lMSLesson.deleteMany({});
    await this.prisma.lMSCourseModule.deleteMany({});
    await this.prisma.lMSCourse.deleteMany({});
    // Remaining in-memory stores
    this.assessments.clear();
    this.attempts.clear();
    this.certificates.clear();
    this.badges.clear();
    this.userBadges.clear();
    this.reviews.clear();
    this.learningPaths.clear();
    this.instructors.clear();
    this.initializeDefaultBadges();
    await this.invalidateCourseCache();
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
    const slugBase = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    let instructor = this.instructors.get(data.instructorId);
    if (!instructor) {
      instructor = this.defaultInstructor(data.instructorId);
    }
    instructor.courseCount++;
    this.instructors.set(instructor.id, instructor);

    const createData: any = {
      title: data.title,
      slug: slugBase,
      description: data.description,
      shortDescription: data.shortDescription,
      previewVideo: data.previewVideo,
      thumbnailUrl: data.thumbnail,
      category: data.category as any,
      subcategory: data.subcategory,
      level: data.level as any,
      language: data.language,
      duration: 0,
      prerequisites: data.prerequisites || [],
      learningOutcomes: data.learningOutcomes,
      targetAudience: data.targetAudience,
      tags: data.tags || [],
      price: data.price,
      currency: data.currency,
      isFree: data.price === 0,
      hasCertificate: data.certificateEnabled ?? true,
      hrdaEligible: data.hrdaEligible ?? false,
      ceuCredits: data.ceuCredits,
      status: 'LMS_DRAFT',
      instructor: instructor as any,
    };

    let row;
    try {
      row = await this.prisma.lMSCourse.create({ data: createData });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        row = await this.prisma.lMSCourse.create({ data: { ...createData, slug: `${slugBase}-${Math.random().toString(36).slice(2, 8)}` } });
      } else {
        throw e;
      }
    }

    await this.invalidateCourseCache(row.id);
    return this.mapCourse({ ...row, modules: [] });
  }

  async getCourse(courseId: string): Promise<Course | null> {
    const key = this.courseKey(courseId);
    try {
      const cached = await this.redis.get<Course>(key);
      if (cached) return cached;
    } catch {
      // fall through to DB
    }
    const row = await this.prisma.lMSCourse.findUnique({
      where: { id: courseId },
      include: { modules: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } } },
    });
    if (!row) return null;
    const course = this.mapCourse(row);
    try { await this.redis.set(key, course, this.COURSE_TTL); } catch { /* best-effort */ }
    return course;
  }

  async getCourseBySlug(slug: string): Promise<Course | null> {
    const row = await this.prisma.lMSCourse.findUnique({
      where: { slug },
      include: { modules: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } } },
    });
    return row ? this.mapCourse(row) : null;
  }

  async updateCourse(courseId: string, updates: Partial<Course>): Promise<Course> {
    const data: any = {};
    if (updates.title !== undefined) data.title = updates.title;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.shortDescription !== undefined) data.shortDescription = updates.shortDescription;
    if (updates.previewVideo !== undefined) data.previewVideo = updates.previewVideo;
    if (updates.thumbnail !== undefined) data.thumbnailUrl = updates.thumbnail;
    if (updates.category !== undefined) data.category = updates.category as any;
    if (updates.subcategory !== undefined) data.subcategory = updates.subcategory;
    if (updates.level !== undefined) data.level = updates.level as any;
    if (updates.language !== undefined) data.language = updates.language;
    if (updates.tags !== undefined) data.tags = updates.tags;
    if (updates.prerequisites !== undefined) data.prerequisites = updates.prerequisites;
    if (updates.learningOutcomes !== undefined) data.learningOutcomes = updates.learningOutcomes;
    if (updates.targetAudience !== undefined) data.targetAudience = updates.targetAudience;
    if (updates.price !== undefined) { data.price = updates.price; data.isFree = updates.price === 0; }
    if (updates.discountPrice !== undefined) data.discountPrice = updates.discountPrice;
    if (updates.status !== undefined) data.status = this.courseStatusToDb[updates.status];
    if (updates.certificateEnabled !== undefined) data.hasCertificate = updates.certificateEnabled;
    if (updates.hrdaEligible !== undefined) data.hrdaEligible = updates.hrdaEligible;
    if (updates.ceuCredits !== undefined) data.ceuCredits = updates.ceuCredits;

    let row;
    try {
      row = await this.prisma.lMSCourse.update({
        where: { id: courseId },
        data,
        include: { modules: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } } },
      });
    } catch {
      throw new Error('Course not found');
    }
    await this.invalidateCourseCache(courseId);
    return this.mapCourse(row);
  }

  async publishCourse(courseId: string): Promise<Course> {
    const existing = await this.prisma.lMSCourse.findUnique({
      where: { id: courseId },
      include: { modules: { include: { lessons: true } } },
    });
    if (!existing) throw new Error('Course not found');
    if (existing.modules.length === 0) throw new Error('Course must have at least one module');
    if (!existing.modules.some((m: any) => m.lessons.length > 0)) throw new Error('Course must have at least one lesson');

    const row = await this.prisma.lMSCourse.update({
      where: { id: courseId },
      data: { status: 'LMS_PUBLISHED', publishedAt: new Date() },
      include: { modules: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } } },
    });
    await this.invalidateCourseCache(courseId);
    return this.mapCourse(row);
  }

  async listCourses(filters?: {
    category?: CourseCategory;
    level?: Course['level'];
    status?: Course['status'];
    isFree?: boolean;
    instructorId?: string;
    search?: string;
  }): Promise<Course[]> {
    const key = this.listKey(filters as any);
    try {
      const cached = await this.redis.get<Course[]>(key);
      if (cached) return cached;
    } catch {
      // fall through to DB
    }

    const where: any = {};
    if (filters?.category) where.category = filters.category;
    if (filters?.level) where.level = filters.level;
    if (filters?.status) where.status = this.courseStatusToDb[filters.status];
    if (filters?.isFree !== undefined) where.isFree = filters.isFree;

    const rows = await this.prisma.lMSCourse.findMany({
      where,
      include: { modules: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } } },
      orderBy: { enrollmentCount: 'desc' },
    });
    let courses = rows.map((r: any) => this.mapCourse(r));

    if (filters?.search) {
      const term = filters.search.toLowerCase();
      courses = courses.filter(c =>
        c.title.toLowerCase().includes(term) ||
        c.description.toLowerCase().includes(term) ||
        c.tags.some(t => t.toLowerCase().includes(term)),
      );
    }
    if (filters?.instructorId) {
      courses = courses.filter(c => c.instructor.id === filters.instructorId);
    }

    try { await this.redis.set(key, courses, this.COURSE_TTL); } catch { /* best-effort */ }
    return courses;
  }

  // ===== MODULE MANAGEMENT =====

  async addModule(courseId: string, data: { title: string; description?: string; isFree?: boolean; }): Promise<CourseModule> {
    const course = await this.prisma.lMSCourse.findUnique({ where: { id: courseId }, include: { modules: true } });
    if (!course) throw new Error('Course not found');
    const row = await this.prisma.lMSCourseModule.create({
      data: { courseId, title: data.title, description: data.description, order: course.modules.length + 1, duration: 0, isFree: data.isFree ?? false },
    });
    await this.invalidateCourseCache(courseId);
    return this.mapModule({ ...row, lessons: [] });
  }

  async updateModule(moduleId: string, updates: Partial<CourseModule>): Promise<CourseModule> {
    const data: any = {};
    if (updates.title !== undefined) data.title = updates.title;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.order !== undefined) data.order = updates.order;
    if (updates.duration !== undefined) data.duration = updates.duration;
    if (updates.isFree !== undefined) data.isFree = updates.isFree;
    let row;
    try {
      row = await this.prisma.lMSCourseModule.update({ where: { id: moduleId }, data, include: { lessons: { orderBy: { order: 'asc' } } } });
    } catch {
      throw new Error('Module not found');
    }
    await this.invalidateCourseCache(row.courseId);
    return this.mapModule(row);
  }

  async reorderModules(courseId: string, moduleOrder: string[]): Promise<Course> {
    const course = await this.prisma.lMSCourse.findUnique({ where: { id: courseId }, include: { modules: true } });
    if (!course) throw new Error('Course not found');
    for (let i = 0; i < moduleOrder.length; i++) {
      const id = moduleOrder[i];
      if (!course.modules.find((m: any) => m.id === id)) throw new Error(`Module ${id} not found`);
      await this.prisma.lMSCourseModule.update({ where: { id }, data: { order: i + 1 } });
    }
    await this.invalidateCourseCache(courseId);
    return (await this.getCourse(courseId)) as Course;
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
    const parentModule = await this.prisma.lMSCourseModule.findUnique({ where: { id: moduleId }, include: { lessons: true } });
    if (!parentModule) throw new Error('Module not found');
    const row = await this.prisma.lMSLesson.create({
      data: {
        moduleId,
        title: data.title,
        description: data.description,
        order: parentModule.lessons.length + 1,
        type: data.type as any,
        videoUrl: data.content?.videoUrl,
        content: data.content?.textContent,
        contentJson: data.content as any,
        duration: data.duration,
        isFree: data.isFree ?? false,
        isPreview: data.isPreview ?? false,
        attachments: [],
      },
    });
    await this.prisma.lMSCourseModule.update({ where: { id: moduleId }, data: { duration: { increment: data.duration } } });
    await this.prisma.lMSCourse.update({ where: { id: parentModule.courseId }, data: { duration: { increment: data.duration } } });
    await this.invalidateCourseCache(parentModule.courseId);
    return this.mapLesson(row);
  }

  async updateLesson(lessonId: string, updates: Partial<Lesson>): Promise<Lesson> {
    const lesson = await this.prisma.lMSLesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new Error('Lesson not found');
    const durationDiff = (updates.duration ?? lesson.duration) - lesson.duration;
    const data: any = {};
    if (updates.title !== undefined) data.title = updates.title;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.order !== undefined) data.order = updates.order;
    if (updates.type !== undefined) data.type = updates.type as any;
    if (updates.duration !== undefined) data.duration = updates.duration;
    if (updates.isFree !== undefined) data.isFree = updates.isFree;
    if (updates.isPreview !== undefined) data.isPreview = updates.isPreview;
    if (updates.content !== undefined) {
      data.contentJson = updates.content as any;
      data.videoUrl = updates.content.videoUrl;
      data.content = updates.content.textContent;
    }
    const row = await this.prisma.lMSLesson.update({ where: { id: lessonId }, data });
    if (durationDiff !== 0) {
      await this.prisma.lMSCourseModule.update({ where: { id: lesson.moduleId }, data: { duration: { increment: durationDiff } } });
      const mod = await this.prisma.lMSCourseModule.findUnique({ where: { id: lesson.moduleId } });
      if (mod) await this.prisma.lMSCourse.update({ where: { id: mod.courseId }, data: { duration: { increment: durationDiff } } });
    }
    const mod2 = await this.prisma.lMSCourseModule.findUnique({ where: { id: lesson.moduleId } });
    if (mod2) await this.invalidateCourseCache(mod2.courseId);
    return this.mapLesson(row);
  }

  async getLesson(lessonId: string): Promise<Lesson | null> {
    const row = await this.prisma.lMSLesson.findUnique({ where: { id: lessonId } });
    return row ? this.mapLesson(row) : null;
  }

  // ===== ENROLLMENT MANAGEMENT =====

  async enrollUser(userId: string, courseId: string, accessType: Enrollment['accessType'] = 'PURCHASED', paymentId?: string): Promise<Enrollment> {
    const course = await this.prisma.lMSCourse.findUnique({ where: { id: courseId } });
    if (!course) throw new Error('Course not found');

    const existing = await this.prisma.lMSEnrollment.findFirst({ where: { userId, courseId, status: 'ACTIVE' } });
    if (existing) throw new Error('User is already enrolled in this course');

    let row;
    try {
      row = await this.prisma.lMSEnrollment.create({
        data: {
          userId, courseId, status: 'ACTIVE', accessType, paymentId,
          progress: 0, totalTimeSpent: 0, streakDays: 0, longestStreak: 0,
          completedModules: [], completedAssessments: [], lastAccessedAt: new Date(),
        },
        include: { lessonProgress: true },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new Error('User is already enrolled in this course');
      throw e;
    }

    await this.prisma.lMSCourse.update({ where: { id: courseId }, data: { enrollmentCount: { increment: 1 } } });

    const instrId = (course.instructor as any)?.id;
    if (instrId) {
      const i = this.instructors.get(instrId);
      if (i) { i.studentCount++; this.instructors.set(instrId, i); }
    }

    await this.invalidateCourseCache(courseId);
    await this.checkAndAwardBadges(userId, 'FIRST_COURSE');
    return this.mapEnrollment(row);
  }

  async getEnrollment(enrollmentId: string): Promise<Enrollment | null> {
    const row = await this.prisma.lMSEnrollment.findUnique({ where: { id: enrollmentId }, include: { lessonProgress: true } });
    return row ? this.mapEnrollment(row) : null;
  }

  async getUserEnrollments(userId: string): Promise<Enrollment[]> {
    const rows = await this.prisma.lMSEnrollment.findMany({ where: { userId }, include: { lessonProgress: true }, orderBy: { startedAt: 'desc' } });
    return rows.map((r: any) => this.mapEnrollment(r));
  }

  async getCourseEnrollments(courseId: string): Promise<Enrollment[]> {
    const rows = await this.prisma.lMSEnrollment.findMany({ where: { courseId }, include: { lessonProgress: true } });
    return rows.map((r: any) => this.mapEnrollment(r));
  }

  // ===== PROGRESS TRACKING =====

  async markLessonComplete(enrollmentId: string, lessonId: string, timeSpent: number): Promise<Enrollment> {
    const enr = await this.prisma.lMSEnrollment.findUnique({ where: { id: enrollmentId } });
    if (!enr) throw new Error('Enrollment not found');
    const lesson = await this.prisma.lMSLesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new Error('Lesson not found');

    await this.prisma.lMSLessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
      create: { enrollmentId, lessonId, completed: true, completedAt: new Date(), watchedDuration: timeSpent },
      update: { completed: true, completedAt: new Date(), watchedDuration: { increment: timeSpent } },
    });

    const prevLast = enr.lastAccessedAt ?? enr.startedAt;
    let streakDays = enr.streakDays;
    let longestStreak = enr.longestStreak;
    if (new Date().toDateString() !== new Date(prevLast).toDateString()) {
      streakDays++;
      if (streakDays > longestStreak) longestStreak = streakDays;
    }

    const progressRows = await this.prisma.lMSLessonProgress.findMany({ where: { enrollmentId, completed: true } });
    const completedLessonIds = progressRows.map((p: any) => p.lessonId);

    const parentModule = await this.prisma.lMSCourseModule.findUnique({ where: { id: lesson.moduleId }, include: { lessons: true } });
    let completedModules = enr.completedModules;
    if (parentModule) {
      const allDone = parentModule.lessons.every((l: any) => completedLessonIds.includes(l.id));
      if (allDone && !completedModules.includes(parentModule.id)) completedModules = [...completedModules, parentModule.id];
    }

    const courseModules = await this.prisma.lMSCourseModule.findMany({ where: { courseId: enr.courseId }, include: { _count: { select: { lessons: true } } } });
    const totalLessons = courseModules.reduce((sum: number, m: any) => sum + m._count.lessons, 0);
    const overall = totalLessons > 0 ? Math.round((completedLessonIds.length / totalLessons) * 100) : 0;

    const course = await this.prisma.lMSCourse.findUnique({ where: { id: enr.courseId } });
    let status = enr.status;
    let completedAt = enr.completedAt;
    const justCompleted = overall === 100 && status !== 'COMPLETED';
    if (justCompleted) { status = 'COMPLETED'; completedAt = new Date(); }

    await this.prisma.lMSEnrollment.update({
      where: { id: enrollmentId },
      data: { progress: overall, totalTimeSpent: { increment: timeSpent }, lastAccessedAt: new Date(), streakDays, longestStreak, completedModules, status, completedAt },
    });

    if (justCompleted) {
      if (course?.hasCertificate) { try { await this.generateCertificate(enrollmentId); } catch { /* non-fatal */ } }
      await this.checkAndAwardBadges(enr.userId, 'COURSES_COUNT');
    }
    await this.checkAndAwardBadges(enr.userId, 'STREAK_DAYS', streakDays);

    return (await this.getEnrollment(enrollmentId)) as Enrollment;
  }

  async setCurrentLesson(enrollmentId: string, lessonId: string): Promise<Enrollment> {
    const enr = await this.prisma.lMSEnrollment.findUnique({ where: { id: enrollmentId } });
    if (!enr) throw new Error('Enrollment not found');
    const lesson = await this.prisma.lMSLesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new Error('Lesson not found');
    const row = await this.prisma.lMSEnrollment.update({
      where: { id: enrollmentId },
      data: { currentLessonId: lessonId, currentModuleId: lesson.moduleId, lastAccessedAt: new Date() },
      include: { lessonProgress: true },
    });
    return this.mapEnrollment(row);
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
      const enrollment = await this.prisma.lMSEnrollment.findUnique({ where: { id: attempt.enrollmentId } });
      if (enrollment && !enrollment.completedAssessments.includes(assessment.id)) {
        await this.prisma.lMSEnrollment.update({ where: { id: attempt.enrollmentId }, data: { completedAssessments: { push: assessment.id } } });
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
    const enrollment = await this.prisma.lMSEnrollment.findUnique({ where: { id: enrollmentId } });
    if (!enrollment) throw new Error('Enrollment not found');
    if (enrollment.status !== 'COMPLETED') throw new Error('Course must be completed to generate certificate');

    const course = await this.prisma.lMSCourse.findUnique({ where: { id: enrollment.courseId } });
    if (!course) throw new Error('Course not found');

    const certificateId = `cert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const certificateNumber = `CERT-${new Date().getFullYear()}-${String(this.certificates.size + 1).padStart(6, '0')}`;
    const instructorName = (course.instructor as any)?.name ?? 'Instructor';

    const certificate: Certificate = {
      id: certificateId,
      enrollmentId,
      userId: enrollment.userId,
      courseId: course.id,
      courseName: course.title,
      userName: enrollment.userId,
      instructorName,
      issuedAt: new Date(),
      certificateNumber,
      verificationUrl: `https://documentiulia.ro/verify/${certificateNumber}`,
      ceuCredits: course.ceuCredits ?? undefined,
      skills: course.learningOutcomes,
      grade,
      status: 'ISSUED',
    };

    this.certificates.set(certificateId, certificate);
    await this.prisma.lMSEnrollment.update({ where: { id: enrollmentId }, data: { certificateId } });
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
          const completed = await this.prisma.lMSEnrollment.count({ where: { userId, status: 'COMPLETED' } });
          earned = completed >= 1;
          break;
        }
        case 'COURSES_COUNT': {
          const completed = await this.prisma.lMSEnrollment.count({ where: { userId, status: 'COMPLETED' } });
          earned = completed >= (badge.criteria.threshold || 0);
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

      if (earned) await this.awardBadge(userId, badgeId);
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
    const userStats = new Map<string, { points: number; coursesCompleted: number; certificatesEarned: number; streak: number; }>();

    const enrollments = await this.prisma.lMSEnrollment.findMany({});
    for (const e of enrollments) {
      const stats = userStats.get(e.userId) || { points: 0, coursesCompleted: 0, certificatesEarned: 0, streak: 0 };
      if (e.status === 'COMPLETED') {
        stats.coursesCompleted++;
        stats.points += 100;
        if (e.certificateId) { stats.certificatesEarned++; stats.points += 50; }
      }
      stats.streak = Math.max(stats.streak, e.longestStreak);
      stats.points += e.streakDays * 5;
      userStats.set(e.userId, stats);
    }

    for (const userBadge of this.userBadges.values()) {
      const stats = userStats.get(userBadge.userId);
      if (stats) stats.points += userBadge.badge.points;
    }

    return Array.from(userStats.entries())
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
  }

  // ===== REVIEWS =====

  async addReview(courseId: string, userId: string, data: {
    rating: number;
    title?: string;
    content: string;
  }): Promise<CourseReview> {
    const course = await this.prisma.lMSCourse.findUnique({ where: { id: courseId } });
    if (!course) throw new Error('Course not found');

    const enrollment = await this.prisma.lMSEnrollment.findFirst({ where: { courseId, userId } });
    if (!enrollment) throw new Error('User must be enrolled to review');

    const existing = Array.from(this.reviews.values()).find(r => r.courseId === courseId && r.userId === userId);
    if (existing) throw new Error('User has already reviewed this course');

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

    const courseReviews = Array.from(this.reviews.values()).filter(r => r.courseId === courseId);
    const reviewCount = courseReviews.length;
    const rating = courseReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount;
    await this.prisma.lMSCourse.update({ where: { id: courseId }, data: { reviewCount, rating } });
    await this.invalidateCourseCache(courseId);

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
      const course = await this.prisma.lMSCourse.findUnique({ where: { id: courseId } });
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
