"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoursesService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let CoursesService = class CoursesService {
    prisma;
    configService;
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    async getCourses(filters) {
        const { search, category, difficulty, isFree, page = 1, limit = 12 } = filters;
        const skip = (page - 1) * limit;
        const where = {
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
    async getCourseBySlug(slug, userId) {
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
            throw new common_1.NotFoundException('Cursul nu a fost găsit');
        }
        let enrollment = null;
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
    async createCourse(instructorId, dto) {
        const baseSlug = this.slugify(dto.title);
        let slug = baseSlug;
        let counter = 1;
        while (true) {
            const existing = await this.prisma.course.findUnique({
                where: { slug },
            });
            if (!existing)
                break;
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
    async updateCourse(courseId, userId, dto) {
        const course = await this.prisma.course.findUnique({
            where: { id: courseId },
        });
        if (!course) {
            throw new common_1.NotFoundException('Cursul nu a fost găsit');
        }
        if (course.instructorId !== userId) {
            throw new common_1.ForbiddenException('Nu aveți permisiunea de a edita acest curs');
        }
        const updateData = { ...dto };
        if (dto.isPublished && !course.publishedAt) {
            updateData.publishedAt = new Date();
        }
        return this.prisma.course.update({
            where: { id: courseId },
            data: updateData,
        });
    }
    async deleteCourse(courseId, userId) {
        const course = await this.prisma.course.findUnique({
            where: { id: courseId },
        });
        if (!course) {
            throw new common_1.NotFoundException('Cursul nu a fost găsit');
        }
        if (course.instructorId !== userId) {
            throw new common_1.ForbiddenException('Nu aveți permisiunea de a șterge acest curs');
        }
        await this.prisma.course.delete({ where: { id: courseId } });
        return { message: 'Cursul a fost șters' };
    }
    async getLesson(courseSlug, lessonSlug, userId) {
        const course = await this.prisma.course.findUnique({
            where: { slug: courseSlug },
        });
        if (!course) {
            throw new common_1.NotFoundException('Cursul nu a fost găsit');
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
            throw new common_1.NotFoundException('Lecția nu a fost găsită');
        }
        if (!lesson.isFree && !course.isFree) {
            if (!userId) {
                throw new common_1.ForbiddenException('Trebuie să fiți autentificat pentru a accesa această lecție');
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
                throw new common_1.ForbiddenException('Trebuie să fiți înscris la curs pentru a accesa această lecție');
            }
        }
        return lesson;
    }
    async createLesson(courseId, userId, dto) {
        const course = await this.prisma.course.findUnique({
            where: { id: courseId },
        });
        if (!course) {
            throw new common_1.NotFoundException('Cursul nu a fost găsit');
        }
        if (course.instructorId !== userId) {
            throw new common_1.ForbiddenException('Nu aveți permisiunea de a adăuga lecții');
        }
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
            if (!existing)
                break;
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
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
    async updateLesson(lessonId, userId, dto) {
        const lesson = await this.prisma.courseLesson.findUnique({
            where: { id: lessonId },
            include: { course: true },
        });
        if (!lesson) {
            throw new common_1.NotFoundException('Lecția nu a fost găsită');
        }
        if (lesson.course.instructorId !== userId) {
            throw new common_1.ForbiddenException('Nu aveți permisiunea de a edita această lecție');
        }
        return this.prisma.courseLesson.update({
            where: { id: lessonId },
            data: dto,
        });
    }
    async deleteLesson(lessonId, userId) {
        const lesson = await this.prisma.courseLesson.findUnique({
            where: { id: lessonId },
            include: { course: true },
        });
        if (!lesson) {
            throw new common_1.NotFoundException('Lecția nu a fost găsită');
        }
        if (lesson.course.instructorId !== userId) {
            throw new common_1.ForbiddenException('Nu aveți permisiunea de a șterge această lecție');
        }
        await this.prisma.courseLesson.delete({ where: { id: lessonId } });
        return { message: 'Lecția a fost ștearsă' };
    }
    async enroll(courseId, userId) {
        const course = await this.prisma.course.findUnique({
            where: { id: courseId },
        });
        if (!course) {
            throw new common_1.NotFoundException('Cursul nu a fost găsit');
        }
        if (!course.isPublished) {
            throw new common_1.ForbiddenException('Cursul nu este disponibil pentru înscriere');
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
            throw new common_1.ConflictException('Sunteți deja înscris la acest curs');
        }
        const enrollment = await this.prisma.courseEnrollment.create({
            data: {
                courseId,
                userId,
            },
        });
        await this.prisma.course.update({
            where: { id: courseId },
            data: { enrollmentCount: { increment: 1 } },
        });
        return enrollment;
    }
    async getMyEnrollments(userId) {
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
    async updateLessonProgress(enrollmentId, lessonId, userId, dto) {
        const enrollment = await this.prisma.courseEnrollment.findUnique({
            where: { id: enrollmentId },
        });
        if (!enrollment || enrollment.userId !== userId) {
            throw new common_1.ForbiddenException('Nu aveți acces la această înscriere');
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
        await this.recalculateCourseProgress(enrollmentId);
        return progress;
    }
    async recalculateCourseProgress(enrollmentId) {
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
        if (!enrollment)
            return;
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
    async createReview(courseId, userId, dto) {
        const enrollment = await this.prisma.courseEnrollment.findUnique({
            where: {
                courseId_userId: {
                    courseId,
                    userId,
                },
            },
        });
        if (!enrollment) {
            throw new common_1.ForbiddenException('Trebuie să fiți înscris la curs pentru a lăsa o recenzie');
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
            throw new common_1.ConflictException('Ați lăsat deja o recenzie pentru acest curs');
        }
        const review = await this.prisma.courseReview.create({
            data: {
                ...dto,
                courseId,
                userId,
                isVerified: Number(enrollment.progress) >= 50,
            },
        });
        await this.recalculateCourseRating(courseId);
        return review;
    }
    async recalculateCourseRating(courseId) {
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
    async createQuiz(lessonId, userId, dto) {
        const lesson = await this.prisma.courseLesson.findUnique({
            where: { id: lessonId },
            include: { course: true },
        });
        if (!lesson) {
            throw new common_1.NotFoundException('Lecția nu a fost găsită');
        }
        if (lesson.course.instructorId !== userId) {
            throw new common_1.ForbiddenException('Nu aveți permisiunea de a adăuga quiz-uri');
        }
        return this.prisma.lessonQuiz.create({
            data: {
                ...dto,
                options: dto.options,
                lessonId,
            },
        });
    }
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
    async getRecommendations(userId, maxRecommendations = 5) {
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
        const quizScores = {};
        enrollments.forEach((e) => {
            e.lessonProgress.forEach((p) => {
                if (p.quizScore !== null) {
                    quizScores[e.course.category || 'general'] = Number(p.quizScore) / 100;
                }
            });
        });
        const availableCourses = await this.prisma.course.findMany({
            where: {
                isPublished: true,
                id: { notIn: enrollments.map((e) => e.courseId) },
            },
            include: {
                _count: { select: { lessons: true } },
            },
        });
        try {
            const mlServiceUrl = this.configService.get('ML_SERVICE_URL', 'http://localhost:8000');
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
                return result;
            }
        }
        catch {
        }
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
    async analyzeQuizPerformance(userId, lessonId, questions, answers, timeSpentSeconds) {
        try {
            const mlServiceUrl = this.configService.get('ML_SERVICE_URL', 'http://localhost:8000');
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
                return (await response.json());
            }
        }
        catch {
        }
        const correct = answers.filter((a, i) => questions[i] && a.selected === questions[i].correct_answer).length;
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
    async getLearningPath(userId, goal, weeklyHours = 5) {
        try {
            const mlServiceUrl = this.configService.get('ML_SERVICE_URL', 'http://localhost:8000');
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
        }
        catch {
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
    async getLearningStats(userId) {
        const enrollments = await this.prisma.courseEnrollment.findMany({
            where: { userId },
            include: {
                course: true,
                lessonProgress: true,
            },
        });
        const completedCourses = enrollments.filter((e) => e.completedAt).length;
        const completedLessons = enrollments.flatMap((e) => e.lessonProgress.filter((p) => p.isCompleted)).length;
        const quizScores = enrollments.flatMap((e) => e.lessonProgress.filter((p) => p.quizScore !== null).map((p) => Number(p.quizScore)));
        const avgQuizScore = quizScores.length > 0
            ? quizScores.reduce((a, b) => a + b, 0) / quizScores.length / 100
            : 0;
        const recentProgress = await this.prisma.lessonProgress.findMany({
            where: {
                enrollment: { userId },
                completedAt: { not: null },
            },
            orderBy: { completedAt: 'desc' },
            take: 30,
        });
        let currentStreak = 0;
        let lastDate = null;
        for (const p of recentProgress) {
            if (!p.completedAt)
                continue;
            const date = new Date(p.completedAt);
            date.setHours(0, 0, 0, 0);
            if (!lastDate) {
                currentStreak = 1;
                lastDate = date;
            }
            else {
                const diff = (lastDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
                if (diff <= 1) {
                    currentStreak++;
                    lastDate = date;
                }
                else {
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
    inferDifficulty(enrollments) {
        if (enrollments.length === 0)
            return 'beginner';
        const completedAdvanced = enrollments.some((e) => e.course.difficulty === 'ADVANCED' && (e.progress || 0) >= 80);
        if (completedAdvanced)
            return 'advanced';
        const completedIntermediate = enrollments.some((e) => e.course.difficulty === 'INTERMEDIATE' && (e.progress || 0) >= 80);
        if (completedIntermediate)
            return 'intermediate';
        return 'beginner';
    }
    slugify(text) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 100);
    }
};
exports.CoursesService = CoursesService;
exports.CoursesService = CoursesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], CoursesService);
//# sourceMappingURL=courses.service.js.map