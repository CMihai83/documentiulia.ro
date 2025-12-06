import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCourseDto, UpdateCourseDto, CreateLessonDto, UpdateLessonDto, CreateQuizDto, CreateReviewDto, UpdateLessonProgressDto, CourseFilterDto } from './dto/courses.dto';
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
export declare class CoursesService {
    private readonly prisma;
    private readonly configService;
    constructor(prisma: PrismaService, configService: ConfigService);
    getCourses(filters: CourseFilterDto): Promise<{
        data: ({
            _count: {
                enrollments: number;
                lessons: number;
            };
            instructor: {
                id: string;
                firstName: string | null;
                lastName: string | null;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            currency: string;
            tags: string[];
            description: string;
            title: string;
            category: string | null;
            slug: string;
            shortDescription: string | null;
            thumbnail: string | null;
            difficulty: import(".prisma/client").$Enums.CourseDifficulty;
            duration: number;
            isFree: boolean;
            price: import("@prisma/client/runtime/library").Decimal | null;
            isPublished: boolean;
            instructorId: string;
            language: string;
            publishedAt: Date | null;
            enrollmentCount: number;
            ratingAvg: import("@prisma/client/runtime/library").Decimal;
            ratingCount: number;
            completionRate: import("@prisma/client/runtime/library").Decimal;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getCourseBySlug(slug: string, userId?: string): Promise<{
        isEnrolled: boolean;
        enrollment: {
            id: string;
            userId: string;
            courseId: string;
            progress: import("@prisma/client/runtime/library").Decimal;
            completedAt: Date | null;
            certificateId: string | null;
            certificateUrl: string | null;
            enrolledAt: Date;
            lastAccessAt: Date | null;
        } | null;
        _count: {
            enrollments: number;
            lessons: number;
            reviews: number;
        };
        instructor: {
            id: string;
            firstName: string | null;
            lastName: string | null;
            avatarUrl: string | null;
        };
        lessons: {
            id: string;
            description: string | null;
            title: string;
            sortOrder: number;
            slug: string;
            duration: number;
            isFree: boolean;
        }[];
        reviews: ({
            user: {
                id: string;
                firstName: string | null;
                lastName: string | null;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            content: string | null;
            title: string | null;
            isHidden: boolean;
            rating: number;
            courseId: string;
            isVerified: boolean;
        })[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        currency: string;
        tags: string[];
        description: string;
        title: string;
        category: string | null;
        slug: string;
        shortDescription: string | null;
        thumbnail: string | null;
        difficulty: import(".prisma/client").$Enums.CourseDifficulty;
        duration: number;
        isFree: boolean;
        price: import("@prisma/client/runtime/library").Decimal | null;
        isPublished: boolean;
        instructorId: string;
        language: string;
        publishedAt: Date | null;
        enrollmentCount: number;
        ratingAvg: import("@prisma/client/runtime/library").Decimal;
        ratingCount: number;
        completionRate: import("@prisma/client/runtime/library").Decimal;
    }>;
    createCourse(instructorId: string, dto: CreateCourseDto): Promise<{
        instructor: {
            id: string;
            firstName: string | null;
            lastName: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        currency: string;
        tags: string[];
        description: string;
        title: string;
        category: string | null;
        slug: string;
        shortDescription: string | null;
        thumbnail: string | null;
        difficulty: import(".prisma/client").$Enums.CourseDifficulty;
        duration: number;
        isFree: boolean;
        price: import("@prisma/client/runtime/library").Decimal | null;
        isPublished: boolean;
        instructorId: string;
        language: string;
        publishedAt: Date | null;
        enrollmentCount: number;
        ratingAvg: import("@prisma/client/runtime/library").Decimal;
        ratingCount: number;
        completionRate: import("@prisma/client/runtime/library").Decimal;
    }>;
    updateCourse(courseId: string, userId: string, dto: UpdateCourseDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        currency: string;
        tags: string[];
        description: string;
        title: string;
        category: string | null;
        slug: string;
        shortDescription: string | null;
        thumbnail: string | null;
        difficulty: import(".prisma/client").$Enums.CourseDifficulty;
        duration: number;
        isFree: boolean;
        price: import("@prisma/client/runtime/library").Decimal | null;
        isPublished: boolean;
        instructorId: string;
        language: string;
        publishedAt: Date | null;
        enrollmentCount: number;
        ratingAvg: import("@prisma/client/runtime/library").Decimal;
        ratingCount: number;
        completionRate: import("@prisma/client/runtime/library").Decimal;
    }>;
    deleteCourse(courseId: string, userId: string): Promise<{
        message: string;
    }>;
    getLesson(courseSlug: string, lessonSlug: string, userId?: string): Promise<{
        quizzes: {
            id: string;
            options: import("@prisma/client/runtime/library").JsonValue;
            sortOrder: number;
            question: string;
            correctAnswer: number;
            explanation: string | null;
            lessonId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        content: string;
        title: string;
        sortOrder: number;
        slug: string;
        duration: number;
        isFree: boolean;
        isPublished: boolean;
        videoUrl: string | null;
        courseId: string;
    }>;
    createLesson(courseId: string, userId: string, dto: CreateLessonDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        content: string;
        title: string;
        sortOrder: number;
        slug: string;
        duration: number;
        isFree: boolean;
        isPublished: boolean;
        videoUrl: string | null;
        courseId: string;
    }>;
    updateLesson(lessonId: string, userId: string, dto: UpdateLessonDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        content: string;
        title: string;
        sortOrder: number;
        slug: string;
        duration: number;
        isFree: boolean;
        isPublished: boolean;
        videoUrl: string | null;
        courseId: string;
    }>;
    deleteLesson(lessonId: string, userId: string): Promise<{
        message: string;
    }>;
    enroll(courseId: string, userId: string): Promise<{
        id: string;
        userId: string;
        courseId: string;
        progress: import("@prisma/client/runtime/library").Decimal;
        completedAt: Date | null;
        certificateId: string | null;
        certificateUrl: string | null;
        enrolledAt: Date;
        lastAccessAt: Date | null;
    }>;
    getMyEnrollments(userId: string): Promise<({
        course: {
            _count: {
                lessons: number;
            };
            instructor: {
                id: string;
                firstName: string | null;
                lastName: string | null;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            currency: string;
            tags: string[];
            description: string;
            title: string;
            category: string | null;
            slug: string;
            shortDescription: string | null;
            thumbnail: string | null;
            difficulty: import(".prisma/client").$Enums.CourseDifficulty;
            duration: number;
            isFree: boolean;
            price: import("@prisma/client/runtime/library").Decimal | null;
            isPublished: boolean;
            instructorId: string;
            language: string;
            publishedAt: Date | null;
            enrollmentCount: number;
            ratingAvg: import("@prisma/client/runtime/library").Decimal;
            ratingCount: number;
            completionRate: import("@prisma/client/runtime/library").Decimal;
        };
    } & {
        id: string;
        userId: string;
        courseId: string;
        progress: import("@prisma/client/runtime/library").Decimal;
        completedAt: Date | null;
        certificateId: string | null;
        certificateUrl: string | null;
        enrolledAt: Date;
        lastAccessAt: Date | null;
    })[]>;
    updateLessonProgress(enrollmentId: string, lessonId: string, userId: string, dto: UpdateLessonProgressDto): Promise<{
        id: string;
        updatedAt: Date;
        isCompleted: boolean;
        watchedSeconds: number;
        quizPassed: boolean | null;
        quizScore: import("@prisma/client/runtime/library").Decimal | null;
        completedAt: Date | null;
        enrollmentId: string;
        lessonId: string;
        startedAt: Date;
    }>;
    private recalculateCourseProgress;
    createReview(courseId: string, userId: string, dto: CreateReviewDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        content: string | null;
        title: string | null;
        isHidden: boolean;
        rating: number;
        courseId: string;
        isVerified: boolean;
    }>;
    private recalculateCourseRating;
    createQuiz(lessonId: string, userId: string, dto: CreateQuizDto): Promise<{
        id: string;
        options: import("@prisma/client/runtime/library").JsonValue;
        sortOrder: number;
        question: string;
        correctAnswer: number;
        explanation: string | null;
        lessonId: string;
    }>;
    getCourseCategories(): Promise<{
        name: string | null;
        count: number;
    }[]>;
    getPopularCourses(limit?: number): Promise<({
        _count: {
            lessons: number;
        };
        instructor: {
            id: string;
            firstName: string | null;
            lastName: string | null;
            avatarUrl: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        currency: string;
        tags: string[];
        description: string;
        title: string;
        category: string | null;
        slug: string;
        shortDescription: string | null;
        thumbnail: string | null;
        difficulty: import(".prisma/client").$Enums.CourseDifficulty;
        duration: number;
        isFree: boolean;
        price: import("@prisma/client/runtime/library").Decimal | null;
        isPublished: boolean;
        instructorId: string;
        language: string;
        publishedAt: Date | null;
        enrollmentCount: number;
        ratingAvg: import("@prisma/client/runtime/library").Decimal;
        ratingCount: number;
        completionRate: import("@prisma/client/runtime/library").Decimal;
    })[]>;
    getRecommendations(userId: string, maxRecommendations?: number): Promise<{
        recommendations: LearningRecommendation[];
        learning_path: string[];
        skill_gaps: string[];
        next_milestone: string;
    }>;
    analyzeQuizPerformance(userId: string, lessonId: string, questions: Array<{
        id: string;
        topic: string;
        correct_answer: string;
    }>, answers: Array<{
        question_id: string;
        selected: string;
    }>, timeSpentSeconds: number): Promise<QuizAnalysis>;
    getLearningPath(userId: string, goal: string, weeklyHours?: number): Promise<unknown>;
    getLearningStats(userId: string): Promise<{
        total_courses_completed: number;
        total_lessons_completed: number;
        total_time_spent_hours: number;
        average_quiz_score: number;
        current_streak_days: number;
        skill_level: string;
        enrollments: number;
    }>;
    private inferDifficulty;
    private slugify;
}
//# sourceMappingURL=courses.service.d.ts.map