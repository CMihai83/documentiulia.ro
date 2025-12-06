import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateCourseDto,
  UpdateCourseDto,
  CreateLessonDto,
  UpdateLessonDto,
  CreateQuizDto,
  CreateReviewDto,
  UpdateLessonProgressDto,
  CourseFilterDto,
} from './dto/courses.dto';

export interface LearningRecommendation {
  course_id: string;
  title: string;
  score: number;
  reasons: string[];
  estimated_completion_days: number;
  difficulty_match: string;
  prerequisites_met: boolean;
}

export interface QuizAnalysis {
  score: number;
  passed: boolean;
  weak_topics: string[];
  strong_topics: string[];
  recommendations: string[];
  review_needed: boolean;
  estimated_mastery: number;
}

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  // ==================== COURSES ====================

  async getCourses(filters: CourseFilterDto) {
    const { search, category, difficulty, isFree, page = 1, limit = 12 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      isPublished: true,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (difficulty) {
      where.difficulty = difficulty;
    }

    if (isFree !== undefined) {
      where.isFree = isFree;
    }

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          instructor: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
          _count: {
            select: { lessons: true, enrollments: true },
          },
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      data: courses,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCourseBySlug(slug: string, userId?: string) {
    const course = await this.prisma.course.findUnique({
      where: { slug },
      include: {
        instructor: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        lessons: {
          where: { isPublished: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            duration: true,
            isFree: true,
            sortOrder: true,
          },
        },
        reviews: {
          where: { isHidden: false },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
        _count: {
          select: { lessons: true, enrollments: true, reviews: true },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Cursul nu a fost găsit');
    }

    // Check if user is enrolled
    let enrollment: Awaited<ReturnType<typeof this.prisma.courseEnrollment.findUnique>> = null;
    if (userId) {
      enrollment = await this.prisma.courseEnrollment.findUnique({
        where: {
          courseId_userId: {
            courseId: course.id,
            userId,
          },
        },
        include: {
          lessonProgress: true,
        },
      });
    }

    return {
      ...course,
      isEnrolled: !!enrollment,
      enrollment,
    };
  }

  async createCourse(instructorId: string, dto: CreateCourseDto) {
    // Generate slug from title
    const baseSlug = this.slugify(dto.title);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.course.findUnique({
        where: { slug },
      });
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return this.prisma.course.create({
      data: {
        ...dto,
        slug,
        instructorId,
        tags: dto.tags || [],
      },
      include: {
        instructor: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async updateCourse(courseId: string, userId: string, dto: UpdateCourseDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Cursul nu a fost găsit');
    }

    if (course.instructorId !== userId) {
      throw new ForbiddenException('Nu aveți permisiunea de a edita acest curs');
    }

    const updateData: any = { ...dto };

    if (dto.isPublished && !course.publishedAt) {
      updateData.publishedAt = new Date();
    }

    return this.prisma.course.update({
      where: { id: courseId },
      data: updateData,
    });
  }

  async deleteCourse(courseId: string, userId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Cursul nu a fost găsit');
    }

    if (course.instructorId !== userId) {
      throw new ForbiddenException('Nu aveți permisiunea de a șterge acest curs');
    }

    await this.prisma.course.delete({ where: { id: courseId } });
    return { message: 'Cursul a fost șters' };
  }

  // ==================== LESSONS ====================

  async getLesson(courseSlug: string, lessonSlug: string, userId?: string) {
    const course = await this.prisma.course.findUnique({
      where: { slug: courseSlug },
    });

    if (!course) {
      throw new NotFoundException('Cursul nu a fost găsit');
    }

    const lesson = await this.prisma.courseLesson.findUnique({
      where: {
        courseId_slug: {
          courseId: course.id,
          slug: lessonSlug,
        },
      },
      include: {
        quizzes: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lecția nu a fost găsită');
    }

    // Check access
    if (!lesson.isFree && !course.isFree) {
      if (!userId) {
        throw new ForbiddenException('Trebuie să fiți autentificat pentru a accesa această lecție');
      }

      const enrollment = await this.prisma.courseEnrollment.findUnique({
        where: {
          courseId_userId: {
            courseId: course.id,
            userId,
          },
        },
      });

      if (!enrollment) {
        throw new ForbiddenException('Trebuie să fiți înscris la curs pentru a accesa această lecție');
      }
    }

    return lesson;
  }

  async createLesson(courseId: string, userId: string, dto: CreateLessonDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Cursul nu a fost găsit');
    }

    if (course.instructorId !== userId) {
      throw new ForbiddenException('Nu aveți permisiunea de a adăuga lecții');
    }

    // Generate slug from title
    const baseSlug = this.slugify(dto.title);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.courseLesson.findUnique({
        where: {
          courseId_slug: {
            courseId,
            slug,
          },
        },
      });
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Get next sort order
    const lastLesson = await this.prisma.courseLesson.findFirst({
      where: { courseId },
      orderBy: { sortOrder: 'desc' },
    });

    const sortOrder = dto.sortOrder ?? (lastLesson ? lastLesson.sortOrder + 1 : 0);

    return this.prisma.courseLesson.create({
      data: {
        ...dto,
        slug,
        sortOrder,
        courseId,
      },
    });
  }

  async updateLesson(lessonId: string, userId: string, dto: UpdateLessonDto) {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: { course: true },
    });

    if (!lesson) {
      throw new NotFoundException('Lecția nu a fost găsită');
    }

    if (lesson.course.instructorId !== userId) {
      throw new ForbiddenException('Nu aveți permisiunea de a edita această lecție');
    }

    return this.prisma.courseLesson.update({
      where: { id: lessonId },
      data: dto,
    });
  }

  async deleteLesson(lessonId: string, userId: string) {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: { course: true },
    });

    if (!lesson) {
      throw new NotFoundException('Lecția nu a fost găsită');
    }

    if (lesson.course.instructorId !== userId) {
      throw new ForbiddenException('Nu aveți permisiunea de a șterge această lecție');
    }

    await this.prisma.courseLesson.delete({ where: { id: lessonId } });
    return { message: 'Lecția a fost ștearsă' };
  }

  // ==================== ENROLLMENT ====================

  async enroll(courseId: string, userId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Cursul nu a fost găsit');
    }

    if (!course.isPublished) {
      throw new ForbiddenException('Cursul nu este disponibil pentru înscriere');
    }

    const existing = await this.prisma.courseEnrollment.findUnique({
      where: {
        courseId_userId: {
          courseId,
          userId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Sunteți deja înscris la acest curs');
    }

    const enrollment = await this.prisma.courseEnrollment.create({
      data: {
        courseId,
        userId,
      },
    });

    // Update enrollment count
    await this.prisma.course.update({
      where: { id: courseId },
      data: { enrollmentCount: { increment: 1 } },
    });

    return enrollment;
  }

  async getMyEnrollments(userId: string) {
    return this.prisma.courseEnrollment.findMany({
      where: { userId },
      orderBy: { enrolledAt: 'desc' },
      include: {
        course: {
          include: {
            instructor: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
            _count: {
              select: { lessons: true },
            },
          },
        },
      },
    });
  }

  // ==================== PROGRESS ====================

  async updateLessonProgress(enrollmentId: string, lessonId: string, userId: string, dto: UpdateLessonProgressDto) {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment || enrollment.userId !== userId) {
      throw new ForbiddenException('Nu aveți acces la această înscriere');
    }

    const progress = await this.prisma.lessonProgress.upsert({
      where: {
        enrollmentId_lessonId: {
          enrollmentId,
          lessonId,
        },
      },
      update: {
        ...dto,
        completedAt: dto.isCompleted ? new Date() : undefined,
      },
      create: {
        enrollmentId,
        lessonId,
        ...dto,
        completedAt: dto.isCompleted ? new Date() : undefined,
      },
    });

    // Recalculate course progress
    await this.recalculateCourseProgress(enrollmentId);

    return progress;
  }

  private async recalculateCourseProgress(enrollmentId: string) {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: {
          include: {
            lessons: {
              where: { isPublished: true },
            },
          },
        },
        lessonProgress: {
          where: { isCompleted: true },
        },
      },
    });

    if (!enrollment) return;

    const totalLessons = enrollment.course.lessons.length;
    const completedLessons = enrollment.lessonProgress.length;

    const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    await this.prisma.courseEnrollment.update({
      where: { id: enrollmentId },
      data: {
        progress,
        completedAt: progress >= 100 ? new Date() : null,
        lastAccessAt: new Date(),
      },
    });
  }

  // ==================== REVIEWS ====================

  async createReview(courseId: string, userId: string, dto: CreateReviewDto) {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: {
        courseId_userId: {
          courseId,
          userId,
        },
      },
    });

    if (!enrollment) {
      throw new ForbiddenException('Trebuie să fiți înscris la curs pentru a lăsa o recenzie');
    }

    const existing = await this.prisma.courseReview.findUnique({
      where: {
        courseId_userId: {
          courseId,
          userId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Ați lăsat deja o recenzie pentru acest curs');
    }

    const review = await this.prisma.courseReview.create({
      data: {
        ...dto,
        courseId,
        userId,
        isVerified: Number(enrollment.progress) >= 50,
      },
    });

    // Recalculate course rating
    await this.recalculateCourseRating(courseId);

    return review;
  }

  private async recalculateCourseRating(courseId: string) {
    const reviews = await this.prisma.courseReview.findMany({
      where: { courseId, isHidden: false },
      select: { rating: true },
    });

    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    await this.prisma.course.update({
      where: { id: courseId },
      data: {
        ratingAvg: avgRating,
        ratingCount: reviews.length,
      },
    });
  }

  // ==================== QUIZZES ====================

  async createQuiz(lessonId: string, userId: string, dto: CreateQuizDto) {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: { course: true },
    });

    if (!lesson) {
      throw new NotFoundException('Lecția nu a fost găsită');
    }

    if (lesson.course.instructorId !== userId) {
      throw new ForbiddenException('Nu aveți permisiunea de a adăuga quiz-uri');
    }

    return this.prisma.lessonQuiz.create({
      data: {
        ...dto,
        options: dto.options,
        lessonId,
      },
    });
  }

  // ==================== STATS ====================

  async getCourseCategories() {
    const categories = await this.prisma.course.groupBy({
      by: ['category'],
      where: { isPublished: true, category: { not: null } },
      _count: true,
    });

    return categories.map((c) => ({
      name: c.category,
      count: c._count,
    }));
  }

  async getPopularCourses(limit = 6) {
    return this.prisma.course.findMany({
      where: { isPublished: true },
      orderBy: { enrollmentCount: 'desc' },
      take: limit,
      include: {
        instructor: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        _count: {
          select: { lessons: true },
        },
      },
    });
  }

  // ==================== ADAPTIVE LEARNING ====================

  async getRecommendations(userId: string, maxRecommendations = 5) {
    // Get user's learning profile
    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { userId },
      include: {
        course: true,
        lessonProgress: true,
      },
    });

    const completedCourses = enrollments
      .filter((e) => e.completedAt)
      .map((e) => e.course.slug);

    const completedLessons = enrollments
      .flatMap((e) => e.lessonProgress.filter((p) => p.isCompleted))
      .map((p) => p.lessonId);

    // Calculate quiz scores from progress
    const quizScores: Record<string, number> = {};
    enrollments.forEach((e) => {
      e.lessonProgress.forEach((p) => {
        if (p.quizScore !== null) {
          quizScores[e.course.category || 'general'] = Number(p.quizScore) / 100;
        }
      });
    });

    // Get available courses
    const availableCourses = await this.prisma.course.findMany({
      where: {
        isPublished: true,
        id: { notIn: enrollments.map((e) => e.courseId) },
      },
      include: {
        _count: { select: { lessons: true } },
      },
    });

    // Call ML service for recommendations
    try {
      const mlServiceUrl = this.configService.get<string>('ML_SERVICE_URL', 'http://localhost:8000');
      const response = await fetch(`${mlServiceUrl}/api/v1/learning/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_profile: {
            user_id: userId,
            completed_courses: completedCourses,
            completed_lessons: completedLessons,
            quiz_scores: quizScores,
            time_spent_minutes: enrollments.reduce((sum, e) => sum + (Number(e.progress) || 0) * 10, 0),
            preferred_difficulty: this.inferDifficulty(enrollments.map(e => ({ course: e.course, progress: Number(e.progress) }))),
            weak_topics: [],
            strong_topics: [],
          },
          available_courses: availableCourses.map((c) => ({
            course_id: c.id,
            title: c.title,
            category: c.category || 'general',
            difficulty: c.difficulty,
            topics: c.tags || [],
            duration_minutes: c.duration || 60,
            prerequisites: [],
          })),
          max_recommendations: maxRecommendations,
          include_reasons: true,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return result as {
          recommendations: LearningRecommendation[];
          learning_path: string[];
          skill_gaps: string[];
          next_milestone: string;
        };
      }
    } catch {
      // Fallback to simple recommendations if ML service unavailable
    }

    // Fallback: Return popular courses
    const popular = await this.getPopularCourses(maxRecommendations);
    return {
      recommendations: popular.map((c) => ({
        course_id: c.id,
        title: c.title,
        score: 50,
        reasons: ['Curs popular'],
        estimated_completion_days: Math.ceil((c.duration || 60) / 30),
        difficulty_match: 'potrivit',
        prerequisites_met: true,
      })),
      learning_path: popular.slice(0, 3).map((c) => c.id),
      skill_gaps: [],
      next_milestone: 'Începător',
    };
  }

  async analyzeQuizPerformance(
    userId: string,
    lessonId: string,
    questions: Array<{ id: string; topic: string; correct_answer: string }>,
    answers: Array<{ question_id: string; selected: string }>,
    timeSpentSeconds: number,
  ): Promise<QuizAnalysis> {
    try {
      const mlServiceUrl = this.configService.get<string>('ML_SERVICE_URL', 'http://localhost:8000');
      const response = await fetch(`${mlServiceUrl}/api/v1/learning/analyze-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          lesson_id: lessonId,
          questions,
          answers,
          time_spent_seconds: timeSpentSeconds,
        }),
      });

      if (response.ok) {
        return (await response.json()) as QuizAnalysis;
      }
    } catch {
      // Fallback calculation
    }

    // Fallback: Simple score calculation
    const correct = answers.filter((a, i) =>
      questions[i] && a.selected === questions[i].correct_answer
    ).length;
    const score = questions.length > 0 ? correct / questions.length : 0;

    return {
      score,
      passed: score >= 0.7,
      weak_topics: [],
      strong_topics: [],
      recommendations: score < 0.7 ? ['Revizuiți lecția'] : [],
      review_needed: score < 0.7,
      estimated_mastery: score,
    };
  }

  async getLearningPath(userId: string, goal: string, weeklyHours = 5) {
    try {
      const mlServiceUrl = this.configService.get<string>('ML_SERVICE_URL', 'http://localhost:8000');

      const enrollments = await this.prisma.courseEnrollment.findMany({
        where: { userId },
        include: { course: true },
      });

      const response = await fetch(`${mlServiceUrl}/api/v1/learning/learning-path`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_profile: {
            user_id: userId,
            completed_courses: enrollments.filter((e) => e.completedAt).map((e) => e.course.slug),
            completed_lessons: [],
            quiz_scores: {},
            time_spent_minutes: 0,
            preferred_difficulty: 'beginner',
            weak_topics: [],
            strong_topics: [],
          },
          goal,
          available_time_weekly_hours: weeklyHours,
          target_completion_weeks: 12,
        }),
      });

      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Fallback
    }

    return {
      goal,
      total_courses: 5,
      total_duration_hours: 20,
      weekly_schedule: [],
      milestones: [],
      estimated_completion_date: new Date(Date.now() + 12 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };
  }

  async getLearningStats(userId: string) {
    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { userId },
      include: {
        course: true,
        lessonProgress: true,
      },
    });

    const completedCourses = enrollments.filter((e) => e.completedAt).length;
    const completedLessons = enrollments.flatMap((e) =>
      e.lessonProgress.filter((p) => p.isCompleted)
    ).length;

    const quizScores = enrollments.flatMap((e) =>
      e.lessonProgress.filter((p) => p.quizScore !== null).map((p) => Number(p.quizScore))
    );

    const avgQuizScore = quizScores.length > 0
      ? quizScores.reduce((a, b) => a + b, 0) / quizScores.length / 100
      : 0;

    // Calculate streak (simplified)
    const recentProgress = await this.prisma.lessonProgress.findMany({
      where: {
        enrollment: { userId },
        completedAt: { not: null },
      },
      orderBy: { completedAt: 'desc' },
      take: 30,
    });

    let currentStreak = 0;
    let lastDate: Date | null = null;
    for (const p of recentProgress) {
      if (!p.completedAt) continue;
      const date = new Date(p.completedAt);
      date.setHours(0, 0, 0, 0);
      if (!lastDate) {
        currentStreak = 1;
        lastDate = date;
      } else {
        const diff = (lastDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
        if (diff <= 1) {
          currentStreak++;
          lastDate = date;
        } else {
          break;
        }
      }
    }

    return {
      total_courses_completed: completedCourses,
      total_lessons_completed: completedLessons,
      total_time_spent_hours: enrollments.reduce((sum, e) => sum + (Number(e.progress) || 0) * 0.5, 0),
      average_quiz_score: avgQuizScore,
      current_streak_days: currentStreak,
      skill_level: this.inferDifficulty(enrollments.map(e => ({ course: e.course, progress: Number(e.progress) }))),
      enrollments: enrollments.length,
    };
  }

  private inferDifficulty(enrollments: Array<{ course: { difficulty: string }; progress: number | null }>): string {
    if (enrollments.length === 0) return 'beginner';

    const completedAdvanced = enrollments.some(
      (e) => e.course.difficulty === 'ADVANCED' && (e.progress || 0) >= 80
    );
    if (completedAdvanced) return 'advanced';

    const completedIntermediate = enrollments.some(
      (e) => e.course.difficulty === 'INTERMEDIATE' && (e.progress || 0) >= 80
    );
    if (completedIntermediate) return 'intermediate';

    return 'beginner';
  }

  // ==================== HELPERS ====================

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  }
}
